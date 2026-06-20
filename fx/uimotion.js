/* ============================================================
   uimotion.js — 界面/转场动效(UI motion)原型
   自执行 IIFE,加载即 hook:
     · 猴补丁 window.setView → 切页签时 #main 优雅淡入上滑 + 卡片错落进场
     · MutationObserver(#modal) → 弹窗弹性开场
     · MutationObserver(#main)  → 仅"刚切页签"那一拍给卡片打 stagger
   纯 transform/opacity · 尊重 prefers-reduced-motion · 主题安全 · 手机+PC
   开关:window.__fx_uimotion_on() / __fx_uimotion_off()
   不改任何原文件,全部在本模块 hook。
   ============================================================ */
(function(){
  'use strict';
  if (window.__fx_uimotion_installed) return;
  window.__fx_uimotion_installed = true;

  var BODY_CLASS = 'fx-uimotion';
  var reduce = (function(){
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch(e){ return false; }
  })();

  // —— 内部状态 ——
  var enabled = true;            // 模块总开关
  var lastView = null;           // 记录上次 view,用于判断"真切换"
  var stagWindow = false;        // "刚切页签"窗口:此期间 #main 新增卡片才做 stagms
  var stagWindowTimer = null;
  var mainObs = null;
  var modalObs = null;

  function body(){ return document.body; }
  function $(sel){ return document.querySelector(sel); }

  // ====== ① 页面转场 + 触发 stagger 窗口(由 setView 包裹调用) ======
  function playViewTransition(){
    if (!enabled || reduce) return;
    var main = $('#main');
    if (!main) return;
    // 重放动画:移除→强制重排→再加
    main.classList.remove('fx-view-in');
    void main.offsetWidth;
    main.classList.add('fx-view-in');
    var onEnd = function(){ main.classList.remove('fx-view-in'); main.removeEventListener('animationend', onEnd); };
    main.addEventListener('animationend', onEnd);

    // 打开"刚切页签"窗口:让紧随其后的 #main 重建中的卡片做错落进场
    stagWindow = true;
    if (stagWindowTimer) clearTimeout(stagWindowTimer);
    stagWindowTimer = setTimeout(function(){ stagWindow = false; }, 120);
  }

  // 给一批卡片打错落进场 class(只在切页签窗口内的那一次重建用)
  function staggerCards(){
    if (!enabled || reduce) return;
    var cards = document.querySelectorAll('#main .card');
    var n = Math.min(cards.length, 60);   // 安全上限,避免极端长列表开销
    for (var i = 0; i < n; i++){
      var c = cards[i];
      // 清旧 stag class(防重复重渲染叠加)
      c.classList.remove('fx-in');
      for (var s = 0; s <= 11; s++) c.classList.remove('fx-stag-' + s);
      void c.offsetWidth;
      c.classList.add('fx-in');
      if (i <= 11) c.classList.add('fx-stag-' + i);   // 前 12 个错落,其余立即进场(不拖尾)
      bindCardInEnd(c);
    }
  }
  // 进场动画结束后清掉 .fx-in / .fx-stag-*,把 transform 交还给 .live 呼吸
  function bindCardInEnd(card){
    var done = function(e){
      if (e && e.target !== card) return;
      card.classList.remove('fx-in');
      for (var s = 0; s <= 11; s++) card.classList.remove('fx-stag-' + s);
      card.removeEventListener('animationend', done);
    };
    card.addEventListener('animationend', done);
  }

  // ====== 猴补丁 window.setView ======
  function hookSetView(){
    var orig = window.setView;
    if (typeof orig !== 'function') return false;
    if (orig.__fx_wrapped) return true;
    var wrapped = function(v){
      var changing = (v !== lastView);
      var r = orig.apply(this, arguments);   // 先让原函数重建 #main(同步)
      lastView = v;
      if (changing) {
        // 原函数已经把 #main innerHTML 重建完;此刻打转场 + stagger
        playViewTransition();
        staggerCards();
      }
      return r;
    };
    wrapped.__fx_wrapped = true;
    wrapped.__fx_orig = orig;
    window.setView = wrapped;
    return true;
  }

  // ====== ③ 弹窗弹性开场:观察 #modal 的 class(hidden→显示) ======
  function setupModalObserver(){
    var modal = $('#modal');
    if (!modal) return;
    if (modalObs) modalObs.disconnect();
    var wasHidden = modal.classList.contains('hidden');
    modalObs = new MutationObserver(function(){
      var hiddenNow = modal.classList.contains('hidden');
      if (wasHidden && !hiddenNow) {
        // 刚打开
        if (enabled && !reduce) {
          modal.classList.remove('fx-modal-in');
          void modal.offsetWidth;
          modal.classList.add('fx-modal-in');
          var box = modal.querySelector('#modal-box');
          var clean = function(){
            modal.classList.remove('fx-modal-in');
            if (box) box.removeEventListener('animationend', clean);
          };
          if (box) box.addEventListener('animationend', clean);
          else setTimeout(clean, 360);
        }
      }
      wasHidden = hiddenNow;
    });
    modalObs.observe(modal, { attributes:true, attributeFilter:['class'] });
  }

  // ====== ② #main 安全网:若 setView 未触发(极端时序),靠观察兜底 stagger ======
  // 仅在 stagWindow 打开时对 #main 子节点新增做一次错落(避免每帧重渲染都动)
  function setupMainObserver(){
    var main = $('#main');
    if (!main) return;
    if (mainObs) mainObs.disconnect();
    mainObs = new MutationObserver(function(muts){
      if (!stagWindow || !enabled || reduce) return;
      var added = false;
      for (var i=0;i<muts.length;i++){ if (muts[i].addedNodes && muts[i].addedNodes.length){ added = true; break; } }
      if (!added) return;
      // 该窗口内只兜底一次
      stagWindow = false;
      if (stagWindowTimer) clearTimeout(stagWindowTimer);
      staggerCards();
    });
    mainObs.observe(main, { childList:true });
  }

  // ====== 开/关 ======
  function on(){
    enabled = true;
    body().classList.add(BODY_CLASS);
  }
  function off(){
    enabled = false;
    body().classList.remove(BODY_CLASS);
    // 清残留 class
    var main = $('#main'); if (main) main.classList.remove('fx-view-in');
    var modal = $('#modal'); if (modal) modal.classList.remove('fx-modal-in');
    document.querySelectorAll('#main .card.fx-in').forEach(function(c){
      c.classList.remove('fx-in');
      for (var s=0;s<=11;s++) c.classList.remove('fx-stag-'+s);
    });
  }
  window.__fx_uimotion_on = on;
  window.__fx_uimotion_off = off;

  // ====== 安装(DOM 就绪后) ======
  function install(){
    on();
    if (typeof view !== 'undefined') lastView = view;   // 同步当前 view(全局)
    setupModalObserver();
    setupMainObserver();
    // setView 由 main.js 末尾 init() 时绑定,且本模块在它之后加载,通常已就绪;
    // 若尚未就绪,轮询短暂重试。
    if (!hookSetView()) {
      var tries = 0;
      var iv = setInterval(function(){
        if (hookSetView() || ++tries > 40) clearInterval(iv);
      }, 50);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
