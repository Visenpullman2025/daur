'use strict';
// [components] 可复用 UI 件 —— 纯函数,返回 HTML 串。各页"取数据 + 拼装这些件"。
// ★改卡片/按钮/区块的「长相」改这里,一处生效全局;改玩法/数值别动这里。
// 输出的 class/结构 与历史一致 → style.css 不用改。

// 卡片(产业卡 / 家眷卡 通用)。o={cls,ico,nm,out,sub,more,onclick,data,extra}
function Card(o){
  const on = o.onclick ? ` onclick="${o.onclick}"` : "";
  return `<div class="card ${o.cls||''}"${o.data?(" "+o.data):""}${on}>`
    + `<div class="ico">${o.ico||''}</div>`
    + `<div class="nm">${o.nm||''}</div>`
    + (o.out!=null ? `<div class="out">${o.out}</div>` : "")
    + (o.sub!=null ? `<div class="sub">${o.sub}</div>` : "")
    + (o.extra||"")
    + (o.more ? `<div class="more">${o.more}</div>` : "")
    + `</div>`;
}
// 选项按钮(弹窗主力)。o={label,cost,sub,onclick,cls,disabled}
function OptBtn(o){
  const cls = ("opt " + (o.cls||"") + (o.disabled?" dis":"")).replace(/\s+/g," ").trim();
  const on = (o.onclick && !o.disabled) ? ` onclick="${o.onclick}"` : "";
  return `<button class="${cls}"${on}>${o.label||''}`
    + (o.cost!=null ? `<span class="optcost">${o.cost}</span>` : "")
    + (o.sub!=null ? `<small>${o.sub}</small>` : "")
    + `</button>`;
}
// 小标题。BGroup("雇佣家仆","月俸共 …")
function BGroup(label, sub){ return `<div class="bgroup">${label}${sub?` <small style="color:var(--mut);font-weight:400">${sub}</small>`:""}</div>`; }
// 产业分区(标题+计数+卡片网格)。o={title,count,extra,cards}
function Group(o){
  return `<section class="group"><h3 class="ghead">${o.title}<span class="gcount">${o.count}</span>${o.extra||""}</h3>`
    + `<div class="grow">${o.cards||""}</div></section>`;
}
// 城内行当卡。o={ico,title,tag,body}
function VentCard(o){
  return `<div class="ventcard"><div class="vhead"><span class="vico">${o.ico||''}</span><b>${o.title||''}</b>`
    + (o.tag!=null?`<span class="vtag">${o.tag}</span>`:"") + `</div>`
    + `<div class="vbody">${o.body||""}</div></div>`;
}
// −N＋ 步进行。o={label,sub,value,minus,plus,plusDis,minusDis}
function StepRow(o){
  return `<div class="deptrow"><span>${o.label}${o.sub!=null?` <small>${o.sub}</small>`:""}</span>`
    + `<div class="step"><button class="rbtn ${o.minusDis?'dis':''}" onclick="${o.minus}">−</button>`
    + `<b>${o.value}</b>`
    + `<button class="rbtn ${o.plusDis?'dis':''}" onclick="${o.plus}">＋</button></div></div>`;
}
// 进度条。Bar(pct,{cls,id,fill}) —— 外壳 class + 填充 class 可定制
function Bar(pct, o){ o=o||{}; const p=Math.max(0,Math.min(100,pct));
  return `<div class="${o.cls||'progbar'}"><div class="${o.fill||'progfill'}"${o.id?` id="${o.id}"`:""} style="width:${p}%"></div></div>`; }
// 页容器。Screen("🏪 市集",bodyHtml)
function Screen(title, body){ return `<div class="screen"><h2>${title}</h2>${body||""}</div>`; }
