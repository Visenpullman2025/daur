'use strict';
// [render] 渲染:HUD + 六页(庄园/市集/库存/城内/日志/设置)
// ===== 渲染 =====
const $ = s => document.querySelector(s);
function render(){ checkChallenge(); if(typeof warRefreshTab==="function") warRefreshTab(); renderHUD(); renderMain(); if(typeof _sheetReopen==="function" && typeof scSheetOpen==="function" && scSheetOpen()) _sheetReopen(); }   // 操作后自动刷新打开的底部面板(城内/家族等)
function renderHUD(){
  $("#tier").textContent=title(); $("#surname").textContent=S.surname;
  $("#silver").textContent=Math.round(S.silver);
  $("#grain").innerHTML=`<span class="idle">${Math.round(homeGrain())}</span>/${Math.round(G("grain"))}/${Math.round(pend("grain"))}`;   // 院子口粮(红)/可交易/在长
  $("#labor").innerHTML=`<span class="idle">${freeW()}</span>/${totalLabor()}/${workerCap()}`;   // 空闲(红)/在手/上限
  const fe=$("#favor"); if(fe) fe.textContent=Math.round(S.favor||0);
  $("#assets").textContent=assets().toLocaleString();
  $("#date").textContent=`第${yearN()}年 · ${season()}`;
  const i=tierIdx(), cur=TIERS[i][0], nxt=TIERS[Math.min(i+1,TIERS.length-1)][0];
  $("#tierbar").style.width=(nxt>cur?Math.min(100,(assets()-cur)/(nxt-cur)*100):100)+"%";
  if(i>=TIERS.length-1) $("#tiernext").textContent="富可敌国!";
  else { const need=TIER_PRESTIGE[i+1]||0, gated=prestige()<need && tierIdxByAssets()>i;
    $("#tiernext").textContent = gated ? `下阶「${TIERS[i+1][1]}」须门第 ${need}(现 ${prestige()})` : "下阶 "+TIERS[i+1][1]; }
  const ch=CHALLENGES[S.chal||0], bar=$("#chalbar");          // 挂机时目标进度条实时走
  if(ch&&bar){ const c=Math.min(ch.cur(),ch.max); bar.style.width=Math.round(c/ch.max*100)+"%"; const cn=$("#chalcur"); if(cn)cn.textContent=Math.round(c).toLocaleString(); }
  fbDiff();   // ★通用反馈:主动操作改了 银/官面/丁 → 飘 ±数值 + 跳一下(挂机被动不飘)
  renderBuildBar();
}
// ===== 通用操作反馈(一处覆盖全局)=====
let _fb=null, _inTick=false;
function fbFloat(sel, text, good){ const el=$(sel); if(!el) return; const r=el.getBoundingClientRect();
  const f=document.createElement("div"); f.className="fb-float"; f.textContent=text; f.style.color=good?"var(--good)":"var(--bad)";
  f.style.left=(r.left+r.width/2)+"px"; f.style.top=r.top+"px"; document.body.appendChild(f); setTimeout(()=>f.remove(),1100); }
function pulseEl(sel){ const e=$(sel); if(e){ e.classList.remove("pulse"); void e.offsetWidth; e.classList.add("pulse"); } }
function fbDiff(){
  const cur={ silver:Math.round(S.silver), favor:Math.round(S.favor||0), workers:S.workers||0 };
  if(_fb && !_inTick){
    const ds=cur.silver-_fb.silver; if(Math.abs(ds)>=1){ fbFloat("#silver",(ds>0?"+":"")+ds.toLocaleString()+"两", ds>0); pulseEl("#silver"); pulseEl("#assets"); }
    const df=cur.favor-_fb.favor;   if(df!==0){ fbFloat("#favor",(df>0?"+":"")+df, df>0); pulseEl("#favor"); }
    const dw=cur.workers-_fb.workers; if(dw!==0){ fbFloat("#labor",(dw>0?"+":"")+dw+"丁", dw>0); pulseEl("#labor"); }
  }
  _fb=cur;
}
// ===== 里程碑庆祝(大字落成,复用)=====
function celebrate(emoji, title, sub){
  if(typeof flashUp==="function") flashUp();
  const o=document.createElement("div"); o.className="manor-cele";
  o.innerHTML=`<div class="mc-in">${emoji}<div class="mc-t">${title}</div>${sub?`<div class="mc-s">${sub}</div>`:""}</div>`;
  document.body.appendChild(o); setTimeout(()=>o.classList.add("out"),1300); setTimeout(()=>o.remove(),1900);
}
// 全局建造进度条(命脉条下方;无在建则隐藏)
function renderBuildBar(){
  const el=$("#buildbar"); if(!el) return;
  const bs=S.builds||[];
  if(!bs.length){ el.style.display="none"; el.innerHTML=""; return; }
  el.style.display="block"; const hud=$("#hud"); if(hud) el.style.top=hud.offsetHeight+"px";   // 浮层定位到顶栏正下方(不挤 #main)
  el.innerHTML = bs.map(b=>{ const d=DEFS[b.type], pct=Math.round((1-b.daysLeft/b.total)*100);
    return `<div class="bldrow"><span class="bldlbl">🏗 ${d?d.n:''} · ${b.labor}工 · 还 ${(b.daysLeft/30).toFixed(1)}月</span><div class="bldbar"><div class="bldfill" style="width:${pct}%"></div></div></div>`;
  }).join("");
}
function renderMain(){
  const el=$("#main");
  if(view==="home"){ renderHomeScene(); }                      // 宅院=宅邸大图场景(P1)
  else if(view==="farm"){ renderFarmScene(); }                 // 产业=田庄大图场景(P2)
  else if(view==="town"){ renderTownScene(); }                 // 市集=场镇大图场景(P3)
  else if(view==="city"){ renderCityScene(); }                 // 城镇=州城大图场景(P4)
  else if(view==="tian"){ renderTianxiaScene(); }   // 🏴 天下=乱世大图场景(v2,war.js)
  else { scExit(); el.innerHTML = settingsHTML(); }            // 设置(含日志)
  renderSubBar();
}
// ★等距风场景(2026-06-18 重做):底图只画地面环境(farm/city-ground.webp);建筑=带招牌的透明抠件(assets/scene/iso/<k>.webp)叠在底图上,招牌即标识即可点,沿形状高亮。坐标 pos=[中心x%, 底边y%, 宽%]
const ISOV = "2606201400";
function deptWarn(t){   // 该产业「有荒(没派满工)或缺料停产」→ 场景建筑挂红❗(不写字)
  const items=deptItems(t); if(!items.length) return false;
  const mng=deptManaged(t);
  if(items.length>mng) return true;                                                                       // 有处荒着(没派工)
  const d=DEFS[t]; if(d&&d.kind==="work" && mng>0 && wsInputs(d).some(x=>G(x.g)<x.amt*mng)) return true;  // 缺料停产
  return false;
}
function isoSprite(k, pos, fn, badge, cls, ek, warn){
  const key = ek||k; pos = LP(key, pos);   // 拖过的坐标优先(位置+大小);ek=独立编辑键;warn=挂红❗
  return `<div class="sc-iso${_editMode?' sc-edit':''}${cls?' '+cls:''}" style="left:${pos[0]}%;top:${pos[1]}%;width:${pos[2]}%" ${_editMode?'':`onclick="${fn}"`}${layoutEditAttr(key)}>`
    + `<img decoding="async" src="assets/scene/iso/${k}.webp?v=${ISOV}" alt="" onerror="this.parentNode.style.display='none'">`
    + (badge?`<i class="sc-ibadge">${badge}</i>`:"")
    + (warn?`<i class="sc-warn">❗</i>`:"")
    + `</div>`;
}
// 🏯 城镇 = 州城地面底图 + 11 座设施招牌抠件(全拆独立,条件显示);坐标 pos=[中心x%, 底边y%, 宽%]
// ★州城 = 顶部切城 + 该城建筑。固定功能(行市/牙行 + 省城成都府官面层贡院/州衙/盐运/镖局/书局);铺位(CITY_PLOTS)显为空地格 → 点➕开铺(酒楼/青楼/钱庄/当铺/粮行…),已建显铺图。空地直接建铺
const CITY_BLD = {
  market:{n:'行市',   sprite:'market', fn:c=>`openCityMarket('${c}')`},
  broker:{n:'牙行',   sprite:'broker', fn:_=>`openBroker()`},
  exam:  {n:'贡院',   sprite:'exam',   fn:_=>`openExamSheet()`},
  yamen: {n:'州衙',   sprite:'yamen',  fn:_=>`openYamenSheet()`},
  salt:  {n:'盐运司', sprite:'salt',   fn:_=>`openSaltSheet()`},
  escort:{n:'镖局',   sprite:'escort', fn:_=>`openEscortSheet()`},
  press: {n:'书局',   sprite:'press',  fn:_=>`openPressSheet()`},
};
const CITY_SETUP = {   // 固定功能(铺位另由 CITY_PLOTS 摆);官面层集中省城成都府
  kaifeng:['market','broker','exam','yamen','salt','escort','press'],
  zhoukou:['market','broker'],
  zhuxian:['market','broker'],
};
const SHOP_SPRITE={ jiu:'tavern', qinglou:'brothel', qianzhuang:'bank', dangpu:'pawn', liang:'liang', bu:'bu', chou:'chou', ci:'ci', cha:'cha' };   // ★铺类型(SHOPTYPES键)→抠件图;修键名错配(酒楼/钱庄/当铺接回tavern/bank/pawn)+粮行/布庄/绸缎/瓷器/茶各有专属图
function shopSprite(t){ return SHOP_SPRITE[t]||'market'; }
const CITY_TABS=['kaifeng','zhoukou','zhuxian'];   // 切城顺序:省城在前
const CITY_GRID=[[42,18],[66,18],[88,19],[42,33],[66,33],[88,34],[42,48],[66,48],[88,49],[42,63],[66,63],[88,64]];   // 12 位 3列×4行
function curCity(){ return (S.curCity && MARKETS_DEF[S.curCity]) ? S.curCity : "kaifeng"; }
function setCity(mid){ if(MARKETS_DEF[mid]){ S.curCity=mid; render(); } }
function renderCityScene(){
  const city=curCity(), fixed=(CITY_SETUP[city]||['market','broker']), plots=CITY_PLOTS[city]||[];
  const items=[];
  for(const k of fixed){ const b=CITY_BLD[k]; if(b && !(b.cond&&!b.cond())) items.push({fn:1,k}); }
  for(const plot of plots) items.push({plot});                       // 铺位:空地➕开铺 / 已建显铺
  let hs=""; items.forEach((it,i)=>{ const p=CITY_GRID[i]||[54,42];
    if(it.fn){ const b=CITY_BLD[it.k]; hs+=isoSprite(b.sprite||it.k, [p[0],p[1],19], b.fn(city), '', '', city+'_'+it.k); }   // ek=城_建筑(分城独立可拖)
    else { const s=shopFor(it.plot.id);
      if(s){ const T=SHOPTYPES[s.type];   // ★点已建铺→直接进它自己的事务(当铺→当铺事务、钱庄→钱庄事务、其余→该铺装修/经营卡),不再开通用铺面列表
        const fn = T.finance==="bank" ? `openBankSheet()` : T.finance==="pawn" ? `openPawnSheet()` : `openCityShops('${city}','${it.plot.id}')`;
        hs+=isoSprite(shopSprite(s.type), [p[0],p[1],19], fn, T.n, '', city+'_'+it.plot.id); }
      else hs+=isoPlot([p[0],p[1],18], `➕ 开铺`, `openPlot('${city}','${it.plot.id}')`, false, city+'_'+it.plot.id); }
  });
  const tabs=CITY_TABS.map(mid=>`<button class="citytab ${mid===city?'on':''}" onclick="setCity('${mid}')">${MARKETS_DEF[mid].n}</button>`).join("");
  scStage({ bg:`assets/scene/city.webp?v=${ISOV}`, fit:true, aspect:"3 / 5", cap:`<div class="citytabs">${tabs}</div>`, hotspots:hs });
}
function openCitySheet(){ _sheetReopen=openCitySheet; scSheet(`<div style="text-align:right;margin:-2px 0 -10px"><span class="shx" onclick="scCloseSheet()">✕</span></div>`+cityHTML()); }
function openCityMarket(mid){ _sheetReopen=()=>openCityMarket(mid); scSheet(`<div class="sh-head"><div><div class="sh-tt">🏬 ${MARKETS_DEF[mid].n} · 行市</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`+marketCardHTML(mid)); }
function openCityMarkets(){ openCityMarket(curCity()); }   // 兼容旧调用 → 当前城行市
// 产业/市集 共用:把某 tab 下"已有的部门"摆成图上热点
const CAT_OUT = { farm:"🌾", animal:"🥚", mine:"⛏️", forest:"🌲", craft:"🧺", yard:"🪙" };   // 挂机时从热点飘出的"产出"图标
// 有透明建筑贴图的产业(codex 出图 card/assets/scene/sprites/<type><级>.webp);缺图自动回退到图标
const SPRITE_TYPES = new Set(["field","paddy","barn","mine","brickkiln","porcelain","smithy","forest","carpentry","mill","brewery","weaver","silkworm","silkweave","teahouse","kitchen","oilpress","sugarmill","papermill"]);
function sceneSprite(t, maxTier){ return SPRITE_TYPES.has(t) ? `assets/scene/sprites/${t}${maxTier>=3?2:1}.webp?v=0617h` : null; }   // tier≥3 → 气派版
function deptHotspots(tab, spots){
  let hs="", i=0;
  for(const c of CATS){ if((c.tab||"home")!==tab) continue;
    for(const t of c.types){ const items=deptItems(t); if(!items.length) continue;
      const p=spots[i++%spots.length], d=DEFS[t], mng=deptManaged(t), idle=Math.max(0,items.length-mng), maxT=Math.max.apply(null,items.map(b=>b.tier||1));
      const size=Math.round(64+p[1]*0.62);   // 透视纵深:越靠下(近)越大、越靠上(远)越小
      hs+=scPin({ x:p[0], y:p[1], size, sprite:sceneSprite(t,maxT), iconHTML:icoImg(t,`<span style="font-size:22px">${d.ico}</span>`),
        name:d.n+(idle?`<span style="color:var(--bad)">·${idle}荒</span>`:""), cnt:"×"+items.length, lv:maxT>1?maxT:0,
        fxout:(mng>0?(CAT_OUT[c.key]||"🪙"):""), onclick:`openDept('${t}')` });   // 有派工才飘产出
    }
  }
  return hs;
}
// 挂机时:从一处"在产"的热点飘出产出图标,让世界看着在运转(节流 + 面板开/被遮挡不飘)
function sceneProduce(){
  if(view==="home") return;                              // ★宅院是住宅,不飘产出(去掉"中间一直飘"的产出字)
  const main=$("#main"); if(!main || !main.classList.contains("sc")) return;
  const sheet=$("#sheet"); if(sheet && !sheet.classList.contains("hidden")) return;
  if(Math.random()>0.55) return;
  const pins=[...document.querySelectorAll(".sc-pin[data-fxout],.sc-tag[data-fxout],.sc-zone[data-fxout]")].filter(p=>p.getAttribute("data-fxout"));
  if(!pins.length) return;
  const p=pins[Math.floor(Math.random()*pins.length)], r=p.getBoundingClientRect();
  if(r.top<58 || r.left<8 || r.right>window.innerWidth-8) return;
  const f=document.createElement("div"); f.className="sc-produce"; f.textContent="+"+p.getAttribute("data-fxout");
  f.style.left=(r.left+r.width/2)+"px"; f.style.top=r.top+"px"; document.body.appendChild(f); setTimeout(()=>f.remove(),1200);
}
function deptCount(tab){ let n=0; for(const c of CATS){ if((c.tab||"home")!==tab) continue; for(const t of c.types) if(deptItems(t).length) n++; } return n; }
// 在建工地标记(🏗 + 还N月),让营造有"看得见在盖"的过程感
function buildMarkers(tab, spots, startIdx){
  const bs=(S.builds||[]).filter(b=>{ const c=CATS.find(c=>c.types.includes(b.type)); return c && (c.tab||"home")===tab; });
  return bs.map((b,i)=>{ const p=spots[(startIdx+i)%spots.length], d=DEFS[b.type], mo=(b.daysLeft/30).toFixed(1);
    return `<div class="sc-pin building" style="left:${p[0]}%;top:${p[1]}%" onclick="toast('🏗 ${d.n} 在建 · 还 ${mo} 月 · 派 ${b.labor} 工')">
      <div class="sc-cap2">${d.n} <i class="sc-cnt" style="background:var(--gold);color:#3c2e12">在建 ${mo}月</i></div>
      <div class="sc-token"><span>🏗</span></div></div>`;
  }).join("");
}
// 竖版田庄整体图 farm-master-p.webp(1080×1440)里各建筑的真实位置(中心 x%,y%);标签落在画里对应建筑上 → 零违和
const FARM_POS = { field:[14,84], paddy:[80,86], barn:[20,60], mine:[15,16], brickkiln:[78,21], porcelain:[66,23], smithy:[74,40], forest:[35,16], carpentry:[47,21], steelmill:[62,33], stable:[33,70] };
const FARM_FALLBACK=[[50,30],[58,50],[40,55]];
// ★产业升级换图(真源:设计-卡片-产业升级换图(抠件+逐建筑升级版)):base 永远是同一张整体图;某建筑 tier≥2 → 在其位置叠"从整体图抠出来再做的升级版精灵"(只换那座、其余不动 → 一致、不违和)。
// 各建筑在整体图上的"裁件框"[left%,top%,width%](= 抠件区域,叠图盖住它);逐步补全所有产业/工房
const FARM_BOX = { forest:[23,4,32], brickkiln:[60,10,38], barn:[3,45,33], mine:[2,3,29], smithy:[58,28,35], carpentry:[36,9,28], porcelain:[60,30,30], steelmill:[40,30,30], stable:[26,58,30], field:[5,80,24], paddy:[70,80,24] };   // 各产业升级版精灵覆盖框[left%,top%,width%](逐个校准盖住原建筑;field/paddy=田边丰收点缀,tier≥2 高产时显)
// ★新增产业:整体图里"没画"这座建筑(后加的钢坊/皮坊/马场/瓷窑)→ 它的精灵当作"建好就显示的本体"(tier≥1 即叠),而非 tier≥2 才换的升级版
const SCENE_NEW = ['steelmill','tannery','stable','porcelain'];
function deptUpgradeSprites(tab, boxMap){
  let h="";
  for(const c of CATS){ if((c.tab||"home")!==tab) continue;
    for(const t of c.types){ const items=deptItems(t); if(!items.length) continue;
      const box=boxMap[t]; if(!box) continue;
      const maxT=Math.max.apply(null,items.map(b=>b.tier||1));
      const isNew=SCENE_NEW.includes(t);
      if(!isNew && maxT<2) continue;            // 整体图里已有的建筑:tier≥2 才叠气派版
      const lvl=(maxT>=4)?3:2;                  // tier2-3→气派版(2), tier4→更气派版(3);新旧建筑都升
      // Lv3 缺图时优雅回落到 Lv2(不消失);Lv2 缺图才移除 → 不必凑齐全部 Lv3 也不会 tier4 反而变光
      const onerr=(lvl===3)?`this.onerror=null;this.src='assets/scene/up/${t}2.webp?v=2606201400'`:`this.remove()`;
      h+=`<img class="sc-up" decoding="async" src="assets/scene/up/${t}${lvl}.webp?v=2606201400" style="left:${box[0]}%;top:${box[1]}%;width:${box[2]}%" onerror="${onerr}">`;
    }
  }
  return h;
}
// 整体图模式:已有的部门 → 在其建筑处放可点名牌(不叠贴图,建筑已在画里)
function deptTags(tab, posMap, fb){
  fb=fb||FARM_FALLBACK; let hs="", fi=0;
  for(const c of CATS){ if((c.tab||"home")!==tab) continue;
    for(const t of c.types){ const items=deptItems(t); if(!items.length) continue;
      const p=posMap[t]||fb[fi++%fb.length], d=DEFS[t];
      const mng=deptManaged(t), idle=Math.max(0,items.length-mng), maxT=Math.max.apply(null,items.map(b=>b.tier||1));
      hs+=scTag({ x:p[0], y:p[1], ico:d.ico+" ", name:d.n, cnt:"×"+items.length, lv:maxT>1?maxT:0, idle:idle||0,
        fxout:(mng>0?(CAT_OUT[c.key]||"🪙"):""), onclick:`openDept('${t}')` });
    }
  }
  return hs;
}
// 在建工地名牌(🏗 还N月)
function buildTags(tab, posMap, fb){
  fb=fb||FARM_FALLBACK;
  const bs=(S.builds||[]).filter(b=>{ const c=CATS.find(c=>c.types.includes(b.type)); return c && (c.tab||"home")===tab; });
  let fi=0;
  return bs.map(b=>{ const p=posMap[b.type]||fb[fi++%fb.length], d=DEFS[b.type], mo=(b.daysLeft/30).toFixed(1);
    return scTag({ x:p[0], y:p[1], cls:"building", ico:"🏗 ", name:d.n, cnt:`还${mo}月`, onclick:`toast('🏗 ${d.n} 在建 · 还 ${mo} 月 · 派 ${b.labor} 工')` });
  }).join("");
}
// ★产业「可点区」:微弱边框圈住建筑(标明可点)+ 右下角小状态;不再显示长名字(建筑图=名字),治标题挤一堆
function _zoneAt(box, posMap, fb, fiRef, t){
  if(box){ return {x:box[0], y:box[1], w:box[2], h:box[3]||Math.round(box[2]*0.78)}; }   // 有抠件框=精确盖住建筑
  const p=(posMap&&posMap[t])||fb[(fiRef.i++)%fb.length], w=15, h=12;                      // 无框=按位置放默认小区
  return {x:Math.max(0,p[0]-w/2), y:Math.max(0,p[1]-h/2), w, h};
}
function deptZones(tab, boxMap, posMap, fb){
  fb=fb||FARM_FALLBACK; let hs=""; const fiRef={i:0};
  for(const c of CATS){ if((c.tab||"home")!==tab) continue;
    for(const t of c.types){ const items=deptItems(t); if(!items.length) continue;
      const mng=deptManaged(t), idle=Math.max(0,items.length-mng), maxT=Math.max.apply(null,items.map(b=>b.tier||1));
      const badge = `×${items.length}`+(maxT>1?` Lv${maxT}`:"")+(idle?` ${idle}荒`:"");
      const z=_zoneAt(boxMap&&boxMap[t], posMap, fb, fiRef, t);
      hs+=scZone({ ...z, badge, bw:idle>0, cls:idle?"warn":"", fxout:"", onclick:(t==='granary'?'openInventory()':`openDept('${t}')`) });   // 谷仓=库存入口;宅院不飘产出
    }
  }
  return hs;
}
function buildZones(tab, boxMap, posMap, fb){
  fb=fb||FARM_FALLBACK;
  const bs=(S.builds||[]).filter(b=>{ const c=CATS.find(c=>c.types.includes(b.type)); return c && (c.tab||"home")===tab; });
  const fiRef={i:0};
  return bs.map(b=>{ const d=DEFS[b.type], mo=(b.daysLeft/30).toFixed(1), z=_zoneAt(boxMap&&boxMap[b.type], posMap, fb, fiRef, b.type);
    return scZone({ ...z, badge:`🏗 ${mo}月`, cls:"building", onclick:`toast('🏗 ${d.n} 在建 · 还 ${mo} 月 · 派 ${b.labor} 工')` });
  }).join("");
}
// 空地建造占位(➕)/ 在建占位(🏗):★新营造入口——直接点田庄空地建造(摒弃旧营造菜单)。pos=[中心x%,底边y%,宽%]
function isoPlot(pos, label, fn, building, key){
  if(key) pos = LP(key, pos);   // 老板拖过的坐标优先
  const click = (!_editMode && fn) ? `onclick="${fn}"` : "";
  return `<div class="sc-plot ${building?'building':''}${_editMode&&key?' sc-edit':''}" style="left:${pos[0]}%;top:${pos[1]}%;width:${pos[2]}%" ${click}${key?layoutEditAttr(key):''}><span class="sc-plot-lbl">${label}</span></div>`;
}
// 田庄等距:建筑抠件坐标 pos=[中心x%,底边y%,宽%];田类(field/paddy)底图已画田,用名牌点管理
const FARM_ISO = { forest:[26,20,20], mine:[50,20,20], carpentry:[73,20,20], brickkiln:[26,29,20], porcelain:[50,29,20], smithy:[73,29,20], steelmill:[26,38,20], barn:[50,38,20], stable:[73,38,20] };   // 竖版上部 3×3 网格(整体下移 5% 避建造浮条遮/窄屏裁顶)
const FARM_TAGS = { paddy:[30,60], field:[68,60] };   // 田类名牌落下半部水田/旱田区
function renderFarmScene(){
  let hs="";
  for(const c of CATS){ if((c.tab||"home")!=="farm") continue;
    for(const t of c.types){
      const items=deptItems(t), pos=FARM_ISO[t], tag=FARM_TAGS[t], bd=(S.builds||[]).find(b=>b.type===t);
      if(tag && !pos){                                     // ★田类(旱田/水田):建好显名牌(点管理)、在建显🏗;空地不再摆➕框,建田走底部「营造」
        const mng=deptManaged(t), idle=Math.max(0,items.length-mng);
        if(items.length) hs+=scTag({x:tag[0],y:tag[1]-3,ico:DEFS[t].ico+' ',name:DEFS[t].n,cnt:'×'+items.length,idle:idle||0,onclick:`openDept('${t}')`});
        if(bd){ const mo=(bd.daysLeft/30).toFixed(1); hs+=isoPlot([tag[0],tag[1]+6,16], `🏗 ${DEFS[t].n} ${mo}月`, '', true); }
        continue;
      }
      if(items.length){                                    // 建筑:已建显抠件(点击管理)
        const badge=`×${items.length}`;
        hs+=isoSprite(t, pos, `openDept('${t}')`, badge, undefined, undefined, deptWarn(t));   // 荒/缺料→红❗(不写字)
      } else if(bd){                                        // 在建:工地占位🏗
        const mo=(bd.daysLeft/30).toFixed(1); if(pos) hs+=isoPlot(pos, `🏗 ${DEFS[t].n} ${mo}月`, '', true, t);
      } else if(pos && _editMode){                          // 空地:仅编辑态显真建筑(幽灵)摆位;正常态不摆➕框(建造走底部「营造」)
        hs+=isoSprite(t, pos, '', `建${DEFS[t].n}`, 'sc-ghost');
      }
    }
  }
  if(!hs) hs=`<div class="sc-empty">还没产业</div>`;
  const labels = scLabel("🏗 营造","openBuild()");   // ★营造按钮:已建产业也能再建一座(空地➕只首建);库存在谷仓+顶栏粮
  scStage({ bg:`assets/scene/farm-mobile-ground.webp?v=${ISOV}`, fit:true, aspect:"3 / 5", cap:`田庄 · ${curRegion().name}`, hotspots:hs, labels });
}
// 竖版场镇街市整体图 town-master-p.webp(1080×1440)各作坊在画里的位置(codex 画了对应店招,标签落在对应铺面上)
const TOWN_POS = { mill:[9,50], brewery:[26,48], kitchen:[80,52], weaver:[57,28], silkweave:[27,31], teahouse:[55,13], silkworm:[33,14], oilpress:[80,16], sugarmill:[83,27], papermill:[84,37], tannery:[12,64] };
const TOWN_FALLBACK=[[45,40],[64,44],[20,66]];
// 工房升级版精灵覆盖框[left%,top%,width%](从场镇整体图抠出各工房,升级后盖回原位)
const TOWN_BOX = { mill:[0,40,22], brewery:[15,37,24], silkweave:[15,20,26], silkworm:[22,3,24], teahouse:[44,3,23], weaver:[46,17,23], oilpress:[69,5,24], sugarmill:[71,17,24], papermill:[72,28,24], kitchen:[67,41,27], tannery:[2,64,27] };
// 街市等距:作坊抠件坐标 pos=[中心x%,底边y%,宽%](摆在 town-ground 空地上);三态=已建抠件/在建🏗/空地➕建造
const TOWN_ISO = { mill:[38,15,20], weaver:[35.8,25.9,20], silkweave:[34.2,37,20], teahouse:[30.5,49.2,20], oilpress:[26.9,63.3,20], papermill:[22.3,78.5,20], brewery:[72,15.8,20], silkworm:[72.2,26.8,20], kitchen:[72.1,37.2,20], sugarmill:[72.6,50,20], tannery:[72.6,64.3,20], pastry:[72.6,78.5,20] };   // ★老板拖定布局:左列随街道透视外扩、右列贴右(pastry 点心坊补右下空格);可在「📐布局编辑」继续微调位置/大小
function renderTownScene(){
  let hs="";
  for(const c of CATS){ if((c.tab||"home")!=="town") continue;
    for(const t of c.types){
      const items=deptItems(t), pos=TOWN_ISO[t], bd=(S.builds||[]).find(b=>b.type===t);
      if(!pos) continue;
      if(items.length){ const badge=`×${items.length}`; hs+=isoSprite(t,pos,`openDept('${t}')`,badge,undefined,undefined,deptWarn(t)); }   // 荒/缺料→红❗(不写字)
      else if(bd){ const mo=(bd.daysLeft/30).toFixed(1); hs+=isoPlot(pos,`🏗 ${DEFS[t].n} ${mo}月`,'',true,t); }
      else if(_editMode){ hs+=isoSprite(t,pos,'',`建${DEFS[t].n}`,'sc-ghost'); }   // 仅编辑态显真建筑(幽灵)摆位;正常态空地不摆➕框(建造走底部「营造」)
    }
  }
  if(!hs) hs=`<div class="sc-empty">还没作坊</div>`;
  const labels = scLabel("🏘 本村","openVillageSheet()")+scLabel("🏪 集市","openMarketSheet()")+scLabel("🏗 营造","openBuild()");   // 本村=村庄经营面板+基建;营造:已建作坊也能再建一座;马车在府宅
  scStage({ bg:`assets/scene/town-mobile-ground.webp?v=${ISOV}`, fit:true, aspect:"3 / 5", cap:`街市 · ${MARKETS_DEF.local.n}`, hotspots:hs, labels });
}
function openIndListSheet(tab){
  let h=`<div class="sh-head"><div><div class="sh-tt">📋 ${tab==="town"?"作坊":"产业"}一览</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`;
  let any=false;
  for(const c of CATS){ if((c.tab||"home")!==tab) continue; const ts=c.types.filter(t=>deptItems(t).length); if(!ts.length) continue; any=true;
    h+=`<div class="sh-bgroup">${c.n}</div><div class="sh-items">`;
    for(const t of ts){ const items=deptItems(t), d=DEFS[t], mng=deptManaged(t), idle=Math.max(0,items.length-mng);
      h+=`<div class="sh-irow" style="cursor:pointer" onclick="openDept('${t}')">${icoImg(t,d.ico)}<span style="flex:1;font-weight:700">${d.n} <span style="color:var(--mut);font-size:11px">×${items.length}${idle?` · ${idle}荒`:""}</span></span><span class="iup">管理 ›</span></div>`; }
    h+=`</div>`;
  }
  if(!any) h+=`<div class="hint">还没有,点「营造」开建</div>`;
  scSheet(h);
}
function openMarketSheet(){ _sheetReopen=openMarketSheet; scSheet(`<div class="sh-head"><div><div class="sh-tt">🏪 本地集市 · ${MARKETS_DEF.local.n}</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`+marketCardHTML("local")); }
function openCartSheet(){ _sheetReopen=openCartSheet; scSheet(`<div class="sh-head"><div><div class="sh-tt">🚚 马车货运</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`+cartPanelHTML()); }
function openVillageSheet(){   // 🏘 本村:活村庄经营面板(发工资修基建→村富→卖更多)+ 村庄基建
  _sheetReopen=openVillageSheet;
  const v=S.village||{pop:0,wealth:0,goodwill:0}, d=v.lastDelta||{pop:0,wealth:0};
  const arr=(x,dec)=> x>0.05?` <span style="color:var(--good);font-size:11px">▲${dec?x.toFixed(1):Math.round(x)}</span>` : (x<-0.05?` <span style="color:var(--bad);font-size:11px">▼${dec?Math.abs(x).toFixed(1):Math.round(Math.abs(x))}</span>` : '');
  const base=(S.markets.local&&S.markets.local.size)||10;
  let h=`<div class="sh-head"><div><div class="sh-tt">🏘 本村 · ${MARKETS_DEF.local.n}</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`;
  h+=`<div class="sh-bgroup">村庄概况 <small style="color:var(--mut);font-weight:400">发工资·修基建 → 村子越富,你卖得越多</small></div>`;
  h+=`<div class="invstat">🧑 人口 <b>${Math.round(v.pop)}</b>/${villagePopCap()}${arr(d.pop,1)}　·　💰 村财富(购买力) <b>${Math.round(v.wealth)}</b>${arr(d.wealth,1)}</div>`;
  h+=`<div class="invstat">🤝 好感 <b>${Math.round(v.goodwill)}</b>/100　·　🛤 便利 <b>${villageConv()}</b>　·　📈 发展度 <b>${villageDev()}</b></div>`;
  h+=`<div class="invstat">🛒 本月本村需求上限 <b>${Math.round(villageMarketSize()*10)/10}</b>　<small style="color:var(--mut)">(基线 ${base} + 购买力加成)</small></div>`;
  h+=`<div class="sh-bgroup">🏗 村庄基建 <small style="color:var(--mut);font-weight:400">一次性,永久抬村庄上限</small></div>`;
  for(const k in LANDMARKS){ if(LANDMARK_LOC[k]!=="town") continue; const L=LANDMARKS[k], built=vWork(k), ok=!built&&S.silver>=L.cost;
    h+=`<button class="opt ${built?'cur':(ok?'':'dis')}" ${ok?`onclick="buyLandmark('${k}')"`:''}>${L.ico} <b>${L.n}</b> <span style="float:right;color:var(--accent);font-weight:700">${built?'✓ 已建':L.cost+'两'}</span><small>${L.d}</small></button>`; }
  h+=`<div class="sh-bgroup">🏠 房屋出租 <small style="color:var(--mut);font-weight:400">修房→可雇长工↑·村人口承载↑·月租金 · 现可雇上限 ${workerCap()}</small></div>`;
  for(const k in HOUSING){ const H=HOUSING[k], ok=S.silver>=H.cost;
    h+=`<button class="opt ${ok?'':'dis'}" ${ok?`onclick="buildHousing('${k}')"`:''}>${H.ico} <b>${H.n}</b> ×${(v[k+'s']||0)} <span style="float:right;color:var(--accent);font-weight:700">${H.cost}两</span><small>${H.d}</small></button>`; }
  const civ=[]; if(vWork('bridge'))civ.push('🌉 桥'); if(vWork('charity'))civ.push('🍚 义仓'); if(vWork('school'))civ.push('📖 义学');
  h+= civ.length ? `<div class="hint">另:${civ.join('·')} 也在惠及本村(便利/承载/好感)</div>` : `<div class="hint">提示:城镇「修桥」、宅院「办义学/设义庄」也会惠及本村</div>`;
  scSheet(h);
}
// 🏠 宅院 = 竖版宅院庭院整体图 home-master-p.webp + 院落建筑名牌(主屋/谷仓/祠堂/义学)+ 大宅升级 + 标签
const HOME_POS = { house:[47,42], granary:[80,36], shrine:[20,24], academy:[16,50] };
const HOME_FALLBACK=[[50,30],[64,52],[36,55]];
// 宅院升级替换版:院子随大宅/兽苑逐级换更气派的整体图(0朴素小院→1体面深宅→2鼎盛府邸·虎园)
function homeGrade(){ if((S.landmarks&&S.landmarks.menagerie)||manorLv()>=6) return 2; if(manorLv()<=1) return 0; return 1; }
const HOME_BG = { 0:"home-master-p0", 1:"home-master-p", 2:"home-master-p2" };
function renderHomeScene(){
  const lv=manorLv(), m=manor(), top=lv>=MANOR.length-1;
  let hs=deptZones("home", null, HOME_POS, HOME_FALLBACK) + buildZones("home", null, HOME_POS, HOME_FALLBACK);   // 院落可点区 + 在建
  hs += scTag({ x:47, y:27, ico:"👪 ", name:"合家", onclick:"openFamilySheet()" });   // ★点主屋(主人房)→ 家族(替代旧「家族」按钮)
  const ctl=`<div class="sc-mctl" onclick="openManorUpgrade()">${m.ico} <b>${m.n}</b>${top?" · 顶":" · 营造 ›"}</div>`;
  const labels = scLabel("🚚 马车","openCartSheet()")+scLabel("🏗 营造","openBuild()");   // ★马车 + 营造(大宅/院落谷仓祠堂研究院/房舍/地标全套);库存在谷仓+顶栏粮
  scStage({ bg:`assets/scene/${HOME_BG[homeGrade()]}.webp?v=0617v`, fit:true, aspect:"3 / 4", cap:`${S.surname}宅 · ${m.n}`, hotspots:hs, ctl, labels });
}
function openFamilySheet(){ _sheetReopen=openFamilySheet; scSheet(`<div style="text-align:right;margin:-2px 0 -6px"><span class="shx" onclick="scCloseSheet()">✕</span></div>`+familyHTML()); }
// 🏯 大宅营造:专属升级面板(现宅图→新宅图预览 + 加成 + 落成庆祝),让"修房子"有成就感
function openManorUpgrade(){
  const lv=manorLv(), m=MANOR[lv];
  if(lv>=MANOR.length-1){ scSheet(`<div class="sh-head"><div class="sh-tt">${m.ico} ${m.n}</div><span class="shx" onclick="scCloseSheet()">✕</span></div><div class="sh-note">宅邸已至顶 · 阖族鼎盛 🏛</div>`); return; }
  const nx=MANOR[lv+1], ok=S.silver>=nx.cost, gap=nx.cost-Math.round(S.silver);
  let unl=[]; if(nx.unlock&&LANDMARKS[nx.unlock])unl.push("解锁营造「"+LANDMARKS[nx.unlock].n+"」"); if(nx.cook)unl.push("小厨房·宴官+3"); if(nx.concCap>m.concCap)unl.push("妾上限→"+nx.concCap);
  scSheet(`
    <div class="sh-head"><div class="sh-tt">🏯 营造大宅</div><span class="shx" onclick="scCloseSheet()">✕</span></div>
    <div class="manor-up">
      <div class="mu-side"><img src="assets/manor/manor-${lv}.webp?v=0615s"><span>${m.ico} ${m.n}</span></div>
      <div class="mu-arrow">→</div>
      <div class="mu-side hi"><img src="assets/manor/manor-${lv+1}.webp?v=0615s"><span><b>${nx.ico} ${nx.n}</b></span></div>
    </div>
    <div class="sh-chips">
      <div class="sh-ci">🧑 人手上限 <b>${m.worker}→${nx.worker}</b></div>
      <div class="sh-ci">📦 库容 <b>${m.store}→${nx.store}</b></div>
      <div class="sh-ci">🏯 门第 <b>+${nx.pres-m.pres}</b></div>
    </div>
    ${unl.length?`<div class="sh-note">升宅解锁:${unl.join(" · ")}</div>`:""}
    <button class="sh-btn gold ${ok?"":"dis"}" ${ok?'onclick="confirmManorUpgrade()"':""}>${ok?`营造升宅 · ${nx.cost.toLocaleString()} 两`:`银两不够 · 还差 ${gap.toLocaleString()} 两`}</button>
  `);
}
function confirmManorUpgrade(){
  const lv=manorLv(); if(lv>=MANOR.length-1) return; const nx=MANOR[lv+1];
  if(S.silver<nx.cost){ toast(`还差 ${(nx.cost-Math.round(S.silver)).toLocaleString()} 两`); return; }
  S.silver-=nx.cost; S.manor=lv+1; S.rep=(S.rep||0)+3;
  logMsg(`🏯 营造宅邸至「${nx.n}」(门第大涨)`);
  scCloseSheet();
  if(view==="home") renderHomeScene();   // ★立刻换上新宅大图(看得见的 before→after)
  renderHUD();
  manorCelebrate(nx);
  save(true);
}
function manorCelebrate(nx){ toast(`🎉 大兴土木,宅邸落成「${nx.n}」!人手/库容/门第大涨`); celebrate(nx.ico, `${nx.n} 落成`, "门第大涨"); }
// 底部二级条:当前页(宅院/产业/市集)可建内容,点即开建(手机横滑、PC换行,统一开建口)
function renderSubBar(){
  const el=$("#subbar"); if(!el) return;
  const tab=null;   // 全页改场景版,营造统一走场景内「🏗 营造」标签,二级条停用
  if(!tab){ el.classList.add("empty"); el.innerHTML=""; return; }
  let h="";
  for(const c of CATS){ if((c.tab||"home")!==tab) continue;
    for(const t of c.types){ const d=DEFS[t], blk=buildBlocked(t);
      h+=`<button class="subbtn ${blk?'dis':''}" ${blk?'':`onclick="doBuild('${t}')"`}>${d.ico} ${d.n}<small>${blk||buildCostTxt(t)}</small></button>`; }
  }
  if(tab==="home"){   // 大宅 + 家宅地标
    const lv=manorLv(); if(lv<MANOR.length-1){ const nx=MANOR[lv+1], ok=S.silver>=nx.cost;
      h+=`<button class="subbtn ${ok?'':'dis'}" ${ok?`onclick="upgradeManor()"`:''}>🏯 升「${nx.n}」<small>${nx.cost.toLocaleString()}两</small></button>`; }
    for(const k in LANDMARKS){ if(LANDMARK_LOC[k]!=="home") continue; const L=LANDMARKS[k]; if(S.landmarks&&S.landmarks[k]) continue;
      const mlock=!landmarkManorOK(k), lock=L.req&&famDegree()<L.req, ok=!mlock&&!lock&&S.silver>=L.cost;
      h+=`<button class="subbtn ${ok?'':'dis'}" ${ok?`onclick="buyLandmark('${k}')"`:''}>${L.ico} ${L.n}<small>${mlock?'需'+MANOR[LANDMARK_MANOR[k]].n:(lock?'需功名':L.cost+'两')}</small></button>`; }
  }
  el.classList.toggle("empty", !h);
  el.innerHTML=h;
}
// ===== 小挑战:目标链 =====
function checkChallenge(){
  if(S.chal==null) S.chal=0;
  const c=CHALLENGES[S.chal]; if(!c) return false;
  if(c.cur()>=c.max){ c.rew(S); S.chal++; toast(`🎯 达成「${c.n}」· 赏 ${c.rtxt}!`); logMsg(`🎯 达成目标「${c.n}」,赏 ${c.rtxt}`); chalCelebrate(); save(true); return true; }
  return false;
}
function chalCelebrate(){ flashUp(); pulseHUD(); }
function chalHTML(){
  if(S.chal==null) S.chal=0;
  const c=CHALLENGES[S.chal];
  if(!c) return `<div class="chalbox done">🏆 <b>诸事圆满</b><small>八大目标皆已达成 · 继续壮大家业吧</small></div>`;
  const cur=Math.min(c.cur(),c.max), pct=Math.round(cur/c.max*100);
  return `<div class="chalbox">
    <div class="chhead"><span class="cico">${c.ico}</span><b>当前目标 · ${c.n}</b><span class="crew">赏 ${c.rtxt}</span></div>
    <div class="ctip">${c.tip}　<small>(第 ${S.chal+1}/${CHALLENGES.length} 关)</small></div>
    <div class="cbarwrap"><div id="chalbar" class="cbar" style="width:${pct}%"></div></div>
    <div class="cnum"><span id="chalcur">${Math.round(cur).toLocaleString()}</span> / ${c.max.toLocaleString()}</div></div>`;
}
function laborHTML(){
  const cap=workerCap(), info=laborInfo();
  return `<div class="laborbox">
    <div class="lh"><b>🧑 人手 ${S.workers}/${cap} · 空闲 ${freeW()}</b></div>
    <div class="lops">
      <button class="${(info.cd>0||S.silver<info.recruit||S.workers>=cap)?'dis':''}" onclick="doRecruit()">📢 招贤大会<i>${info.cd>0?info.cd+'天后':info.recruit+'两·来一批'}</i></button>
      <button class="${(S.workers>=cap||S.silver<info.buy)?'dis':''}" onclick="doBuyLabor()">🧍 牙行买人<i>${info.buy}两/个</i></button>
    </div></div>`;
}
// 宅院视图:emoji 小人按实际人丁/长工/牲口在院子里走动(CSS动画,轻量;啥也不干看着玩)
function homeScene(){
  const figs=[];
  if(S.lord) figs.push("👴");
  if(S.spouse) figs.push("👩");
  (S.kids||[]).forEach(k=> figs.push(k.age<10?"🧒":(k.sex==="男"?"👦":"👧")));
  (S.wards||[]).forEach(w=> figs.push(w.kind==="bride"?"👰":"👧"));
  for(const r in SERVANTS){ for(let i=0;i<svc(r);i++) figs.push(SERVANTS[r].ico); }
  for(let i=0;i<S.workers;i++) figs.push(["🧑‍🌾","👷","🧑‍🏭"][i%3]);
  deptItems("barn").forEach(b=> figs.push(icoImg(b.animal,{pig:"🐖",cow:"🐂",chicken:"🐔",sheep:"🐑"}[b.animal]||"🐖")));
  if(deptItems("field").length||deptItems("paddy").length) figs.push("🌾");
  if(deptItems("mine").length) figs.push("⛏️");
  let show=figs.slice(0,14); if(!show.length) show=["🏚"];
  let h=`<div class="scene">`;
  show.forEach((e,i)=>{ const x=5+Math.floor(Math.random()*86), y=14+Math.floor(Math.random()*60), du=(5+Math.random()*5).toFixed(1), de=(Math.random()*4).toFixed(1);
    h+=`<span class="vill v${i%4}" style="left:${x}%;top:${y}%;animation-duration:${du}s;animation-delay:${de}s">${e}</span>`; });
  h+=`<span class="scenelabel">${S.surname}氏庄园 · 阖家 ${famMembers()} 口 · 长工 ${S.workers}${servantCount()>0?` · 家仆 ${servantCount()}`:''} · 产业 ${S.ind.length}</span></div>`;
  return h;
}
function cardsHTML(tab){
  let h=`<button class="bigbtn buildbtn" onclick="openBuild()">🏗 营造产业(派工+耗料+数月)</button>`;
  let any=false;
  for(const c of CATS){
    if((c.tab||"home")!==tab) continue;
    const ts=c.types.filter(t=>deptItems(t).length);
    if(!ts.length) continue;
    any=true;
    h+=Group({ title:c.n, count:ts.reduce((s,t)=>s+deptItems(t).length,0),
      extra:(c.key==="farm"?`<span class="landcap">田产 ${landUsed()}/${landCap()}</span>`:""),
      cards:ts.map(deptCard).join("") });
  }
  if(!any) h+=`<div class="hint">${tab==="farm"?"还没有产业,点下方一排建田/畜/矿/林":(tab==="town"?"还没有作坊,点下方一排建磨坊/酒坊等":"点下方一排建院落/升大宅")}</div>`;
  return h;
}
function deptOutSummary(t){
  const d=DEFS[t], items=deptItems(t), mng=deptManaged(t);
  if(d.kind==="store") return "仓储 +"+(items.length*200);
  if(d.kind==="house") return "人口 +"+(items.length*4);
  if(d.kind==="shrine") return "出高级卡 +"+Math.round(shrineLuck()*100)+"%";
  if(d.kind==="academy") return "tier "+academyTier()+" · 研究员 "+(S.assign.academy||0)+" · 科技点 "+Math.floor(S.tech||0)+"(+"+techRate().toFixed(1)+"/月)";
  const sum={};
  for(let i=0;i<Math.min(mng,items.length);i++){ const b=items[i];
    if(d.kind==="crop"){ const c=CROPS[b.crop]; sum[c.out]=(sum[c.out]||0)+c.mo*lvlMul(b)*seasonMul(t); }
    else if(d.kind==="work"){ sum[d.out]=(sum[d.out]||0)+d.outAmt*lvlMul(b); }
    else if(d.kind==="animal"){ const a=ANIMALS[b.animal]; sum[a.out]=(sum[a.out]||0)+a.mo*lvlMul(b); }
  }
  const parts=Object.keys(sum).map(k=>`${GNAME[k]} +${sum[k].toFixed(1)}`);
  let s = parts.length?parts.join(" ")+"/月长":"<span class='warn'>没派人·没产出</span>";
  if((d.kind==="crop"||d.kind==="animal") && parts.length){   // 批量产:显示在长存量 + 收获季
    const pendSum=Object.keys(sum).reduce((a,k)=>a+pend(k),0);
    const when=d.mineral?"季采收":(d.kind==="animal"?"季出栏":"秋收");
    s+=` · <small style="color:var(--gold)">在长 ${pendSum.toFixed(0)}→${when}</small>`;
  }
  if(d.kind==="work" && mng>0){ const ins=wsInputs(d), lacks=ins.filter(x=>G(x.g)<x.amt*mng);   // 工坊月批:每月耗料,缺则停产
    if(lacks.length) s=`<span class='warn'>缺${lacks.map(x=>GNAME[x.g]).join("·")}·停产</span>`;
    else s=`<small style="color:var(--mut)">月耗${ins.map(x=>GNAME[x.g]).join("+")}→</small>`+parts.join(" ")+"/月"; }
  if(d.kind==="animal" && mng>0 && G("grain")<0.5) s=`<span class='warn'>缺粮·停喂</span>`;
  return s;
}
function deptCard(t){
  const d=DEFS[t], n=deptItems(t).length, asn=S.assign[t]||0, mng=deptManaged(t), idle=Math.max(0,n-mng);
  const hi=deptItems(t).filter(b=>(b.tier||1)>1).length;
  let sub = d.worker>0 ? `${asn}人管${mng}/${n}${idle?` · <span class='warn'>${idle}荒</span>`:''}` : `${n} 处`;
  if(hi) sub += ` · <span class="hilv">${hi}高级</span>`;
  const live = (d.worker>0 ? mng>0 : (d.kind!=="store"&&d.kind!=="house"&&d.kind!=="shrine"&&d.kind!=="academy"));
  return Card({ cls:`dept ${live?'live':''}`, data:`data-type="${t}"`, onclick:`openDept('${t}')`,
    ico:icoImg(t, d.ico), nm:`${d.n} ×${n}`, out:deptOutSummary(t), sub, more:"点开管理 ›" });
}
// 🏠 宅院 = 大宅全景横幅 + 院落建筑 + 家族
function homeHTML(){ return manorBanner() + cardsHTML("home") + familyHTML(); }
// 大宅全景:按当前等级换图(茅屋→庄园府邸),点击进营造升级
function manorBanner(){
  const lv=manorLv(), m=manor(), top=lv>=MANOR.length-1, nx=top?null:MANOR[lv+1];
  const tip = top ? "宅邸已至顶 · 阖族鼎盛" : `点此营造 · 升「${nx.n}」需 ${nx.cost.toLocaleString()} 两`;
  return `<div class="manorbanner" onclick="openBuild()">
    <img src="assets/manor/manor-${lv}.webp?v=0615s" alt="${m.n}" decoding="async">
    <div class="mbcap"><b>${m.ico} ${m.n}</b><small>${tip}</small></div>
  </div>`;
}
// 马车面板(报账 + 车队 + 买车):市集页用
function cartPanelHTML(){
  let h="";
  if(S.report && S.report.total>0) h+=`<div class="report"><div class="rhd">📒 上月货运进账 <b>+${S.report.total}两</b></div>${(S.report.lines||[]).map(l=>`<div class="rline">${l}</div>`).join("")}</div>`;
  const running=(S.carts||[]).filter(c=>c.leg!=="idle").length, drv=cartDrivers(), idleN=(S.carts||[]).filter(c=>c.leg==="idle").length, ncar=(S.carts||[]).length;
  // 🚩 车队(队长+护卫,整队拉大宗)
  h+=`<div class="bgroup">🚩 车队 <small style="color:var(--mut);font-weight:400">队长(镖头) ${svc("biaotou")} · 护卫 ${svc("guard")} · 车 ${ncar}辆/总载 ${fleetCap()}石 · 车夫 ${drv}</small></div>`;
  if(hasCaptain()) h+=`<button class="opt devcard" style="margin:0 0 6px" onclick="openFleetDispatch()">🚩 派车队(整队拉一个城) <span style="float:right;color:var(--mut);font-size:12px">空车 ${idleN} 辆</span></button>`;
  else h+=`<div class="hint" style="text-align:left;margin:2px 0 6px">雇一名「镖头」当队长(城镇→牙行),就能把车编成车队、整队拉大宗去大城(护卫越多越安全)。</div>`;
  // 🚚 单车散跑
  h+=`<div class="bgroup">🚚 单车散跑 <small style="color:var(--mut);font-weight:400">在跑 ${running}/${drv} · 卖零碎货</small></div>`;
  h+=`<div class="hint" style="text-align:left;margin:2px 0 5px">车一到当场卖、当场进账。远城价高但路远;大城吃得下大宗。</div>`;
  if(idleN) h+=`<button class="opt" style="margin:0 0 6px" onclick="dispatchAll()">🚚 一键派车卖货(${idleN}辆空车) <span style="float:right;color:var(--mut);font-size:12px">各自挑最赚的市铺开</span></button>`;
  if(idleN) h+=`<button class="opt" style="margin:0 0 6px" onclick="dispatchIdleHaul()">🐎 闲车一键接活赚脚费(${idleN}辆空车) <span style="float:right;color:var(--mut);font-size:12px">没货可卖时也照赚</span></button>`;
  if(ncar) h+=`<button class="opt" style="margin:0 0 6px" onclick="toggleAutoHaul()">${S.autoHaul?'✅':'⬜'} 闲车自动接活 <span style="float:right;color:var(--mut);font-size:12px">${S.autoHaul?'开:没货的车自动去帮运':'关:闲车原地待命'}</span></button>`;
  for(const c of (S.carts||[])){ const m=S.markets[c.dest], freeDrv=running<drv, idle=c.leg==="idle";
    h+=`<div class="cartrow"><span class="carti">🐴<i class="carttier">${cartTierName(c)}</i></span>
      <div class="cartcfg"><button class="ctag ${idle?"":"dis"}" onclick="openCartCargo('${c.id}')">📦 ${idle?"配货卖":(GNAME[c.cargo]||"—")}</button>${idle?`<button class="ctag" onclick="setCartDest('${c.id}')">→ ${m?m.n:"—"}</button>${c.pin?`<button class="ctag" onclick="setCartAuto('${c.id}')">↺自动</button>`:""}<button class="ctag trade" onclick="openTradeRoute('${c.id}')">🏯贩运</button><button class="ctag haul" onclick="openHaulOrder('${c.id}')">🐎帮运</button>`:""}</div>
      <span class="cartst">${cartStatus(c, freeDrv)}</span></div>`; }
  h+=`<button class="opt" onclick="openCartShop()">🛒 车马行 · 买/造/升级马车 <span style="float:right;color:var(--accent);font-weight:700">板车→重载1000石</span><small>买现成 或 木作坊自造(用木料)· 小车可改装升级</small></button>`;
  // 🚫 留着不外运(全局一次设,免逐车配):点货切换;自动派车不再装它(建材本就自动留)
  const gs=cartGoods().filter(g=>G(g)>=1 || (S.noSell||[]).includes(g));
  const heldN=(S.noSell||[]).length;
  if(heldN){ h+=`<div class="warnbox" style="background:rgba(176,58,46,.1);border:1px solid var(--bad);border-radius:8px;padding:8px 10px;margin:8px 0">⚠️ 现有 <b>${heldN}</b> 种货被「留着不外运」(${(S.noSell||[]).map(g=>GNAME[g]).join("、")})——马车不会拉去远城卖,容易在仓库越堆越多。<button class="opt devcard" style="margin-top:6px" onclick="clearNoSell()">✅ 一键全部恢复外运(清空留货单)</button></div>`; }
  if(gs.length){ h+=`<div class="bgroup">🚫 留着不外运 <small style="color:var(--mut)">点一下=不让马车拉去远城卖(留给作坊/营造用;家门口集市仍会卖余货)</small></div><div class="nosellrow">`;
    for(const g of gs){ const off=(S.noSell||[]).includes(g); h+=`<button class="nstag ${off?'off':''}" onclick="toggleNoSell('${g}')">${off?'🚫 ':''}${GNAME[g]}</button>`; }
    h+=`</div>`; }
  return h;
}
// 🛒 车马行:买/造(木作坊)/升级 各档马车
function openCartShop(){
  let h=`<h2>🛒 车马行</h2><div class="desc">买现成 或 在木作坊用木料自造;空车可改装升级。越大越能拉、越适合跑大宗。车队每辆需 1 名车夫。</div>`;
  h+=`<div class="bgroup">置办新车</div>`;
  for(let i=0;i<CART_TIERS.length;i++){ const T=CART_TIERS[i], canBuy=S.silver>=T.buy, canCraft=hasCarpentry()&&G("wood")>=T.wood&&S.silver>=T.craft;
    h+=`<div class="ventcard"><div class="vhead"><span class="vico">🐴</span><b>${T.n}</b><span class="vtag">载 ${T.cap} 石</span></div><div class="lops">
      <button class="${canBuy?'':'dis'}" onclick="buyCart(${i+1})">买<i>${T.buy}两</i></button>
      ${T.wood?`<button class="${canCraft?'':'dis'}" onclick="craftCart(${i+1})">木作造<i>${T.wood}木+${T.craft}两</i></button>`:`<button class="dis">起手车</button>`}
    </div></div>`; }
  const up=(S.carts||[]).filter(c=>c.leg==="idle" && (c.tier||1)<CART_TIERS.length);
  if(up.length){ h+=`<div class="bgroup">改装升级(空车补差价)</div>`;
    for(const c of up){ const t=c.tier||1, cur=CART_TIERS[t-1], nx=CART_TIERS[t], ds=Math.max(0,nx.buy-cur.buy), dw=Math.max(0,nx.wood-cur.wood), dc=Math.max(0,nx.craft-cur.craft);
      h+=`<div class="ventcard"><div class="vhead"><span class="vico">⬆</span><b>${cur.n} → ${nx.n}</b><span class="vtag">载 ${cur.cap}→${nx.cap}</span></div><div class="lops">
        <button class="${S.silver<ds?'dis':''}" onclick="upgradeCart('${c.id}','buy')">补银<i>${ds}两</i></button>
        <button class="${(!hasCarpentry()||G('wood')<dw||S.silver<dc)?'dis':''}" onclick="upgradeCart('${c.id}','craft')">木作改<i>${dw}木+${dc}两</i></button></div></div>`; }
  }
  modal(h); $("#modal").dataset.kind="cartshop";
}
// 🚩 派车队:选装货 + 选城,整队出发
function openFleetDispatch(){
  if(!hasCaptain()){ toast("编队需先雇『镖头』当队长(城镇→牙行)"); return; }
  const idle=(S.carts||[]).filter(c=>c.leg==="idle"), cap=idle.reduce((s,c)=>s+cartCap(c),0);
  let h=`<h2>🚩 派车队</h2><div class="desc">整队拉一个城。空车 <b>${idle.length}</b> 辆 · 总载约 <b>${cap}</b> 石 · 车夫 ${cartDrivers()}。大城吃得下大宗、小镇一砸就跌。</div>`;
  h+=`<div class="admrow"><span>装货</span><select id="flGood" onchange="fleetEst()"><option value="">智能混装(挑最赚的余货)</option>${cartGoods().filter(g=>cargoSurplus(g)>=1).map(g=>`<option value="${g}">${GNAME[g]}(余 ${Math.floor(cargoSurplus(g))})</option>`).join("")}</select></div>`;
  h+=`<div class="bgroup">拉去哪个城(点即整队出发)</div>`;
  for(const mid in S.markets){ const m=S.markets[mid];
    h+=`<button class="opt" onclick="dispatchFleet('${mid}', ($('#flGood')||{}).value||'')">${m.n} <span style="float:right;color:var(--mut)">${mid==='local'?'近':'远'} ${m.dist}天 · 胃口×${m.appMul||1}</span><small id="flEst-${mid}">${fleetEstText(mid, cap)}</small></button>`; }
  modal(h);
}
function fleetEstText(mid, cap){ const g=($("#flGood")||{}).value; if(!g) return "智能混装:自动挑最赚的余货分装"; const load=Math.min(cap, Math.floor(cargoSurplus(g))); const e=sellEstimate(mid,g,load); return `拉 ${load} ${GNAME[g]} → 这城约卖 ${e.rev} 两`; }
function fleetEst(){ const g=($("#flGood")||{}).value, idle=(S.carts||[]).filter(c=>c.leg==="idle"), cap=idle.reduce((s,c)=>s+cartCap(c),0);
  for(const mid in S.markets){ const el=$("#flEst-"+mid); if(el) el.textContent=fleetEstText(mid, cap); } }
// 一座市场卡(货栈存货 + 价 + 远城铺面入口)
function marketCardHTML(mid){ const m=S.markets[mid]; if(!m) return "";
  const cheap=((MARKETS_DEF[mid]&&MARKETS_DEF[mid].cheap)||[]).map(g=>GNAME[g]).join("/");
  const risk=Math.round((m.risk||0)*100);
  let h=`<div class="mktcard"><div class="mkthd"><b>${m.n}</b><span class="mktag">${mid==="local"?"近":"远"} ${m.dist}天 · 价×${m.base} · 胃口${m.size}${risk?` · 匪${risk}%`:''}</span></div>`;
  h+= `<div class="mktempty">${mid==="local"?"家门口集市:价低胃口小、近" :`州府:价高胃口大、远 ${m.dist} 天往返`}${cheap?` · 特产便宜:${cheap}`:''}</div>`;
  if(CITY_PLOTS[mid]){ const my=cityShops(mid);
    const lbl=my.length ? my.map(s=>`${SHOPTYPES[s.type].ico}${SHOPTYPES[s.type].n}${(s.decor||0)?'·装'+s.decor:''}`).join(" ") : "未开铺";
    h+=`<button class="shopbtn" onclick="openCityShops('${mid}')">🏬 铺面 <span>${lbl} · ${my.length}/${CITY_PLOTS[mid].length} ›</span></button>`; }
  h+=`</div>`;
  return h;
}
// 🏪 市集 · 场镇 = 民生作坊 + 本地集市 + 马车
function townHTML(){
  let h=`<div class="screen"><h2>🏪 市集 · 场镇</h2><div class="desc">镇上作坊把原料加工成货;本地集市买卖,马车运往各州府。</div>`;
  h+= cardsHTML("town");
  h+= cartPanelHTML();
  h+=`<div class="bgroup">🏪 本地集市</div>`+marketCardHTML("local");
  h+=`</div>`;
  return h;
}
// ===== 库存 · 统计面板(点 HUD 信息条打开) =====
function openInventory(){
  let h=`<h2>📦 库存 · 统计</h2>`;
  h+=`<div class="bgroup">🏡 院子粮仓 <small style="color:var(--mut);font-weight:400">全家口粮 · 马车绝不外运</small></div>`;
  h+=`<div class="invstat">粮 <b>${Math.round(homeGrain())}</b> / 常备线 ${foodTarget()}(约 12 个月口粮)· 管家自动从可交易补粮进来</div>`;
  h+=`<div class="bgroup">📦 可交易库房 <small style="color:var(--mut);font-weight:400">卖货 / 喂牲畜 / 工坊用</small></div>`;
  const ks=Object.keys(S.goods).filter(k=>PRICE[k]&&S.goods[k]>0.1).sort((a,b)=>(S.goods[b]*PRICE[b])-(S.goods[a]*PRICE[a]));
  h+= ks.length ? `<div class="invgrid">`+ks.map(k=>`<span class="invcell">${goodIco(k)}${GNAME[k]} ${Math.round(S.goods[k])}<small>@${PRICE[k]}·值${Math.round(S.goods[k]*PRICE[k])}</small></span>`).join("")+`</div>` : `<div class="hint">可交易库房暂空</div>`;
  const inMkt=[]; for(const mid in S.markets){ const m=S.markets[mid]; for(const g in (m.stock||{})) if(m.stock[g]>0.1) inMkt.push(`${m.n} ${GNAME[g]}${Math.round(m.stock[g])}`); }
  if(inMkt.length) h+=`<div class="bgroup">🏪 各市货栈(待居民买)</div><div class="hint" style="text-align:left">${inMkt.join(" · ")}</div>`;
  const pend=Object.keys(S.pending||{}).filter(k=>S.pending[k]>0.5);
  if(pend.length) h+=`<div class="bgroup">🌱 在长/在产(待收获)</div><div class="hint" style="text-align:left">${pend.map(k=>`${GNAME[k]}${Math.round(S.pending[k])}`).join(" · ")}</div>`;
  h+=`<div class="bgroup">📊 统计</div>`;
  h+=`<div class="invstat">家产 <b>${assets().toLocaleString()}</b> 两 · ${title()}${(()=>{const d=Math.round(assets()-(S.lastYearAssets||assets()));return ` · 今年 ${d>=0?'+':''}${d}`;})()}</div>`;
  h+=`<div class="invstat">现银 ${Math.round(S.silver)} · 门第 ${prestige()} · 官面 ${Math.round(S.favor||0)} · 声望 ${Math.round(S.rep||0)}</div>`;
  if(S.report&&S.report.total>0) h+=`<div class="invstat">上月行商进账 +${S.report.total} 两</div>`;
  h+=`<div class="invstat">人手 ${freeW()}空 / ${totalLabor()}在手 / ${workerCap()}上限 · 田产 ${landUsed()}/${landCap()} · 产业 ${S.ind.length}</div>`;
  modal(h);
}
// ===== 城内页 =====
// ===== 官面 · 各段可复用 HTML(★单一真源:cityHTML 与各「建筑专属面板」都用这些)=====
function cityFavorHTML(){ const fav=Math.round(S.favor||0), bcd=Math.max(0,(S.banquetDay??-999)+120-S.day);
  return `<div class="favorbox">
    <div class="lh"><b>🎎 官面好感 ${fav}/100</b><small>宴官攒;买盐引、做官的门槛</small></div>
    <div class="fbar"><div class="fbarfill" style="width:${fav}%"></div></div>
    <button class="favbtn ${(bcd>0||S.silver<12)?'dis':''}" onclick="doBanquet()">🍷 宴请官员 <i>${bcd>0?bcd+'天后':'12两 → 好感+8'}</i></button>
  </div>`; }
function cityJuanaHTML(){ const j=S.juana||0, done=j>=JUANA.length, J=done?null:JUANA[j];   // 捐纳:银子→学位/官身→优免/官面/门第
  let h=`<div class="ventcard"><div class="vhead"><span class="vico">🎖</span><b>捐纳</b><span class="vtag">${j>0?'已捐 '+JUANA[j-1].n:'未捐'} · 门第 ${prestige()}</span></div><div class="vbody">`;
  if(done) h+=`<div class="opt dis">已捐至道台顶戴,跻身缙绅 🏅<small>捐纳到顶</small></div>`;
  else h+=`<button class="opt ${S.silver>=J.cost?'':'dis'}" onclick="doJuana()">${J.n} <span style="float:right;color:var(--accent);font-weight:700">${J.cost}两</span><small>${J.d} · 官面+${J.fav}、门第+${J.pres}</small></button>`;
  return h+`</div></div>`; }
function citySaltHTML(){ const scd=Math.max(0,(S.saltDay??-999)+30-S.day), lic=!!(S.salt&&S.salt.license);
  return `<div class="ventcard"><div class="vhead"><span class="vico">🧂</span><b>盐</b><span class="vtag">${lic?'已持官盐引 · 月入+12':'灰色暴利'}</span></div>
    <div class="vbody">
      <button class="opt ${(scd>0||S.silver<20)?'dis':''}" onclick="smuggleSalt('normal')">贩私盐(本钱20两)<small>${scd>0?scd+'天后再贩':'得手约 +35两 · 缉获18%(罚银枷号)'}</small></button>
      <button class="opt ${(scd>0||S.silver<80)?'dis':''}" onclick="smuggleSalt('armed')">🔪 武装大贩(本钱80两)<small>${scd>0?scd+'天后':'得手暴利 +220两 · 缉获28% → 枭首!'}</small></button>
      ${lic?'':`<button class="opt ${((S.favor||0)<30||S.silver<200)?'dis':''}" onclick="buySaltLicense()">📜 买官盐引(好感≥30 + 200两)<small>一次买断,此后每月稳定 +12两,无风险</small></button>`}
    </div></div>`; }
function cityEscortHTML(){ const ecd=Math.max(0,(S.escortDay??-999)+30-S.day), fame=(S.escort&&S.escort.fame)||0;
  return `<div class="ventcard"><div class="vhead"><span class="vico">🛡</span><b>镖局</b><span class="vtag">字号 ${fame}</span></div>
    <div class="vbody">
      <button class="opt ${ecd>0?'dis':''}" onclick="runEscort('small')">接小镖<small>${ecd>0?ecd+'天后再接':'+15两/趟 · 字号+1 · 遇匪15%赔10两'}</small></button>
      <button class="opt ${(ecd>0||fame<5)?'dis':''}" onclick="runEscort('big')">接大镖(需字号≥5)<small>${ecd>0?ecd+'天后':'+60两 · 字号+2 · 遇匪25%靠字号报号化解,败赔40两'}</small></button>
    </div></div>`; }
function cityExamHTML(){ const scholars=(S.kids||[]).filter(k=>k.age>=10 && (k.post==="study"||k.rank));   // 科举(有读书人/功名才有内容)
  if(!scholars.length) return "";
  let h=`<div class="ventcard"><div class="vhead"><span class="vico">📖</span><b>科举</b><span class="vtag">优免税 ${Math.round((1-[1,.85,.6,.35][famDegree()])*100)}%</span></div><div class="vbody">`;
  for(const k of scholars){ const e=examFor(k), rn=RANKNAME[k.rank||0];
    if(e){ const ready=(k.study||0)>=e.req && S.silver>=e.cost;
      h+=`<button class="opt ${ready?'':'dis'}" onclick="sitExam('${k.id}')">${S.surname}${k.name} · ${rn} → 赴考 ${e.name}<small>学问 ${k.study||0}/${e.req} · 路费 ${e.cost}两 · 中签约 ${Math.round(examProb(k)*100)}%</small></button>`;
    } else h+=`<div class="opt dis">${S.surname}${k.name} · 进士及第,功名到顶 🏅</div>`;
  }
  return h+`</div></div>`; }
function cityPressHTML(){ const press=!!(S.press&&S.press.open), canlit=famDegree()>=1||(S.kids||[]).some(k=>k.post==="study");   // 书局(有识字人才才有内容)
  if(!(press||canlit)) return "";
  let h=`<div class="ventcard"><div class="vhead"><span class="vico">📚</span><b>书局</b><span class="vtag">${press?(S.everJuren?'中举范文 · 月入+15':'月入+6'):'未开张'}</span></div><div class="vbody">`;
  if(press) h+=`<div class="opt dis">前店后厂,自刻自印自销${S.everJuren?'(家出举人 → 中举范文溢价)':''}<small>每月稳定进账,小概率遭文网查禁</small></div>`;
  else h+=`<button class="opt ${S.silver<60?'dis':''}" onclick="openPress()">开书局(雕版 60两)<small>一次投入,此后月入+6;家出举人则印范文+15</small></button>`;
  return h+`</div></div>`; }
function cityCivicHTML(){ let h=`<div class="bgroup">🏛 公共善举 <small style="color:var(--mut);font-weight:400">门第 ${prestige()} · 一次性,换体面/官面</small></div>`;   // 修桥/牌坊 civic 地标
  for(const k in LANDMARKS){ if(LANDMARK_LOC[k]!=="city") continue; const L=LANDMARKS[k], built=!!(S.landmarks&&S.landmarks[k]), lock=L.req&&famDegree()<L.req, ok=!built&&!lock&&S.silver>=L.cost;
    h+=`<button class="opt ${built?'cur':(ok?'':'dis')}" ${ok?`onclick="buyLandmark('${k}')"`:''}>${L.ico} <b>${L.n}</b> <span style="float:right;color:var(--accent);font-weight:700">${built?'✓ 已建':(lock?'需功名':L.cost+'两')}</span><small>${L.d} · 门第+${L.pres}</small></button>`; }
  return h; }

// ★每座官面建筑 → 它自己的功能面板(点书局进书局、点贡院进科举…不再都开同一个通用大面板)
function scHead(t){ return `<div class="sh-head"><div><div class="sh-tt">${t}</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`; }
function openYamenSheet(){  _sheetReopen=openYamenSheet;  scSheet(scHead("🏛 州衙 · 官面门第")+`<div class="screen">${cityFavorHTML()}${cityJuanaHTML()}${cityCivicHTML()}</div>`); }
function openSaltSheet(){   _sheetReopen=openSaltSheet;   scSheet(scHead("🧂 盐运司")+`<div class="screen">${citySaltHTML()}</div>`); }
function openEscortSheet(){ _sheetReopen=openEscortSheet; scSheet(scHead("🛡 镖局")+`<div class="screen">${cityEscortHTML()}</div>`); }
function openExamSheet(){   _sheetReopen=openExamSheet;   const b=cityExamHTML();
  scSheet(scHead("📖 贡院 · 科举")+`<div class="screen">${b||`<div class="empty">科举要先有「读书人」。<br>让满 10 岁的子女在<b>宅院·家族</b>里派「读书」攒学问,再来贡院赴考:秀才 → 举人 → 进士(中举优免赋税、得乡绅投献田产)。</div>`}</div>`); }
function openPressSheet(){  _sheetReopen=openPressSheet;  const b=cityPressHTML();
  scSheet(scHead("📚 书局")+`<div class="screen">${b||`<div class="empty">书局要先有「识字人才」。<br>家中子女<b>读书</b>(宅院·家族派「读书」),或已得<b>功名</b>,即可开书局(雕版 60两)→ 月月进账;家出举人还印「中举范文」溢价、月入更高。</div>`}</div>`); }

function cityHTML(){
  let h=`<div class="screen"><h2>🏯 城镇 · 州府</h2>`;
  // 各州府行情 + 铺面(远城,非本地)
  h+=`<div class="bgroup">🏬 各州府 · 行情/铺面 <small style="color:var(--mut);font-weight:400">马车在「市集」配路线运来此卖;铺面=零售出口</small></div>`;
  for(const mid in S.markets){ if(mid==="local") continue; h+=marketCardHTML(mid); }
  h+=`<div class="bgroup">🎎 官面 · 社会</div>`;
  h+=cityFavorHTML();
  h+=`<button class="bigbtn" onclick="openBroker()">🏯 牙行 · 人市<span style="display:block;font-size:11px;color:#e8d7b3;font-weight:400">招长工 · 雇家仆 · 买童养媳/婢女回养</span></button>`;
  h+=cityJuanaHTML()+citySaltHTML()+cityEscortHTML()+cityExamHTML()+cityPressHTML()+cityCivicHTML();
  const scholars=(S.kids||[]).filter(k=>k.age>=10 && (k.post==="study"||k.rank));
  const press=!!(S.press&&S.press.open), canlit=famDegree()>=1||(S.kids||[]).some(k=>k.post==="study");
  const lk=[]; if(!scholars.length) lk.push("子女读书 → 科举"); if(!(press||canlit)) lk.push("识字人才 → 书局");
  h+=`<div class="hint">${lk.length?`🔒 ${lk.join(" · ")}　`:""}🌊 江河水患年终不期而至</div></div>`;
  return h;
}
function setView(v){ view=v; document.querySelectorAll("#tabbar button").forEach(b=>b.classList.toggle("on",b.dataset.view===v)); renderMain(); }
// 左右滑翻页:dir +1=右滑→下一页(宅院→产业方向),-1=左滑→上一页;到头即停(不循环)
const SWIPE_TABS=["home","farm","town","city","tian","set"];
function scSwipe(dir){ const tabs=SWIPE_TABS.filter(t=>t!=="tian"||(typeof warOn==="function"&&warOn())); const i=tabs.indexOf(view); if(i<0) return; const ni=i+dir; if(ni<0||ni>=tabs.length) return; setView(tabs[ni]); }   // 天下页未解锁时滑动跳过

// (旧 logHTML 已并入设置页二级页 openLog,删除避免「日志渲染」双源)

// ===== 设置 · 干净菜单(各项 → 二级页 modal,统一百科/后台的样式) =====
function settingsHTML(){
  let h=`<div class="screen"><h2>⚙ 设置</h2>`;
  h+=`<button class="opt" onclick="openLog()">📜 大事记 · 目标<small>当前目标任务 + 家族历年要事</small></button>`;
  h+=`<button class="opt" onclick="openEstate()">📊 家底 · 状态<small>当前所有加成 / 状态一览</small></button>`;
  h+=`<button class="opt" onclick="openDisplay()">🎨 显示设置<small>字号 / 字体 / 配色 / 背景 / 动效 / 音乐</small></button>`;
  h+=`<button class="opt" onclick="openSaveIO()">📦 导出 / 导入存档<small>换浏览器(Safari)接着玩:复制存档码 → 那边粘贴导入</small></button>`;
  h+=`<button class="opt" onclick="openWiki()">📖 玩法百科<small>各系统怎么玩 + 关键数值(可看可调)</small></button>`;
  h+=`<button class="opt" onclick="openAdminGate()">🔧 后台管理<small>调数值 / 调试(需 8 位密码)</small></button>`;
  h+=`<button class="opt" onclick="confirmRestart()">🌅 重新开局<small>清空当前进度,从「流民」从头来过</small></button>`;
  h+=`<div class="hint">大农庄 · 卡片经营 v0618a(场景版) · 存档自动保存在本浏览器(localStorage)</div></div>`;
  return h;
}
// 📜 大事记 · 目标(二级页)
function openLog(){
  const L=S.log||[];
  let h=`<h2>📜 大事记 · 目标</h2>`;
  h+=`<div class="bgroup">当前目标 / 任务</div>`+chalHTML();
  h+=`<div class="bgroup">📜 大事记 <small style="color:var(--mut);font-weight:400">家族历年要事</small></div>`;
  h+= L.length ? L.slice().reverse().map(e=>`<div class="logrow"><span class="logt">${e.y}年·${e.s}</span><span class="logx">${e.t}</span></div>`).join("") : `<div class="empty">尚无大事,经营起来便有记载</div>`;
  modal(h);
}
// 📊 家底 · 状态(二级页):当前所有加成/状态一览
function openEstate(){
  const B=[];
  if((S.cropBonus||1)>1) B.push(`🌱 作物产量 +${Math.round((S.cropBonus-1)*100)}%`);
  if((S.workBonus||1)>1) B.push(`🏯 作坊产出 +${Math.round((S.workBonus-1)*100)}%`);
  const fc=famBonus("crop"),fw=famBonus("work"),fm=famBonus("market");
  if(fc>1) B.push(`👨‍🌾 农管 作物 +${Math.round((fc-1)*100)}%`);
  if(fw>1) B.push(`🧮 账房 作坊 +${Math.round((fw-1)*100)}%`);
  if(fm>1) B.push(`🏪 掌柜 卖价 +${Math.round((fm-1)*100)}%`);
  B.push(`${manor().ico} 大宅 ${manor().n}`);
  if(wivesCount()>0) B.push(`💞 内宅 ${S.spouse?'大夫人':''}${consorts().filter(c=>c.rank==='平妻').length?'·二夫人':''}${consorts().filter(c=>c.rank==='妾').length?'·妾×'+consorts().filter(c=>c.rank==='妾').length:''}`);
  if((S.shops||[]).length) B.push(`🏬 城里铺面 ${(S.shops||[]).length} 处`);
  B.push(`🏯 门第 ${prestige()}`);
  if(statusDeg()>0) B.push(`🎓 功名/捐纳 优免税 −${Math.round((1-degMul())*100)}%`);
  if(S.juana>0) B.push(`🎖 ${JUANA[S.juana-1].n}`);
  { const lm=Object.keys(S.landmarks||{}).filter(k=>S.landmarks[k]&&LANDMARKS[k]); if(lm.length) B.push(`🏛 地标 ${lm.map(k=>LANDMARKS[k].n).join("·")}`); }
  if(shrineLuck()>0) B.push(`⛩️ 出高级卡 +${Math.round(shrineLuck()*100)}%`);
  if(vWork('school')) B.push(`📖 义学(脑力):作坊产出 +${Math.round((eduWork()-1)*100)}% · 读书人 ${scholars()}`);
  if(vWork('playground')) B.push(`🤸 操场(体力):耕作产出 +${Math.round((eduCrop()-1)*100)}%`);
  if(buildSpeedMul()>1) B.push(`🏗 营造提速 +${Math.round((buildSpeedMul()-1)*100)}%`);
  if(fertNeed()>0) B.push(fertActive()?`💩 施肥中:作物 +${Math.round((TUNE.fertBonus-1)*100)}% · 粪肥 ${Math.round(G('dung'))}/需${fertNeed().toFixed(1)}/月`:`💩 粪肥不足(${Math.round(G('dung'))}/需${fertNeed().toFixed(1)}):养畜产粪→田增产`);
  if(academyTier()>0) B.push(`🏛 旧研究院 ×${academyTier()}(已停研,改由义学/操场)`);
  if(regentMul()<1) B.push(`<span class="warn">⚠ 幼主临政 产出 −20%</span>`);
  B.push(`🎎 官面好感 ${Math.round(S.favor||0)}`);
  B.push(`🤝 声望 ${Math.round(S.rep||0)}`);
  B.push(`🌾 田产 ${landUsed()}/${landCap()}`);
  B.push(`📜 今年「${(S.levy&&S.levy.mood)||'照常征赋'}」· 商税 ${Math.round(commRate()*100)}%`);
  { const d=Math.round(assets()-(S.lastYearAssets||assets())); B.push(`📊 今年家产 ${d>=0?'+':''}${d} 两(至今)`); }
  if(servantCount()>0) B.push(`🤵 家仆 ${servantCount()} · 月俸 ${servantWage().toFixed(1)}`);
  if(svc("accountant")>0) B.push(`🧮 账房 税 −${Math.round((1-svcTaxMul())*100)}%`);
  if(svc("carter")>0) B.push(`🐴 车夫 ${svc("carter")} · 可多跑 ${svc("carter")} 辆车`);
  if((S.toolLevel||0)>0) B.push(`🔧 农具 每工管田 +${S.toolLevel}`);
  if(S.salt&&S.salt.license) B.push(`🧂 官盐引 月+12`);
  if(S.press&&S.press.open) B.push(`📚 书局 月+${S.everJuren?15:6}`);
  let h=`<h2>📊 家底 · 状态</h2>`;
  h+=`<div class="bgroup">当前加成 / 状态</div><div class="bufflist">${B.map(b=>`<span class="buffchip">${b}</span>`).join("")}</div>`;
  modal(h);
}
// 🎨 显示设置(二级页):点选项后自调 openDisplay() 重绘以更新选中态
function openDisplay(){
  let h=`<h2>🎨 显示设置</h2><div class="desc" style="text-align:left">版式 / 字号 / 字体 / 配色 / 背景 / 动效 / 音乐 · 设置存本机,即时生效。</div>`;
  h+=`<div class="themerow"><span>版式</span><div class="themeopts">`+[['auto','自动'],['mobile','手机'],['pc','电脑']].map(([k,n])=>`<button class="topt ${((_theme.layout||'auto')===k)?'on':''}" onclick="setThemeOpt('layout','${k}');openDisplay()">${n}</button>`).join("")+`</div></div><div class="desc" style="text-align:left;font-size:.8em;color:var(--mut);margin:-2px 0 8px">界面莫名放大/变形了?选「手机」即恢复窄版(自动判断偶尔把大屏或横屏手机当成电脑、整体放大1.5倍)。</div>`;
  h+=`<div class="themerow"><span>字号</span><div class="themeopts">`+Object.keys(FSIZE).map(k=>`<button class="topt ${_theme.fs===k?'on':''}" onclick="setThemeOpt('fs','${k}');openDisplay()">${FSIZE[k].n}</button>`).join("")+`</div></div>`;
  h+=`<div class="themerow"><span>字体</span><div class="themeopts">`+Object.keys(FONTS).map(k=>`<button class="topt ${_theme.font===k?'on':''}" onclick="setThemeOpt('font','${k}');openDisplay()" style="font-family:${FONTS[k].css}">${FONTS[k].n}</button>`).join("")+`</div></div>`;
  h+=`<div class="themerow"><span>配色</span><div class="themeopts">`+Object.keys(THEMES).map(k=>`<button class="topt ${_theme.color===k?'on':''}" onclick="setThemeOpt('color','${k}');openDisplay()">${THEMES[k].n}</button>`).join("")+`</div></div>`;
  h+=`<div class="themerow"><span>背景</span><div class="themeopts">`+Object.keys(REGIONS).map(k=>`<button class="topt ${REGION===k?'on':''}" onclick="setRegion('${k}');openDisplay()">${REGIONS[k].name}</button>`).join("")+`<button class="topt" onclick="setRegion(randomRegion());openDisplay()">🎲 随机</button></div></div><div class="desc" style="text-align:left;font-size:.8em;color:var(--mut);margin:-2px 0 6px">背景=省份:换城名/特产/水患,乱世「天下」页的州县与乱局也随之换(川蜀白莲教 / 河南教匪北路 / 江南沿海寇乱)。</div>`;
  { const fxon=(typeof fxIsOn==='function')?fxIsOn():true;
    h+=`<div class="themerow"><span>动效</span><div class="themeopts"><button class="topt ${fxon?'on':''}" onclick="setFx(true);openDisplay()">✨ 开</button><button class="topt ${!fxon?'on':''}" onclick="setFx(false);openDisplay()">关</button></div></div>`; }
  { const bon=(typeof bgmIsOn==='function')?bgmIsOn():true;
    h+=`<div class="themerow"><span>音乐</span><div class="themeopts"><button class="topt ${bon?'on':''}" onclick="setBgm(true);openDisplay()">🎵 开</button><button class="topt ${!bon?'on':''}" onclick="setBgm(false);openDisplay()">关</button></div></div>`; }
  modal(h);
}
function confirmRestart(){ modal(`<h2>🌅 重新开局?</h2><div class="desc">当前所有家业、家族、进度将<b>清空</b>,从头开始一局。确定?</div><button class="opt" onclick="doRestart()">确定 · 重开</button>`); }
function doRestart(){ $("#modal").dataset.lock=''; closeModal(); seedFarm(); setView("home"); save(true); setSpeed(1); toast("🌅 新的一世,从头开张"); }

