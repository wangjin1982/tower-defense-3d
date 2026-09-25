// ===== 全局配置 =====
export const TILE = 2;
export const COLS = 13;
export const ROWS = 9;

// 敌人行走路径（格子坐标 [col,row]，从左入右出）
export const PATH_CELLS = [
  [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [2, 1], [3, 1], [4, 1], [5, 1],
  [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6],
  [9, 5], [9, 4], [9, 3], [9, 2], [10, 2], [11, 2], [11, 3], [11, 4], [12, 4],
];

export const START_GOLD = 220;
export const START_LIVES = 20;
export const TOTAL_WAVES = 20;

// ===== 炮塔定义 =====
export const TOWERS = {
  gun: {
    key: 'gun', name: '机枪塔', icon: '🔫', desc: '射速快，单体伤害',
    cost: 60, dmg: 9, range: 5.2, rate: 2.6, color: 0x66bb6a, kind: 'bullet', bulletSpeed: 18, hp: 100,
  },
  sniper: {
    key: 'sniper', name: '狙击塔', icon: '🎯', desc: '超远射程，高伤慢速',
    cost: 110, dmg: 40, range: 10, rate: 0.65, color: 0xffb74d, kind: 'bullet', bulletSpeed: 30, hp: 85,
  },
  frost: {
    key: 'frost', name: '冰霜塔', icon: '❄️', desc: '范围脉冲，减速敌人',
    cost: 80, dmg: 7, range: 4.6, rate: 1.4, color: 0x81d4fa, kind: 'frost',
    slow: 0.45, slowTime: 2.2, hp: 95,
  },
  rocket: {
    key: 'rocket', name: '火箭塔', icon: '🚀', desc: '溅射伤害，克群体',
    cost: 150, dmg: 30, range: 6.2, rate: 0.85, color: 0xff7043, kind: 'rocket',
    splash: 2.3, bulletSpeed: 8, launchSpeed: 3.2, accel: 9, hp: 75,
  },
  // 冰冻炮：机枪塔 + 冰霜塔合体产物（不可直接建造，fusion: true）
  cryo: {
    key: 'cryo', name: '冰冻炮', icon: '🧊', desc: '合体炮塔：高伤冻结溅射',
    cost: 180, dmg: 38, range: 6.4, rate: 1.35, color: 0x4dd0e1, kind: 'cryo',
    splash: 3.0, bulletSpeed: 14, slow: 0.5, slowTime: 1.2, hp: 130, fusion: true,
  },
  // 极寒火箭：火箭塔 + 冰霜塔合体产物
  frostrkt: {
    key: 'frostrkt', name: '极寒火箭', icon: '💠', desc: '合体炮塔：大范围冻结轰炸',
    cost: 220, dmg: 36, range: 6.6, rate: 0.75, color: 0x18ffff, kind: 'frostrkt',
    splash: 3.0, bulletSpeed: 7, launchSpeed: 3, accel: 8, slow: 0.4, slowTime: 1.6, hp: 110, fusion: true,
  },
  // 冰晶狙击：狙击塔 + 冰霜塔合体产物
  frostsniper: {
    key: 'frostsniper', name: '冰晶狙击', icon: '🔷', desc: '合体炮塔：超远程冻结溅射',
    cost: 240, dmg: 60, range: 12, rate: 0.5, color: 0x5c6bc0, kind: 'frostsniper',
    bulletSpeed: 40, splash: 3.0, slow: 0.6, slowTime: 2.0, hp: 90, fusion: true,
  },
  // 磁轨炮：机枪塔 + 狙击塔合体产物（机枪攻速 + 狙击射程与攻击力）
  rail: {
    key: 'rail', name: '磁轨炮', icon: '⚡', desc: '合体炮塔：机炮攻速 + 狙击射程',
    cost: 260, dmg: 34, range: 10, rate: 2.0, color: 0xb388ff, kind: 'rail',
    bulletSpeed: 34, splash: 3.0, hp: 115, fusion: true,
  },
  // 高射炮：狙击塔 + 火箭塔合体产物（狙击射程 + 火箭伤害，三格大面积爆破）
  flak: {
    key: 'flak', name: '高射炮', icon: '💥', desc: '合体炮塔：远程大面积爆破',
    cost: 280, dmg: 32, range: 10.5, rate: 0.7, color: 0xffd180, kind: 'flak',
    splash: 3.5, bulletSpeed: 20, hp: 100, fusion: true,
  },
};
// 合体：相邻且均为满级的两座塔，花费金币合体
export const FUSION_COST = 180;
export const TOWER_KEYS = Object.keys(TOWERS);
export const BUILDABLE_KEYS = TOWER_KEYS.filter((k) => !TOWERS[k].fusion);
// 合体配方：a + b（相邻且均满级）→ result
export const FUSION_RECIPES = [
  { a: 'gun', b: 'frost', result: 'cryo', cost: 180, label: '🧊 合体为冰冻炮' },
  { a: 'rocket', b: 'frost', result: 'frostrkt', cost: 220, label: '💠 合体为极寒火箭' },
  { a: 'sniper', b: 'frost', result: 'frostsniper', cost: 240, label: '🔷 合体为冰晶狙击' },
  { a: 'gun', b: 'sniper', result: 'rail', cost: 260, label: '⚡ 合体为磁轨炮' },
  { a: 'sniper', b: 'rocket', result: 'flak', cost: 280, label: '💥 合体为高射炮' },
];

// 升级：每级伤害 ×1.55，射程 ×1.12，攻速 ×1.15
export const LEVEL_MULT = { dmg: 1.55, range: 1.12, rate: 1.15 };

// 塔耐久分档：绿 ≥60% · 黄 30~60% · 红 <30%（红色=血量预警）
// 修理：每次只修到下一个变色临界点，费用 = 缺失耐久 × 0.5（向上取整）
export const HP_BANDS = { red: 0.3, green: 0.6 };
export const REPAIR_COST_PER_HP = 0.5;
export const MAX_LEVEL = 3;
export const upgradeCost = (base, level) => Math.round((base * 0.75 * level) / 5) * 5;
export const SELL_RATIO = 0.7;

// ===== 敌人定义（armor = 地狱难度下的护甲值，每次受击减免） =====
export const ENEMIES = {
  normal: { key: 'normal', name: '步兵',   hp: 45,  speed: 1.7,  bounty: 8,  color: 0x9ccc65, size: 0.42, lifeCost: 1, armor: 4 },
  fast:   { key: 'fast',   name: '疾行者', hp: 28,  speed: 3.1,  bounty: 9,  color: 0xffee58, size: 0.36, lifeCost: 1, armor: 3 },
  tank:   { key: 'tank',   name: '重装甲', hp: 170, speed: 1.05, bounty: 20, color: 0xf06292, size: 0.62, lifeCost: 2, armor: 8 },
  boss:   { key: 'boss',   name: 'BOSS',   hp: 950, speed: 0.95, bounty: 90, color: 0xba68c8, size: 0.95, lifeCost: 6, armor: 12 },
  // 攻城兽：扔手雷 + 抡大棒破坏防御塔
  brute:  {
    key: 'brute', name: '攻城兽', hp: 240, speed: 0.85, bounty: 30, color: 0xef6c00, size: 0.7,
    lifeCost: 3, armor: 6,
    towerDmg: { club: 18, clubCd: 2.2, clubRange: 2.4, grenade: 32, grenadeCd: 5, grenadeRange: 4.2 },
  },
  // 超级怪兽：冰冻炮引来的复仇者，全属性强化 + 更强破坏力
  super:  {
    key: 'super', name: '超级怪兽', hp: 420, speed: 1.0, bounty: 60, color: 0xc2185b, size: 0.8,
    lifeCost: 4, armor: 10,
    towerDmg: { club: 30, clubCd: 2.0, clubRange: 2.5, grenade: 45, grenadeCd: 4, grenadeRange: 4.6 },
  },
  // 🏍️ 突袭摩托：每隔 3 关出现，高速突进，扔手雷破坏防御塔
  moto:   {
    key: 'moto', name: '突袭摩托', hp: 120, speed: 2.6, bounty: 25, color: 0xff5252, size: 0.5,
    lifeCost: 2, armor: 3,
    towerDmg: { club: 0, clubCd: 999, clubRange: 0, grenade: 22, grenadeCd: 4, grenadeRange: 4.0 },
  },
  // 🚗 香蕉车：每隔 5 关出现，扔香蕉皮让防御塔滑倒（攻速减半）
  car:    {
    key: 'car', name: '香蕉车', hp: 260, speed: 1.4, bounty: 40, color: 0xffeb3b, size: 0.65,
    lifeCost: 2, armor: 5,
    peel: { rate: 0.5, time: 4, cd: 6, range: 4.5 },
  },
  // 🚜 攻城坦克：每隔 7 关出现，炮轰防御塔
  tankv:  {
    key: 'tankv', name: '攻城坦克', hp: 700, speed: 0.7, bounty: 90, color: 0x616161, size: 0.85,
    lifeCost: 4, armor: 12,
    towerDmg: { club: 0, clubCd: 999, clubRange: 0, grenade: 55, grenadeCd: 4.5, grenadeRange: 4.8 },
  },
};

// ===== 难度 =====
// 怪物属性按 5:4:3（地狱:困难:普通）等比缩放，地狱为基准（5 份）
// 地狱 hpMul 1.8 → 每份 0.36：困难 1.44、普通 1.08；速度/护甲同理
export const DIFFICULTIES = {
  normal: {
    key: 'normal', name: '普通', icon: '🟢', desc: '标准体验，适合熟悉玩法',
    hpMul: 1.08, speedMul: 0.73, startGold: 220, startLives: 20,
    bountyMul: 1, bonusMul: 1, eliteStart: 99, eliteChance: 0, armorMul: 0.6,
    comp: { fastFrom: 3, tankFrom: 5, bossEvery: 7, countMul: 1 },
  },
  hard: {
    key: 'hard', name: '困难', icon: '🔴', desc: '敌人更强更快 · 轻度护甲 · 第 8 波起出现精英怪',
    hpMul: 1.44, speedMul: 0.98, startGold: 200, startLives: 15,
    bountyMul: 1.15, bonusMul: 0.9, eliteStart: 8, eliteChance: 0.12, armorMul: 0.8,
    comp: { fastFrom: 2, tankFrom: 4, bossEvery: 7, countMul: 1.05 },
  },
  hell: {
    key: 'hell', name: '地狱', icon: '💀', desc: '敌人大军披甲 · 精英横行分裂 · BOSS 每 5 波一波',
    hpMul: 1.8, speedMul: 1.22, startGold: 180, startLives: 10,
    bountyMul: 1.35, bonusMul: 0.8, eliteStart: 4, eliteChance: 0.22, armorMul: 1,
    comp: { fastFrom: 1, tankFrom: 3, bossEvery: 5, countMul: 1.15 },
  },
};

// ===== 阶段强化：每隔 3 关提升 1 级（效果叠加，无上限） =====
export const STAGE_LEVEL = { every: 3, hp: 1.10, speed: 1.045, armor: 0.5 };

export function stageBoost(wave) {
  const level = Math.floor(wave / STAGE_LEVEL.every); // w1-2:0，w3-5:1，w6-8:2 …（升级点在第 3/6/9/12/15/18 波）
  return {
    level,
    hp: Math.pow(STAGE_LEVEL.hp, level),
    speed: Math.pow(STAGE_LEVEL.speed, level),
    armor: STAGE_LEVEL.armor * level,
  };
}

// ===== 波次生成（按难度调整出兵节奏）=====
// 构建单波编制（无尽模式按需调用，w 无上限）
export function buildWave(w, diffKey) {
  const d = DIFFICULTIES[diffKey] || DIFFICULTIES.normal;
  const { fastFrom, tankFrom, bossEvery, countMul } = d.comp;
  const entries = [
    { type: 'normal', count: Math.round((5 + Math.round(w * 1.1)) * countMul), gap: 0.9 },
  ];
  if (w >= fastFrom) entries.push({ type: 'fast', count: 2 + Math.floor(w * 0.55), gap: 0.55 });
  if (w >= tankFrom) entries.push({ type: 'tank', count: Math.floor((w - tankFrom + 2) / 2), gap: 1.7 });
  if (w % bossEvery === 0) entries.push({ type: 'boss', count: Math.max(1, Math.floor(w / 10)), gap: 4 });
  // 每隔 2 关（偶数波）出现攻城兽，数量逐波递增（封顶 4）
  if (w % 2 === 0) entries.push({ type: 'brute', count: Math.min(4, 1 + Math.floor((w - 2) / 2)), gap: 3.5 });
  // 载具部队：摩托车每 3 关、汽车每 5 关、坦克每 7 关各递增
  if (w % 3 === 0) entries.push({ type: 'moto', count: Math.min(4, 1 + Math.floor((w - 3) / 3)), gap: 2.5 });
  if (w % 5 === 0) entries.push({ type: 'car', count: Math.min(3, 1 + Math.floor((w - 5) / 5)), gap: 3 });
  if (w % 7 === 0) entries.push({ type: 'tankv', count: Math.min(2, 1 + Math.floor((w - 7) / 7)), gap: 4 });
  // 第 20 波：全体敌人总攻
  if (w === TOTAL_WAVES) {
    entries.push(
      { type: 'boss', count: 2, gap: 6 },
      { type: 'brute', count: 4, gap: 3 },
      { type: 'moto', count: 4, gap: 2 },
      { type: 'car', count: 3, gap: 3 },
      { type: 'tankv', count: 2, gap: 4 },
    );
  }
  const boost = stageBoost(w);
  return { index: w, hpMul: (1 + (w - 1) * 0.22) * d.hpMul * boost.hp, entries };
}

// 前 20 波批量生成（第 21 波起由游戏按需调用 buildWave）
export function makeWaves(diffKey = 'normal') {
  const waves = [];
  for (let w = 1; w <= TOTAL_WAVES; w++) waves.push(buildWave(w, diffKey));
  return waves;
}
