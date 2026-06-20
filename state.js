'use strict';
// [state] 状态对象 S / freshState / seedFarm / 派生量(产能·人口·库容·门第·家族·家仆)
// ===== 状态 =====
let S, _id = 0, speed = 1, timer = null, view = "home", _curDept = null, _curKid = null;
let _userSpeed = 1;   // 玩家选的速度(▶/⏩);季节/事件/继承后恢复到它,别老把快进打回常速
let _sheetReopen = null;   // 当前底部 sheet 的重渲染器(城内/家族等)→ 操作后 render() 自动刷新它,治"点了不自己刷新"
function freshState(){
  return {silver:30, goods:{grain:65, cotton:0, flour:0, wine:0, cloth:15, meat:8, egg:0, mleaf:0, silk:0, satin:0, tealeaf:0, tea:0, iron:0, tool:0}, home:{grain:25}, pending:{},
          workers:6, day:0, surname:"李", ind:[], assign:{}, servants:{}, toolLevel:0, rep:0, recruitDay:-999, cropBonus:1, workBonus:1, chal:0,
          lord:newLord(25), spouse:null, kids:[], wards:[], gen:1, markets:freshMarkets(), report:null, carts:[{id:1, dest:"local", cargo:"grain", leg:"idle", day:0, load:0, tier:1}],
          favor:0, salt:{license:false}, escort:{fame:0}, banquetDay:-999, saltDay:-999, escortDay:-999, qlBanquetDay:-999,
          press:{open:false}, everJuren:false, levy:{mul:1, mood:"照常征赋"}, log:[], tech:0, research:{}, juana:0, landmarks:{}, manor:0, consorts:[], shops:[], curCity:"kaifeng", harmony:0, builds:[], lastYearAssets:0,
          bank:{deposit:0, lent:0}, treasures:[], pawns:[], dangpuDay:-999, gatherDay:-999, dangpuStock:[],
          rooms:{ershou:0, xiangfang:0, houzhao:0, kufang:0}, gardenLv:0, noSell:[], autoHaul:false,
          village:{pop:90, wealth:0, goodwill:30, hostility:0, dorms:0, inns:0, lastDelta:{pop:0,wealth:0}},   // ★活村庄:人口/购买力/好感/仇视;dorms/inns=波2房屋出租(基建仍存 S.landmarks)
          warlord:{on:false, offered:false, offerYear:0, cities:[], troops:0, generals:[], campaigns:[], trainLevel:1, drill:0, relations:{}, allies:[], cityFac:{}, facLoss:{}}};   // v2 乱世层(war.js);cityFac=乱世易主覆盖表/facLoss=势力战损;老档 load 自动补齐
}
function seedFarm(){
  S = freshState();
  addInd("field",{crop:"wheat"}); addInd("field",{crop:"millet"}); addInd("field",{crop:"cotton"});
  addInd("barn",{animal:"pig"}); addInd("house");
  S.workers = 6;
  S.assign = {field:2, barn:1};   // 派3人,3空闲(限时建造起步要≥2工);之后靠营造扩张
  S.goods.wood = 50; S.goods.brick = 30; S.goods.clay = 20;   // 开局备点营造材料(限时建造要木/砖;否则起步无料可建)
  S.lastYearAssets = assets();
}
function addInd(type, opt){
  const d = DEFS[type], b = {id:++_id, type, tier:(opt&&opt.tier)||1};
  if(d.kind==="crop")   b.crop   = (opt&&opt.crop)   || d.def || d.crops[0];
  if(d.kind==="animal") b.animal = (opt&&opt.animal) || d.def || d.animals[0];
  S.ind.push(b); return b;
}

// ===== 工具 =====
const G = k => k==="silver" ? S.silver : (S.goods[k]||0);
function addG(k,v){ if(k==="silver") S.silver=Math.max(0,S.silver+v); else S.goods[k]=Math.max(0,(S.goods[k]||0)+v); }   // 纹银/货品均不为负
const lvlMul = b => Math.pow(2, (b.tier||1)-1);   // 卡等级:每升一级产出翻倍
const TIERNAME = ["","","良","上","顶"];           // 二级=良田 三级=上田 四级=顶田
function indTierTxt(b){ return (b.tier||1)>1 ? TIERNAME[Math.min(b.tier,4)] : ""; }
const deptItems = t => S.ind.filter(b=>b.type===t);
function farmPer(t){ const d=DEFS[t]; let p=d.per||1; if(d.kind==="crop" && !d.mineral) p+=(S.toolLevel||0); return p; }   // 农具:每名长工多管田(矿采不算)
function deptManaged(t){ const d=DEFS[t], n=deptItems(t).length; return d.worker>0 ? Math.min(n,(S.assign[t]||0)*farmPer(t)) : n; }
function assignedTotal(){ let s=0; for(const t in S.assign) s+=S.assign[t]||0; return s; }
function homeLabor(){ return S.kids ? S.kids.filter(k=>k.post==="labor"&&k.age>=10).length : 0; }   // 下田子女=免费劳力
function totalLabor(){ return S.workers + homeLabor(); }
function buildLabor(){ let n=0; for(const b of (S.builds||[])) n+=b.labor||0; return n; }   // 在建占用的长工
function freeW(){ return Math.max(0, totalLabor() - assignedTotal() - buildLabor()); }   // 空闲=总劳力−派工−在建
function manorLv(){ return Math.min(S.manor||0, MANOR.length-1); }
function manor(){ return MANOR[manorLv()]; }
function rooms(){ return S.rooms||(S.rooms={ershou:0,xiangfang:0,houzhao:0,kufang:0}); }
function servCap(role){ return (SERVANTS[role]?SERVANTS[role].cap:0) + manor().servPlus + rooms().ershou + Math.floor(villagePop()/250); }   // 仆役上限:基础 + 大宅 + 耳房 + 村庄人口(后期随村庄扩,不被封死)
function villagePop(){ return (S.village&&S.village.pop)||0; }
function wardCap(){ return manor().wardCap + rooms().houzhao*2; }              // 养女上限:大宅 + 后罩房
function concCap(){ return manor().concCap + rooms().houzhao; }               // 妾上限:大宅 + 后罩房
function workerCap(){ return 6 + deptItems("house").length*6 + manor().worker + rooms().xiangfang*6 + housingWorker() + Math.floor(villagePop()/12); }   // 可雇长工上限:起手 + 宅院 + 大宅 + 厢房 + 村庄房屋(波2) + 村庄人口(后期随村庄扩,招工不被封死)
function storeCap(){ return 200 + deptItems("granary").length*200 + manor().store + rooms().kufang*500; }   // 库容:基础 + 谷仓 + 大宅 + 库房
function assets(){ let g=0;   // 家产=现银 + 你所有的货(院子+可交易+各市货栈+车上) + 产业值;在长未收的不算
  for(const k in S.goods) g+=(S.goods[k]||0)*(PRICE[k]||0);
  for(const k in (S.home||{})) g+=(S.home[k]||0)*(PRICE[k]||0);
  for(const mid in (S.markets||{})){ const st=S.markets[mid].stock||{}; for(const k in st) g+=(st[k]||0)*(PRICE[k]||0); }
  for(const c of (S.carts||[])) if(c.load>0) g+=c.load*(PRICE[c.cargo]||0);
  return Math.round(S.silver+g+S.ind.length*15); }
function tierIdx(){ const a=assets(); let i=0; for(let k=0;k<TIERS.length;k++) if(a>=TIERS[k][0]) i=k;
  while(i>0 && prestige()<(TIER_PRESTIGE[i]||0)) i--;   // 门第不够→压回低阶(顶层须靠功名/捐纳/营造)
  return i; }
function tierIdxByAssets(){ const a=assets(); let i=0; for(let k=0;k<TIERS.length;k++) if(a>=TIERS[k][0]) i=k; return i; }   // 仅看家产(算门第闸口用)
function juanaDeg(){ const j=S.juana||0; return j>0 ? JUANA[j-1].deg : 0; }                       // 捐纳带来的优免等级
function prestige(){   // 门第:功名 + 捐纳 + 地标 + 大宅 + 大家族体面 + 名铺 + 珍藏 + 官面 + 声望
  let p=[0,10,30,60][famDegree()]||0;
  if(S.juana) p+=JUANA[S.juana-1].pres;
  for(const k in (S.landmarks||{})){ if(k==="garden") continue; if(S.landmarks[k]&&LANDMARKS[k]) p+=LANDMARKS[k].pres; }   // garden 已改多级 gardenLv,不在此计
  p+=(GARDEN[S.gardenLv||0]||GARDEN[0]).pres;       // 多级花园门第
  p+=manor().pres;                                  // 大宅门第
  for(const rk in (S.rooms||{})) if(ROOMS[rk]) p+=(S.rooms[rk]||0)*ROOMS[rk].pres;   // 房舍门第
  p+=Math.min(wivesCount()*3, 24);                  // 大家族体面(有顶,不靠堆人冲门第)
  p+=shopPrestige();                                // 城里名铺/装修体面
  p+=treasurePrestige();                            // 奇珍异宝陈列体面
  p+=Math.floor((S.favor||0)/4)+Math.floor((S.rep||0)/8);
  return Math.round(p);
}
// 奇珍异宝:现值(随持有年增值)、陈列门第(有顶,不让纯堆藏品冲爆门第)
function treasureVal(t){ const T=TREASURES[t.key]; if(!T) return 0; const yrs=Math.max(0, yearN()-(t.year||yearN())); return Math.round(T.base*Math.pow(1+T.apprec, yrs)); }
function treasurePrestige(){ let p=0; for(const t of (S.treasures||[])){ const T=TREASURES[t.key]; if(T) p+=T.pres; } return Math.min(p, 120); }
const title = () => TIERS[tierIdx()][1];
function famDegree(){ let d=(S.lord&&S.lord.rank)||0; if(S.kids) for(const k of S.kids) d=Math.max(d,k.rank||0); return d; }   // 家中最高科举功名→优免税
function statusDeg(){ return Math.min(3, Math.max(famDegree(), juanaDeg())); }    // 优免等级:科举功名 与 捐纳 取高
function degMul(){ return [1,0.85,0.6,0.35][statusDeg()]; }                       // 功名/捐纳 优免系数
function levyMul(){ return (S.levy&&S.levy.mul)||1; }                              // 当年朝廷征赋轻重(年景浮动)
function commRate(){ return Math.min(TUNE.commCap, TUNE.commBase*levyMul()*degMul())*svcTaxMul(); }            // 商税率:正常生意卖货抽成(随年景/功名/账房)
function landTax(){ return Math.round(S.ind.length*TUNE.landTaxPer*levyMul()*degMul()*svcTaxMul()); }     // 年田赋:按田产征,朝廷每年不同(账房减负)
function rollLevy(){ const mul=Math.round((0.7+Math.random()*1.0)*100)/100;       // 0.7~1.7,年年不同
  const mood = mul<0.95?"轻徭薄赋" : mul<1.3?"照常征赋" : "朝廷加派(河工·军需)";
  S.levy={mul, mood}; }
const season = () => SEASON[Math.floor((S.day%360)/90)];
const yearN  = () => Math.floor(S.day/360)+1;
function seasonMul(t){ return (season()==="冬" && DEFS[t].kind==="crop" && !DEFS[t].mineral) ? 0.55 : 1; }   // 冬季作物减产;矿采不受季节
function shrineLuck(){ let l=0; for(const b of S.ind) if(b.type==="shrine") l+=(b.tier||1)*0.12; return l; }   // 祠堂提「出高级卡」概率
function academyTier(){ return S.ind.filter(b=>b.type==="academy").length; }   // 研究院座数(营造多建→研究员位/出点更多)
// 田产上限:阶位基线 + 功名优免田额 + 官面买地权。撞墙→须 中举/晋阶/官面 突破(防无脑铺田)
const LAND_BASE=[8,14,22,34,50,72,100,140,190,250];   // 按阶位(tierIdx);↑后早中期田更多,产出不被田墙锁死(治成长循环死锁)
function landUsed(){ return deptItems("field").length+deptItems("paddy").length; }
function landCap(){ return LAND_BASE[Math.min(tierIdx(),LAND_BASE.length-1)] + [0,8,30,80][statusDeg()] + Math.floor((S.favor||0)/8); }
// ===== 活村庄(波1) · 单一真源:状态只 S.village,基建只 S.landmarks,市场只 marketSellTick(local胃口由此派生) =====
function vWork(k){ return !!(S.landmarks && S.landmarks[k]); }   // 基建/善举是否已建(与门第善举共用 S.landmarks 单一存储)
function villageConv(){ let c=10; if(vWork('road'))c+=15; if(vWork('well'))c+=10; if(vWork('bridge'))c+=15; if(vWork('playground'))c+=12; return c; }   // 便利度(基建累加)
function housingWorker(){ const v=S.village||{}; return (v.dorms||0)*HOUSING.dorm.worker + (v.inns||0)*HOUSING.inn.worker; }   // 波2房屋→可雇长工
function housingPop(){ const v=S.village||{}; return (v.dorms||0)*HOUSING.dorm.pop + (v.inns||0)*HOUSING.inn.pop; }            // 波2房屋→村庄人口承载
function housingRent(){ const v=S.village||{}; return (v.dorms||0)*HOUSING.dorm.rent + (v.inns||0)*HOUSING.inn.rent; }         // 波2房屋→月租金
function villagePopCap(){ let k=TUNE.popCapBase; if(vWork('well'))k+=40; if(vWork('charity'))k+=50; if(vWork('market_shed'))k+=30; return Math.round(k+housingPop()); }   // 人口承载 K(井/义仓/集市棚/房屋抬)
function villageMarketShed(){ return (vWork('market_shed')?1.4:1)*(vWork('bridge')?1.15:1); }   // 集市棚/桥:抬本村市场胃口
function villageGrowthMul(){ const v=S.village||{}, g=v.goodwill||0, h=v.hostility||0; return Math.max(0.3, (TUNE.villageOutputLo+(TUNE.villageOutputHi-TUNE.villageOutputLo)*(g/100))*(1-h/200)); }   // 好感→0.6~1.4(安全阀);仇视拖累增长(满仇视×0.5),争议产业推高仇视
function villageMarketSize(){ const base=(S.markets&&S.markets.local&&S.markets.local.size)||10; const w=(S.village&&S.village.wealth)||0; return (base + w/TUNE.perCapitaSpend)*villageMarketShed(); }   // local胃口=静态基线 + 村民购买力叠加(Banished承载式;基线永不改写)
function effMarketSize(mid){ return mid==='local' ? villageMarketSize() : ((S.markets[mid]&&S.markets[mid].size)||5); }   // 市场胃口:local由村庄派生,远城用原 size
function villageLaborPool(){ return Math.floor(((S.village&&S.village.pop)||0)*0.15); }   // 可招劳力(波2接「招工耗本村劳力」)
function villageDev(){ const v=S.village||{}; return Math.round((v.pop||0)*0.3+(v.wealth||0)*0.1+villageConv()*1.5+(v.goodwill||0)); }   // 村庄发展度(展示合成分)
// ★波3:学校(脑力/管理)+操场(体力/劳效) 替换研究院——效果来自真实设施+人,不再是抽象科技点
function scholars(){ let n=svc('tutor')*2; if(S.kids) for(const k of S.kids){ if(k.age>=10 && (k.post==='study'||k.rank)) n++; } return n; }   // 读书人(西席算2,读书/有功名子女各1)
function eduWork(){ return vWork('school') ? Math.min(1.4, 1.08+0.02*scholars()) : 1; }      // 学校:作坊产出↑(读书人越多越高,封顶+40%)
function eduCrop(){ return vWork('playground') ? Math.min(1.3, 1.08+0.003*Math.min(S.workers||0,40)) : 1; }   // 操场:耕作/作物产出↑(长工越多越高,封顶+30%)
function buildSpeedMul(){ return 1 + (vWork('school')?0.15:0) + (vWork('playground')?0.15:0); }   // 学校管理+操场体力→造东西更快
// ★波5 养殖粪反哺:动物产粪肥→田施肥增产(囤够粪肥则田自动施肥,月耗)
function fertNeed(){ return (deptItems('field').length + deptItems('paddy').length) * TUNE.fertPerField; }   // 全田本月所需粪肥
function fertActive(){ return fertNeed()>0 && G('dung') >= fertNeed(); }   // 粪肥够本月施肥
function fertBonus(){ return fertActive() ? TUNE.fertBonus : 1; }          // 施肥→作物增产
// 市场供求:同种货短期卖太多→市价被压低(供过于求),按月回升。逼分散品类,不能靠单一货暴富
function rollTier(){ const luck=shrineLuck(), r=Math.random(); if(r<luck*0.25) return 3; if(r<luck) return 2; return 1; }
// 家族派生量
function consorts(){ return S.consorts||[]; }
function wivesCount(){ return (S.spouse?1:0) + consorts().length; }   // 正妻 + 平妻/妾 总数
function famMembers(){ let n=1; if(S.spouse)n++; n+=consorts().length; n+=(S.kids?S.kids.length:0); n+=(S.wards?S.wards.length:0); return n; }   // 含家主+妻妾+养女
function famEat(){ let f=0.22; if(S.spouse)f+=0.22; f+=consorts().length*0.22; if(S.kids) for(const k of S.kids) f+=(k.age<10?0.1:0.22); if(S.wards) for(const w of S.wards) f+=(w.age<10?0.1:0.22); return f; }  // 月口粮:1人约2.5石/年≈0.22石/月(妻妾/养女也吃)
function famBonus(kind){   // kind: crop|work|market — 子女派职事的全局加成(积)
  let m=1; if(!S.kids) return m;
  for(const k of S.kids){ if(k.age<10) continue;
    if(kind==="crop"  && k.post==="farm")   m+=(k.talent==="勤勉"?0.12:0.08);
    if(kind==="work"  && k.post==="work")   m+=(k.talent==="精明"?0.12:0.08);
    if(kind==="market"&& k.post==="market") m+=(k.talent==="精明"?0.15:0.10);
  }
  return m;
}
function regentMul(){ return (S.lord && S.lord.age<12 && svc("nanny")<=0) ? 0.8 : 1; }   // 幼主临政,全局产出-20%(有奶妈则免)
// 家仆派生量
function svc(r){ return (S.servants && S.servants[r]) || 0; }
function cartCap(c){ return CART_TIERS[Math.min((c&&c.tier||1)-1, CART_TIERS.length-1)].cap; }   // 该车载量(按档)
function cartTierName(c){ return CART_TIERS[Math.min((c&&c.tier||1)-1, CART_TIERS.length-1)].n; }
function hasCaptain(){ return svc("biaotou")>0; }                                                 // 有镖头才能编队
function fleetCap(){ return (S.carts||[]).reduce((s,c)=>s+cartCap(c),0); }
function servantCount(){ let n=0; if(S.servants) for(const r in SERVANTS) n+=svc(r); return n; }
function servantWage(){ let w=0; if(!S.servants) return 0; const disc=svc("steward")>0?0.85:1;   // 管家统管→其余家仆月俸 −15%
  for(const r in SERVANTS){ const c=svc(r); if(!c) continue; w+=c*SERVANTS[r].wage*(r==="steward"?1:disc); } return w; }
function svcTaxMul(){ return Math.pow(0.92, svc("accountant")); }   // 账房:每名税 −8%(积)
function clampAssign(){ while(assignedTotal()>totalLabor()){ const t=mostAssigned(); if(!t)break; S.assign[t]--; if(S.assign[t]<=0)delete S.assign[t]; } }

