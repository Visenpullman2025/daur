/* ===== 共享演示数据(四套版面用同一份内容/数值,保证只比版面不比内容) ===== */
const ICON  = p => `../assets/icons/${p}.webp`;
const MANOR = n => `../assets/manor/manor-${n}.webp`;

const HUD = {
  title:'李·安富', tierName:'殷实人家', year:12, season:'夏',
  silver:'8,706', grain:'+12/月', ding:'19/30', favor:22, assets:'19,045', freeW:'6/72'
};

/* tier: 1普通 2精 3上 4顶 → 颜色见 base.css --t1..t4 / 星级 */
const FARM = [
  {id:'field', icon:'field',  name:'旱田', count:5, crop:'麦·菽', out:'+18 石/月', lvl:3, tier:3, work:4, cap:5,
   per:'每 4 工管 5 亩 · 月产 +2.8 石 +4.8 钱', crops:['麦','菽','茶','棉','桑']},
  {id:'paddy', icon:'paddy',  name:'水田', count:3, crop:'稻', out:'+12 石/月', lvl:2, tier:2, work:3, cap:4,
   per:'每 4 工管 4 亩 · 喜水', crops:['稻','菱角']},
  {id:'forest',icon:'forest', name:'林场', count:1, crop:'木料', out:'+6 木/月', lvl:1, tier:1, work:1, cap:1,
   per:'季收木料 · 供作坊与营造', crops:['杉','松','竹']},
];
const HERD = [
  {id:'barn',   icon:'sheep',  name:'牧场', count:2, crop:'羊·牛', out:'+6 头/年', lvl:2, tier:2, work:2, cap:2,
   per:'放养牛羊 · 年出栏', crops:['羊','牛','马']},
  {id:'chicken',icon:'chicken',name:'鸡舍', count:1, crop:'蛋', out:'+30 枚/月', lvl:1, tier:1, work:1, cap:1,
   per:'散养家禽 · 月出蛋', crops:['鸡','鸭','鹅']},
];
const MINE = [
  {id:'mine',     icon:'mine',     name:'矿场',   count:2, crop:'铁·煤', out:'+5 斤/月', lvl:1, tier:1, work:4, cap:4,
   per:'采铁挖煤 · 供铁匠砖窑', crops:['铁','煤','黏土']},
  {id:'brickkiln',icon:'brickkiln',name:'砖窑',   count:1, crop:'砖', out:'+8 块/月', lvl:1, tier:1, work:2, cap:2,
   per:'烧砖 · 供营造大宅', crops:['青砖','瓦']},
  {id:'smithy',   icon:'smithy',   name:'铁匠铺', count:1, crop:'农具', out:'+2 件/月', lvl:1, tier:1, work:2, cap:2,
   per:'打农具 · 添置可提田产', crops:['农具','刀具']},
];
const GROUPS = [
  {key:'farm', name:'🌾 农耕', items:FARM},
  {key:'herd', name:'🐂 畜牧', items:HERD},
  {key:'mine', name:'⛰ 矿冶', items:MINE},
];
const ALL = [...FARM, ...HERD, ...MINE];

const FAMILY = [
  {icon:'lord',     role:'家主',   name:'李安富', age:42, tag:'当家理政 · 功名:监生'},
  {icon:'wife',     role:'大夫人', name:'柳氏',   age:38, tag:'操持内宅 · 育有二子女'},
  {icon:'son',      role:'长子',   name:'李文昌', age:16, tag:'入塾读书 · 学问 +2/年'},
  {icon:'daughter', role:'长女',   name:'李婉',   age:13, tag:'待字闺中 · 通女红'},
];

const TIERTXT = {1:'普通',2:'精',3:'上',4:'顶'};
const stars = t => '✦'.repeat(t) + '<span style="opacity:.25">✦</span>'.repeat(4-t);
const tcol  = t => `var(--t${t})`;

/* HUD 渲染(单行极薄版,各版面共用) */
function hudHTML(){
  return `<div class="hud">
    <div class="stats">
      <div class="s acc"><img src="${ICON('hud_assets')}"><b>${HUD.assets}</b></div>
      <div class="s"><img src="${ICON('hud_silver')}"><b>${HUD.silver}</b></div>
      <div class="s"><img src="${ICON('hud_grain')}"><b>${HUD.grain}</b></div>
      <div class="s"><img src="${ICON('hud_labor')}"><b>${HUD.freeW}</b></div>
      <div class="s"><img src="${ICON('hud_favor')}"><b>${HUD.favor}</b></div>
    </div>
    <div class="date">第${HUD.year}年·${HUD.season} <span class="spd">▶</span></div>
  </div>`;
}

/* 宅邸 7 级(对应 manor-0..6),含每级派生加成 */
const MANOR_LV = [
  {n:'茅屋',     workCap:6,  store:300,  prestige:0},
  {n:'瓦房院',   workCap:12, store:500,  prestige:3},
  {n:'四合小院', workCap:18, store:800,  prestige:6},
  {n:'三进宅院', workCap:30, store:1500, prestige:18},
  {n:'深宅大院', workCap:48, store:2600, prestige:34},
  {n:'府邸',     workCap:72, store:4200, prestige:58},
  {n:'庄园府邸', workCap:120,store:8000, prestige:96},
];

/* 底栏 5 tab(active=当前页 key) */
const TABS = [
  {k:'home', t:'宅院', i:'tab_home'},
  {k:'farm', t:'产业', i:'tab_farm'},
  {k:'town', t:'市集', i:'tab_town'},
  {k:'city', t:'城镇', i:'tab_city'},
  {k:'set',  t:'设置', i:'tab_set'},
];
function tabbarHTML(active){
  return `<nav class="tabbar">${TABS.map(t=>
    `<div class="tab ${t.k===active?'on':''}" data-tab="${t.k}"><img src="${ICON(t.i)}">${t.t}</div>`
  ).join('')}</nav>`;
}

/* 顶部演示导航条:‹上一套 / 标题 N/4 / 下一套› + 回菜单 */
const DEMOS = [
  {f:'d1.html', name:'庭院沙盘'},
  {f:'d2.html', name:'图鉴卡片'},
  {f:'d3.html', name:'帐房仪表盘'},
  {f:'d4.html', name:'线装精修'},
];
function demonavHTML(idx){
  const prev = DEMOS[(idx+3)%4].f, next = DEMOS[(idx+1)%4].f;
  return `<div class="demonav">
    <a href="${prev}">‹ 上一套</a>
    <div class="who"><b>${DEMOS[idx].name}</b><span>${idx+1} / 4 · 点回菜单换套</span></div>
    <a href="${next}">下一套 ›</a>
  </div>
  <div class="demonav" style="justify-content:center;margin-top:-4px">
    <a href="index.html" style="background:rgba(179,137,47,.22);border-color:rgba(179,137,47,.5)">⌂ 回菜单</a>
  </div>`;
}

/* 飘字反馈 */
function floatAt(el, txt){
  const r = el.getBoundingClientRect(), p = el.closest('.phone').getBoundingClientRect();
  const f = document.createElement('div'); f.className='float'; f.textContent=txt;
  f.style.left=(r.left-p.left+r.width/2-10)+'px'; f.style.top=(r.top-p.top-6)+'px';
  el.closest('.phone').appendChild(f); setTimeout(()=>f.remove(),1100);
}

/* 简易 tab 占位页(市集/城镇/设置 演示从略) */
function stubHTML(name, emoji, note){
  return `<div class="stub"><div class="big">${emoji}</div><div style="font-size:16px;color:var(--ink2)">${name}</div>
    <div style="max-width:240px;font-size:13px;line-height:1.6">${note}</div>
    <div style="font-size:12px" class="muted">(本演示聚焦「产业 + 管理」版面,此页从略)</div></div>`;
}
