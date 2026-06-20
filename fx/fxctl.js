'use strict';
/* [动效总控] 4 个动效模块(ambient/juice/uimotion/scene)主开关。默认开,设置页「动效」可关。存 daur-fx。
   模块本身加载即自启;本控制器据存档统一开/关,并供设置页调用。 */
(function(){
  var KEYS=['ambient','juice','uimotion','scene'];
  var SK='daur-fx';
  function isOn(){ try{ var v=localStorage.getItem(SK); return v===null ? true : v==='1'; }catch(e){ return true; } }
  function call(k,s){ var f=window['__fx_'+k+'_'+s]; if(typeof f==='function'){ try{ f(); }catch(e){} } }
  function apply(){ var on=isOn(); KEYS.forEach(function(k){ call(k, on?'on':'off'); }); }
  window.fxIsOn=isOn;
  window.setFx=function(on){
    try{ localStorage.setItem(SK, on?'1':'0'); }catch(e){}
    apply();
    if(typeof view!=='undefined' && view==='set' && typeof renderMain==='function') renderMain();
    if(typeof toast==='function') toast(on?'✨ 动效已开':'动效已关');
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(apply,60); }); else setTimeout(apply,60);
})();
