/* ============================================================
 * 千界家主 · 事件池 data_events.js
 * 纯 ES5,挂 window.QJ 命名空间,无依赖。
 * 分类: disaster 天灾 | biz 产业风险 | chance 机遇 | family 人情家族 | gov 官府 | odd 奇遇
 * ============================================================ */
window.QJ = window.QJ || {};

QJ.EVENTS = [

  /* ==================== disaster 天灾 (8) ==================== */

  {
    id: 'locust_plague',
    name: '蝗灾',
    icon: '🦗',
    cat: 'disaster',
    stage: [2, 10],
    seasons: [1, 2],
    weight: 8,
    cooldown: 90,
    requires: null,
    text: '东边天际压来一团黑云,落地竟是蝗虫,啃得田埂噼啪作响。老佃户跪在地头直磕头:「家主,再不想法子,今年的嚼谷全完!」',
    choices: [
      {
        label: '雇人连夜扑打',
        outcome: {
          gold: -60,
          risk: { p: 0.3, gold: -50, log: '蝗群过境如篦头发,补雇的人手也白搭,又赔进去一笔。' },
          log: '火把扑棍折腾一宿,总算护住了大半青苗。'
        }
      },
      {
        label: '抢收青粮止损',
        outcome: {
          inv: { grain: 15 },
          special: 'crop_destroy',
          log: '青苗割了一茬囤进仓,剩下那块田喂了蝗虫。'
        }
      },
      {
        label: '听天由命',
        outcome: {
          special: 'crop_destroy',
          inv: { grain: -10 },
          rep: -2,
          log: '蝗过如剃,好好一块田啃成了光杆,佃户们背后骂家主抠门。'
        }
      }
    ]
  },

  {
    id: 'great_drought',
    name: '大旱',
    icon: '☀️',
    cat: 'disaster',
    stage: [1, 10],
    seasons: [1, 2],
    weight: 8,
    cooldown: 90,
    requires: null,
    text: '一连四十天没掉一滴雨,河滩裂得能伸进手掌。村里人轮着去龙王庙磕头,庙祝赚得眉开眼笑,地里的苗却一天黄过一天。',
    choices: [
      {
        label: '雇人挑水保田',
        outcome: {
          gold: -50,
          loyalty: -3,
          log: '一担担井水浇下去,苗保住了,人累瘫了一片。'
        }
      },
      {
        label: '舍小保大',
        outcome: {
          special: 'crop_destroy',
          priceShock: { good: 'grain', mult: 1.6, days: 10 },
          log: '弃了最远那块田,水全浇在好地上。市面粮价开始往上蹿。'
        }
      },
      {
        label: '出钱办祈雨会',
        outcome: {
          gold: -30,
          rep: 4,
          risk: { p: 0.6, gold: -40, log: '雨没求来,戏钱香火钱倒流了一河,田还是旱着。' },
          log: '祈雨当夜竟真落了雨,满村都说家主面子通天。'
        }
      }
    ]
  },

  {
    id: 'flood_rain',
    name: '暴雨成涝',
    icon: '🌧️',
    cat: 'disaster',
    stage: [1, 10],
    seasons: [1, 2],
    weight: 8,
    cooldown: 80,
    requires: null,
    text: '瓢泼大雨下了三天三夜,低洼的田全成了汪洋,鸭子倒是乐疯了。账房撑着伞来报:仓房后墙渗水,再不管,存粮要发霉。',
    choices: [
      {
        label: '抢修仓房',
        outcome: {
          gold: -40,
          inv: { wood: -5 },
          log: '冒雨堵上了渗口,存粮无恙,工钱木料花了一笔。'
        }
      },
      {
        label: '先抢地里的',
        outcome: {
          inv: { grain: -20 },
          special: 'crop_destroy',
          log: '人手全派去排田水,仓里霉了一垛粮,田还是淹了一块。'
        }
      },
      {
        label: '雇短工两头抢',
        outcome: {
          gold: -90,
          rep: 2,
          log: '银子开道,人手翻倍,田仓都保住了,村里人都说家主舍得。'
        }
      }
    ]
  },

  {
    id: 'hailstorm',
    name: '冰雹',
    icon: '🧊',
    cat: 'disaster',
    stage: [2, 10],
    seasons: [0, 1],
    weight: 7,
    cooldown: 90,
    requires: null,
    text: '晌午天还好好的,忽然砸下鸡蛋大的雹子,房瓦碎了一片,地里的菜被砸成了菜泥。隔壁王婆抱着她家瓦罐哭,说老天爷不长眼。',
    choices: [
      {
        label: '先修房再说',
        outcome: {
          gold: -35,
          inv: { brick: -8, veg: -15 },
          log: '砖瓦补上了,菜地认栽,好歹屋里不漏天。'
        }
      },
      {
        label: '砸烂的菜贱卖',
        outcome: {
          gold: 20,
          inv: { veg: -25 },
          rep: -1,
          log: '雹子菜半价出清,买主嘀咕着「这也叫菜」,好歹回了点本。'
        }
      }
    ]
  },

  {
    id: 'pestilence',
    name: '瘟疫',
    icon: '🤒',
    cat: 'disaster',
    stage: [3, 10],
    seasons: null,
    weight: 6,
    cooldown: 120,
    requires: null,
    text: '镇上开始死人了。先是码头的脚夫,再是布庄的伙计,郎中说是时疫,药材一天一个价。家有存药的,这会儿是坐在金山上——也坐在火山口上。',
    choices: [
      {
        label: '平价施药',
        outcome: {
          inv: { herb: -20 },
          rep: 8,
          favor: 3,
          priceShock: { good: 'herb', mult: 4, days: 12 },
          log: '家主开仓平价售药,门口排起长队,满镇都念这份恩。'
        }
      },
      {
        label: '高价出货',
        outcome: {
          gold: 300,
          inv: { herb: -20 },
          rep: -8,
          priceShock: { good: 'herb', mult: 4, days: 12 },
          log: '药价翻了四倍照单全收,银子滚进来,骂名也滚进来。'
        }
      },
      {
        label: '闭门自保',
        outcome: {
          loyalty: -4,
          priceShock: { good: 'herb', mult: 4, days: 12 },
          risk: { p: 0.25, gold: -150, log: '府里还是有人染了疫,延医抓药花了大钱。' },
          log: '大门一关谁也不见,仆役们觉得家主凉薄,人心浮动。'
        }
      }
    ]
  },

  {
    id: 'snow_disaster',
    name: '雪灾',
    icon: '❄️',
    cat: 'disaster',
    stage: [2, 10],
    seasons: [3],
    weight: 8,
    cooldown: 90,
    requires: null,
    text: '大雪封山七日,草料价钱一日三跳。栏里的牲口饿得直叫唤,放牛娃裹着破棉袄来问:家主,牲口的嚼口,是买还是熬?',
    choices: [
      {
        label: '高价买草料',
        outcome: {
          gold: -80,
          inv: { fodder: 30 },
          priceShock: { good: 'fodder', mult: 2.5, days: 10 },
          log: '咬牙吃下高价草料,牲口们嚼得欢,账房脸都绿了。'
        }
      },
      {
        label: '减食硬熬',
        outcome: {
          priceShock: { good: 'fodder', mult: 2.5, days: 10 },
          risk: { p: 0.45, gold: -30, log: '没熬过去,栏里弱的那只倒下了,皮毛贱卖了几个钱。' },
          special: 'animal_die',
          log: '一天一顿薄料硬撑,牲口瘦得脱了形。'
        }
      },
      {
        label: '宰一头换钱',
        outcome: {
          special: 'animal_die',
          gold: 60,
          inv: { meat: 15 },
          log: '雪天肉价好,忍痛宰了一头,栏里安静了不少。'
        }
      }
    ]
  },

  {
    id: 'house_fire',
    name: '失火',
    icon: '🔥',
    cat: 'disaster',
    stage: [2, 10],
    seasons: null,
    weight: 7,
    cooldown: 100,
    requires: null,
    text: '半夜锣响,后街火光冲天——烧的是自家铺面!伙计们提着水桶乱作一团,看热闹的比救火的多,还有人趁乱往怀里揣东西。',
    choices: [
      {
        label: '重金雇人救火',
        outcome: {
          gold: -100,
          special: 'shop_close_3d',
          log: '泼出去的银子比泼出去的水还多,好歹只烧了半边,停业修整几日。'
        }
      },
      {
        label: '组织自救',
        outcome: {
          special: 'shop_close_3d',
          loyalty: 3,
          risk: { p: 0.4, gold: -180, log: '火借风势烧穿了房梁,损失比想的大得多。' },
          log: '伙计们拼了命扑救,火压住了,人心也齐了。'
        }
      }
    ]
  },

  {
    id: 'earthquake',
    name: '地动',
    icon: '🌋',
    cat: 'disaster',
    stage: [5, 10],
    seasons: null,
    weight: 4,
    cooldown: 200,
    requires: null,
    text: '地皮猛地一抖,房梁咔咔作响,瓦片雨点般往下掉。街上有人喊「地龙翻身」,庙里钟自己响了三声。清点下来,宅子铺面都伤了筋骨。',
    choices: [
      {
        label: '大兴土木重修',
        outcome: {
          gold: -0.08,
          goldPct: true,
          inv: { brick: -20, wood: -20 },
          rep: 3,
          log: '砖木流水般运进来,修得比原先还气派,街坊看了都竖大拇指。'
        }
      },
      {
        label: '只修要紧处',
        outcome: {
          gold: -0.03,
          goldPct: true,
          special: 'shop_close_3d',
          log: '裂缝拿泥糊上,梁柱先撑着,一处铺面停业修整。'
        }
      },
      {
        label: '开粥棚赈街坊',
        outcome: {
          gold: -0.06,
          goldPct: true,
          inv: { grain: -30 },
          rep: 10,
          favor: 5,
          log: '自家房子先不修,粥棚先支起来,县尊都亲自来道了声谢。'
        }
      }
    ]
  },

  /* ==================== biz 产业风险 (14) ==================== */

  {
    id: 'restaurant_poison',
    name: '酒楼出事',
    icon: '🤢',
    cat: 'biz',
    stage: [4, 10],
    seasons: null,
    weight: 9,
    cooldown: 60,
    requires: { shopKind: 'tavern' },
    text: '酒楼一桌客人吃完上吐下泻,抬走俩。苦主家属堵在门口拍桌子,说要去衙门告。掌柜的私下回话:八成是那批便宜河鲜的事。',
    choices: [
      {
        label: '赔钱私了',
        outcome: {
          gold: -180,
          inv: { fish: -10 },
          log: '汤药钱赔礼钱一并奉上,苦主拿了银子消了气,这页算翻过去了。'
        }
      },
      {
        label: '打官司硬扛',
        outcome: {
          rep: -5,
          risk: { p: 0.5, gold: -400, rep: -5, log: '官司输了,赔得更多,满城都传酒楼吃死人。' },
          log: '咬死是客人自己贪杯,官司赢了,名声却臭了一截。'
        }
      },
      {
        label: '停业整顿谢罪',
        outcome: {
          special: 'shop_close_3d',
          gold: -60,
          rep: 4,
          log: '挂牌停业三日,当街砸了那批河鲜,街坊反倒说这家做事敞亮。'
        }
      }
    ]
  },

  {
    id: 'pawnshop_lawsuit',
    name: '当铺收赃',
    icon: '⚖️',
    cat: 'biz',
    stage: [4, 10],
    seasons: null,
    weight: 8,
    cooldown: 70,
    requires: { shopKind: 'pawn' },
    text: '当铺上月收的一对玉镯,竟是府城大户失窃的赃物。捕快上门「请」掌柜去喝茶,话里话外:东西要充公,人嘛——好说,也不好说。',
    choices: [
      {
        label: '破财消灾',
        outcome: {
          gold: -150,
          favor: 3,
          log: '玉镯奉还,茶钱奉上,捕头拍着胸脯说下不为例。'
        }
      },
      {
        label: '咬定不知情',
        outcome: {
          risk: { p: 0.45, gold: -350, rep: -6, log: '查出柜上早知来路不正,罚银翻倍,招牌差点被摘。' },
          log: '当票流水摆得清清楚楚,官府挑不出错,只没收了镯子了事。'
        }
      },
      {
        label: '供出销赃人',
        outcome: {
          favor: 6,
          rep: -3,
          log: '名单一交,官府结了案子,道上却传开了:这家当铺卖人。'
        }
      }
    ]
  },

  {
    id: 'bank_bad_debt',
    name: '钱庄坏账',
    icon: '💸',
    cat: 'biz',
    stage: [7, 10],
    seasons: null,
    weight: 8,
    cooldown: 80,
    requires: { shopKind: 'bank' },
    text: '城里绸缎巨贾周家,欠钱庄三千两的票子,人——昨夜举家跑了,只留一座空宅。消息一旦传开,储户挤兑,钱庄就是第二个周家。',
    choices: [
      {
        label: '封锁消息硬撑',
        outcome: {
          gold: -800,
          risk: { p: 0.35, gold: -1500, rep: -10, log: '消息还是漏了,储户连夜挤兑,柜上银子见了底。' },
          log: '自掏腰包垫上窟窿,账面如常,柜上无人知晓。'
        }
      },
      {
        label: '收他的空宅抵债',
        outcome: {
          gold: -400,
          rep: -4,
          favor: -2,
          log: '请人盘下周家空宅折价抵账,街上说家主吃相难看,亏总归少了些。'
        }
      },
      {
        label: '雇镖师追人',
        outcome: {
          gold: -200,
          risk: { p: 0.5, gold: -600, log: '追到渡口人早没影了,镖师酒钱白花,坏账全认。' },
          log: '在三百里外的码头堵住了周家,连本带利吐了出来。'
        }
      }
    ]
  },

  {
    id: 'casino_cheater',
    name: '赌坊老千',
    icon: '🎲',
    cat: 'biz',
    stage: [6, 10],
    seasons: null,
    weight: 9,
    cooldown: 50,
    requires: { shopKind: 'casino' },
    text: '赌坊今夜邪门,一个外乡客连赢十八把,庄家的脸比骰盅还黑。荷官递来眼色:这位爷的袖口,怕是别有乾坤。可人家身后还站着俩带刀的。',
    choices: [
      {
        label: '当场掀桌验牌',
        outcome: {
          risk: { p: 0.4, gold: -300, rep: -3, log: '袖口翻遍了什么也没搜出来,人家是真手气,赔礼又赔钱。' },
          gold: 150,
          log: '袖里果然抖出灌铅骰子,赢的钱全数追回,外乡客被打出门去。'
        }
      },
      {
        label: '认栽送客',
        outcome: {
          gold: -250,
          log: '笑脸把人送出门,千金买个太平,赌坊的规矩不能见血。'
        }
      },
      {
        label: '黑吃黑',
        outcome: {
          gold: 100,
          rep: -6,
          risk: { p: 0.3, gold: -250, rep: -3, log: '那人是府城有名号的,隔日衙门就来「过问」赌坊的事,破财消灾。' },
          log: '出门三条巷子,赢的钱「自己」回来了,道上心照不宣。'
        }
      }
    ]
  },

  {
    id: 'brothel_watched',
    name: '青楼风声',
    icon: '🏮',
    cat: 'biz',
    stage: [6, 10],
    seasons: null,
    weight: 9,
    cooldown: 60,
    requires: { shopKind: 'brothel' },
    text: '楼里的妈妈深夜递话:新来的通判大人是个「清流」,放话要整顿风月,头一个就点了咱家楼的名。可巧,这位大人的师爷,昨儿还在楼里听曲听到三更。',
    choices: [
      {
        label: '重金打点师爷',
        outcome: {
          gold: -300,
          favor: 4,
          log: '师爷收了银子,通判的整顿名单上,自家楼的名字悄悄挪到了末尾。'
        }
      },
      {
        label: '歇业避风头',
        outcome: {
          special: 'shop_close_3d',
          gold: -100,
          rep: 2,
          log: '红灯笼摘了几日,姑娘们改唱小曲儿,风头过了再开张。'
        }
      },
      {
        label: '把师爷的事捅出去',
        outcome: {
          favor: -6,
          rep: 3,
          risk: { p: 0.4, gold: -450, rep: -3, log: '通判恼羞成怒,楼被翻了个底朝天,罚银加倍。' },
          log: '茶馆里一段「师爷听曲」的段子传开,通判灰头土脸,整顿不了了之。'
        }
      }
    ]
  },

  {
    id: 'escort_robbed',
    name: '镖银被劫',
    icon: '🗡️',
    cat: 'biz',
    stage: [6, 10],
    seasons: null,
    weight: 8,
    cooldown: 70,
    requires: { shopKind: 'escort' },
    text: '北路的镖被劫了。镖头带着伤回来,说对方报了「青风寨」的万儿,人没伤命,货却一件没剩。雇主明日就到,镖局的招牌,赔不赔得起就看这一回。',
    choices: [
      {
        label: '照价全赔',
        outcome: {
          gold: -400,
          rep: 6,
          log: '一文不少赔足,雇主抱拳说「明年还走你家镖」,招牌比银子值钱。'
        }
      },
      {
        label: '上山谈判赎货',
        outcome: {
          gold: -150,
          risk: { p: 0.35, gold: -250, log: '寨子坐地起价,赎金翻倍,这一趟脸面里子全折了。' },
          log: '托道上朋友递话,三成赎金把货赎了回来,江湖事江湖了。'
        }
      },
      {
        label: '报官清剿',
        outcome: {
          favor: 4,
          rep: -4,
          gold: -200,
          log: '官兵上山扑了个空,货追不回照样要赔,道上还落了个「勾结官府」的名声。'
        }
      }
    ]
  },

  {
    id: 'inn_thief',
    name: '客栈进贼',
    icon: '🕯️',
    cat: 'biz',
    stage: [5, 10],
    seasons: null,
    weight: 9,
    cooldown: 50,
    requires: { shopKind: 'inn' },
    text: '天字号房的客商丢了缠腰的银袋,当堂咆哮要砸招牌。伙计们面面相觑——昨夜守门的二顺子,今早眼皮肿得像桃,一问三不知。',
    choices: [
      {
        label: '照数赔偿',
        outcome: {
          gold: -120,
          rep: 3,
          log: '银子赔上还免了房钱,客商消了气,临走还说这家店地道。'
        }
      },
      {
        label: '彻查内鬼',
        outcome: {
          loyalty: -5,
          risk: { p: 0.5, gold: -120, rep: -3, log: '查了个底朝天什么也没查出来,客人等不及报了官,丢人丢到衙门口。' },
          gold: -20,
          special: 'staff_leave',
          log: '果然是二顺子鬼迷心窍,银子追回大半,人卷铺盖滚了,伙计们兔死狐悲。'
        }
      }
    ]
  },

  {
    id: 'horse_sickness',
    name: '马瘟',
    icon: '🐴',
    cat: 'biz',
    stage: [3, 10],
    seasons: null,
    weight: 8,
    cooldown: 80,
    requires: { animalKind: 'horse' },
    text: '槽头的马打蔫了,鼻孔淌着脓水,草料一口不沾。马夫蹲在栏边直叹气:这是马瘟的兆头,一匹倒,匹匹倒。',
    choices: [
      {
        label: '重金请兽医',
        outcome: {
          gold: -90,
          inv: { herb: -10 },
          log: '汤药灌了三天,马打着响鼻站起来了,马夫笑得见牙不见眼。'
        }
      },
      {
        label: '隔离病马硬熬',
        outcome: {
          risk: { p: 0.5, gold: -50, log: '没熬过去,病马倒了,好在没传开。' },
          special: 'animal_die',
          log: '病马单拴一栏,听天由命,其余的马总算保住了。'
        }
      },
      {
        label: '趁早贱卖',
        outcome: {
          gold: 40,
          special: 'animal_die',
          rep: -3,
          log: '病马连夜出手给了外乡马贩,钱落了袋,亏心事也落了心底。'
        }
      }
    ]
  },

  {
    id: 'cattle_sickness',
    name: '牛瘟',
    icon: '🐂',
    cat: 'biz',
    stage: [2, 10],
    seasons: null,
    weight: 8,
    cooldown: 80,
    requires: { animalKind: 'cow' },
    text: '耕牛卧在栏里不肯起,眼角糊着黄眵。邻村已经倒了七八头牛,埋牛的坑一个挨一个。农忙在即,没了牛,地就得人拉犁。',
    choices: [
      {
        label: '请郎中下药',
        outcome: {
          gold: -70,
          inv: { herb: -8 },
          log: '一剂猛药灌下去,老牛缓过来了,又能下地了。'
        }
      },
      {
        label: '宰了卖肉',
        outcome: {
          special: 'animal_die',
          gold: 50,
          inv: { meat: 20 },
          rep: -2,
          log: '趁还能下刀宰了,牛肉压价出手,庄稼汉看了直摇头。'
        }
      }
    ]
  },

  {
    id: 'ginseng_theft',
    name: '参田遭贼',
    icon: '🌿',
    cat: 'biz',
    stage: [5, 10],
    seasons: [2, 3],
    weight: 7,
    cooldown: 70,
    requires: { minGold: 3000 },
    text: '山上的人参田一夜之间被刨了七八个坑,守田的老汉被人捆在树上冻了半宿。这等手脚利落的参贼,没有内线带路,摸不进山门。',
    choices: [
      {
        label: '雇护院守山',
        outcome: {
          gold: -150,
          inv: { herb: -15 },
          log: '丢的参追不回了,山上从此添了四个带刀的,贼再没来过。'
        }
      },
      {
        label: '设套等贼再来',
        outcome: {
          risk: { p: 0.4, gold: -90, log: '贼比想的精,绕开套子又刨了一片好参,守株没等到兔。' },
          gold: 100,
          rep: 3,
          log: '贼果然回头,连人带赃捆去见官,起回的参还多出别家的份。'
        }
      },
      {
        label: '查内线',
        outcome: {
          loyalty: -6,
          special: 'staff_leave',
          log: '挨个盘问,揪出了带路的短工,人撵了,留下的人心里也都发毛。'
        }
      }
    ]
  },

  {
    id: 'tenant_flee',
    name: '佃户跑路',
    icon: '🏃',
    cat: 'biz',
    stage: [4, 10],
    seasons: null,
    weight: 8,
    cooldown: 60,
    requires: null,
    text: '天没亮,西庄的佃户赵四一家挑着担子跑了,租子欠着,田撂荒着。庄头说他赌输了印子钱,被人追债追得急。地不等人,误了农时就是误一年。',
    choices: [
      {
        label: '雇短工补上',
        outcome: {
          gold: -60,
          log: '短工贵是贵,好歹没误农时,赵四的欠租权当喂了狗。'
        }
      },
      {
        label: '招新佃户减租',
        outcome: {
          rep: 4,
          gold: -30,
          log: '头年减三成租的告示一贴,佃户抢着来,街坊都说家主厚道。'
        }
      },
      {
        label: '追人讨债',
        outcome: {
          gold: -40,
          rep: -4,
          risk: { p: 0.5, gold: -30, log: '追到邻县,人家已经卖身大户为奴,债是死账了,盘缠白搭。' },
          log: '在渡口截住了人,欠租折成三年长工,赵四哭丧着脸回来了。'
        }
      }
    ]
  },

  {
    id: 'silkworm_disease',
    name: '蚕病',
    icon: '🐛',
    cat: 'biz',
    stage: [5, 10],
    seasons: [0, 1],
    weight: 8,
    cooldown: 70,
    requires: { shopKind: 'clothshop' },
    text: '织坊的蚕房出事了——蚕宝宝成片僵在簇上,蚕娘急得直掉泪。老师傅捻了捻死蚕:是僵病,再不分房隔离,这一季的丝就全交代了。',
    choices: [
      {
        label: '焚秽分房',
        outcome: {
          gold: -50,
          inv: { silk: -8 },
          log: '病蚕连簇烧了,蚕房石灰重刷,好歹保住了大半季的丝。'
        }
      },
      {
        label: '全部熬着养',
        outcome: {
          risk: { p: 0.55, gold: -160, log: '僵病传开了,整房的蚕全完,蚕娘们哭成一片。' },
          inv: { silk: 5 },
          log: '老天赏脸病没传开,这一季的丝一两没少。'
        }
      },
      {
        label: '高价购健蚕补种',
        outcome: {
          gold: -120,
          log: '邻县的好蚕种连夜运到,银子花得肉疼,织机没停一天。'
        }
      }
    ]
  },

  {
    id: 'granary_rats',
    name: '粮行鼠患',
    icon: '🐀',
    cat: 'biz',
    stage: [4, 10],
    seasons: null,
    weight: 9,
    cooldown: 50,
    requires: { shopKind: 'grainshop' },
    text: '粮行的伙计搬垛时惊起一窝老鼠,肥得像小猪崽。细查之下倒抽凉气:垛底的粮包十有三空,鼠洞通着后巷,怕是吃了不止一个月了。',
    choices: [
      {
        label: '请捕鼠人清剿',
        outcome: {
          gold: -40,
          inv: { grain: -15 },
          log: '三天功夫起了百十只老鼠,堵了洞,丢的粮算交了学费。'
        }
      },
      {
        label: '养群狸猫坐镇',
        outcome: {
          gold: -25,
          inv: { grain: -15, fish: -3 },
          log: '四只狸猫进了粮行,老鼠绝了迹,客人还爱来撸两把,算意外之喜。'
        }
      },
      {
        label: '鼠粮掺着卖',
        outcome: {
          gold: 50,
          rep: -6,
          risk: { p: 0.35, gold: -150, rep: -5, log: '被买主当场抖出鼠屎,闹到衙门,罚银丢人两头占。' },
          log: '鼠啃的粮掺进整粮里出了手,钱没亏,就是夜里睡得不太踏实。'
        }
      }
    ]
  },

  {
    id: 'clerk_embezzle',
    name: '监守自盗',
    icon: '🧾',
    cat: 'biz',
    stage: [4, 10],
    seasons: null,
    weight: 8,
    cooldown: 70,
    requires: { minGold: 1500 },
    text: '对账对出了窟窿:三个月,短了一笔不小的银子。手脚做得干净,但能碰账的就那两个人——一个是跟了十年的老账房,一个是新提的年轻柜头。',
    choices: [
      {
        label: '当众查账揪人',
        outcome: {
          gold: 80,
          loyalty: -8,
          special: 'staff_leave',
          log: '账翻到底,人揪了出来,银子吐了大半;只是从此府里人人自危。'
        }
      },
      {
        label: '私下敲打',
        outcome: {
          gold: -60,
          loyalty: 2,
          log: '茶室里一句「账上的事,我都知道」,隔月窟窿悄悄补上了,体面留给了双方。'
        }
      },
      {
        label: '设暗账钓鱼',
        outcome: {
          gold: -30,
          risk: { p: 0.3, gold: -100, rep: -2, log: '鱼没钓着,做暗账的事反倒走漏,落了个猜忌下人的名声。' },
          log: '暗账一布,三天就咬了钩,人赃并获,银子如数追回。'
        }
      }
    ]
  },

  /* ==================== chance 机遇 (12) ==================== */

  {
    id: 'border_war',
    name: '边关战事',
    icon: '⚔️',
    cat: 'chance',
    stage: [4, 10],
    seasons: null,
    weight: 6,
    cooldown: 150,
    requires: null,
    text: '北边打起来了!驿马一天三拨往南跑,军中正四处征粮,粮价像着了火。茶馆里的说书人把战事说得天花乱坠,粮行掌柜们的算盘打得更乱坠。',
    choices: [
      {
        label: '囤粮待涨',
        outcome: {
          gold: -200,
          inv: { grain: 60 },
          priceShock: { good: 'grain', mult: 3, days: 15 },
          rep: -2,
          log: '仓里堆成了粮山,坐等价起;街上骂囤粮的声音,就当没听见。'
        }
      },
      {
        label: '高价卖给军需',
        outcome: {
          gold: 350,
          inv: { grain: -50 },
          favor: 4,
          priceShock: { good: 'grain', mult: 3, days: 15 },
          log: '军需官现银收粮,价钱给得豪爽,还留了句「下回还找你」。'
        }
      },
      {
        label: '平价售粮安民',
        outcome: {
          gold: 80,
          inv: { grain: -40 },
          rep: 8,
          priceShock: { good: 'grain', mult: 3, days: 15 },
          log: '别家粮价翻三倍,自家照旧价开仓,买粮的队伍排过了桥。'
        }
      }
    ]
  },

  {
    id: 'western_merchant',
    name: '西域胡商',
    icon: '🐫',
    cat: 'chance',
    stage: [4, 10],
    seasons: null,
    weight: 7,
    cooldown: 80,
    requires: null,
    text: '一队骆驼摇着铃铛进了镇,胡商高鼻深目,开口却是地道官话:「上等丝绸茶叶,有多少要多少,价钱好商量。」随行的箱子里,香料宝石晃花人眼。',
    choices: [
      {
        label: '高价出货',
        outcome: {
          gold: 250,
          inv: { silk: -15, tea: -15 },
          log: '丝茶打包出手,胡商给的价比府城高三成,银货两讫,各自欢喜。'
        }
      },
      {
        label: '换他的香料',
        outcome: {
          inv: { silk: -10, tea: -10 },
          gold: 150,
          risk: { p: 0.3, gold: -230, log: '所谓「龙涎香」掺了一半松脂,转手时被行家识破,砸在手里。' },
          log: '换来的香料在府城卖出了天价,这趟以货易货赚翻了。'
        }
      },
      {
        label: '设宴结交',
        outcome: {
          gold: -80,
          rep: 3,
          log: '一席酒喝出个老主顾,胡商许诺明年商队还来,先到自家府上。'
        }
      }
    ]
  },

  {
    id: 'temple_construction',
    name: '镇上修庙',
    icon: '🧱',
    cat: 'chance',
    stage: [3, 10],
    seasons: null,
    weight: 8,
    cooldown: 100,
    requires: null,
    text: '镇上士绅凑钱重修城隍庙,工头拿着单子四处买料:砖瓦木料,有多少收多少。庙祝放话:捐料的善人,名字刻碑上,香火里都有一份功德。',
    choices: [
      {
        label: '高价卖砖木',
        outcome: {
          gold: 180,
          inv: { brick: -20, wood: -15 },
          priceShock: { good: 'brick', mult: 2, days: 10 },
          log: '砖木卖了个好价钱,工头还嫌不够,催着再进一批。'
        }
      },
      {
        label: '捐一批求功德',
        outcome: {
          inv: { brick: -15, wood: -10 },
          rep: 7,
          favor: 2,
          log: '功德碑头一行就是家主大名,进香的人念一回名字,声望涨一分。'
        }
      },
      {
        label: '不掺和',
        outcome: {
          priceShock: { good: 'brick', mult: 2, days: 10 },
          log: '庙是别人的庙,砖价倒是实打实涨了,看看行情再说。'
        }
      }
    ]
  },

  {
    id: 'cold_snap_cloth',
    name: '寒潮急购',
    icon: '🧥',
    cat: 'chance',
    stage: [3, 10],
    seasons: [3],
    weight: 8,
    cooldown: 90,
    requires: null,
    text: '今冬冷得邪性,一夜寒潮冻裂了水缸。城里布庄的冬衣抢购一空,布价一日三涨,有钱人家用银子裹身上,没钱人家把全家被子穿身上。',
    choices: [
      {
        label: '存布高价出',
        outcome: {
          gold: 200,
          inv: { cloth: -25 },
          priceShock: { good: 'cloth', mult: 2.5, days: 8 },
          log: '压箱底的布全数出清,价钱翻着跟头,账房乐得直搓手。'
        }
      },
      {
        label: '施棉衣济贫',
        outcome: {
          inv: { cloth: -15 },
          gold: -40,
          rep: 8,
          priceShock: { good: 'cloth', mult: 2.5, days: 8 },
          log: '城门口支起棚子发冬衣,冻得发青的老小千恩万谢,这名声是雪里送出来的。'
        }
      }
    ]
  },

  {
    id: 'grand_wedding_order',
    name: '婚宴大单',
    icon: '🎊',
    cat: 'chance',
    stage: [5, 10],
    seasons: null,
    weight: 8,
    cooldown: 80,
    requires: null,
    text: '府城通判嫁女,流水席要摆三天,采买的管事拿着单子找上门:酒、肉、点心、鲜鱼,三日内备齐,价钱好说——但误了吉时,仔细你的招牌。',
    choices: [
      {
        label: '接单全力备货',
        outcome: {
          gold: 300,
          inv: { wine: -20, meat: -20, pastry: -15, fish: -10 },
          favor: 3,
          risk: { p: 0.25, gold: -200, rep: -3, log: '偏赶上货源短缺,差了两成数,管事拉长脸扣了银子还放了狠话。' },
          log: '三天三夜连轴转,如数交割,通判府的赏银厚得压手。'
        }
      },
      {
        label: '只接稳妥的量',
        outcome: {
          gold: 120,
          inv: { wine: -10, meat: -10 },
          log: '量力接了一半的单,赚头小些,胜在稳当不砸牌子。'
        }
      },
      {
        label: '转手做中人',
        outcome: {
          gold: 60,
          rep: 2,
          log: '撮合同行一起供货,抽一道中人钱,两头都领情。'
        }
      }
    ]
  },

  {
    id: 'bumper_harvest',
    name: '丰年谷贱',
    icon: '🌾',
    cat: 'chance',
    stage: [2, 10],
    seasons: [2],
    weight: 8,
    cooldown: 100,
    requires: null,
    text: '今年风调雨顺,家家粮仓冒尖,粮价贱得伤心。老农蹲在粮行门口抽烟:「丰年饿死粮户」,卖也不是,留也不是。对手里有闲钱的人,这却是十年一遇的低价。',
    choices: [
      {
        label: '低价大举吃进',
        outcome: {
          gold: -150,
          inv: { grain: 80 },
          priceShock: { good: 'grain', mult: 0.5, days: 12 },
          log: '半价的粮食流水般进仓,只等灾年荒月,这一仓就是金山。'
        }
      },
      {
        label: '酿酒消化存粮',
        outcome: {
          inv: { grain: -40, wine: 25 },
          gold: -30,
          log: '贱粮入了酒缸,封坛入窖,粮变成酒,价钱就翻了身。'
        }
      },
      {
        label: '随行就市卖掉',
        outcome: {
          gold: 60,
          inv: { grain: -50 },
          priceShock: { good: 'grain', mult: 0.5, days: 12 },
          log: '贱价也是钱,落袋为安,仓里腾出地方装新粮。'
        }
      }
    ]
  },

  {
    id: 'trade_route_cut',
    name: '商路中断',
    icon: '🚧',
    cat: 'chance',
    stage: [4, 10],
    seasons: null,
    weight: 7,
    cooldown: 90,
    requires: null,
    text: '南边山洪冲断了官道,盐车茶队全堵在百里之外。镇上的盐铺开始按人头限购,茶馆老板看着见底的茶罐唉声叹气。手里有存货的,夜里做梦都在笑。',
    choices: [
      {
        label: '存盐茶趁势卖',
        outcome: {
          gold: 180,
          inv: { salt: -10, tea: -10 },
          priceShock: { good: 'salt', mult: 2.2, days: 10 },
          rep: -3,
          log: '存货高价出清,赚是真赚,「发断路财」的闲话也是真有。'
        }
      },
      {
        label: '组队走山路贩运',
        outcome: {
          gold: -100,
          risk: { p: 0.4, gold: -80, log: '山路湿滑,骡子滚了坡,货折了一半,人没事算万幸。' },
          inv: { salt: 15, tea: 10 },
          priceShock: { good: 'salt', mult: 2.2, days: 10 },
          log: '冒险走小路把货背了回来,这一趟顶平时三趟的利。'
        }
      },
      {
        label: '按平价限购卖',
        outcome: {
          gold: 60,
          inv: { salt: -8 },
          rep: 5,
          priceShock: { good: 'salt', mult: 2.2, days: 10 },
          log: '每户限购二斤,价钱照旧,街坊提着盐罐说这家仁义。'
        }
      }
    ]
  },

  {
    id: 'noble_passing',
    name: '贵人途经',
    icon: '🎐',
    cat: 'chance',
    stage: [5, 10],
    seasons: null,
    weight: 6,
    cooldown: 100,
    requires: { minRep: 15 },
    text: '京里来的钦差路过本县,车驾要歇一晚。县令急得满嘴燎泡,四处找体面人家接待——这等贵人,接待好了是天梯,接待砸了是天雷。',
    choices: [
      {
        label: '倾力接驾',
        outcome: {
          gold: -250,
          favor: 8,
          rep: 5,
          risk: { p: 0.2, gold: -100, rep: -3, log: '席面上一道菜犯了贵人忌口,赔尽小心才圆过去,白忙一场。' },
          log: '酒菜歌乐处处妥帖,贵人临行赏下一幅字,县令看家主的眼神都变了。'
        }
      },
      {
        label: '出钱不出面',
        outcome: {
          gold: -100,
          favor: 3,
          log: '银子捧给县令去张罗,功劳分一杯,风险不沾身。'
        }
      },
      {
        label: '称病推了',
        outcome: {
          favor: -3,
          log: '贵人是天梯也是天雷,称病躲了这一遭,县令记下了这笔账。'
        }
      }
    ]
  },

  {
    id: 'imperial_exam',
    name: '科举大比',
    icon: '🖋️',
    cat: 'chance',
    stage: [4, 10],
    seasons: [1],
    weight: 7,
    cooldown: 150,
    requires: null,
    text: '三年一度的大比之期,赶考的书生挤满了官道,客栈一铺难求,茶馆里之乎者也吵成一锅粥。穷书生当衣裳付房钱,富书生一掷千金买文房。',
    choices: [
      {
        label: '客房涨价三倍',
        outcome: {
          gold: 200,
          rep: -4,
          log: '柴房都按上房收钱,书生们边骂边掏钱——骂完发狠:中了举头一个查你。'
        }
      },
      {
        label: '平价还送笔墨',
        outcome: {
          gold: 80,
          rep: 6,
          log: '价钱公道还赠笔墨,书生们临走作揖:「他日得中,必报东家。」'
        }
      },
      {
        label: '资助寒门才子',
        outcome: {
          gold: -100,
          rep: 4,
          favor: 4,
          log: '盘缠奉上不求回报,后来那书生果然出息了,官面上多了个念恩情的人。'
        }
      }
    ]
  },

  {
    id: 'salt_rumor',
    name: '盐价风声',
    icon: '🧂',
    cat: 'chance',
    stage: [5, 10],
    seasons: null,
    weight: 7,
    cooldown: 80,
    requires: { minGold: 800 },
    text: '青楼的红姑娘酒后吐真言:盐运使衙门里的相好说,下月盐引要改制,盐价怕是要起大风。这等风声,信了是先机,信错是血亏。',
    choices: [
      {
        label: '重注囤盐',
        outcome: {
          gold: -300,
          inv: { salt: 40 },
          risk: { p: 0.4, gold: -180, log: '风声是放出来钓鱼的,盐价不涨反跌,一仓盐含泪贱卖了大半。' },
          priceShock: { good: 'salt', mult: 2.5, days: 10 },
          log: '风声成真!盐价飞涨,仓里的盐变成了白花花的银子。'
        }
      },
      {
        label: '小买一笔试水',
        outcome: {
          gold: -80,
          inv: { salt: 10 },
          log: '小注怡情,涨了赚一笔,跌了不伤身。'
        }
      },
      {
        label: '把风声卖给盐商',
        outcome: {
          gold: 60,
          rep: -2,
          log: '消息转手卖了现钱,真假让别人去赌,自己稳稳落袋。'
        }
      }
    ]
  },

  {
    id: 'famine_labor_market',
    name: '灾年人市',
    icon: '👥',
    cat: 'chance',
    stage: [3, 10],
    seasons: null,
    weight: 6,
    cooldown: 120,
    requires: null,
    text: '邻府遭了灾,逃难的流民一路讨到本县,城门口的人市上,壮劳力的身价贱过一头驴。牙婆凑过来压低嗓子:「这时候买人雇人,半价都不止。」',
    choices: [
      {
        label: '低价广招人手',
        outcome: {
          gold: -50,
          special: 'staff_join',
          rep: 2,
          log: '管饭就肯卖力气,一口气添了人手,流民里不乏好手艺。'
        }
      },
      {
        label: '施粥不雇人',
        outcome: {
          inv: { grain: -25 },
          rep: 6,
          log: '城门口的粥棚一开就是五天,救人没图回报,名声自己长了腿。'
        }
      },
      {
        label: '关门不沾事',
        outcome: {
          rep: -3,
          log: '流民是非多,大门紧闭图个清净,街坊背后说家主门槛比城墙高。'
        }
      }
    ]
  },

  {
    id: 'caravan_investment',
    name: '商队招股',
    icon: '📦',
    cat: 'chance',
    stage: [5, 10],
    seasons: null,
    weight: 6,
    cooldown: 120,
    requires: { minGold: 2000 },
    text: '老字号「德顺隆」商队要走一趟南洋,大掌柜亲自登门招股:「一股五百两,船回来翻倍分红。」话说得漂亮,可海上的事,龙王爷说了才算。',
    choices: [
      {
        label: '重金入大股',
        outcome: {
          gold: 500,
          risk: { p: 0.35, gold: -1300, log: '船在外海遇了风暴,货折了大半,血本去了多半,分红薄得像纸。' },
          log: '船队满载而归!分红翻倍还多,大掌柜亲自送来红利和南洋稀罕物。'
        }
      },
      {
        label: '小入一股',
        outcome: {
          gold: 180,
          risk: { p: 0.35, gold: -450, log: '船队折了货,小股小亏,权当买个教训。' },
          log: '船回了港,小股小赚,稳稳当当落一笔。'
        }
      },
      {
        label: '不赌这一把',
        outcome: {
          log: '海上的钱是龙王爷的钱,看着别人上船,自家的银子睡在库里最安稳。'
        }
      }
    ]
  },

  /* ==================== family 人情家族 (12) ==================== */

  {
    id: 'matchmaker_visit',
    name: '媒婆提亲',
    icon: '💍',
    cat: 'family',
    stage: [2, 10],
    seasons: null,
    weight: 9,
    cooldown: 60,
    requires: null,
    text: '王媒婆摇着帕子进了门,茶没喝一口话先说了三筐:「东街米行的闺女,模样周正,屁股大好生养,陪嫁两间铺面!就是脾气嘛——跟她娘一个模子。」',
    choices: [
      {
        label: '应下这门亲',
        outcome: {
          gold: -120,
          rep: 3,
          special: 'baby_boost',
          log: '聘礼过门,吹吹打打办了喜事,米行从此是亲家,府里添了喜气。'
        }
      },
      {
        label: '再相看相看',
        outcome: {
          gold: -10,
          log: '塞了媒婆一吊跑腿钱,让她再多领几家来比比,亲事不急在一时。'
        }
      },
      {
        label: '婉言回绝',
        outcome: {
          rep: -2,
          log: '亲事推了,媒婆撇着嘴走了,没出三天,东街都知道这家眼光高。'
        }
      }
    ]
  },

  {
    id: 'difficult_birth',
    name: '难产',
    icon: '🕯️',
    cat: 'family',
    stage: [2, 10],
    seasons: null,
    weight: 6,
    cooldown: 150,
    requires: { minKin: 2 },
    text: '产房里折腾了一天一夜,孩子还没落地。产婆掀帘出来,脸白得吓人:「胎位不正,再拖下去,怕是要家主拿主意了……」窗外的天,黑得像一口锅。',
    choices: [
      {
        label: '重金请府城名医',
        outcome: {
          gold: -200,
          risk: { p: 0.15, rep: -2, log: '名医到时还是晚了一步,大人保住了,孩子没能睁眼,满府缟素了三日。' },
          log: '名医一帖催生汤,母子平安!啼哭声响起那刻,全府的心都落了地。'
        }
      },
      {
        label: '信产婆的手艺',
        outcome: {
          gold: -30,
          risk: { p: 0.4, rep: -3, log: '产婆尽了力,终究没留住孩子,产妇哭哑了嗓子,府里好些天没人敢大声说话。' },
          log: '老产婆一双手稳如泰山,折腾到后半夜,母子平安。'
        }
      },
      {
        label: '去庙里求菩萨',
        outcome: {
          gold: -50,
          risk: { p: 0.55, rep: -3, log: '香灰救不了急,这一胎终是没保住,庙祝的功德钱倒是没退。' },
          rep: 2,
          log: '香火钱刚递上,家里就来报母子平安,菩萨这回真显了灵。'
        }
      }
    ]
  },

  {
    id: 'fullmoon_feast',
    name: '满月酒',
    icon: '🍼',
    cat: 'family',
    stage: [2, 10],
    seasons: null,
    weight: 7,
    cooldown: 90,
    requires: { minKin: 3 },
    text: '小少爷满月了,白胖得像年画里抠下来的。按规矩要办满月酒,妻房的意思是:排场办大些,让全镇看看咱家的人丁兴旺。账房的意思是:看看账上再说。',
    choices: [
      {
        label: '流水席办三天',
        outcome: {
          gold: -150,
          inv: { wine: -10, meat: -10, pastry: -8 },
          rep: 6,
          special: 'baby_boost',
          log: '三天流水席吃倒了半个镇子,人人都说这家香火旺、家底厚。'
        }
      },
      {
        label: '自家人摆两桌',
        outcome: {
          gold: -30,
          inv: { wine: -3 },
          loyalty: 2,
          log: '自家人热热闹闹两桌,红蛋分给仆役,省下的是实惠。'
        }
      }
    ]
  },

  {
    id: 'patriarch_birthday',
    name: '老爷子寿宴',
    icon: '🎂',
    cat: 'family',
    stage: [3, 10],
    seasons: null,
    weight: 7,
    cooldown: 200,
    requires: null,
    text: '老爷子整寿,亲戚们早早递了话要来贺。老人家嘴上说「不办不办,糟蹋钱」,身子却天天坐在门口往街上望。这寿宴的排场,就是家族在十里八乡的脸面。',
    choices: [
      {
        label: '大办寿宴',
        outcome: {
          gold: -180,
          inv: { wine: -12, meat: -12, pastry: -10 },
          rep: 7,
          loyalty: 3,
          log: '寿宴摆了四十桌,戏班唱到三更,老爷子笑出了满脸褶子。'
        }
      },
      {
        label: '家宴加足寿礼',
        outcome: {
          gold: -60,
          loyalty: 2,
          log: '关起门来一桌团圆饭,寿礼实打实,老爷子嘴上嫌破费,锦缎被子夜夜盖。'
        }
      },
      {
        label: '从简,银子留着',
        outcome: {
          gold: -15,
          rep: -3,
          loyalty: -2,
          log: '一碗长寿面打发了整寿,亲戚们没坐热就走了,老爷子半个月没怎么说话。'
        }
      }
    ]
  },

  {
    id: 'concubine_rivalry',
    name: '妻妾争宠',
    icon: '💄',
    cat: 'family',
    stage: [4, 10],
    seasons: null,
    weight: 8,
    cooldown: 70,
    requires: { minKin: 4 },
    text: '后宅起了硝烟:夫人屋里的猫,「失足」掉进了姨娘的汤锅;姨娘陪嫁的镯子,在夫人妆匣里「自己长了腿」。两边的丫鬟见面,眼刀子飞得能削苹果。家主夹在中间,左边是脸面,右边也是脸面。',
    choices: [
      {
        label: '各打五十大板',
        outcome: {
          loyalty: -3,
          log: '两边一并罚了月例,面上消停了,夜里两个枕边风一边一场,家主睡了书房。'
        }
      },
      {
        label: '站夫人立规矩',
        outcome: {
          rep: 2,
          loyalty: -2,
          log: '正室就是正室,姨娘当众赔了礼;只是从此她屋里的灯,夜夜亮到三更。'
        }
      },
      {
        label: '砸钱两头哄',
        outcome: {
          gold: -100,
          loyalty: 2,
          log: '一人一支金钗一匹绸,后宅雨过天晴;账房咬着笔杆嘀咕:这火,怕是还得着。'
        }
      }
    ]
  },

  {
    id: 'naughty_heir',
    name: '子嗣顽劣',
    icon: '🪁',
    cat: 'family',
    stage: [3, 10],
    seasons: null,
    weight: 8,
    cooldown: 60,
    requires: { minKin: 3 },
    text: '二少爷又闯祸了:逃了学堂,带着一帮小子把刘员外家的鱼塘摸了个精光,临走还在人家影壁上画了只王八。刘员外提着戒尺找上门,脸黑得像锅底。',
    choices: [
      {
        label: '赔礼赔钱',
        outcome: {
          gold: -50,
          rep: 1,
          log: '亲自登门赔罪,鱼钱双倍奉还,刘员外消了气,还夸了句「教子有方」——听着像骂人。'
        }
      },
      {
        label: '当面家法伺候',
        outcome: {
          rep: 3,
          loyalty: -1,
          log: '当着刘员外的面打了十板子,小子嗷嗷叫着记了仇,员外倒是满意了。'
        }
      },
      {
        label: '送去武馆磨性子',
        outcome: {
          gold: -80,
          log: '赔了鱼钱,把小祖宗塞进武馆,让武师傅去头疼;一个月后回来,见谁都抱拳。'
        }
      }
    ]
  },

  {
    id: 'family_split',
    name: '分家风波',
    icon: '🪓',
    cat: 'family',
    stage: [6, 10],
    seasons: null,
    weight: 6,
    cooldown: 200,
    requires: { minKin: 8 },
    text: '三叔公领着几房旁支,把族谱拍在了堂桌上:「树大分杈,人大分家!这些年大伙儿出的力,凭什么家产都攥在你一房手里?」祠堂里坐满了人,一半看戏,一半磨刀。',
    choices: [
      {
        label: '分出一成家产',
        outcome: {
          gold: -0.1,
          goldPct: true,
          rep: 3,
          loyalty: 2,
          log: '当着祖宗牌位立了分单,旁支拿了产业道了谢,族里说家主大气。'
        }
      },
      {
        label: '搬祖训硬顶',
        outcome: {
          rep: -4,
          loyalty: -4,
          risk: { p: 0.35, gold: -400, rep: -4, log: '旁支咽不下这口气,把田界的事捅去了衙门,官司打得家宅不宁。' },
          log: '一句「祖训长房掌业」压了回去,族人散了,祠堂的门槛冷了半年。'
        }
      },
      {
        label: '给产业不给银',
        outcome: {
          gold: -0.04,
          goldPct: true,
          special: 'staff_leave',
          log: '划了两间偏铺一块远田打发出去,带走了得力的人手,好歹家底没伤。'
        }
      }
    ]
  },

  {
    id: 'old_servant_retire',
    name: '老仆告老',
    icon: '🧓',
    cat: 'family',
    stage: [3, 10],
    seasons: null,
    weight: 7,
    cooldown: 120,
    requires: null,
    text: '管了二十年库房的福伯,捧着钥匙串来辞工:「腿脚不中用了,想回乡下守着老婆子过几年。」钥匙在他手里磨得发亮,府里的账,他闭着眼都能背。',
    choices: [
      {
        label: '厚赏荣养',
        outcome: {
          gold: -100,
          loyalty: 6,
          special: 'staff_leave',
          rep: 2,
          log: '养老银奉上还赠了两亩地,福伯抹着泪走的,满府仆役看在眼里,记在心里。'
        }
      },
      {
        label: '挽留半职传帮带',
        outcome: {
          gold: -40,
          loyalty: 3,
          log: '月钱照旧活减半,福伯留下带徒弟,库房的门道一样样往下传。'
        }
      },
      {
        label: '照例结清送走',
        outcome: {
          special: 'staff_leave',
          loyalty: -4,
          log: '工钱结清一文不少,礼数上挑不出错;仆役们夜里嘀咕:卖二十年的命,就这?'
        }
      }
    ]
  },

  {
    id: 'famous_chef_poach',
    name: '名厨可挖',
    icon: '🍳',
    cat: 'family',
    stage: [5, 10],
    seasons: null,
    weight: 7,
    cooldown: 100,
    requires: { shopKind: 'tavern' },
    text: '府城「醉仙居」的当家大厨齐师傅,跟东家闹翻了。中人递话:齐师傅一手糖醋鲤鱼名动三县,肯屈就,但身价不低——而且醉仙居的东家,在府城不是好相与的人物。',
    choices: [
      {
        label: '重金礼聘',
        outcome: {
          gold: -300,
          rep: 4,
          risk: { p: 0.3, gold: -100, rep: -2, log: '醉仙居东家放话「谁挖人谁担着」,府城的几单生意莫名黄了。' },
          log: '齐师傅掌了灶,酒楼门口排起长队,一道糖醋鲤鱼吃出了金字招牌。'
        }
      },
      {
        label: '只请来传几手菜',
        outcome: {
          gold: -100,
          log: '不挖人只学艺,齐师傅留下三道看家菜的方子,谁的面子都没伤。'
        }
      },
      {
        label: '不蹚浑水',
        outcome: {
          log: '人是好厨子,事是烂摊子,这浑水不蹚,招牌靠自家灶上慢慢挣。'
        }
      }
    ]
  },

  {
    id: 'student_success',
    name: '学生中举',
    icon: '🎓',
    cat: 'family',
    stage: [5, 10],
    seasons: [2],
    weight: 6,
    cooldown: 200,
    requires: { shopKind: 'school' },
    text: '报喜的锣声一路敲到门口:自家学堂出来的穷学生孙秀才,中举了!如今他披红挂彩游街,头一个就要来拜谢「恩府」。门口看热闹的,排出去半条街。',
    choices: [
      {
        label: '大摆谢师宴',
        outcome: {
          gold: -120,
          rep: 8,
          favor: 6,
          log: '谢师宴上举人当众三拜,从今往后官面上有人,学堂的束脩都涨了价。'
        }
      },
      {
        label: '赠盘缠送他赴任',
        outcome: {
          gold: -80,
          favor: 8,
          log: '一笔厚厚的程仪送他上路,孙举人攥着家主的手:「此恩,容某终身报之。」'
        }
      },
      {
        label: '收个干亲',
        outcome: {
          gold: -50,
          rep: 3,
          favor: 4,
          risk: { p: 0.25, rep: -4, log: '攀亲攀得太急,士林里有人编排「铜臭裹书香」,传为笑谈。' },
          log: '认了干亲,族谱上添了一笔官亲,这棵树往后年年遮阴。'
        }
      }
    ]
  },

  {
    id: 'distant_kin_arrive',
    name: '远房来投',
    icon: '🧳',
    cat: 'family',
    stage: [3, 10],
    seasons: null,
    weight: 7,
    cooldown: 90,
    requires: null,
    text: '门房来报:一家四口堵在门口,自称是祖父那辈出五服的远房,老家遭了灾,一路投奔来的。男的看着是把干活的好手,女眷怀里还抱着个娃。族谱翻了半天,还真有这一支。',
    choices: [
      {
        label: '收留安排活计',
        outcome: {
          gold: -30,
          special: 'staff_join',
          rep: 3,
          log: '腾了间下房,男的进了庄子做活,一家人千恩万谢,逢人就夸本家仁义。'
        }
      },
      {
        label: '给盘缠送走',
        outcome: {
          gold: -40,
          log: '盘缠干粮备足,客客气气送出十里;人情给了,麻烦没留。'
        }
      },
      {
        label: '不认这门亲',
        outcome: {
          rep: -4,
          log: '一句「族谱查无此人」关了门,当夜镇上就传开了:那家富了,就不认穷亲。'
        }
      }
    ]
  },

  {
    id: 'daughter_betrothal',
    name: '女儿说亲',
    icon: '👰',
    cat: 'family',
    stage: [4, 10],
    seasons: null,
    weight: 7,
    cooldown: 120,
    requires: { minKin: 5 },
    text: '大姑娘到了说亲的年纪,媒婆一气领来两家:县丞家的二公子,门第清贵,聘礼却薄得像纸,摆明了是娶财;布庄陈家的独子,人老实家底厚,聘礼抬出来能压塌门槛。',
    choices: [
      {
        label: '嫁官家攀门第',
        outcome: {
          gold: -150,
          favor: 7,
          rep: 4,
          log: '陪嫁丰厚地嫁进了县丞家,从此衙门里有人喊一声「亲家」。'
        }
      },
      {
        label: '嫁商家收厚聘',
        outcome: {
          gold: 200,
          rep: -2,
          log: '陈家的聘礼抬了十二台,街坊酸溜溜地说:这是嫁女儿还是卖女儿?'
        }
      },
      {
        label: '招赘留家',
        outcome: {
          gold: -60,
          special: 'baby_boost',
          rep: -1,
          log: '招了个上门女婿,女儿留在族谱上,生的娃姓自家的姓,人丁这本账不亏。'
        }
      }
    ]
  },

  /* ==================== gov 官府 (6) ==================== */

  {
    id: 'tax_collector',
    name: '税吏催科',
    icon: '📜',
    cat: 'gov',
    stage: [2, 10],
    seasons: null,
    weight: 11,
    cooldown: 70,
    requires: null,
    text: '税吏带着两个皂隶进了门,皮笑肉不笑:「今年的钱粮,上头催得紧呐。」账册一摊,数目比去年又厚了一截——其中几笔,怎么算怎么不对。',
    choices: [
      {
        label: '照单全交',
        outcome: {
          gold: -100,
          favor: 2,
          log: '钱粮如数奉上,税吏满意而去,账上多出的那几笔,权当喂了狗。'
        }
      },
      {
        label: '塞红包减额',
        outcome: {
          gold: -60,
          risk: { p: 0.2, gold: -120, rep: -2, log: '碰上个不收钱的愣头青,红包成了把柄,补税带罚银一起来。' },
          log: '红包一递,税吏的算盘立刻拨快了三成,「误算」的几笔一笔勾销。'
        }
      },
      {
        label: '据册抗辩',
        outcome: {
          rep: 3,
          favor: -4,
          risk: { p: 0.35, gold: -150, log: '官字两张口,辩赢了账目,辩不赢官威,税没少交还结了梁子。' },
          log: '账册一笔笔对到税吏脸红,多出的数目划掉了,街坊拍手称快。'
        }
      }
    ]
  },

  {
    id: 'horse_requisition',
    name: '官府征马',
    icon: '🐎',
    cat: 'gov',
    stage: [4, 10],
    seasons: null,
    weight: 7,
    cooldown: 100,
    requires: { animalKind: 'horse' },
    text: '兵房的告示贴到了门口:军中缺马,凡民间养马之户,按价「征购」——那价钱,买条驴腿都悬。差役已经往马栏去了,皮尺都掏出来了。',
    choices: [
      {
        label: '交马领官价',
        outcome: {
          special: 'horse_levy',
          gold: 30,
          favor: 3,
          log: '好马牵走了,官价薄得像纸,兵房倒是记了一笔「急公好义」。'
        }
      },
      {
        label: '使银子换驽马顶数',
        outcome: {
          gold: -80,
          favor: 1,
          log: '银子打点到位,牵走的是匹老驽马,好马连夜挪去了亲戚家的栏里。'
        }
      },
      {
        label: '藏马不报',
        outcome: {
          favor: -2,
          risk: { p: 0.4, gold: -250, rep: -2, log: '有人告了密,按「匿马抗征」重罚了一笔,马最后还是用银子赎回来的。' },
          log: '马在山里庄子躲了半个月,风头过去又牵了回来,一根马毛没少。'
        }
      }
    ]
  },

  {
    id: 'seizure_rumor',
    name: '查封风声',
    icon: '🚨',
    cat: 'gov',
    stage: [6, 10],
    seasons: null,
    weight: 7,
    cooldown: 90,
    requires: { shopKind: 'casino' },
    text: '衙门的老书办深夜来敲后门,茶都顾不上喝:「上头要严办赌业,查封的名册我抄了一份——贵号在第三行。文书三天后用印,家主,三天。」',
    choices: [
      {
        label: '重金销名',
        outcome: {
          gold: -400,
          favor: 2,
          log: '银子连夜送进去,名册上那一行变成了别家的字号;别家什么下场,没人敢问。'
        }
      },
      {
        label: '停业改头换面',
        outcome: {
          special: 'shop_close_3d',
          gold: -150,
          log: '一夜之间赌坊变茶楼,骰子收进地窖;查封的差役进门,只看见满堂喝茶的「闲人」。'
        }
      },
      {
        label: '赌他不敢动真格',
        outcome: {
          risk: { p: 0.5, gold: -650, rep: -5, log: '真格的来了——封条贴门,东西充公,捞人又花了一大笔。' },
          log: '果然是雷声大雨点小,风头三日便过,白省一笔打点钱。'
        }
      }
    ]
  },

  {
    id: 'buy_office',
    name: '捐官机会',
    icon: '🎩',
    cat: 'gov',
    stage: [7, 10],
    seasons: null,
    weight: 6,
    cooldown: 250,
    requires: { minGold: 5000 },
    text: '府城来的师爷摆足了谱才入正题:朝廷开了捐例,九品的虚衔,价钱「公道」。「有了顶戴,见官不跪,税赋有商量,门楣上也好看——商贾终究是商贾,官身才是身份呐。」',
    choices: [
      {
        label: '捐个出身',
        outcome: {
          gold: -2000,
          favor: 10,
          rep: 6,
          log: '九品顶戴供进了祠堂,从此衙门递帖称「老爷」,这银子买的是腰杆。'
        }
      },
      {
        label: '砍价捐个监生',
        outcome: {
          gold: -800,
          favor: 4,
          rep: 2,
          log: '监生的名头到了手,不大不小一层皮,见官好歹能站着说话。'
        }
      },
      {
        label: '不捐',
        outcome: {
          favor: -2,
          log: '银子留着生银子,顶戴就不戴了;师爷皮笑肉不笑:「家主好定力。」'
        }
      }
    ]
  },

  {
    id: 'magistrate_birthday',
    name: '县令做寿',
    icon: '🧧',
    cat: 'gov',
    stage: [4, 10],
    seasons: null,
    weight: 8,
    cooldown: 150,
    requires: null,
    text: '县太爷五十整寿,衙门口的告示写着「概不收礼」,可帖子却一张张发到了城里有头脸的人家。师爷私下笑眯眯地补了一句:「心意嘛,门房都登记着呢。」',
    choices: [
      {
        label: '送重礼',
        outcome: {
          gold: -250,
          favor: 8,
          log: '一座玉雕寿星公送进后衙,门房的册子上,自家名字记在头一页。'
        }
      },
      {
        label: '随大流送中礼',
        outcome: {
          gold: -100,
          favor: 3,
          log: '礼单不出挑也不寒酸,夹在人堆里递了上去,不结怨也不出头。'
        }
      },
      {
        label: '只送一篇寿文',
        outcome: {
          gold: -10,
          rep: 3,
          favor: -3,
          risk: { p: 0.4, gold: -50, log: '县令翻着空礼单冷笑一声,转月就寻了个由头,罚了自家铺面一笔「市容银」。' },
          log: '寿文文采是好,门房册子上却记了笔白板;士林夸家主风骨,衙门里的文书从此压在最底下。'
        }
      }
    ]
  },

  {
    id: 'new_official_fire',
    name: '新官三把火',
    icon: '🏛️',
    cat: 'gov',
    stage: [5, 10],
    seasons: null,
    weight: 7,
    cooldown: 200,
    requires: null,
    text: '老县令高升走了,新县令到任头一天就放话:清丈田亩、严查市税、整顿行栈——三把火,把把烧向有产人家。旧年打点下的关系,一夜之间成了废纸。',
    choices: [
      {
        label: '抢先登门拜码头',
        outcome: {
          gold: -200,
          favor: 6,
          risk: { p: 0.25, gold: -150, rep: -2, log: '新官要立威,头一个上门的反被当了「奸商」典型敲打,赔了夫人又折兵。' },
          log: '赶在所有人前头递了帖子,新县令要用本地人,头一个想起的就是家主。'
        }
      },
      {
        label: '缩头看风向',
        outcome: {
          favor: -4,
          gold: -80,
          log: '三把火烧过,清丈补税挨了一刀,好在没伤筋骨;关系往后慢慢再处。'
        }
      },
      {
        label: '联合士绅递陈情',
        outcome: {
          rep: 4,
          favor: -2,
          risk: { p: 0.3, gold: -150, rep: -3, log: '新官把陈情书往桌上一拍:「抱团抗上?」带头的几家都吃了挂落。' },
          log: '士绅联名陈情有理有节,新官就坡下驴,三把火烧成了三炷香。'
        }
      }
    ]
  },

  /* ==================== odd 奇遇 (5) ==================== */

  {
    id: 'mysterious_taoist',
    name: '神秘道人',
    icon: '☯️',
    cat: 'odd',
    stage: [1, 10],
    seasons: null,
    weight: 5,
    cooldown: 120,
    requires: null,
    text: '一个邋遢道人在门口转了三圈,拦住家主就掐指:「贵宅紫气东来,可惜印堂飘着一缕浮财之相。贫道夜观天象,近日市面有一桩大变——舍几个香火钱,天机说与你听。」',
    choices: [
      {
        label: '奉上香火钱',
        outcome: {
          gold: -50,
          risk: { p: 0.5, log: '道人嘀咕了一通云山雾罩,转身没影,香火钱算是喂了仙鹤。' },
          priceShock: { good: 'herb', mult: 2, days: 8 },
          log: '道人附耳一句「药者贵矣」,飘然而去;数日后药价果然起了风。'
        }
      },
      {
        label: '请进府上款待',
        outcome: {
          gold: -30,
          rep: 2,
          loyalty: 2,
          log: '一顿素斋款待,道人留了一道平安符,府里上下都觉得这宅子稳了。'
        }
      },
      {
        label: '轰走江湖骗子',
        outcome: {
          rep: -1,
          log: '「哪来的牛鼻子!」道人也不恼,笑吟吟丢下一句「不听,不听」,扬长而去。'
        }
      }
    ]
  },

  {
    id: 'street_conman',
    name: '江湖骗子',
    icon: '🎭',
    cat: 'odd',
    stage: [2, 10],
    seasons: null,
    weight: 6,
    cooldown: 90,
    requires: null,
    text: '一位绫罗绸缎的「员外」登门,袖中摸出一锭乌黑的「母银」:「此乃祖传聚宝银母,埋入银窖,百两生十两!在下急等盘缠,忍痛割爱……」说着掰下一角,当场擦亮,白光闪闪。',
    choices: [
      {
        label: '掏钱买下',
        outcome: {
          gold: -150,
          rep: -2,
          log: '「银母」埋了十天,刨出来是包了银皮的铅疙瘩;这事千万不能让账房知道。'
        }
      },
      {
        label: '虚与委蛇送官',
        outcome: {
          favor: 4,
          rep: 3,
          gold: 30,
          log: '稳住人,后门递信报官,人赃并获;衙门发还了一笔缉骗的花红。'
        }
      },
      {
        label: '听完轰出门',
        outcome: {
          log: '「银母?咱家只认银子他爹——汗珠子。」骗子讪讪而去,门房笑了三天。'
        }
      }
    ]
  },

  {
    id: 'ancestor_dream',
    name: '夜梦先祖',
    icon: '🌙',
    cat: 'odd',
    stage: [2, 10],
    seasons: null,
    weight: 5,
    cooldown: 150,
    requires: null,
    text: '三更梦里,先祖拄着拐杖立在堂前,指着祖坟方向连连摇头,一言不发地叹气。醒来一身冷汗。老话讲:祖宗托梦,不是缺了香火,就是要出大事。',
    choices: [
      {
        label: '大祭祖坟',
        outcome: {
          gold: -100,
          inv: { wine: -5, meat: -5 },
          loyalty: 4,
          special: 'baby_boost',
          rep: 2,
          log: '修坟立碑大祭三天,全族跪了一片;说也奇,当年府里喜事连连。'
        }
      },
      {
        label: '烧炷香告慰',
        outcome: {
          gold: -10,
          log: '祠堂里三炷香一份纸钱,心意到了;梦是心头想,日子照常过。'
        }
      },
      {
        label: '只当是梦',
        outcome: {
          loyalty: -2,
          risk: { p: 0.25, gold: -80, log: '没几日库房莫名塌了一角,仆役们咬耳朵:祖宗提点过的,不听。' },
          log: '日有所思夜有所梦,翻个身继续睡,天亮该干嘛干嘛。'
        }
      }
    ]
  },

  {
    id: 'fox_shrine',
    name: '狐仙讨封',
    icon: '🦊',
    cat: 'odd',
    stage: [3, 10],
    seasons: null,
    weight: 4,
    cooldown: 150,
    requires: null,
    text: '后院柴房一连几夜有动静,守夜的婆子赌咒发誓:看见一只通体雪白的狐狸,蹲在房脊上冲她「作揖」。镇上的半仙说,这是狐仙看上了贵宅,讨个供奉,「您供它三分,它保您七分」。',
    choices: [
      {
        label: '设个仙家供位',
        outcome: {
          gold: -40,
          inv: { egg: -5, wine: -2 },
          loyalty: 3,
          risk: { p: 0.3, rep: -2, log: '供位的事传出去,读书人家撇嘴:好好一户人家,供起黄白狐了。' },
          log: '柴房辟了个小供位,鸡蛋黄酒按时上;说来也怪,从此仓里耗子绝了迹。'
        }
      },
      {
        label: '请猎户来守夜',
        outcome: {
          gold: -30,
          risk: { p: 0.35, gold: -30, rep: -1, log: '狐狸没打着,婆子们却吓病了俩,汤药钱没少花,都说冲撞了仙家。' },
          log: '猎户蹲了三夜,逮着一只偷鸡的老白狐,扒了皮,什么仙不仙的。'
        }
      },
      {
        label: '随它去',
        outcome: {
          inv: { egg: -3 },
          log: '井水不犯河水,鸡窝里偶尔少个蛋,就当是给「邻居」的房租。'
        }
      }
    ]
  },

  {
    id: 'strange_beggar',
    name: '异人乞丐',
    icon: '🥣',
    cat: 'odd',
    stage: [1, 10],
    seasons: [3],
    weight: 5,
    cooldown: 120,
    requires: null,
    text: '风雪夜,一个浑身褴褛的老乞丐倒在门口,气若游丝。门房要拿扫帚赶,却见这乞丐冻烂的手里,死死攥着一卷油布包的旧书,封皮上的字,门房一个不识。',
    choices: [
      {
        label: '救进府中将养',
        outcome: {
          gold: -30,
          rep: 3,
          risk: { p: 0.45, log: '老丐养好了伤,磕了个头就走,那卷书也一并带走了,什么也没留下。' },
          log: '老丐去时留下那卷书——竟是一册前朝商家的算经秘本,账房如获至宝。'
        }
      },
      {
        label: '给碗热粥打发',
        outcome: {
          inv: { grain: -2 },
          rep: 1,
          log: '一碗热粥一件旧袄,老丐千恩万谢,踏雪去了,雪地里脚印浅得出奇。'
        }
      },
      {
        label: '赶走了事',
        outcome: {
          rep: -2,
          log: '门前不留生人,老丐被扫帚赶进风雪里;门房半夜总觉得有人在门外咳嗽。'
        }
      }
    ]
  }
];
