// ===== 特效：粒子、爆炸、扩散环 =====
import * as THREE from 'three';

const sparkGeo = new THREE.SphereGeometry(0.06, 6, 6);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.rings = [];
  }

  burst(pos, color, count = 8, speed = 3, life = 0.5, gravity = 8) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const m = new THREE.Mesh(sparkGeo, mat);
      m.position.copy(pos);
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2, Math.random() * 0.9 + 0.3, (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.8));
      this.particles.push({ mesh: m, vel: v, life, age: 0, gravity });
      this.scene.add(m);
    }
  }

  explosion(pos, radius) {
    this.burst(pos, 0xffab40, 14, 4.5, 0.55);
    this.burst(pos, 0xff5252, 10, 3, 0.4);
    this.ring(pos, 0xff7043, radius * 1.2, 0.4);
    // 闪光球
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.4, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe57f, transparent: true, opacity: 0.9 })
    );
    flash.position.copy(pos);
    this.scene.add(flash);
    const t0 = performance.now() / 1000;
    const anim = () => {
      const k = (performance.now() / 1000 - t0) / 0.25;
      if (k >= 1) {
        this.scene.remove(flash);
        flash.geometry.dispose();
        flash.material.dispose();
        return;
      }
      flash.scale.setScalar(1 + k * 1.5);
      flash.material.opacity = 0.9 * (1 - k);
      requestAnimationFrame(anim);
    };
    anim();
  }

  ring(pos, color, maxRadius, life = 0.5) {
    const geo = new THREE.RingGeometry(0.4, 0.55, 40);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, Math.max(pos.y, 0.15), pos.z);
    this.rings.push({ mesh: m, age: 0, life, maxRadius });
    this.scene.add(m);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.05) { p.mesh.position.y = 0.05; p.vel.y *= -0.4; }
      const k = 1 - p.age / p.life;
      p.mesh.material.opacity = k;
      p.mesh.scale.setScalar(0.5 + k);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      const k = r.age / r.life;
      if (k >= 1) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const s = 0.3 + k * (r.maxRadius / 0.5);
      r.mesh.scale.setScalar(s);
      r.mesh.material.opacity = 0.8 * (1 - k);
    }
  }

  clear() {
    for (const p of this.particles) { this.scene.remove(p.mesh); p.mesh.material.dispose(); }
    for (const r of this.rings) { this.scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }
    this.particles = [];
    this.rings = [];
  }
}
