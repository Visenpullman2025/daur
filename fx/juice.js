'use strict';
/* ============================================================
   juice.js — 生产/收成反馈动效(juice / 游戏手感)原型。
   自执行 IIFE,加载即初始化。零依赖,纯 DOM + CSS 动画(transform/opacity)。

   做三件事(都在独立覆盖层 #fx-juice 里画,不碰 #main):
     ① 顶栏数值(银/粮/家产/官面)涨时 → 数字脉冲 + 一串铜钱/谷粒从来源飞向对应数值;
     ② 产业卡产出(检测到 .cgain 飘字)→ 卡片图标 squash&stretch 弹跳 + 收成金色火花;
     ③ 大成就(检测到全屏 .upflash,即升阶/中举/达标)→ 金光迸发。

   检测手段(只读,不改其它文件):
     · 轮询全局 S(S.silver / 院子粮 / 家产 / 官面)+ HUD 文本兜底 → 增量为正才触发;
     · MutationObserver 观察 #toast 新增 .toast、#main 新增 .cgain、body 新增 .upflash。

   暴露:window.__fx_juice_demo() / __fx_juice_on() / __fx_juice_off()
   风格:古铜金、雅致克制(粒子少、时长短、不过曝)。性能优先(粒子上限 + 节流)。
   ============================================================ */
(function(){
  if (window.__fx_juice_loaded) return;   // 防重复加载
  window.__fx_juice_loaded = true;

  // —— 调参(雅致克制) ——
  var CFG = {
    maxParticles: 18,      // 同屏粒子硬上限(防卡顿)
    coinsPerGain: 5,       // 一次收益最多飞几枚(按金额缩放)
    flyDur: 720,           // 飞行时长 ms
    stagger: 55,           // 每枚出发间隔 ms
    pollMs: 220,           // 轮询数值变化间隔
    minSilverGain: 1,      // 银低于此涨幅不放(避免噪声)
    arcLift: 70            // 飞行抛物线起拱高度 px
  };

  var layer = null;        // 覆盖层 #fx-juice
  var live = 0;            // 当前在飞粒子数
  var enabled = true;

  // 受监控的 HUD 数值:key → {sel:HUD <b> 选择器, get:从 S 读当前值, kind:粒子类型}
  var WATCH = [
    { sel:'#silver', kind:'coin',  get:function(){ return num(window.S && S.silver); } },
    { sel:'#grain',  kind:'grain', get:function(){ return (typeof homeGrain==='function' ? num(homeGrain()) : NaN); } },
    { sel:'#favor',  kind:'coin',  get:function(){ return num(window.S && S.favor); } },
    { sel:'#assets', kind:'coin',  get:function(){ return num(window.S && S.assets); } } // S.assets 可能不存在→走 HUD 文本兜底
  ];
  var last = {};           // 上次值,判增量

  function num(v){ var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.\-]/g,'')); return isFinite(n) ? n : NaN; }
  function $(s){ return document.querySelector(s); }

  // —— 覆盖层 ——
  function ensureLayer(){
    if (layer && document.body.contains(layer)) return layer;
    layer = document.getElementById('fx-juice');
    if (!layer){
      layer = document.createElement('div');
      layer.id = 'fx-juice';
      document.body.appendChild(layer);
    }
    return layer;
  }

  // 元素中心点(视口坐标)
  function centerOf(el){
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  }

  // —— ① 数字脉冲(独立类,不和游戏自带 .pulse 冲突) ——
  function pulse(el){
    if (!el) return;
    el.classList.remove('fx-hit');
    void el.offsetWidth;              // 重启动画
    el.classList.add('fx-hit');
    setTimeout(function(){ el.classList.remove('fx-hit'); }, 520);
  }

  // —— 飞行粒子:从 from(视口点) 飞向 to(视口点),抛物线 + 旋转 + 缩放 ——
  function flyParticle(from, to, kind, delay){
    if (!enabled || live >= CFG.maxParticles) return;
    ensureLayer();
    var p = document.createElement('div');
    p.className = 'fxp ' + (kind === 'grain' ? 'grain' : 'coin');
    // 起点处少许散布,让一串粒子不挤成一条线
    var jx = (Math.random()*2-1) * 14, jy = (Math.random()*2-1) * 10;
    var sx = from.x + jx, sy = from.y + jy;
    var dx = to.x + (Math.random()*2-1)*8, dy = to.y + (Math.random()*2-1)*6;
    // 抛物线中点(略向上拱)
    var mx = (sx + dx)/2 + (Math.random()*2-1)*16;
    var my = Math.min(sy, dy) - CFG.arcLift * (0.6 + Math.random()*0.5);
    p.style.setProperty('--fx-sx', sx + 'px'); p.style.setProperty('--fx-sy', sy + 'px');
    p.style.setProperty('--fx-mx', mx + 'px'); p.style.setProperty('--fx-my', my + 'px');
    p.style.setProperty('--fx-dx', dx + 'px'); p.style.setProperty('--fx-dy', dy + 'px');
    p.style.setProperty('--fx-dur', CFG.flyDur + 'ms');
    p.style.setProperty('--fx-delay', (delay||0) + 'ms');
    layer.appendChild(p);
    live++;
    var done = false;
    function clean(){ if (done) return; done = true; live = Math.max(0, live-1); if (p.parentNode) p.remove(); }
    p.addEventListener('animationend', clean);
    setTimeout(clean, CFG.flyDur + (delay||0) + 260);   // 兜底清理
  }

  // 放一串粒子从 from 飞到 HUD 选择器对应数值,并在抵达时脉冲
  function burstToHUD(from, hudSel, kind, count){
    var target = $(hudSel);
    var to = centerOf(target);
    if (!from || !to) return;
    count = Math.max(1, Math.min(CFG.coinsPerGain, count|0 || 1));
    for (var i=0;i<count;i++) flyParticle(from, to, kind, i*CFG.stagger);
    // 末枚抵达时脉冲数字(与飞行尾段对齐)
    setTimeout(function(){ pulse(target); }, (count-1)*CFG.stagger + CFG.flyDur*0.78);
  }

  // 收益金额 → 飞几枚(对数缩放,雅致不刷屏)
  function coinsFor(gain){
    if (!(gain > 0)) return 1;
    return Math.max(2, Math.min(CFG.coinsPerGain, Math.round(Math.log10(gain+1) * 2.2) + 1));
  }

  // —— 来源点:优先正在产出的卡片;否则屏幕中下方 ——
  function pickSource(){
    var cards = document.querySelectorAll('#main .card.live[data-type], #main .card.live');
    var vis = [];
    for (var i=0;i<cards.length;i++){
      var c = centerOf(cards[i]);
      if (c && c.y > 0 && c.y < window.innerHeight) vis.push(c);
    }
    if (vis.length) return vis[(Math.random()*vis.length)|0];
    return { x: window.innerWidth/2, y: window.innerHeight*0.72 };
  }

  // —— ② 卡片图标弹跳 + 收成火花 ——
  function bounceCard(cardEl){
    if (!cardEl) return;
    var ico = cardEl.querySelector('.ico') || cardEl;
    ico.classList.remove('fx-bounce');
    void ico.offsetWidth;
    ico.classList.add('fx-bounce');
    setTimeout(function(){ ico.classList.remove('fx-bounce'); }, 480);
    sparkAt(centerOf(ico));
  }

  // 在视口点 c 迸几点金色火花 + 一层暖光圈(短促、淡)
  function sparkAt(c){
    if (!enabled || !c) return;
    ensureLayer();
    // 光圈
    var g = document.createElement('div');
    g.className = 'fxglow';
    g.style.transform = 'translate(' + c.x + 'px,' + c.y + 'px)';
    layer.appendChild(g);
    setTimeout(function(){ if (g.parentNode) g.remove(); }, 520);
    // 火花(3~4 点,向上散开)
    var n = 3 + (Math.random()*2|0);
    for (var i=0;i<n;i++){
      if (live >= CFG.maxParticles) break;
      var s = document.createElement('div');
      s.className = 'fxspark';
      var ang = (-Math.PI/2) + (Math.random()*2-1) * (Math.PI*0.55);
      var dist = 18 + Math.random()*22;
      s.style.transform = 'translate(' + c.x + 'px,' + c.y + 'px)';
      s.style.setProperty('--fx-dx', Math.cos(ang)*dist + 'px');
      s.style.setProperty('--fx-dy', Math.sin(ang)*dist + 'px');
      s.style.setProperty('--fx-dur', (480 + Math.random()*160) + 'ms');
      s.style.setProperty('--fx-delay', (i*30) + 'ms');
      layer.appendChild(s);
      (function(el){ setTimeout(function(){ if (el.parentNode) el.remove(); }, 760); })(s);
    }
  }

  // —— ③ 大成就金光迸发(升阶/中举/达标)——
  function bigBurst(){
    if (!enabled) return;
    ensureLayer();
    var veil = document.createElement('div'); veil.className = 'fxveil';
    var b = document.createElement('div'); b.className = 'fxburst';
    layer.appendChild(veil); layer.appendChild(b);
    setTimeout(function(){ if (veil.parentNode) veil.remove(); }, 880);
    setTimeout(function(){ if (b.parentNode) b.remove(); }, 920);
  }

  // ============================================================
  //  触发源
  // ============================================================

  // (a) 轮询 S / HUD 文本:数值正增量 → 飞粒子 + 脉冲
  function pollValues(){
    if (!enabled) return;
    for (var i=0;i<WATCH.length;i++){
      var w = WATCH[i];
      var cur = w.get();
      if (!isFinite(cur)){                       // S 里没有→读 HUD <b> 文本兜底
        cur = num(textVal(w.sel));
        if (!isFinite(cur)) continue;
      }
      var prev = last[w.sel];
      if (prev != null && cur > prev){
        var gain = cur - prev;
        var thr = (w.sel === '#silver') ? CFG.minSilverGain : 0.5;
        if (gain >= thr){
          var src = pickSource();
          burstToHUD(src, w.sel, w.kind, coinsFor(gain));
        }
      }
      last[w.sel] = cur;
    }
  }

  // HUD <b> 的纯数字文本(grain/labor 含 span,取整体数字串里第一段)
  function textVal(sel){
    var el = $(sel); if (!el) return NaN;
    // grain 显示 "口粮/可交易/在长",我们以院子口粮(第一段,.idle)为准;其余取全文数字
    var idle = el.querySelector('.idle');
    var t = idle ? idle.textContent : el.textContent;
    return num(t);
  }

  // (b) 观察 DOM:.cgain 飘字(产出)/ .upflash(大成就)
  var produceThrottle = 0;
  function onAddedNode(node){
    if (node.nodeType !== 1) return;
    // 产业卡 +N 飘字 → 该卡弹跳 + 火花(节流,避免一波多卡刷屏)
    if (node.classList && node.classList.contains('cgain')){
      var now = Date.now();
      if (now - produceThrottle < 90) return;     // 同一 tick 多张只取部分
      produceThrottle = now;
      var card = node.closest ? node.closest('.card') : null;
      if (card) bounceCard(card);
      return;
    }
    // 大成就金光(游戏自带 .upflash 由 flashUp() 在升阶/中举/达标时插 body)
    if (node.classList && node.classList.contains('upflash')){
      bigBurst();
      return;
    }
    // 嵌套出现的 cgain（保险）
    if (node.querySelector){
      var g = node.querySelector('.cgain');
      if (g){ var c2 = g.closest('.card'); if (c2) bounceCard(c2); }
    }
  }

  function startObserver(){
    var mo = new MutationObserver(function(muts){
      for (var i=0;i<muts.length;i++){
        var added = muts[i].addedNodes;
        for (var j=0;j<added.length;j++) onAddedNode(added[j]);
      }
    });
    mo.observe(document.body, { childList:true, subtree:true });
  }

  // ============================================================
  //  对外开关 + 演示
  // ============================================================
  function on(){ enabled = true; if (layer) layer.classList.remove('off'); }
  function off(){ enabled = false; if (layer){ layer.classList.add('off'); layer.innerHTML = ''; } live = 0; }

  // 一段示例:几枚铜钱从屏幕中下方飞向顶栏 💰(银)+ 数字脉冲 + 一处卡片火花弹跳 + 金光
  function demo(){
    ensureLayer();
    var wasOff = !enabled; if (wasOff) on();
    var from = { x: window.innerWidth/2, y: window.innerHeight*0.74 };
    // ① 铜钱飞向银 + 脉冲
    burstToHUD(from, '#silver', 'coin', 5);
    // 谷粒飞向粮(错开一点)
    setTimeout(function(){
      burstToHUD({ x: window.innerWidth*0.4, y: window.innerHeight*0.66 }, '#grain', 'grain', 4);
    }, 260);
    // ② 一处卡片火花弹跳(没有卡片就用屏幕中部模拟一处)
    setTimeout(function(){
      var card = document.querySelector('#main .card.live, #main .card');
      if (card) bounceCard(card);
      else sparkAt({ x: window.innerWidth/2, y: window.innerHeight*0.5 });
    }, 180);
    // ③ 大成就金光(压轴)
    setTimeout(bigBurst, 620);
  }

  // ============================================================
  //  初始化
  // ============================================================
  function init(){
    ensureLayer();
    // 记录初值,避免首帧把存档里的大数值当成"刚赚到"全飞出来
    for (var i=0;i<WATCH.length;i++){
      var v = WATCH[i].get();
      last[WATCH[i].sel] = isFinite(v) ? v : num(textVal(WATCH[i].sel));
    }
    startObserver();
    // ★去掉"逐笔金钱→顶栏飞铜钱+跳数字"的轮询(零售细水会让顶栏一直跳,老板嫌难看)。
    //   只保留:产业卡产出弹跳火花(.cgain) + 大成就金光(.upflash)。如需恢复:setInterval(pollValues, CFG.pollMs);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.__fx_juice_demo = demo;
  window.__fx_juice_on   = on;
  window.__fx_juice_off  = off;
})();
