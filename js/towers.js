// ===== 炮塔 =====
import * as THREE from 'three';
import { TOWERS, LEVEL_MULT, MAX_LEVEL, upgradeCost, HP_BANDS } from './config.js?v=2.5';

function buildMesh(def) {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5, metalness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.color, roughness: 0.35, metalness: 0.4,
    emissive: def.color, emissiveIntensity: 0.35,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.85, 0.4, 8), baseMat);
  base.position.y = 0.2;
  base.castShadow = true;
  g.add(base);

  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 24), accentMat);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.42;
  g.add(trim);

  const turret = new THREE.Group();
  turret.position.y = 0.55;
  g.add(turret);

  if (def.kind === 'cannon') {
    // 超级加农炮：巨型双管 + 充能环
    const megaMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.4, metalness: 0.6 });
    const glowMat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.6 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.0), megaMat);
    turret.add(head);
    for (const dx of [-0.24, 0.24]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.3, 10), glowMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(dx, 0, 0.75);
      turret.add(barrel);
    }
    const chargeRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 10, 28), glowMat);
    chargeRing.rotation.x = Math.PI / 2;
    chargeRing.position.y = 0.45;
    turret.add(chargeRing);
    turret.userData.chargeRing = chargeRing;
  } else if (def.kind === 'medic') {
    // 医疗塔：白色底座 + 红十字 + 悬浮加号
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef5350, emissive: 0xef5350, emissiveIntensity: 0.25 });
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), crossMat);
    post.position.y = 0.85;
    g.add(post);
    for (const rot of [0, Math.PI / 2]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.22), redMat);
      arm.position.y = 0.85;
      arm.rotation.y = rot;
      g.add(arm);
    }
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.04, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xef5350, emissive: 0xef5350, emissiveIntensity: 0.4 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.35;
    g.add(halo);
    g.userData.medicHalo = halo;
  } else if (def.kind === 'gun' || def.kind === 'rail' || def.kind === 'medgun') {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), baseMat);
    turret.add(head);
    for (const dx of [-0.18, 0.18]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8), accentMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(dx, 0, 0.55);
      turret.add(barrel);
    }
  } else if (def.kind === 'sniper' || def.kind === 'frostsniper') {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.75, 6), baseMat);
    turret.add(head);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), accentMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.12, 0.7);
    turret.add(barrel);
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.35), accentMat);
    scope.position.set(0, 0.5, 0.15);
    turret.add(scope);
  } else if (def.kind === 'cryo') {
    // 冰冻炮：双管冷冻炮 + 顶部冰晶
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 0.72), baseMat);
    turret.add(head);
    for (const dx of [-0.16, 0.16]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.95, 8), accentMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(dx, 0, 0.6);
      turret.add(barrel);
    }
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), accentMat);
    crystal.position.set(0, 0.42, -0.12);
    turret.add(crystal);
    turret.userData.crystal = crystal;
  } else if (def.kind === 'rocket' || def.kind === 'frostrkt' || def.kind === 'flak') {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.85), baseMat);
    turret.add(head);
    for (const dx of [-0.2, 0.2]) for (const dz of [-0.12, 0.22]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), accentMat);
      tube.rotation.x = Math.PI / 2.6;
      tube.position.set(dx, 0.28, dz);
      turret.add(tube);
    }
  } else {
    // 冰霜塔：漂浮水晶
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), accentMat);
    crystal.position.y = 0.35;
    turret.add(crystal);
    turret.userData.crystal = crystal;
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.04, 8, 24), accentMat
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.35;
    turret.add(halo);
    turret.userData.halo = halo;
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.turret = turret;
  return g;
}

export class Tower {
  constructor(key, col, row, scene, cellToWorld) {
    this.def = TOWERS[key];
    this.key = key;
    this.col = col;
    this.row = row;
    this.level = 1;
    this.invested = this.def.cost;
    this.cooldown = 0;
    this.aimYaw = 0;

    const { x, z } = cellToWorld(col, row);
    this.x = x; this.z = z;
    this.mesh = buildMesh(this.def);
    this.mesh.position.set(x, 0.3, z);
    scene.add(this.mesh);

    // 耐久（攻城兽可破坏；升级时上限提升）
    this.maxHp = Math.round(this.def.hp * (1 + (this.level - 1) * 0.35));
    this.hp = this.maxHp;
    this.slipUntil = 0; // 香蕉皮滑倒截止时间（攻速减半）
    this.game = null;   // 由 game 在创建后回填（奖励加成读取用）
    this.beams = [];    // 五角星光束（视觉）
    this.beamAngle = 0;

    // 耐久条（受损时显示）
    this.bar = new THREE.Group();
    const barBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.13),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })
    );
    this.barFg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 0.09),
      new THREE.MeshBasicMaterial({ color: 0x40c4ff, depthWrite: false })
    );
    this.barFg.position.z = 0.01;
    this.bar.add(barBg, this.barFg);
    this.bar.renderOrder = 10;
    this.bar.position.y = 1.5;
    this.bar.visible = false;
    this.mesh.add(this.bar);

    // 射程圈（选中时显示）
    this.rangeRing = new THREE.Mesh(
      new THREE.RingGeometry(this.range - 0.06, this.range, 48),
      new THREE.MeshBasicMaterial({
        color: this.def.color, transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.set(x, 0.08, z);
    this.rangeRing.visible = false;
    scene.add(this.rangeRing);
  }

  // 当前等级实际属性
  get dmg()   { return this.def.dmg * Math.pow(LEVEL_MULT.dmg, this.level - 1); }
  get range() { return this.def.range * Math.pow(LEVEL_MULT.range, this.level - 1); }
  get rate()  { return this.def.rate * Math.pow(LEVEL_MULT.rate, this.level - 1); }
  get nextUpgradeCost() {
    return this.level < MAX_LEVEL ? upgradeCost(this.def.cost, this.level) : null;
  }
  get sellValue() { return Math.round(this.invested * 0.7); }

  setLevelVisual() {
    // 升级提升耐久上限，并恢复满血
    this.maxHp = Math.round(this.def.hp * (1 + (this.level - 1) * 0.35));
    this.hp = this.maxHp;
    // 格子上方的等级徽章（数字牌）
    this.updateLevelBadge();
    // 等级用底座上的小星星表示
    for (const s of this.mesh.userData.stars || []) this.mesh.remove(s);
    const stars = [];
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffd740, emissive: 0xffc400, emissiveIntensity: 0.8,
    });
    for (let i = 0; i < this.level; i++) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), starMat);
      const ang = (i / MAX_LEVEL) * Math.PI * 2 - Math.PI / 2;
      star.position.set(Math.cos(ang) * 0.55, 0.45, Math.sin(ang) * 0.55);
      stars.push(star);
      this.mesh.add(star);
    }
    this.mesh.userData.stars = stars;
    // 更新射程圈
    this.rangeRing.geometry.dispose();
    this.rangeRing.geometry = new THREE.RingGeometry(this.range - 0.06, this.range, 48);
  }

  // 格子上方浮动显示建筑等级
  updateLevelBadge() {
    if (this.levelSprite) {
      this.mesh.remove(this.levelSprite);
      this.levelSprite.material.map.dispose();
      this.levelSprite.material.dispose();
    }
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const ctx = cv.getContext('2d');
    // 圆形底牌
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 18, 28, 0.82)';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = this.level >= MAX_LEVEL ? '#ffd740' : 'rgba(255, 255, 255, 0.75)';
    ctx.stroke();
    // 等级数字
    ctx.fillStyle = this.level >= MAX_LEVEL ? '#ffd740' : '#ffffff';
    ctx.font = '900 64px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(this.level), 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false,
    }));
    sp.scale.set(1.15, 1.15, 1);
    sp.position.y = 2.2;
    sp.renderOrder = 20;
    this.mesh.add(sp);
    this.levelSprite = sp;
  }

  // 耐久分档颜色 + 修理信息
  get band() {
    const r = this.hp / this.maxHp;
    if (r < HP_BANDS.red) return { key: 'red', color: 0xff5252, name: '危急' };
    if (r < HP_BANDS.green) return { key: 'yellow', color: 0xffd740, name: '预警' };
    return { key: 'green', color: 0x76ff03, name: '健康' };
  }

  // 下一次修理：仅满级塔可修，修到变色临界点为止（绿色=无需修理）
  get repairInfo() {
    if (this.level < MAX_LEVEL) return null; // 只有满级建筑可以维修
    const r = this.hp / this.maxHp;
    if (r >= HP_BANDS.green) return null;
    const targetRatio = r < HP_BANDS.red ? HP_BANDS.red : HP_BANDS.green;
    const targetHp = Math.ceil(this.maxHp * targetRatio);
    const missing = targetHp - this.hp;
    const cost = Math.max(5, Math.ceil(missing * 0.5 / 5) * 5);
    return { targetHp, cost, toBand: r < HP_BANDS.red ? '黄色' : '绿色' };
  }

  repair() {
    const info = this.repairInfo;
    if (!info) return false;
    this.hp = info.targetHp;
    return true;
  }

  // Boss 奖励加成（rewardMult 由 game 维护）
  get effRange() { return this.range * (this.game?.rewardMult?.range ?? 1); }
  get effRate() { return this.rate * (this.game?.rewardMult?.rate ?? 1); }

  // 返回射程内的目标：默认选走得最远的敌人；strongest 模式锁定最强敌人（加特林）
  findTarget(enemies) {
    const range = this.effRange;
    const strongest = this.def.targetMode === 'strongest';
    let best = null;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.mesh.position.x - this.x;
      const dz = e.mesh.position.z - this.z;
      if (dx * dx + dz * dz > range * range) continue;
      if (!best) { best = e; continue; }
      if (strongest) {
        if (e.maxHp > best.maxHp || (e.maxHp === best.maxHp && e.hp > best.hp)) best = e;
      } else if (e.dist > best.dist) {
        best = e;
      }
    }
    return best;
  }

  update(dt, now, enemies, game) {
    this.cooldown -= dt;
    const turret = this.mesh.userData.turret;

    // 超级加农炮：充能环旋转；开火时对一条直线上的所有敌人造成伤害
    if (this.def.kind === 'cannon') {
      if (turret.userData.chargeRing) turret.userData.chargeRing.rotation.z += dt * 3;
      if (this.cooldown <= 0) {
        const target = this.findTarget(enemies);
        if (target) {
          this.cooldown = 1 / this.effRate;
          const dx = target.mesh.position.x - this.x;
          const dz = target.mesh.position.z - this.z;
          const len = Math.hypot(dx, dz);
          const ux = dx / len, uz = dz / len;
          const beamLen = this.effRange;
          const beam = new THREE.Mesh(
            new THREE.BoxGeometry(this.def.beamWidth, 0.3, beamLen),
            new THREE.MeshBasicMaterial({ color: this.def.color, transparent: true, opacity: 0.75 })
          );
          beam.position.set(this.x + ux * beamLen / 2, 0.8, this.z + uz * beamLen / 2);
          beam.rotation.y = Math.atan2(ux, uz);
          game.scene.add(beam);
          this.beams.push({ mesh: beam, age: 0, life: 0.35 });
          game.effects.burst(new THREE.Vector3(this.x + ux * 1.2, 0.8, this.z + uz * 1.2), this.def.color, 8, 3, 0.3);
          game.audio.explode();
          // 直线伤害：光束走廊内全部敌人
          for (const e of enemies) {
            if (!e.alive) continue;
            const vx = e.mesh.position.x - this.x;
            const vz = e.mesh.position.z - this.z;
            const proj = vx * ux + vz * uz;
            if (proj < 0.5 || proj > beamLen) continue;
            if (Math.abs(vx * uz - vz * ux) <= this.def.beamWidth / 2 + 0.4) {
              if (e.takeDamage(this.dmg)) game.onEnemyKilled(e, this);
              game.effects.burst(e.mesh.position.clone().setY(0.8), this.def.color, 4, 2, 0.3);
            }
          }
          if (game.selectedTower === this) game.showTowerPanel();
        }
      }
      // 光束衰减
      for (let i = this.beams.length - 1; i >= 0; i--) {
        const b = this.beams[i];
        b.age += dt;
        b.mesh.material.opacity = 0.75 * Math.max(0, 1 - b.age / b.life);
        if (b.age >= b.life) {
          game.scene.remove(b.mesh);
          b.mesh.geometry.dispose();
          b.mesh.material.dispose();
          this.beams.splice(i, 1);
        }
      }
      return;
    }

    // 五角星：五向激光，光束扫到的防御塔被治疗
    if (this.def.kind === 'penta') {
      if (this.cooldown <= 0) {
        this.cooldown = 1 / this.rate;
        this.beamAngle += 0.4; // 每次发射整体旋转
        const healed = new Set();
        for (let i = 0; i < 5; i++) {
          const ang = this.beamAngle + (i * Math.PI * 2) / 5;
          const dx = Math.cos(ang), dz = Math.sin(ang);
          // 光束视觉：细长条
          const len = this.effRange;
          const beam = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.07, len),
            new THREE.MeshBasicMaterial({ color: 0x69f0ae, transparent: true, opacity: 0.85 })
          );
          beam.position.set(this.x + dx * len / 2, 0.9, this.z + dz * len / 2);
          beam.rotation.y = Math.atan2(dx, dz);
          game.scene.add(beam);
          this.beams.push({ mesh: beam, age: 0, life: 0.3 });
          // 治疗：光束走廊内的塔（含自身以外的所有受损塔）
          for (const t of game.towers) {
            if (t === this || t.dead || t.hp >= t.maxHp || healed.has(t.id)) continue;
            const vx = t.mesh.position.x - this.x;
            const vz = t.mesh.position.z - this.z;
            const proj = vx * dx + vz * dz;
            if (proj < 0.5 || proj > this.effRange) continue;
            if (Math.abs(vx * dz - vz * dx) <= 0.9) {
              t.hp = Math.min(t.maxHp, t.hp + this.dmg);
              healed.add(t.id);
              game.effects.burst(t.mesh.position.clone().setY(1), 0x69f0ae, 4, 1.8, 0.35);
              if (game.selectedTower === t) game.showTowerPanel();
            }
          }
        }
        game.audio.repair();
      }
      // 光束衰减
      for (let i = this.beams.length - 1; i >= 0; i--) {
        const b = this.beams[i];
        b.age += dt;
        b.mesh.material.opacity = 0.85 * Math.max(0, 1 - b.age / b.life);
        if (b.age >= b.life) {
          game.scene.remove(b.mesh);
          b.mesh.geometry.dispose();
          b.mesh.material.dispose();
          this.beams.splice(i, 1);
        }
      }
      return;
    }

    // 医疗系：治疗范围内受损最严重的防御塔（伤害值换成医疗值）
    if (this.def.kind === 'medic' || this.def.kind === 'medgun') {
      if (this.mesh.userData.medicHalo) this.mesh.userData.medicHalo.rotation.z += dt * 1.5;
      if (this.cooldown <= 0) {
        let target = null;
        let worst = 1;
        for (const t of game.towers) {
          if (t === this || t.dead || t.hp >= t.maxHp) continue;
          const dx = t.mesh.position.x - this.x;
          const dz = t.mesh.position.z - this.z;
          if (dx * dx + dz * dz > this.range * this.range) continue;
          const r = t.hp / t.maxHp;
          if (r < worst) { worst = r; target = t; }
        }
        if (target) {
          this.cooldown = 1 / this.rate;
          target.hp = Math.min(target.maxHp, target.hp + this.dmg);
          game.effects.burst(target.mesh.position.clone().setY(1), 0x69f0ae, 6, 2, 0.4);
          game.effects.ring(target.mesh.position.clone().setY(0.2), 0x69f0ae, 1.2, 0.35);
          game.audio.repair();
          if (game.selectedTower === target || game.selectedTower === this) game.showTowerPanel();
        }
      }
      return;
    }
    const slipped = this.slipUntil > now;

    // 射程圈随 Boss 奖励缩放
    this.rangeRing.scale.setScalar(this.effRange / this.range);

    // 滑倒状态：塔底显示香蕉皮
    if (slipped) {
      if (!this.peelMesh) {
        const peel = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xffee58, roughness: 0.5 })
        );
        peel.scale.set(1, 0.25, 1);
        peel.position.set(0.45, 0.12, 0.45);
        this.mesh.add(peel);
        this.peelMesh = peel;
      }
      this.peelMesh.visible = true;
      this.peelMesh.rotation.y += dt * 2;
    } else if (this.peelMesh) {
      this.peelMesh.visible = false;
    }

    // 冰冻炮的顶部冰晶持续旋转
    if (turret.userData.crystal) turret.userData.crystal.rotation.y += dt * 2.2;

    // 耐久条（受损时显示，颜色按红/黄/绿分档）
    if (this.hp < this.maxHp) {
      const ratio = Math.max(0, this.hp / this.maxHp);
      this.bar.visible = true;
      this.barFg.scale.x = Math.max(ratio, 0.001);
      this.barFg.position.x = -(1.06 * (1 - ratio)) / 2;
      this.barFg.material.color.setHex(this.band.color);
      this.bar.quaternion.copy(game.camera.quaternion);
    } else {
      this.bar.visible = false;
    }

    if (this.def.kind === 'frost') {
      // 冰霜塔：范围脉冲
      if (turret.userData.crystal) {
        turret.userData.crystal.rotation.y += dt * 2;
        turret.userData.crystal.position.y = 0.35 + Math.sin(now * 3) * 0.08;
        turret.userData.halo.rotation.z += dt * 1.5;
      }
      if (this.cooldown <= 0) {
        const targets = [];
        for (const e of enemies) {
          if (!e.alive) continue;
          const dx = e.mesh.position.x - this.x;
          const dz = e.mesh.position.z - this.z;
          if (dx * dx + dz * dz <= this.effRange * this.effRange) targets.push(e);
        }
        if (targets.length > 0) {
          this.cooldown = (1 / this.effRate) * (slipped ? 2 : 1);
          for (const e of targets) {
            if (e.takeDamage(this.dmg)) game.onEnemyKilled(e, this);
            e.applySlow(this.def.slow, this.def.slowTime, now);
          }
          game.effects.ring(new THREE.Vector3(this.x, 0.25, this.z), this.def.color, this.range, 0.5);
          game.audio.pulse();
        }
      }
      return;
    }

    // 瞄准 + 开火
    const target = this.findTarget(enemies);
    if (target) {
      const dx = target.mesh.position.x - this.x;
      const dz = target.mesh.position.z - this.z;
      const yaw = Math.atan2(dx, dz);
      // 平滑转向
      let diff = yaw - this.aimYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.aimYaw += diff * Math.min(1, dt * 10);
      turret.rotation.y = this.aimYaw;
      if (this.cooldown <= 0) {
        this.cooldown = (1 / this.effRate) * (slipped ? 2 : 1);
        const muzzle = new THREE.Vector3(0, 0.55, 0.7).applyAxisAngle(
          new THREE.Vector3(0, 1, 0), this.aimYaw
        ).add(this.mesh.position);
        game.spawnProjectile(this, target, muzzle);
      }
    }
  }

  dispose(scene) {
    for (const b of this.beams || []) {
      scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    }
    scene.remove(this.mesh);
    scene.remove(this.rangeRing);
    this.mesh.traverse((o) => {
      if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
    });
    this.rangeRing.geometry.dispose();
    this.rangeRing.material.dispose();
  }
}
