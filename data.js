'use strict';
// [data] 静态数据:产业/作物/价格/市场/铺面/阶位/捐纳/地标/大宅/研究/挑战/家族数据 + 紧邻小工具(随 index.html 第1个加载)
/* 大农庄 · 卡片经营 — 数据计算+文字推理型。产业按类型聚合成「部门卡」,二级页管理+派工。 */

// ★可调参数(后台管理页可改/导出;默认=出厂值)。表型数值(价格/各项花费)直接改对应常量表
const TUNE = { wage:0.25, commBase:0.06, commCap:0.22, landTaxPer:1.6, birthBase:0.35, birthConc:0.25,
               retailQ:0.4, retailMatch:0.5, retailP:0.05, tickMs:650, eventRate:0.14,
               depRate:0.005, loanRate:0.025, badDebt:0.05, pawnRate:0.6, pawnMonths:6, pawnInt:0.03, gatherCD:60,
               sellAppetite:10, sellSlope:0.5, sellFloor:0.6, captainRiskMul:0.6, horseSpeed:0.25,
               villageWealthShare:0.7, villageWealthDecay:0.86, perCapitaSpend:1.1, popGrowR:0.06, popCapBase:160, villageOutputLo:0.6, villageOutputHi:1.4,
               fertPerField:0.4, fertBonus:1.18 };   // ★波5养殖粪反哺:每田每月耗粪肥/施肥增产系数   // ★活村庄(波1):工资沉淀率/村财富月衰减/人均消费/人口logistic增长率r/人口承载基线/好感产出乘数下上限

// ===== 数据 =====  per=1个长工能管几处
const DEFS = {
  field:   {n:"旱田", ico:"🌾", cost:{silver:8},  worker:1, per:4, kind:"crop",   crops:["wheat","millet","bean","cotton","radish","mulberry","tea"], def:"wheat"},
  paddy:   {n:"水田", ico:"🌾", cost:{silver:14}, worker:1, per:3, kind:"crop",   crops:["rice"], def:"rice"},
  mill:    {n:"磨坊", ico:"🏯", cost:{silver:30}, worker:1, per:1, kind:"work",   in:"grain",  inAmt:1.5, out:"flour", outAmt:1.0},
  brewery: {n:"酒坊", ico:"🍶", cost:{silver:40}, worker:1, per:1, kind:"work",   in:"grain",  inAmt:2.0, out:"wine",  outAmt:0.6},
  weaver:  {n:"织坊", ico:"🧵", cost:{silver:35}, worker:1, per:1, kind:"work",   in:"cotton", inAmt:1.5, out:"cloth", outAmt:0.8},
  silkworm: {n:"蚕房", ico:"🐛", cost:{silver:45}, worker:1, per:1, kind:"work",  in:"mleaf",  inAmt:2.5, out:"silk",  outAmt:0.9},
  silkweave:{n:"绸坊", ico:"🧧", cost:{silver:60}, worker:1, per:1, kind:"work",  in:"silk",   inAmt:1.3, out:"satin", outAmt:0.7},
  teahouse: {n:"茶坊", ico:"🍵", cost:{silver:45}, worker:1, per:1, kind:"work",  in:"tealeaf",inAmt:2.0, out:"tea",   outAmt:0.8},
  barn:    {n:"畜栏", ico:"🐖", cost:{silver:25}, worker:1, per:2, kind:"animal", animals:["chicken","pig","cow","sheep"], def:"pig"},
  mine:    {n:"矿场", ico:"⛏️", cost:{silver:18}, worker:1, per:4, kind:"crop", mineral:1, crops:["clay","coal","iron"], def:"clay"},
  brickkiln:{n:"砖窑", ico:"🧱", cost:{silver:40}, worker:1, per:1, kind:"work", in:"clay", inAmt:2.0, out:"brick", outAmt:1.0},
  porcelain:{n:"瓷窑", ico:"🏺", cost:{silver:70}, worker:1, per:1, kind:"work", in:"clay", inAmt:2.0, in2:"coal", inAmt2:1.5, out:"porcelain", outAmt:0.5},
  smithy:  {n:"铁匠铺", ico:"⚒️", cost:{silver:55}, worker:1, per:1, kind:"work", in:"iron", inAmt:2.0, out:"tool", outAmt:0.7},
  steelmill:{n:"钢坊", ico:"🔩", cost:{silver:50}, worker:1, per:1, kind:"work", in:"iron", inAmt:2.0, in2:"coal", inAmt2:1.5, out:"steel", outAmt:0.6},   // 钢链:铁+煤→钢(双原料,v2军备料)
  tannery: {n:"皮坊", ico:"🧰", cost:{silver:40}, worker:1, per:1, kind:"work", in:"pelt", inAmt:2.0, out:"leather", outAmt:0.8},   // 皮革链:生皮→皮革(v2皮甲料)
  stable:  {n:"马场", ico:"🐎", cost:{silver:40}, worker:1, per:2, kind:"animal", animals:["horse"], def:"horse"},   // 养马:强化车队 + v2 骑兵料
  forest:  {n:"林场", ico:"🌲", cost:{silver:18}, worker:1, per:4, kind:"crop", mineral:1, crops:["timber"], def:"timber"},   // P3木链:伐木(mineral型=季收无冬减)
  carpentry:{n:"木作坊", ico:"🪚", cost:{silver:50}, worker:1, per:1, kind:"work", in:"wood", inAmt:2.0, out:"furniture", outAmt:0.6},
  oilpress: {n:"油坊", ico:"🛢", cost:{silver:45}, worker:1, per:1, kind:"work", in:"veg", inAmt:2.0, out:"oil", outAmt:0.7},     // 菜籽→油
  sugarmill:{n:"糖坊", ico:"🍬", cost:{silver:50}, worker:1, per:1, kind:"work", in:"grain", inAmt:2.5, out:"sugar", outAmt:0.7}, // 麦芽糖:粮→糖
  papermill:{n:"纸坊", ico:"📜", cost:{silver:55}, worker:1, per:1, kind:"work", in:"wood", inAmt:2.0, out:"paper", outAmt:0.7},  // 造纸耗木
  kitchen: {n:"灶房", ico:"🍳", cost:{silver:45}, worker:1, per:1, kind:"work", in:"grain", inAmt:1.0, in2:"meat", inAmt2:0.8, in3:"veg", inAmt3:0.8, in4:"oil", inAmt4:0.4, out:"dish", outAmt:1.0},   // P3做菜升级:粮+肉+菜+油→菜肴(供酒楼)
  pastry:  {n:"点心坊", ico:"🍰", cost:{silver:55}, worker:1, per:1, kind:"work", in:"flour", inAmt:1.0, in2:"egg", inAmt2:0.6, in3:"sugar", inAmt3:0.5, out:"pastry", outAmt:0.8},   // 面粉+蛋+糖→点心(高价民生货)
  granary: {n:"谷仓", ico:"🏚", cost:{silver:20}, worker:0, kind:"store",  store:200},
  house:   {n:"宅院", ico:"🏠", cost:{silver:30}, worker:0, kind:"house",  cap:4},
  shrine:  {n:"祠堂", ico:"⛩️", cost:{silver:50}, worker:0, kind:"shrine"},
  academy: {n:"研究院", ico:"🏛", cost:{silver:120}, worker:0, kind:"academy"},
};
const CATS = [
  // 🏠 宅院 home:院落建筑
  {key:"yard",   n:"🏠 院落", types:["house","granary","shrine"], tab:"home"},   // 波3:研究院移出(改由学校/操场;老档已建的研究院保留兼容、不再可建)
  // 🌾 产业 farm:地 + 就地重加工(矿冶/木作)
  {key:"farm",   n:"🌾 农田", types:["field","paddy"], tab:"farm"},
  {key:"animal", n:"🐂 畜牧", types:["barn","stable"], tab:"farm"},
  {key:"mine",   n:"⛏️ 矿冶", types:["mine","brickkiln","porcelain","smithy","steelmill"], tab:"farm"},
  {key:"forest", n:"🌲 林木", types:["forest","carpentry"], tab:"farm"},
  // 🏪 市集 town:镇上民生作坊
  {key:"craft",  n:"🏭 作坊", types:["mill","brewery","weaver","silkworm","silkweave","teahouse","kitchen","oilpress","sugarmill","papermill","tannery","pastry"], tab:"town"},
];
const CROPS = {
  wheat:{n:"麦",out:"grain",mo:1.5}, millet:{n:"粟",out:"grain",mo:1.3}, bean:{n:"豆",out:"grain",mo:1.8},
  cotton:{n:"棉",out:"cotton",mo:1.2}, radish:{n:"菜",out:"veg",mo:2.0}, rice:{n:"稻",out:"grain",mo:3.0},
  mulberry:{n:"桑",out:"mleaf",mo:2.6},   // 桑叶→蚕房→蚕丝→绸坊→绸缎
  clay:{n:"黏土",out:"clay",mo:3.0}, coal:{n:"煤",out:"coal",mo:2.5}, iron:{n:"铁",out:"iron",mo:2.2},   // 矿场开采(mineral),→砖窑/瓷窑/铁匠铺
  tea:{n:"茶",out:"tealeaf",mo:2.0},   // 茶树→茶叶→茶坊→成品茶
  timber:{n:"木",out:"wood",mo:2.8},   // 林场伐木(mineral型)→木→木作坊→家具
};
const ANIMALS = {   // feed=每月耗粮(P1批量重做下调:牲畜兼食糠菜,别比田还吃粮)
  chicken:{n:"鸡",feed:0.2,out:"egg",mo:0.7,dung:0.2}, pig:{n:"猪",feed:0.8,out:"meat",mo:1.2,dung:0.6},
  cow:{n:"牛",feed:1.0,out:"meat",mo:1.4,pelt:1.0,dung:0.8}, sheep:{n:"羊",feed:0.5,out:"cloth",mo:0.5,pelt:0.6,dung:0.4},   // 牛羊副产生皮 pelt + 粪肥(波5反哺田庄)
  horse:{n:"马",feed:1.2,out:"horse",mo:0.45,dung:0.5},   // 马场养马(吃粮多·产慢);马强化车队、v2 骑兵料 + 粪肥
};
const PRICE = {grain:2, flour:3.2, wine:6, cotton:3, cloth:8, meat:5, egg:3.5, mleaf:1.2, silk:7, satin:18, clay:1.5, coal:2.5, brick:4, porcelain:24, tealeaf:1.5, tea:9, iron:6, tool:13, wood:3, furniture:22, dish:10, veg:3, oil:7, sugar:8, paper:9, pelt:2.5, leather:14, steel:16, horse:12, pastry:14, dung:0.6};
const GNAME = {grain:"粮", flour:"面", wine:"酒", cotton:"棉", cloth:"布", meat:"肉", egg:"蛋", silver:"银", mleaf:"桑叶", silk:"丝", satin:"绸", clay:"黏土", coal:"煤", brick:"砖", porcelain:"瓷", tealeaf:"茶叶", tea:"茶", iron:"铁", tool:"农具", wood:"木", furniture:"家具", dish:"菜肴", veg:"菜", oil:"油", sugar:"糖", paper:"纸", pelt:"生皮", leather:"皮革", steel:"钢", horse:"马", pastry:"点心", dung:"粪肥"};
function wsInputs(d){ const a=[]; if(d.in)a.push({g:d.in,amt:d.inAmt}); if(d.in2)a.push({g:d.in2,amt:d.inAmt2}); if(d.in3)a.push({g:d.in3,amt:d.inAmt3}); if(d.in4)a.push({g:d.in4,amt:d.inAmt4}); return a; }   // 作坊全部原料(支持多原料)
// ★ 国风图标集(codex 生成,陆续补全):HAS_ICON=产业/建筑 type, HAS_GOODICON=货物 id;有图出 <img>,无则回退 emoji
const ICON_VER = "0615w";
const HAS_ICON = new Set(["academy","barn","brewery","brickkiln","carpentry","field","forest","granary","house","kitchen","mill","mine","oilpress","paddy","papermill","porcelain","shrine","silkweave","silkworm","smithy","sugarmill","teahouse","weaver",
  "maid","carter","guard","nanny","cook","accountant","tutor","steward","pig","cow","chicken","sheep","lord","wife","son","daughter","child","bride"]);          // 产业/建筑 type + 家仆/牲口/家族成员 → assets/icons/<key>.webp
const HAS_GOODICON = new Set(["brick","clay","cloth","coal","cotton","dish","egg","flour","furniture","grain","iron","meat","mleaf","oil","paper","porcelain","satin","silk","silver","sugar","tea","tealeaf","tool","veg","wine","wood"]);                     // 货物 id → assets/icons/g_<id>.webp(g_前缀避免与同名建筑冲突)
function icoImg(key, fallback){ return HAS_ICON.has(key) ? `<img class="ico-img" decoding="async" src="assets/icons/${key}.webp?v=${ICON_VER}" alt="">` : (fallback||""); }
function goodIco(key){ return HAS_GOODICON.has(key) ? `<img class="gico-img" decoding="async" src="assets/icons/g_${key}.webp?v=${ICON_VER}" alt=""> ` : ""; }
// ★限时建造代价(可在玩法百科调):每产业 派N工·干M月·耗材料(银/木/砖)
const BUILD_OVERRIDE = { academy:{labor:4,months:3,mats:{wood:30,brick:20}}, shrine:{labor:3,months:2,mats:{wood:16,brick:14}}, house:{labor:3,months:2,mats:{wood:16,brick:12}}, granary:{labor:2,months:1,mats:{wood:10,brick:6}} };
function buildSpec(t){ const d=DEFS[t]||{}, o=BUILD_OVERRIDE[t]||{};
  // 原料/田地:开荒挖矿伐木,只 1 工 1 月、不耗木砖(防"没木→建不了林场"卡死;也别一起步就耗光劳力)
  let base; if(["field","paddy","mine","forest","barn"].includes(t)) base={labor:1,months:1,mats:{}};
  else if(d.kind==="work") base={labor:2,months:2,mats:{wood:10,brick:6}};
  else base={labor:2,months:2,mats:{wood:14,brick:10}};
  const mats=Object.assign({silver:(d.cost&&d.cost.silver)||0}, base.mats, o.mats||{});
  if(d.out && mats[d.out]) delete mats[d.out];   // ★建筑不该需要它自己产的料(防循环依赖:砖窑产砖却要砖→死结。瓷窑/铁匠等同理通用兜住)
  return { labor:o.labor||base.labor, months:o.months||base.months, mats };
}
// ★市集/远城(P1):货运到各市的「我方货栈」,本地居民随机渐卖,月报账。dist=单程天,base=价倍率,risk=匪患,size=需求规模
const MARKETS_DEF = {   // size=需求规模;appMul=胃口倍率(大城能吃下大宗车队→规模经济;小镇一砸就跌)
  local:   {n:"场镇",   dist:3,  base:1.00, risk:0.03, size:10, appMul:1},                                   // 本地赶场小集(1800四川)
  zhuxian: {n:"自贡",   dist:8,  base:1.25, risk:0.10, size:16, appMul:2, cheap:["coal","iron","sugar"]},     // 盐都井矿:煤/铁/糖便宜
  kaifeng: {n:"成都府", dist:14, base:1.40, risk:0.14, size:26, appMul:4, cheap:["satin","silk","tea"]},      // 省会通都(吃货量最大):蜀锦绸/丝/茶便宜
  zhoukou: {n:"重庆府", dist:20, base:1.55, risk:0.18, size:20, appMul:3, cheap:["grain","sugar","oil"]},     // 长江码头大邑:粮/糖/油便宜
};
// ★马车分档(买/造/升级):tier→载量。造车在木作坊用木+银
const CART_TIERS = [
  {n:"板车",     cap:60,   buy:60,   wood:0,   craft:0},
  {n:"骡车",     cap:150,  buy:220,  wood:50,  craft:40},
  {n:"大车",     cap:400,  buy:650,  wood:140, craft:120},
  {n:"重载骡队", cap:1000, buy:1800, wood:320, craft:280},
];
const DEMAND_W = {grain:0.5, flour:0.3, wine:0.15, cotton:0.3, cloth:0.3, meat:0.3, egg:0.3, mleaf:0.2, silk:0.12, satin:0.08, clay:0.3, coal:0.3, brick:0.2, porcelain:0.06, tealeaf:0.2, tea:0.2, iron:0.2, tool:0.12, wood:0.25, furniture:0.07, dish:0.12, veg:0.3, oil:0.18, sugar:0.16, paper:0.15, pelt:0.2, leather:0.12, steel:0.1, horse:0.08, pastry:0.1, dung:0.04};   // 每日需求/规模点(粮高·奢侈低;粪肥主要自用,需求极低)
function freshMarkets(){ const o={}; for(const k in MARKETS_DEF) o[k]=Object.assign({}, MARKETS_DEF[k], {stock:{}, glut:{}, sold:{}, rev:0}); return o; }
// ★背景配置(可换):各"省份/背景"只是一套文案——城名/特产/水患名。换 REGION 即换背景,玩法数值不变。后期可加更多省/随机选。
const REGIONS = {
  sichuan: { name:"四川", disaster:"江河水患", disasterDesc:"岷江/长江暴涨,浊浪滔天",
    cities:{ local:{n:"场镇",cheap:[]}, zhuxian:{n:"自贡",cheap:["coal","iron","sugar"]}, kaifeng:{n:"成都府",cheap:["satin","silk","tea"]}, zhoukou:{n:"重庆府",cheap:["grain","sugar","oil"]} } },
  henan:   { name:"河南", disaster:"黄河决口", disasterDesc:"黄河又决口,浊浪滔天",
    cities:{ local:{n:"本地集市",cheap:[]}, zhuxian:{n:"朱仙镇",cheap:["wood","paper","veg"]}, kaifeng:{n:"开封府",cheap:["porcelain","satin","tea"]}, zhoukou:{n:"周口埠",cheap:["grain","sugar","oil"]} } },
  jiangnan:{ name:"江南", disaster:"水乡涝灾", disasterDesc:"江南梅雨连绵,水乡泛涝",
    cities:{ local:{n:"市镇",cheap:[]}, zhuxian:{n:"苏州",cheap:["satin","silk","tea"]}, kaifeng:{n:"江宁府",cheap:["satin","silk","porcelain"]}, zhoukou:{n:"扬州",cheap:["grain","sugar","wine"]} } },
};
// ★乱世层换皮(P6.6):v2 天下页跟随 REGION 换城名/势力名/乱局文案。5 个「原型槽」(官府/教匪巨寇/团练同侪/流寇/盐枭)
// 各省换皮;城 id(c01..c32)与 tier、初始归属(原型)跨省共享 → 关系/军队/打城/存档逻辑全不动,只换显示。真源 docs/设计-卡片P6.6
const WAR_CITY_BASE = {   // 共享:城 id → {t:tier档, f:初始归属原型}(8寨/8县/5州/2省)
  c01:{t:1,f:"guolu"},   c02:{t:1,f:"guolu"},   c03:{t:1,f:"bailian"}, c04:{t:1,f:"bailian"},
  c05:{t:1,f:"yanxiao"}, c06:{t:1,f:"tuanlian"},c07:{t:1,f:"guolu"},   c08:{t:1,f:"yanxiao"},
  c11:{t:2,f:"tuanlian"},c12:{t:2,f:"tuanlian"},c13:{t:2,f:"guanjun"}, c14:{t:2,f:"yanxiao"},
  c15:{t:2,f:"bailian"}, c16:{t:2,f:"tuanlian"},c17:{t:2,f:"guanjun"}, c18:{t:2,f:"yanxiao"},
  c21:{t:3,f:"guanjun"}, c22:{t:3,f:"tuanlian"},c23:{t:3,f:"guanjun"}, c24:{t:3,f:"yanxiao"}, c25:{t:3,f:"bailian"},
  c31:{t:4,f:"guanjun"}, c32:{t:4,f:"guanjun"},
};
const WAR_REGIONS = {
  sichuan: { luan:"川楚白莲教乱",
    flavor:"嘉庆年间,川楚白莲教大乱,九年烽烟。教匪、官军、土匪、盐枭、各路团练豪强割据厮杀。",
    fac:{ guanjun:{n:"朝廷官军",ico:"🛡️",desc:"建制最强,占大城。可投靠招安,也可割据反叛。"},
          bailian:{n:"白莲教义军",ico:"🔥",desc:"乱源,占乡野山寨,与官军死磕。"},
          tuanlian:{n:"团练豪强",ico:"🏯",desc:"你的同类对手,占县城。可结盟、可吞并。"},
          guolu:{n:"川陕啯噜",ico:"🗡️",desc:"流寇匪帮,机会主义,劫掠各方。"},
          yanxiao:{n:"川盐盐枭",ico:"🧂",desc:"亦商亦匪,控盐路水陆要冲。"} },
    names:{ c01:"青神寨",c02:"龙泉寨",c03:"白岩寨",c04:"铁山寨",c05:"盐井寨",c06:"夹江寨",c07:"峨边寨",c08:"犍为寨",
            c11:"郫县",c12:"新津县",c13:"彭山县",c14:"井研县",c15:"丹棱县",c16:"青神县",c17:"仁寿县",c18:"荣县",
            c21:"嘉定府",c22:"眉州",c23:"资州",c24:"叙州府",c25:"潼川府",c31:"重庆府",c32:"成都府" } },
  henan: { luan:"白莲教北路 + 黄泛",
    flavor:"嘉庆白莲教蔓延豫西,教匪、绿林刀客、盐枭与团练寨堡在黄泛流民间割据厮杀。",
    fac:{ guanjun:{n:"朝廷官军",ico:"🛡️",desc:"建制最强,占大城。可投靠招安。"},
          bailian:{n:"白莲教北路",ico:"🔥",desc:"教乱北犯,据豫西山寨,与官军死磕。"},
          tuanlian:{n:"寨堡团练",ico:"🏯",desc:"你的同类对手,占县城。可结盟、可吞并。"},
          guolu:{n:"豫西刀客",ico:"🗡️",desc:"绿林刀客,机会主义,劫掠各方。"},
          yanxiao:{n:"怀庆盐枭",ico:"🧂",desc:"亦商亦匪,控盐路水陆要冲。"} },
    names:{ c01:"鲁山寨",c02:"嵩县寨",c03:"卢氏寨",c04:"淅川寨",c05:"内乡寨",c06:"伊阳寨",c07:"栾川寨",c08:"汝阳寨",
            c11:"宝丰县",c12:"郏县",c13:"襄城县",c14:"临颍县",c15:"舞阳县",c16:"叶县",c17:"泌阳县",c18:"方城县",
            c21:"南阳府",c22:"汝州",c23:"许州",c24:"陈州府",c25:"裕州",c31:"归德府",c32:"开封府" } },
  jiangnan: { luan:"沿海寇乱(蔡牵)",
    flavor:"嘉庆年间蔡牵海寇纵横东南海面,漕帮水匪、盐枭、乡勇团练在江浙水乡海汛间割据厮杀。",
    fac:{ guanjun:{n:"绿营水师",ico:"🛡️",desc:"建制最强,守大城海防。可投靠招安。"},
          bailian:{n:"蔡牵海寇",ico:"🌊",desc:"东南巨寇,据外洋岛汛,与水师死磕。"},
          tuanlian:{n:"乡勇团练",ico:"🏯",desc:"你的同类对手,占县城。可结盟、可吞并。"},
          guolu:{n:"漕帮水匪",ico:"🗡️",desc:"运河水匪,机会主义,劫掠各方。"},
          yanxiao:{n:"两淮盐枭",ico:"🧂",desc:"亦商亦匪,控盐路水陆要冲。"} },
    names:{ c01:"乍浦汛",c02:"澉浦汛",c03:"石浦寨",c04:"沈家门",c05:"玉环汛",c06:"南田岛",c07:"崇明沙",c08:"吴淞口",
            c11:"平湖县",c12:"海盐县",c13:"慈溪县",c14:"镇海县",c15:"象山县",c16:"太仓州",c17:"嘉定县",c18:"华亭县",
            c21:"松江府",c22:"嘉兴府",c23:"绍兴府",c24:"台州府",c25:"温州府",c31:"宁波府",c32:"苏州府" } },
};
let REGION = "sichuan";
function curRegion(){ return REGIONS[REGION]||REGIONS.sichuan; }
function applyRegion(key){ const r=REGIONS[key]; if(!r) return; REGION=key;
  for(const k in r.cities){ const c=r.cities[k];
    if(MARKETS_DEF[k]){ MARKETS_DEF[k].n=c.n; MARKETS_DEF[k].cheap=c.cheap; }
    if(typeof S!=="undefined" && S && S.markets && S.markets[k]){ S.markets[k].n=c.n; S.markets[k].cheap=c.cheap; } }
}
// ★城里商业(P5):3 远城固定铺位(收藏版图),开铺=该城零售出口升级(叠在货栈上,没铺=原样)。品类专营 + 装修多级 + 酒楼/青楼
const SHOPTYPES = {
  liang:   {n:"粮行",   ico:"🌾", goods:["grain","flour"]},
  bu:      {n:"布庄",   ico:"🧵", goods:["cotton","cloth"]},
  chou:    {n:"绸缎庄", ico:"🧧", goods:["silk","satin"]},
  ci:      {n:"瓷器行", ico:"🏺", goods:["porcelain","brick","tool"]},
  cha:     {n:"茶庄",   ico:"🍵", goods:["tea","tealeaf"]},
  jiu:     {n:"酒楼",   ico:"🍷", goods:["wine","meat"], favor:3, svc:14, d:"提酒/肉零售 + 月官面+3 + 席面月入"},
  qinglou: {n:"青楼",   ico:"🏮", service:true,          favor:4, svc:30, d:"达官流连:底月入+官面;招姑娘越多越高档赚越多,可设宴宴官、纳花魁为妾"},
  qianzhuang: {n:"钱庄", ico:"💰", finance:"bank",          d:"存银生息(稳)+ 放贷取息(高息但有坏账风险)"},
  dangpu:     {n:"当铺", ico:"🏯", finance:"pawn",          d:"典当余货换急银 + 收购奇珍异宝(陈列涨门第、增值再卖、雅集宴客、进献获赏)"},
};
// ★奇珍异宝:当铺收购,四用途(陈列涨门第+声望 / 增值再卖 / 雅集宴客加官面 / 进献获奖赏)。base身价、apprec年增值、pres门第、rep声望
const TREASURES = {
  guhua:   {n:"古画手卷", ico:"🖼", base:280,  apprec:0.05, pres:8,  rep:3, d:"前朝名家山水,挂厅添雅"},
  guyu:    {n:"古玉璧",   ico:"⚪", base:420,  apprec:0.04, pres:10, rep:3, d:"汉玉温润,传家之宝"},
  manao:   {n:"玛瑙瓶",   ico:"🏺", base:160,  apprec:0.04, pres:5,  rep:2, d:"缠丝玛瑙,案头清供"},
  xijiao:  {n:"犀角杯",   ico:"🥃", base:520,  apprec:0.05, pres:12, rep:4, d:"犀角雕杯,宴客体面"},
  shanhu:  {n:"珊瑚树",   ico:"🪸", base:680,  apprec:0.05, pres:14, rep:4, d:"红珊瑚盆景,富贵气象"},
  zhong:   {n:"西洋自鸣钟",ico:"🕰", base:900,  apprec:0.03, pres:16, rep:5, d:"广货洋钟,稀罕奇巧"},
  songci:  {n:"宋瓷天青",  ico:"🍶", base:1300, apprec:0.06, pres:22, rep:6, d:"汝窑天青,世所罕见"},
  tianhuang:{n:"田黄印章", ico:"🟡", base:1800, apprec:0.07, pres:26, rep:7, d:"石中之王,一两田黄三两金"},
  zihua:   {n:"名家字幅",  ico:"📜", base:240,  apprec:0.05, pres:7,  rep:3, d:"翰林墨宝,书香门第"},
  biyan:   {n:"鼻烟壶",    ico:"🫙", base:120,  apprec:0.04, pres:4,  rep:2, d:"内画鼻烟壶,把玩之物"},
  foxiang: {n:"鎏金佛像",  ico:"🛕", base:760,  apprec:0.04, pres:15, rep:5, d:"鎏金铜佛,庄严供奉"},
  baoding: {n:"商周宝鼎",  ico:"🪔", base:2600, apprec:0.06, pres:34, rep:9, d:"青铜重器,镇宅传国"},
};
const TREASURE_KEYS = Object.keys(TREASURES);
// ★青楼姑娘(经营深度):三档,身价银买 + 月脂粉钱,各带人气月入+官面;可培养升档、纳花魁为妾
const GIRL = {
  qing: {n:"清倌人", hire:60,  upkeep:1.5, draw:8,  fav:1},
  hong: {n:"红牌",   hire:200, upkeep:4,   draw:24, fav:2},
  hua:  {n:"花魁",   hire:600, upkeep:10,  draw:60, fav:4},
};
const GIRL_UP = { qing:"hong", hong:"hua" };   // 培养升档:清倌→红牌→花魁
const CITY_PLOTS = {   // 只 3 远城设铺(本地市集是家门口的集,不设);越大的城越贵、人流越高
  zhuxian: [ {id:"zx1",name:"巷口小铺",traffic:0.6,buy:600,rent:14}, {id:"zx2",name:"临街铺",traffic:1.0,buy:1400,rent:30}, {id:"zx3",name:"正街旺铺",traffic:1.8,buy:3200,rent:62} ],
  kaifeng: [ {id:"kf1",name:"内城小铺",traffic:0.8,buy:1200,rent:26}, {id:"kf2",name:"鼓楼临街",traffic:1.4,buy:3000,rent:60}, {id:"kf3",name:"御街旺铺",traffic:2.4,buy:7000,rent:130}, {id:"kf4",name:"相国寺金铺",traffic:3.2,buy:16000,rent:300} ],
  zhoukou: [ {id:"zk1",name:"码头铺",traffic:0.9,buy:1000,rent:22}, {id:"zk2",name:"沙颍河市",traffic:1.5,buy:2600,rent:54}, {id:"zk3",name:"关帝庙旺铺",traffic:2.2,buy:6000,rent:115} ],
};
const DECOR_CAP=5;
function shopFor(plotId){ return (S.shops||[]).find(s=>s.id===plotId); }
function plotDef(city, plotId){ return (CITY_PLOTS[city]||[]).find(p=>p.id===plotId); }
function shopEff(s){ const p=plotDef(s.city,s.id); return p ? p.traffic*(1+(s.decor||0)*0.12) : 0; }   // 有效人流=人流档×装修
function cityShops(city){ return (S.shops||[]).filter(s=>s.city===city); }
function hasQinglou(){ return (S.shops||[]).some(s=>s.type==="qinglou"); }
function shopPrestige(){ let p=0; for(const s of (S.shops||[])) p+=shopEff(s)*1.5; return Math.round(Math.min(p,60)); }   // 名铺/装修=规模体面,有顶
function cityRetail(city, g){   // 该城铺面给某货的 零售量/客单价 乘子(没铺=1)
  const shops=cityShops(city); if(!shops.length) return {q:1,p:1};
  let base=0, match=0;
  for(const s of shops){ const T=SHOPTYPES[s.type]; if(T.service||T.finance) continue; const eff=shopEff(s); base+=eff; if(T.goods&&T.goods.includes(g)) match+=eff; }
  return {q:1+base*TUNE.retailQ+match*TUNE.retailMatch, p:1+Math.min(0.3, base*TUNE.retailP)};
}
const TIERS = [[0,"流民"],[60,"自耕农"],[200,"小户"],[800,"殷实人家"],[2000,"地主"],[6000,"商贾"],[20000,"豪绅"],[100000,"巨贾"],[500000,"富甲一方"],[1000000,"富可敌国"]];
const MAX_TIER = 4;   // 产业升阶封顶:顶级 = ×8(不再无限翻倍 → 治"升级太夸张")
// 门第:豪绅起的高阶位不止看家产,还得有功名/捐纳/营造/官面声望(把财富换成身份才上得去)
const TIER_PRESTIGE = [0,0,0,0,0,0, 30, 80, 180, 360];   // idx→该阶位所需门第
// 捐纳:拿银子捐学位/官身(清代捐纳制),换优免/官面/门第。escalating 大坑
const JUANA = [
  {n:"捐监生",       cost:150,   fav:6,  deg:1, pres:8,  d:"纳粟入监,得国子监生员(优免同秀才)"},
  {n:"捐贡生",       cost:600,   fav:12, deg:1, pres:18, d:"援例捐贡,士绅之列、优免续"},
  {n:"捐虚衔·同知",   cost:8000,  fav:25, deg:2, pres:40, d:"捐候补同知衔,见官不跪、优免大涨"},
  {n:"捐道台顶戴",   cost:30000, fav:40, deg:3, pres:80, d:"道台顶戴,跻身缙绅,优免到顶"},
];
// 大额营造·家族地标:一次性大钱→门第/声望/官面+体面(后期"盖什么"的新决策)
const LANDMARKS = {
  garden:  {n:"修园林",   ico:"🏞", cost:800,   pres:15, d:"叠石理水,门庭体面 → 声望+8"},
  shrine2: {n:"起宗祠",   ico:"🏛", cost:1800,  pres:22, d:"光宗耀祖,丧葬费减半、继位更顺 → 声望+10"},
  school:  {n:"办义学",   ico:"📖", cost:2500,  pres:20, d:"脑力/管理:读书人兴作坊(作坊产出↑,读书人越多越高)·子女攻读+1/年·助营造 → 声望+10"},
  bridge:  {n:"修桥铺路", ico:"🌉", cost:4000,  pres:26, d:"善举德望,官面+15 → 声望+12"},
  charity: {n:"设义庄",   ico:"🍚", cost:6000,  pres:30, d:"赡养族人,荒年不慌、声望月增 → 声望+15"},
  arch:    {n:"立牌坊",   ico:"⛩", cost:10000, pres:40, req:1, d:"旌表门第(需家有功名),官面+25 → 声望+15"},
  menagerie:{n:"兽苑·虎园",ico:"🐯", cost:40000, pres:80, d:"豢养虎豹珍禽,富甲一方的气派(须府邸+园林胜景)→ 声望+30"},
  road:      {n:"修村路",  ico:"🛤", cost:1500,  pres:3, vil:1, d:"路通车快,村民出入便利 → 便利+15"},
  well:      {n:"凿水井",  ico:"⛲", cost:2000,  pres:3, vil:1, d:"甘泉济民,抗旱安居 → 便利+10·人口承载+40"},
  playground:{n:"辟操场",  ico:"🤸", cost:2500,  pres:3, vil:1, d:"体力/劳效:村民强身→耕作/作物产出↑(长工越多越高)·便利+12·助营造"},
  market_shed:{n:"盖集市棚",ico:"🛒", cost:3500, pres:5, vil:1, d:"遮风挡雨,市面兴旺 → 本村需求上限×1.4·人口承载+30"},
};
const LANDMARK_LOC = { garden:"home", shrine2:"home", school:"home", charity:"home", bridge:"city", arch:"city", menagerie:"home", road:"town", well:"town", playground:"town", market_shed:"town" };
// ★波2 房屋出租:修房租给工人/外来人口 → 容纳更多长工(workerCap) + 月租金 + 抬村庄人口承载。可重复建(count)。本村面板里建。
const HOUSING = {
  dorm: {n:"工人宿舍", ico:"🏘", cost:300,  worker:4, pop:15, rent:0.4, d:"长工住处:可雇长工上限 +4 · 村庄人口承载 +15 · 月租 0.4"},
  inn:  {n:"客栈",     ico:"🏨", cost:1200, worker:6, pop:30, rent:2.2, d:"招徕外来客商工匠:可雇长工 +6 · 人口承载 +30 · 月租 2.2"},
};   // 地标分区:家宅善举=宅院,公共善举(修桥/牌坊)=城镇
// ★宅院房舍(P5扩建):自己一间间盖,给上限+门第(细分大宅加成)。max=可盖几间
const ROOMS = {
  ershou:   {n:"耳房",   ico:"🏠", cost:400,  wood:20, brick:15, max:4, pres:4,  d:"正屋两侧耳房 · 各仆役住处 +1"},
  xiangfang:{n:"厢房",   ico:"🏡", cost:900,  wood:35, brick:25, max:4, pres:8,  d:"东西厢房 · 人口上限 +6"},
  houzhao:  {n:"后罩房", ico:"🏘", cost:1600, wood:50, brick:40, max:3, pres:12, d:"内宅后罩房 · 妾上限+1、养女上限+2"},
  kufang:   {n:"库房",   ico:"🏚", cost:700,  wood:30, brick:20, max:4, pres:6,  d:"库房仓廒 · 库容 +500"},
};
// ★多级花园(取代旧一次性「修园林」地标):逐级升,涨门第/声望
const GARDEN = [
  {n:"无",        pres:0,  rep:0,  cost:0},
  {n:"花园",      pres:15, rep:8,  cost:800},
  {n:"假山水池",  pres:28, rep:14, cost:2500},
  {n:"亭台楼榭",  pres:45, rep:20, cost:6000},
  {n:"园林胜景",  pres:70, rep:28, cost:15000},
];
// ★大宅阶梯(P5):单一家主宅邸逐级升,一次性大钱。累计总加成(接 workerCap/storeCap/servCap/wardCap/prestige 做加法)
const MANOR = [
  {n:"茅屋",     ico:"🛖", cost:0,      worker:0,   store:0,     servPlus:0, wardCap:2,  concCap:0, pres:0},
  {n:"瓦房",     ico:"🏠", cost:300,    worker:6,   store:300,   servPlus:1, wardCap:3,  concCap:0, pres:5},
  {n:"四合院",   ico:"🏡", cost:1200,   worker:16,  store:800,   servPlus:2, wardCap:5,  concCap:1, pres:14, unlock:"garden"},
  {n:"大宅",     ico:"🏘", cost:4000,   worker:30,  store:2000,  servPlus:3, wardCap:7,  concCap:2, pres:30, unlock:"shrine2"},
  {n:"深宅大院", ico:"🏯", cost:12000,  worker:48,  store:4000,  servPlus:4, wardCap:10, concCap:4, pres:55, cook:true},
  {n:"府邸",     ico:"🏰", cost:35000,  worker:70,  store:6500,  servPlus:6, wardCap:14, concCap:6, pres:95},
  {n:"庄园府邸", ico:"🏛", cost:100000, worker:100, store:10000, servPlus:8, wardCap:20, concCap:9, pres:150},
];
const SEASON = ["春","夏","秋","冬"];
// (旧「卡摊/发展卡」DEV_CARDS 已废弃删除 2026-06-14;产业改「营造」,git 历史可查)
// 研究院·科技树:研究院按月出「科技点」,在研究院二级页花科技点升永久加成(取代卡摊白捡buff)
const RESEARCH = {
  crop: {n:"良种改良", ico:"🌱", b:"全庄作物产量", per:0.06, apply:s=>{s.cropBonus=(s.cropBonus||1)+0.06;}},
  work: {n:"水力机巧", ico:"🏯", b:"全场作坊产出", per:0.08, apply:s=>{s.workBonus=(s.workBonus||1)+0.08;}},
};
function researchCost(tk){ const lv=(S.research&&S.research[tk])||0; return 8+lv*7; }   // 升级递增(慢一点)
function techRate(){ const t=academyTier(); if(t<=0) return 0; return t*0.15 + Math.min(S.assign.academy||0, t*4)*0.5; }   // 科技点/月:靠研究员人力(每研究员+0.5,上限tier×4)
function doResearch(tk){
  if(academyTier()<1){ toast("先「营造」建研究院"); return; }
  const R=RESEARCH[tk], cost=researchCost(tk); if((S.tech||0)<cost){ toast(`科技点不足,需 ${cost}(现 ${Math.floor(S.tech||0)})`); return; }
  S.tech-=cost; if(!S.research)S.research={}; S.research[tk]=((S.research[tk])||0)+1; R.apply(S);
  toast(`🔬 研制「${R.n}」Lv${S.research[tk]} · ${R.b} +${Math.round(R.per*100)}%`); logMsg(`🔬 研制「${R.n}」至 Lv${S.research[tk]}`);
  render(); reopenDept("academy"); save(true);
}
// 小挑战(目标链:一次一个,达成给赏+下一个) — 给放置一点奔头
const CHALLENGES = [
  {n:"添置家当", ico:"🪙", tip:"家产攒到 250 两", cur:()=>assets(),        max:250,  rtxt:"纹银+30",  rew:s=>{s.silver+=30;}},
  {n:"人丁渐旺", ico:"🧑", tip:"长工招到 6 人",   cur:()=>S.workers,       max:6,    rtxt:"纹银+50",  rew:s=>{s.silver+=50;}},
  {n:"村口兴市", ico:"🏘", tip:"修一座村庄基建(市集页「🏘本村」:修路/水井/集市棚…→抬村子上限)", cur:()=>['road','well','playground','market_shed','bridge','charity','school'].some(k=>S.landmarks&&S.landmarks[k])?1:0, max:1, rtxt:"纹银+70", rew:s=>{s.silver+=70;}},
  {n:"仓廪初实", ico:"📦", tip:"存粮屯到 60 石",  cur:()=>homeGrain()+G("grain"), max:60, rtxt:"纹银+60",  rew:s=>{s.silver+=60;}},
  {n:"畜粪肥田", ico:"💩", tip:"养畜出粪给田施肥(畜栏产粪→粪肥囤够→田自动增产)", cur:()=>(typeof fertActive==='function'&&fertActive())?1:0, max:1, rtxt:"纹银+90", rew:s=>{s.silver+=90;}},
  {n:"精耕良田", ico:"⬆️", tip:"把一处产业升到「良级」", cur:()=>S.ind.some(b=>(b.tier||1)>=2)?1:0, max:1, rtxt:"纹银+80",  rew:s=>{s.silver+=80;}},
  {n:"家业小成", ico:"🏠", tip:"家产破 800 两·成殷实人家", cur:()=>assets(), max:800,  rtxt:"纹银+120", rew:s=>{s.silver+=120;}},
  {n:"村庄兴旺", ico:"🌾", tip:"把本村人口养到 180(发工资→村民富→人口涨;修房屋抬人口承载)", cur:()=>(S.village&&S.village.pop)||0, max:180, rtxt:"纹银+200", rew:s=>{s.silver+=200;}},
  {n:"添丁进口", ico:"🚶", tip:"人手达到 10",     cur:()=>S.workers,       max:10,   rtxt:"纹银+160", rew:s=>{s.silver+=160;}},
  {n:"百业兴旺", ico:"🏯", tip:"产业铺满 12 处",  cur:()=>S.ind.length,    max:12,   rtxt:"纹银+220", rew:s=>{s.silver+=220;}},
  {n:"富甲乡里", ico:"💰", tip:"家产破 6000 两",  cur:()=>assets(),        max:6000, rtxt:"纹银+400", rew:s=>{s.silver+=400;}},
];
// ===== 家族 =====
const MNAMES = ["承宗","延寿","守仁","秉文","明德","志远","继祖","怀安","荣昌","国栋","兆丰","鸿渐","振邦","文焕","宝山","长庚"];
const FNAMES = ["秀英","淑兰","巧珍","婉清","惠娘","凤仙","月娥","春桃","银环","兰芝","玉莲","翠云","素心","金枝"];
const TALENTS = ["勤勉","精明","聪慧","健硕","平庸"];   // 勤勉→农 精明→商 聪慧→读书 健硕→力 平庸→无
const POSTS = {
  farm:   {n:"农管", ico:"🌾", d:"全庄作物产出提升"},
  work:   {n:"账房", ico:"🧮", d:"全作坊产出提升"},
  market: {n:"掌柜", ico:"🏪", d:"市集卖价提升"},
  study:  {n:"读书", ico:"📖", d:"攻读功名(为科举铺路),声望渐增"},
  labor:  {n:"下田", ico:"🌱", d:"当免费劳力,进人手池(不要工钱)"},
};
// 家仆/役使:一次雇银(身价/聘金) + 每月月俸,各有功用(非长工,不占人口、不派工)。cap=可雇上限
// ★月俸贴清代真实行情:锚点长工 0.4 两/月;丫鬟最贱(身价银制、管吃住)→ 体力仆役略高于长工 → 识字「先生」(账房/西席)是其数倍(束脩/师爷之资)。低→高排。
const SERVANTS = {
  maid:      {n:"丫鬟", ico:"🧹", hire:18, wage:0.25, cap:4, d:"洒扫使唤(身价银买断),每月声望每名 +0.3"},
  carter:    {n:"车夫", ico:"🐴", hire:14, wage:0.5,  cap:30, d:"赶车行脚,卖价每名 +4%(车队越大越要多车夫驾车)"},
  guard:     {n:"护院", ico:"🛡", hire:16, wage:0.6,  cap:6, d:"看家护院兼车队护卫:私盐缉获·水患毁田·镖路匪患大减(越多车队越安全)"},
  biaotou:   {n:"镖头", ico:"🚩", hire:40, wage:1.5,  cap:2, d:"车队队长:有镖头才能编队整队出货,统押大宗、大压匪险"},
  nanny:     {n:"奶妈", ico:"🍼", hire:15, wage:0.7,  cap:1, d:"乳哺幼儿,添丁更易、免幼主临政之罚"},
  cook:      {n:"厨子", ico:"🍲", hire:20, wage:0.9,  cap:2, d:"治席飨客,宴官好感每名 +3"},
  accountant:{n:"账房", ico:"🧮", hire:35, wage:2.0,  cap:2, d:"识字理财(账房先生),商税·田赋每名 −8%"},
  tutor:     {n:"西席", ico:"📚", hire:55, wage:3.0,  cap:1, d:"延师坐馆(秀才束脩),攻读子女学问 +2/年"},
  steward:   {n:"管家", ico:"🤵", hire:60, wage:2.5,  cap:1, d:"统管家务:其余家仆月俸 −15%、调度更优(享掌柜级智能装车),声望渐增"},
};
function randName(sex){ const p=sex==="男"?MNAMES:FNAMES; return p[Math.floor(Math.random()*p.length)]; }
function rollTalent(){ const r=Math.random(); if(r<0.40)return"平庸"; if(r<0.55)return"勤勉"; if(r<0.70)return"精明"; if(r<0.85)return"聪慧"; return"健硕"; }
function newLord(age){ return {name:randName("男"), age:age||25, span:62+Math.floor(Math.random()*15)}; }

