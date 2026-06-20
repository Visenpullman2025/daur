'use strict';
// [war] v2 乱世群雄割据(后期军事层)· 真源 docs/设计-卡片P6-乱世群雄割据.md
// 增量1:解锁(富可敌国→乱世降临)+ 天下页 + 五势力 + 买城(钱出口)+ 持城月入 + 霸业阶位。
// ★军队/造械/打城/请兵/乱世威胁 在后续增量;本层全长在现有件上,改这层别碰玩法主线。
// ★所有数值=初值·可调。S.warlord 字段默认在 state.js 的 freshState(老档 load 自动补齐)。

// ===== 五大势力(5 原型槽)· 显示名/城名/乱局随 REGION 换皮(data.js 的 WAR_REGIONS),关系/军队/打城逻辑不动 · 真源 P6.6 =====
const FAC_IDS = ["guanjun","bailian","tuanlian","guolu","yanxiao"];
function curWarRegion(){ const W=(typeof WAR_REGIONS!=='undefined')?WAR_REGIONS:null; if(!W) return {fac:{},names:{},flavor:"",luan:""}; return W[(typeof REGION!=='undefined'&&REGION)||'sichuan'] || W.sichuan; }
function facInfo(id){ const f=curWarRegion().fac; return (f&&f[id]) || {n:id,ico:"⚑",desc:""}; }
// ===== 城池分档(初值·可调)tier:1寨 2县城 3州府 4省城 ; price银 inc月入 pres威望 levy征兵额 =====
const CITY_TIERS = {
  1:{n:"寨",   ico:"🏚️", price:[3000000,6000000],     inc:[6000,12000],   pres:8,  levy:200},
  2:{n:"县城", ico:"🏘️", price:[12000000,30000000],   inc:[28000,55000],  pres:20, levy:600},
  3:{n:"州府", ico:"🏛️", price:[40000000,80000000],   inc:[90000,160000], pres:45, levy:1500},
  4:{n:"省城", ico:"🏯", price:[150000000,500000000], inc:[400000,900000],pres:90, levy:4000},
};
// 版图:23 城 · id/tier/初始归属(原型)在 data.js 的 WAR_CITY_BASE,城名随 REGION 换皮;allCities()=当前省城列表
function allCities(){ const W=(typeof WAR_CITY_BASE!=='undefined')?WAR_CITY_BASE:{}; return Object.keys(W).map(cityById); }
// 霸业阶位(富可敌国之上)· 驱动:持城数 + 威望(初值·可调)
const HEGEMON = [
  {n:"乡团首领", cities:0,  fame:0},
  {n:"一方豪强", cities:1,  fame:8},
  {n:"割据诸侯", cities:4,  fame:50},
  {n:"称霸一方", cities:10, fame:140},
  {n:"问鼎之资", cities:18, fame:320},
];

// ===== 派生 =====
function warState(){ if(!S.warlord) S.warlord={on:false, offered:false, offerYear:0, cities:[]}; return S.warlord; }
function warOn(){ return !!(S.warlord && S.warlord.on); }
function ownedCities(){ return warState().cities || []; }
function cityById(id){ const b=(typeof WAR_CITY_BASE!=='undefined')?WAR_CITY_BASE[id]:null; if(!b) return null; const nm=curWarRegion().names; return {id, n:(nm&&nm[id])||id, tier:b.t, fac:b.f}; }
function cityOwned(id){ return ownedCities().some(c=>c.id===id); }
// ★城池现归属势力(支持乱世易主:S.warlord.cityFac 覆盖底表)— 真·版图动态
function cityFac(id){ const o=S.warlord&&S.warlord.cityFac&&S.warlord.cityFac[id]; if(o) return o; const c=cityById(id); return c?c.fac:null; }
// 价/产出:按 tier 档 + 用 id 派生稳定微浮动(确定式,免存档漂移)
function citySeed(id){ let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))%997; return h/997; }
function cityPrice(id){ const c=cityById(id); if(!c) return 0; const t=CITY_TIERS[c.tier], s=citySeed(id);   return Math.round((t.price[0]+(t.price[1]-t.price[0])*s)/10000)*10000; }
function cityInc(id){   const c=cityById(id); if(!c) return 0; const t=CITY_TIERS[c.tier], s=citySeed(id+"i"); return Math.round((t.inc[0]  +(t.inc[1]-t.inc[0])  *s)/100)*100; }
function cityPres(id){  const c=cityById(id); return c?CITY_TIERS[c.tier].pres:0; }
function warFameTotal(){ return ownedCities().reduce((a,c)=>a+cityPres(c.id),0) + (typeof allyFameBonus==="function"?allyFameBonus():0); }   // 持城威望 + 盟友威望(外交也推霸业)
function cityIncTotal(){ return ownedCities().reduce((a,c)=>a+Math.round(cityInc(c.id)*(1+(c.dev||0)*0.25)),0); }   // 开发→月入
function hegemonIdx(){ const n=ownedCities().length, f=warFameTotal(); let i=0;
  for(let k=0;k<HEGEMON.length;k++){ if(n>=HEGEMON[k].cities && f>=HEGEMON[k].fame) i=k; } return i; }
function hegemonName(){ return HEGEMON[hegemonIdx()].n; }

// ===== 关系系统(波A:关系驱动的活世界)真源 docs/设计-卡片P6.5 =====
// 势力↔势力立场底表(+亲 / 0中立 / −敌)· 读法:你打谁 → 谁的"敌"对你转好
const FAC_REL_DEFAULT = {
  guanjun:  {bailian:-2, tuanlian:+1, guolu:-2, yanxiao:-1},
  bailian:  {guanjun:-2, tuanlian:-2, guolu:+1, yanxiao:0},
  tuanlian: {guanjun:+1, bailian:-2, guolu:-2, yanxiao:0},
  guolu:    {guanjun:-2, bailian:+1, tuanlian:-2, yanxiao:+1},
  yanxiao:  {guanjun:-1, bailian:0,  tuanlian:0, guolu:+1},
};
function facStance(a,b){ if(a===b) return 0; const m=curWarRegion().facRel||FAC_REL_DEFAULT; return (m[a]&&m[a][b]!=null)?m[a][b]:0; }
function enemiesOf(fac){ return FAC_IDS.filter(f=>f!==fac && facStance(fac,f)<0); }   // X 的敌人
function stanceToYou(fac){ const r=warRel(fac); return r>=75?'ally':(r>=50?'neutral':(r>=35?'wary':'hostile')); }
const STANCE_TXT={ally:'🤝盟友', neutral:'中立', wary:'猜忌', hostile:'敌视'};
// 势力军力:基于它还占着的城(你打下越多 → 它越弱)− 它在乱世自相攻伐里的战损(天下大势)
function facHeldCities(fac){ return allCities().filter(c=>cityFac(c.id)===fac && !cityOwned(c.id)); }
function facLoss(fac){ return (S.warlord&&S.warlord.facLoss&&S.warlord.facLoss[fac])||0; }
function facMight(fac){ const w=facHeldCities(fac).reduce((a,c)=>a+[0,1,2.5,6,15][c.tier],0);
  return Math.max(300, Math.round((600+w*900)*facStr(fac)) - facLoss(fac)); }
// ★天下大势(endRound 季调用):势力间自相攻伐 → 败者元气受损(削 facMight)+ 真·版图易主(胜者夺败者一城)→ 活的乱世,你坐收/亦受挤压
const WORLD_EV=["大举进剿","攻破一寨","争夺要冲","合纵相攻","流窜劫掠"];
function worldTick(){
  if(!warOn() || Math.random()>=0.45) return;
  const fks=FAC_IDS, a=fks[Math.floor(Math.random()*fks.length)], foes=enemiesOf(a);
  if(!foes.length) return; const b=foes[Math.floor(Math.random()*foes.length)];
  const winner=facMight(a)>=facMight(b)?a:b, loser=winner===a?b:a;
  if(!S.warlord.facLoss) S.warlord.facLoss={};
  S.warlord.facLoss[loser]=(S.warlord.facLoss[loser]||0)+Math.round(300+Math.random()*500);
  // ★真·版图易主:胜者夺取败者一座(未被你占的)城 — 先丢小城,且至少给败者留 1 城(免某势力被清零)
  let extra='';
  const spoils=facHeldCities(loser);
  if(spoils.length>1 && Math.random()<0.5){
    const prize=spoils.slice().sort((x,y)=>x.tier-y.tier)[0];   // 寨/县先易主,州府/省城相对稳(战略图好读)
    if(!S.warlord.cityFac) S.warlord.cityFac={};
    S.warlord.cityFac[prize.id]=winner;
    if(S.warlord.facLoss[loser]>0) S.warlord.facLoss[loser]=Math.max(0,S.warlord.facLoss[loser]-200);   // 丢了城就别再重复记元气损(免双重削)
    extra=` · 攻取「${prize.n}」`;
  }
  logMsg(`📜 天下大势:${facInfo(winner).n} ${WORLD_EV[Math.floor(Math.random()*WORLD_EV.length)]},${facInfo(loser).n}元气受损${extra}`);
}
// 受招安:与官军交情≥80 → 获官身合法性(官军永盟)· 乱世的另一条路
function acceptZhaoan(){
  if(S.warlord.zhaoan){ toast("已受朝廷招安"); return; }
  if(warRel("guanjun")<80){ toast(`受招安需与官军交情≥80(现 ${warRel("guanjun")})`); return; }
  S.warlord.zhaoan=true; if(!S.warlord.allies) S.warlord.allies=[]; if(!S.warlord.allies.includes("guanjun")) S.warlord.allies.push("guanjun");
  setRel("guanjun",95); S.rep=(S.rep||0)+10;
  toast(`🎖 受朝廷招安!官身合法 · 官军永盟 · 声望+10 · 此后朝廷月发官俸、请兵更省、威望渐增`); logMsg(`🎖 受招安 · 官身合法(朝廷月俸/请兵折扣/威望)`); celebrate("🎖","受招安","朝廷命官"); render(); save(true);
}
// ★行动 → 关系(因果)· 夺城/剿匪/打官军时调用
function recordConquest(fac, tier){
  setRel(fac, warRel(fac)-([0,15,18,22,25][tier]||18));
  for(const e of enemiesOf(fac)) setRel(e, warRel(e)+8);                              // 敌人的敌人是朋友
  if(fac==="guolu"){ const reward=([0,1,2,4,8][tier]||1)*8000; S.silver+=reward; setRel("guanjun", warRel("guanjun")+12); setRel("tuanlian", warRel("tuanlian")+6);
    toast(`🎖 剿匪有功!官军嘉奖 · 赏银 ${reward.toLocaleString()} 两`); logMsg(`🎖 剿匪 · 官军嘉奖+赏银${reward}`); }
  if(fac==="guanjun"){ for(const f of FAC_IDS){ if(f!=="guanjun" && facStance("guanjun",f)>=0) setRel(f, warRel(f)-10); }
    toast(`⚠ 犯上作乱!官军号召亲附势力共讨你`); logMsg(`⚠ 攻官军 · 招致讨逆联军`); }
}

// ===== 解锁:家产达「富可敌国」→ 乱世降临(一次性;拒绝则隔年再问)=====
function warUnlockCheck(){
  const w=warState();
  if(w.on) return false;
  if(tierIdxByAssets() < TIERS.length-1) return false;             // 须达富可敌国(资产≥100万)
  if(w.offered && yearN()-(w.offerYear||0) < 1) return false;      // 拒过 → 隔一年再问
  w.offered=true; w.offerYear=yearN();
  let h=`<h2>🏴 乱世降临</h2><div class="desc" style="text-align:left">${curWarRegion().flavor}<br>你家业已<b>富可敌国</b>,庄园市集连绵、护院镖师成群——<b>是闭门守成,还是趁势而起、拥兵割据?</b></div>`;
  h+=`<button class="opt devcard" onclick="warAccept()"><b>🚩 办团练 · 拥兵自重</b><small>开「天下」页:买城争霸、霸业一方(种田照旧挂机供饷;后续可养军打城)</small></button>`;
  h+=`<button class="opt" onclick="warDecline()">🏠 闭门守成<small>暂不涉乱世(日后再问)</small></button>`;
  modal(h, true);   // 锁定模态(必须选)
  return true;
}
function warAccept(){
  warState().on=true;
  $("#modal").dataset.lock=''; closeModal();
  warRefreshTab();
  toast("🚩 拥兵自重!「天下」页已开,去逐鹿一方"); logMsg("🚩 乱世降临 · 办团练拥兵自重,开「天下」之业");
  celebrate("🏴", "乱世起兵", "霸业 · "+hegemonName());
  setView("tian");
  save(true); setSpeed(_userSpeed||1);
}
function warDecline(){
  $("#modal").dataset.lock=''; closeModal();
  toast("🏠 暂且闭门守成,静观时局");
  openSeason();   // 恢复挂机
}

// ===== 天下页(view==="tian")= 场景式:乱世大图 + 可点热点 + 底部滑出 sheet(对齐 v1)=====
function renderTianxiaScene(){
  if(!warOn()){ scExit(); const el=document.getElementById("main"); if(el) el.innerHTML=`<div class="screen"><h2>🏴 天下</h2><div class="empty">时局未乱,尚无逐鹿之机。<br>家业到「富可敌国」,乱世自会降临。</div></div>`; return; }
  const own=ownedCities().length;
  const pins=[
    {x:50,y:18,ico:"⚔️ ",name:"逐鹿天下",fn:"openConquerSheet()"},
    {x:22,y:44,ico:"🪖 ",name:"兵马",fn:"openArmySheet()"},
    {x:78,y:44,ico:"🎎 ",name:"外交",fn:"openDiploSheet()"},
    {x:72,y:72,ico:"📦 ",name:"后勤",fn:"openLogisticsSheet()"},
  ];
  if(own) pins.push({x:28,y:72,ico:"🏰 ",name:`城池·${own}`,fn:"openMyCitiesSheet()"});
  const hs=pins.map(p=>scTag({x:p.x,y:p.y,ico:p.ico,name:p.name,onclick:p.fn})).join("");
  scStage({ bg:`assets/scene/tianxia-master-p.webp?v=2606201400`, fit:true, aspect:"3 / 4",
    cap:`天下 · ${hegemonName()} · 持城 ${own} · 兵 ${warTroops().toLocaleString()}`, hotspots:hs });
}
// 各 sheet 顶部复用:霸业小结 + 标题栏
function hegemonLine(){ const idx=hegemonIdx(), cur=HEGEMON[idx], nx=HEGEMON[idx+1];
  return `<div class="desc" style="text-align:left;background:rgba(179,137,47,.1);padding:8px 10px;border-radius:8px;margin:0 0 8px">🏴 霸业 <b>${cur.n}</b> · 持城 <b>${ownedCities().length}</b> · 威望 <b>${warFameTotal()}</b> · 城池月入 <b style="color:var(--good)">${cityIncTotal().toLocaleString()}</b> 两${nx?` · 下阶「${nx.n}」须 城${nx.cities}/威望${nx.fame}`:` · 已至顶 · 问鼎之资`}</div>`; }
function warShHead(t){ return `<div class="sh-head"><div><div class="sh-tt">${t}</div></div><span class="shx" onclick="scCloseSheet()">✕</span></div>`; }

// ⚔️ 逐鹿天下:各方势力 + 可拿城池(点城选 买/打/请)
function openConquerSheet(){ _sheetReopen=openConquerSheet; scSheet(conquerHTML()); }
function conquerHTML(){
  let h=warShHead("⚔️ 逐鹿天下 <small style=\"color:var(--mut);font-weight:400\">点城选 买/打/请兵</small>")+hegemonLine();
  for(const fk of FAC_IDS){ const f=facInfo(fk), cs=allCities().filter(c=>cityFac(c.id)===fk && !cityOwned(c.id));
    if(!cs.length) continue;
    h+=`<div class="bgroup">${f.ico} ${f.n} <small style="color:var(--mut);font-weight:400">${f.desc}${isAlliedFlag(fk)?' · 🤝盟':''}</small></div><div class="bgrid">`;
    for(const c of cs.sort((a,b)=>a.tier-b.tier)){ const t=CITY_TIERS[c.tier], sg=siegingId(c.id);
      h+=`<button class="opt bcell ${sg?'cur':''}" onclick="openCityAction('${c.id}')"><b>${t.ico} ${c.n}${sg?' ⚔️':''}</b><span class="bcost">${sg?'围攻中…':`买${fmtWan(cityPrice(c.id))} · 守${cityDefense(c.id).toLocaleString()}`}</span><i class="bhave">月入${cityInc(c.id).toLocaleString()}·威+${t.pres}</i></button>`; }
    h+=`</div>`;
  }
  return h;
}
// 🪖 兵马:招兵/募将/武将
function openArmySheet(){ _sheetReopen=openArmySheet; scSheet(armyHTML()); }
function armyHTML(){
  let h=warShHead("🪖 兵马")+hegemonLine();
  h+=`<div class="desc" style="text-align:left;margin:0 0 6px">总兵 <b>${warTroops().toLocaleString()}</b>/兵源 ${levyCap().toLocaleString()} · 可调野战 <b style="color:var(--good)">${availTroops().toLocaleString()}</b>${committedTroops()>0?` · 围攻中 <b>${committedTroops().toLocaleString()}</b>`:''} · 野战战力 <b>${armyPower().toLocaleString()}</b><br>训练 <b>${Math.round(trainLevel()*100)}%</b>${drillLevel()?`(训练场${drillLevel()}级)`:''} · 武器 ${Math.round(weaponRatio()*100)}%${armorRatio()>0?` · 甲${Math.round(armorRatio()*100)}%`:''} · 骑兵 ${Math.round(horseRatio()*100)}% · 武将 ${warGenerals().length}/6</div>`;
  if(warCampaigns().length){
    h+=`<div class="bgroup">⚔️ 正在围攻</div>`;
    for(const cp of warCampaigns()){ const c=cityById(cp.cityId); if(!c) continue; const pct=Math.round((1-cp.daysLeft/cp.total)*100);
      h+=`<div class="desc" style="text-align:left;margin:2px 0"><b>${CITY_TIERS[c.tier].ico} ${c.n}</b> · ${cp.troops.toLocaleString()}兵 · 还 ${(cp.daysLeft/30).toFixed(1)} 月<div style="height:6px;background:rgba(0,0,0,.1);border-radius:3px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${pct}%;background:var(--bad)"></div></div></div>`; }
  }
  h+=`<div class="bgroup">扩军 <small style="color:var(--mut);font-weight:400">募的是新兵(×0.5),操练成精兵(×1.0)</small></div>`;
  h+=`<div class="bgrid"><button class="opt bcell ${warTroops()<levyCap()?'':'dis'}" onclick="recruitTroops()"><b>🪖 招兵</b><span class="bcost">${warTroops()<levyCap()?`100兵 银${Math.round(100*recruitCostPer()).toLocaleString()}+粮50`:'兵源已尽·开发城池'}</span></button><button class="opt bcell" onclick="recruitGeneral()"><b>🎖 募将</b><span class="bcost">${fmtWan(Math.round(800*(1+warGenerals().length*0.6)))}两</span></button></div>`;
  h+=`<div class="bgroup">军备 · 训练 <small style="color:var(--mut);font-weight:400">无武器=民兵×0.6;马→骑兵×1.4</small></div>`;
  h+=`<div class="bgrid"><button class="opt bcell" onclick="forgeWeapons()"><b>🔨 军坊造械</b><span class="bcost">铁→兵器(装备全军)</span></button><button class="opt bcell" onclick="buyHorses()"><b>🐴 买马</b><span class="bcost">100匹 1200两</span></button><button class="opt bcell" onclick="buildDrill()"><b>🎯 ${drillLevel()?'升':'修'}训练场</b><span class="bcost">${fmtWan(Math.round(30000*Math.pow(2.2,drillLevel())))}两</span></button></div>`;
  if(warGenerals().length) h+=`<div class="desc" style="text-align:left;margin:4px 0">${warGenerals().map(g=>`<span class="buffchip">🎖${g.name} 武${g.wu}统${g.tong}智${g.zhi}</span>`).join(" ")} <small style="color:var(--mut)">名将+${Math.round(genBonus()*100)}%</small></div>`;
  h+=`<div class="hint">战力 = 兵 × 装备(武器/骑兵)× 训练 × 武将 × 粮草。出征要备军粮(远征更多)。开发城池涨人口 → 提兵源。v1 出钢/皮/马后军队更强。</div>`;
  return h;
}
// 🎎 外交:贿赂/联姻/结盟
function openDiploSheet(){ _sheetReopen=openDiploSheet; scSheet(diploHTML()); }
function diploHTML(){
  let h=warShHead("🎎 外交")+`<div class="desc" style="text-align:left;margin:0 0 8px">交情定姿态:盟≥75 / 中立 / 猜忌 / 敌视&lt;35。<b style="color:var(--bad)">敌视</b>者趁你主力出征在外时偷袭;数家敌视且互不为敌 → 联手来犯。<b>打谁 → 谁的敌对你转好</b>;结盟免其来犯。</div>`;
  if(S.warlord&&S.warlord.zhaoan) h+=`<div class="desc" style="text-align:left;margin:0 0 8px;color:var(--good)">🎖 已受朝廷招安 · 官身合法 · 官军永为盟</div>`;
  else if(warRel("guanjun")>=80) h+=`<button class="opt devcard" onclick="acceptZhaoan()"><b>🎖 受朝廷招安</b><small>官军交情已≥80 · 官身合法 + 朝廷月俸 + 请兵更省 + 威望(乱世的另一条路)</small></button>`;
  { const nAlly=allyList().length; if(nAlly>0) h+=`<div class="desc" style="text-align:left;margin:0 0 8px;background:rgba(70,140,70,.12);border:1px solid var(--good);border-radius:8px;padding:7px 9px;color:var(--good)">🤝 <b>盟友 ${nAlly} 家</b>,实惠:① 请兵代打 <b>−${Math.round(allyHireDiscount()*100)}%</b> ② 互市/官俸月入 <b>+${allyMonthly().toLocaleString()}两</b> ③ 威望 <b>+${allyFameBonus()}</b>(助霸业) ④ 互不相犯 + 遇袭出兵助战</div>`; }
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">`;
  for(const fk of FAC_IDS){ const f=facInfo(fk), rel=warRel(fk), st=stanceToYou(fk), ally=isAlliedFlag(fk);
    const col=rel>=75?'var(--good)':(rel<35?'var(--bad)':'#b3892f'), stcol=st==='hostile'?'var(--bad)':(st==='ally'?'var(--good)':'var(--ink)');
    const foes=enemiesOf(fk).map(e=>facInfo(e).n.slice(0,2)).join("·");
    h+=`<div style="background:rgba(179,137,47,.08);border:1px solid rgba(179,137,47,.22);border-radius:10px;padding:8px 9px">`+
       `<div style="font-weight:600;font-size:.95em">${f.ico} ${f.n} <b style="color:${stcol};font-size:.88em">${STANCE_TXT[st]}</b></div>`+
       `<div style="height:6px;background:rgba(0,0,0,.1);border-radius:3px;overflow:hidden;margin:5px 0 3px"><div style="height:100%;width:${rel}%;background:${col}"></div></div>`+
       `<div style="font-size:.77em;color:var(--mut);margin-bottom:6px">交情 ${rel}${foes?` · 与 ${foes} 为敌`:''}</div>`+
       `<div style="display:flex;gap:4px;flex-wrap:wrap"><button class="topt" onclick="bribeFaction('${fk}')">🎁贿赂</button><button class="topt" onclick="marryFaction('${fk}')">💞联姻</button><button class="topt" onclick="tradeFaction('${fk}')">💰通商</button>${ally?'':`<button class="topt ${rel>=75?'':'dis'}" onclick="allyFaction('${fk}')">🤝结盟</button>`}</div>`+
       `</div>`;
  }
  return h+`</div>`;
}
// 与势力通商(波A最简版):卖粮草→银(战时溢价)+交情。军械资敌等留波B/C
function tradeFaction(fac){
  const have=G("grain"); if(have<200){ toast("通商需库存粮 ≥200 石"); return; }
  const qty=Math.min(have,1000), atWar=FAC_IDS.some(f=>stanceToYou(f)==='hostile');
  const gain=Math.round(qty*(PRICE.grain||2)*(atWar?1.6:1.2));
  addG("grain",-qty); S.silver+=gain; setRel(fac, warRel(fac)+2);
  toast(`💰 通商:卖 ${qty} 粮草予${facInfo(fac).n},得 ${gain.toLocaleString()}两 · 交情+2`); logMsg(`💰 通商 ${facInfo(fac).n}·粮${qty}→${gain}两`);
  render(); save(true);
}
// 🏰 我的城池:卖城套现
function openMyCitiesSheet(){ _sheetReopen=openMyCitiesSheet; scSheet(myCitiesHTML()); }
function myCitiesHTML(){
  let h=warShHead("🏰 我的城池")+hegemonLine();
  if(!ownedCities().length) return h+`<div class="empty">尚无城池 · 去「逐鹿天下」买/打/请兵拿城。</div>`;
  h+=`<div class="bgroup">开发城池 → 涨人口 → 提兵源+月入 <small style="color:var(--mut);font-weight:400">点🏗开发 / 点✕卖城</small></div>`;
  for(const oc of ownedCities()){ const c=cityById(oc.id); if(!c) continue; const t=CITY_TIERS[c.tier], dev=oc.dev||0, top=dev>=5;
    const dcost=Math.round((t.levy*200)*Math.pow(1.8,dev));
    h+=`<div class="diprow" style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid rgba(179,137,47,.12)">`+
       `<span style="flex:1"><b>${t.ico} ${c.n}</b> · 开发 ${dev}/5 · 兵源+${cityManpower(oc)} · 月入${Math.round(cityInc(c.id)*(1+dev*0.25)).toLocaleString()}</span>`+
       `<button class="topt ${top||S.silver<dcost?'dis':''}" onclick="develCity('${c.id}')">🏗${top?'满':fmtWan(dcost)}</button>`+
       `<button class="topt" onclick="sellCity('${c.id}')" style="color:var(--bad)">✕卖</button></div>`;
  }
  return h;
}
function fmtWan(n){ return n>=100000000 ? (n/100000000).toFixed(2).replace(/\.?0+$/,'')+"亿" : Math.round(n/10000).toLocaleString()+"万"; }

// ===== 军队(增量2:招兵/募将;维护见 warMonthly)=====
function warTroops(){ return (S.warlord&&S.warlord.troops)||0; }                 // 总兵力
function warGenerals(){ return (S.warlord&&S.warlord.generals)||[]; }
function warCampaigns(){ return (S.warlord&&S.warlord.campaigns)||[]; }            // 在围攻的战役
function committedTroops(){ return warCampaigns().reduce((a,c)=>a+(c.troops||0),0); }
function availTroops(){ return Math.max(0, warTroops()-committedTroops()); }       // 可调遣野战兵(扣掉在围攻的)
function bestGeneral(){ const gs=warGenerals(); if(!gs.length) return null; return gs.slice().sort((a,b)=>(b.wu+b.tong)-(a.wu+a.tong))[0]; }
function genBonus(){ const g=bestGeneral(); return g?Math.min(0.40,(g.wu+g.tong)/100):0; }   // ★武将加成封顶 +40%
// ===== 军备(波B):武器(无→民兵×0.6)· 甲(减伤)· 马(骑兵×1.4)· 存 S.goods,v1料/v2军坊/买马补 =====
function weaponRatio(){ const t=warTroops(); return t>0?Math.min(1, (G("weapon")||0)/t):0; }
function armorRatio(){  const t=warTroops(); return t>0?Math.min(1, ((G("armor")||0)+(G("leather")||0))/t):0; }   // 接 v1 皮革→甲减伤
function horseRatio(){  const t=warTroops(); return t>0?Math.min(0.5,(G("horse") ||0)/t):0; }
function trainLevel(){ const v=S.warlord&&S.warlord.trainLevel; return v!=null?v:1; }    // 老档无字段=已练好(不削老档)
function drillLevel(){ return (S.warlord&&S.warlord.drill)||0; }
// ★战力 = 兵 ×(0.6+0.4武器率)×(1+0.4骑兵率) ×(0.5+0.5训练) ×(1+武将加成)
function forcePower(n){ if(!n) return 0; return Math.round(n*(0.6+0.4*weaponRatio())*(1+0.4*horseRatio())*(0.5+0.5*trainLevel())*(1+genBonus())); }
function armyPower(){ return forcePower(availTroops()); }
// ===== 兵源(波B):治下人口 = 基础 + 各城(随开发涨)→ 募兵额(★治"无限狂招") =====
function cityDev(c){ return (c.dev||0); }
function cityManpower(c){ const cc=cityById(c.id); return cc?Math.round(CITY_TIERS[cc.tier].levy*(1+cityDev(c)*0.4)):0; }
function manpower(){ return 400 + ownedCities().reduce((a,c)=>a+cityManpower(c),0); }
function levyCap(){ return manpower(); }
function recruitCostPer(){ return 3*(1+warTroops()/6000); }
function recruitTroops(){
  const cap=levyCap(), room=cap-warTroops(); if(room<=0){ toast(`兵源已尽 ${cap.toLocaleString()}(开发城池/占城 涨人口提兵源)`); return; }
  const n=Math.min(room, 100), costS=Math.round(n*recruitCostPer()), costG=Math.ceil(n*0.5);
  if(S.silver<costS){ toast(`募 ${n} 兵需 ${costS.toLocaleString()} 两`); return; }
  if(G("grain")<costG){ toast(`募 ${n} 兵需粮 ${costG} 石`); return; }
  S.silver-=costS; addG("grain",-costG);
  const t0=warTroops(); S.warlord.trainLevel=(t0*trainLevel()+n*0.3)/(t0+n);             // 新兵稀释训练度(新兵×0.3)
  S.warlord.troops=t0+n;
  toast(`🪖 招募 ${n} 新兵 · 现 ${warTroops().toLocaleString()} 兵(训练度 ${Math.round(trainLevel()*100)}%)`); logMsg(`🪖 招${n}新兵`);
  render(); save(true);
}
// 军备:🔨 军坊(铁→武器)· 🐴 买马(银→马)· 🎯 修训练场(银→训练场级,加速练兵)
function forgeWeapons(){
  const need=Math.max(0, warTroops()-(G("weapon")||0)); if(need<=0){ toast("武器已足装备全军"); return; }
  const n=Math.min(need,200), useSteel=(G("steel")||0)>=Math.ceil(n*0.5);   // ★有钢优先(精炼·省一半料)
  const mat=useSteel?"steel":"iron", matN=Math.ceil(n*(useSteel?0.5:0.8)), cost=n*4;
  if(G(mat)<matN){ toast(`造 ${n} 件兵器需${useSteel?'钢':'铁'} ${matN}(v1 钢坊出钢更省料)`); return; }
  if(S.silver<cost){ toast(`造 ${n} 件兵器需银 ${cost}`); return; }
  addG(mat,-matN); S.silver-=cost; addG("weapon", n);
  toast(`🔨 军坊打造 ${n} 件兵器(${useSteel?'钢':'铁'}-${matN}·银-${cost})· 武器覆盖 ${Math.round(weaponRatio()*100)}%`); logMsg(`🔨 造兵器${n}(${useSteel?'钢':'铁'})`); render(); save(true);
}
function buyHorses(){
  const n=100, cost=n*12;   // 马贵:12两/匹(v1马场后更便宜)
  if(S.silver<cost){ toast(`买 ${n} 匹马需 ${cost.toLocaleString()} 两`); return; }
  S.silver-=cost; addG("horse", n);
  toast(`🐴 购入 ${n} 匹马 · 骑兵覆盖 ${Math.round(horseRatio()*100)}%(骑兵战力 ×1.4)`); logMsg(`🐴 买马${n}`); render(); save(true);
}
function buildDrill(){
  const lv=drillLevel(); if(lv>=4){ toast("训练场已至顶级(练兵最快)"); return; }
  const cost=Math.round(30000*Math.pow(2.2,lv));
  if(S.silver<cost){ toast(`修/升训练场需 ${fmtWan(cost)}两`); return; }
  S.silver-=cost; S.warlord.drill=lv+1;
  toast(`🎯 训练场升至 ${lv+1} 级 · 练兵更快`); logMsg(`🎯 训练场→${lv+1}级`); render(); save(true);
}
function recruitGeneral(){
  if(warGenerals().length>=6){ toast("麾下武将已满 6 员"); return; }
  const cost=Math.round(800*(1+warGenerals().length*0.6));                          // 将越多越贵(稀缺)
  if(S.silver<cost){ toast(`募将需 ${fmtWan(cost)}两(将越多越贵)`); return; }
  S.silver-=cost;
  const g={id:++_id, name:randName("男"), wu:8+Math.floor(Math.random()*10), tong:8+Math.floor(Math.random()*10), zhi:6+Math.floor(Math.random()*10)};
  if(!S.warlord.generals) S.warlord.generals=[]; S.warlord.generals.push(g);
  toast(`🎖 ${g.name} 来投!武${g.wu}/统${g.tong}/智${g.zhi}`); logMsg(`🎖 募武将 ${g.name}`);
  render(); save(true);
}
const FAC_STR_DEFAULT={guanjun:1.6, bailian:1.05, tuanlian:0.85, guolu:0.6, yanxiao:0.95};
function facStr(id){ const s=curWarRegion().facStr||FAC_STR_DEFAULT; return s[id]||1; }   // 势力强弱(各省可调,缺省回落川蜀)
// 守军 = 城档 × 势力实力(该势力还占越多城越硬;你打弱它→城防降)· 不再"随你兵力"硬涨(撤掉粗暴scaling)
function cityDefense(id){ const c=cityById(id); if(!c) return 0; const base=[0,800,2500,7000,20000][c.tier]||0, fac=cityFac(id);
  return Math.round(base*facStr(fac)*(1+facHeldCities(fac).length*0.04)); }

// ===== 拿城三路:买(稳·贵)/ 打(★限时战役·占兵)/ 请兵(代打·中价)=====
const SIEGE_DAYS=[0,30,75,150,260];   // 寨~1月 县~2.5月 州~5月 省~8.5月(★治"点点点")
function addCity(id){ if(!S.warlord.cities) S.warlord.cities=[]; if(!cityOwned(id)) S.warlord.cities.push({id, since:S.day}); }
function siegingId(id){ return warCampaigns().some(cp=>cp.cityId===id); }
function openCityAction(id){
  const c=cityById(id); if(!c||cityOwned(id)) return;
  const t=CITY_TIERS[c.tier], price=cityPrice(id), hire=siegeHireCost(id), def=cityDefense(id), avail=availTroops();
  let h=`<h2>${t.ico} ${c.n}</h2><div class="desc" style="text-align:left">${facInfo(cityFac(id)).ico} ${facInfo(cityFac(id)).n} · ${t.n} · 月入 ${cityInc(id).toLocaleString()}两 · 威望+${t.pres}<br>守军战力 <b>${def.toLocaleString()}</b> · 可调野战兵 <b>${avail.toLocaleString()}</b>(战力 ${forcePower(avail).toLocaleString()})<br>攻城约 <b>${(SIEGE_DAYS[c.tier]/30).toFixed(1)} 月</b>,此间出征兵被占</div>`;
  h+=`<button class="opt devcard ${S.silver>=price?'':'dis'}" onclick="buyCity('${id}');closeModal()"><b>💰 买下</b><small>${fmtWan(price)}两 · 稳妥即得</small></button>`;
  if(siegingId(id)) h+=`<div class="opt cur">⚔️ 正在围攻中…</div>`;
  else h+=`<button class="opt devcard ${avail>0?'':'dis'}" onclick="${avail>0?`startSiege('${id}')`:''}"><b>⚔️ 出兵攻城(限时)</b><small>${avail>0?`派 ${avail.toLocaleString()} 野战兵围攻 ${(SIEGE_DAYS[c.tier]/30).toFixed(1)} 月 · 攻下才得城`:'无可调野战兵(先招兵 / 等别处围攻结束)'}</small></button>`;
  h+=`<button class="opt devcard ${S.silver>=hire?'':'dis'}" onclick="hireSiege('${id}')"><b>🤝 请兵代打</b><small>${fmtWan(hire)}两 · 雇强兵代打(不占自家兵·约8成成)</small></button>`;
  modal(h);
}
function startSiege(id){
  const c=cityById(id); if(!c||cityOwned(id)||siegingId(id)) return;
  const n=availTroops(); if(n<=0){ toast("无可调野战兵(在围攻的兵被占,先招兵或等其结束)"); return; }
  const prov=Math.round(n*SIEGE_DAYS[c.tier]/30*0.3);   // ★出征备粮(兵多/越远越多)
  if(G("grain")<prov){ toast(`远征「${c.n}」需备军粮 ${prov.toLocaleString()} 石(现 ${Math.floor(G("grain")).toLocaleString()})· 越远耗越多`); return; }
  addG("grain",-prov);
  if(!S.warlord.campaigns) S.warlord.campaigns=[];
  S.warlord.campaigns.push({cityId:id, troops:n, daysLeft:SIEGE_DAYS[c.tier], total:SIEGE_DAYS[c.tier]});
  $("#modal").dataset.lock=''; closeModal();
  toast(`⚔️ 起兵 ${n.toLocaleString()} 围攻「${c.n}」· 约 ${(SIEGE_DAYS[c.tier]/30).toFixed(1)} 月 · 耗军粮 ${prov.toLocaleString()} 石`); logMsg(`⚔️ 出兵${n}围攻「${c.n}」·备粮${prov}`);
  render(); save(true);
}
// 城市开发 → 涨人口 → 提兵源 + 月入(波B·老板加)
function develCity(id){
  const oc=ownedCities().find(c=>c.id===id); if(!oc) return; const c=cityById(id), t=CITY_TIERS[c.tier];
  if((oc.dev||0)>=5){ toast(`「${c.n}」已开发到顶`); return; }
  const cost=Math.round((t.levy*200)*Math.pow(1.8,oc.dev||0));   // 逐级涨
  if(S.silver<cost){ toast(`开发「${c.n}」需 ${fmtWan(cost)}两`); return; }
  S.silver-=cost; oc.dev=(oc.dev||0)+1;
  toast(`🏗 开发「${c.n}」→ ${oc.dev}级 · 人口涨、兵源 +${Math.round(t.levy*0.4)}、月入提`); logMsg(`🏗 开发「${c.n}」→${oc.dev}级`); render(); save(true);
}
function buyCity(id){
  if(cityOwned(id)) return; const c=cityById(id); if(!c) return; const price=cityPrice(id);
  if(S.silver<price){ toast(`银两不够:购「${c.n}」需 ${fmtWan(price)}两(现 ${fmtWan(S.silver)})`); return; }
  S.silver-=price; const fac=cityFac(id); addCity(id); setRel(fac, warRel(fac)+2); const t=CITY_TIERS[c.tier];   // 买=和平交易,卖方略增交情
  toast(`🏰 重金购得「${t.ico}${c.n}」!月入+${cityInc(id).toLocaleString()}两 · 威望+${t.pres}`); logMsg(`🏰 购城「${c.n}」(${fmtWan(price)}两)· 霸业:${hegemonName()}`);
  celebrate("🏰", c.n+" 入手", "霸业 · "+hegemonName()); render(); save(true);
}
function siegeHireCost(id){ return Math.round(cityPrice(id)*0.65*(1-(typeof allyHireDiscount==="function"?allyHireDiscount():0))); }   // 请兵价(盟友越多越省,盟友借强兵)
function hireSiege(id){
  if(cityOwned(id)) return; const c=cityById(id); if(!c) return; const cost=siegeHireCost(id);
  if(S.silver<cost){ toast(`请兵代打「${c.n}」需 ${fmtWan(cost)}两`); return; }
  S.silver-=cost; $("#modal").dataset.lock=''; closeModal();
  if(Math.random()<0.82){ const fac=cityFac(id); addCity(id); recordConquest(fac, c.tier); toast(`🤝 重金请兵,夺得「${c.n}」!(-${fmtWan(cost)}两)`); logMsg(`🤝 请兵代打取「${c.n}」(${fmtWan(cost)}两)· 霸业:${hegemonName()}`); celebrate("🤝","请兵取"+c.n,"霸业 · "+hegemonName()); }
  else { const refund=Math.round(cost*0.4); S.silver+=refund; toast(`💥 雇的兵败了,「${c.n}」未下(退残款 ${fmtWan(refund)}两)`); logMsg(`💥 请兵代打「${c.n}」失利`); }
  render(); save(true);
}
// 兵被逃/折损后:修正在围攻的兵不超总兵(兵打光则撤围)
function clampCampaigns(){
  let over=committedTroops()-warTroops(); if(over<=0) return;
  for(const cp of warCampaigns()){ if(over<=0)break; const cut=Math.min(cp.troops,over); cp.troops-=cut; over-=cut; }
  if(S.warlord) S.warlord.campaigns=warCampaigns().filter(cp=>cp.troops>0);
}
// ★战役推进(step 每日调用):工期满 → 结算(胜得城/败撤兵,均折兵)
function warCampaignTick(){
  if(!warOn()) return;
  clampCampaigns();   // 先修兵账目(逃兵/折损可能让围攻兵超总兵)
  const cps=warCampaigns(); if(!cps.length) return;
  let changed=false;
  for(const cp of cps.slice()){ cp.daysLeft--; if(cp.daysLeft<=0){ resolveSiege(cp); changed=true; } }
  if(changed){ render(); save(true); }
}
function resolveSiege(cp){
  S.warlord.campaigns=warCampaigns().filter(x=>x!==cp);
  const c=cityById(cp.cityId); if(!c||cityOwned(cp.cityId)) return;
  const g=bestGeneral(), fac=cityFac(cp.cityId), fn=fac?facInfo(fac).n:"守军";
  const mine=forcePower(cp.troops), def=cityDefense(cp.cityId);
  const roll=(mine/Math.max(1,def))*(0.82+Math.random()*0.36), win=roll>=1;
  const lossRate=(win?Math.min(0.5,0.12+def/Math.max(1,mine)*0.3):Math.min(0.72,0.4+def/Math.max(1,mine)*0.25))*(1-0.3*armorRatio());   // 甲减伤
  const loss=Math.round(cp.troops*lossRate);
  S.warlord.troops=Math.max(0,warTroops()-loss);
  const lead=g?`${g.name}率`:'我军';   // 战报:主将 + 兵力 + 守军 + 折损(细化)
  if(win){ addCity(cp.cityId); recordConquest(fac, c.tier);
    toast(`🏰 ${lead} ${cp.troops.toLocaleString()} 众克「${c.n}」!破${fn}守军 ${def.toLocaleString()},折兵 ${loss.toLocaleString()}`);
    logMsg(`⚔️ 战报·克「${c.n}」:${lead}${cp.troops.toLocaleString()}兵(战力${mine.toLocaleString()})破${fn}守军${def.toLocaleString()},折损${loss.toLocaleString()} → 霸业:${hegemonName()}`);
    celebrate("⚔️","克"+c.n,"霸业 · "+hegemonName()); }
  else { toast(`💥 ${lead}攻「${c.n}」受挫!${fn}守军${def.toLocaleString()}据城死守,折兵 ${loss.toLocaleString()},余 ${availTroops().toLocaleString()} 撤回`);
    logMsg(`💥 战报·攻「${c.n}」失利:${lead}${cp.troops.toLocaleString()}兵(战力${mine.toLocaleString()})未破${fn}守军${def.toLocaleString()},折损${loss.toLocaleString()}`); }
}

// ===== 月结(monthSettle 调用):持城月入 − 军饷 + 军粮/欠饷缺粮逃兵。返回 {inc:银净额, note} =====
const TROOP_PAY=0.3, TROOP_FOOD=0.2;   // 每兵 月饷0.3两 + 月军粮0.2石(初值·可调)
function warMonthly(){
  if(!warOn()) return null;
  const parts=[]; let silverNet=0;
  const cinc=cityIncTotal(); if(cinc>0){ silverNet+=cinc; parts.push(`城池+${cinc.toLocaleString()}`); }
  const am=(typeof allyMonthly==="function")?allyMonthly():0; if(am>0){ silverNet+=am; parts.push(`盟友互市/官俸+${am.toLocaleString()}`); }   // ★盟友月入(朝廷俸禄+互市)
  const t=warTroops();
  if(t>0){
    const pay=Math.round(t*TROOP_PAY), food=Math.round(t*TROOP_FOOD);
    if(S.silver+cinc >= pay){ silverNet-=pay; parts.push(`军饷-${pay}`); }       // 发得出饷
    else { const flee=Math.round(t*0.2); S.warlord.troops=Math.max(0,t-flee); silverNet-=Math.max(0,S.silver+cinc); parts.push(`⚠欠饷逃兵${flee}`); }
    const food2=Math.round(warTroops()*TROOP_FOOD);
    if(G("grain")>=food2){ addG("grain",-food2); if(food2)parts.push(`军粮-${food2}石`); }   // 军粮从粮仓扣
    else { const flee=Math.round(warTroops()*0.15); if(flee){ S.warlord.troops=Math.max(0,warTroops()-flee); parts.push(`⚠缺粮逃兵${flee}`); } }
    clampCampaigns();   // 逃兵后修兵账目
    if(S.warlord.trainLevel!=null && S.warlord.trainLevel<1) S.warlord.trainLevel=Math.min(1, trainLevel()+0.04+0.05*drillLevel());   // ★月练兵(训练场加速)
  }
  return parts.length ? {inc:silverNet, note:' '+parts.join(' ')} : null;
}

// ===== v1 浓缩(老板:天下阶段把v1当后勤,别再手忙脚乱派工)=====
// ★自动派工:乱世阶段每月把"空闲"长工补进未满员产业 — 先满"必产"田/畜/矿/林,再补"有料"作坊(免空养浪费工钱);只填空闲、不动玩家已派工
const RAW_DEPT={field:1,paddy:1,barn:1,mine:1,stable:1,forest:1};
function warAutoLabor(){
  if(!warOn() || freeW()<=0) return;
  const types=Object.keys(DEFS).filter(t=>DEFS[t].worker>0 && deptItems(t).length);
  for(const pass of [1,2]){                          // pass1=必产原料 / pass2=有料作坊
    for(const t of types){
      if(freeW()<=0) return;
      const isRaw=!!RAW_DEPT[t]; if(pass===1!==isRaw) continue;
      const d=DEFS[t];
      if(pass===2){ const inK=d.in; if(inK && G(inK)<(d.inAmt||1)) continue;   // 作坊:无原料不派(免空耗工钱)
        if(d.in2 && G(d.in2)<(d.inAmt2||1)) continue; }
      const need=Math.ceil(deptItems(t).length/farmPer(t));
      while((S.assign[t]||0)<need && freeW()>0) S.assign[t]=(S.assign[t]||0)+1;
    }
  }
}
function warAutoLaborManual(){ const before=freeW(); warAutoLabor(); const used=before-freeW();
  toast(used>0?`⚙ 自动派工:${used} 名空闲长工已补入产业`:'无空闲长工可派(或产业已满员/作坊缺料)'); render(); if(_sheetReopen===openLogisticsSheet) scSheet(logisticsHTML()); save(true); }

// ===== 📦 后勤概览:天下页看 v1 家底/产能/军需,不必切回去 =====
function openLogisticsSheet(){ _sheetReopen=openLogisticsSheet; scSheet(logisticsHTML()); }
function logisticsHTML(){
  let h=warShHead("📦 后勤概览 <small style=\"color:var(--mut);font-weight:400\">乱世根基 · v1 供饷</small>");
  const grainTrade=Math.floor(G("grain")), grainHome=Math.floor((S.home&&S.home.grain)||0);
  const t=warTroops(), pay=Math.round(t*TROOP_PAY), foodM=Math.round(t*TROOP_FOOD), eatM=(S.workers*0.22+famEat());
  const indN=S.ind.length, wkN=S.ind.filter(b=>DEFS[b.type]&&DEFS[b.type].worker>0).length;
  h+=`<div class="bgroup">家底</div>`;
  h+=`<div class="desc" style="text-align:left;margin:0 0 6px">💰 现银 <b>${fmtWan(S.silver)}</b> · 家产 <b>${fmtWan(assets())}</b><br>🌾 粮:院子 <b>${grainHome}</b> 石(口粮)· 可交易 <b>${grainTrade}</b> 石<br>👥 长工 空闲 <b style="color:${freeW()>0?'var(--bad)':'var(--mut)'}">${freeW()}</b> / 在用 ${assignedTotal()} / 上限 ${workerCap()}</div>`;
  h+=`<div class="bgroup">月度收支(估)</div>`;
  h+=`<div class="desc" style="text-align:left;margin:0 0 6px">城池月入 <b style="color:var(--good)">+${cityIncTotal().toLocaleString()}</b> · 军饷 <b style="color:var(--bad)">-${pay.toLocaleString()}</b><br>口粮 -${eatM.toFixed(1)} 石/月 · 军粮 <b style="color:var(--bad)">-${foodM.toLocaleString()}</b> 石/月<br><small style="color:var(--mut)">兵 ${t.toLocaleString()} · 产业 ${indN} 座(作坊 ${wkN})</small></div>`;
  h+=`<div class="bgrid"><button class="opt bcell ${freeW()>0?'':'dis'}" onclick="warAutoLaborManual()"><b>⚙ 一键派工</b><span class="bcost">${freeW()>0?`补 ${freeW()} 闲工入产业`:'无空闲'}</span></button><button class="opt bcell" onclick="setView('farm');scCloseSheet()"><b>🏭 去产业页</b><span class="bcost">细管 v1 生产</span></button></div>`;
  h+=`<div class="hint">乱世阶段每月自动把空闲长工补进产业(先田畜矿林、再有料作坊),你专心逐鹿天下。粮草=军粮命脉,缺粮逃兵;城池月入与种田卖货一起供饷。</div>`;
  return h;
}

// ===== 底栏「天下」tab:解锁后才显示 =====
function warRefreshTab(){ const b=document.getElementById("tab-tian"); if(b) b.style.display = warOn() ? "" : "none"; }

function removeCity(id){ if(S.warlord&&S.warlord.cities) S.warlord.cities=S.warlord.cities.filter(c=>c.id!==id); }

// ===== 外交(增量3:贿赂/结盟/联姻)交情 0~100,默认 50 =====
function warRel(fac){ const r=(S.warlord&&S.warlord.relations)||{}; return r[fac]!=null?r[fac]:50; }
function setRel(fac,v){ if(!S.warlord.relations) S.warlord.relations={}; S.warlord.relations[fac]=Math.max(0,Math.min(100,Math.round(v))); }
function isAllied(fac){ return warRel(fac)>=75; }
function bribeFaction(fac){
  const cost=Math.round(300000*(1+warRel(fac)/60));   // 越熟越贵(初值·可调)
  if(S.silver<cost){ toast(`打点${facInfo(fac).n}需 ${fmtWan(cost)}两`); return; }
  S.silver-=cost; setRel(fac, warRel(fac)+10);
  toast(`🎁 重金打点${facInfo(fac).n},交情 +10(现 ${warRel(fac)})`); logMsg(`🎁 贿赂${facInfo(fac).n}(${fmtWan(cost)}两)· 交情→${warRel(fac)}`);
  render(); save(true);
}
function allyFaction(fac){
  if(warRel(fac)<75){ toast(`交情不足(须≥75,现 ${warRel(fac)})· 先贿赂/联姻`); return; }
  if(isAlliedFlag(fac)){ toast(`已与${facInfo(fac).n}结盟`); return; }
  if(!S.warlord.allies) S.warlord.allies=[]; S.warlord.allies.push(fac); setRel(fac,90);
  toast(`🤝 与${facInfo(fac).n}结盟!互不相犯 · 互市月入 · 请兵更省 · 威望+15`); logMsg(`🤝 与${facInfo(fac).n}结盟(互市/助战/请兵折扣/威望)`);
  render(); save(true);
}
function isAlliedFlag(fac){ return !!(S.warlord&&S.warlord.allies&&S.warlord.allies.includes(fac)); }
// ★结盟的实惠(治"结盟没用"):请兵打折 + 朝廷俸禄/盟友互市月入 + 抬威望(助霸业)
function allyList(){ return (S.warlord&&S.warlord.allies)||[]; }
function allyHireDiscount(){ return Math.min(0.5, allyList().length*0.12); }   // 每盟友 请兵代打 -12%,封顶 -50%(盟友借强兵)
function allyMonthly(){ let inc=0, n=ownedCities().length;   // 盟友月入:朝廷给官俸(随治城涨)、其余盟友互市
  for(const f of allyList()){ inc += (f==="guanjun") ? (1000+n*500) : (400+n*150); }
  return Math.round(inc); }
function allyFameBonus(){ return allyList().length*15; }   // 每盟友 +15 威望(外交也能推霸业)
function marryFaction(fac){
  const kid=(S.kids||[]).find(k=>k.age>=14 && k.sex==="女");
  if(!kid){ toast("无适龄女儿可联姻(≥14岁)"); return; }
  S.kids=S.kids.filter(k=>k!==kid); setRel(fac, warRel(fac)+25);
  toast(`💞 ${S.surname}${kid.name} 嫁入${facInfo(fac).n},交情 +25(现 ${warRel(fac)})`); logMsg(`💞 ${S.surname}${kid.name} 与${facInfo(fac).n}联姻 · 交情→${warRel(fac)}`);
  celebrate("💞", "联姻"+facInfo(fac).n, S.surname+kid.name);
  render(); save(true);
}

// ===== 卖城套现(增量3)=====
function sellCity(id){
  if(!cityOwned(id)) return; const c=cityById(id), price=Math.round(cityPrice(id)*0.6);
  modal(`<h2>💴 卖城「${c.n}」?</h2><div class="desc" style="text-align:left">卖出可得 <b style="color:var(--good)">${fmtWan(price)}两</b>(约买价 6 折),失去其月入 ${cityInc(id).toLocaleString()}两 与威望 ${cityPres(id)}。确定?</div><button class="opt devcard" onclick="confirmSellCity('${id}')">确定 · 卖城套现</button>`);
}
function confirmSellCity(id){
  $("#modal").dataset.lock=''; closeModal();
  if(!cityOwned(id)) return; const c=cityById(id), price=Math.round(cityPrice(id)*0.6);
  S.silver+=price; removeCity(id);
  toast(`💴 卖出「${c.n}」,得 ${fmtWan(price)}两`); logMsg(`💴 卖城「${c.n}」(${fmtWan(price)}两)· 霸业:${hegemonName()}`);
  render(); save(true);
}

// ===== 乱世威胁(增量3:替黄河水患)别家来犯一座城,迎战/赔银/弃守 =====
let _threat=null;
function threatBribe(th){ return Math.round(cityInc(th.cityId)*30); }   // 赔银≈该城30月入
function warThreatRoll(){
  if(!warOn()) return false;
  const n=ownedCities().length;
  // ★坐大忌惮:占城多→各非盟势力对你交情缓降(为后续敌视/结盟埋因)
  if(n>=6){ for(const f of FAC_IDS){ if(stanceToYou(f)!=='ally') setRel(f, warRel(f)-1); } }
  // 谁敌视你(rel<35)= 关系驱动,不再"全是敌人"
  const hostiles=FAC_IDS.filter(f=>stanceToYou(f)==='hostile');
  if(!hostiles.length) return false;                                   // 没人敌视=太平(外交的价值)
  if(!n){ if(hostiles.includes("guolu")){ const loss=Math.round(G("grain")*0.12); if(loss>0){ addG("grain",-loss); toast(`🔥 啯噜流寇劫掠,失粮 ${loss} 石`); logMsg(`🔥 啯噜劫粮 ${loss} 石`); } } return false; }
  // ★时机:主力出征在外(可调兵<总兵40%)→ 敌人趁虚;防守充分时多按兵不动(蓄势)
  const overextended = warTroops()===0 || availTroops() < warTroops()*0.4;
  if(Math.random() >= (overextended?0.45:0.12)) return false;
  // ★因果联合:敌视你 且 彼此不为敌(facStance≥0)的势力才联手 —— 不是"城多就随机联军"
  let facs=[hostiles[Math.floor(Math.random()*hostiles.length)]];
  for(const f of hostiles){ if(f===facs[0]) continue; if(facs.every(a=>facStance(a,f)>=0)) facs.push(f); }
  facs=facs.slice(0,3);
  const target=ownedCities()[Math.floor(Math.random()*n)], c=cityById(target.id);
  const enemyPow=Math.round(facs.reduce((a,f)=>a+facMight(f),0)*(0.5+Math.random()*0.4));   // 来敌=各势力自身军力之和(打弱它→它来犯也弱)
  _threat={facs, cityId:target.id, enemyPow};
  const who=facs.map(f=>facInfo(f).n).join("、");
  let h=`<h2>🔥 ${who}${facs.length>1?' 联手':''}来犯</h2><div class="desc" style="text-align:left">${facs.map(f=>facInfo(f).ico).join("")} ${who}${facs.length>1?' 联军':''} 兵犯你的「${c.n}」!<br>来敌战力约 <b style="color:var(--bad)">${enemyPow.toLocaleString()}</b> · 可迎战野战兵 <b>${availTroops().toLocaleString()}</b>(战力 ${forcePower(availTroops()).toLocaleString()})${committedTroops()>0?`<br><small style="color:var(--mut)">${committedTroops().toLocaleString()} 兵在外围攻、不能回防</small>`:''}</div>`;
  h+=`<button class="opt devcard ${availTroops()>0?'':'dis'}" onclick="threatFight()"><b>⚔️ 出兵迎战</b><small>${availTroops()>0?'用可调野战兵守城 · 胜则击退、败则丢城折兵':'无可调兵(都在围攻)→ 只能赔银/弃守'}</small></button>`;
  h+=`<button class="opt devcard" onclick="threatPay()"><b>💰 破财消灾</b><small>赔银 ${fmtWan(threatBribe(_threat))}两打发(保城)</small></button>`;
  h+=`<button class="opt" onclick="threatYield()">🏳 弃守此城<small>丢「${c.n}」· 免折兵</small></button>`;
  modal(h, true);
  return true;
}
function threatFight(){
  const th=_threat; if(!th) return; _threat=null; $("#modal").dataset.lock=''; closeModal();
  const a0=availTroops(); let mine=forcePower(a0);
  // ★盟友求援:与来犯者为敌的盟友会助战,削减敌军
  const helpers=(S.warlord.allies||[]).filter(al=>th.facs.some(f=>facStance(al,f)<0));
  if(helpers.length){ const aid=helpers.reduce((a,h)=>a+facMight(h)*0.5,0); th.enemyPow=Math.max(1,Math.round(th.enemyPow-aid));
    toast(`🤝 盟友 ${helpers.map(h=>facInfo(h).n).join("、")} 出兵助战!`); logMsg(`🤝 盟友助战,敌军削减`); }
  const g=bestGeneral(), lead=g?`${g.name}率`:'我军';
  const win=mine*(0.85+Math.random()*0.3)>=th.enemyPow, loss=win?Math.round(a0*0.18):Math.round(a0*0.45);
  S.warlord.troops=Math.max(0,warTroops()-loss); const c=cityById(th.cityId), who=th.facs.map(f=>facInfo(f).n).join("、");
  if(win){ toast(`🛡️ ${lead} ${a0.toLocaleString()} 众御敌(战力${mine.toLocaleString()} vs ${th.enemyPow.toLocaleString()}),击退${who}!保「${c.n}」· 折兵 ${loss.toLocaleString()}`); logMsg(`🛡️ 战报·守「${c.n}」:${lead}战力${mine.toLocaleString()}击退${who}(敌${th.enemyPow.toLocaleString()})· 折损${loss.toLocaleString()}`); celebrate("🛡️","守住"+c.n,""); }
  else { removeCity(th.cityId); toast(`💥 ${lead}力战不敌(战力${mine.toLocaleString()} vs ${th.enemyPow.toLocaleString()}),「${c.n}」失守!折兵 ${loss.toLocaleString()}`); logMsg(`💥 战报·失「${c.n}」:${who}(敌${th.enemyPow.toLocaleString()})攻陷,我军折损${loss.toLocaleString()}`); }
  render(); save(true); setSpeed(_userSpeed||1);
}
function threatPay(){
  const th=_threat; if(!th) return; const cost=threatBribe(th);
  if(S.silver<cost){ toast(`破财消灾需 ${fmtWan(cost)}两,银两不够 · 只能迎战或弃守`); return; }
  _threat=null; $("#modal").dataset.lock=''; closeModal(); S.silver-=cost; const c=cityById(th.cityId), who=th.facs.map(f=>facInfo(f).n).join("、");
  th.facs.forEach(f=>setRel(f, warRel(f)+5));
  toast(`💰 赔银 ${fmtWan(cost)}两打发${who},保住「${c.n}」`); logMsg(`💰 破财消灾 ${fmtWan(cost)}两 · 保「${c.n}」`);
  render(); save(true); setSpeed(_userSpeed||1);
}
function threatYield(){
  const th=_threat; if(!th) return; _threat=null; $("#modal").dataset.lock=''; closeModal();
  const c=cityById(th.cityId), who=th.facs.map(f=>facInfo(f).n).join("、"); removeCity(th.cityId);
  toast(`🏳 弃守「${c.n}」· 退避保兵`); logMsg(`🏳 弃守「${c.n}」予${who}`);
  render(); save(true); setSpeed(_userSpeed||1);
}

window.warAccept=warAccept; window.warDecline=warDecline; window.buyCity=buyCity;
window.recruitTroops=recruitTroops; window.recruitGeneral=recruitGeneral; window.openCityAction=openCityAction; window.startSiege=startSiege; window.hireSiege=hireSiege;
window.forgeWeapons=forgeWeapons; window.buyHorses=buyHorses; window.buildDrill=buildDrill; window.develCity=develCity;
window.bribeFaction=bribeFaction; window.allyFaction=allyFaction; window.marryFaction=marryFaction; window.sellCity=sellCity; window.confirmSellCity=confirmSellCity; window.tradeFaction=tradeFaction; window.acceptZhaoan=acceptZhaoan;
window.threatFight=threatFight; window.threatPay=threatPay; window.threatYield=threatYield;
window.renderTianxiaScene=renderTianxiaScene; window.openConquerSheet=openConquerSheet; window.openArmySheet=openArmySheet; window.openDiploSheet=openDiploSheet; window.openMyCitiesSheet=openMyCitiesSheet;
window.openLogisticsSheet=openLogisticsSheet; window.warAutoLaborManual=warAutoLaborManual;
