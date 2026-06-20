/* ═══════════════════════════════════════════════════════════════════
   氛围环境动效 · ambient.js  (《大农庄》原型)
   - 自执行 IIFE,加载即自动初始化
   - 建持久 fixed 覆盖层 #fx-ambient(z:9,内容之上 modal 之下,pointer:none)
   - 生成 飘落花瓣/落叶 + 缓慢云雾 + 偶尔飞鸟(数量克制,手机更省)
   - 监听 .manorbanner(随 render() 重建)→ 附加 ken-burns/炊烟/灯笼光晕
   - 全部 transform/opacity(GPU);页面隐藏时暂停;尊重 reduced-motion
   - 暴露 window.__fx_ambient_on() / __fx_ambient_off()
   只新建此文件,不改任何既有逻辑。
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // 已存在则避免重复初始化(脚本被重复引入时安全)
  if (window.__fx_ambient_inited) return;
  window.__fx_ambient_inited = true;

  var LAYER_ID = "fx-ambient";
  var BANNER_SEL = ".manorbanner";

  // ── 环境探测:手机 / 偏好减少动态 ────────────────────────────
  var mqReduce = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };
  // 窄屏 = 手机,粒子数量减半左右
  var isNarrow = window.matchMedia
    ? window.matchMedia("(max-width: 819px)").matches
    : window.innerWidth < 820;

  // 粒子配额(克制):桌面 / 手机
  var COUNT = {
    petal: 0,                 // ★老板嫌"飘雪"难看,去掉飘落花瓣/落叶
    cloud: isNarrow ? 2 : 3,  // 留:极慢的暖云/薄雾
    bird: isNarrow ? 1 : 2,   // 留:偶尔飞鸟
  };

  var layer = null; // #fx-ambient
  var bannerObserver = null; // 监听 #main 内容重渲染

  // ── 小工具 ───────────────────────────────────────────────────
  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }
  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  // ── 构建一片花瓣/落叶 ────────────────────────────────────────
  function makePetal() {
    var leaf = Math.random() < 0.35; // 约 1/3 为落叶
    var p = el("div", "fx-petal" + (leaf ? " fx-leaf" : ""));
    var inner = el("i");
    p.appendChild(inner);

    // 起始横位、横向飘移幅度(--sway)、落速、自旋速度、大小
    var fallDur = rnd(11, 20); // 秒,下落周期(慢=雅致)
    var flutterDur = rnd(2.4, 4.2); // 秒,摆动周期
    var sway = rnd(-9, 9); // vw,落下时横移
    var scale = rnd(0.7, 1.25);

    p.style.left = rnd(-4, 100) + "vw";
    p.style.setProperty("--sway", sway + "vw");
    p.style.animationDuration = fallDur + "s";
    p.style.animationDelay = -rnd(0, fallDur) + "s"; // 错开,避免齐刷刷一起出
    inner.style.animationDuration = flutterDur + "s";
    inner.style.animationDelay = -rnd(0, flutterDur) + "s";
    inner.style.transform = "scale(" + scale.toFixed(2) + ")";
    return p;
  }

  // ── 构建一团云 / 雾 ──────────────────────────────────────────
  function makeCloud(i) {
    var mist = i === 0; // 第一条做成贴底的薄雾
    var c = el("div", "fx-cloud" + (mist ? " fx-mist" : ""));
    var dur = rnd(70, 130); // 秒,极慢横移
    c.style.top = mist ? rnd(62, 78) + "vh" : rnd(4, 38) + "vh";
    c.style.animationDuration = dur + "s";
    c.style.animationDelay = -rnd(0, dur) + "s";
    if (!mist) {
      var s = rnd(0.8, 1.4);
      c.style.transform = "scale(" + s.toFixed(2) + ")";
      c.style.opacity = rnd(0.4, 0.65).toFixed(2);
    }
    return c;
  }

  // ── 构建一只飞鸟 ─────────────────────────────────────────────
  function makeBird(i) {
    var b = el("div", "fx-bird");
    b.appendChild(el("b")); // 左翼
    b.appendChild(el("s")); // 右翼
    var dur = rnd(16, 26); // 秒,横掠全屏一次的时长
    b.style.top = rnd(8, 26) + "vh";
    b.style.animationDuration = dur + "s";
    // 长延迟 + 错开 → "偶尔"才掠过,而非持续有鸟
    b.style.animationDelay = -rnd(0, dur) + rnd(0, 24) * (i + 1) + "s";
    var sc = rnd(0.8, 1.3);
    b.style.transform = "scale(" + sc.toFixed(2) + ")";
    return b;
  }

  // ── 建持久覆盖层并填充粒子 ──────────────────────────────────
  function buildLayer() {
    if (document.getElementById(LAYER_ID)) {
      layer = document.getElementById(LAYER_ID);
      return;
    }
    layer = el("div");
    layer.id = LAYER_ID;

    var i;
    for (i = 0; i < COUNT.cloud; i++) layer.appendChild(makeCloud(i));
    for (i = 0; i < COUNT.petal; i++) layer.appendChild(makePetal());
    for (i = 0; i < COUNT.bird; i++) layer.appendChild(makeBird(i));

    // 挂在 body 下(#app 是 fixed flex,body 同样可铺满);独立于 #main
    document.body.appendChild(layer);
  }

  // ── 大宅横幅:附加 ken-burns + 炊烟 + 灯笼光晕 ──────────────
  function decorateBanner(banner) {
    if (!banner || banner.__fxDone) return;
    banner.__fxDone = true;
    banner.classList.add("fx-banner-on"); // 触发 img ken-burns(CSS)

    var fxlayer = el("div", "fx-banner-layer");
    // 两缕炊烟(留)
    fxlayer.appendChild(el("div", "fx-smoke s1"));
    fxlayer.appendChild(el("div", "fx-smoke s2"));
    // ★灯笼光晕已去掉(老板:左上角的灯光没用)

    // 插在 img 之后、mbcap 之前最稳:直接 append,fx-banner-layer 自带 z-index:1
    banner.appendChild(fxlayer);
  }

  // 扫描当前文档里的 banner(可能已存在)
  function scanBanners(root) {
    var list = (root || document).querySelectorAll(BANNER_SEL);
    for (var i = 0; i < list.length; i++) decorateBanner(list[i]);
  }

  // ── 监听 #main 内容重渲染(render() innerHTML 重写会换掉 banner) ──
  function watchBanner() {
    var main = document.getElementById("main");
    if (!main || bannerObserver) return;
    bannerObserver = new MutationObserver(function () {
      // 重渲染后 banner 是全新节点,__fxDone 标记自然消失 → 重新装点
      scanBanners(main);
    });
    bannerObserver.observe(main, { childList: true, subtree: true });
    scanBanners(main); // 立即扫一遍(首屏可能已在宅院页)
  }

  // ── 页面不可见时暂停动画(省电、回前台无堆积) ───────────────
  function onVisibility() {
    if (!layer) return;
    layer.style.animationPlayState = document.hidden ? "paused" : "running";
    // 子节点动画统一暂停:用 class 切 play-state(避免逐个改)
    layer.classList.toggle("fx-paused", document.hidden);
  }

  // ── 开 / 关(预览用) ────────────────────────────────────────
  function on() {
    if (mqReduce.matches) return; // 尊重系统偏好,不强开
    if (!layer) buildLayer();
    layer.classList.remove("fx-off");
    layer.style.display = "";
    watchBanner();
  }
  function off() {
    if (layer) {
      layer.classList.add("fx-off");
      // 渐隐后彻底移出渲染,真正零开销
      setTimeout(function () {
        if (layer && layer.classList.contains("fx-off"))
          layer.style.display = "none";
      }, 850);
    }
    // banner 局部动效一并撤掉
    var list = document.querySelectorAll(BANNER_SEL + ".fx-banner-on");
    for (var i = 0; i < list.length; i++) {
      list[i].classList.remove("fx-banner-on");
      var fx = list[i].querySelector(".fx-banner-layer");
      if (fx) fx.remove();
      list[i].__fxDone = false;
    }
  }

  window.__fx_ambient_on = on;
  window.__fx_ambient_off = off;

  // ── 自启动 ──────────────────────────────────────────────────
  function init() {
    if (mqReduce.matches) return; // reduced-motion:CSS 已隐藏,JS 也不建
    buildLayer();
    watchBanner();
    document.addEventListener("visibilitychange", onVisibility, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
