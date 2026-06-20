'use strict';
// [main] 营造/铺面弹窗 · 飘字 · 挂机定时 · 存档 · 回合制/继承 · 启动 init + window 绑定
// ===== 弹窗(建产业/市集) =====
function modal(html, noClose){ $("#modal-box").innerHTML=html+(noClose?'':`<button class="closebtn" onclick="closeModal()">关闭</button>`); $("#modal").classList.remove("hidden"); $("#modal").dataset.lock=noClose?'1':''; $("#modal").dataset.kind=''; }
function closeModal(){ $("#modal").classList.add("hidden"); _curDept=null; }
function costTxt(c){ return Object.keys(c).filter(k=>c[k]).map(k=>`${c[k]}${GNAME[k]}`).join(" "); }
function canAfford(c){ for(const k in c){ if(k==="silver"){ if(S.silver<c[k])return false; } else if(G(k)<c[k])return false; } return true; }
function pay(c){ for(const k in c){ if(k==="silver")S.silver-=c[k]; else addG(k,-c[k]); } }
function buildCostTxt(t){ const sp=buildSpec(t); const mats=Object.keys(sp.mats).filter(g=>sp.mats[g]).map(g=>`${sp.mats[g]}${g==="silver"?"两":GNAME[g]}`).join("+"); return `${sp.labor}工${sp.months}月·${mats}`; }
// 缺什么、缺多少(有/需),给玩家明确反馈
function buildLackTxt(t){ const sp=buildSpec(t), lack=[];
  if(freeW()<sp.labor) lack.push(`工 ${freeW()}/${sp.labor}`);
  for(const g in sp.mats){ if(!sp.mats[g]) continue; const have=g==="silver"?S.silver:G(g); if(have<sp.mats[g]) lack.push(`${g==="silver"?"银":GNAME[g]} ${Math.floor(have)}/${sp.mats[g]}`); }
  return lack.join("、"); }
function buildBlocked(t){ const sp=buildSpec(t), lu=landUsed(), lc=landCap();
  if((t==="field"||t==="paddy")&&lu>=lc) return "田产满";
  if(freeW()<sp.labor) return "缺工";
  if(Object.keys(sp.mats).some(g=>(g==="silver"?S.silver:G(g))<sp.mats[g])) return "缺料";
  return ""; }
function openBuild(){
  const lu=landUsed(), lc=landCap(), tab=(view==="farm"||view==="town")?view:"home";
  let h=`<h2>🏗 营造</h2><div class="desc">派长工 + 耗料 + 数月建成 · 空闲长工 <b>${freeW()}</b>${tab==="farm"?` · 田产 <b>${lu}/${lc}</b>`:""}</div>`;
  if(tab==="home"){   // 🏯 大宅阶梯(只在宅院栏)
    const m=manor(), lv=manorLv(), top=lv>=MANOR.length-1, nx=top?null:MANOR[lv+1];
    h+=`<div class="bgroup">🏯 大宅 <small style="color:var(--mut);font-weight:400">人手/库容/仆役/养女上限 + 门第</small></div>`;
    h+=`<div class="desc" style="text-align:left;background:rgba(179,137,47,.1);padding:8px 10px;border-radius:8px;margin:0 0 6px">当前 <b>${m.ico} ${m.n}</b> · 人手+${m.worker} 库+${m.store} 仆役+${m.servPlus}/役 养女上限${m.wardCap} 妾上限${m.concCap} 门第+${m.pres}</div>`;
    if(top) h+=`<div class="opt cur">🏛 庄园府邸 · 宅邸到顶 ✓</div>`;
    else { const ok=S.silver>=nx.cost; let unl=[]; if(nx.unlock&&LANDMARKS[nx.unlock])unl.push("营造"+LANDMARKS[nx.unlock].n); if(nx.cook)unl.push("小厨房·宴官+3"); if(nx.concCap>m.concCap)unl.push("妾上限→"+nx.concCap);
      h+=`<img class="manorpreview" src="assets/manor/manor-${lv+1}.webp?v=0615s" alt="${nx.n}" decoding="async"><div class="mppreview-cap">营造目标:${nx.ico} ${nx.n}</div>`;
      h+=OptBtn({ label:`🏯 升为「${nx.n}」`, cost:`${nx.cost.toLocaleString()}两`, disabled:!ok, onclick:"upgradeManor()", sub:`人手→${nx.worker} 库容→${nx.store} 养女→${nx.wardCap} 门第+${nx.pres-m.pres}${unl.length?' · '+unl.join("、"):''}` }); }
  }
  for(const c of CATS){ if((c.tab||"home")!==tab) continue; h+=BGroup(c.n)+`<div class="bgrid">`;
    for(const t of c.types){ const d=DEFS[t], blk=buildBlocked(t), ok=!blk, have=deptItems(t).length;
      const costLine = blk==="缺料"||blk==="缺工" ? `<span style="color:var(--bad)">缺 ${buildLackTxt(t)}</span>` : (blk?`<span style="color:var(--bad)">${blk}</span>`:buildCostTxt(t));
      h+=`<button class="opt bcell ${ok?'':'dis'}" onclick="doBuild('${t}')"><b>${d.ico} ${d.n}</b><span class="bcost">${costLine}</span>${have?`<i class="bhave">现有 ${have}</i>`:''}</button>`; }
    h+=`</div>`;
  }
  if(tab==="home"){   // 🏠 宅院房舍(自己一间间盖,加上限+门第)
    h+=`<div class="bgroup">🏠 宅院房舍 <small style="color:var(--mut)">盖房添上限 + 门第(耗银+木+砖)</small></div>`;
    for(const t in ROOMS){ const R=ROOMS[t], have=roomHave(t), full=have>=R.max, ok=!full&&S.silver>=R.cost&&G("wood")>=R.wood&&G("brick")>=R.brick;
      const tag=full?`满 ${R.max}间`:`${R.cost}两+${R.wood}木+${R.brick}砖`;
      h+=OptBtn({ label:`${R.ico} <b>${R.n}</b>${have?` ×${have}`:''}`, cost:tag, cls:(full?'cur':''), disabled:!ok, onclick:"buildRoom('"+t+"')", sub:R.d }); }
    // 🏞 多级花园
    const glv=gardenLv(), gtop=glv>=GARDEN.length-1, gnx=gtop?null:GARDEN[glv+1];
    h+=`<div class="bgroup">🏞 花园 <small style="color:var(--mut)">当前「${GARDEN[glv].n}」· 门第+${GARDEN[glv].pres}</small></div>`;
    if(gtop) h+=`<div class="opt cur">🏞 园林胜景 · 已至顶 ✓</div>`;
    else { const gok=manorLv()>=2&&S.silver>=gnx.cost; h+=OptBtn({ label:`🏞 ${glv>0?'扩为':'辟'}「${gnx.n}」`, cost:manorLv()<2?'需四合院':gnx.cost+'两', disabled:!gok, onclick:"upgradeGarden()", sub:`门第+${gnx.pres-GARDEN[glv].pres} · 声望涨` }); }
    // 🏛 家宅善举/地标(义学/宗祠/义庄 + 顶级兽苑虎园;旧「修园林」已并入多级花园)
    h+=`<div class="bgroup">🏛 家宅营造 <small style="color:var(--mut)">门第 ${prestige()} · 一次性,换身份体面</small></div>`;
    for(const k in LANDMARKS){ if(LANDMARK_LOC[k]!=="home"||k==="garden") continue; const L=LANDMARKS[k], built=!!(S.landmarks&&S.landmarks[k]);
      const mlock=!landmarkManorOK(k), glock=(k==="menagerie"&&gardenLv()<3), lock=L.req&&famDegree()<L.req, ok=!built&&!mlock&&!glock&&!lock&&S.silver>=L.cost;
      const tag=built?'✓ 已建':(mlock?`需${MANOR[LANDMARK_MANOR[k]].n}`:(glock?'需园林胜景级':(lock?'需功名':L.cost.toLocaleString()+'两')));
      h+=OptBtn({ label:`${L.ico} <b>${L.n}</b>`, cost:tag, cls:(built?'cur':''), disabled:!ok, onclick:"buyLandmark('"+k+"')", sub:`${L.d} · 门第+${L.pres}` }); }
  }
  modal(h);
}
function doBuild(t){ const d=DEFS[t], sp=buildSpec(t), blk=buildBlocked(t);
  if(blk){ toast(blk==="田产满"?`田产已满 ${landUsed()}/${landCap()} · 中举/晋阶/官面开额`:`营造「${d.n}」还缺:${buildLackTxt(t)}(铁→铁匠铺、砖→砖窑、木→林场)`); return; }
  for(const g in sp.mats){ if(g==="silver") S.silver-=sp.mats[g]; else addG(g,-sp.mats[g]); }   // 开建付清材料
  if(!S.builds)S.builds=[]; S.builds.push({type:t, daysLeft:sp.months*30, total:sp.months*30, labor:sp.labor});
  toast(`🏗 ${d.n} 动工 · 派 ${sp.labor} 工干 ${sp.months} 月`); logMsg(`🏗 动工营造 ${d.n}(${sp.labor}工${sp.months}月)`);
  render(); reopenBuild(); save(true); }
function reopenBuild(){ if(!$("#modal").classList.contains("hidden")) openBuild(); }
// (旧「手动滑条卖货」sellQ/sellSlider/updSell/sellAll 已废弃删除 2026-06-14;卖货改马车运到市集自动卖)

// ===== 飘字 / 消息提示 =====
// ★分级 + 月结批量合并(治"太多太快"):普通消息同时最多 2 条;月结等窗口期内的琐碎消息只进大事记、不刷屏;'big' 级(添丁/年终/继位/灾害)醒目、久留
let _toastQ=[], _toastLive=0; const TOAST_MAX=2, TOAST_QCAP=8;
let _batch=0;                                  // 批量窗口计数:>0 时收编非 big 消息(只写大事记,不弹 toast)
function beginToastBatch(){ _batch++; }
function endToastBatch(){ if(_batch>0) _batch--; }
function toast(msg, level){                     // level:'big'=重要,醒目久留;窗口内非 big→转大事记不刷屏
  if(_batch>0 && level!=="big"){ if(typeof logMsg==="function") logMsg(msg); return; }
  _toastQ.push({msg, big:level==="big"}); if(_toastQ.length>TOAST_QCAP) _toastQ.splice(0,_toastQ.length-TOAST_QCAP); _drainToast();
}
function _drainToast(){
  while(_toastLive<TOAST_MAX && _toastQ.length){
    const it=_toastQ.shift(); _toastLive++;
    const t=document.createElement("div"); t.className="toast"+(it.big?" big":""); t.textContent=it.msg; $("#toast").appendChild(t);
    setTimeout(()=>{ if(t.parentNode) t.remove(); _toastLive--; _drainToast(); }, it.big?3200:1800);
  }
}
function logMsg(t){ if(!S.log)S.log=[]; S.log.push({y:yearN(), s:season(), t}); if(S.log.length>60) S.log.shift(); }   // 大事记
function floatGain(cardEl, txt){ const g=document.createElement("div"); g.className="cgain"; g.textContent=txt; cardEl.appendChild(g); setTimeout(()=>g.remove(),1100); }
function dayGainTxt(t){
  const d=DEFS[t]; if(deptManaged(t)<=0) return null;
  let out=null;
  if(d.kind==="work") return null;   // 工坊月批产,不飘日"+1"(免误导)
  if(d.kind==="crop"){ const b=deptItems(t)[0]; if(b)out=CROPS[b.crop].out; }
  else if(d.kind==="animal"){ const b=deptItems(t)[0]; if(b)out=ANIMALS[b.animal].out; }
  return out ? `+1 ${GNAME[out]}` : null;
}
function floatProduce(){   // 平常产出 +1 往上飘(限量,防多卡时卡顿)
  if((view!=="home"&&view!=="farm"&&view!=="town") || !$("#modal").classList.contains("hidden")) return;
  const cards=document.querySelectorAll('#main .card.live[data-type]'); const n=cards.length; if(!n) return;
  let spawned=0; const start=Math.floor(Math.random()*n);
  for(let i=0;i<n && spawned<3;i++){ const card=cards[(start+i)%n]; if(Math.random()>0.5) continue; const txt=dayGainTxt(card.dataset.type); if(txt){ floatGain(card,txt); spawned++; } }
}

// ===== 挂机 =====
function setSpeed(sp){ speed=sp; document.querySelectorAll("#speed button").forEach(b=>b.classList.toggle("on",+b.dataset.sp===sp)); if(timer)clearInterval(timer); if(sp>0)timer=setInterval(()=>{ _inTick=true; for(let i=0;i<sp;i++)step(); renderHUD(); _inTick=false; sceneProduce(); },TUNE.tickMs); }

// ===== 存档 =====
function save(quiet){ try{ localStorage.setItem("daur-card", JSON.stringify({S,_id})); if(!quiet) toast("💾 已存档"); }catch(e){} syncPush(); }
// ===== 本地存档同步:serve.py 提供 /save 端点 → 存档落地成文件(我能直接读你的进度);GitHub Pages 无此端点→自动退回 localStorage,公网不受影响 =====
let _syncOn=false, _syncT=null;
async function bootSync(){
  try{ const r=await fetch("save",{cache:"no-store"});
    if(r.ok && r.headers.get("X-Daur-Sync")){ _syncOn=true; const txt=await r.text(); const j=txt&&JSON.parse(txt);
      if(j && j.S){ localStorage.setItem("daur-card", txt); if(typeof load==="function" && load()){ if(typeof render==="function") render(); } } }   // 服务器存档为准 → 覆盖本地并重渲染
  }catch(e){}
}
function syncPush(){ if(!_syncOn || _syncT) return; _syncT=setTimeout(()=>{ _syncT=null;
  try{ fetch("save",{method:"POST",headers:{"Content-Type":"application/json"},body:localStorage.getItem("daur-card")||"{}"}).catch(()=>{}); }catch(e){} }, 1200); }   // 至多 1.2s 一次,总发最新存档
// ★背景/省份(可换):存 daur-region;换 JSON 即换城名/特产/水患文案
function loadRegion(){ try{ const r=localStorage.getItem("daur-region"); if(r&&REGIONS[r]) REGION=r; }catch(e){} applyRegion(REGION); }
function setRegion(key){ if(!REGIONS[key])return; try{ localStorage.setItem("daur-region", key); }catch(e){} applyRegion(key); toast(`🗺 背景已切换:${REGIONS[key].name}`); render(); save(true); }
function randomRegion(){ const ks=Object.keys(REGIONS); return ks[Math.floor(Math.random()*ks.length)]; }   // 🎲 随机省份(背景+乱世同步换)
function load(){ try{ const d=JSON.parse(localStorage.getItem("daur-card")); if(d&&d.S){
  S=Object.assign(freshState(), d.S);   // ★兜底迁移:freshState 给全字段默认值,旧档已有的值覆盖之 → 以后加 S 字段不必再手补(治"漏补就崩老档")
  if(!d.S.home){ S.home={grain:0}; allocHome(); }   // 极老档无院子粮仓→从可交易拨足人口粮
  // 老档补全(治家族里各种 undefined):妻妾无名/无名分、子女/养女无天赋
  (S.consorts||[]).forEach(c=>{ if(!c.name) c.name=randName("女"); if(!c.rank) c.rank="妾"; });
  (S.kids||[]).forEach(k=>{ if(!k.talent) k.talent=rollTalent(); });
  (S.wards||[]).forEach(w=>{ if(!w.talent) w.talent=rollTalent(); });
  if(S.landmarks&&S.landmarks.garden && !(S.gardenLv>0)){ S.gardenLv=1; delete S.landmarks.garden; }   // 旧「修园林」地标 → 多级花园 Lv1
  (S.carts||[]).forEach(c=>{ if(!c.tier) c.tier=1; });   // 老档马车补车档(板车60)
  { const fm=freshMarkets(); for(const k in fm) if(!S.markets[k]) S.markets[k]=fm[k]; }   // 补齐所有州府(防老档 markets 不全)
  for(const k in S.markets){ const m=S.markets[k]; if(!m.stock)m.stock={}; if(!m.glut)m.glut={}; if(!m.sold)m.sold={}; if(m.rev==null)m.rev=0;
    if(MARKETS_DEF[k]){ m.n=MARKETS_DEF[k].n; m.cheap=MARKETS_DEF[k].cheap; } }   // 老档刷新城名/特产(改四川;显示名跟最新)
  if(d.S.lastYearAssets==null) S.lastYearAssets=assets();
  { let capped=0; for(const b of S.ind){ if((b.tier||1)>MAX_TIER){ b.tier=MAX_TIER; capped++; } } if(capped) setTimeout(()=>{ toast(`⚖ 升级已封顶:${capped} 处超级产业归为「顶级」(×${Math.pow(2,MAX_TIER-1)})`); },800); }   // 旧档超阶产业回收到封顶
  _id=d._id||0; return true; } }catch(e){} return false; }

// ===== 导出 / 导入存档(换浏览器接着玩:复制存档码 → 另一个浏览器粘贴导入)=====
function saveCode(){ try{ return btoa(unescape(encodeURIComponent(JSON.stringify({S,_id})))); }catch(e){ return ""; } }   // 当前进度→base64 单行码(好复制、不怕特殊字符)
function openSaveIO(){
  const code=saveCode();
  let h=`<h2>📦 导出 / 导入 存档</h2><div class="desc" style="text-align:left">换浏览器(如 Safari)接着玩:<b>这边复制</b>存档码 → 到 Safari 打开游戏 → 这个页面把码<b>粘到下面</b>点导入。也可存成文件再传。<br><span style="color:var(--bad)">⚠️ 导入会覆盖目标浏览器里的进度。</span></div>`;
  h+=`<div class="bgroup">📤 导出(当前进度)</div>`;
  h+=`<textarea id="saveOut" readonly onclick="this.select()" style="width:100%;height:84px;font-size:11px;font-family:monospace;word-break:break-all;border:1px solid var(--line);border-radius:8px;padding:7px;background:var(--paper2,#fff);color:var(--ink)">${code}</textarea>`;
  h+=`<div class="lops"><button onclick="copySaveCode()">📋 复制存档码</button><button onclick="downloadSave()">💾 存成文件</button></div>`;
  h+=`<div class="bgroup">📥 导入(粘贴存档码 / 选文件)</div>`;
  h+=`<textarea id="saveIn" placeholder="把另一个浏览器复制的存档码粘到这里" style="width:100%;height:84px;font-size:11px;font-family:monospace;word-break:break-all;border:1px solid var(--line);border-radius:8px;padding:7px;background:var(--paper2,#fff);color:var(--ink)"></textarea>`;
  h+=`<input type="file" id="saveFile" accept=".txt,.json,.daur,text/plain" onchange="loadSaveFile(event)" style="margin:6px 0;width:100%">`;
  h+=`<button class="opt devcard" onclick="importSaveCode()"><b>📥 导入并读取</b><small>会覆盖当前浏览器的进度,读完自动重载</small></button>`;
  modal(h);
}
function copySaveCode(){ const t=document.getElementById("saveOut"); if(!t)return; const v=t.value;
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(v).then(()=>toast("📋 已复制!去另一个浏览器粘贴导入")).catch(()=>{ t.select(); toast("已选中,长按→拷贝"); }); }
  else { t.select(); try{document.execCommand("copy");toast("📋 已复制");}catch(e){ toast("已选中,长按→拷贝"); } } }
function downloadSave(){ try{ const blob=new Blob([saveCode()],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="大农庄存档.txt"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),3000); toast("💾 已存为文件「大农庄存档.txt」"); }catch(e){ toast("下载失败,改用复制"); } }
function loadSaveFile(ev){ const f=ev.target.files&&ev.target.files[0]; if(!f)return; const rd=new FileReader(); rd.onload=()=>{ const ta=document.getElementById("saveIn"); if(ta){ ta.value=String(rd.result||"").trim(); toast("📄 文件已载入下方,点「导入并读取」"); } }; rd.readAsText(f); }
function importSaveCode(){
  const raw=((document.getElementById("saveIn")||{}).value||"").trim(); if(!raw){ toast("先粘贴存档码 / 选文件"); return; }
  let json=raw;
  if(raw[0]!=="{"){ try{ json=decodeURIComponent(escape(atob(raw))); }catch(e){ json=raw; } }   // base64 → 原文(非base64则原样)
  let obj=null; try{ obj=JSON.parse(json); }catch(e){ toast("❌ 存档码无效(可能没复制全)"); return; }
  if(!obj||!obj.S){ toast("❌ 不是有效存档(缺 S)"); return; }
  try{ localStorage.setItem("daur-card", JSON.stringify({S:obj.S,_id:obj._id||0})); }catch(e){ toast("❌ 写入失败(存储空间?)"); return; }
  toast("✅ 导入成功,正在载入…"); setTimeout(()=>location.reload(), 700);
}

// ===== 回合制:每季「卡摊」付费买普通卡;年度结算每年 =====
let _heirThenDev = false;
function endRound(){
  setSpeed(0); _curDept=null; _curKid=null; _heirThenDev=true;
  if(typeof warUnlockCheck==='function' && warUnlockCheck()) return;   // 🏴 乱世降临:富可敌国→办团练(一次性,弹了等选)
  if(S.day%360===0){                            // ★年度结算(每4季一次):年结/赋税/年龄/添丁/学问/仙逝/黄河
    const _a=assets(), _d=Math.round(_a-(S.lastYearAssets||_a)); S.lastYearAssets=_a;   // 年终收支:家产净增
    toast(`📊 第${yearN()-1}年终 · 家产净${_d>=0?'+':''}${_d} 两(共 ${_a.toLocaleString()})`,'big'); logMsg(`📊 第${yearN()-1}年终 · 家产 ${_a.toLocaleString()} 两(净${_d>=0?'+':''}${_d})`);
    rollLevy();                                 // 今年朝廷征赋轻重(年景浮动,年年不同)
    const lt=landTax(); if(lt>0){ S.silver=Math.max(0,S.silver-lt); toast(`📜 ${S.levy.mood} · 田赋 -${lt}两`); logMsg(`📜 ${S.levy.mood}·朝廷征 田赋 -${lt}两`); }
    familyAge();                                // 全家+1岁,可能添丁
    studyTick();                                // 读书子女攒学问
    if(S.lord && S.lord.age>=S.lord.span){ openHeirPanel(); return; }  // 仙逝→继承→(承袭后)发展卡
    if((typeof warOn!=='function'||!warOn()) && Math.random()<0.10 && hasFarmToFlood()){ openFloodPanel(); return; }   // 🌊 江河水患(入乱世后由乱世威胁替代)
  }
  if(typeof worldTick==='function') worldTick();                     // 📜 天下大势:势力自相攻伐(波C·活世界)
  if(typeof warThreatRoll==='function' && warThreatRoll()) return;   // 🔥 乱世威胁:别家来犯/劫粮(季·锁定弹窗;替黄河水患)
  if(rollEvent()) return;                        // 🎲 季随机事件(低频·重大才出·确定后果);弹了就等你选(chooseEvent 续命)
  openSeason();                                  // ★每季:卡摊(付费买普通卡)
}
function lordDies(cause){   // 非年终猝死(枭首等)→继承,继承后直接 resume(不弹年终发展卡)
  setSpeed(0); _curDept=null; _curKid=null; _heirThenDev=false; openHeirPanel(cause);
}
function bearChild(){
  const sex=Math.random()<0.5?"男":"女";
  const kb={id:++_id, name:randName(sex), sex, age:0, talent:rollTalent(), post:null}; S.kids.push(kb);
  toast(`👶 ${S.surname}家添了个${sex==="男"?"丁":"千金"}!`,'big'); logMsg(`👶 添${sex==="男"?"丁":"千金"} ${S.surname}${kb.name}(天赋「${kb.talent}」)`);
}
function familyAge(){
  if(S.lord) S.lord.age+=1;                     // 1 历年=1 岁(放慢→世代更稳、继承少打断)
  if(S.spouse) S.spouse.age+=1;
  for(const c of consorts()) c.age+=1;            // 妻妾随年长
  if(S.kids) for(const k of S.kids) k.age+=1;
  if(S.wards) for(const w of S.wards) w.age+=1;   // 养女随年长大
  // 添丁:正妻 + 各育龄妾 各自掷(妾略低);奶妈助育;每年总数封顶 2(防爆)
  let births=0; const nanny=svc("nanny")*0.15;
  if(S.spouse && S.spouse.age<45 && Math.random()<(TUNE.birthBase+nanny)){ bearChild(); births++; }
  for(const c of consorts()){ if(births>=2) break; if(c.age<45 && Math.random()<(TUNE.birthConc+nanny+(S.harmony||0)*0.04)){ bearChild(); births++; } }
}
function openHeirPanel(cause){
  setSpeed(0); _curDept=null; _curKid=null;
  const heirs=(S.kids||[]).slice().sort((a,b)=>{ const sc=k=>(k.age>=10?2:0)+(k.sex==="男"?1:0); return sc(b)-sc(a)||b.age-a.age; });
  const desc = cause || `${S.surname}${S.lord.name} 享年 ${S.lord.age} 岁,溘然长辞。`;
  logMsg(`🕯️ ${cause?cause:`${S.surname}${S.lord.name} 享年 ${S.lord.age} 岁辞世`}`);
  let h=`<h2>🕯️ 家主仙逝</h2><div class="desc">${desc}</div>`;
  if(!heirs.length){
    h+=`<div class="desc" style="color:var(--bad)">膝下无子嗣承继……${S.surname}氏一脉,到此为止。</div>
        <button class="opt devcard" onclick="restartGame()"><b>重整旗鼓</b><small>另起一世,从头来过</small></button>`;
    modal(h,true); return;
  }
  h+=`<div class="desc">家业需有人承继,择一人继位:</div>`;
  heirs.forEach(k=> h+=`<button class="opt devcard" onclick="pickHeir('${k.id}')">${k.sex==="男"?"👦":"👧"} <b>${S.surname}${k.name}</b><small>${k.sex} · ${k.age}岁 · 天赋「${k.talent}」${k.age<12?' · ⚠幼主临政(满12岁前全局产出-20%)':''}</small></button>`);
  modal(h,true);
}
function pickHeir(id){
  const k=(S.kids||[]).find(x=>String(x.id)===String(id)); if(!k)return;
  let fee=Math.min(200,Math.round(assets()*0.03)); if(S.landmarks&&S.landmarks.shrine2) fee=Math.round(fee*0.5); S.silver=Math.max(0,S.silver-fee);   // 丧葬费(有宗祠减半)
  S.lord={name:k.name, age:k.age, span:62+Math.floor(Math.random()*15), rank:k.rank||0};   // 承袭功名→优免税续
  S.spouse=null; S.consorts=[]; S.harmony=0;       // 新家主未婚,内宅另立,可再说媒/纳妾
  { const bw=(S.wards||[]).filter(w=>w.kind==="bride"&&w.age>=WARD_GROWN).sort((a,b)=>b.age-a.age)[0];   // 有成年童养媳→自动配新家主
    if(bw){ S.spouse={name:bw.name, age:bw.age}; S.wards=S.wards.filter(x=>x!==bw); logMsg(`💞 童养媳 ${bw.name} 与新家主 ${k.name} 圆房,立为主母`); } }
  S.kids=S.kids.filter(x=>x!==k);                 // 继位者出列
  if(k.post==="labor") clampAssign();
  S.gen=(S.gen||1)+1; S.rep=(S.rep||0)+4;          // 承袭→添声望
  toast(`🕯️ ${S.surname}${k.name} 继位 · ${S.surname}氏第 ${S.gen} 代 · 丧葬 -${fee}两`,'big'); logMsg(`👑 ${S.surname}${k.name} 继位,${S.surname}氏第 ${S.gen} 代`);
  celebrate("👑", S.surname+k.name+" 继位", `${S.surname}氏第 ${S.gen} 代`);
  // 主母随代更替:有成年童养媳→已圆房立为主母;否则新家主未婚→主母空缺,需再说媒(老主母随上代谢幕)
  if(S.spouse) toast(`💞 ${S.spouse.name} 立为新主母`);
  else toast(`ℹ 新家主 ${k.name} 尚未婚配 · 去「家族」说媒娶主母(上代主母已随之谢幕)`);
  $("#modal").dataset.lock=''; closeModal();
  if(_heirThenDev){ openSeason(); }                             // 年终死→接本季卡摊
  else { render(); save(true); setSpeed(_userSpeed||1); }                   // 猝死→直接续命(恢复玩家速度)
}
function restartGame(){ $("#modal").dataset.lock=''; closeModal(); seedFarm(); render(); save(true); setSpeed(1); toast("🌅 新的一世,从头开张"); }
// (旧「供奉神明」OFFERINGS/openWorship/worship/grantBlessing 已暂停删除 2026-06-14;git 历史可恢复)
function openSeason(){ render(); save(true); setSpeed(_userSpeed||1); }   // 每季入口:直接续命,恢复到玩家的速度(不强制打回常速)

// (旧「随机事件」maybeEvent/showEvent/chooseEvent/applyOutcome 已暂停删除 2026-06-14:只文字提示、无实质意义;待重做成有实质影响的事件再开。data_events.js 也不再加载)

// ===== 启动 =====
// ===== 主题 · 字号/字体/配色(设置页切换,存 daur-theme;纯显示偏好,与游戏存档分开)=====
const FONTS = {
  kai:  {n:"楷体", css:'"Kaiti SC","STKaiti","Kaiti TC","KaiTi",楷体,serif'},
  song: {n:"宋体", css:'"Songti SC","STSong","SimSun",宋体,serif'},
  hei:  {n:"黑体", css:'"PingFang SC","Heiti SC","Microsoft YaHei",黑体,sans-serif'},
  yuan: {n:"圆体", css:'"Yuanti SC","PingFang SC","Microsoft YaHei",sans-serif'},
};
const FSIZE  = { s:{n:"小",v:0.9}, m:{n:"中",v:1}, l:{n:"大",v:1.15} };
const THEMES = { warm:{n:"古纸暖"}, night:{n:"暗夜"}, qing:{n:"清雅"} };
let _theme = { fs:"m", font:"kai", color:"warm", layout:"auto" };   // layout:auto/mobile/pc(版式;auto=按屏判,可手动覆盖防误判放大)
function applyTheme(){
  const b=document.body;
  Object.keys(THEMES).forEach(k=> b.classList.remove("theme-"+k));
  if(_theme.color && _theme.color!=="warm") b.classList.add("theme-"+_theme.color);
  b.style.setProperty("--font", _theme.font && FONTS[_theme.font] ? FONTS[_theme.font].css : "");
  const pcBase = b.classList.contains("layout-pc") ? 1.5 : 1;          // PC 整体放大 1.5×
  b.style.setProperty("--ui-zoom", (pcBase*(FSIZE[_theme.fs]||FSIZE.m).v).toFixed(3));
}
function loadTheme(){ try{ const t=JSON.parse(localStorage.getItem("daur-theme")); if(t) _theme=Object.assign(_theme, t); }catch(e){} applyTheme(); }
function saveTheme(){ try{ localStorage.setItem("daur-theme", JSON.stringify(_theme)); }catch(e){} }
function setThemeOpt(k,v){ _theme[k]=v; saveTheme(); if(k==="layout"){ applyLayoutMode(); } else applyTheme(); if(view==="set") renderMain(); }   // 版式改了要重判 PC/手机(applyLayoutMode 内含 applyTheme)
function init(){
  loadRegion();   // 先定背景(城名等)再建/读档
  if(!load()) seedFarm();
  loadTheme();
  document.querySelectorAll("#speed button").forEach(b=> b.onclick=()=>{ const sp=+b.dataset.sp; if(sp>0) _userSpeed=sp; setSpeed(sp); });
  document.querySelectorAll("#tabbar button").forEach(b=> b.onclick=()=>setView(b.dataset.view));
  document.querySelectorAll("#hud .stat").forEach(s=> s.onclick=()=>openInventory());
  $("#modal").onclick=e=>{ if(e.target.id==="modal" && !$("#modal").dataset.lock) closeModal(); };
  $("#sheetbg").onclick=scCloseSheet;   // 点遮罩关底部面板
  ['gesturestart','gesturechange','gestureend'].forEach(ev=> document.addEventListener(ev, e=>e.preventDefault()));   // 禁 iOS 捏合缩放(双击放大由 body touch-action:pan-y 拦)
  render();
  if(typeof warOn==='function' && warOn()) setView("tian");   // ★v2为核心:已入乱世的存档,载入即落天下页(v1转后台挂机)
  // 布局由 layout.css 的 flex 外壳负责(不再 JS 算高度);这里只判定 PC/手机布局模式
  applyLayoutMode(); window.addEventListener('resize', applyLayoutMode); window.addEventListener('orientationchange', applyLayoutMode);
  ['gesturestart','gesturechange','gestureend'].forEach(ev=>document.addEventListener(ev, e=>e.preventDefault(), {passive:false}));   // 挡 iOS 整页误触捏合放大(场景自己的缩放走 pointer 事件、不受影响)
  setSpeed(1);
}
// 按屏宽 + 指针类型判 PC/手机,给 body 加 layout-pc / layout-mobile(具体样式见 layout.css);可被「显示设置·版式」手动覆盖
function applyLayoutMode(){
  const m=(_theme&&_theme.layout)||"auto";
  // ★自动判定加 hover:hover(触屏没有悬停→大屏/横屏手机不再被误判为电脑→不再莫名 ×1.5 放大);手动可强制
  const pc = m==="pc" ? true : m==="mobile" ? false : window.matchMedia("(min-width:980px) and (pointer:fine) and (hover:hover)").matches;
  document.body.classList.toggle("layout-pc", pc);
  document.body.classList.toggle("layout-mobile", !pc);
  applyTheme();   // PC/手机变了→重算内容缩放(--ui-zoom 含 PC 1.5× 基准)
}
window.closeModal=closeModal; window.openBuild=openBuild; window.doBuild=doBuild; window.openDept=openDept;
window.assignDept=assignDept; window.upgradeItem=upgradeItem; window.razeItem=razeItem; window.setItemCrop=setItemCrop; window.setItemAnimal=setItemAnimal;
window.upgradeAllDept=upgradeAllDept; window.upgradeAllInd=upgradeAllInd;   // 一键升满(本类/全庄)
window.clearNoSell=clearNoSell;   // 一键清空留货单(全部恢复外运)
window.doRecruit=doRecruit; window.doBuyLabor=doBuyLabor; window.recruitAfar=recruitAfar; window.setView=setView; window.endRound=endRound;
window.doMatchmake=doMatchmake; window.openKid=openKid; window.setKidPost=setKidPost; window.marryOffKid=marryOffKid; window.pickHeir=pickHeir; window.restartGame=restartGame;
window.doBanquet=doBanquet; window.smuggleSalt=smuggleSalt; window.buySaltLicense=buySaltLicense; window.runEscort=runEscort;
window.sitExam=sitExam; window.openPress=openPress; window.floodChoice=floodChoice; window.doResearch=doResearch;
window.doHire=doHire; window.dismissServant=dismissServant; window.equipTool=equipTool;
window.openBroker=openBroker; window.buyWard=buyWard; window.wedWard=wedWard; window.wardToMaid=wardToMaid; window.marryOffWard=marryOffWard;
window.doJuana=doJuana; window.buyLandmark=buyLandmark; window.upgradeManor=upgradeManor; window.buildRoom=buildRoom; window.upgradeGarden=upgradeGarden;
window.takeSecondWife=takeSecondWife; window.takeConcubine=takeConcubine; window.takeFlower=takeFlower; window.dismissConsort=dismissConsort;
window.openCityShops=openCityShops; window.openPlot=openPlot; window.openShop=openShop; window.decorShop=decorShop; window.closeShop=closeShop;
window.hireGirl=hireGirl; window.trainGirl=trainGirl; window.banquetQinglou=banquetQinglou;
window.openBankSheet=openBankSheet; window.bankDeposit=bankDeposit; window.bankWithdraw=bankWithdraw; window.bankLend=bankLend; window.bankRecall=bankRecall;
window.openPawnSheet=openPawnSheet; window.buyTreasure=buyTreasure; window.pawnGood=pawnGood; window.redeemPawn=redeemPawn;
window.openTreasureSheet=openTreasureSheet; window.sellTreasure=sellTreasure; window.hostGathering=hostGathering; window.offerTreasure=offerTreasure;
window.buyCart=buyCart; window.setCartDest=setCartDest; window.setCartAuto=setCartAuto; window.takeHaulOrder=takeHaulOrder; window.openHaulOrder=openHaulOrder;
window.openTradeRoute=openTradeRoute; window.tradeEst=tradeEst; window.confirmTrade=confirmTrade; window.dispatchAll=dispatchAll; window.assignCart=assignCart;
window.dispatchIdleHaul=dispatchIdleHaul; window.toggleAutoHaul=toggleAutoHaul;   // 闲车一键接活 / 自动接活
window.setThemeOpt=setThemeOpt; window.setRegion=setRegion; window.randomRegion=randomRegion;
window.openLog=openLog; window.openEstate=openEstate; window.openDisplay=openDisplay;   // 设置页二级页:大事记/家底/显示
window.openSaveIO=openSaveIO; window.copySaveCode=copySaveCode; window.downloadSave=downloadSave; window.loadSaveFile=loadSaveFile; window.importSaveCode=importSaveCode;   // 导出/导入存档
window.openCartCargo=openCartCargo; window.pickCartCargo=pickCartCargo; window.smartLoadCart=smartLoadCart;
window.craftCart=craftCart; window.upgradeCart=upgradeCart; window.openCartShop=openCartShop; window.openFleetDispatch=openFleetDispatch; window.dispatchFleet=dispatchFleet; window.fleetEst=fleetEst; window.toggleNoSell=toggleNoSell;
window.openInventory=openInventory;
window.confirmRestart=confirmRestart; window.doRestart=doRestart;
window.openFamilySheet=openFamilySheet;   // 场景版:宅院「家族」标签
function buildHousing(t){ const H=HOUSING[t]; if(!H) return; if(S.silver<H.cost){ toast(`${H.n}需 ${H.cost} 两`); return; }   // 波2房屋出租:修宿舍/客栈
  S.silver-=H.cost; if(!S.village) S.village=freshState().village; S.village[t+'s']=(S.village[t+'s']||0)+1;
  toast(`🏠 ${H.n}落成 · 可雇长工 +${H.worker}`); logMsg(`🏠 修${H.n}(可雇+${H.worker}·人口承载+${H.pop})`); render(); save(true); }
window.openIndListSheet=openIndListSheet; window.openMarketSheet=openMarketSheet; window.openCartSheet=openCartSheet; window.openVillageSheet=openVillageSheet; window.buildHousing=buildHousing;
window.openCitySheet=openCitySheet; window.openCityMarkets=openCityMarkets; window.openCityMarket=openCityMarket; window.setCity=setCity;
window.openYamenSheet=openYamenSheet; window.openSaltSheet=openSaltSheet; window.openEscortSheet=openEscortSheet; window.openExamSheet=openExamSheet; window.openPressSheet=openPressSheet;   // 官面各建筑专属面板
window.openManorUpgrade=openManorUpgrade; window.confirmManorUpgrade=confirmManorUpgrade;
init();        // 同步启动:S 立即就绪,避免其他模块 init 读 S 竞态
bootSync();    // 再异步拉本地服务器存档(serve.py):有则覆盖本地+重渲染;GitHub Pages 无端点则静默退回 localStorage
