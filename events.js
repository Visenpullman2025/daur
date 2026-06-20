'use strict';
// [events] 随机事件:数据驱动 · 条件门控 · 全确定后果 · 低频(季掷 TUNE.eventRate)。弹窗选择→记大事记。
// ★阶段门控:入乱世(warOn,天下阶段)后这套经营期事件整体不出,让位给 war.js 的乱世威胁/天下大势(与年终水患一致)。
// 加事件只往 EVENTS 加一条;eff 直接拨现成系统(银/产业/人/官面/声望/货),返回后果文案。

// 小工具:毁掉 n 处某类产业(返回实毁数)
function _ruin(types, n){ const list=S.ind.filter(b=>types.includes(b.type)); let k=0; for(let i=0;i<n && i<list.length;i++){ S.ind=S.ind.filter(x=>x!==list[i]); k++; } if(k)clampAssign(); return k; }
function _adultSons(){ return (S.kids||[]).filter(k=>k.age>=10 && k.sex==="男"); }
function _topGood(){ let best=null,bv=-1; for(const g in S.goods){ const v=(S.goods[g]||0)*(PRICE[g]||0); if(PRICE[g]&&v>bv){ bv=v; best=g; } } return best; }

const EVENTS = [
  { id:"refugees", t:"流民来投", ico:"🧑‍🌾", weight:3, cond:s=>true,
    flavor:"荒年流民成群,数家老小衣衫褴褛,到庄前跪求一条活路。",
    choices:[
      { label:"收留为长工", sub:"+2 长工(多两张嘴吃饭)", eff:s=>{ s.workers+=2; return "收下两个壮劳力,记得派工。"; } },
      { label:"舍粥遣散", sub:"散 30 两 · 声望+4", eff:s=>{ s.silver=Math.max(0,s.silver-30); s.rep=(s.rep||0)+4; return "舍粥三日,流民千恩万谢散去,乡里称善。"; } },
      { label:"闭门不纳", sub:"无", eff:s=>"紧闭庄门,流民悻悻而去。" },
    ] },
  { id:"locust", t:"蝗灾过境", ico:"🦗", weight:3, cond:s=>s.ind.some(b=>b.type==="field"||b.type==="paddy"),
    flavor:"铺天蔽日的蝗群压境,所过之处禾苗顷刻见底。",
    choices:[
      { label:"雇人扑打火攻", sub:"40 两 · 保住田", eff:s=>{ s.silver=Math.max(0,s.silver-40); return "全庄出动扑打火攻,总算护住了田。"; } },
      { label:"听天由命", sub:"毁两三块田", eff:s=>{ const n=_ruin(["field","paddy"], 2+Math.floor(Math.random()*2)); return `蝗过如洗,毁了 ${n} 块田。`; } },
    ] },
  { id:"drought", t:"久旱不雨", ico:"☀️", weight:2, cond:s=>s.ind.some(b=>b.type==="field"||b.type==="paddy"),
    flavor:"赤日炎炎,数月无雨,田土龟裂,禾苗枯黄。",
    choices:[
      { label:"凿井引水", sub:"50 两 · 保收", eff:s=>{ s.silver=Math.max(0,s.silver-50); return "凿井车水,庄稼总算缓了过来。"; } },
      { label:"求神听命", sub:"毁一块田+卷粮", eff:s=>{ const n=_ruin(["field","paddy"],1); addG("grain",-Math.min(G("grain"),15)); return `求雨无应,旱死 ${n} 块田、折了存粮。`; } },
    ] },
  { id:"plague_animal", t:"牲畜瘟疫", ico:"🐂", weight:2, cond:s=>s.ind.some(b=>b.type==="barn"),
    flavor:"邻村牛羊倒毙,瘟气蔓延到你的畜栏。",
    choices:[
      { label:"重金请兽医", sub:"30 两 · 保畜", eff:s=>{ s.silver=Math.max(0,s.silver-30); return "兽医隔离施药,牲畜保住了。"; } },
      { label:"硬扛", sub:"毁一处畜栏", eff:s=>{ const n=_ruin(["barn"],1); return `瘟疫横扫,病死一栏牲口（毁 ${n} 处）。`; } },
    ] },
  { id:"fire", t:"作坊走水", ico:"🔥", weight:2, cond:s=>s.ind.some(b=>DEFS[b.type].kind==="work"),
    flavor:"夜半一处作坊失火,火舌借风窜起。",
    choices:[
      { label:"重赏扑救", sub:"50 两 · 保住", eff:s=>{ s.silver=Math.max(0,s.silver-50); return "众人拼死扑救,只损了些料,作坊保住。"; } },
      { label:"先抢人后认命", sub:"烧毁一处作坊", eff:s=>{ const n=_ruin(["mill","brewery","weaver","silkworm","silkweave","teahouse","kitchen","oilpress","sugarmill","papermill","brickkiln","porcelain","smithy","carpentry"],1); return `火势难遏,烧毁一处作坊（${n}）。`; } },
    ] },
  { id:"bandits", t:"兵匪过境", ico:"⚔️", weight:2, cond:s=>assets()>800,
    flavor:"溃兵流寇压境,沿途劫掠,已到庄外。",
    choices:[
      { label:"破财消灾", sub:"献银约 5% 家产", eff:s=>{ const c=Math.round(assets()*0.05); s.silver=Math.max(0,s.silver-c); return `献上 ${c} 两买平安,兵匪扬长而去。`; } },
      { label:"闭寨死守", sub:"有护院则守住,否则损货", eff:s=>{ if(svc("guard")>0){ return "护院家丁拒寨死守,匪众讨不到便宜,退去!"; } const c=Math.min(G("grain"),40); addG("grain",-c); const lost=Math.round(s.silver*0.15); s.silver-=lost; return `无人护院,被破门掳走存粮与 ${lost} 两。`; } },
    ] },
  { id:"official_squeeze", t:"上官打秋风", ico:"🎎", weight:3, cond:s=>true,
    flavor:"本地知县遣人来「借」,话里话外要你识相。",
    choices:[
      { label:"厚礼打点", sub:"80 两 · 官面+10", eff:s=>{ s.silver=Math.max(0,s.silver-80); s.favor=Math.min(100,(s.favor||0)+10); return "礼到人欢,知县大人记下了你的好。"; } },
      { label:"敷衍搪塞", sub:"官面−6", eff:s=>{ s.favor=Math.max(0,(s.favor||0)-6); return "敷衍了事,衙门里冷了脸。"; } },
      { label:"硬顶到底", sub:"声望+5 官面−12", eff:s=>{ s.rep=(s.rep||0)+5; s.favor=Math.max(0,(s.favor||0)-12); return "不卑不亢顶了回去,乡邻暗赞,官府衔恨。"; } },
    ] },
  { id:"rival", t:"同行倾轧", ico:"🏬", weight:2, cond:s=>(s.shops||[]).length>0,
    flavor:"城里同行眼红你的铺面,暗中使绊、抢客压价。",
    choices:[
      { label:"让利和解", sub:"30 两 · 平息", eff:s=>{ s.silver=Math.max(0,s.silver-30); return "破财让利,两家罢手言和。"; } },
      { label:"硬碰到底", sub:"官面−8 声望−3", eff:s=>{ s.favor=Math.max(0,(s.favor||0)-8); s.rep=Math.max(0,(s.rep||0)-3); return "斗得两败俱伤,街面上都没落好。"; } },
    ] },
  { id:"bad_son", t:"子嗣顽劣", ico:"👦", weight:2, cond:s=>_adultSons().length>0,
    flavor:"家中一个成年子赌钱斗殴,惹下事端。",
    choices:[
      { label:"严加管教", sub:"声望+3 · 浪子或回头", eff:s=>{ s.rep=(s.rep||0)+3; const k=_adultSons()[0]; if(k&&k.talent==="平庸"&&Math.random()<0.5)k.talent="勤勉"; return "家法伺候、闭门思过,总算收了心。"; } },
      { label:"花钱了事", sub:"50 两", eff:s=>{ s.silver=Math.max(0,s.silver-50); return "赔了苦主 50 两,息事宁人。"; } },
      { label:"逐出家门", sub:"声望−2 · 失此子", eff:s=>{ const k=_adultSons()[0]; if(k){ s.kids=s.kids.filter(x=>x!==k); clampAssign(); } s.rep=Math.max(0,(s.rep||0)-2); return "逐出家门,断绝父子,族里议论纷纷。"; } },
    ] },
  { id:"relatives", t:"亲戚打秋风", ico:"👴", weight:2, cond:s=>assets()>500,
    flavor:"穷亲戚上门哭穷,赖着要接济。",
    choices:[
      { label:"慷慨周济", sub:"40 两 · 声望+3", eff:s=>{ s.silver=Math.max(0,s.silver-40); s.rep=(s.rep||0)+3; return "解囊相助,亲族传为美谈。"; } },
      { label:"婉言推拒", sub:"声望−2", eff:s=>{ s.rep=Math.max(0,(s.rep||0)-2); return "好言推了,亲戚悻悻而归。"; } },
    ] },
  { id:"old_servant", t:"老仆病重", ico:"🤵", weight:1, cond:s=>servantCount()>0,
    flavor:"跟了多年的老仆一病不起。",
    choices:[
      { label:"延医善养", sub:"20 两 · 声望+3", eff:s=>{ s.silver=Math.max(0,s.silver-20); s.rep=(s.rep||0)+3; return "延医调养,仆从感念、阖府称仁。"; } },
      { label:"打发回乡", sub:"失一家仆 · 声望−3", eff:s=>{ for(const r in SERVANTS){ if(svc(r)>0){ s.servants[r]--; break; } } s.rep=Math.max(0,(s.rep||0)-3); return "草草打发了事,落了刻薄名声。"; } },
    ] },
  { id:"big_order", t:"远客求大单", ico:"🍵", weight:2, cond:s=>{ const g=_topGood(); return g && S.goods[g]>=30; },
    flavor:"外路客商上门,要大批吃下你囤的一宗货。",
    choices:[
      { label:"成交", sub:"出一批货 · 大笔进账", eff:s=>{ const g=_topGood(); const q=Math.min(40, Math.floor(S.goods[g])); addG(g,-q); const gain=Math.round(q*PRICE[g]*1.35); s.silver+=gain; return `一手货出 ${q} ${GNAME[g]},进账 ${gain} 两!`; } },
      { label:"嫌价低不卖", sub:"无", eff:s=>"嫌客商压价,谈崩送客。" },
    ] },
  { id:"buried", t:"翻地掘银", ico:"💰", weight:1, cond:s=>true,
    flavor:"翻修宅院、深耕老地,竟挖出前人埋下的一坛窖银!",
    choices:[
      { label:"归为己有", sub:"+一笔银(随家业)", eff:s=>{ const gain=120+S.ind.length*12; s.silver+=gain; return `坛中白银 ${gain} 两,天降之财!`; } },
      { label:"半数舍济乡邻", sub:"少得一半 · 声望+8", eff:s=>{ const gain=Math.round((120+S.ind.length*12)/2); s.silver+=gain; s.rep=(s.rep||0)+8; return `得银 ${gain} 两,余者散济四邻,德望远播。`; } },
    ] },
  { id:"sage", t:"异人指点", ico:"📖", weight:1, cond:s=>true,
    flavor:"一位游方异人投宿数日,临行留下一卷农桑/匠作秘要。",
    choices:[
      { label:"研习农桑", sub:"全庄作物 +5%(永久)", eff:s=>{ s.cropBonus=(s.cropBonus||1)+0.05; return "依法耕作,庄稼果然增产。"; } },
      { label:"研习匠作", sub:"全场作坊 +5%(永久)", eff:s=>{ s.workBonus=(s.workBonus||1)+0.05; return "匠技精进,作坊出货更足。"; } },
    ] },
  { id:"charity_back", t:"善有善报", ico:"🤝", weight:1, cond:s=>(s.rep||0)>=20,
    flavor:"昔年受你恩惠之人如今发达,登门厚报。",
    choices:[
      { label:"坦然受之", sub:"+银 + 官面", eff:s=>{ const gain=80+Math.round((s.rep||0)*2); s.silver+=gain; s.favor=Math.min(100,(s.favor||0)+6); return `故人馈银 ${gain} 两、引荐官面,善报不虚。`; } },
    ] },
  { id:"flower_redeem", t:"红牌从良", ico:"🏮", weight:1, cond:s=>(s.shops||[]).some(x=>x.type==="qinglou" && ((x.girls&&x.girls.hong)||0)>0),
    flavor:"青楼一名红牌姑娘,有恩客欲为她赎身从良。",
    choices:[
      { label:"放人收赎金", sub:"失一红牌 · +150 两", eff:s=>{ const ql=(s.shops||[]).find(x=>x.type==="qinglou"&&((x.girls&&x.girls.hong)||0)>0); if(ql){ ql.girls.hong--; } s.silver+=150; return "成全一段良缘,收下 150 两赎金。"; } },
      { label:"抬价挽留", sub:"80 两 · 留人", eff:s=>{ s.silver=Math.max(0,s.silver-80); return "好言加酬挽留,红牌留在楼里挂牌。"; } },
    ] },
  { id:"exam_scandal", t:"科场风波", ico:"📜", weight:1, cond:s=>(s.kids||[]).some(k=>k.age>=10 && (k.post==="study"||k.rank)),
    flavor:"贡院流言四起,你家应考子弟被卷入闲话。",
    choices:[
      { label:"上下打点", sub:"100 两 · 官面+8", eff:s=>{ s.silver=Math.max(0,s.silver-100); s.favor=Math.min(100,(s.favor||0)+8); return "银钱开路,平息了风波。"; } },
      { label:"洁身避嫌", sub:"声望+4", eff:s=>{ s.rep=(s.rep||0)+4; return "闭门谢客以明清白,士林称许。"; } },
    ] },
];

let _curEvent = null;
function rollEvent(){
  if(typeof warOn==='function' && warOn()) return false;   // ★入乱世(天下阶段)后,这套经营期奇遇整体让位给「乱世威胁/天下大势」(与年终水患同一范式)——不再弹「流民来投」等与军阀身份不符的小事件
  if(Math.random() >= (TUNE.eventRate||0.14)) return false;
  const pool = EVENTS.filter(e=>!e.cond || e.cond(S));
  if(!pool.length) return false;
  let tot=0; for(const e of pool) tot+=e.weight||1;
  let r=Math.random()*tot, pick=pool[0];
  for(const e of pool){ r-=(e.weight||1); if(r<=0){ pick=e; break; } }
  showEvent(pick); return true;
}
function showEvent(ev){
  setSpeed(0); _curEvent=ev; _curDept=null; _curKid=null;
  let h=`<h2>${ev.ico||"📜"} ${ev.t}</h2><div class="desc" style="text-align:left;line-height:1.7">${ev.flavor}</div>`;
  ev.choices.forEach((c,i)=> h+=`<button class="opt" onclick="chooseEvent(${i})">${c.label}${c.sub?`<small>${c.sub}</small>`:""}</button>`);
  modal(h, true);   // 锁定:必须做选择
  logMsg(`📜 ${ev.t}`);
}
function chooseEvent(i){
  const ev=_curEvent; if(!ev) return; const c=ev.choices[i]; if(!c) return;
  const out = (c.eff(S) || "");
  if(out){ toast(`📜 ${out}`); logMsg(`📜 ${ev.t}:${out.slice(0,26)}`); }
  _curEvent=null; $("#modal").dataset.lock=''; closeModal(); render(); save(true); setSpeed(_userSpeed||1);
}
window.chooseEvent = chooseEvent;
