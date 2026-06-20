'use strict';
// [family] 家族页:家眷/妻妾/养女/家仆/子女派职 + 说媒纳妾/内宅事件
// ===== 家族页 =====
function familyHTML(){
  const L=S.lord, spct=L?Math.min(100,Math.round(L.age/L.span*100)):0;
  let h=`<div class="screen"><h2>👪 ${S.surname}氏家族 · 第 ${S.gen||1} 代</h2>`;
  h+=`<div class="famcard lord"><div class="fhead"><b>${icoImg("lord","👑")} 家主 ${S.surname}${L.name}</b><span class="fage">${L.age} 岁</span></div>
      <div class="fspan"><div class="fspanbar" style="width:${spct}%"></div></div>
      <small class="fsub">寿数 约 ${L.span} · ${L.age<12?'⚠ 幼主临政,全局产出 −20%':'当家理事'}</small></div>`;
  if(S.spouse){
    h+=`<div class="famcard"><div class="fhead"><b>${icoImg("wife","💞")} 大夫人 ${S.spouse.name} 氏</b><span class="fage">${S.spouse.age}岁</span></div>
        <small class="fsub">正妻 · 主母 · ${S.spouse.age<45?'育龄,每年可能添丁':'已过育龄'}</small></div>`;
  } else {
    h+=`<button class="bigbtn" onclick="doMatchmake()">💐 说媒提亲(40 两)<span style="display:block;font-size:11px;color:#e8d7b3;font-weight:400">娶妻方能开枝散叶</span></button>`;
  }
  // 内宅:二夫人 / 小妾(受大宅 concCap)
  if(consorts().length){
    h+=BGroup(`内宅 · 二夫人/小妾`, `${consorts().length}/${concCap()} 位`)+`<div class="grow">`;
    for(const c of consorts()){
      h+=Card({ cls:"famk live", ico:icoImg("wife",(c.rank==="平妻"?"💝":"🏮")), nm:c.name,
        out:`${c.rank}${c.age<45?' · 育龄':''}`, sub:`${c.age}岁`,
        extra:`<a class="razemini" onclick="dismissConsort('${c.id}')">下堂</a>` }); }
    h+=`</div>`;
  }
  if(S.spouse){   // 纳妾入口(大宅闸口)
    const slots=concCap()-consorts().length, hasSec=consorts().some(c=>c.rank==="平妻");
    h+=`<div class="lops" style="margin:6px 0">`;
    if(manorLv()>=3 && !hasSec) h+=`<button class="${(!canAddConsort()||S.silver<200)?'dis':''}" onclick="takeSecondWife()">💝 纳二夫人<i>聘金200两</i></button>`;
    h+=`<button class="${(slots<=0||S.silver<80)?'dis':''}" onclick="takeConcubine()">🏮 纳妾<i>${concCap()<=0?'升大宅可纳':(slots<=0?'内宅已满':'身价80两')}</i></button>`;
    if(qinglouWithFlower()) h+=`<button class="${(slots<=0||S.silver<150)?'dis':''}" onclick="takeFlower()">🌸 纳青楼花魁<i>赎身150两</i></button>`;
    h+=`</div>`;
    if(concCap()<=0) h+=`<div class="hint" style="text-align:left">🔒 纳妾需「四合院」以上大宅(妾室上限随大宅涨)</div>`;
  }
  if(S.kids&&S.kids.length){
    const adult=S.kids.filter(k=>k.age>=10).length;
    h+=`<div class="bgroup">子女 · ${S.kids.length} 人(成年 ${adult})</div><div class="grow">${S.kids.map(kidCard).join("")}</div>`;
  } else {
    h+=`<div class="hint">膝下尚无子女${S.spouse?',静待添丁':',先说媒娶妻开枝散叶'}</div>`;
  }
  h+=wardsHTML();
  h+=servantSummaryHTML();
  h+=`<div class="hint">${S.surname}氏第 ${S.gen||1} 代 · 阖家 ${famMembers()} 口 · 每月口粮 ${famEat().toFixed(1)} 石</div></div>`;
  return h;
}
function wardsHTML(){
  if(!S.wards||!S.wards.length) return "";
  let h=BGroup(`养女 · 童养媳/婢女`, `养到 ${WARD_GROWN} 岁可用`)+`<div class="grow">`;
  for(const w of S.wards){ const grown=w.age>=WARD_GROWN, K=WARD_BUY[w.kind];
    let extra="";
    if(grown && w.kind==="bride") extra=`<button class="wbtn ${S.spouse?'dis':''}" onclick="wedWard('${w.id}')">圆房成婚</button>`;
    else if(grown) extra=`<div class="wbtns"><button class="wbtn" onclick="wardToMaid('${w.id}')">收作丫鬟</button><button class="wbtn alt" onclick="marryOffWard('${w.id}')">许配嫁人</button></div>`;
    h+=Card({ cls:`famk ${grown?'live':'kidyoung'}`, ico:icoImg(w.age<10?"child":(w.kind==="bride"?"bride":"daughter"), K.ico), nm:w.name,
      out:`${K.n}${grown?' · 待用':' · 养育中'}`, sub:`${w.age}岁 · 「${w.talent}」`, extra }); }
  h+=`</div>`;
  return h;
}
function servantSummaryHTML(){
  if(servantCount()<=0) return `<div class="hint">家中尚无家仆 · 去「城内 · 牙行」雇车夫/账房/西席等役使</div>`;
  const parts=[]; for(const r in SERVANTS){ const c=svc(r); if(c) parts.push(`${SERVANTS[r].ico}${SERVANTS[r].n}${c>1?'×'+c:''}`); }
  return `<div class="bgroup">家仆 · 役使 <small style="color:var(--mut);font-weight:400">月俸 ${servantWage().toFixed(1)}两 · 雇/辞在城内·牙行</small></div><div class="svcsum">${parts.join("　")}</div>`;
}
function servantHTML(){
  let h=`<div class="bgroup">雇佣家仆 <small style="color:var(--mut);font-weight:400">月俸共 ${servantWage().toFixed(1)} 两 · 雇而不占人口</small></div><div class="svclist">`;
  for(const r in SERVANTS){ const sv=SERVANTS[r], c=svc(r), full=c>=servCap(r), poor=S.silver<sv.hire;
    h+=`<div class="svcrow ${c?'on':''}">
      <span class="svci">${icoImg(r, sv.ico)}</span>
      <div class="svcmeta"><b>${sv.n}${c?` ×${c}`:''}</b><small>${sv.d}　<span style="color:var(--mut)">雇 ${sv.hire}两 · 月俸 ${sv.wage}</span></small></div>
      <div class="step"><button class="rbtn ${c<=0?'dis':''}" onclick="dismissServant('${r}')">−</button><b>${c}</b><button class="rbtn ${(full||poor)?'dis':''}" onclick="doHire('${r}')">＋</button></div>
    </div>`; }
  h+=`</div>`;
  return h;
}
function doHire(role){
  const sv=SERVANTS[role]; if(!sv)return; const cur=svc(role);
  if(cur>=servCap(role)){ toast(`${sv.n}已够用(上限 ${servCap(role)} 名,升大宅可增)`); return; }
  if(S.silver<sv.hire){ toast(`雇${sv.n}需 ${sv.hire} 两`); return; }
  S.silver-=sv.hire; if(!S.servants)S.servants={}; S.servants[role]=cur+1;
  toast(`🤵 雇了个${sv.n}(月俸 ${sv.wage} 两)`); logMsg(`🤵 雇${sv.n}`); render(); reopenBroker(); save(true);
}
function dismissServant(role){
  const sv=SERVANTS[role]; if(!sv)return; const cur=svc(role); if(cur<=0)return;
  S.servants[role]=cur-1; toast(`辞退一名${sv.n}`); render(); reopenBroker(); save(true);
}
function kidCard(k){
  const grown=k.age>=10, postN=k.post&&POSTS[k.post]?POSTS[k.post].n:(grown?"闲着":"孩童");
  return Card({ cls:`famk ${grown?'live':'kidyoung'}`, onclick:(grown?`openKid('${k.id}')`:""),
    ico:icoImg(k.age<10?"child":(k.sex==="男"?"son":"daughter"),(k.sex==="男"?"👦":"👧")), nm:`${S.surname}${k.name}`,
    out:(grown?(k.post?POSTS[k.post].ico+" "+postN:"待派职"):"🍼 "+k.age+" 岁孩童"),
    sub:`${k.age}岁 · 天赋「${k.talent}」`, more:(grown?"点开派职 ›":"") });
}
function postEffTxt(p,k){
  if(p==="farm")   return "作物 +"+(k.talent==="勤勉"?12:8)+"%";
  if(p==="work")   return "作坊 +"+(k.talent==="精明"?12:8)+"%";
  if(p==="market") return "卖价 +"+(k.talent==="精明"?15:10)+"%";
  if(p==="study")  return "声望渐增";
  if(p==="labor")  return "+1 免费劳力";
  return "";
}
function openKid(id){
  const k=(S.kids||[]).find(x=>String(x.id)===String(id)); if(!k||k.age<10)return;
  _curKid=id; _curDept=null;
  let h=`<h2>${k.sex==="男"?"👦":"👧"} ${S.surname}${k.name}</h2><div class="desc">${k.age}岁 · 天赋「${k.talent}」· 现任 <b>${k.post?POSTS[k.post].n:"闲着"}</b></div>`;
  h+=`<div class="bgroup">派职事(一人一岗)</div>`;
  for(const p in POSTS){ const P=POSTS[p], on=k.post===p, hit=(p==="farm"&&k.talent==="勤勉")||((p==="work"||p==="market")&&k.talent==="精明");
    h+=`<button class="opt ${on?'cur':''}" onclick="setKidPost('${id}','${p}')">${P.ico} ${P.n}${on?' ✓':''}<small>${P.d} · ${postEffTxt(p,k)}${hit?' (天赋对口,加成更高)':''}</small></button>`;
  }
  h+=`<button class="opt ${k.post?'':'cur'}" onclick="setKidPost('${id}','')">🛋 歇着${k.post?'':' ✓'}<small>不任职(仍要吃粮)</small></button>`;
  if(k.sex==="女") h+=`<button class="opt" onclick="marryOffKid('${id}')">💒 许配嫁人<small>得聘礼 ${marryDowry(k)} 两 + 声望 +3,该女离家</small></button>`;
  modal(h);
}
function setKidPost(id,p){
  const k=(S.kids||[]).find(x=>String(x.id)===String(id)); if(!k)return;
  k.post=p||null; clampAssign();
  toast(p?`${S.surname}${k.name} 任「${POSTS[p].n}」`:`${S.surname}${k.name} 歇下了`);
  render(); if(!$("#modal").classList.contains("hidden")&&_curKid===id) openKid(id); save(true);
}
function marryDowry(k){ return 30 + (k.talent!=="平庸"?20:0) + Math.max(0,k.age-10)*2; }
function marryOffKid(id){
  const k=(S.kids||[]).find(x=>String(x.id)===String(id)); if(!k||k.sex!=="女")return;
  const d=marryDowry(k); S.silver+=d; S.rep=(S.rep||0)+3; S.kids=S.kids.filter(x=>x!==k); clampAssign();
  toast(`💒 ${S.surname}${k.name} 出阁 · 聘礼 +${d}两 · 声望 +3`); closeModal(); render(); save(true);
}
function doMatchmake(){
  if(S.spouse){ toast("已有主母"); return; }
  if(S.silver<40){ toast("说媒需 40 两聘礼"); return; }
  S.silver-=40; S.spouse={name:randName("女"), age:18+Math.floor(Math.random()*8)};
  toast(`💐 三媒六聘,娶了 ${S.surname}门 ${S.spouse.name} 氏过门!`); render(); save(true);
}
// ===== 多妻妾:大夫人(S.spouse,正妻) + 二夫人(平妻)/小妾(S.consorts),受大宅 concCap 限 =====
function canAddConsort(){ return consorts().length < concCap(); }
function addConsort(rank){ const age=16+Math.floor(Math.random()*8); const c={id:++_id, name:randName("女"), age, rank}; if(!S.consorts)S.consorts=[]; S.consorts.push(c); return c; }
function reopenFamilyIfOpen(){ if(view==="home") renderMain(); }
function takeSecondWife(){
  if(!S.spouse){ toast("先说媒娶正妻(大夫人)"); return; }
  if(manorLv()<3){ toast("须营造至「大宅」方可纳二夫人(平妻)"); return; }
  if(consorts().some(c=>c.rank==="平妻")){ toast("已有二夫人"); return; }
  if(!canAddConsort()){ toast(`内宅已满(妾室上限 ${concCap()})· 升大宅可纳更多`); return; }
  const cost=200; if(S.silver<cost){ toast(`明媒纳二夫人需聘金 ${cost} 两`); return; }
  S.silver-=cost; const c=addConsort("平妻"); S.rep=(S.rep||0)+2;
  toast(`💞 明媒正娶,纳 ${c.name} 为二夫人(平妻)!`); logMsg(`💞 纳 ${c.name} 为二夫人`); celebrate("💞", "纳二夫人", c.name); render(); save(true);
}
function takeConcubine(){
  if(!canAddConsort()){ toast(`内宅已满(妾室上限 ${concCap()})· 升大宅可纳更多`); return; }
  const cost=80; if(S.silver<cost){ toast(`纳妾需身价银 ${cost} 两`); return; }
  S.silver-=cost; const c=addConsort("妾");
  toast(`🏮 纳 ${c.name} 为妾,内宅添人`); logMsg(`🏮 纳妾 ${c.name}`); celebrate("🏮", "纳妾", c.name); render(); save(true);
}
function takeFlower(){   // 赎自家青楼的花魁纳为妾(需青楼里养出花魁)
  const ql=qinglouWithFlower(); if(!ql){ toast("须自家青楼养出花魁(招姑娘→调教成花魁)"); return; }
  if(!canAddConsort()){ toast(`内宅已满(妾室上限 ${concCap()})· 升大宅可纳更多`); return; }
  const cost=150; if(S.silver<cost){ toast(`为花魁赎身需 ${cost} 两`); return; }
  S.silver-=cost; ql.girls.hua--; const c=addConsort("妾"); S.rep=(S.rep||0)+2;
  toast(`🌸 为青楼花魁 ${c.name} 赎身,纳为妾(声望 +2)`); logMsg(`🌸 青楼花魁 ${c.name} 入府为妾`);
  celebrate("🌸", "花魁入府", c.name); closeModal(); render(); save(true);
}
function dismissConsort(id){   // 遣散一名妾(下堂/放归)
  const c=consorts().find(x=>String(x.id)===String(id)); if(!c)return;
  S.consorts=consorts().filter(x=>x!==c);
  toast(`${c.name}（${c.rank}）下堂放归`); render(); save(true);
}
// 内宅事件:妻妾≥2,月结约 4% 触发,自动小影响(争宠/和睦)——有戏不烧脑
function innerCourtTick(){
  if(wivesCount()<2 || Math.random()>0.04) return;
  if(S.harmony==null) S.harmony=0;
  if(Math.random()<0.5){   // 争宠/口角
    const e=Math.floor(Math.random()*3);
    if(e===0){ S.rep=Math.max(0,(S.rep||0)-1); S.harmony=Math.max(-2,S.harmony-1); toast("🏮 内宅争宠口角,家声略损(声望 −1)"); logMsg("🏮 内宅争宠口角(声望 −1)"); }
    else if(e===1){ const c=Math.min(S.silver,20); S.silver-=c; toast(`🏮 妻妾争风,破财 ${Math.round(c)} 两摆平`); logMsg(`🏮 内宅不睦,破财 ${Math.round(c)} 两平息`); }
    else { S.harmony=Math.max(-2,S.harmony-1); toast("🏮 内宅生隙,一时不睦(添丁略难)"); }
  } else {                 // 和睦
    const e=Math.floor(Math.random()*3);
    if(e===0){ S.rep=(S.rep||0)+2; toast("🌸 妻妾和睦、内宅有序,家声渐隆(声望 +2)"); logMsg("🌸 内宅和睦(声望 +2)"); }
    else if(e===1){ S.harmony=Math.min(2,S.harmony+1); toast("🌸 内宅其乐融融(添丁更易)"); }
    else { const g=15+Math.floor(Math.random()*20); S.silver+=g; toast(`🌸 内宅持家有道,省下 ${g} 两`); logMsg(`🌸 内宅持家有道(+${g} 两)`); }
  }
}
// ===== 养女:牙行买幼女回养(童养媳→圆房当主母;婢女→丫鬟 或 许配) =====
const WARD_GROWN=14;   // 养到 14 岁可圆房/使唤/许配
const WARD_BUY={
  bride:{n:"童养媳", ico:"👰", cost:12, d:"养大圆房当主母(省说媒40两),开枝散叶"},
  maid: {n:"婢女",   ico:"👧", cost:10, d:"养大收作丫鬟(免雇银) 或 许配嫁人换聘礼"},
};
function buyWard(kind){
  const w=WARD_BUY[kind]; if(!w)return;
  if((S.wards||[]).length>=wardCap()){ toast(`养女已满(上限 ${wardCap()} · 升大宅可养更多)`); return; }
  if(S.silver<w.cost){ toast(`身价银需 ${w.cost} 两`); return; }
  S.silver-=w.cost; if(!S.wards)S.wards=[];
  const a=5+Math.floor(Math.random()*5);   // 5~9 岁
  S.wards.push({id:++_id, name:randName("女"), sex:"女", age:a, kind, talent:rollTalent()});
  toast(`🧒 牙行抱回个${w.n}(${a}岁),家中养着`); logMsg(`🧒 买${w.n}回养`); render(); reopenBroker(); save(true);
}
function wedWard(id){
  const w=(S.wards||[]).find(x=>String(x.id)===String(id)); if(!w||w.kind!=="bride")return;
  if(S.spouse){ toast("已有主母"); return; }
  if(w.age<WARD_GROWN){ toast(`${w.name} 尚幼(${w.age}岁),养到 ${WARD_GROWN} 岁可圆房`); return; }
  S.spouse={name:w.name, age:w.age}; S.wards=S.wards.filter(x=>x!==w);
  toast(`💞 与童养媳 ${w.name} 圆房成婚,做了主母!`); logMsg(`💞 童养媳 ${w.name} 圆房,立为主母`); celebrate("💞", "圆房成婚", w.name); render(); save(true);
}
function wardToMaid(id){
  const w=(S.wards||[]).find(x=>String(x.id)===String(id)); if(!w||w.kind!=="maid")return;
  if(w.age<WARD_GROWN){ toast(`${w.name} 尚幼,养大可使唤`); return; }
  if(svc("maid")>=servCap("maid")){ toast(`丫鬟已满(${servCap("maid")} 名,升大宅可增)`); return; }
  if(!S.servants)S.servants={}; S.servants.maid=svc("maid")+1; S.wards=S.wards.filter(x=>x!==w);
  toast(`🧹 ${w.name} 收作丫鬟(月俸 ${SERVANTS.maid.wage} 两)`); logMsg(`🧹 婢女 ${w.name} 收作丫鬟`); render(); save(true);
}
function marryOffWard(id){
  const w=(S.wards||[]).find(x=>String(x.id)===String(id)); if(!w)return;
  if(w.age<WARD_GROWN){ toast(`${w.name} 尚幼,养大可许配`); return; }
  const d=30+(w.talent!=="平庸"?20:0)+Math.max(0,w.age-WARD_GROWN)*2;
  S.silver+=d; S.rep=(S.rep||0)+3; S.wards=S.wards.filter(x=>x!==w);
  toast(`💒 ${w.name} 许配出阁 · 聘礼 +${d}两 · 声望 +3`); render(); save(true);
}
