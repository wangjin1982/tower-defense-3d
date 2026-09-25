// ===== 子弹 / 导弹 =====
import * as THREE from 'three';

const bulletGeo = new THREE.SphereGeometry(0.09, 8, 8);

// 手雷（攻城兽投掷物，资产共享）
const grenadeGeo = new THREE.SphereGeometry(0.14, 10, 10);
const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.6, metalness: 0.3 });

// 导弹模型（参考极速摩托：银色弹体 + 红色锥形弹头 + 尾翼），资产全局共享
const rocketParts = (() => {
  const body = new THREE.CylinderGeometry(0.13, 0.13, 0.55, 10);
  const nose = new THREE.ConeGeometry(0.13, 0.28, 10);
  const fin = new THREE.BoxGeometry(0.03, 0.16, 0.14);
  const flame = new THREE.SphereGeometry(0.08, 8, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcfd6e4, roughness: 0.35, metalness: 0.5 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xe23a3a, roughness: 0.4 });
  const iceMat = new THREE.MeshStandardMaterial({ color: 0x4dd0e1, roughness: 0.4 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffab40, transparent: true, opacity: 0.9 });
  const iceFlameMat = new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.9 });
  return { body, nose, fin, flame, bodyMat, redMat, iceMat, flameMat, iceFlameMat };
})();

function buildRocketMesh(icy = false) {
  const g = new THREE.Group();
  const headMat = icy ? rocketParts.iceMat : rocketParts.redMat;
  const b = new THREE.Mesh(rocketParts.body, rocketParts.bodyMat);
  b.rotation.x = Math.PI / 2;
  g.add(b);
  const n = new THREE.Mesh(rocketParts.nose, headMat);
  n.rotation.x = Math.PI / 2;
  n.position.z = 0.4;
  g.add(n);
  for (const s of [-1, 1]) for (const y of [0.09, -0.09]) {
    const f = new THREE.Mesh(rocketParts.fin, headMat);
    f.position.set(s * 0.11, y, -0.22);
    g.add(f);
  }
  // 尾焰（每发独立材质，闪烁用）
  const flame = new THREE.Mesh(rocketParts.flame, (icy ? rocketParts.iceFlameMat : rocketParts.flameMat).clone());
  flame.position.z = -0.34;
  g.add(flame);
  g.userData.flame = flame;
  return g;
}

export class Projectile {
  constructor(tower, target, muzzle) {
    this.tower = tower;
    this.target = target;
    this.dmg = tower.dmg;
    this.kind = tower.def.kind;
    this.splash = tower.def.splash || 0;
    this.speed = tower.def.launchSpeed || tower.def.bulletSpeed || 18;
    this.cruise = tower.def.bulletSpeed || 18;
    this.accel = tower.def.accel || 0;
    this.lastPos = target.mesh.position.clone();
    this.alive = true;

    const color = tower.def.color;
    if (this.kind === 'rocket' || this.kind === 'frostrkt' || this.kind === 'flak') {
      this.mesh = buildRocketMesh(this.kind === 'frostrkt');
    } else {
      this.mesh = new THREE.Mesh(bulletGeo, new THREE.MeshBasicMaterial({ color }));
    }
    this.mesh.position.copy(muzzle);
    this.pos = this.mesh.position;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.trailTimer = 0;
  }

  update(dt, game) {
    if (!this.alive) return;
    // 目标存活则追踪实时位置
    if (this.target && this.target.alive) {
      this.lastPos.copy(this.target.mesh.position);
    }
    const to = this.tmp.copy(this.lastPos).sub(this.pos);
    const dist = to.length();

    if (this.kind === 'rocket' || this.kind === 'frostrkt' || this.kind === 'flak') {
      // 导弹：慢速出膛 → 逐渐加速到巡航速度
      this.speed = Math.min(this.cruise, this.speed + this.accel * dt);
      const flame = this.mesh.userData.flame;
      if (flame) {
        flame.scale.setScalar(0.7 + Math.random() * 0.6);
        flame.material.opacity = 0.6 + Math.random() * 0.4;
      }
      // 灰烟尾迹（从尾部喷出，几乎不受重力）+ 偶尔火星
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.035;
        to.normalize();
        const tail = this.tmp2.copy(this.pos).addScaledVector(to, -0.45);
        game.effects.burst(tail, this.kind === 'frostrkt' ? 0xb2ebf2 : 0x9aa3b2, 1, 0.7, 0.55, 0.4);
        if (Math.random() < 0.35) {
          game.effects.burst(tail, this.kind === 'frostrkt' ? 0x4dd0e1 : 0xff8a65, 1, 1.2, 0.22, 0);
        }
      }
    }

    const step = this.speed * dt;
    if (dist <= step || dist < 0.001) {
      // 命中
      this.alive = false;
      // 溅射类：火箭 + 所有合体炮台（溅射覆盖三格）
      const splashKind = ['rocket', 'cryo', 'frostrkt', 'flak', 'rail', 'frostsniper'].includes(this.kind);
      if (splashKind) {
        // 冻结系：冰冻炮 / 极寒火箭 / 冰晶狙击
        const freezes = this.kind === 'cryo' || this.kind === 'frostrkt' || this.kind === 'frostsniper';
        const ringColor = this.tower.def.color;
        game.effects.explosion(this.pos.clone(), this.splash);
        if (freezes) game.effects.ring(this.pos.clone(), ringColor, this.splash * 1.3, 0.4);
        game.audio.explode();
        for (const e of game.enemies) {
          if (!e.alive) continue;
          const d = e.mesh.position.distanceTo(this.pos);
          if (d <= this.splash) {
            const falloff = 1 - (d / this.splash) * 0.5;
            if (e.takeDamage(this.dmg * falloff)) game.onEnemyKilled(e, this.tower);
            // 冻结：冰冻系炮台溅射范围内的敌人被减速
            if (freezes) e.applySlow(this.tower.def.slow, this.tower.def.slowTime, game.now);
          }
        }
      } else {
        if (this.target && this.target.alive) {
          game.effects.burst(this.pos, this.tower.def.color, 5, 2.2, 0.3);
          game.audio.hit();
          if (this.target.takeDamage(this.dmg)) game.onEnemyKilled(this.target, this.tower);
        }
      }
      return;
    }
    to.normalize();
    this.pos.addScaledVector(to, step);
    this.mesh.lookAt(this.lastPos);
  }

  dispose(scene) {
    scene.remove(this.mesh);
    if (this.kind === 'rocket' || this.kind === 'frostrkt' || this.kind === 'flak') {
      // 导弹几何体/材质为共享资产，只销毁独立克隆的尾焰材质
      const flame = this.mesh.userData.flame;
      if (flame) flame.material.dispose();
    } else {
      this.mesh.material.dispose();
    }
  }
}

// ===== 香蕉车的香蕉皮：抛物线飞向防御塔，落地让塔滑倒（攻速减半） =====
const peelGeo = new THREE.SphereGeometry(0.15, 8, 8);
const peelMat = new THREE.MeshStandardMaterial({ color: 0xffee58, roughness: 0.5 });

export class Peel {
  constructor(from, tower, def) {
    this.tower = tower;
    this.def = def; // { rate, time, cd, range }
    this.from = from.clone();
    this.to = tower.mesh.position.clone();
    this.to.y = 0.35;
    this.t = 0;
    this.flight = 0.8;
    this.alive = true;
    this.mesh = new THREE.Mesh(peelGeo, peelMat);
    this.mesh.scale.y = 0.55;
  }

  update(dt, game) {
    this.t += dt;
    const k = Math.min(1, this.t / this.flight);
    this.mesh.position.lerpVectors(this.from, this.to, k);
    this.mesh.position.y = 0.4 + Math.sin(k * Math.PI) * 1.4;
    this.mesh.rotation.z += dt * 9;
    if (k >= 1) {
      this.alive = false;
      const tower = this.tower;
      if (!tower.dead) {
        tower.slipUntil = game.now + this.def.time;
        game.effects.ring(this.mesh.position.clone().setY(0.15), 0xffee58, 1.2, 0.4);
        game.effects.burst(this.mesh.position.clone().setY(0.3), 0xffee58, 8, 2, 0.5, 3);
        game.audio.slip();
        if (game.selectedTower === tower) game.showTowerPanel();
      }
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}

// ===== 攻城兽的手雷：抛物线飞行，落地对塔造成伤害（小范围溅射） =====
export class Grenade {
  constructor(from, tower, dmg) {
    this.tower = tower;
    this.dmg = dmg;
    this.from = from.clone();
    this.to = tower.mesh.position.clone();
    this.to.y = 0.5;
    this.t = 0;
    this.flight = 0.9;
    this.alive = true;
    this.mesh = new THREE.Mesh(grenadeGeo, grenadeMat);
    this.mesh.castShadow = false;
  }

  update(dt, game) {
    this.t += dt;
    const k = Math.min(1, this.t / this.flight);
    this.mesh.position.lerpVectors(this.from, this.to, k);
    this.mesh.position.y = 0.5 + Math.sin(k * Math.PI) * 1.8; // 抛物线弧顶
    if (k >= 1) {
      this.alive = false;
      game.effects.explosion(this.mesh.position.clone(), 1.3);
      game.audio.explode();
      game.damageTower(this.tower, this.dmg);
      // 溅射波及邻近塔（50% 伤害）
      for (const t of game.towers) {
        if (t === this.tower || t.dead) continue;
        const d = t.mesh.position.distanceTo(this.mesh.position);
        if (d <= 1.9) game.damageTower(t, this.dmg * 0.5);
      }
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}
