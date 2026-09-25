// ===== 输入：轨道相机 + 格子拾取 =====
import * as THREE from 'three';
import { worldToCell } from './map.js?v=1.1';

export class InputController {
  constructor(dom, camera, handlers) {
    this.dom = dom;
    this.camera = camera;
    this.handlers = handlers; // { onLeftClick(cell), onHover(cell), onDrag() }

    // 轨道参数
    this.azimuth = Math.PI * 0.0;
    this.polar = 0.95;
    this.radius = 26;
    this.target = new THREE.Vector3(0, 0, 0);
    this.updateCamera();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragging = false;
    this.moved = false;
    this.lastX = 0;
    this.lastY = 0;
    this.hoverCell = null;

    dom.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    dom.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('pointerleave', () => {
      if (!this.dragging) {
        this.hoverCell = null;
        this.handlers.onHover(null);
      }
    });
  }

  updateCamera() {
    const { azimuth, polar, radius, target } = this;
    const sinP = Math.sin(polar);
    this.camera.position.set(
      target.x + radius * sinP * Math.sin(azimuth),
      target.y + radius * Math.cos(polar),
      target.z + radius * sinP * Math.cos(azimuth)
    );
    this.camera.lookAt(target);
  }

  pickCell(e) {
    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const ray = this.raycaster.ray;
    // 与 y=0 平面求交
    if (Math.abs(ray.direction.y) < 1e-6) return null;
    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) return null;
    const p = ray.origin.clone().addScaledVector(ray.direction, t);
    return worldToCell(p.x, p.z);
  }

  onDown(e) {
    if (e.target !== this.dom) return;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.moved = false;
    this.dragging = true;
  }

  onMove(e) {
    if (this.dragging) {
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      if (!this.moved && Math.hypot(dx, dy) > 4) this.moved = true;
      if (this.moved) {
        this.azimuth -= dx * 0.006;
        this.polar = Math.min(1.35, Math.max(0.3, this.polar - dy * 0.005));
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.updateCamera();
        this.handlers.onDrag?.();
        return;
      }
    }
    if (e.target === this.dom) {
      const cell = this.pickCell(e);
      if (cell?.col !== this.hoverCell?.col || cell?.row !== this.hoverCell?.row) {
        this.hoverCell = cell;
        this.handlers.onHover(cell);
      }
    }
  }

  onUp(e) {
    const wasDragging = this.dragging;
    this.dragging = false;
    if (!wasDragging || e.button !== 0) return;
    if (this.moved || e.target !== this.dom) return;
    const cell = this.pickCell(e);
    if (cell) this.handlers.onLeftClick(cell);
  }

  onWheel(e) {
    e.preventDefault();
    this.radius = Math.min(46, Math.max(9, this.radius + e.deltaY * 0.02));
    this.updateCamera();
  }
}
