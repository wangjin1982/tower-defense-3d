// ===== 游戏主逻辑 =====
import * as THREE from 'three';
import {
  TOTAL_WAVES, TOWERS, TOWER_KEYS, DIFFICULTIES, makeWaves, buildWave, stageBoost, STAGE_LEVEL,
  MAX_LEVEL, FUSION_RECIPES,
} from './config.js?v=2.4';
import { cellToWorld, isBuildable } from './map.js?v=2.4';
import { Enemy, PATH_TOTAL } from './enemies.js?v=2.4';
import { Tower } from './towers.js?v=2.4';
import { Projectile, Grenade, Peel } from './projectiles.js?v=2.4';

export class Game {
  constructor({ scene, camera, audio, effects, ui }) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;
    this.effects = effects;
    this.ui = ui;

    this.state = 'menu'; // menu | playing | over
    this.paused = false;
    this.speed = 1;
    this.diffKey = 'normal';
    this.diff = DIFFICULTIES.normal;
    this.gold = this.diff.startGold;
    this.lives = this.diff.startLives;
    this.kills = 0;
    this.goldEarned = 0;
    this.waveIndex = 0;          // 已开始的波数
    this.waveActive = false;
    this.waveTime = 0;
    this.spawnQueue = [];        // [{time, type}]
    this.now = 0;

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.grid = new Map();       // "col,row" -> Tower
    this.selectedTower = null;
    this.buildKey = null;
    this.hoverCell = null;
    this.waves = makeWaves(this.diffKey);

    // 放置预览
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x69f0ae, transparent: true, opacity: 0.45,
    });
    this.ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.8, 8), ghostMat);
    this.ghost.visible = false;
    scene.add(this.ghost);
    this.ghostRing = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.04, 48),
      new THREE.MeshBasicMaterial({ color: 0x69f0ae, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    this.ghostRing.rotation.x = -Math.PI / 2;
    this.ghostRing.position.y = 0.09;
    this.ghostRing.visible = false;
    scene.add(this.ghostRing);
  }

  // ===== 生命周期 =====
  _applyDifficulty(diffKey) {
    this.diffKey = DIFFICULTIES[diffKey] ? diffKey : 'normal';
    this.diff = DIFFICULTIES[this.diffKey];
    this.gold = this.diff.startGold;
    this.lives = this.diff.startLives;
    this.waves = makeWaves(this.diffKey);
  }

  // 清场（重开 / 回菜单共用）
  _resetWorld() {
    for (const e of this.enemies) e.dispose(this.scene);
    for (const t of this.towers) t.dispose(this.scene);
    for (const p of this.projectiles) p.dispose(this.scene);
    this.effects.clear();
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.grid.clear();
    this.selectedTower = null;
    this.ui.hideTowerPanel();
    this.ui.selectBuild(null);
  }

  start(diffKey) {
    this._applyDifficulty(diffKey);
    this.state = 'playing';
    this.paused = false;
    this.speed = 1;
    this.kills = 0;
    this.goldEarned = 0;
    this.waveIndex = 0;
    this.waveActive = false;
    this.superAggro = false; // 冰冻炮仇恨状态（合体点亮 / 冰冻炮被毁解除）
    this.rewardStacks = { rate: 0, range: 0, def: 0, stun: 0 }; // Boss 击杀隐藏奖励层数
    this.rewardMult = { rate: 1, range: 1, def: 0, stun: 0 };   // 奖励生效倍率
    this.spawnQueue = [];
    this.audio.ensure();
    this.ui.setPauseText(false);
    this.ui.setSpeedText('⏩ 1x');
    this.ui.setDifficultyText(`${this.diff.icon} ${this.diff.name}`);
    this.ui.showGame();
    this.refreshUI();
    const sub = this.diffKey === 'normal'
      ? '点击下方炮塔放置到空地，然后开始第一波'
      : this.diff.desc;
    this.ui.announce(`${this.diff.icon} ${this.diff.name}难度`, sub);
    this.ui.showWaveButton(true, '▶ 开始第 1 波 (空格)');
  }

  restart() {
    this._resetWorld();
    this.start(this.diffKey);
  }

  backToMenu() {
    this._resetWorld();
    this.state = 'menu';
    this.waveIndex = 0;
    this.waveActive = false;
    this.spawnQueue = [];
    this.ui.showMenu();
  }

  // ===== 建造 =====
  onSelectBuild(key) { this.buildKey = key; }

  placeTower(key, col, row) {
    const def = TOWERS[key];
    if (!def) return false;
    const cellKey = `${col},${row}`;
    if (this.grid.has(cellKey) || !isBuildable(col, row)) return false;
    if (this.gold < def.cost) { this.audio.error(); this.ui.toast('💰 金币不足'); return false; }
    this.gold -= def.cost;
    const tower = new Tower(key, col, row, this.scene, cellToWorld);
    tower.game = this;
    tower.setLevelVisual();
    this.towers.push(tower);
    this.grid.set(cellKey, tower);
    this.audio.place();
    this.effects.burst(new THREE.Vector3(tower.x, 0.6, tower.z), def.color, 10, 2.5, 0.5);
    this.refreshUI();
    return true;
  }

  selectTowerAt(col, row) {
    const tower = this.grid.get(`${col},${row}`) || null;
    if (this.selectedTower) this.selectedTower.rangeRing.visible = false;
    this.selectedTower = tower;
    if (tower) {
      tower.rangeRing.visible = true;
      this.showTowerPanel();
    } else {
      this.ui.hideTowerPanel();
    }
  }

  showTowerPanel() {
    const t = this.selectedTower;
    if (!t) return;
    this.ui.showTowerPanel({
      def: t.def, level: t.level, dmg: t.dmg, range: t.effRange, rate: t.effRate,
      kills: t.kills || 0, nextCost: t.nextUpgradeCost, sellValue: t.sellValue,
      hp: t.hp, maxHp: t.maxHp, fuse: this.getFuseInfo(t),
      band: t.band, repair: t.repairInfo,
    });
  }

  // 修理选中塔：仅限满级塔，只修到下一个变色临界点
  repairSelected() {
    const t = this.selectedTower;
    if (!t) return;
    if (t.level < MAX_LEVEL) {
      this.audio.error();
      this.ui.toast('🔧 只有满级（3 级）塔可以修理——先升级它！');
      return;
    }
    const info = t.repairInfo;
    if (!info) { this.audio.error(); return; }
    if (this.gold < info.cost) { this.audio.error(); this.ui.toast('💰 金币不足'); return; }
    this.gold -= info.cost;
    t.repair();
    this.audio.repair();
    this.effects.burst(new THREE.Vector3(t.x, 1, t.z), 0x76ff03, 10, 2.5, 0.5);
    this.effects.ring(new THREE.Vector3(t.x, 0.3, t.z), 0x76ff03, 1.6, 0.4);
    this.ui.toast(`🔧 修理完成：耐久恢复至${info.toBand}区（💰${info.cost}）`);
    this.showTowerPanel();
    this.refreshUI();
  }

  // ===== 合体：相邻且满级的配方组合 → 合体塔 =====
  getFuseInfo(tower) {
    if (tower.level < MAX_LEVEL) return null;
    for (const recipe of FUSION_RECIPES) {
      let need = null;
      if (tower.key === recipe.a) need = recipe.b;
      else if (tower.key === recipe.b) need = recipe.a;
      if (!need) continue;
      for (const t of this.towers) {
        if (t === tower || t.key !== need || t.level < MAX_LEVEL) continue;
        if (Math.abs(t.col - tower.col) + Math.abs(t.row - tower.row) === 1) {
          return { cost: recipe.cost, label: recipe.label, recipe };
        }
      }
    }
    return null;
  }

  fuseSelected() {
    const t = this.selectedTower;
    if (!t) return;
    const info = this.getFuseInfo(t);
    if (!info) { this.audio.error(); return; }
    if (this.gold < info.cost) { this.audio.error(); this.ui.toast('💰 金币不足'); return; }
    const { recipe } = info;
    const need = t.key === recipe.a ? recipe.b : recipe.a;
    let partner = null;
    for (const o of this.towers) {
      if (o === t || o.key !== need || o.level < MAX_LEVEL) continue;
      if (Math.abs(o.col - t.col) + Math.abs(o.row - t.row) === 1) { partner = o; break; }
    }
    if (!partner) return;
    const { col, row } = t;
    const invested = t.invested + partner.invested + info.cost;
    for (const old of [t, partner]) {
      this.grid.delete(`${old.col},${old.row}`);
      const idx = this.towers.indexOf(old);
      if (idx >= 0) this.towers.splice(idx, 1);
      old.dispose(this.scene);
    }
    const fused = new Tower(recipe.result, col, row, this.scene, cellToWorld);
    fused.invested = invested;
    fused.game = this;
    fused.setLevelVisual();
    this.towers.push(fused);
    this.grid.set(`${col},${row}`, fused);
    this.gold -= info.cost;
    this.selectedTower = fused;
    this.superAggro = true; // 任意合体塔上线：下一波起引来超级怪兽
    this.audio.upgrade();
    this.effects.ring(new THREE.Vector3(fused.x, 0.3, fused.z), fused.def.color, fused.range, 0.7);
    this.effects.burst(new THREE.Vector3(fused.x, 1, fused.z), fused.def.color, 16, 3, 0.6);
    this.ui.toast(`${fused.def.icon} 合体成功：${fused.def.name}上线！`);
    this.showTowerPanel();
    this.refreshUI();
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t || t.nextUpgradeCost == null) return;
    if (this.gold < t.nextUpgradeCost) { this.audio.error(); this.ui.toast('💰 金币不足'); return; }
    this.gold -= t.nextUpgradeCost;
    t.invested += t.nextUpgradeCost;
    t.level += 1;
    t.setLevelVisual();
    this.audio.upgrade();
    this.effects.ring(new THREE.Vector3(t.x, 0.3, t.z), 0xffd740, t.range, 0.6);
    this.showTowerPanel();
    this.refreshUI();
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return;
    if (t.def.fusion) this.superAggro = false; // 卖掉合体塔同样解除仇恨
    this.gold += t.sellValue;
    this.grid.delete(`${t.col},${t.row}`);
    this.towers.splice(this.towers.indexOf(t), 1);
    t.dispose(this.scene);
    this.selectedTower = null;
    this.ui.hideTowerPanel();
    this.audio.sell();
    this.ui.toast(`出售获得 💰${t.sellValue}`);
    this.refreshUI();
  }

  // ===== 波次 =====
  startNextWave() {
    if (this.state !== 'playing' || this.waveActive) return; // 无尽模式：不设波次上限
    this.waveIndex += 1;
    // 无尽模式：第 21 波起按需生成新编制
    while (this.waves.length < this.waveIndex) {
      this.waves.push(buildWave(this.waves.length + 1, this.diffKey));
    }
    const wave = this.waves[this.waveIndex - 1];
    this.spawnQueue = [];
    let t = 0.5;
    for (const entry of wave.entries) {
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push({ time: t, type: entry.type, hpMul: wave.hpMul });
        t += entry.gap;
      }
    }
    // 冰冻炮/合体塔在场 → 引来超级怪兽；第 20 波全体总攻时超级怪兽也会出现
    const superWave = this.superAggro === true || this.waveIndex === TOTAL_WAVES;
    if (superWave) {
      const count = this.waveIndex === TOTAL_WAVES ? 3 : Math.min(3, 1 + Math.floor(this.waveIndex / 10));
      for (let i = 0; i < count; i++) {
        this.spawnQueue.push({ time: t + 1 + i * 5, type: 'super', hpMul: wave.hpMul });
      }
    }
    this.waveTime = 0;
    this.waveActive = true;
    this.superCinePlayed = false; // 每波第一只超级怪兽触发入场动画
    this.ui.showWaveButton(false);
    const isBoss = wave.entries.some((e) => e.type === 'boss');
    const isStageWave = this.waveIndex > 0 && this.waveIndex % STAGE_LEVEL.every === 0;
    let sub;
    if (this.waveIndex === TOTAL_WAVES) {
      sub = '🔥 最终波总攻！全体敌人出动，背水一战！';
    } else if (isStageWave) {
      const lv = stageBoost(this.waveIndex).level;
      sub = `🧬 敌人强化等级提升至 Lv.${lv}：生命/速度/护甲增强！`;
    } else if (superWave) {
      sub = '👹 冰冻炮引来了超级怪兽！守住它！';
    } else if (isBoss) {
      sub = '⚠️ 本波有 BOSS 出没！';
    } else {
      sub = `共 ${this.spawnQueue.length} 个敌人`;
    }
    this.ui.announce(`第 ${this.waveIndex} 波来袭`, sub);
    this.audio.waveStart();
    this.refreshUI();
  }

  updateWave(dt) {
    if (!this.waveActive) return;
    this.waveTime += dt;
    const boost = stageBoost(this.waveIndex);
    // 第 15 波起：怪物全属性狂暴 ×1.5
    const rage = this.waveIndex >= 15 ? 1.5 : 1;
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].time <= this.waveTime) {
      const s = this.spawnQueue.shift();
      // 第一只超级怪兽出生：入场动画 + 慢镜头
      if (s.type === 'super' && !this.superCinePlayed) {
        this.superCinePlayed = true;
        this.superCinematic();
      }
      const bountyMul = this.diff.bountyMul * (1 + (this.waveIndex - 1) * 0.05);
      const elite = this.waveIndex >= this.diff.eliteStart
        && Math.random() < this.diff.eliteChance;
      this.enemies.push(new Enemy(s.type, s.hpMul * rage, this.scene, bountyMul, {
        elite, speedMul: this.diff.speedMul * boost.speed * rage,
        armorMul: this.diff.armorMul * rage, armorBonus: boost.armor,
      }));
    }
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveActive = false;
      const bonus = Math.round((30 + this.waveIndex * 10) * this.diff.bonusMul);
      this.gold += bonus;
      this.goldEarned += bonus;
      // 无尽模式：没有胜利结算，一直守到核心失守
      this.ui.announce(`第 ${this.waveIndex} 波已清除`, `奖励 💰${bonus} · 休整一下，随时开始下一波`);
      this.ui.showWaveButton(true, `▶ 开始第 ${this.waveIndex + 1} 波 (空格)`);
      this.refreshUI();
    }
  }

  // ===== 敌人相关 =====
  onEnemyKilled(enemy, tower) {
    if (enemy.counted) return;
    enemy.counted = true;
    this.gold += enemy.bounty;
    this.goldEarned += enemy.bounty;
    this.kills += 1;
    if (enemy.def.key === 'boss') this.grantBossReward(); // 击杀 BOSS：随机隐藏奖励
    if (tower) tower.kills = (tower.kills || 0) + 1;
    if (this.selectedTower) this.showTowerPanel();
    this.audio.kill();
    this.effects.burst(enemy.mesh.position, enemy.def.color, 8, 2.8, 0.45);
    // 地狱难度：精英怪死亡分裂成两只疾行者
    if (enemy.elite && this.diffKey === 'hell') this._splitElite(enemy);
    this.refreshUI();
  }

  _splitElite(elite) {
    const wave = this.waves[Math.max(this.waveIndex, 1) - 1];
    const boost = stageBoost(this.waveIndex);
    const rage = this.waveIndex >= 15 ? 1.5 : 1;
    const bountyMul = this.diff.bountyMul * (1 + (this.waveIndex - 1) * 0.05) * 0.5;
    for (let i = 0; i < 2; i++) {
      // 沿路径原地分裂，前后错开一点，继承行进距离
      const child = new Enemy('fast', wave.hpMul * 0.6 * rage, this.scene, bountyMul, {
        speedMul: this.diff.speedMul * 1.1 * boost.speed * rage, armorMul: this.diff.armorMul * rage,
        startDist: Math.max(0, Math.min(elite.dist, PATH_TOTAL - 0.01) - i * 0.5),
      });
      this.enemies.push(child);
    }
    this.effects.burst(elite.mesh.position, 0xffd740, 12, 3.5, 0.55);
    this.effects.ring(elite.mesh.position, 0xffd740, 1.6, 0.45);
    this.audio.split();
    this.ui.toast('⚠️ 精英怪分裂成两只疾行者！');
  }

  endGame(win) {
    this.state = 'over';
    this.waveActive = false;
    this.ui.showGameOver(win, {
      wave: this.waveIndex, kills: this.kills, goldEarned: this.goldEarned,
      diffName: `${this.diff.icon} ${this.diff.name}`,
    });
    if (win) this.audio.win(); else this.audio.lose();
  }

  // ===== 主更新 =====
  update(rawDt) {
    this.now += rawDt;
    if (this.state !== 'playing' || this.paused) {
      // 菜单/暂停时仍让传送门与核心旋转，保持画面活性
      this.idleSpin(rawDt);
      return;
    }
    const dt = rawDt * this.speed;
    this.cinematicT = Math.max(0, (this.cinematicT || 0) - rawDt);
    const gameDt = this.cinematicT > 0 ? dt * 0.35 : dt; // 超级怪兽入场慢镜头
    // Boss 奖励横幅动画
    if (this.rewardSprite) {
      const rs = this.rewardSprite;
      rs.age += rawDt;
      const k = rs.age / rs.life;
      if (k >= 1) {
        this.scene.remove(rs.sprite);
        rs.sprite.material.map.dispose();
        rs.sprite.material.dispose();
        this.rewardSprite = null;
      } else {
        rs.sprite.material.opacity = k < 0.12 ? k / 0.12 : (k > 0.8 ? Math.max(0, (1 - k) / 0.2) : 1);
      }
    }

    // 场景内横幅动画（实时播放，不受慢镜头影响）
    if (this.cineSprite) {
      const cs = this.cineSprite;
      cs.age += rawDt;
      const k = cs.age / cs.life;
      if (k >= 1) {
        this.scene.remove(cs.sprite);
        cs.sprite.material.map.dispose();
        cs.sprite.material.dispose();
        this.cineSprite = null;
      } else {
        cs.sprite.material.opacity = k < 0.15 ? k / 0.15 : (k > 0.78 ? Math.max(0, (1 - k) / 0.22) : 1);
        const s = 1 + Math.max(0, 0.25 - k) * 0.8;
        cs.sprite.scale.set(13 * s, 3.7 * s, 1);
      }
    }

    // 出兵
    this.updateWave(gameDt);

    // 敌人
    for (const e of this.enemies) e.update(gameDt, this.now, this.camera, this);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.reachedEnd) {
        this.lives = Math.max(0, this.lives - e.lifeCost);
        this.ui.flashDamage();
        this.audio.leak();
        this.effects.explosion(e.mesh.position.clone(), 1.2);
        e.dispose(this.scene);
        this.enemies.splice(i, 1);
        this.refreshUI();
        if (this.lives <= 0) { this.endGame(false); return; }
      } else if (!e.alive && this.now - e.deathTime > 0.4) {
        e.dispose(this.scene);
        this.enemies.splice(i, 1);
      }
    }

    // 炮塔
    for (const t of this.towers) t.update(gameDt, this.now, this.enemies, this);

    // 子弹
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(gameDt, this);
      if (!p.alive) {
        p.dispose(this.scene);
        this.projectiles.splice(i, 1);
      }
    }

    this.effects.update(gameDt);
    this.updateGhost();
    this.idleSpin(gameDt);
  }

  idleSpin(dt) {
    // 核心与传送门常转
    this.coreSpin = (this.coreSpin || 0) + dt;
    if (this.mapRefs) {
      const { gate, core, coreRing } = this.mapRefs;
      if (gate) gate.rotation.z += dt * 1.5;
      if (core) core.rotation.y += dt * 0.8;
      if (coreRing) coreRing.rotation.z += dt * 1.2;
    }
  }

  spawnProjectile(tower, target, muzzle) {
    const p = new Projectile(tower, target, muzzle);
    this.scene.add(p.mesh);
    this.projectiles.push(p);
    if (tower.def.kind === 'rocket' || tower.def.kind === 'frostrkt') {
      this.audio.rocketLaunch();
      // 导弹出膛：亮光 + 推进烟团
      this.effects.burst(muzzle, tower.def.kind === 'frostrkt' ? 0xb2ebf2 : 0xfff3e0, 5, 2.4, 0.18, 0);
      this.effects.burst(muzzle, 0x9aa3b2, 8, 1.5, 0.7, 0.25);
    } else {
      this.audio.shoot(tower.def.kind === 'frostsniper' ? 'sniper' : tower.def.kind);
      this.effects.burst(muzzle, tower.def.color, 2, 1.2, 0.15, 0);
    }
  }

  // ===== 攻城兽攻城 =====
  // 超级怪兽入场动画：场景内横幅（Sprite）+ 慢镜头 + 震屏 + 警报
  superCinematic() {
    this.audio.siren();
    this.cinematicT = 1.5;
    this.ui.superCinematic();
    // 用 CanvasTexture 生成横幅，直接渲染进 3D 场景（录屏/截图可见）
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 288;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(120, 10, 25, 0.35)';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 23, 68, 0.95)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ff5252';
    ctx.font = '900 104px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('👹 超级怪兽来袭', 512, 130);
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffcdd2';
    ctx.font = '600 44px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('— 守 住 冰 冻 炮 —', 512, 226);
    const tex = new THREE.CanvasTexture(cv);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false,
    }));
    sprite.position.set(0, 6.5, 0);
    sprite.scale.set(13, 3.7, 1);
    sprite.renderOrder = 50;
    this.scene.add(sprite);
    this.cineSprite = { sprite, age: 0, life: 2.8 };
  }

  spawnGrenade(brute, tower, dmg) {
    const g = new Grenade(brute.mesh.position, tower, dmg);
    this.scene.add(g.mesh);
    this.projectiles.push(g);
    this.audio.grenadeThrow();
  }

  // 香蕉车：扔皮让塔滑倒（攻速减半）
  spawnPeel(vehicle, tower, peelDef) {
    const p = new Peel(vehicle.mesh.position, tower, peelDef);
    this.scene.add(p.mesh);
    this.projectiles.push(p);
    this.audio.grenadeThrow();
  }

  // ===== Boss 击杀随机奖励（隐藏 buff，逐层叠加，跨波保留） =====
  grantBossReward() {
    const pool = ['rate', 'range', 'def', 'stun'];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.rewardStacks[pick] += 1;
    this.rewardMult.rate = 1 + 0.2 * this.rewardStacks.rate;   // 全体攻速 +20%/层
    this.rewardMult.range = 1 + 0.2 * this.rewardStacks.range; // 全体射程 +20%/层
    this.rewardMult.def = this.rewardStacks.def;               // 塔受伤 ×0.8/层
    this.rewardMult.stun = 2 * this.rewardStacks.stun;         // 火箭塔眩晕 2 秒/层
    this._showRewardBanner(pick, this.rewardStacks[pick]);
  }

  // Boss 奖励揭晓横幅：金色 Sprite 渲染进场景（录屏可见），带层数提示
  _showRewardBanner(pick, stacks) {
    const defs = {
      rate: { title: '🎁 射击速度提升', sub: `全体攻速 +20%（当前 +${20 * stacks}%）` },
      range: { title: '🎁 攻击范围提升', sub: `全体射程 +20%（当前 +${20 * stacks}%）` },
      def: { title: '🎁 防御力提升', sub: `塔受损 -20%（当前 -${20 * stacks}%）` },
      stun: { title: '🎁 火箭强化', sub: `火箭眩晕 ${2 * stacks} 秒` },
    };
    const d = defs[pick];
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 240;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(35, 30, 5, 0.42)';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 215, 64, 0.95)';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#ffd740';
    ctx.font = '900 88px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(d.title, 512, 108);
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff8e1';
    ctx.font = '600 42px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(d.sub, 512, 200);
    const tex = new THREE.CanvasTexture(cv);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false,
    }));
    sprite.position.set(0, 6.5, 0);
    sprite.scale.set(12, 2.8, 1);
    sprite.renderOrder = 50;
    this.scene.add(sprite);
    this.rewardSprite = { sprite, age: 0, life: 2.4 };
  }

  damageTower(tower, dmg) {
    if (tower.dead || this.state !== 'playing') return;
    dmg *= Math.pow(0.8, this.rewardMult.def); // 防御奖励：塔受伤减免
    tower.hp -= dmg;
    this.effects.burst(tower.mesh.position.clone().setY(1), 0xff5252, 4, 2, 0.3);
    if (tower.hp <= 0) {
      this.destroyTower(tower);
    } else if (this.selectedTower === tower) {
      this.showTowerPanel();
    }
  }

  destroyTower(tower) {
    tower.dead = true;
    tower.hp = 0;
    const { col, row } = tower;
    this.grid.delete(`${col},${row}`);
    const idx = this.towers.indexOf(tower);
    if (idx >= 0) this.towers.splice(idx, 1);
    this.effects.explosion(tower.mesh.position.clone().setY(0.8), 1.6);
    this.audio.explode();
    tower.dispose(this.scene);
    if (this.selectedTower === tower) {
      this.selectedTower = null;
      this.ui.hideTowerPanel();
    }
    if (tower.def.fusion) {
      // 合体塔被摧毁：不消失，退回 1 级状态留在原地；超级怪兽仇恨解除
      this.superAggro = false;
      const remains = new Tower('cryo', col, row, this.scene, cellToWorld);
      remains.setLevelVisual();
      this.towers.push(remains);
      this.grid.set(`${col},${row}`, remains);
      this.ui.toast(`🧊 ${tower.def.name}受损，退回 1 级状态`);
    } else {
      this.ui.toast('💥 一座防御塔被摧毁了！点击空地可以重建');
    }
  }

  // ===== 悬停 ghost =====
  onHover(cell) {
    this.hoverCell = cell;
  }

  updateGhost() {
    const show = this.buildKey && this.hoverCell && isBuildable(this.hoverCell.col, this.hoverCell.row)
      && !this.grid.has(`${this.hoverCell.col},${this.hoverCell.row}`);
    this.ghost.visible = !!show;
    this.ghostRing.visible = !!show;
    if (show) {
      const { x, z } = cellToWorld(this.hoverCell.col, this.hoverCell.row);
      const def = TOWERS[this.buildKey];
      const affordable = this.gold >= def.cost;
      this.ghost.position.set(x, 0.4, z);
      this.ghost.material.color.setHex(affordable ? 0x69f0ae : 0xff5252);
      this.ghostRing.position.set(x, 0.09, z);
      this.ghostRing.material.color.setHex(affordable ? 0x69f0ae : 0xff5252);
      this.ghostRing.geometry.dispose();
      this.ghostRing.geometry = new THREE.RingGeometry(def.range - 0.05, def.range, 48);
      this.ghostRing.scale.setScalar(this.rewardMult.range);
    }
  }

  // ===== 点击分派（来自 input） =====
  onLeftClick(cell) {
    if (this.state !== 'playing' || this.paused) return;
    if (this.buildKey) {
      const ok = this.placeTower(this.buildKey, cell.col, cell.row);
      if (ok) {
        // 放置成功：非按住 shift 时继续保留建造模式方便连放
        return;
      }
    }
    this.selectTowerAt(cell.col, cell.row);
  }

  // ===== 控制 =====
  togglePause() {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
    this.ui.setPauseText(this.paused);
    this.ui.toast(this.paused ? '⏸ 已暂停' : '▶ 继续');
  }

  toggleSpeed() {
    if (this.state !== 'playing') return;
    this.speed = this.speed === 1 ? 2 : 1;
    this.ui.setSpeedText(this.speed === 1 ? '⏩ 1x' : '⏩ 2x');
  }

  cancelAll() {
    this.ui.selectBuild(null);
    if (this.selectedTower) {
      this.selectedTower.rangeRing.visible = false;
      this.selectedTower = null;
      this.ui.hideTowerPanel();
    }
  }

  refreshUI() {
    this.ui.setStats({
      lives: this.lives, gold: this.gold,
      wave: Math.max(this.waveIndex, 1), totalWaves: 0, // 无尽模式不显示总波数
    });
  }
}
