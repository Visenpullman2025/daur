'use strict';
// [admin] 后台管理页:密码门(8位) + 数值微调(TUNE/价格/各项花费) + 调试动作 + 导出。改动存本机 daur-tune。
// ★注意:daur 是公开库、源码可见,此密码是「软门禁」防误触,并非真安全;本页只改本机存档/数值,无服务器无他人数据,故无妨。
const ADMIN_PW = "33445566";   // 8 位;登录页提示「368」

// ===== 调参持久化(daur-tune):快照当前可调值 / 应用 / 单项修改 =====
function snapTune(){ return {
  TUNE: Object.assign({}, TUNE),
  PRICE: Object.assign({}, PRICE),
  manorCost: MANOR.map(m=>m.cost),
  juanaCost: JUANA.map(j=>j.cost),
  landmarkCost: Object.fromEntries(Object.keys(LANDMARKS).map(k=>[k, LANDMARKS[k].cost])),
  shopSvc: Object.fromEntries(Object.keys(SHOPTYPES).filter(k=>SHOPTYPES[k].svc).map(k=>[k, SHOPTYPES[k].svc])),
  mktSize: Object.fromEntries(Object.keys(MARKETS_DEF).map(k=>[k, MARKETS_DEF[k].size])),
  plot: Object.fromEntries(Object.values(CITY_PLOTS).flat().map(p=>[p.id, {buy:p.buy, rent:p.rent}])),
}; }
function applyTune(t){
  if(!t) return;
  if(t.TUNE) Object.assign(TUNE, t.TUNE);
  if(t.PRICE) Object.assign(PRICE, t.PRICE);
  if(t.manorCost) t.manorCost.forEach((c,i)=>{ if(MANOR[i]&&c!=null) MANOR[i].cost=c; });
  if(t.juanaCost) t.juanaCost.forEach((c,i)=>{ if(JUANA[i]&&c!=null) JUANA[i].cost=c; });
  if(t.landmarkCost) for(const k in t.landmarkCost) if(LANDMARKS[k]) LANDMARKS[k].cost=t.landmarkCost[k];
  if(t.shopSvc) for(const k in t.shopSvc) if(SHOPTYPES[k]) SHOPTYPES[k].svc=t.shopSvc[k];
  if(t.mktSize) for(const k in t.mktSize){ if(MARKETS_DEF[k]) MARKETS_DEF[k].size=t.mktSize[k]; if(typeof S!=="undefined"&&S&&S.markets&&S.markets[k]) S.markets[k].size=t.mktSize[k]; }
  if(t.plot) for(const c in CITY_PLOTS) for(const p of CITY_PLOTS[c]){ const o=t.plot[p.id]; if(o){ if(o.buy!=null)p.buy=o.buy; if(o.rent!=null)p.rent=o.rent; } }
}
function loadTune(){ try{ applyTune(JSON.parse(localStorage.getItem("daur-tune"))); }catch(e){} }
function saveTune(){ try{ localStorage.setItem("daur-tune", JSON.stringify(snapTune())); }catch(e){} }
function adminSet(kind, key, val){ val=parseFloat(val); if(isNaN(val))return;
  if(kind==="TUNE") TUNE[key]=val;
  else if(kind==="PRICE") PRICE[key]=val;
  else if(kind==="manor"){ if(MANOR[+key]) MANOR[+key].cost=val; }
  else if(kind==="juana"){ if(JUANA[+key]) JUANA[+key].cost=val; }
  else if(kind==="landmark"){ if(LANDMARKS[key]) LANDMARKS[key].cost=val; }
  else if(kind==="shopsvc"){ if(SHOPTYPES[key]) SHOPTYPES[key].svc=val; }
  else if(kind==="mktsize"){ if(MARKETS_DEF[key]) MARKETS_DEF[key].size=val; if(S.markets&&S.markets[key]) S.markets[key].size=val; }
  else if(kind==="plotbuy"){ for(const c in CITY_PLOTS) for(const p of CITY_PLOTS[c]) if(p.id===key) p.buy=val; }
  else if(kind==="plotrent"){ for(const c in CITY_PLOTS) for(const p of CITY_PLOTS[c]) if(p.id===key) p.rent=val; }
  saveTune();
}

// ===== 密码门 =====
function openAdminGate(){
  setSpeed(0);
  let h=`<h2>🔧 后台管理</h2><div class="desc">输入 8 位管理密码进入数值/调试面板。提示:<b>368</b></div>`;
  h+=`<input id="admpw" class="admpwin" type="password" inputmode="numeric" maxlength="8" placeholder="8 位数字密码">`;
  h+=`<button class="opt devcard" onclick="tryAdmin()"><b>进入</b></button>`;
  modal(h);
  const el=$("#admpw"); if(el){ el.focus(); el.onkeydown=e=>{ if(e.key==="Enter") tryAdmin(); }; }
}
function tryAdmin(){ const el=$("#admpw"); const v=el?el.value:"";
  if(v.length!==8){ toast("密码须 8 位"); return; }
  if(v!==ADMIN_PW){ toast("密码不对"); if(el)el.value=""; return; }
  openAdmin();
}

// ===== 面板 =====
function admNum(kind,key,label,val){ return `<label class="admrow"><span>${label}</span><input type="number" step="any" value="${val}" onchange="adminSet('${kind}','${key}',this.value)"></label>`; }
function openAdmin(){
  setSpeed(0);
  const TL={wage:"工钱·在岗/月",commBase:"商税基率",commCap:"商税上限",landTaxPer:"田赋/产业",birthBase:"正妻添丁率",birthConc:"妾添丁率",retailQ:"铺面零售量系数",retailMatch:"铺面品类匹配",retailP:"铺面客单价系数",tickMs:"挂机节拍(ms)"};
  let h=`<h2>🔧 后台管理 · 数值/调试</h2><div class="desc" style="text-align:left">改完<b>即时生效 + 自动存本机</b>(daur-tune)。调好用下方「导出」整段发我,我固化进出厂默认。</div>`;
  // 调试动作
  h+=`<div class="bgroup">⚡ 调试</div><div class="admgrid">
    <button class="opt" onclick="admGive(10000)">+1万两</button><button class="opt" onclick="admGive(100000)">+10万两</button>
    <button class="opt" onclick="admFavor()">官面/声望+50</button><button class="opt" onclick="admFill()">可交易满仓</button>
    <button class="opt" onclick="admSkip(1)">快进1年</button><button class="opt" onclick="admSkip(5)">快进5年</button></div>`;
  h+=`<button class="opt devcard" onclick="toggleLayoutEdit()"><b>📐 布局编辑</b><small>进编辑模式:拖动场景里的建筑/空地到满意位置 → 导出坐标发我固化进默认布局</small></button>`;
  h+=`<div class="admrow"><span>🏯 大宅等级</span><select onchange="admManor(this.value)">${MANOR.map((m,i)=>`<option value="${i}" ${manorLv()===i?'selected':''}>${i}·${m.n}</option>`).join("")}</select></div>`;
  // 全局参数
  h+=`<div class="bgroup">⚙ 全局参数</div><div class="admlist">`;
  for(const k in TUNE) h+=admNum("TUNE",k,TL[k]||k,TUNE[k]); h+=`</div>`;
  // 货物价格
  h+=`<div class="bgroup">💰 货物价格</div><div class="admlist">`;
  for(const k in PRICE) h+=admNum("PRICE",k,GNAME[k]||k,PRICE[k]); h+=`</div>`;
  // 大宅花费
  h+=`<div class="bgroup">🏯 大宅各级花费</div><div class="admlist">`;
  MANOR.forEach((m,i)=>{ if(i>0) h+=admNum("manor",i,m.n,m.cost); }); h+=`</div>`;
  // 捐纳/地标
  h+=`<div class="bgroup">🎖 捐纳花费</div><div class="admlist">`;
  JUANA.forEach((j,i)=> h+=admNum("juana",i,j.n,j.cost)); h+=`</div>`;
  h+=`<div class="bgroup">🏛 地标花费</div><div class="admlist">`;
  for(const k in LANDMARKS) h+=admNum("landmark",k,LANDMARKS[k].n,LANDMARKS[k].cost); h+=`</div>`;
  // 市场需求规模
  h+=`<div class="bgroup">🏪 市场需求规模(收入天花板)</div><div class="admlist">`;
  for(const k in MARKETS_DEF) h+=admNum("mktsize",k,MARKETS_DEF[k].n,MARKETS_DEF[k].size); h+=`</div>`;
  // 铺面服务月入
  h+=`<div class="bgroup">🏬 铺面服务月入系数(酒楼/青楼)</div><div class="admlist">`;
  for(const k in SHOPTYPES) if(SHOPTYPES[k].svc) h+=admNum("shopsvc",k,SHOPTYPES[k].n,SHOPTYPES[k].svc); h+=`</div>`;
  // 铺位买/租
  h+=`<div class="bgroup">🏚 铺位 买/租</div><div class="admlist">`;
  for(const c in CITY_PLOTS) for(const p of CITY_PLOTS[c]){ h+=admNum("plotbuy",p.id,p.name+"·买",p.buy); h+=admNum("plotrent",p.id,p.name+"·租",p.rent); } h+=`</div>`;
  // 导出/重置
  h+=`<div class="bgroup">📤 导出 / 还原</div>
    <button class="opt devcard" onclick="admExport()"><b>📋 导出当前数值</b><small>整段复制发我固化进出厂默认</small></button>
    <button class="opt" onclick="admResetTune()">↺ 还原出厂数值<small>清本机调参,刷新后恢复</small></button>`;
  modal(h); $("#modal").dataset.kind='admin';
}
function admReopen(){ if(!$("#modal").classList.contains("hidden") && $("#modal").dataset.kind==='admin') openAdmin(); }
function admGive(n){ S.silver+=n; toast(`💰 +${n.toLocaleString()} 两`); render(); save(true); admReopen(); }
function admFavor(){ S.favor=Math.min(100,(S.favor||0)+50); S.rep=(S.rep||0)+50; toast("🎎 官面/声望 +50"); render(); save(true); }
function admFill(){ const cap=storeCap(); for(const k in S.goods) S.goods[k]=cap; toast("📦 可交易库房满仓"); render(); save(true); }
function admManor(v){ S.manor=Math.max(0,Math.min(MANOR.length-1,parseInt(v,10)||0)); toast(`🏯 大宅设为 ${manor().n}`); render(); save(true); }
function admSkip(y){ let n=0; for(let i=0;i<360*y;i++){ step(); n++; if(!$("#modal").classList.contains("hidden") && $("#modal").dataset.kind!=='admin') break; }  // 遇继承/黄河等弹窗即停,交你处理
  setSpeed(0); render(); save(true); toast(`⏩ 推进了约 ${(n/360).toFixed(1)} 年`); }
function admExport(){ const j=JSON.stringify(snapTune());
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(j).then(()=>toast("📋 已复制到剪贴板")).catch(()=>{});
  modal(`<h2>📤 当前数值</h2><div class="desc">复制下面整段发我,我固化进出厂默认:</div><textarea class="admexp" readonly onclick="this.select()">${j}</textarea>`);
}
function admResetTune(){ try{ localStorage.removeItem("daur-tune"); }catch(e){} toast("↺ 已清调参,刷新页面恢复出厂数值"); }

// ===== 玩法百科(公开,设置入口):各系统说明 + 关键数值可看可调 =====
function tuneVal(kind,key){ if(kind==="TUNE")return TUNE[key]; if(kind==="PRICE")return PRICE[key]; if(kind==="mktsize")return (MARKETS_DEF[key]||{}).size; if(kind==="manor")return (MANOR[+key]||{}).cost; if(kind==="juana")return (JUANA[+key]||{}).cost; return ""; }
const WIKI=[
 {t:"🌾 生产 · 产销", d:"田/水田种粮棉桑茶菜(<b>秋收</b>一次)、畜栏出肉蛋、矿场采黏土煤铁、林场伐木(<b>季收</b>);作坊<b>月批</b>把原料加工成品(磨坊/酒坊/织坊/灶房/砖窑/铁匠铺…)。马车把货运到各市<b>货栈</b>,本地居民按供求<b>随机渐买</b>、月报账;同货卖太多压价,远城价高路远险大。", nums:[["PRICE","grain","粮价"],["PRICE","cloth","布价"],["PRICE","tea","茶价"],["PRICE","porcelain","瓷价"],["PRICE","furniture","家具价"]]},
 {t:"🏗 建造 · 营造", d:"盖产业要<b>派 N 个长工干 M 个月 + 耗木/砖/银</b>,进度条走完才成;期间长工被占用、不产出但照发工钱。空闲工或材料不够建不了。大宅/地标/铺面是即时(它们是钱出口,不是劳力营造)。", nums:[["TUNE","wage","工钱·在岗/月"]]},
 {t:"👪 家族 · 妻妾", d:"说媒娶<b>大夫人</b>;大宅到「大宅」级可纳<b>二夫人</b>,妾上限随大宅涨。多妻妾多<b>添丁</b>(每年封顶2)、也多张嘴吃粮。子女满10岁可派职(农管/账房/掌柜/读书)或下田。家主仙逝→择嗣<b>继位</b>(承袭功名),无嗣则终。<b>管家</b>=全仆役月俸−15%+调度更优。", nums:[["TUNE","birthBase","正妻添丁率"],["TUNE","birthConc","妾添丁率"]]},
 {t:"🗺 城内 · 官面门第", d:"宴官攒<b>官面</b>(买盐引/捐纳门槛);<b>捐纳</b>花银买功名(优免税+门第);<b>科举</b>子女读书赴考秀才/举人/进士(优免+投献);盐/镖/书局各有营生;黄河决口是年终大灾。<b>门第</b>=功名+捐纳+地标+大宅+大家族+官面声望,顶层阶位靠门第闸口(光有钱压回低阶)。", nums:[["TUNE","commBase","商税基率"],["TUNE","landTaxPer","田赋/产业"]]},
 {t:"🏬 经商 · 城里商业", d:"3 远城有<b>铺位</b>,买(永久)/租(月扣)开铺=该城<b>零售出口升级</b>(品类专营,旺铺人流大→货卖得更快更贵,顶破收入天花板);<b>装修</b>可多级(耗砖木涨人流)。<b>酒楼</b>供菜肴出席面月入、<b>青楼</b>月入+官面+纳花魁。<b>跨城贩运</b>:马车去便宜的城进货、运到贵的城卖赚差价。", nums:[["TUNE","retailQ","铺面零售量系数"],["TUNE","retailMatch","品类匹配系数"],["TUNE","retailP","客单价系数"],["mktsize","kaifeng","开封需求规模"]]},
 {t:"🏯 大宅 · 顶级花费", d:"大宅 6 级(茅屋→庄园府邸):每级涨 人手/库容/仆役/养女/妾 上限 + 门第,是装大家族的容器。捐纳道台 3 万、牌坊 1 万…是后期大钱出口。", nums:[["manor","3","大宅花费"],["manor","5","府邸花费"],["manor","6","庄园府邸花费"],["juana","3","捐道台"]]},
];
function openWiki(){ setSpeed(0);
  let h=`<h2>📖 玩法百科</h2><div class="desc" style="text-align:left">每个系统怎么玩 + 关键数值(可直接改、即时生效、存本机)。更多数值/调试在设置「🔧 后台管理」。</div>`;
  for(const s of WIKI){ h+=`<div class="bgroup">${s.t}</div><div class="desc" style="text-align:left;line-height:1.7;margin:2px 0 6px">${s.d}</div>`;
    if(s.nums&&s.nums.length) h+=`<div class="admlist">`+s.nums.map(n=>admNum(n[0],n[1],n[2],tuneVal(n[0],n[1]))).join("")+`</div>`; }
  h+=`<button class="opt devcard" onclick="admExport()">📋 导出数值(发开发固化)</button>`;
  modal(h);
}

window.openWiki=openWiki;
window.openAdminGate=openAdminGate; window.tryAdmin=tryAdmin; window.openAdmin=openAdmin; window.adminSet=adminSet;
window.admGive=admGive; window.admFavor=admFavor; window.admFill=admFill; window.admManor=admManor; window.admSkip=admSkip; window.admExport=admExport; window.admResetTune=admResetTune;
loadTune();   // 启动应用本机调参(在 main.js init 之后加载)
