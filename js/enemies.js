// ===== 敌人 =====
import * as THREE from 'three';
import { ENEMIES, TILE } from './config.js?v=2.6';
import { pathWaypoints } from './map.js?v=2.6';

// 全局共享：路径长度与累计里程（所有敌人同一条路）
const WPS = pathWaypoints();
const SEG_LEN = [];
const CUM = [0];
for (let i = 0; i < WPS.length - 1; i++) {
  SEG_LEN.push(WPS[i].distanceTo(WPS[i + 1]));
  CUM.push(CUM[i] + SEG_LEN[i]);
}
export const PATH_TOTAL = CUM[CUM.length - 1];

function posAt(dist, out) {
  const d = Math.max(0, Math.min(PATH_TOTAL, dist));
  let i = 0;
  while (i < SEG_LEN.length - 1 && CUM[i + 1] < d) i++;
  const t = SEG_LEN[i] > 0 ? (d - CUM[i]) / SEG_LEN[i] : 0;
  out.lerpVectors(WPS[i], WPS[i + 1], t);
  return out;
}
function dirAt(dist, out) {
  const d = Math.max(0, Math.min(PATH_TOTAL, dist));
  let i = 0;
  while (i < SEG_LEN.length - 1 && CUM[i + 1] < d) i++;
  out.subVectors(WPS[i + 1], WPS[i]).normalize();
  return out;
}

let nextId = 1;

function buildBody(key, def) {
  const mat = new THREE.MeshStandardMaterial({
    color: def.color, roughness: 0.45, metalness: 0.25,
    emissive: def.color, emissiveIntensity: 0.15,
  });
  const g = new THREE.Group();
  const s = def.size;
  if (key === 'normal') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 1.4, s * 1.6, s * 1.4), mat);
    g.add(body);
  } else if (key === 'fast') {
    const body = new THREE.Mesh(new THREE.ConeGeometry(s * 0.9, s * 2.4, 6), mat);
    body.rotation.z = Math.PI / 2;
    g.add(body);
  } else if (key === 'tank') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 1.8, s * 1.2, s * 1.5), mat);
    g.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.55, s * 0.7, s * 0.8, 6), mat);
    top.position.y = s;
    g.add(top);
  } else if (key === 'moto' || key === 'car' || key === 'tankv') {
    // 载具：车身 + 会转的车轮（摩托/汽车/坦克共用骨架，尺寸配色随定义）
    const dark = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.7 });
    const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10);
    const wheels = [];
    const wheelPos = key === 'moto'
      ? [[0, 0.18, s * 1.1], [0, 0.18, -s * 1.1]]
      : key === 'car'
        ? [[-s * 0.8, 0.18, s * 0.8], [s * 0.8, 0.18, s * 0.8], [-s * 0.8, 0.18, -s * 0.8], [s * 0.8, 0.18, -s * 0.8]]
        : [[-s * 0.85, 0.22, s * 0.9], [s * 0.85, 0.22, s * 0.9], [-s * 0.85, 0.22, -s * 0.9], [s * 0.85, 0.22, -s * 0.9]];
    const wr = key === 'tankv' ? 0.26 : 0.18;
    for (const [wx, wy, wz] of wheelPos) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, 0.12, 10), dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      g.add(w);
      wheels.push(w);
    }
    g.userData.wheels = wheels;

    if (key === 'moto') {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(s * 0.9, s * 0.7, s * 0.9), mat);
      seat.position.y = s * 0.9;
      g.add(seat);
      const rider = new THREE.Mesh(new THREE.SphereGeometry(s * 0.45, 8, 8), mat);
      rider.position.set(0, s * 1.6, -s * 0.2);
      g.add(rider);
      // 后座手雷包
      const bag = new THREE.Mesh(new THREE.BoxGeometry(s * 0.6, s * 0.5, s * 0.5),
        new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 }));
      bag.position.set(0, s * 1.1, s * 0.7);
      g.add(bag);
    } else if (key === 'car') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(s * 1.7, s * 1.0, s * 2.2), mat);
      body.position.y = s * 0.6;
      g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(s * 1.4, s * 0.8, s * 1.1),
        new THREE.MeshStandardMaterial({ color: 0xfff9c4, roughness: 0.4 }));
      cabin.position.set(0, s * 1.4, -s * 0.2);
      g.add(cabin);
      // 车顶香蕉堆
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xffee58, roughness: 0.5 }));
        b.scale.y = 0.6;
        b.position.set((i - 1) * 0.22, s * 1.95, -s * 0.2);
        g.add(b);
      }
    } else {
      // 攻城坦克：低矮车体 + 炮塔与炮管
      const hull = new THREE.Mesh(new THREE.BoxGeometry(s * 1.9, s * 0.9, s * 2.3), mat);
      hull.position.y = s * 0.8;
      g.add(hull);
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.6, s * 0.7, s * 0.6, 10), mat);
      turret.position.y = s * 1.5;
      g.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.5, roughness: 0.4 }));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, s * 1.55, s * 0.9);
      g.add(barrel);
    }
  } else if (key === 'super') {
    // 超级怪兽：双角红眼巨兽 + 大棒
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 2.1, s * 2.0, s * 1.8), mat);
    g.add(body);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5 });
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 6), hornMat);
      horn.position.set(sx * s * 0.7, s * 1.25, 0);
      horn.rotation.z = -sx * 0.45;
      g.add(horn);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff1744 })
      );
      eye.position.set(sx * 0.18, s * 0.45, s * 0.95);
      g.add(eye);
    }
    const wood = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85 });
    const club = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.25, 8), wood);
    club.add(handle);
    const clubHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.56), wood);
    clubHead.position.y = 0.7;
    club.add(clubHead);
    club.position.set(s * 1.25, s * 1.0, 0.15);
    club.rotation.z = 0.45;
    g.add(club);
    g.userData.club = club;
  } else if (key === 'brute') {
    // 攻城兽：大身板 + 手里拎着大棒
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 1.9, s * 1.9, s * 1.6), mat);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.55, 8, 8), mat);
    head.position.y = s * 1.25;
    g.add(head);
    const wood = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85 });
    const club = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8), wood);
    club.add(handle);
    const clubHead = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.5), wood);
    clubHead.position.y = 0.62;
    club.add(clubHead);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.04, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x546e7a, metalness: 0.5, roughness: 0.4 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.35;
    club.add(band);
    club.position.set(s * 1.15, s * 0.9, 0.15);
    club.rotation.z = 0.45;
    g.add(club);
    g.userData.club = club;
  } else {
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(s), mat);
    g.add(body);
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(s * 1.2, s * 0.12, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffc400, emissiveIntensity: 0.6 })
    );
    crown.rotation.x = Math.PI / 2;
    g.add(crown);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export class Enemy {
  constructor(typeKey, hpMul, scene, bountyMul = 1, opts = {}) {
    const def = ENEMIES[typeKey];
    this.id = nextId++;
    this.def = def;
    this.elite = !!opts.elite;
    this.maxHp = Math.round(def.hp * hpMul * (this.elite ? 2.2 : 1));
    this.hp = this.maxHp;
    this.baseSpeed = def.speed * (opts.speedMul || 1) * (this.elite ? 0.95 : 1);
    this.bounty = Math.round(def.bounty * bountyMul * (this.elite ? 2.5 : 1));
    this.lifeCost = def.lifeCost + (this.elite ? 1 : 0);
    this.armor = Math.round(((def.armor || 0) * (opts.armorMul || 0) + (opts.armorBonus || 0))
      * (this.elite ? 1.5 : 1));
    this.dist = opts.startDist || 0;
    this.alive = true;
    this.reachedEnd = false;
    this.slowUntil = 0;
    this.slowFactor = 0;
    this.deathTime = -1; // 首次 update 时用游戏时钟记录

    this.mesh = buildBody(typeKey, def);
    // 精英怪：体型更大 + 旋转金环标识
    if (this.elite) {
      this.mesh.scale.setScalar(1.18);
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(def.size * 1.35, 0.05, 8, 28),
        new THREE.MeshStandardMaterial({
          color: 0xffd740, emissive: 0xffc400, emissiveIntensity: 0.9,
        })
      );
      halo.position.y = def.size * 1.1;
      this.mesh.add(halo);
      this.eliteHalo = halo;
    }
    scene.add(this.mesh);

    // 披甲视觉：整体变暗、金属感增强
    if (this.armor > 0) {
      this.mesh.traverse((o) => {
        if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
          o.material.color.multiplyScalar(0.68);
          o.material.metalness = Math.min(1, o.material.metalness + 0.35);
          o.material.roughness = Math.max(0.2, o.material.roughness - 0.15);
        }
      });
    }

    // 血条（两张始终面向相机的薄片）
    const bw = def.size * 2.2;
    this.bar = new THREE.Group();
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })
    );
    this.barFg = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x76ff03, depthWrite: false })
    );
    this.barFg.position.z = 0.01;
    this.bar.add(bg, this.barFg);
    this.bar.renderOrder = 10;
    this.bar.position.y = def.size * 1.6 + 0.45;
    this.barWidth = bw;
    this.mesh.add(this.bar);

    this.tmpV = new THREE.Vector3();
    this.tmpD = new THREE.Vector3();

    // 攻城兽状态
    this.club = this.mesh.userData.club || null;
    this.clubCd = 1.5;
    this.grenadeCd = 3;
    this.clubSwingT = 0;

    // 超级怪兽入场：前滚三个格子（6 世界单位）后恢复正常行进
    this.rollRemaining = def.key === 'super' ? 3 * TILE : 0;
    // 香蕉车：扔皮冷却
    this.peelCd = 2.5;
  }

  get currentSpeed() {
    if (this.slowUntil > 0 && this.slowFactor > 0) {
      return this.baseSpeed * (1 - this.slowFactor);
    }
    return this.baseSpeed;
  }

  applySlow(factor, duration, now) {
    // 只保留最强的减速
    if (factor >= this.slowFactor || now >= this.slowUntil) {
      this.slowFactor = factor;
      this.slowUntil = now + duration;
    }
  }

  takeDamage(dmg) {
    if (!this.alive) return false;
    // 护甲：每次受击固定减免，至少造成 1 点
    this.hp -= Math.max(1, dmg - this.armor);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  update(dt, now, camera, game) {
    if (!this.alive) {
      if (this.deathTime < 0) this.deathTime = now;
      // 死亡缩小消失动画
      const k = Math.max(0, 1 - (now - this.deathTime) / 0.35);
      this.mesh.scale.setScalar(k);
      return;
    }
    if ((this.def.towerDmg || this.def.peel) && game) this.updateSiege(dt, game);
    // 载具车轮滚动
    const wheels = this.mesh.userData.wheels;
    if (wheels) for (const w of wheels) w.rotation.x += dt * this.currentSpeed * 3;
    if (this.rollRemaining > 0) {
      // 入场翻滚：高速前冲 + 前滚翻动画 + 扬尘
      const step = Math.min(this.rollRemaining, Math.max(8, this.currentSpeed) * dt);
      this.rollRemaining -= step;
      this.dist += step;
      const body = this.mesh.children[0];
      if (body) body.rotation.x -= dt * 11;
      if (game && Math.random() < 0.5) {
        game.effects.burst(this.mesh.position.clone().setY(0.15), 0x90a4ae, 1, 1.2, 0.4, 2);
      }
      if (this.rollRemaining <= 0 && game) {
        // 落地：闷响 + 冲击环
        game.effects.ring(this.mesh.position.clone().setY(0.2), 0xc2185b, 1.8, 0.4);
        game.audio.club();
      }
    } else {
      this.dist += this.currentSpeed * dt;
    }
    if (this.dist >= PATH_TOTAL) {
      this.reachedEnd = true;
      this.alive = false;
      return;
    }
    posAt(this.dist, this.tmpV);
    this.mesh.position.set(this.tmpV.x, 0.35 + Math.sin(now * 6 + this.id) * 0.06, this.tmpV.z);
    dirAt(this.dist, this.tmpD);
    this.mesh.rotation.y = Math.atan2(this.tmpD.x, this.tmpD.z);
    if (this.eliteHalo) {
      this.eliteHalo.rotation.x += dt * 2.5;
      this.eliteHalo.rotation.z += dt * 1.2;
    }
    if (this.mesh.children[0] && this.def.key !== 'brute' && this.def.key !== 'super') {
      this.mesh.children[0].rotation.x += dt * 2;
    }
    // 减速变色提示
    const slowed = this.slowUntil > now;
    this.mesh.traverse((o) => {
      if (o.isMesh && o.material.emissive) {
        o.material.emissiveIntensity = slowed ? 0.5 : 0.15;
      }
    });
    // 血条（世界朝向 = 相机；bar 是 mesh 子级，需抵消父级旋转）
    const ratio = this.hp / this.maxHp;
    this.barFg.scale.x = Math.max(ratio, 0.0001);
    this.barFg.position.x = -(this.barWidth * (1 - ratio)) / 2;
    this.barFg.material.color.setHSL(Math.max(ratio, 0) * 0.3, 0.9, 0.5);
    this.bar.quaternion.copy(this.mesh.quaternion).invert().multiply(camera.quaternion);
    this.bar.visible = ratio < 1;
  }

  // 攻城兽/载具：攻击防御塔（大棒近战 + 手雷轰炸 + 香蕉皮滑倒）
  updateSiege(dt, game) {
    const td = this.def.towerDmg || { club: 0, clubCd: 9999, clubRange: 0, grenade: 0, grenadeCd: 9999, grenadeRange: 0 };

    // 挥棒动画
    if (this.clubSwingT > 0 && this.club) {
      this.clubSwingT -= dt;
      const p = 1 - Math.max(0, this.clubSwingT) / 0.45;
      this.club.rotation.x = -1.5 * Math.sin(Math.min(1, p) * Math.PI);
    }

    this.clubCd -= dt;
    this.grenadeCd -= dt;

    // 找最近的防御塔
    let nearest = null;
    let nd = Infinity;
    for (const t of game.towers) {
      if (t.dead) continue;
      const d = t.mesh.position.distanceTo(this.mesh.position);
      if (d < nd) { nd = d; nearest = t; }
    }
    if (!nearest) return;

    // 大棒：贴身抡砸
    if (nd <= td.clubRange && this.clubCd <= 0) {
      this.clubCd = td.clubCd;
      this.clubSwingT = 0.45;
      game.damageTower(nearest, td.club);
      game.audio.club();
      game.effects.burst(nearest.mesh.position.clone().setY(0.8), 0xffcc80, 6, 2.5, 0.35);
    }

    // 手雷：抛物线轰炸（对小范围内所有塔造成伤害）
    if (nd <= td.grenadeRange && nd > td.clubRange && this.grenadeCd <= 0) {
      this.grenadeCd = td.grenadeCd;
      game.spawnGrenade(this, nearest, td.grenade);
    }

    // 香蕉皮：让防御塔滑倒（攻速减半一段时间）
    const peel = this.def.peel;
    if (peel) {
      this.peelCd -= dt;
      if (nd <= peel.range && this.peelCd <= 0) {
        this.peelCd = peel.cd;
        game.spawnPeel(this, nearest, peel);
      }
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material.dispose) o.material.dispose();
      }
    });
  }
}
