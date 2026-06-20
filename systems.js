'use strict';
// [systems] 捐纳/地标/大宅升级 · 宴官盐镖 · 科举书局 · 黄河 · 产业二级页
// ===== 钱的强出口:捐纳功名(买身份) + 大额营造家族地标(换门第/声望) =====
function doJuana(){
  const j=S.juana||0; if(j>=JUANA.length){ toast("已捐至道台顶戴,捐纳到顶"); return; }
  const J=JUANA[j]; if(S.silver<J.cost){ toast(`${J.n} 需纳银 ${J.cost} 两(现 ${Math.round(S.silver)})`); return; }
  S.silver-=J.cost; S.juana=j+1; S.favor=Math.min(100,(S.favor||0)+J.fav);
  toast(`🎖 ${J.n}!官面 +${J.fav} · 门第涨(优免/阶位皆受益)`); logMsg(`🎖 捐纳「${J.n}」,跻身士绅`); celebrate("🎖", J.n, "跻身士绅"); render(); save(true);
}
const LANDMARK_MANOR = {garden:2, shrine2:3, menagerie:5};   // 府内功能位:园林/祠堂/兽苑须大宅升到位才可营造
function landmarkManorOK(k){ return manorLv() >= (LANDMARK_MANOR[k]||0); }
function upgradeManor(){
  const lv=manorLv(); if(lv>=MANOR.length-1){ toast("已是「庄园府邸」,大宅到顶"); return; }
  const nx=MANOR[lv+1]; if(S.silver<nx.cost){ toast(`营造「${nx.n}」需 ${nx.cost.toLocaleString()} 两(现 ${Math.round(S.silver)})`); return; }
  S.silver-=nx.cost; S.manor=lv+1; S.rep=(S.rep||0)+3;
  let extra=""; if(nx.unlock&&LANDMARKS[nx.unlock]) extra=` · 解锁营造「${LANDMARKS[nx.unlock].n}」`; if(nx.cook) extra+=" · 添小厨房(宴官+3)";
  toast(`🏯 大兴土木,宅邸升为「${nx.n}」!人手/库容/仆役/养女上限大涨、门第 +${nx.pres-MANOR[lv].pres}${extra}`);
  logMsg(`🏯 营造宅邸至「${nx.n}」(门第大涨)`); render(); reopenBuild(); save(true);
}
// ===== 宅院全套扩建(P5):房舍(耳房/厢房/后罩房/库房)+ 多级花园 + 兽苑虎园 =====
function roomMax(t){ return (ROOMS[t]&&ROOMS[t].max)||0; }
function roomHave(t){ return (S.rooms&&S.rooms[t])||0; }
function buildRoom(t){ const R=ROOMS[t]; if(!R)return;
  if(roomHave(t)>=R.max){ toast(`${R.n}已盖满(${R.max} 间)`); return; }
  if(S.silver<R.cost){ toast(`盖${R.n}需 ${R.cost} 两`); return; }
  if(G("wood")<R.wood){ toast(`盖${R.n}需 ${R.wood} 木(林场→木作坊)`); return; }
  if(G("brick")<R.brick){ toast(`盖${R.n}需 ${R.brick} 砖(矿场黏土→砖窑)`); return; }
  S.silver-=R.cost; addG("wood",-R.wood); addG("brick",-R.brick);
  if(!S.rooms)S.rooms={}; S.rooms[t]=(S.rooms[t]||0)+1;
  toast(`🏠 盖起一间「${R.n}」(第 ${S.rooms[t]}/${R.max} 间 · 门第+${R.pres})`); logMsg(`🏠 宅院添「${R.n}」`); render(); reopenBuild(); save(true);
}
function gardenLv(){ return S.gardenLv||0; }
function upgradeGarden(){ const lv=gardenLv(); if(lv>=GARDEN.length-1){ toast("花园已至「园林胜景」,到顶"); return; }
  const nx=GARDEN[lv+1]; if(S.silver<nx.cost){ toast(`升「${nx.n}」需 ${nx.cost} 两`); return; }
  if(manorLv()<2){ toast("须先营造至「四合院」才好理园"); return; }
  S.silver-=nx.cost; S.gardenLv=lv+1; S.rep=(S.rep||0)+(nx.rep-(GARDEN[lv].rep||0));
  toast(`🏞 花园升为「${nx.n}」!门第 +${nx.pres-GARDEN[lv].pres} · 声望涨`); logMsg(`🏞 花园升「${nx.n}」`); celebrate("🏞", nx.n+" 落成", "门第 +"+nx.pres); render(); reopenBuild(); save(true);
}
function menagerieOK(){ return manorLv()>=5 && gardenLv()>=3; }   // 兽苑须府邸 + 亭台楼榭以上
function buyLandmark(k){
  const L=LANDMARKS[k]; if(!L)return; if(S.landmarks&&S.landmarks[k]){ toast(`${L.n}已建`); return; }
  if(k==="menagerie" && !menagerieOK()){ toast("兽苑·虎园 须先有「府邸」大宅 + 花园升至「亭台楼榭」以上"); return; }
  if(!landmarkManorOK(k)){ toast(`${L.n}须先营造至「${MANOR[LANDMARK_MANOR[k]].n}」`); return; }
  if(L.req && famDegree()<L.req){ toast(`${L.n}需家有功名(中秀才以上)`); return; }
  if(S.silver<L.cost){ toast(`${L.n} 需银 ${L.cost} 两(现 ${Math.round(S.silver)})`); return; }
  S.silver-=L.cost; if(!S.landmarks)S.landmarks={}; S.landmarks[k]=true;
  const repGain={garden:8,shrine2:10,school:10,bridge:12,charity:15,arch:15,menagerie:30}[k]||10; S.rep=(S.rep||0)+repGain;
  if(k==="bridge"||k==="arch") S.favor=Math.min(100,(S.favor||0)+(k==="arch"?25:15));
  toast(`🏛 ${L.n}落成!门第 +${L.pres} · 声望 +${repGain}`); logMsg(`🏛 营造「${L.n}」,门第大涨`); celebrate(L.ico, L.n+" 落成", "门第 +"+L.pres); render(); reopenBuild(); save(true);
}
// ===== 城内社会层(P4 波1:官面favor + 盐 + 镖局) =====
function doBanquet(){
  const cd=Math.max(0,(S.banquetDay??-999)+120-S.day);
  if(cd>0){ toast(`官面不宜频走,还需 ${cd} 天`); return; }
  if(S.silver<12){ toast("宴请官员需 12 两办席"); return; }
  const fv=8+svc("cook")*3+(manor().cook?3:0); S.silver-=12; S.favor=Math.min(100,(S.favor||0)+fv); S.banquetDay=S.day;   // 厨子+小厨房助席(席资贴真实~数两)
  toast(`🍷 摆席宴官,觥筹交错,官面好感 +${fv}`); render(); save(true);
}
function smuggleSalt(mode){
  const cd=Math.max(0,(S.saltDay??-999)+30-S.day);
  if(cd>0){ toast(`盐路风声紧,${cd} 天后再贩`); return; }
  const armed=mode==="armed", cost=armed?80:20;
  if(S.silver<cost){ toast(`需本钱 ${cost} 两`); return; }
  S.silver-=cost; S.saltDay=S.day;
  const caught=Math.random()<(armed?0.28:0.18)*Math.pow(0.82,svc("guard"));   // 护院减缉获率
  if(!caught){
    const gain=armed?220:35; S.silver+=gain;
    toast(armed?`🔪 武装大贩得手!暴利 +${gain} 两`:`🧂 私盐一趟得手 +${gain} 两`);
    render(); save(true);
  } else if(armed){
    lordDies(`${S.surname}${S.lord.name} 贩私盐武装拒捕,事败被官府枭首示众!`);   // 自带弹窗/继承,不再 render
  } else {
    const fine=20; S.silver=Math.max(0,S.silver-fine); S.rep=Math.max(0,(S.rep||0)-3);
    toast(`🚨 私盐被缉获!没了本钱 + 罚银 ${fine} 两 + 枷号示众,声望 −3`); render(); save(true);
  }
}
function buySaltLicense(){
  if(S.salt&&S.salt.license){ toast("已持官盐引"); return; }
  if((S.favor||0)<30){ toast(`买官盐引需官面好感 ≥ 30(当前 ${Math.round(S.favor||0)})`); return; }
  if(S.silver<200){ toast("买官盐引需纹银 200 两"); return; }
  S.silver-=200; S.salt.license=true;
  toast("📜 纳银请引、打点关系,官盐引到手!此后每月稳定 +12 两盐利"); logMsg(`📜 购得官盐引,每月稳定盐利`); render(); save(true);
}
function runEscort(size){
  const cd=Math.max(0,(S.escortDay??-999)+30-S.day);
  if(cd>0){ toast(`镖路未歇,${cd} 天后再接`); return; }
  const big=size==="big", fame=(S.escort&&S.escort.fame)||0;
  if(big && fame<5){ toast(`大镖需字号 fame ≥ 5(当前 ${fame})`); return; }
  S.escortDay=S.day;
  const ambush=Math.random()<(big?0.25:0.15);
  if(!ambush){
    const pay=big?60:15, df=big?2:1; S.silver+=pay; S.escort.fame=fame+df;
    toast(`🛡 ${big?'大镖':'小镖'}一路太平,抽成 +${pay} 两 · 字号 +${df}`);
  } else {
    const resolve=Math.random()<Math.min(0.9,fame*0.1);
    if(resolve){ const pay=big?60:15; S.silver+=pay; S.escort.fame=fame+1;
      toast(`🐎 路遇响马,报上字号陪笑化解!照拿抽成 +${pay} 两 · 字号 +1`);
    } else { const loss=big?40:10; S.silver=Math.max(0,S.silver-loss); S.escort.fame=Math.max(0,fame-(big?2:0));
      toast(big?`💀 大镖遭劫,丢镖赔货 −${loss} 两、镖师阵亡,字号受损`:`🐎 小镖遇匪,赔货 −${loss} 两`); }
  }
  render(); save(true);
}

// ===== 科举(波2:接「读书」职) =====
const RANKNAME = ["白身","秀才","举人","进士"];
const EXAM = [
  {rank:1, name:"秀才", req:6,  cost:15,  base:0.30, ps:0.03,  pf:0.004, cap:0.75, fav:4},
  {rank:2, name:"举人", req:14, cost:40,  base:0.15, ps:0.02,  pf:0.004, cap:0.55, fav:12},
  {rank:3, name:"进士", req:26, cost:100, base:0.08, ps:0.015, pf:0.003, cap:0.40, fav:25},
];
function studyTick(){ if(!S.kids)return; const t=svc("tutor"), sch=(S.landmarks&&S.landmarks.school)?1:0; for(const k of S.kids) if(k.post==="study"&&k.age>=10) k.study=(k.study||0)+(k.talent==="聪慧"?3:2)+t*2+sch; }   // 西席+2/年、义学+1/年
function examFor(k){ return EXAM[k.rank||0]; }   // 下一场考试(进士后 undefined)
function examProb(k){ const e=examFor(k); if(!e)return 0; let p=e.base+(k.study||0)*e.ps+(S.favor||0)*e.pf; if(k.talent==="聪慧")p+=0.05; return Math.min(e.cap,Math.max(0.02,p)); }
function sitExam(id){
  const k=(S.kids||[]).find(x=>String(x.id)===String(id)); if(!k)return;
  const e=examFor(k); if(!e){ toast("已是进士,功名到顶"); return; }
  if((k.study||0)<e.req){ toast(`学问未足,需 ${e.req}(当前 ${k.study||0})`); return; }
  if(S.silver<e.cost){ toast(`赴考需路费 ${e.cost} 两`); return; }
  S.silver-=e.cost;
  if(Math.random()<examProb(k)){
    k.rank=e.rank; celebrate("📜", "高中"+e.name, S.surname+k.name);
    S.favor=Math.min(100,(S.favor||0)+e.fav);
    let msg=`🎉 ${S.surname}${k.name} 高中${e.name}!官面好感 +${e.fav}`; logMsg(`🎉 ${S.surname}${k.name} 高中${e.name}!(开优免田额)`);
    if(e.rank>=2) S.everJuren=true;
    if(e.rank===2){ S.silver+=80; let ad=0; for(let i=0;i<2;i++){ if(landUsed()<landCap()){ addInd("field"); ad++; } } msg+=` · 乡绅投献:银+80${ad?`、田+${ad}`:""}`; }   // 投献田受田额限,不破墙(免田产 32/30)
    if(e.rank===3){ S.silver+=250; S.favor=Math.min(100,S.favor+10); msg+=" · 同年门生投献:银+250"; }
    toast(msg);
  } else {
    toast(`📕 ${S.surname}${k.name} 名落孙山,路费 ${e.cost} 两付诸东流`);
  }
  render(); save(true);
}

// ===== 书局(波2) =====
function openPress(){
  if(S.press&&S.press.open){ toast("书局已开张"); return; }
  const canlit = famDegree()>=1 || (S.kids||[]).some(k=>k.post==="study");
  if(!canlit){ toast("需识字人才:让子女读书 或 考取秀才"); return; }
  if(S.silver<60){ toast("雕版开书局需 60 两"); return; }
  S.silver-=60; S.press={open:true};
  toast("📚 书局开张!前店后厂、自刻自印自销,此后每月进账"); render(); save(true);
}

// ===== 黄河决口(波3) =====
function hasFarmToFlood(){ return S.ind.some(b=>DEFS[b.type].kind==="crop"); }
function openFloodPanel(){
  setSpeed(0); _curDept=null; _curKid=null;
  const crops=S.ind.filter(b=>b.type==="field"||b.type==="paddy");   // ★只冲毁农田(矿/林不毁);小农场手下留情
  let n=Math.min(Math.ceil(crops.length/4), 3);                       // 至多冲毁 1/4、上限 3 处(田少则0~1)
  n=Math.max(0, n-Math.min(svc("guard"),2));                         // 护院抢险护田
  for(let i=0;i<n;i++) S.ind=S.ind.filter(x=>x!==crops[i]);
  clampAssign();
  const lostGrain=Math.min(G("grain"),20); addG("grain",-lostGrain);
  const dis=curRegion().disaster, disd=curRegion().disasterDesc;
  logMsg(`🌊 ${dis}!冲毁良田 ${n} 处、卷走存粮`);
  let h=`<h2>🌊 ${dis}</h2><div class="desc" style="text-align:left;line-height:1.7">${disd},冲毁良田 <b>${n}</b> 处、卷走存粮 ${Math.round(lostGrain)} 石,米价飞涨,饿殍载道。<br>你如何应对?</div>`;
  h+=`<button class="opt ${S.silver>=100?'':'dis'}" onclick="floodChoice('relief')">🍚 开仓赈灾(捐 100 两)<small>舍粥救民 · 官面好感 +15、声望 +5</small></button>`;
  h+=`<button class="opt" onclick="floodChoice('honest')">🛠 应募治河(清廉)<small>督工堵口 · 河工银 +80、官面 +10</small></button>`;
  h+=`<button class="opt" onclick="floodChoice('graft')">💰 趁机贪墨河银<small>暴富 +300,但四成败露 → 处斩抄家!</small></button>`;
  h+=`<button class="opt" onclick="floodChoice('none')">🚪 闭门自保<small>不沾不赈,白受这场灾</small></button>`;
  modal(h,true);
}
function floodChoice(c){
  if(c==="relief"){ if(S.silver<100){ toast("银钱不够赈灾"); return; } S.silver-=100; S.favor=Math.min(100,(S.favor||0)+15); S.rep=(S.rep||0)+5; toast("🍚 开仓舍粥,活人无数,官民交誉(好感+15 声望+5)"); }
  else if(c==="honest"){ S.silver+=80; S.favor=Math.min(100,(S.favor||0)+10); toast("🛠 督工有方,堵口成功,河工银 +80、官面 +10"); }
  else if(c==="graft"){ S.silver+=300;
    if(Math.random()<0.40){ $("#modal").dataset.lock=''; lordDies(`${S.surname}${S.lord.name} 治河贪墨,事败被参,处斩抄家!`); return; }
    toast("💰 贪墨河银 +300,神不知鬼不觉……(暂未败露)"); }
  else { toast("🚪 闭门自保,默默清理灾田"); }
  $("#modal").dataset.lock=''; closeModal();
  _heirThenDev=true; openSeason();   // 灾后接本季卡摊
}

// ===== 部门管理(场景版:底部滑出面板) =====
function openDept(t){
  _curDept=t;
  const d=DEFS[t], n=deptItems(t).length, asn=S.assign[t]||0, mng=deptManaged(t);
  let h=`<div class="sh-head">${icoImg(t,`<span style="font-size:34px">${d.ico}</span>`)}
    <div><div class="sh-tt">${d.n}</div><div class="sh-tags"><span class="sh-tag cnt">×${n}</span>${d.worker>0?`<span class="sh-tag">实管 ${mng}/${n}</span>`:""}${n>mng?`<span class="sh-tag" style="background:var(--bad);color:#fff;border-color:transparent">${n-mng}荒</span>`:""}</div></div>
    <span class="shx" onclick="scCloseSheet()">✕</span></div>`;
  h+=`<div class="sh-note">月产 ${deptOutSummary(t)}</div>`;
  if(d.worker>0) h+=`<div class="sh-row"><div class="l">派工 <small>空闲 ${freeW()} 人 · 每人管 ${farmPer(t)}</small></div>
    <div class="sh-step"><button onclick="assignDept('${t}',-1)">−</button><b>${asn}</b><button class="${freeW()<=0?'dis':''}" onclick="assignDept('${t}',1)">＋</button></div></div>`;
  if(d.kind==="crop" && !d.mineral){ const r=toolReq(), maxed=(S.toolLevel||0)>=TOOL_CAP, can=!maxed&&G("tool")>=r.tool&&S.silver>=r.silver;
    h+=`<div class="sh-row"><div class="l">🔧 农具 <small>每工管田 ${farmPer(t)}(Lv ${S.toolLevel||0})${maxed?"·已配齐":`·耗 ${r.tool}农具+${r.silver}两`}</small></div><button class="sh-btn ${can?"":"dis"}" style="width:auto;margin:0;padding:8px 13px" ${can?'onclick="equipTool()"':""}>${maxed?"已到顶":"添置+1"}</button></div>`; }
  if(d.kind==="work"){ const mg=Math.max(1,deptManaged(t)), ins=wsInputs(d), lack=ins.some(x=>G(x.g)<x.amt*mg), inTxt=ins.map(x=>`${x.amt}${GNAME[x.g]}`).join("+");
    h+=`<div class="sh-note ${lack?"warn":""}">⚙ 每处月耗 ${inTxt} → ${d.outAmt}${GNAME[d.out]}(升阶翻倍)${lack?" · 缺料停产" : ""}</div>`; }
  if(d.kind==="shrine") h+=`<div class="sh-note">⛩️ 新营造更易出「良/上」高级初始 · 当前 +${Math.round(shrineLuck()*100)}%(多建祠堂提高)</div>`;
  if(d.kind==="academy"){ const rsc=S.assign.academy||0, rmax=academyTier()*4;
    h+=`<div class="sh-note">🏛 研究院 ×${academyTier()} · 科技点 ${Math.floor(S.tech||0)}(+${techRate().toFixed(1)}/月)</div>`;
    h+=`<div class="sh-row"><div class="l">派研究员 <small>空闲 ${freeW()} · ${rsc}/${rmax}</small></div><div class="sh-step"><button onclick="assignDept('academy',-1)">−</button><b>${rsc}</b><button class="${rsc>=rmax?"dis":""}" onclick="assignDept('academy',1)">＋</button></div></div>`;
    h+=`<div class="sh-bgroup">科研(花科技点,永久升级)</div>`;
    for(const tk in RESEARCH){ const R=RESEARCH[tk], lv=(S.research&&S.research[tk])||0, cost=researchCost(tk);
      h+=`<div class="sh-row"><div class="l">${R.ico} ${R.n} <small>Lv${lv} · 每级+${Math.round(R.per*100)}%</small></div><button class="sh-btn ${(S.tech||0)<cost?"dis":""}" style="width:auto;margin:0;padding:8px 13px" onclick="doResearch('${tk}')">研制 ${cost}点</button></div>`; }
  }
  if(d.kind==="crop"||d.kind==="animal"||d.kind==="work") h+=deptItemsSheet(t);   // 逐处:改种/改养/升阶/拆
  scSheet(h);
}
function reopenDept(t){ if(scSheetOpen() && _curDept===t) openDept(t); }
// 逐处管理(sheet 版):每处单独 改种/改养/升阶/拆
function deptItemsSheet(t){
  const d=DEFS[t], items=deptItems(t); if(!items.length) return "";
  const label = d.kind==="crop" ? (d.mineral?"逐处 · 矿种/升阶/拆":"逐处 · 改种/升阶/拆") : d.kind==="animal" ? "逐处 · 改养/升阶/拆" : "逐处 · 升阶/拆";
  const upable=items.filter(b=>(b.tier||1)<MAX_TIER).length, indUp=S.ind.filter(b=>DEFS[b.type]&&(b.tier||1)<MAX_TIER).length;
  let h=`<div class="sh-bgroup">${label} · ${items.length} 处</div>`;
  if(upable>=2||indUp>upable) h+=`<div class="bgrid" style="margin:2px 0 6px">${upable>=1?`<button class="opt bcell" onclick="upgradeAllDept('${t}')">⏫ 本类一键升满<span class="bcost">${upable} 处可升</span></button>`:""}${indUp>=1?`<button class="opt bcell" onclick="upgradeAllInd()">⏫⏫ 全庄一键升满<span class="bcost">共 ${indUp} 处</span></button>`:""}</div>`;
  h+=`<div class="sh-items">`;
  items.forEach(b=>{ const tier=b.tier||1, maxed=tier>=MAX_TIER, uc=itemUpCost(b), tierTxt=tier>1?`${TIERNAME[Math.min(tier,4)]}级`:"一级";
    let sel="";
    if(d.kind==="crop") sel=`<select class="csel" onchange="setItemCrop('${b.id}',this.value)">`+d.crops.map(c=>`<option value="${c}"${b.crop===c?" selected":""}>${CROPS[c].n}</option>`).join("")+`</select>`;
    else if(d.kind==="animal") sel=`<select class="csel" onchange="setItemAnimal('${b.id}',this.value)">`+d.animals.map(a=>`<option value="${a}"${b.animal===a?" selected":""}>${ANIMALS[a].n}</option>`).join("")+`</select>`;
    else sel=`<span style="flex:1;font-weight:700">${d.n}</span>`;
    h+=`<div class="sh-irow">${d.kind==="animal"?icoImg(b.animal,d.ico):icoImg(t,d.ico)}${sel}<span class="itier${tier>1?" hi":""}">${tierTxt}</span><button class="iup ${(maxed||S.silver<uc)?"dis":""}" ${maxed?"":`onclick="upgradeItem('${b.id}')"`}>${maxed?"顶级":`升 ${uc}两`}</button><span class="iraze" onclick="razeItem('${b.id}')">拆</span></div>`;
  });
  return h+`</div>`;
}
// ★逐处管理(2026-06-14 老板要可控):每处产业单独 改种/养·升级·拆,不再自动挑/自动挪
function findItem(id){ return S.ind.find(b=>String(b.id)===String(id)); }
function itemUpCost(b){ return Math.round(30*Math.pow(2.4,(b.tier||1)-1)); }
function setItemCrop(id,c){ const b=findItem(id); if(b&&DEFS[b.type].kind==="crop"){ b.crop=c; render(); reopenDept(b.type); save(true); } }
function setItemAnimal(id,a){ const b=findItem(id); if(b&&DEFS[b.type].kind==="animal"){ b.animal=a; render(); reopenDept(b.type); save(true); } }
function upgradeItem(id){ const b=findItem(id); if(!b)return; const tier=b.tier||1;
  if(tier>=MAX_TIER){ toast(`已是顶级(产出 ×${Math.pow(2,MAX_TIER-1)},封顶)`); return; }
  const uc=itemUpCost(b); if(S.silver<uc){ toast(`升阶需 ${uc} 两`); return; }
  S.silver-=uc; b.tier=tier+1; toast(`⬆ 一处${DEFS[b.type].n}升「${TIERNAME[Math.min(b.tier,4)]}级」· 产出翻倍!`); if(b.tier>=MAX_TIER) celebrate("✨", DEFS[b.type].n+" 顶级", "产出 ×"+Math.pow(2,MAX_TIER-1)); render(); reopenDept(b.type); save(true); }
function razeItem(id){ const b=findItem(id); if(!b)return; const t=b.type; S.ind=S.ind.filter(x=>x!==b); clampAssign(); toast(`拆了一处 ${DEFS[t].n}`); render(); reopenDept(t); save(true); }
// ★一键升满:从便宜的开始升,银够升多少升多少(不逐处弹庆祝,免刷屏)
function _bulkUpgrade(pool){ let n=0,spent=0;
  const next=()=>pool().filter(b=>(b.tier||1)<MAX_TIER).map(b=>({b,uc:itemUpCost(b)})).sort((a,b)=>a.uc-b.uc)[0];
  let u=next(); while(u && S.silver>=u.uc){ S.silver-=u.uc; spent+=u.uc; u.b.tier=(u.b.tier||1)+1; n++; u=next(); }
  return {n,spent};
}
function upgradeAllDept(t){ const r=_bulkUpgrade(()=>deptItems(t)); toast(r.n?`⏫ ${DEFS[t].n} 升 ${r.n} 次(花 ${r.spent} 两)`:(deptItems(t).every(b=>(b.tier||1)>=MAX_TIER)?'本类已全顶级':'银两不足,升不动')); render(); reopenDept(t); save(true); }
function upgradeAllInd(){ const r=_bulkUpgrade(()=>S.ind.filter(b=>DEFS[b.type])); toast(r.n?`⏫ 全庄升 ${r.n} 次(花 ${r.spent} 两)`:(S.ind.every(b=>!DEFS[b.type]||(b.tier||1)>=MAX_TIER)?'全庄已全顶级':'银两不足,升不动')); render(); if(typeof _curDept!=="undefined"&&_curDept)reopenDept(_curDept); save(true); }
function deptItemsList(t){   // 逐处列表:每处一行,各自改种/升级/拆
  const d=DEFS[t], items=deptItems(t); if(!items.length) return "";
  const label = d.kind==="crop" ? (d.mineral?"逐处 · 开采矿种/升级/拆":"逐处 · 改种/升级/拆") : d.kind==="animal" ? "逐处 · 改养/升级/拆" : "逐处 · 升级/拆";
  let h=`<div class="bgroup">${label} · ${items.length} 处</div><div class="itemlist">`;
  items.forEach(b=>{
    const tier=b.tier||1, maxed=tier>=MAX_TIER, uc=itemUpCost(b), tierTxt=tier>1?`${TIERNAME[Math.min(tier,4)]}级`:"一级";
    let sel="";
    if(d.kind==="crop") sel=`<select class="cropsel" onchange="setItemCrop('${b.id}',this.value)">`+d.crops.map(c=>`<option value="${c}"${b.crop===c?" selected":""}>${CROPS[c].n}</option>`).join("")+`</select>`;
    else if(d.kind==="animal") sel=`<select class="cropsel" onchange="setItemAnimal('${b.id}',this.value)">`+d.animals.map(a=>`<option value="${a}"${b.animal===a?" selected":""}>${ANIMALS[a].n}</option>`).join("")+`</select>`;
    h+=`<div class="itemrow"><span class="itemico">${d.kind==="animal"?icoImg(b.animal,d.ico):icoImg(t,d.ico)}</span>${sel}<span class="itemtier${tier>1?' hi':''}">${tierTxt}</span><button class="rbtn mini ${(maxed||S.silver<uc)?'dis':''}" ${maxed?'':`onclick="upgradeItem('${b.id}')"`}>${maxed?'顶级':`升 ${uc}两`}</button><a class="razemini" onclick="razeItem('${b.id}')">拆</a></div>`;
  });
  return h+`</div>`;
}
// 农具:消耗「农具」(铁匠铺产) + 工银 → 永久提升每名长工管田数(1800锚点:1工4块→牛+农具8-10)
const TOOL_CAP=6;   // 旱田 per 4→最高 10
function toolReq(){ const lv=S.toolLevel||0; return {tool:5+lv*4, silver:15+lv*20}; }
function equipTool(){
  if((S.toolLevel||0)>=TOOL_CAP){ toast("农具已配齐,每工管田到顶"); return; }
  const r=toolReq();
  if(G("tool")<r.tool){ toast(`需农具 ${r.tool}(现 ${Math.floor(G("tool"))})· 矿场采铁→铁匠铺打造`); return; }
  if(S.silver<r.silver){ toast(`置办农具需工银 ${r.silver} 两`); return; }
  addG("tool",-r.tool); S.silver-=r.silver; S.toolLevel=(S.toolLevel||0)+1;
  toast(`🔧 添置农具!每名长工多管 1 块田(旱田 ${DEFS.field.per+S.toolLevel}/工)`); logMsg(`🔧 添置农具,劳力效率↑(Lv${S.toolLevel})`);
  render(); reopenDept(_curDept); save(true);
}
function flashUp(){ const f=document.createElement("div"); f.className="upflash"; document.body.appendChild(f); setTimeout(()=>f.remove(),650); }
function pulseHUD(){ ["#assets","#silver","#grain"].forEach(s=>{ const e=$(s); if(e){ e.classList.remove("pulse"); void e.offsetWidth; e.classList.add("pulse"); } }); }

// ===== 城镇金融:钱庄(存银生息 + 放贷取息) =====
function bankObj(){ return S.bank||(S.bank={deposit:0,lent:0}); }
function afterFinance(){ render(); save(true); }
function bankDeposit(a){ const b=bankObj(); a=Math.min(a, Math.floor(S.silver)); if(a<=0){toast("现银不足");return;} S.silver-=a; b.deposit+=a; toast(`💰 存入钱庄 ${a} 两`); afterFinance(); }
function bankWithdraw(){ const b=bankObj(); const a=Math.floor(b.deposit); if(a<=0)return; b.deposit=0; S.silver+=a; toast(`💰 取出存款 ${a} 两`); afterFinance(); }
function bankLend(a){ const b=bankObj(); a=Math.min(a, Math.floor(S.silver)); if(a<=0){toast("现银不足");return;} S.silver-=a; b.lent+=a; toast(`📈 放贷 ${a} 两(月息${(TUNE.loanRate*100).toFixed(1)}%·有坏账风险)`); afterFinance(); }
function bankRecall(){ const b=bankObj(); const a=Math.floor(b.lent); if(a<=0)return; b.lent=0; S.silver+=a; toast(`📥 收回放贷本金 ${a} 两`); afterFinance(); }
function openBankSheet(){ if(!hasBank()){ toast("先在城里开一家钱庄(行情·铺面→开铺→钱庄)"); return; } _sheetReopen=openBankSheet;
  const b=bankObj();
  let h=`<div class="sh-head"><div><div class="sh-tt">💰 钱庄事务</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`;
  h+=`<div class="sh-note">存款 <b>${Math.round(b.deposit)}</b> 两(月息 ${(TUNE.depRate*100).toFixed(1)}%,稳)· 放贷在外 <b>${Math.round(b.lent)}</b> 两(月息 ${(TUNE.loanRate*100).toFixed(1)}%,有坏账)· 现银 ${Math.round(S.silver)}</div>`;
  h+=`<div class="sh-bgroup">存银生息(稳)</div><div class="lops">`;
  [100,1000].forEach(a=>h+=`<button class="${S.silver<a?'dis':''}" onclick="bankDeposit(${a})">存 ${a}</button>`);
  h+=`<button class="${S.silver<1?'dis':''}" onclick="bankDeposit(1e9)">全存</button><button class="${b.deposit<1?'dis':''}" onclick="bankWithdraw()">全取</button></div>`;
  h+=`<div class="sh-bgroup">放贷取息(高息 · 有坏账风险)</div><div class="lops">`;
  [100,1000].forEach(a=>h+=`<button class="${S.silver<a?'dis':''}" onclick="bankLend(${a})">放贷 ${a}</button>`);
  h+=`<button class="${b.lent<1?'dis':''}" onclick="bankRecall()">全收回</button></div>`;
  scSheet(h);
}

// ===== 城镇金融:当铺(收购奇珍异宝 + 典当余货) =====
const PAWN_PRICE = g => PRICE[g]||1;
function dangpuStock(){ if(!S.dangpuStock) S.dangpuStock=[];
  if(monthIdx()!==(S.dangpuStockMonth??-1)){ S.dangpuStockMonth=monthIdx();
    const keys=TREASURE_KEYS.slice(), n=2+Math.floor(Math.random()*2), pick=[];
    for(let i=0;i<n&&keys.length;i++) pick.push(keys.splice(Math.floor(Math.random()*keys.length),1)[0]);
    S.dangpuStock=pick.map(k=>({key:k, price:Math.round(TREASURES[k].base*(0.9+Math.random()*0.3))}));
  } return S.dangpuStock;
}
function buyTreasure(i){ const st=dangpuStock(), it=st[i]; if(!it)return;
  if(S.silver<it.price){ toast(`收购需 ${it.price} 两`); return; }
  S.silver-=it.price; S.treasures.push({key:it.key, year:yearN(), buy:it.price}); st.splice(i,1);
  const T=TREASURES[it.key]; toast(`🏯 收得「${T.n}」(身价 ${it.price} 两 · 门第+${T.pres})`); logMsg(`🏯 当铺收奇珍「${T.n}」${it.price}两`);
  render(); save(true);
}
function pawnGood(g){ const amt=Math.floor(cargoSurplus(g)); if(amt<1){ toast("没有可典当的余货"); return; }
  const got=Math.round(amt*PAWN_PRICE(g)*TUNE.pawnRate); addG(g,-amt); S.silver+=got;
  if(!S.pawns)S.pawns=[]; S.pawns.push({good:g, amt, got, start:monthIdx(), due:monthIdx()+TUNE.pawnMonths});
  toast(`🏯 典当 ${GNAME[g]}×${amt} 得急银 ${got} 两(${TUNE.pawnMonths}月内可赎)`); logMsg(`🏯 典当${GNAME[g]}×${amt}→${got}两`);
  render(); save(true);
}
function redeemPawn(i){ const pw=(S.pawns||[])[i]; if(!pw)return; const mh=Math.max(0,monthIdx()-pw.start), cost=Math.round(pw.got*(1+TUNE.pawnInt*mh));
  if(S.silver<cost){ toast(`赎回需 ${cost} 两`); return; }
  S.silver-=cost; addG(pw.good, pw.amt); S.pawns.splice(i,1);
  toast(`🏯 赎回 ${GNAME[pw.good]}×${pw.amt}(付 ${cost} 两)`); render(); save(true);
}
function openPawnSheet(){ if(!hasPawn()){ toast("先在城里开一家当铺(行情·铺面→开铺→当铺)"); return; } _sheetReopen=openPawnSheet;
  let h=`<div class="sh-head"><div><div class="sh-tt">🏯 当铺事务</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`;
  const st=dangpuStock();
  h+=`<div class="sh-bgroup">收购奇珍异宝(本月当铺所得 · 收进自家珍藏)</div>`;
  if(!st.length) h+=`<div class="hint">本月暂无奇珍</div>`;
  st.forEach((it,i)=>{ const T=TREASURES[it.key]; h+=`<div class="sh-irow">${T.ico}<span style="flex:1"><b>${T.n}</b> <small style="color:var(--mut)">${T.d} · 门第+${T.pres}</small></span><button class="iup ${S.silver<it.price?'dis':''}" onclick="buyTreasure(${i})">收 ${it.price}两 ›</button></div>`; });
  const goods=Object.keys(PRICE).filter(g=>cargoSurplus(g)>=3);
  h+=`<div class="sh-bgroup">典当余货换急银(${Math.round(TUNE.pawnRate*100)}%市价 · ${TUNE.pawnMonths}月内可赎)</div>`;
  if(!goods.length) h+=`<div class="hint">没有可典当的余货(留量之外)</div>`;
  goods.forEach(g=>{ const amt=Math.floor(cargoSurplus(g)), val=Math.round(amt*PAWN_PRICE(g)*TUNE.pawnRate); h+=`<div class="sh-irow"><span style="flex:1">${GNAME[g]} ×${amt}</span><button class="iup" onclick="pawnGood('${g}')">典当得 ${val}两 ›</button></div>`; });
  if(S.pawns&&S.pawns.length){ h+=`<div class="sh-bgroup">在当待赎(逾期死当)</div>`;
    S.pawns.forEach((pw,i)=>{ const mh=Math.max(0,monthIdx()-pw.start), cost=Math.round(pw.got*(1+TUNE.pawnInt*mh)), left=pw.due-monthIdx();
      h+=`<div class="sh-irow"><span style="flex:1">${GNAME[pw.good]} ×${pw.amt} <small style="color:var(--mut)">还${left}月</small></span><button class="iup ${S.silver<cost?'dis':''}" onclick="redeemPawn(${i})">赎回 ${cost}两 ›</button></div>`; });
  }
  h+=`<div class="sh-bgroup">　</div><button class="opt" onclick="openTreasureSheet()">🎍 进珍藏阁(陈列 / 卖出 / 雅集 / 进献) ›</button>`;
  scSheet(h);
}

// ===== 珍藏阁:陈列(门第/声望,被动)/ 增值卖出 / 雅集宴客(官面)/ 进献(奖赏) =====
function sellTreasure(i){ const t=(S.treasures||[])[i]; if(!t)return; const v=treasureVal(t), T=TREASURES[t.key];
  S.silver+=v; S.treasures.splice(i,1);
  toast(`💴 售出「${T.n}」得 ${v} 两(购入 ${t.buy||T.base},增值 ${v-(t.buy||T.base)>=0?'+':''}${v-(t.buy||T.base)})`); logMsg(`💴 售奇珍「${T.n}」${v}两`);
  render(); save(true);
}
function hostGathering(){ const cd=Math.max(0,(S.gatherDay??-999)+TUNE.gatherCD-S.day); if(cd>0){ toast(`雅集不宜频,还需 ${cd} 天`); return; }
  const n=(S.treasures||[]).length; if(n<1){ toast("先有奇珍才好办雅集"); return; }
  const cost=40; if(S.silver<cost){ toast(`办雅集需 ${cost} 两酒席`); return; }
  const fv=Math.round(6+Math.min(n,8)*2.5); S.silver-=cost; S.favor=Math.min(100,(S.favor||0)+fv); S.rep=(S.rep||0)+2; S.gatherDay=S.day;
  toast(`🎍 设雅集赏珍玩,名士云集!官面 +${fv} · 声望 +2`); logMsg(`🎍 雅集宴客,官面 +${fv}`); render(); save(true);
}
function offerTreasure(i){ const t=(S.treasures||[])[i]; if(!t)return; const T=TREASURES[t.key], v=treasureVal(t);
  const fv=Math.round(8+T.pres*0.8); S.favor=Math.min(100,(S.favor||0)+fv); S.rep=(S.rep||0)+3;
  let reward=`官面 +${fv} · 声望 +3`;
  const roll=Math.random();
  if(roll<0.45){ const silver=Math.round(v*(0.5+Math.random()*0.6)); S.silver+=silver; reward+=` · 上赏银 ${silver} 两`; }
  else if(roll<0.6){ reward+=` · 上官记名,日后好相见`; }
  S.treasures.splice(i,1);
  toast(`🎁 进献「${T.n}」:${reward}`); logMsg(`🎁 进献奇珍「${T.n}」→ ${reward}`); render(); save(true);
}
function openTreasureSheet(){ _sheetReopen=openTreasureSheet;
  const ts=S.treasures||[];
  let h=`<div class="sh-head"><div><div class="sh-tt">🎍 珍藏阁</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`;
  h+=`<div class="sh-note">藏品 ${ts.length} 件 · 陈列门第 +${treasurePrestige()} · 进献获赏/雅集宴客攒官面</div>`;
  const gcd=Math.max(0,(S.gatherDay??-999)+TUNE.gatherCD-S.day);
  h+=`<button class="opt ${(gcd>0||ts.length<1||S.silver<40)?'dis':''}" onclick="hostGathering()">🎍 设雅集赏珍·宴官 <span class="optcost">${gcd>0?gcd+'天后':'40两'}</span><small>名士云集,官面大涨 + 声望</small></button>`;
  if(!ts.length){ h+=`<div class="hint">还没有藏品 · 去当铺收购奇珍异宝</div>`; scSheet(h); return; }
  h+=`<div class="sh-bgroup">珍藏(陈列于宅院/兽苑,涨门第)</div>`;
  ts.forEach((t,i)=>{ const T=TREASURES[t.key], v=treasureVal(t); h+=`<div class="sh-irow">${T.ico}<span style="flex:1"><b>${T.n}</b> <small style="color:var(--mut)">门第+${T.pres} · 现值${v}两</small></span><button class="iup" onclick="sellTreasure(${i})">卖 ${v} ›</button><button class="iup" style="margin-left:4px" onclick="offerTreasure(${i})">进献 ›</button></div>`; });
  scSheet(h);
}

