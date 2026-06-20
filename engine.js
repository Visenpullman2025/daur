'use strict';
// [engine] 挂机推进 step:生产/收获/工坊/市集售卖/马车/城里铺面/月结 + 人手·牙行
// ===== 引擎 =====
// ★批量/季节产(P1):作物秋收一次、矿/畜季收、工坊月批。日产累积进 pending,收获时落入仓(S.goods)
const HARVEST_ANNUAL=["grain","cotton","mleaf","tealeaf","veg"];   // 作物→秋收(每年一次;veg=菜)
const HARVEST_SEASON=["clay","coal","iron","meat","egg","cloth","wood","horse"];   // 矿/畜/林→季收(每季一次;cloth 牲畜部分;wood 伐木;horse 养马)
const MONTH_PROD=["pelt"];   // ★生皮 pelt 改月产入库(对齐 v1 任务书"随畜栏月产"):供皮坊月月有料,治皮革产不出
function addPend(k,v){ if(!S.pending)S.pending={}; S.pending[k]=(S.pending[k]||0)+v; }
function pend(k){ return (S.pending&&S.pending[k])||0; }
function clampStore(){ const cap=storeCap(); for(const k in S.goods) if(S.goods[k]>cap) S.goods[k]=cap; }
function step(){ S.day++; produceDay(); harvestTick(); allocHome(); marketSellTick(); cartTick(); buildTick(); if(typeof warCampaignTick==="function") warCampaignTick(); if(checkChallenge() && view==="home" && $("#modal").classList.contains("hidden")) renderMain(); if(S.day%30===0) monthSettle(); if(S.day%90===0) endRound(); }   // ★本地集市(marketSellTick)先卖:村民上门买;马车(cartTick)再把剩余余货出口远城。顺序反了马车会抢光货
// ★限时建造:在建项目每日推进,工期满则完工(addInd)、释放长工
function buildTick(){
  if(!S.builds || !S.builds.length) return;
  let done=false;
  for(const b of S.builds){ b.daysLeft-=buildSpeedMul(); }   // 波3:学校+操场加快营造
  const fin=S.builds.filter(b=>b.daysLeft<=0); if(!fin.length) return;
  for(const b of fin){ addInd(b.type, DEFS[b.type] && DEFS[b.type].kind==="crop" ? {tier:rollTier()} : undefined);
    toast(`🎉 ${DEFS[b.type]?DEFS[b.type].n:'产业'} 落成!可派工开张了`); logMsg(`🏗 营造落成:${DEFS[b.type]?DEFS[b.type].n:''}`); done=true; }
  S.builds=S.builds.filter(b=>b.daysLeft>0);
  if(done){ if(typeof flashUp==="function") flashUp(); render(); save(true); }
}
// ★市集售卖:各市我方货栈,本地居民按随机日需求一点点买走;月底报账
function seasonPriceMul(g){ if(g==="grain"||g==="flour"){ const s=season(); return s==="秋"?0.85:(s==="春"?1.15:1.0); } return 1.0; }   // 粮:秋收贱、春荒贵(诱你择时卖)
function mktPrice(m,g){ const glut=(m.glut&&m.glut[g])||0; const mul=Math.max(0.5, 1-glut/((m.size||5)*40)); return (PRICE[g]||0)*mul*(m.base||1)*seasonPriceMul(g); }
// ★运货卖钱:车到当场把整车卖掉(大宗压价 + 旺铺加成 + 累积饱和),立刻结清现银。返回 {sold, rev, unit}
function marketAppetite(m, g, cr){ return Math.max(4, (m.size||5)*(DEMAND_W[g]||0.1)*TUNE.sellAppetite*(m.appMul||1)*((cr&&cr.q)||1)); }   // ×appMul:大城吃得下大宗
function sellQMul(load, appetite){ return Math.max(TUNE.sellFloor, 1 - TUNE.sellSlope*load/(load+appetite)); }   // 一次卖越多单价越低,有底
function sellEstimate(mid, g, load, extraGlut, priceMul){   // 只读预测整车收入(不改 glut);extraGlut=一键派车模拟铺开;priceMul=战时高价等外部修正(默认1,P6军火生意用)
  const m=S.markets[mid]; if(!m||load<=0) return {rev:0, unit:0, load:0};
  const cr=(typeof cityShops==="function"&&cityShops(mid).length)?cityRetail(mid,g):{q:1,p:1};
  const m2=Object.assign({}, m); if(extraGlut){ m2.glut=Object.assign({}, m.glut); m2.glut[g]=((m.glut&&m.glut[g])||0)+extraGlut; }
  const unit=mktPrice(m2,g)*cr.p*(priceMul||1), qMul=sellQMul(load, marketAppetite(m,g,cr));
  return {rev:Math.round(load*unit*qMul), unit:unit*qMul, load};
}
function cartSell(mid, g, load, priceMul){   // priceMul:外部价格修正(默认1;P6军火战时高价直接传,无须改本函数)
  const m=S.markets[mid]; if(!m||load<=0) return {sold:0, rev:0};
  const cr=cityShops(mid).length?cityRetail(mid,g):{q:1,p:1};
  const unit=mktPrice(m,g)*cr.p*(priceMul||1), qMul=sellQMul(load, marketAppetite(m,g,cr));
  const rev=Math.round(load*unit*qMul);
  if(!m.glut)m.glut={}; m.glut[g]=(m.glut[g]||0)+load;                  // 卖完该市这货吃饱→后续/复访价低,marketReport 按月回升
  if(!m.sold)m.sold={}; m.sold[g]=(m.sold[g]||0)+load; m.rev=(m.rev||0)+rev;   // 货运账本(月报账汇总)
  S.silver+=rev;
  return {sold:load, rev, unit:unit*qMul};
}
function marketSellTick(){   // ★本地集市「家门口」:村民每天上门,直接从可交易库房买(不占马车;远城靠马车 cartSell 送)。只卖余货——cargoSurplus 已给作坊/牲畜/建材留够,绝不卖空原料
  const m=S.markets&&S.markets.local; if(!m) return;
  const hasShop=cityShops("local").length>0;
  for(const g of cartGoods()){                                        // ★本地集市卖所有货的「余量」(连「留着不外运」的也卖——不外运≠不卖;cargoSurplus 已给作坊/牲畜/建材留够)
    const surplus=cargoSurplus(g); if(surplus<0.05) continue;         // 留足下游作坊/牲畜/营造用量后才卖
    const cr=hasShop?cityRetail("local",g):{q:1,p:1};
    const demand=effMarketSize("local")*(DEMAND_W[g]||0.1)*(0.5+Math.random()*0.6)*cr.q;   // local 胃口=静态基线+村民购买力(随村庄变富而涨)
    const sold=Math.min(surplus, demand); if(sold<=0.01) continue;
    const rev=Math.round(sold*mktPrice(m,g)*cr.p);
    addG(g,-sold); S.silver+=rev;
    if(!m.glut)m.glut={}; m.glut[g]=(m.glut[g]||0)+sold;              // 卖多压价(温和,月回升)
    if(!m.sold)m.sold={}; m.sold[g]=(m.sold[g]||0)+sold; m.rev=(m.rev||0)+rev;
  }
}
function marketReport(){
  if(!S.markets) return; const lines=[]; let total=0;
  for(const mid in S.markets){ const m=S.markets[mid];
    if(m.rev>0.5){ const gs=Object.keys(m.sold||{}).filter(g=>m.sold[g]>0.1).map(g=>`${GNAME[g]}${m.sold[g].toFixed(0)}`).join(" "); lines.push(`${m.n}:${gs} +${Math.round(m.rev)}两`); total+=m.rev; }
    m.sold={}; m.rev=0;
    if(m.glut) for(const g in m.glut){ m.glut[g]*=0.4; if(m.glut[g]<0.5) delete m.glut[g]; }   // 月衰减,价回升
  }
  if(S.haulAcc && S.haulAcc.n>0){ lines.push(`🐎 帮运 ${S.haulAcc.n} 趟${S.haulAcc.robbed?`(${S.haulAcc.robbed} 趟遇匪)`:''} +${Math.round(S.haulAcc.fee)}两`); total+=S.haulAcc.fee; S.haulAcc={n:0,fee:0,robbed:0}; }   // ★帮运脚费月底一并报账(不逐车弹)
  S.report={lines, total:Math.round(total), y:yearN(), s:season()};
  if(total>0.5){ toast(`📒 本月行商报账 +${Math.round(total)}两`); logMsg(`📒 行商月入 +${Math.round(total)}两`); }
}
// ★半自动马车货运:配车夫+护卫,指路线(仓→某市),自动往返;路上有匪患
const CART_CAP=60, CART_COST=60;
const BUILD_MAT_KEEP = { wood:250, brick:150, tool:60 };   // ★建材/农具:留够营造+添置,马车绝不全运走(治"木头全堆市场、家里没木修房;农具被全卖")
function cartDrivers(){ return 1 + svc("carter"); }                 // 家里人自带 1 辆,每雇个车夫多跑 1 辆
function hasFleetHorses(){ return G("horse") >= Math.max(1,(S.carts||[]).length); }   // 马场养够马(每车1匹)→ 车队提速
function tripDays(dist){ return Math.max(1, Math.round(dist * (hasFleetHorses()?(1-TUNE.horseSpeed):1))); }   // 有马跑得快(路程−horseSpeed),无马照常不卡死
function cartGoods(){ return Object.keys(PRICE).filter(g=>GNAME[g]); }
function cartAutoGoods(){ return cartGoods().filter(g=>!(S.noSell||[]).includes(g)); }   // ★马车自动装:除了玩家标「留着不外运」的;建材不再整体排除——靠 cargoSurplus 只留够营造量、多出来的照样外运(治"木/砖永远堆着卖不掉")
function toggleNoSell(g){ if(!S.noSell)S.noSell=[]; const i=S.noSell.indexOf(g); if(i>=0){ S.noSell.splice(i,1); toast(`${GNAME[g]} 恢复外运`); } else { S.noSell.push(g); toast(`🚫 ${GNAME[g]} 留着不外运(马车不拉去远城;家门口集市仍卖余货)`); } render(); save(true); }
function clearNoSell(){ S.noSell=[]; toast("✅ 已全部恢复外运——马车会把仓里余货拉去各城卖"); render(); save(true); }   // 一键清空留货单(治"标太多货→全堆仓库卖不出")
function wsInputKeep(g){   // ★给「以 g 为原料的所有作坊」留 ~3 个月用量(治"棉/桑叶/黏土/铁等中间料被卖光→下游作坊缺料停产")
  let m=0; for(const t in DEFS){ const d=DEFS[t]; if(d.kind!=="work") continue; const gi=wsInputs(d).find(x=>x.g===g); if(gi) m+=gi.amt*deptManaged(t); }
  return Math.ceil(m*3);
}
function tradeKeep(g){ return g==="grain" ? tradeGrainKeep() : Math.max(BUILD_MAT_KEEP[g]||0, wsInputKeep(g)); }   // 留量:粮(牲畜+用粮作坊)/建材(营造)/中间料(下游作坊),取最大,绝不卖空原料
function cartTick(){
  if(!S.carts || !S.carts.length) return;
  for(const c of S.carts){                                          // 推进在途/返程
    if(c.leg==="out"){ c.day--; if(c.day<=0){ const m=S.markets[c.dest];
        let load=c.load;
        if(m && Math.random() < (m.risk||0)*Math.pow(0.78, svc("guard"))*(hasCaptain()?TUNE.captainRiskMul:1)){ const loss=Math.round(load*(0.4+Math.random()*0.5)); load-=loss;   // 匪患:护卫+镖头压险
          toast(`🐎 ${m.n}镖路遇匪!折 ${loss} ${GNAME[c.cargo]}`); logMsg(`🐎 ${m.n}途中遇匪,折货 ${loss} ${GNAME[c.cargo]}`); }
        if(m && load>0) cartSell(c.dest, c.cargo, load);   // ★当场整车卖掉,立刻结清现银(不逐笔弹窗,月底「行商报账」汇总)
        c.load=0; c.leg="back"; c.day=(m?tripDays(m.dist):1); } }
    else if(c.leg==="back"){ c.day--; if(c.day<=0){ c.leg="idle"; c.load=0; } }
    else if(c.leg==="haul"){ c.day--; if(c.day<=0){ resolveHaul(c); } }   // 帮人运货外单到期结算
    else if(c.leg==="tbuy"){ c.day--; if(c.day<=0){ tradeBuyArrive(c); } }   // 跨城贩运:到进货城进货
    else if(c.leg==="tsell"){ c.day--; if(c.day<=0){ tradeSellArrive(c); } } // 到卖货城交货栈
  }
  let running=S.carts.filter(c=>c.leg!=="idle").length; const drv=cartDrivers();   // 发空闲车(有车夫+有货)
  for(const c of S.carts){ if(c.leg!=="idle") continue; if(running>=drv) break;
    if(!c.pin) _smartLoad(c);   // ★未钉死的车:每趟自动挑当下最划算的货+市(随 glut 自然铺开,不把一个市砸穿);钉死的车守玩家指定路线
    const avail=(c.dest&&c.cargo&&S.markets[c.dest])?cargoSurplus(c.cargo):0;   // 留够:粮给牲畜/工坊、建材给营造;人口粮在院子,马车碰不到
    if(avail>=1){ const load=Math.min(cartCap(c), avail); addG(c.cargo,-load); c.load=load; c.leg="out"; c.day=tripDays(S.markets[c.dest].dist); running++; }   // 有货可运→出车卖货(有马跑得快)
    else if(S.autoHaul){ const dist=6+Math.floor(Math.random()*13); c.leg="haul"; c.day=dist; c.haulDist=dist; c.load=0; running++; }   // ★没货可运 + 开了「闲车自动接活」→ 去帮人运货赚脚费(不占自家货)
  }
}
// ★闲车一键接活:把所有空闲马车派去帮人运货挣脚费(没自家货可卖时也能赚)
function dispatchIdleHaul(){
  const cap=cartDrivers(); let busy=(S.carts||[]).filter(c=>c.leg!=="idle").length, n=0;
  for(const c of (S.carts||[])){ if(c.leg!=="idle"||busy>=cap) continue;
    const dist=6+Math.floor(Math.random()*13); c.leg="haul"; c.day=dist; c.haulDist=dist; c.load=0; busy++; n++; }
  toast(n?`🐎 派 ${n} 辆闲车接外单挣脚费(陆续归来结清)`:(busy>=cap?'没空闲车夫驾车(去牙行雇车夫)':'没有空闲马车'));
  render(); save(true);
}
function toggleAutoHaul(){ S.autoHaul=!S.autoHaul; toast(S.autoHaul?"🐎 闲车自动接活:开(没货可运的车自动去帮运赚脚费)":"闲车自动接活:关"); render(); save(true); }
// ★院子粮仓(全家人口吃饭) vs 可交易库房(S.goods,卖货/喂牲畜/工坊用)。马车只动可交易,绝不碰院子;管家把粮从可交易拨进院子
function homeGrain(){ return (S.home&&S.home.grain)||0; }
function humanFoodMonthly(){ return S.workers*0.22 + famEat(); }            // 人口月口粮
function foodTarget(){ return Math.ceil(humanFoodMonthly()*12); }           // 院子常备 12 个月人口粮
function allocHome(){ if(!S.home)S.home={grain:0}; const need=foodTarget()-(S.home.grain||0);   // 管家:从可交易拨粮进院子,补到常备线
  if(need>0){ const spare=(S.goods.grain||0)-tradeGrainKeep(); const mv=Math.min(need, Math.max(0,spare));   // 只拨"留够牲畜/工坊用量之外"的余粮,免抽空可交易粮饿停牲畜/工坊
    if(mv>0){ S.home.grain=(S.home.grain||0)+mv; S.goods.grain=(S.goods.grain||0)-mv; } } }
function homeEat(amt){ if(!S.home)S.home={grain:0}; const f=Math.min(amt, S.home.grain||0); S.home.grain=(S.home.grain||0)-f; return amt-f; }   // 人口从院子吃,返回欠量
function tradeGrainKeep(){   // 可交易里给牲畜+用粮工坊留 ~3 个月(让它们不停;人不在这吃,在院子)
  let m=0; for(const b of deptItems("barn")) m+=(ANIMALS[b.animal]&&ANIMALS[b.animal].feed)||0;
  for(const t in DEFS){ const d=DEFS[t]; if(d.kind!=="work") continue; const gi=wsInputs(d).find(x=>x.g==="grain"); if(gi) m+=gi.amt*deptManaged(t); }   // 任一原料用粮的作坊都留量
  return Math.ceil(m*3);
}
function cartStatus(c, freeDrv){
  const m=S.markets[c.dest];
  if(c.leg==="out") return `🚚 运 ${c.load.toFixed(0)} ${GNAME[c.cargo]} → ${m?m.n:''} · 还 ${c.day} 天到`;
  if(c.leg==="haul") return `🐎 帮运外单中 · 还 ${c.day} 天归(脚费)`;
  if(c.leg==="tbuy"){ const tr=c.trade||{}; return `🏯 赴 ${S.markets[tr.buy]?S.markets[tr.buy].n:''} 进${GNAME[tr.good]||''} · 还 ${c.day} 天`; }
  if(c.leg==="tsell"){ const tr=c.trade||{}; return `🏯 贩运 ${c.load.toFixed(0)} ${GNAME[c.cargo]} → ${S.markets[tr.sell]?S.markets[tr.sell].n:''} · 还 ${c.day} 天`; }
  if(c.leg==="back") return `↩ 返程 · 还 ${c.day} 天`;
  if(!freeDrv) return `<span class="warn">💤 没车夫驾(去牙行雇车夫)</span>`;
  if(!c.pin){   // 自动:看仓里有没有任何可外运余货
    return cartAutoGoods().some(g=>cargoSurplus(g)>=1) ? `🟢 待发(自动挑最划算的市,下日上路)` : `<span class="warn">💤 仓里暂无余货可运(攒够再运)</span>`;
  }
  if(!c.cargo) return `<span class="warn">💤 未配货(点「配货卖」选)</span>`;
  const keep=tradeKeep(c.cargo);
  if(G(c.cargo)-keep<1){
    if(BUILD_MAT_KEEP[c.cargo]&&G(c.cargo)>0) return `<span class="warn">💤 ${GNAME[c.cargo]}留作营造/添置 · 不外运(多了才运)</span>`;
    return c.cargo==="grain"&&G("grain")>0 ? `<span class="warn">💤 可交易粮不多(留牲畜/工坊用)·秋收有余再运</span>` : `<span class="warn">💤 库里没${GNAME[c.cargo]}·改装别的货</span>`;
  }
  const load=Math.min(cartCap(c), Math.floor(G(c.cargo)-keep)), e=m?sellEstimate(c.dest,c.cargo,load):{rev:0};
  return `📌 钉:运 ${load} ${GNAME[c.cargo]} → ${m?m.n:''} ≈ ${e.rev}两`;
}
// 买/造/升级马车(分档:板车→骡车→大车→重载骡队)
function newCart(tier){ return {id:++_id, dest:"local", cargo:"grain", leg:"idle", day:0, load:0, tier:tier||1}; }
function buyCart(tier){ tier=tier||1; const T=CART_TIERS[tier-1]; if(!T)return;
  if(S.silver<T.buy){ toast(`买${T.n}需 ${T.buy} 两`); return; }
  S.silver-=T.buy; if(!S.carts)S.carts=[]; S.carts.push(newCart(tier));
  toast(`🛒 添了一辆${T.n}(载 ${T.cap} 石)`); logMsg(`🛒 买${T.n}一辆`); reopenCartUI(); render(); save(true); }
function hasCarpentry(){ return deptItems("carpentry").length>0; }
function craftCart(tier){ tier=tier||1; const T=CART_TIERS[tier-1]; if(!T)return;
  if(!hasCarpentry()){ toast("造车需先有木作坊(产业→林木→木作坊)"); return; }
  if(G("wood")<T.wood){ toast(`造${T.n}需 ${T.wood} 木(林场→木作坊)`); return; }
  if(S.silver<T.craft){ toast(`造${T.n}还需 ${T.craft} 两工料银`); return; }
  addG("wood",-T.wood); S.silver-=T.craft; if(!S.carts)S.carts=[]; S.carts.push(newCart(tier));
  toast(`🪚 木作坊打造一辆${T.n}(载 ${T.cap} 石)`); logMsg(`🪚 木作坊造${T.n}`); reopenCartUI(); render(); save(true); }
function upgradeCart(id, mode){ const c=cartById(id); if(!c)return; if(c.leg!=="idle"){ toast("在途中,回来再升级"); return; }
  const t=(c.tier||1); if(t>=CART_TIERS.length){ toast("已是最大「重载骡队」"); return; }
  const cur=CART_TIERS[t-1], nx=CART_TIERS[t];
  if(mode==="craft"){ if(!hasCarpentry()){ toast("木作坊改装需先有木作坊"); return; }
    const w=Math.max(0,nx.wood-cur.wood), s=Math.max(0,nx.craft-cur.craft);
    if(G("wood")<w){ toast(`改装${nx.n}需补 ${w} 木`); return; } if(S.silver<s){ toast(`改装${nx.n}需补 ${s} 两`); return; }
    addG("wood",-w); S.silver-=s; }
  else { const s=Math.max(0,nx.buy-cur.buy); if(S.silver<s){ toast(`升${nx.n}需补差价 ${s} 两`); return; } S.silver-=s; }
  c.tier=t+1; toast(`⬆ ${cur.n} 升为「${nx.n}」(载 ${cur.cap}→${nx.cap} 石)`); logMsg(`⬆ 马车升${nx.n}`); reopenCartUI(); render(); save(true); }
function reopenCartUI(){ if(!$("#modal").classList.contains("hidden") && $("#modal").dataset.kind==="cartshop") openCartShop(); }
// ★派车队:有镖头才能编队;所有空闲车(够车夫)整队拉一个城,各按车档装货,到城当场卖
function dispatchFleet(dest, good){
  if(!hasCaptain()){ toast("编队需先雇『镖头』当队长(城镇→牙行)"); return; }
  if(!S.markets[dest]){ toast("目的地无效"); return; }
  const idle=(S.carts||[]).filter(c=>c.leg==="idle"); if(!idle.length){ toast("没有空车可编队"); return; }
  let freeDrv=cartDrivers()-S.carts.filter(c=>c.leg!=="idle").length;
  if(freeDrv<=0){ toast("没空闲车夫驾车(去牙行雇车夫,每辆车要 1 名)"); return; }
  const used={}, plan=[]; const avail=g=>Math.floor(cargoSurplus(g)-(used[g]||0));
  for(const c of idle){ if(freeDrv<=0) break;
    let g=good, load;
    if(g && avail(g)>=1){ load=Math.min(cartCap(c), avail(g)); }
    else { // 智能混装:挑当下最赚的余货
      let best=null; for(const gg of cartAutoGoods()){ const a=avail(gg); if(a<1) continue; const e=sellEstimate(dest,gg,Math.min(cartCap(c),a)); if(!best||e.rev>best.rev) best={g:gg, load:Math.min(cartCap(c),a)}; }
      if(!best) continue; g=best.g; load=best.load; }
    addG(g,-load); c.cargo=g; c.dest=dest; c.load=load; c.leg="out"; c.day=tripDays(S.markets[dest].dist); c.fleet=true;
    used[g]=(used[g]||0)+load; freeDrv--; plan.push({g,load});
  }
  if(!plan.length){ toast("仓里暂无余货可装(留够口粮/原料/建材之外才运)"); return; }
  const totalLoad=plan.reduce((s,p)=>s+p.load,0), kinds=[...new Set(plan.map(p=>GNAME[p.g]))].join("/");
  toast(`🚩 车队出发:${plan.length} 辆载 ${totalLoad} 石(${kinds})赴 ${S.markets[dest].n}!`); logMsg(`🚩 车队 ${plan.length}辆→${S.markets[dest].n}(${totalLoad}石)`);
  closeModal(); render(); save(true);
}
// ★帮人运货:空闲马车接外单赚脚费(占车+车夫若干天,接镖局字号、遇匪有险)。接单前先预览天数/脚费/风险
function haulQuote(){ const dist=6+Math.floor(Math.random()*13), fame=(S.escort&&S.escort.fame)||0;   // 6~18 天的外单
  const feeMid=Math.round(dist*(5+fame*0.3)*1.1), risk=Math.round(Math.min(0.3, 0.06+dist*0.012)*Math.pow(0.78, svc("guard"))*100);
  return {dist, feeMid, risk}; }
function openHaulOrder(id){
  const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return;
  if(c.leg!=="idle"){ toast("此车在途中,回来再接"); return; }
  if(S.carts.filter(x=>x.leg!=="idle").length>=cartDrivers()){ toast("没空闲车夫驾车(去牙行雇车夫)"); return; }
  const q=haulQuote();
  let h=`<h2>🐎 帮人运货</h2><div class="desc">空车接趟外单挣脚费,回来攒镖局「字号」。路上可能遇匪(护院减险、字号高可报号化解)。</div>`;
  h+=`<div class="desc" style="text-align:left;background:rgba(179,137,47,.1);padding:8px 10px;border-radius:8px">这趟:约 <b>${q.dist}</b> 天 · 脚费约 <b style="color:var(--good)">${q.feeMid}</b> 两 · 遇匪风险 <b style="color:${q.risk>15?'var(--bad)':'var(--ink)'}">${q.risk}%</b>${(S.escort&&S.escort.fame)?` · 字号 ${S.escort.fame}`:''}</div>`;
  h+=`<button class="opt devcard" onclick="takeHaulOrder('${id}',${q.dist})"><b>接这趟(${q.dist}天)</b></button>`;
  modal(h);
}
function takeHaulOrder(id, dist){
  const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return;
  if(c.leg!=="idle"){ toast("此车在途中,回来再接"); return; }
  if(S.carts.filter(x=>x.leg!=="idle").length>=cartDrivers()){ toast("没空闲车夫驾车(去牙行雇车夫)"); return; }
  dist=dist||(6+Math.floor(Math.random()*13));
  c.leg="haul"; c.day=dist; c.haulDist=dist; c.load=0;
  toast(`🐎 接了趟外单(约 ${dist} 天),归来付脚费`); logMsg(`🐎 马车接外单(${dist}天)`); closeModal(); render(); save(true);
}
function resolveHaul(c){   // ★结果攒进 S.haulAcc,月底「行商报账」一并汇总,不再每辆车弹 toast(治多车自动接活刷屏)
  const dist=c.haulDist||10, fame=(S.escort&&S.escort.fame)||0;
  let fee=Math.round(dist*(5+fame*0.3)*(0.8+Math.random()*0.6));
  const risk=Math.min(0.3, 0.06+dist*0.012)*Math.pow(0.78, svc("guard"));
  if(!S.haulAcc) S.haulAcc={n:0, fee:0, robbed:0};
  if(Math.random()<risk){
    if(Math.random()<Math.min(0.9, fame*0.1)){ S.silver+=fee; if(S.escort)S.escort.fame=fame+1; }   // 报字号化解,照拿脚费
    else { fee=Math.round(fee*0.3); S.silver+=fee; if(S.escort)S.escort.fame=Math.max(0,fame-1); S.haulAcc.robbed++; }   // 遭劫只得残值,字号-1
  } else { S.silver+=fee; if(S.escort)S.escort.fame=fame+1; }
  S.haulAcc.n++; S.haulAcc.fee+=fee;
  c.leg="idle"; c.day=0; c.haulDist=0;
}
// ★跨城套利:远城进货价(批发低于市价,特产更便宜)→ 运到价高的城卖
function cityBuyPrice(mid, g){ const m=S.markets[mid]; if(!m) return PRICE[g]||0; const sp=((MARKETS_DEF[mid]&&MARKETS_DEF[mid].cheap)||[]).includes(g); return Math.max(0.5, (PRICE[g]||0)*(m.base||1)*(sp?0.55:0.78)); }
function tradeEstimate(buy, good, sell, budget, cap){   // 用玩家本钱算:进几件、本钱、卖城整车收入、净赚
  const bp=cityBuyPrice(buy,good); budget=Math.min(budget||S.silver, S.silver);
  const qty=Math.min(cap||CART_CAP, Math.floor(budget/Math.max(0.5,bp))), cost=Math.round(qty*bp);
  const rev=qty>0?sellEstimate(sell,good,qty).rev:0;
  return {bp, qty, cost, rev, net:rev-cost}; }
function startTrade(id, buy, good, sell, budget){
  const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return;
  if(c.leg!=="idle"){ toast("此车在途中"); return; }
  if(S.carts.filter(x=>x.leg!=="idle").length>=cartDrivers()){ toast("没空闲车夫驾车(去牙行雇车夫)"); return; }
  if(buy===sell){ toast("进货城与卖货城需不同"); return; }
  if(S.silver<cityBuyPrice(buy,good)){ toast("本钱不足以进货"); return; }
  c.trade={buy, good, sell}; c.tbudget=Math.min(budget||S.silver, S.silver); c.leg="tbuy"; c.day=S.markets[buy].dist; c.cargo=good; c.load=0;
  toast(`🏯 马车赴 ${S.markets[buy].n} 进 ${GNAME[good]}(${S.markets[buy].dist}天)`); logMsg(`🏯 贩运:${S.markets[buy].n}进${GNAME[good]}→${S.markets[sell].n}卖`);
  closeModal(); render(); save(true);
}
function tradeBuyArrive(c){
  const tr=c.trade;
  if(!tr || !S.markets[tr.buy] || !S.markets[tr.sell] || !tr.good){ c.leg="idle"; c.load=0; c.day=0; c.trade=null; c.tcost=0; return; }   // 防腐坏单:无效贩运→收车,别崩
  const bp=cityBuyPrice(tr.buy, tr.good);
  const budget=Math.min(c.tbudget||S.silver, S.silver), qty=Math.min(cartCap(c), Math.floor(budget/Math.max(0.5,bp)));   // ★用玩家定的本钱(不再偷偷花一半银子),按车档装
  if(qty<1){ toast(`🏯 ${S.markets[tr.buy].n}进货本钱不足,空车而返`); c.leg="back"; c.day=S.markets[tr.buy].dist; c.load=0; c.tcost=0; return; }
  const cost=Math.round(qty*bp); S.silver-=cost; c.load=qty; c.cargo=tr.good; c.tcost=cost;
  toast(`🏯 ${S.markets[tr.buy].n}进 ${qty} ${GNAME[tr.good]}(本钱 -${cost}两),转运 ${S.markets[tr.sell].n}`);
  c.leg="tsell"; c.day=S.markets[tr.sell].dist;
}
function tradeSellArrive(c){
  const tr=c.trade||{}, m=S.markets[tr.sell];
  if(!m){ if(c.load>0) cartSell("local", c.cargo, c.load); c.leg="idle"; c.load=0; c.day=0; c.trade=null; return; }   // 防腐坏:卖货城失效→就近卖本地,收车
  let load=c.load;
  if(m && Math.random()<(m.risk||0)*Math.pow(0.78, svc("guard"))*(hasCaptain()?TUNE.captainRiskMul:1)){ const loss=Math.round(load*(0.4+Math.random()*0.5)); load-=loss;
    toast(`🐎 ${m.n}途中遇匪!折 ${loss} ${GNAME[c.cargo]}`); logMsg(`🐎 贩运途中遇匪,折货 ${loss} ${GNAME[c.cargo]}`); }
  if(load>0){ const r=cartSell(tr.sell, c.cargo, load); const cost=c.tcost||0;   // ★当场卖掉,显示本趟净赚(扣进货本钱)
    toast(`🏯 ${m.n} 贩出 ${load} ${GNAME[c.cargo]},得 ${r.rev} 两${cost?`(本钱-${cost}→净${r.rev-cost>=0?'+':''}${r.rev-cost})`:''}`); logMsg(`🏯 ${m.n}贩出 ${GNAME[c.cargo]} ${load} → +${r.rev}两${cost?`(净${r.rev-cost})`:''}`); }
  c.load=0; c.leg="back"; c.day=m.dist; c.trade=null; c.tcost=0;
}
function setCartDest(id){ const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return; if(c.leg!=="idle"){ toast("在途中,回来再改路线"); return; } const ks=Object.keys(S.markets), i=ks.indexOf(c.dest); c.dest=ks[(i+1)%ks.length]; c.pin=true; render(); save(true); }
function hasManager(){ return svc("steward")>0 || (S.kids||[]).some(k=>k.post==="market"&&k.age>=10); }   // 管家 或 子女任掌柜→智能装车更优
function cargoSurplus(g){ return Math.max(0, G(g) - tradeKeep(g)); }   // 可外运余量(扣留量:粮→牲畜/工坊;木/砖/农具→营造/添置)
// 跨城贩运下单
function openTradeRoute(id){
  const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return; if(c.leg!=="idle"){ toast("在途中,回来再配"); return; }
  const cities=Object.keys(S.markets).filter(k=>k!=="local"), goods=cartGoods();
  const opt=(arr,nm,val)=>arr.map(k=>`<option value="${k}" ${k===val?"selected":""}>${nm(k)}</option>`).join("");
  let h=`<h2>🏯 跨城贩运</h2><div class="desc">在便宜的城进货、运到贵的城卖,赚差价(占车+路上有匪险)。各城有特产更便宜。</div>`;
  h+=`<div class="admrow"><span>进货城</span><select id="trBuy" onchange="tradeEst('${id}')">${opt(cities,k=>S.markets[k].n,cities[0])}</select></div>`;
  h+=`<div class="admrow"><span>货物</span><select id="trGood" onchange="tradeEst('${id}')">${opt(goods,k=>GNAME[k],goods[0])}</select></div>`;
  h+=`<div class="admrow"><span>卖货城</span><select id="trSell" onchange="tradeEst('${id}')">${opt(cities,k=>S.markets[k].n,cities[cities.length-1])}</select></div>`;
  h+=`<div class="admrow"><span>本钱</span><select id="trBudget" onchange="tradeEst('${id}')"><option value="cart">买满一车</option><option value="1000">投 1000 两</option><option value="full">全投</option></select></div>`;
  h+=`<div class="desc" id="trEst" style="text-align:left"></div>`;
  h+=`<button class="opt devcard" onclick="confirmTrade('${id}')"><b>确认贩运</b></button>`;
  modal(h); tradeEst(id);
}
function cartById(id){ return (S.carts||[]).find(x=>String(x.id)===String(id)); }
function tradeBudget(buy, good, cap){ const mode=($("#trBudget")&&$("#trBudget").value)||"cart"; const bp=cityBuyPrice(buy,good);
  return mode==="full"?S.silver : mode==="1000"?1000 : Math.ceil((cap||CART_CAP)*bp); }   // 满一车=装满该车本钱
function tradeEst(id){ const b=$("#trBuy").value, g=$("#trGood").value, s=$("#trSell").value, el=$("#trEst"); if(!el)return;
  if(b===s){ el.innerHTML=`<span class="warn">进货城与卖货城需不同</span>`; return; }
  const cap=cartCap(cartById(id)), e=tradeEstimate(b,g,s, tradeBudget(b,g,cap), cap), risk=Math.round((S.markets[s].risk||0)*Math.pow(0.78,svc("guard"))*100);
  el.innerHTML = `${S.markets[b].n}进 <b>${e.qty}</b> ${GNAME[g]}(本钱 <b>${e.cost}</b> 两)→ ${S.markets[s].n}卖得 ≈<b>${e.rev}</b> 两 · 净赚 ≈<b style="color:${e.net>0?'var(--good)':'var(--bad)'}">${e.net>=0?'+':''}${e.net}</b> 两${e.net<=0?'(亏,换组合)':''} · 路上遇匪 ${risk}%`; }
function confirmTrade(id){ const b=$("#trBuy").value, g=$("#trGood").value; startTrade(id, b, g, $("#trSell").value, tradeBudget(b,g,cartCap(cartById(id)))); }
function openCartCargo(id){
  const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return; if(c.leg!=="idle"){ toast("在途中,回来再配"); return; }
  let h=`<h2>🐴 这辆马车装什么卖</h2><div class="desc">选一样货,自动送往最划算的市(车上「→」可改送别处)。配好这条线就自己跑。</div>`;
  h+=`<button class="opt devcard" onclick="smartLoadCart('${id}')">🧠 智能配货 <span style="float:right;color:var(--accent);font-weight:700">挑最赚的货+市</span></button>`;
  h+=`<div class="bgroup">挑货卖(显示满车去最划算的市预计得多少)</div>`;
  const rows=cartGoods().map(g=>{ const sp=Math.floor(cargoSurplus(g)); if(sp<1) return null; const load=Math.min(cartCap(c),sp);
    let best=null; for(const mid in S.markets){ const e=sellEstimate(mid,g,load); if(!best||e.rev>best.rev) best={mid,rev:e.rev}; }
    return {g, sp, load, best}; }).filter(Boolean).sort((a,b)=>b.best.rev-a.best.rev);
  if(!rows.length) h+=`<div class="hint">仓里暂无可外运余货(留够口粮/原料/建材之外才运)</div>`;
  for(const x of rows){ const cur=c.cargo===x.g&&c.dest===x.best.mid;
    h+=`<button class="opt ${cur?"cur":""}" onclick="assignCart('${id}','${x.g}','${x.best.mid}')">${GNAME[x.g]}${cur?" ✓":""} <span style="float:right;color:var(--accent);font-weight:700">${S.markets[x.best.mid].n}≈${x.best.rev}两</span><small>余 ${x.sp} · 满车 ${x.load} 件 → 最划算的 ${S.markets[x.best.mid].n}</small></button>`; }
  modal(h);
}
function assignCart(id,g,mid){ const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return; c.cargo=g; c.dest=mid; c.pin=true; closeModal(); render(); save(true); toast(`🐴 钉定:运 ${GNAME[g]} → ${S.markets[mid]?S.markets[mid].n:''}(这辆守此线)`); }
function setCartAuto(id){ const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return; c.pin=false; toast("↺ 这辆改回自动(每趟自己挑最划算的市)"); render(); save(true); }
function pickCartCargo(id,g){ const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return; c.cargo=g; c.pin=true; closeModal(); render(); save(true); }
// 单辆智能配货:挑收入最高的(货×市)组合(按 sellEstimate)
function _smartLoad(c){
  const surps=cartAutoGoods().filter(g=>cargoSurplus(g)>1); if(!surps.length) return false;
  let best=null;
  for(const g of surps){ const load=Math.min(cartCap(c), Math.floor(cargoSurplus(g)));
    for(const mid in S.markets){ if(mid==="local") continue; const e=sellEstimate(mid,g,load); if(!best||e.rev>best.rev) best={g, dest:mid, rev:e.rev}; } }   // ★马车专跑远城(本地集市村民自己上门买,不占车)
  if(!best) return false; c.cargo=best.g; c.dest=best.dest; return true;
}
function smartLoadCart(id){ const c=(S.carts||[]).find(x=>String(x.id)===String(id)); if(!c)return;
  c.pin=false;   // 智能配=交回自动(每趟自己挑)
  if(_smartLoad(c)) toast(`🧠 安排:装 ${GNAME[c.cargo]} 运往 ${S.markets[c.dest].n}(自动)`);
  else toast("仓里暂无余货可运");
  closeModal(); render(); save(true); }
// ★一键派车卖货:给所有空车智能配货+定目的地+立刻上路。按 sellEstimate 选最赚组合,边派边模拟 glut→自动铺开不砸单市
function dispatchAll(){
  const idle=(S.carts||[]).filter(c=>c.leg==="idle"); if(!idle.length){ toast("没有空车待派"); render(); return; }
  let freeDrv=cartDrivers()-S.carts.filter(c=>c.leg!=="idle").length;
  if(freeDrv<=0){ toast("没空闲车夫驾车(去牙行雇车夫)"); render(); return; }
  const used={}, sim={}, plan=[];                                   // used=本次已占余货;sim=模拟新增glut(铺开)
  const avail=g=>Math.floor(cargoSurplus(g)-(used[g]||0));
  for(const c of idle){
    if(freeDrv<=0) break;
    let best=null;
    for(const g of cartAutoGoods()){ const a=avail(g); if(a<1) continue; const load=Math.min(cartCap(c),a);
      for(const mid in S.markets){ const e=sellEstimate(mid,g,load, sim[mid+"|"+g]||0); if(!best||e.rev>best.rev) best={g,mid,load,rev:e.rev}; } }
    if(!best) break;
    addG(best.g,-best.load); c.cargo=best.g; c.dest=best.mid; c.load=best.load; c.leg="out"; c.day=S.markets[best.mid].dist;   // 立刻上路
    used[best.g]=(used[best.g]||0)+best.load; sim[best.mid+"|"+best.g]=(sim[best.mid+"|"+best.g]||0)+best.load;
    freeDrv--; plan.push(best);
  }
  if(!plan.length){ toast("仓里暂无余货可运(留够口粮/原料/建材之外才外运)"); render(); return; }
  const sumRev=plan.reduce((s,p)=>s+p.rev,0), brief=plan.slice(0,4).map(p=>`${GNAME[p.g]}→${S.markets[p.mid].n}`).join("、");
  toast(`🚚 派出 ${plan.length} 辆:${brief}${plan.length>4?'…':''} · 预计 +约${sumRev}两`);
  logMsg(`🚚 一键派车 ${plan.length}辆,预计货运 +约${sumRev}两`);
  render(); save(true);
}
// ===== 城里铺面:开/买租/装修/退 + 月入 =====
function decorCost(s){ const lv=s.decor||0; return {silver:Math.round(60*Math.pow(1.85,lv)), brick:6+lv*4, wood:4+lv*3}; }   // 装修递增(砖+木)
function reopenShopCity(city){ if(!$("#modal").classList.contains("hidden") && $("#modal").dataset.kind==='shopcity') openCityShops(city, $("#modal").dataset.focus||null); }
function openCityShops(city, focus){   // focus=某铺位id → 只看那一处(点单座铺进来);不传=看全城铺位
  _curDept=null; _curKid=null;   // 看/买铺不暂停游戏
  const m=S.markets[city], plots=(CITY_PLOTS[city]||[]).filter(p=>!focus||p.id===focus);
  let h=`<h2>🏬 ${m.n} · 铺面</h2><div class="desc">开铺=该城零售出口升级(旺铺人流大→你的货卖得更快更贵);装修可多级。买=永久,租=月扣。</div>`;
  for(const p of plots){ const s=shopFor(p.id);
    if(s){ const T=SHOPTYPES[s.type], dc=decorCost(s), maxed=(s.decor||0)>=DECOR_CAP;
      h+=`<div class="ventcard"><div class="vhead"><span class="vico">${T.ico}</span><b>${p.name} · ${T.n}</b><span class="vtag">${s.own==="buy"?"自有":"月租"+p.rent} · 人流${shopEff(s).toFixed(1)}</span></div><div class="vbody">`;
      h+=`<button class="opt ${(maxed||S.silver<dc.silver||G("brick")<dc.brick||G("wood")<dc.wood)?'dis':''}" onclick="decorShop('${p.id}')">🛠 装修 Lv${s.decor||0}${maxed?'(顶)':`→${(s.decor||0)+1}`} <span style="float:right;color:var(--accent);font-weight:700">${maxed?'已到顶':dc.silver+'两+'+dc.brick+'砖+'+dc.wood+'木'}</span><small>提人流/客单价 + 门第</small></button>`;
      if(s.type==="qinglou"){ const g=s.girls||{};
        h+=`<div class="hint" style="text-align:left">🏮 姑娘:清倌 ${g.qing||0} · 红牌 ${g.hong||0} · 花魁 ${g.hua||0} · 姑娘月入 ${girlMonthly(s).inc} 两</div>`;
        for(const tier of ["qing","hong","hua"]){ const Gd=GIRL[tier], ok=S.silver>=Gd.hire;
          h+=`<button class="opt ${ok?'':'dis'}" ${ok?`onclick="hireGirl('${p.id}','${tier}')"`:''}>🏮 招${Gd.n} <span class="optcost">${Gd.hire}两</span><small>月脂粉${Gd.upkeep} · 人气月入+${Gd.draw} · 官面+${Gd.fav}</small></button>`; }
        if((g.qing||0)>0){ const c=GIRL.hong.hire-GIRL.qing.hire, ok=S.silver>=c; h+=`<button class="opt ${ok?'':'dis'}" ${ok?`onclick="trainGirl('${p.id}','qing')"`:''}>🌸 调教 清倌→红牌 <span class="optcost">${c}两</span></button>`; }
        if((g.hong||0)>0){ const c=GIRL.hua.hire-GIRL.hong.hire, ok=S.silver>=c; h+=`<button class="opt ${ok?'':'dis'}" ${ok?`onclick="trainGirl('${p.id}','hong')"`:''}>🌸 调教 红牌→花魁 <span class="optcost">${c}两</span></button>`; }
        const qcd=Math.max(0,(S.qlBanquetDay??-999)+60-S.day), bok=qcd<=0&&S.silver>=80;
        h+=`<button class="opt ${bok?'':'dis'}" ${bok?`onclick="banquetQinglou('${p.id}')"`:''}>🍷 设宴寻欢·宴官 <span class="optcost">${qcd>0?qcd+'天后':'80两'}</span><small>达官云集,官面大涨 + 声望</small></button>`;
        const fok=(g.hua||0)>=1&&consorts().length<concCap()&&S.silver>=150;
        h+=`<button class="opt ${fok?'':'dis'}" ${fok?`onclick="takeFlower()"`:''}>💞 纳花魁为妾 <span class="optcost">赎身150两</span><small>${(g.hua||0)<1?'需自家有花魁':(concCap()<=0?'升大宅可纳':'内宅 '+consorts().length+'/'+concCap())}</small></button>`;
      }
      if(T.finance==="bank"){ h+=`<button class="opt" onclick="closeModal();openBankSheet()">💰 钱庄事务(存银生息 / 放贷取息) ›</button>`; }
      if(T.finance==="pawn"){ h+=`<button class="opt" onclick="closeModal();openPawnSheet()">🏯 当铺事务(收奇珍 / 典当 / 珍藏) ›</button>`; }
      h+=`<a class="razemini" onclick="closeShop('${p.id}')">退铺</a></div></div>`;
    } else {
      h+=`<div class="ventcard"><div class="vhead"><span class="vico">🏚</span><b>${p.name}</b><span class="vtag">人流 ${p.traffic} · 买${p.buy} / 租${p.rent}月</span></div>
        <div class="vbody"><button class="opt" onclick="openPlot('${city}','${p.id}')">＋ 开铺(选品类 · 买或租)</button></div></div>`;
    }
  }
  modal(h); $("#modal").dataset.kind='shopcity'; $("#modal").dataset.focus=focus||'';   // 记住焦点铺位,装修/招姑娘后 reopenShopCity 仍只看这一处
}
function openPlot(city, plotId){
  const p=plotDef(city,plotId); if(!p)return;
  let h=`<h2>开铺 · ${p.name}</h2><div class="desc">${S.markets[city].n} · 人流 ${p.traffic} · 买断 ${p.buy}两(永久) / 租 ${p.rent}两/月。选品类:</div>`;
  for(const tk in SHOPTYPES){ const T=SHOPTYPES[tk], desc=T.finance?T.d:(T.service?"月入+官面+纳花魁":(T.goods?"旺销 "+T.goods.map(g=>GNAME[g]).join("/"):""));
    h+=`<div class="bgroup" style="margin:8px 0 2px">${T.ico} ${T.n} <small style="color:var(--mut);font-weight:400">${desc}</small></div>
      <div class="lops"><button class="${S.silver<p.buy?'dis':''}" onclick="openShop('${city}','${plotId}','${tk}','buy')">买断<i>${p.buy}两</i></button><button class="${S.silver<p.rent?'dis':''}" onclick="openShop('${city}','${plotId}','${tk}','rent')">租<i>${p.rent}两/月</i></button></div>`;
  }
  modal(h);
}
function openShop(city, plotId, type, mode){
  const p=plotDef(city,plotId); if(!p)return; if(shopFor(plotId)){ toast("此铺位已开"); return; }
  const cost=mode==="buy"?p.buy:p.rent; if(S.silver<cost){ toast(`${mode==="buy"?"买断":"租"}此铺需 ${cost} 两`); return; }
  S.silver-=cost; if(!S.shops)S.shops=[]; S.shops.push({id:plotId, city, type, own:mode, decor:0, girls:{}});
  toast(`🏬 在${S.markets[city].n}${mode==="buy"?"买下":"租下"}「${p.name}」开${SHOPTYPES[type].n}!`); logMsg(`🏬 ${S.markets[city].n}开${SHOPTYPES[type].n}(${p.name})`);
  closeModal(); render(); save(true);
}
function decorShop(plotId){ const s=shopFor(plotId); if(!s)return; if((s.decor||0)>=DECOR_CAP){ toast("已装修到顶"); return; }
  const c=decorCost(s); if(S.silver<c.silver){ toast(`装修需 ${c.silver} 两`); return; } if(G("brick")<c.brick){ toast(`装修需 ${c.brick} 砖(矿场黏土→砖窑)`); return; } if(G("wood")<c.wood){ toast(`装修需 ${c.wood} 木(林场→木作坊)`); return; }
  S.silver-=c.silver; addG("brick",-c.brick); addG("wood",-c.wood); s.decor=(s.decor||0)+1;
  toast(`🛠 「${plotDef(s.city,plotId).name}」装修 → Lv${s.decor}(人流↑、门第涨)`); render(); reopenShopCity(s.city); save(true); }
function closeShop(plotId){ const s=shopFor(plotId); if(!s)return; const city=s.city; S.shops=(S.shops||[]).filter(x=>x!==s); toast("退了一处铺面"); render(); reopenShopCity(city); save(true); }
// ===== 城镇金融:钱庄(存息/放贷坏账)+ 当铺(典当死当)月结 =====
const monthIdx = () => Math.floor(S.day/30);
function hasFinance(ft){ return (S.shops||[]).some(s=>SHOPTYPES[s.type]&&SHOPTYPES[s.type].finance===ft); }
function hasBank(){ return hasFinance("bank"); }
function hasPawn(){ return hasFinance("pawn"); }
function financeMonthly(){
  let inc=0; const notes=[]; const b=S.bank||(S.bank={deposit:0,lent:0});
  if(hasBank()){
    if(b.deposit>0){ b.deposit=Math.round((b.deposit*(1+TUNE.depRate))*100)/100; }   // 存银生息(复利,进余额)
    if(b.lent>0){ const it=Math.round(b.lent*TUNE.loanRate); inc+=it; notes.push(`放贷息+${it}`);   // 放贷取息(进现银)
      if(Math.random()<TUNE.badDebt){ const loss=Math.round(b.lent*(0.1+Math.random()*0.2)); b.lent=Math.max(0,b.lent-loss); notes.push(`⚠坏账-${loss}`); logMsg(`⚠ 钱庄放贷遇赖账,损本金 ${loss} 两`); }
    }
  }
  if(S.pawns&&S.pawns.length){   // 当铺典当逾期 → 死当(货没,银已先得;仅清理记录)
    const live=[]; for(const pw of S.pawns){ if(monthIdx()>=pw.due){ notes.push(`${GNAME[pw.good]||pw.good}死当`); logMsg(`🏯 典当逾期未赎,「${GNAME[pw.good]||pw.good}」死当`); } else live.push(pw); }
    S.pawns=live;
  }
  return {inc, note:notes.join(" ")};
}
function shopMonthly(){ let inc=0, fav=0, rent=0, dishUsed=0;
  for(const s of (S.shops||[])){ const T=SHOPTYPES[s.type], eff=shopEff(s);
    if(s.own==="rent"){ const p=plotDef(s.city,s.id); if(p) rent+=p.rent; }
    if(T.service){ inc+=Math.round(T.svc*eff); fav+=T.favor||0;                     // 青楼:底月入+官面
      if(S.village) S.village.hostility=Math.min(100,(S.village.hostility||0)+2*(1-(S.village.goodwill||0)/100));   // ★争议产业:推高村庄仇视(好感高则涨得少;仇视拖累村庄增长)
      const gi=girlMonthly(s); inc+=gi.inc; fav+=gi.fav; }                          // + 姑娘人气月入(扣脂粉)+官面
    else if(s.type==="jiu"){ inc+=Math.round(T.svc*eff*0.5); fav+=T.favor||0;      // 酒楼:底席面月入+官面
      const cap=Math.ceil(eff*3), served=Math.min(cap, Math.floor(G("dish")));     // ★做菜:供菜越足赚越多(人流封顶)
      if(served>0){ addG("dish",-served); dishUsed+=served; inc+=Math.round(served*PRICE.dish*0.6); }
    }
  }
  return {inc, fav, rent, dishUsed};
}
// ===== 青楼经营:姑娘(清倌/红牌/花魁)+ 培养 + 设宴寻欢 =====
function girlMonthly(s){ let inc=0, fav=0; const g=(s&&s.girls)||{}; for(const t in GIRL){ const n=g[t]||0; if(n){ inc+=Math.round(n*(GIRL[t].draw-GIRL[t].upkeep)); fav+=n*GIRL[t].fav; } } return {inc, fav}; }
function girlCount(s){ let n=0; const g=(s&&s.girls)||{}; for(const t in GIRL) n+=g[t]||0; return n; }
function qinglouWithFlower(){ return (S.shops||[]).find(s=>s.type==="qinglou" && ((s.girls&&s.girls.hua)||0)>0); }
function hireGirl(plotId, tier){ const s=shopFor(plotId), Gd=GIRL[tier]; if(!s||s.type!=="qinglou"||!Gd)return;
  if(S.silver<Gd.hire){ toast(`招${Gd.n}需身价银 ${Gd.hire} 两`); return; }
  S.silver-=Gd.hire; if(!s.girls)s.girls={}; s.girls[tier]=(s.girls[tier]||0)+1;
  toast(`🏮 青楼招了个${Gd.n}(月脂粉 ${Gd.upkeep} 两)`); logMsg(`🏮 青楼招${Gd.n}`); render(); reopenShopCity(s.city); save(true); }
function trainGirl(plotId, tier){ const s=shopFor(plotId), up=GIRL_UP[tier]; if(!s||!up)return;
  if(((s.girls&&s.girls[tier])||0)<1){ toast(`没有${GIRL[tier].n}可调教`); return; }
  const cost=GIRL[up].hire-GIRL[tier].hire; if(S.silver<cost){ toast(`调教成${GIRL[up].n}需 ${cost} 两`); return; }
  S.silver-=cost; s.girls[tier]--; s.girls[up]=(s.girls[up]||0)+1;
  toast(`🌸 ${GIRL[tier].n}调教成 ${GIRL[up].n}!`); logMsg(`🌸 青楼 ${GIRL[tier].n}→${GIRL[up].n}`); render(); reopenShopCity(s.city); save(true); }
function banquetQinglou(plotId){ const s=shopFor(plotId); if(!s||s.type!=="qinglou")return;
  const cd=Math.max(0,(S.qlBanquetDay??-999)+60-S.day); if(cd>0){ toast(`青楼设宴不宜频,还需 ${cd} 天`); return; }
  const cost=80; if(S.silver<cost){ toast(`青楼设宴宴官需 ${cost} 两`); return; }
  const fv=Math.round(10+shopEff(s)*2+girlCount(s)*1.5);
  S.silver-=cost; S.favor=Math.min(100,(S.favor||0)+fv); S.rep=(S.rep||0)+2; S.qlBanquetDay=S.day;
  toast(`🏮 青楼设宴,达官云集!官面 +${fv} · 声望 +2`); logMsg(`🏮 青楼设宴宴官,官面 +${fv}`); render(); reopenShopCity(s.city); save(true); }
function produceDay(){   // 只累积作物/矿/畜到 pending(在长);工坊改月批
  const rb=regentMul(), cb=famBonus("crop")*rb;
  for(const t in DEFS){
    const d=DEFS[t]; if(d.kind==="work") continue;
    const items=deptItems(t); if(!items.length) continue;
    const mng=deptManaged(t);
    for(let i=0;i<items.length;i++){
      if(d.worker>0 && i>=mng) continue;
      const b=items[i];
      if(d.kind==="crop"){ const c=CROPS[b.crop]; const bonus=d.mineral?rb:(S.cropBonus||1)*eduCrop()*fertBonus()*cb; addPend(c.out, c.mo/30*lvlMul(b)*seasonMul(t)*bonus); }   // 操场抬耕作 + 波5施肥增产
      else if(d.kind==="animal"){ const a=ANIMALS[b.animal], feed=a.feed/30; if(G("grain")>=feed){ addG("grain",-feed); addPend(a.out, a.mo/30*lvlMul(b)*rb); if(a.pelt) addPend("pelt", a.pelt/30*lvlMul(b)*rb); if(a.dung) addG("dung", a.dung/30*lvlMul(b)*rb); } }   // 波5:畜产粪肥(直接入库,反哺田庄施肥)   // 饲料每日扣;牛羊副产生皮 pelt
    }
  }
}
function harvestTick(){
  if(S.day%30===0){ releasePending(MONTH_PROD, "月"); releasePending(HARVEST_ANNUAL, "月"); workshopBatch(); }   // ★作物改「按月入库」(原一年秋收一次→作坊常年有料,治"大半年缺料❗");先把料入库再让工坊月批吃料
  if(S.day%90===0) releasePending(HARVEST_SEASON, "季");   // 矿/畜 季收
}
function releasePending(set, tag){
  let got=0; for(const g of set){ const q=pend(g); if(q>0.01){ addG(g,q); S.pending[g]=0; got+=q; } }
  clampStore();
  if(got>0.5){ const lbl=tag==="秋"?"🌾 秋收大丰收":"📦 季收"; if(view==="farm"||view==="town"||view==="home") renderMain(); }
}
function workshopBatch(){   // 每月:各工坊吃仓内原料、产成品进仓(缺料则停产)
  const wb=famBonus("work")*regentMul();
  for(const t in DEFS){ const d=DEFS[t]; if(d.kind!=="work") continue;
    const items=deptItems(t), mng=deptManaged(t); if(!items.length) continue;
    const ins=wsInputs(d);
    for(let i=0;i<items.length;i++){ if(i>=mng) continue; const b=items[i]; const m=lvlMul(b);
      if(ins.every(x=>G(x.g)>=x.amt*m)){ for(const x of ins) addG(x.g,-x.amt*m); addG(d.out, d.outAmt*m*(S.workBonus||1)*eduWork()*wb); }   // 全部原料齐才开工(多原料);学校(脑力/管理)抬作坊产出
    }
  }
  clampStore();
}
// ★活村庄(波1)月结:工资沉淀→村民购买力(月衰减→收敛防爆)、人口logistic(永不过承载K)、好感随基建/欠薪浮动
function villageMonthTick(paid, underpaid){
  const v=S.village; if(!v) return;
  const w0=v.wealth||0, p0=v.pop||0;
  v.wealth=Math.max(0, w0*TUNE.villageWealthDecay + (paid||0)*TUNE.villageWealthShare);   // 均衡≈月工资×share/(1−decay),不无限堆
  const K=villagePopCap();
  v.pop=Math.max(0, Math.min(K, p0 + TUNE.popGrowR*p0*(1-p0/K)*villageGrowthMul()));      // logistic:先快后慢、永不冲过K
  const target=Math.min(100, 25+villageConv()*0.6);                                        // 基建/便利抬好感目标
  v.goodwill=(v.goodwill||0)+(target-(v.goodwill||0))*0.08;
  if(underpaid) v.goodwill-=3;                                                              // 欠薪伤好感
  v.goodwill=Math.max(0, Math.min(100, v.goodwill));
  v.hostility=Math.max(0, (v.hostility||0)-1);                                              // 仇视每月缓慢消退(停争议产业/积德则恢复)
  v.lastDelta={pop:v.pop-p0, wealth:v.wealth-w0};
}
function monthSettle(){
  beginToastBatch();                                                       // ★月结期间琐碎消息(行商报账/慕名来投/书局罚/内宅)收编进大事记,只弹 1 条月结概要
  const workingW=Math.max(0, assignedTotal()-homeLabor())+buildLabor();   // 派活的长工 + 在建营造的长工 都开工钱(免费下田子女不算;闲置不付)
  const wage=workingW*TUNE.wage, swage=servantWage(), food=S.workers*0.22+famEat();   // 工钱/在岗;口粮按2.5石/年≈0.22/月(全员吃)
  const wagesDue=wage+swage, vPaid=Math.min(S.silver,wagesDue), vUnderpaid=S.silver<wagesDue-0.01;   // 活村庄:实付工资沉淀为村民购买力(发不出=欠薪伤好感)
  S.silver=Math.max(0, S.silver-wage-swage);
  villageMonthTick(vPaid, vUnderpaid);   // ★活村庄月结:工资→购买力(衰减收敛)、人口logistic增长、好感
  if(svc("maid")>0) S.rep=(S.rep||0)+svc("maid")*0.3;   // 丫鬟操持排场,声望渐增
  if(S.landmarks&&S.landmarks.charity) S.rep=(S.rep||0)+0.5;   // 义庄赡族,声望月增
  const saltInc=(S.salt&&S.salt.license)?12:0; if(saltInc) S.silver+=saltInc;   // 官盐引稳定月入
  const rentInc=housingRent(); if(rentInc) S.silver+=rentInc;   // 波2房屋出租:宿舍/客栈月租金
  if(fertActive()) addG('dung', -fertNeed());   // 波5:本月给田施肥,耗粪肥
  const bookInc=(S.press&&S.press.open)?(S.everJuren?15:6):0; if(bookInc) S.silver+=bookInc;   // 书局印书月入
  const sm=shopMonthly();   // 城里铺面:酒楼/青楼月入 + 官面;租铺月扣租
  if(sm.inc) S.silver+=sm.inc; if(sm.rent) S.silver=Math.max(0,S.silver-sm.rent); if(sm.fav) S.favor=Math.min(100,(S.favor||0)+sm.fav);
  const fm=financeMonthly();   // 钱庄存息/放贷坏账 + 当铺死当
  if(fm.inc) S.silver+=fm.inc;
  const wm=(typeof warMonthly==='function')?warMonthly():null;   // v2:持城月入 - 军饷军粮(war.js)
  if(wm&&wm.inc) S.silver=Math.max(0,S.silver+wm.inc);
  let note=`📅月结 工钱-${wage.toFixed(1)}${swage>0?` 家仆俸-${swage.toFixed(1)}`:''} 口粮-${food.toFixed(1)}石${saltInc?` 盐引+${saltInc}`:''}${rentInc?` 房租+${rentInc.toFixed(1)}`:''}${bookInc?` 书局+${bookInc}`:''}${sm.inc?` 铺面+${sm.inc}`:''}${sm.dishUsed?`(酒楼用菜${sm.dishUsed})`:''}${sm.rent?` 租-${sm.rent}`:''}${fm.note?' '+fm.note:''}${wm&&wm.note?wm.note:''}`;
  innerCourtTick();   // 内宅:妻妾≥2 偶发争宠/和睦(自动小影响)
  allocHome();   // 月初管家把可交易里的粮拨进院子,补足人口粮
  const short=homeEat(food);   // 人口从院子粮仓吃
  if(short>0){   // ★院子粮仓也见底:先从市集急购口粮(青黄不接买粮),实在没银才会饿走长工(不再一夜崩盘)
    const px=((S.markets&&S.markets.local)?mktPrice(S.markets.local,"grain"):PRICE.grain)*1.25;
    const cost=short*px;
    if(S.silver>=cost){ S.silver-=cost; note+=` ⚠院子存粮告罄,急购口粮 ${short.toFixed(0)}石(-${Math.round(cost)}两)`; logMsg(`⚠ 院子存粮不够,急购口粮 ${short.toFixed(0)} 石(-${Math.round(cost)}两)`); }
    else if(S.workers>0){ loseWorker(); note+=" ⚠缺粮又缺银,走了个长工!"; logMsg(`⚠ 缺粮又缺银,走了一个长工`); }
  }
  autoLabor();
  if(typeof warAutoLabor==='function') warAutoLabor();   // v2 乱世:把空闲长工自动补进产业(v1浓缩,后勤自运转)
  // 波3:研究院已停产科技点(改由学校[作坊]+操场[耕作]的真实设施效果);老档剩余 S.tech 仍可在旧研究院花完
  if(S.press&&S.press.open && Math.random()<0.03){ const fine=30; S.silver=Math.max(0,S.silver-fine); toast(`📛 书局售违碍书,触文网被查禁,罚银 ${fine} 两`); }
  marketReport();   // 行商月报账(各市卖出+进账)
  endToastBatch(); toast(note); save(true); pulseHUD();
  if(view==="market"||view==="city") renderMain();   // 庄园不每月重绘(消除"一弹一弹"闪动);命脉条数字仍随挂机走
}

// ===== 人手:总池 + 各部门 assign + 自动来走 + 招贤 + 牙行 =====
function loseWorker(){ if(S.workers>0)S.workers--; clampAssign(); }
function mostAssigned(){ let mx=0,mt=null; for(const t in S.assign){ if(S.assign[t]>mx){mx=S.assign[t];mt=t;} } return mt; }
function laborInfo(){ return { recruit:12+S.workers*2, buy:4+Math.floor(S.workers/3), cd:Math.max(0,(S.recruitDay??-999)+120-S.day) }; }
function autoLabor(){ const cap=Math.min(workerCap(), villageLaborPool()); if(S.workers<cap){ const p=Math.min(0.6,0.08+tierIdx()*0.05+(S.rep||0)*0.01); if(Math.random()<p){ S.workers++; toast("🚶 有人慕名来投,添了个长工(空闲,记得派工)"); } } }   // 慕名来投=本村人,封顶村庄可招劳力(村人口派生)
function assignDept(t,delta){
  const cur=S.assign[t]||0;
  if(delta>0 && freeW()<=0){ toast("没有空闲长工了,先招人"); return; }
  S.assign[t]=Math.max(0,cur+delta); render(); reopenDept(t); save(true);
}
function doRecruit(){
  const info=laborInfo(), cap=Math.min(workerCap(), villageLaborPool());   // 招贤=本村招,封顶村庄可招劳力
  if(info.cd>0){ toast(`招贤大会还需 ${info.cd} 天`); return; }
  if(S.workers>=workerCap()){ toast("住不下了,先建房屋/宅院提可雇上限"); return; }
  if(S.workers>=cap){ toast("本村闲人已招尽,改派马车赴外村招工"); return; }
  if(S.silver<info.recruit){ toast(`办招贤大会需 ${info.recruit} 两`); return; }
  S.silver-=info.recruit; S.recruitDay=S.day;
  const come=Math.min(cap-S.workers, 2+Math.floor(Math.random()*3));
  S.workers+=come; toast(`📢 招贤大会摆酒,来了 ${come} 个长工投奔!(空闲,记得派工)`); render(); reopenBroker(); save(true);
}
function doBuyLabor(){
  const info=laborInfo(), cap=Math.min(workerCap(), villageLaborPool());
  if(S.workers>=workerCap()){ toast("住不下了,先建房屋/宅院提可雇上限"); return; }
  if(S.workers>=cap){ toast("本村闲人已招尽,改派马车赴外村招工"); return; }
  if(S.silver<info.buy){ toast(`牙行买人需 ${info.buy} 两`); return; }
  S.silver-=info.buy; S.workers++; toast("🧍 牙行买了个长工(空闲,记得派工)"); render(); reopenBroker(); save(true);
}
function recruitAfar(){   // 本村招尽 → 派马车赴外村招外来工(更贵,只受 workerCap 房屋上限;外来工住客栈/宿舍)
  if(S.workers>=workerCap()){ toast("住不下了,先建房屋/宅院提可雇上限"); return; }
  const cost=Math.round((12+S.workers*2)*1.8);
  if(S.silver<cost){ toast(`派马车赴外村招工需 ${cost} 两`); return; }
  S.silver-=cost; S.workers++; toast("🐎 马车赴外村,招来 1 个外来工(空闲,记得派工)"); logMsg("🐎 外村招工 +1"); render(); reopenBroker(); save(true);
}
// 牙行·人市:招长工 + 雇家仆 + 买童养媳/婢女(买人统一去处)
function openBroker(){
  _curDept=null; _curKid=null;   // 看/买不暂停游戏(挂机继续);只有真意外(死/灾/事件)才停
  const cap=workerCap(), info=laborInfo();
  let h=`<h2>🏯 牙行 · 人市</h2><div class="desc">招工、雇仆、买卖人口的去处。</div>`;
  const lcap=Math.min(cap, villageLaborPool()), localTapped=S.workers>=lcap, afar=Math.round((12+S.workers*2)*1.8);
  h+=`<div class="bgroup">招募长工 <small style="color:var(--mut);font-weight:400">人手 ${S.workers}/${cap} · 本村可招 ${Math.max(0,lcap-S.workers)}(村可招力 ${villageLaborPool()}) · 空闲 ${freeW()}</small></div>`;
  h+=`<button class="opt ${(info.cd>0||S.silver<info.recruit||localTapped)?'dis':''}" onclick="doRecruit()">📢 招贤大会 <span style="float:right;color:var(--accent);font-weight:700">${info.cd>0?info.cd+'天后':info.recruit+'两'}</span><small>本村摆酒招一批(2~4 人)</small></button>`;
  h+=`<button class="opt ${(localTapped||S.silver<info.buy)?'dis':''}" onclick="doBuyLabor()">🧍 牙行买长工 <span style="float:right;color:var(--accent);font-weight:700">${info.buy}两</span><small>本村单买一个</small></button>`;
  h+=`<button class="opt ${(S.workers>=cap||S.silver<afar)?'dis':''}" onclick="recruitAfar()">🐎 外村招工 <span style="float:right;color:var(--accent);font-weight:700">${afar}两</span><small>${localTapped?'本村已招尽,派马车赴外村招外来工':'(更贵,招满本村人再用)'}</small></button>`;
  h+=servantHTML();
  h+=`<div class="bgroup">买幼女回养 <small style="color:var(--mut);font-weight:400">养到 ${WARD_GROWN} 岁可用</small></div>`;
  for(const k in WARD_BUY){ const w=WARD_BUY[k];
    h+=`<button class="opt ${S.silver<w.cost?'dis':''}" onclick="buyWard('${k}')">${w.ico} 买${w.n} <span style="float:right;color:var(--accent);font-weight:700">身价 ${w.cost}两</span><small>${w.d}</small></button>`; }
  modal(h); $("#modal").dataset.kind='broker';
}
function reopenBroker(){ if(!$("#modal").classList.contains("hidden") && $("#modal").dataset.kind==='broker') openBroker(); }

