/* fx/scene.js — 活的院落场景带(living scene)原型
 *
 * 在「宅院」(home)页顶部插入一条会动的院落带:用游戏已有的国风小图标当角色,
 * 家眷 / 家仆 / 牲口 据 S 真实数量缓缓踱步、晃悠,反映真实人口,营造「家在运转」的人气。
 *
 * 约束:纯 JS+CSS、零依赖、零构建。只新建本文件与 fx/scene.css,不改动其它任何文件。
 * 接入方式:因为 render() 用 innerHTML 重写 #main,这里用「猴补丁」包裹 window.render 与
 * window.setView——每次渲染后,若当前是 home 视图,就把场景带插入 #main 顶部并据 S 重建小人。
 *
 * 暴露:window.__fx_scene_on() / window.__fx_scene_off()
 */
(function () {
  "use strict";

  var ENABLED = true;          // 开关(__fx_scene_off 置 false)
  var MAX_FIG = 14;            // 性能克制:最多 14 个小人
  var SCENE_ID = "fx-scene";
  var CSS_HREF = "fx/scene.css";

  /* ---------- 注入样式(若 index.html 未引入,则动态补上;幂等) ---------- */
  function ensureCss() {
    if (document.getElementById("fx-scene-css")) return;
    var already = false;
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if ((links[i].getAttribute("href") || "").indexOf("fx/scene.css") >= 0) { already = true; break; }
    }
    if (already) return;
    var l = document.createElement("link");
    l.id = "fx-scene-css";
    l.rel = "stylesheet";
    l.href = CSS_HREF + "?v=fx1";
    document.head.appendChild(l);
  }

  /* ---------- 小工具:安全取游戏全局 ----------
   * 注意:游戏的 S / view 是 `let` 声明、SERVANTS/HAS_ICON 是 `const`、render 等是函数声明,
   * 它们都在「全局词法环境」里,不挂在 window 上。本文件作为 <script> 同样落在该词法作用域,
   * 故用「裸标识符 + typeof 守卫」读取,而非 window.X(后者读不到 let/const/函数声明)。 */
  function S_()      { return (typeof S      !== "undefined" && S)      ? S      : null; }
  function curView() { return (typeof view   !== "undefined")          ? view   : null; }

  // 复用游戏的 icoImg(有图出 <img class="ico-img">),无则给 emoji 兜底。
  function figMarkup(key, emoji) {
    if (typeof icoImg === "function" && typeof HAS_ICON !== "undefined" &&
        HAS_ICON && HAS_ICON.has && HAS_ICON.has(key)) {
      var html = icoImg(key, "");
      if (html) return { html: html, isImg: true };
    }
    return { html: '<span class="fx-emoji">' + (emoji || "🧍") + "</span>", isImg: false };
  }

  /* ---------- 据 S 组装「院里的人/牲口」名册 ---------- */
  function buildRoster(S) {
    var list = [];   // 每项 {key,emoji,beast?}

    // 家主
    if (S.lord) list.push(roleP("lord", "👴"));
    // 正妻 + 平妻/妾(都用 wife 图)
    if (S.spouse) list.push(roleP("wife", "👩"));
    var consorts = S.consorts || [];
    for (var c = 0; c < consorts.length; c++) list.push(roleP("wife", "👩"));

    // 子女:幼儿 child / 成年男 son / 成年女 daughter
    var kids = S.kids || [];
    for (var k = 0; k < kids.length; k++) {
      var kid = kids[k];
      if (kid.age != null && kid.age < 10) list.push(roleP("child", "🧒"));
      else if (kid.sex === "男") list.push(roleP("son", "👦"));
      else list.push(roleP("daughter", "👧"));
    }

    // 养女:幼小 child / 童养媳 bride / 婢女 daughter
    var wards = S.wards || [];
    for (var w = 0; w < wards.length; w++) {
      var wd = wards[w];
      if (wd.age != null && wd.age < 10) list.push(roleP("child", "👧"));
      else if (wd.kind === "bride") list.push(roleP("bride", "👰"));
      else list.push(roleP("daughter", "👧"));
    }

    // 家仆:按 SERVANTS 每个角色的真实人数放对应图
    if (typeof SERVANTS !== "undefined" && SERVANTS && typeof svc === "function") {
      for (var role in SERVANTS) {
        if (!Object.prototype.hasOwnProperty.call(SERVANTS, role)) continue;
        var cnt = svc(role) | 0;
        var emo = SERVANTS[role] && SERVANTS[role].ico ? SERVANTS[role].ico : "🧍";
        for (var s = 0; s < cnt; s++) list.push(roleP(role, emo));
      }
    }

    // 长工(无专用图标):用田间农人 emoji 表意,最多放几个,别喧宾夺主
    var workers = (S.workers | 0);
    var showW = Math.min(workers, 4);
    for (var ww = 0; ww < showW; ww++) list.push({ key: "__worker", emoji: "🧑‍🌾", beast: false });

    // 牲口:从产业 barn 取每处的 b.animal
    var animals = [];
    if (typeof deptItems === "function") {
      animals = deptItems("barn") || [];
    } else if (S.ind) {
      animals = S.ind.filter(function (b) { return b && b.type === "barn"; });
    }
    var beastEmoji = { pig: "🐖", cow: "🐂", chicken: "🐔", sheep: "🐑" };
    for (var a = 0; a < animals.length; a++) {
      var an = animals[a] && animals[a].animal ? animals[a].animal : "pig";
      list.push({ key: an, emoji: beastEmoji[an] || "🐖", beast: true });
    }

    return list;

    function roleP(key, emoji) { return { key: key, emoji: emoji, beast: false }; }
  }

  /* ---------- 把名册裁到 MAX_FIG:优先 家眷>家仆>牲口>长工,但保证有牲口露脸 ---------- */
  function pickShown(list) {
    if (list.length <= MAX_FIG) return list.slice();
    // 牲口与长工放到末尾,优先保家眷/家仆;但至少留 2 个牲口名额(若有)
    var people = list.filter(function (x) { return !x.beast && x.key !== "__worker"; });
    var beasts = list.filter(function (x) { return x.beast; });
    var workers = list.filter(function (x) { return x.key === "__worker"; });
    var out = [];
    var beastQuota = Math.min(beasts.length, 2);
    for (var i = 0; i < people.length && out.length < MAX_FIG - beastQuota; i++) out.push(people[i]);
    for (var b = 0; b < beasts.length && out.length < MAX_FIG; b++) out.push(beasts[b]);
    for (var w = 0; w < workers.length && out.length < MAX_FIG; w++) out.push(workers[w]);
    return out;
  }

  /* ---------- 角标文案(复用游戏派生量) ---------- */
  function labelText(S) {
    var members = (typeof famMembers === "function") ? famMembers()
      : (1 + (S.spouse ? 1 : 0) + (S.consorts ? S.consorts.length : 0) + (S.kids ? S.kids.length : 0) + (S.wards ? S.wards.length : 0));
    var servN = (typeof servantCount === "function") ? servantCount() : 0;
    var indN = S.ind ? S.ind.length : 0;
    var surname = S.surname || "李";
    var parts = ["阖家 " + members + " 口", "长工 " + (S.workers | 0)];
    if (servN > 0) parts.push("家仆 " + servN);
    parts.push("产业 " + indN);
    return { seal: surname + "氏院", body: parts.join(" · ") };
  }

  /* ---------- 渲染场景带 DOM ---------- */
  function renderScene(host) {
    var S = S_();
    if (!S) return;

    var roster = pickShown(buildRoster(S));
    if (!roster.length) roster = [{ key: "__worker", emoji: "🏚", beast: false }];

    var scene = document.createElement("div");
    scene.id = SCENE_ID;

    // 背景层
    var ground = document.createElement("div"); ground.className = "fx-ground";
    var wall = document.createElement("div"); wall.className = "fx-wall";
    scene.appendChild(wall);
    scene.appendChild(ground);

    // 横向均匀铺开,带随机抖动,让人群不挤一堆
    var n = roster.length;
    for (var i = 0; i < n; i++) {
      var item = roster[i];
      var fig = document.createElement("div");
      fig.className = "fx-fig" + (item.beast ? " fx-beast" : "");
      if (Math.random() < 0.5) fig.className += " flip";

      // 位置:把宽度切成 n 段,每段内随机落点(留出两侧边距与 label 区)
      var bandL = 4, bandR = 92;                       // 百分比可用区
      var seg = (bandR - bandL) / n;
      var leftPct = bandL + seg * i + Math.random() * Math.max(2, seg * 0.5);
      fig.style.left = leftPct.toFixed(1) + "%";

      // 牲口体型略小、人略大;层次:后排(left 偏中)略小一点点,做点纵深错觉用 bottom 微调
      var sz = item.beast ? 24 + Math.floor(Math.random() * 4) : 28 + Math.floor(Math.random() * 5);
      fig.style.setProperty("--sz", sz + "px");

      // 踱步幅度/方向(横向),不同人不同,缓慢
      var amp = 14 + Math.floor(Math.random() * 26);   // 14~40px
      var dir = Math.random() < 0.5 ? 1 : -1;
      fig.style.setProperty("--x0", "0px");
      fig.style.setProperty("--x1", (dir * amp) + "px");
      fig.style.setProperty("--dur", (7 + Math.random() * 6).toFixed(1) + "s");   // 7~13s 很慢
      fig.style.setProperty("--delay", (Math.random() * 5).toFixed(1) + "s");

      // 自身浮动(踱步时身子轻晃);牲口幅度更小
      fig.style.setProperty("--bob", (item.beast ? 2 : 4) + "px");
      fig.style.setProperty("--bdur", (2.0 + Math.random() * 1.8).toFixed(1) + "s");
      fig.style.setProperty("--bdelay", (Math.random() * 2).toFixed(1) + "s");

      var mk = figMarkup(item.key, item.emoji);
      fig.innerHTML = mk.html;
      scene.appendChild(fig);
    }

    // 角标 + 印
    var lbl = labelText(S);
    var label = document.createElement("div");
    label.className = "fx-label";
    label.textContent = lbl.body;
    var seal = document.createElement("div");
    seal.className = "fx-seal";
    seal.textContent = lbl.seal;
    scene.appendChild(seal);
    scene.appendChild(label);

    // 插入位置:紧跟 .manorbanner(若有),否则置于 #main 顶部
    var banner = host.querySelector(".manorbanner");
    if (banner && banner.parentNode === host) {
      if (banner.nextSibling) host.insertBefore(scene, banner.nextSibling);
      else host.appendChild(scene);
    } else {
      host.insertBefore(scene, host.firstChild);
    }
  }

  /* ---------- 渲染后挂载:仅 home 视图 ---------- */
  function mount() {
    if (!ENABLED) return;
    var host = document.getElementById("main");
    if (!host) return;
    // 去掉旧的(render 重建 #main 时一般已没了,这里兜底防重复)
    var old = document.getElementById(SCENE_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (curView() !== "home") return;
    ensureCss();
    renderScene(host);
  }

  function unmount() {
    var old = document.getElementById(SCENE_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  /* ---------- 猴补丁:包裹 render 与 setView ---------- */
  var patched = false;
  function patch() {
    if (patched) return;
    // render() = checkChallenge()+renderHUD()+renderMain();renderMain 重写 #main → 之后补挂场景
    if (typeof window.render === "function" && !window.render.__fxWrapped) {
      var origRender = window.render;
      window.render = function () {
        var r = origRender.apply(this, arguments);
        try { mount(); } catch (e) { /* 场景失败绝不拖累游戏 */ }
        return r;
      };
      window.render.__fxWrapped = true;
    }
    // setView(v) 也会调用 renderMain;切到 home 时挂、切走时清
    if (typeof window.setView === "function" && !window.setView.__fxWrapped) {
      var origSet = window.setView;
      window.setView = function () {
        var r = origSet.apply(this, arguments);
        try { mount(); } catch (e) {}
        return r;
      };
      window.setView.__fxWrapped = true;
    }
    patched = (typeof window.render === "function" && window.render.__fxWrapped);
  }

  /* ---------- 启动:等 render/setView 就位再补丁 + 首挂 ---------- */
  function boot() {
    patch();
    // 首屏:若已渲染在 home,补挂一次
    try { mount(); } catch (e) {}
    // 若此刻 render 还没定义(脚本加载序),轮询几次直到接上
    if (!patched) {
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        patch();
        if (patched) { try { mount(); } catch (e) {} clearInterval(t); }
        if (tries > 40) clearInterval(t);   // 最多约 4s
      }, 100);
    }
  }

  /* ---------- 开关 ---------- */
  window.__fx_scene_on = function () {
    ENABLED = true;
    try { mount(); } catch (e) {}
    return "fx scene: ON";
  };
  window.__fx_scene_off = function () {
    ENABLED = false;
    unmount();
    return "fx scene: OFF";
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
