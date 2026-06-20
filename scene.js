'use strict';
// [scene] 场景版视图基座:全屏大图舞台 + 拖动/缩放 + 底部滑出面板。
// 视图内容在 render.js 构建;本模块只提供通用件(命名空间 sc-*,不碰旧 .scene/.card)。
let _scPZ = null;   // 当前 panzoom(切页重建)

// 建一个全屏舞台到 #main。opts: {bg, worldClass, cap, ph, hotspots, labels, ctl, fit, aspect}
// fit:true → 整体图模式:图按原比例(aspect,默认"3 / 4")完整显示在中央(.sc-stage),热点落在图上 → 坐标 1:1、零裁切;
//            画面余白用同图模糊版铺底(.sc-backdrop)→ 不留空白边、像取景框。普通模式仍 cover 铺满。
function scStage(opts){
  const main=document.getElementById("main"); if(!main) return;
  main.classList.add("sc");
  const grad="linear-gradient(180deg,rgba(40,30,16,.03),rgba(40,30,16,.20))";
  let world;
  if(opts.fit && opts.bg){
    // 整体图完整显示:用 <img> contain(不裁切不变形),热点 % 落在图上。余白用模糊同图铺底。
    // .sc-stage 尺寸由 scFitStage() 在图加载后按"包含盒"精确算出 → 热点 1:1。
    world = `<div class="sc-world fit ${opts.worldClass||""}" id="sc-world">
      <div class="sc-backdrop" style="background-image:url('${opts.bg}')"></div>
      <div class="sc-stage"><img class="sc-stage-img" decoding="async" src="${opts.bg}" alt="" onload="scFitStage()"><div class="sc-stage-grad"></div><div class="sc-mist"></div>${opts.hotspots||""}</div>
    </div>`;
  } else {
    const bgStyle = opts.bg ? `style="background-image:${grad},url('${opts.bg}')"` : "";
    world = `<div class="sc-world ${opts.worldClass||""}" id="sc-world" ${bgStyle}><div class="sc-mist"></div>${opts.hotspots||""}</div>`;
  }
  main.innerHTML = `
    <div class="sc-vp" id="sc-vp">${world}</div>
    <div class="sc-ovl">
      ${opts.cap?`<div class="sc-cap">${opts.cap}</div>`:""}${opts.ph?`<div class="sc-ph">${opts.ph}</div>`:""}
      <div class="sc-zoom"><button onclick="scZoom(1)">＋</button><button onclick="scZoom(-1)">−</button><button onclick="scZoom('reset')">⊙</button></div>
      ${opts.ctl||""}
      ${opts.labels?`<div class="sc-labels">${opts.labels}</div>`:""}
    </div>`;
  scAttachPanZoom();
}
function scExit(){ const m=document.getElementById("main"); if(m) m.classList.remove("sc"); _scPZ=null; }

function scAttachPanZoom(){
  const vp=document.getElementById("sc-vp"), world=document.getElementById("sc-world"); if(!vp||!world) return;
  let z=1,tx=0,ty=0; const MIN=1,MAX=2.8; const pts=new Map(); let startDist=0,startZ=1,downX=0,downY=0,moved=false;
  function apply(){ const w=vp.clientWidth,h=vp.clientHeight; tx=Math.min(0,Math.max(w-w*z,tx)); ty=Math.min(0,Math.max(h-h*z,ty)); world.style.transform=`translate(${tx}px,${ty}px) scale(${z})`; }
  function zoomAt(cx,cy,nz){ nz=Math.min(MAX,Math.max(MIN,nz)); const wx=(cx-tx)/z, wy=(cy-ty)/z; z=nz; tx=cx-wx*z; ty=cy-wy*z; apply(); }
  vp.onpointerdown=e=>{ try{vp.setPointerCapture(e.pointerId);}catch(_){} pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); moved=false; downX=e.clientX; downY=e.clientY;
    if(pts.size===2){const a=[...pts.values()];startDist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);startZ=z;} };
  vp.onpointermove=e=>{ if(!pts.has(e.pointerId))return; const prev=pts.get(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){const a=[...pts.values()];const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y); const r=vp.getBoundingClientRect(); zoomAt((a[0].x+a[1].x)/2-r.left,(a[0].y+a[1].y)/2-r.top, startZ*(d/startDist)); moved=true; return;}
    tx+=e.clientX-prev.x; ty+=e.clientY-prev.y; if(Math.abs(e.clientX-downX)+Math.abs(e.clientY-downY)>6) moved=true; apply(); };
  vp.onpointerup=e=>{   // 单指 + 未缩放 + 横向快滑 → 左右翻页(沉浸切页);缩放态下拖动仍是平移
    if(pts.size===1 && z<=1.05){ const dx=e.clientX-downX, dy=e.clientY-downY;
      if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.4 && typeof scSwipe==="function") scSwipe(dx>0?1:-1); }
    pts.delete(e.pointerId);
  };
  vp.onpointercancel=e=>pts.delete(e.pointerId);
  vp.onwheel=e=>{ e.preventDefault(); const r=vp.getBoundingClientRect(); zoomAt(e.clientX-r.left,e.clientY-r.top, z*(e.deltaY<0?1.15:0.87)); };
  vp.addEventListener("click", e=>{ if(moved){ e.stopPropagation(); e.preventDefault(); } }, true);
  _scPZ={ zoom:d=>{ const r=vp.getBoundingClientRect(); zoomAt(r.width/2,r.height/2, d==="reset"?1:z*(d>0?1.3:0.77)); } };
  apply();
}
function scZoom(d){ if(_scPZ) _scPZ.zoom(d); }
// 把整体图 .sc-stage 精确缩放到"包含盒"(图按原比例放进视口、不裁切不变形),热点 % 即落在图上
function scFitStage(){
  const vp=document.getElementById("sc-vp"), stage=document.querySelector(".sc-stage"), img=document.querySelector(".sc-stage-img");
  if(!vp||!stage||!img) return;
  const iw=img.naturalWidth||3, ih=img.naturalHeight||4, vw=vp.clientWidth, vh=vp.clientHeight;
  // 自适应填满(治两边/上下留白):图比视口更瘦→填满宽度(竖图无两边空),更胖→填满高度;溢出>2倍才回退 contain(防极端宽/高屏裁太狠)
  const arImg=iw/ih, arVp=vw/vh; let s;
  if(arImg < arVp){ s=vw/iw; if(ih*s > vh*1.25) s=Math.min(vw/iw, vh/ih); }   // 图更瘦→填满宽,溢出>25%(会裁掉建筑)则回退完整显示
  else { s=vh/ih; if(iw*s > vw*1.25) s=Math.min(vw/iw, vh/ih); }              // 图更胖→填满高
  stage.style.width=Math.round(iw*s)+"px"; stage.style.height=Math.round(ih*s)+"px";
}

// ===== 底部滑出面板(替代旧居中 modal 用于产业管理) =====
function scSheet(html){ const s=document.getElementById("sheet"), bg=document.getElementById("sheetbg"); if(!s) return;
  s.innerHTML=`<div class="sc-grip"></div>`+html; s.classList.remove("hidden"); bg.classList.remove("hidden");
  requestAnimationFrame(()=>{ s.classList.add("on"); bg.classList.add("on"); }); }
function scCloseSheet(){ const s=document.getElementById("sheet"), bg=document.getElementById("sheetbg"); if(!s) return;
  s.classList.remove("on"); bg.classList.remove("on"); setTimeout(()=>{ s.classList.add("hidden"); bg.classList.add("hidden"); },260);
  if(typeof _curDept!=="undefined") _curDept=null; if(typeof _sheetReopen!=="undefined") _sheetReopen=null; }
function scSheetOpen(){ const s=document.getElementById("sheet"); return s && s.classList.contains("on"); }

// ===== 热点 / 标记 / 标签 构件 =====
// 产业牌:图标 + 名 + ×数量 + Lv + 产出(数字优先)
function scPin(o){
  const cnt = o.cnt!=null ? `<i class="sc-cnt">${o.cnt}</i>` : "";
  const lv  = (!o.mini && o.lv)  ? `<i class="sc-lv">Lv${o.lv}</i>` : "";
  const out = (!o.mini && o.out) ? `<i class="sc-out">${o.out}</i>` : "";
  const token = o.sprite ? `<div class="sc-ground"></div><img class="sc-sprite" decoding="async" src="${o.sprite}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sc-spfall',innerHTML:this.dataset.fb||''}))" data-fb="${(o.iconHTML||'').replace(/"/g,'&quot;')}">` : (o.iconHTML||"");
  const tokStyle = o.size ? ` style="width:${o.size}px;height:${o.size}px"` : "";
  return `<div class="sc-pin ${o.mini?"mini":""} ${o.sprite?"hassprite":""}" data-fxout="${o.fxout||""}" style="left:${o.x}%;top:${o.y}%" onclick="${o.onclick}">
    <div class="sc-cap2">${o.name}${cnt}${lv}${out}</div>
    <div class="sc-token"${tokStyle}>${token}</div></div>`;
}
// 整体图(建筑已画进背景)上的「可点标签」:不再叠贴图,只在建筑处放一个名牌+脉冲定位点 → 零违和
function scTag(o){
  const cnt  = o.cnt!=null ? `<i class="sc-cnt">${o.cnt}</i>` : "";
  const lv   = o.lv ? `<i class="sc-lv">Lv${o.lv}</i>` : "";
  const idle = o.idle ? `<i class="sc-idle">❗</i>` : "";   // 田类荒着→红❗(不写"N荒"字)
  return `<div class="sc-tag ${o.cls||""}" data-fxout="${o.fxout||""}" style="left:${o.x}%;top:${o.y}%" onclick="${o.onclick}">
    <span class="sc-tlbl">${o.ico||""}${o.name}${cnt}${lv}${idle}</span><span class="sc-tdot"></span></div>`;
}
// 整体图上的「可点建筑区」:微弱边框框住建筑(标明可点)+ 右下角小状态(×数/Lv/荒),不再显示长名字(图本身=名字)
function scZone(o){
  const badge = o.badge ? `<i class="sc-zbadge ${o.bw?"warn":""}">${o.badge}</i>` : "";
  return `<div class="sc-zone ${o.cls||""}" data-fxout="${o.fxout||""}" style="left:${o.x}%;top:${o.y}%;width:${o.w}%;height:${o.h}%" onclick="${o.onclick}">${badge}</div>`;
}
// 城镇圆标记(小)
function scMark(o){ return `<div class="sc-mark" style="left:${o.x}%;top:${o.y}%" onclick="${o.onclick}"><div class="sc-mic">${o.iconHTML||""}</div><div class="sc-mcl">${o.name}</div></div>`; }
// 底部标签
function scLabel(txt,onclick){ return `<button class="sc-lbl" onclick="${onclick}">${txt}</button>`; }

// ===== 📐 布局编辑器:老板拖建筑到满意位置 → 存坐标 → 导出给我固化(绕开"AI看不准位置"盲区) =====
let _layout = {}, _editMode = false, _eDrag = null, _eSel = null;
// ★老板拖定的出厂默认布局(键=「场景:建筑/铺位」→[x%,y%,宽%])。优先级:本机拖的覆盖 > 此出厂默认 > 代码各场景坐标表。
// ★★这些坐标是老板亲自摆的位置槽——不管将来槽里换成哪座建筑,坐标别动(除非老板重新拖)。街市另在 TOWN_ISO 锁。
const DEFAULT_LAYOUT = {
  // 田庄(产业页)
  "farm:steelmill":[15.7,34.6,20], "farm:brickkiln":[43.8,36,20], "farm:forest":[28.4,29.8,20], "farm:porcelain":[40.5,24.2,20],
  "farm:mine":[54.7,29,20], "farm:barn":[30.2,42,20], "farm:stable":[60.7,42.7,20], "farm:smithy":[74.6,35.1,20], "farm:carpentry":[70.6,23.4,20],
  // 城镇·成都府(kaifeng):官面/服务固定建筑 + 4 铺位 kf1~kf4
  "city:kaifeng_market":[63.2,91.9,19], "city:kaifeng_broker":[38.7,31.5,19], "city:kaifeng_exam":[68.7,42.1,19], "city:kaifeng_yamen":[57.6,75.1,19],
  "city:kaifeng_salt":[63.3,29.9,19], "city:kaifeng_escort":[43.6,44.2,19], "city:kaifeng_press":[50.9,59,19],
  "city:kaifeng_kf1":[89.5,27.3,18], "city:kaifeng_kf2":[93.6,41.1,18], "city:kaifeng_kf3":[76.9,57,18], "city:kaifeng_kf4":[86.1,71.8,18],
};
function loadLayout(){ try{ _layout = JSON.parse(localStorage.getItem("daur-layout")) || {}; }catch(e){ _layout = {}; } }
function saveLayout(){ try{ localStorage.setItem("daur-layout", JSON.stringify(_layout)); }catch(e){} }
function lpKey(k){ return (typeof view!=="undefined"?view:"") + ":" + k; }
function LP(k, def){ const kk=lpKey(k); return _layout[kk] || DEFAULT_LAYOUT[kk] || def; }   // 本机拖的覆盖 > 出厂默认 > 代码默认
function layoutEditAttr(k){ return _editMode ? ` data-ek="${lpKey(k)}" onpointerdown="scEditDown(event)"` : ""; }
function scEditDown(e){
  if(!_editMode) return; const el=e.currentTarget, ek=el.getAttribute("data-ek"); if(!ek) return;
  e.preventDefault(); e.stopPropagation();
  const stage=document.querySelector(".sc-stage")||document.getElementById("sc-world"); if(!stage) return;
  try{ el.setPointerCapture(e.pointerId); }catch(_){}
  _eSel=ek; renderEditBar();   // 选中→编辑条出现「大小 −/＋」
  _eDrag={ el, ek, stage, w:parseFloat(el.style.width)||null, x:null, y:null };
  el.addEventListener("pointermove", scEditMove); el.addEventListener("pointerup", scEditUp); el.addEventListener("pointercancel", scEditUp);
  el.classList.add("sc-dragging");
}
// 视角缩放:调整选中建筑的大小(width%),从 DOM 当前态取位置/尺寸,改尺寸存覆盖
function adjustSel(d){ if(!_eSel) return; const el=document.querySelector('.sc-stage [data-ek="'+_eSel+'"]'); if(!el) return;
  const x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0, w=Math.max(4, (parseFloat(el.style.width)||20)+d);
  _layout[_eSel]=[+x.toFixed(1), +y.toFixed(1), +w.toFixed(1)]; saveLayout(); if(typeof render==="function") render(); renderEditBar();
}
function scEditMove(e){ if(!_eDrag) return; const r=_eDrag.stage.getBoundingClientRect();
  let x=(e.clientX-r.left)/r.width*100, y=(e.clientY-r.top)/r.height*100;
  x=Math.max(0,Math.min(100,x)); y=Math.max(0,Math.min(100,y));
  _eDrag.el.style.left=x.toFixed(1)+"%"; _eDrag.el.style.top=y.toFixed(1)+"%"; _eDrag.x=x; _eDrag.y=y;
}
function scEditUp(){ if(!_eDrag) return; const d=_eDrag;
  d.el.removeEventListener("pointermove",scEditMove); d.el.removeEventListener("pointerup",scEditUp); d.el.removeEventListener("pointercancel",scEditUp);
  d.el.classList.remove("sc-dragging");
  if(d.x!=null){ const a=[+d.x.toFixed(1), +d.y.toFixed(1)]; if(d.w) a.push(+d.w.toFixed(1)); _layout[d.ek]=a; saveLayout(); }
  _eDrag=null;
}
function toggleLayoutEdit(){
  _editMode=!_editMode;
  if(typeof closeModal==="function") closeModal();
  if(_editMode){ if(typeof setSpeed==="function") setSpeed(0); if(typeof view!=="undefined" && view==="set" && typeof setView==="function") setView("town"); }
  if(typeof render==="function") render();
  renderEditBar();
}
function renderEditBar(){
  let bar=document.getElementById("editbar");
  if(!_editMode){ if(bar) bar.remove(); return; }
  if(!bar){ bar=document.createElement("div"); bar.id="editbar";
    bar.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:rgba(60,40,20,.94);color:#f5e9d0;display:flex;gap:8px;align-items:center;justify-content:center;padding:8px 10px;font-size:13px;flex-wrap:wrap;box-shadow:0 -2px 10px rgba(0,0,0,.3)";
    document.body.appendChild(bar); }
  const btn="style=\"background:#8a6a3a;color:#fff;border:0;border-radius:6px;padding:5px 10px;font-size:13px\"";
  const sel = _eSel ? `<span>选中 <b>${_eSel.split(":")[1]}</b></span><button ${btn} onclick="adjustSel(-1.5)">− 缩小</button><button ${btn} onclick="adjustSel(1.5)">＋ 放大</button>`
                    : `<span>📐 拖建筑摆位 · 点一个再调大小(视角缩放)</span>`;
  bar.innerHTML = sel
    +`<button ${btn} onclick="exportLayout()">📤 导出</button><button ${btn} onclick="clearLayout()">↺ 清空</button><button ${btn} onclick="toggleLayoutEdit()">✓ 完成</button>`;
}
function exportLayout(){ const j=JSON.stringify(_layout);
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(j).then(()=>{ if(typeof toast==="function")toast("📋 布局已复制,粘贴发我"); }).catch(()=>{});
  if(typeof modal==="function") modal(`<h2>📤 布局坐标</h2><div class="desc">把下面整段复制发我,我固化成默认布局:</div><textarea class="admexp" readonly onclick="this.select()">${j}</textarea>`);
}
function clearLayout(){ _layout={}; saveLayout(); if(typeof toast==="function")toast("↺ 已清空,回默认布局"); if(typeof render==="function") render(); }

window.scZoom=scZoom; window.scCloseSheet=scCloseSheet; window.scFitStage=scFitStage;
window.scEditDown=scEditDown; window.toggleLayoutEdit=toggleLayoutEdit; window.exportLayout=exportLayout; window.clearLayout=clearLayout; window.adjustSel=adjustSel;
window.addEventListener("resize", ()=>{ if(document.querySelector(".sc-stage")) scFitStage(); });
loadLayout();   // 启动即读本机布局覆盖(在任何 render 前)
