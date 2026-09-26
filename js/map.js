// ===== 地图：格子换算、路径、场景搭建 =====
import * as THREE from 'three';
import { TILE, COLS, ROWS, PATH_CELLS } from './config.js?v=2.3';

const pathSet = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));

export function inBounds(col, row) {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}
export function isPath(col, row) {
  return pathSet.has(`${col},${row}`);
}
export function isBuildable(col, row) {
  return inBounds(col, row) && !isPath(col, row);
}
export function cellToWorld(col, row) {
  return { x: (col - (COLS - 1) / 2) * TILE, z: (row - (ROWS - 1) / 2) * TILE };
}
export function worldToCell(x, z) {
  const col = Math.round(x / TILE + (COLS - 1) / 2);
  const row = Math.round(z / TILE + (ROWS - 1) / 2);
  const w = cellToWorld(col, row);
  // 落点必须在格子中心附近才算命中该格
  if (Math.abs(w.x - x) > TILE / 2 || Math.abs(w.z - z) > TILE / 2) return null;
  return { col, row };
}
// 路径世界坐标路点序列
export function pathWaypoints() {
  return PATH_CELLS.map(([c, r]) => {
    const { x, z } = cellToWorld(c, r);
    return new THREE.Vector3(x, 0, z);
  });
}

// ===== 搭建场景静态物体 =====
export function buildMap(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // 大地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.35;
  ground.receiveShadow = true;
  group.add(ground);

  // 可建造格（棋盘明暗）
  const tileGeo = new THREE.BoxGeometry(TILE * 0.94, 0.3, TILE * 0.94);
  const matA = new THREE.MeshStandardMaterial({ color: 0x25313f, roughness: 0.85 });
  const matB = new THREE.MeshStandardMaterial({ color: 0x2b3948, roughness: 0.85 });
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (isPath(c, r)) continue;
      const { x, z } = cellToWorld(c, r);
      const tile = new THREE.Mesh(tileGeo, (c + r) % 2 === 0 ? matA : matB);
      tile.position.set(x, -0.15, z);
      tile.receiveShadow = true;
      group.add(tile);
    }
  }

  // 路面（更暗、略低）
  const pathGeo = new THREE.BoxGeometry(TILE * 0.98, 0.22, TILE * 0.98);
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x141c29, roughness: 0.6, metalness: 0.2,
  });
  for (const [c, r] of PATH_CELLS) {
    const { x, z } = cellToWorld(c, r);
    const tile = new THREE.Mesh(pathGeo, pathMat);
    tile.position.set(x, -0.19, z);
    tile.receiveShadow = true;
    group.add(tile);
  }

  // 路径中线发光条
  const pts = pathWaypoints().map((p) => new THREE.Vector3(p.x, 0.02, p.z));
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  group.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
    color: 0x37e0ff, transparent: true, opacity: 0.35,
  })));

  // 边界围墙
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 0.9 });
  const wLen = COLS * TILE + 1.2;
  const hLen = ROWS * TILE + 1.2;
  const mkWall = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), wallMat);
    m.position.set(x, 0.05, z);
    m.receiveShadow = true;
    group.add(m);
  };
  mkWall(wLen, 0.6, 0, -hLen / 2);
  mkWall(wLen, 0.6, 0, hLen / 2);
  mkWall(0.6, hLen, -wLen / 2, 0);
  mkWall(0.6, hLen, wLen / 2, 0);

  // 出生传送门（起点）与基地核心（终点）
  const start = pts[0];
  const end = pts[pts.length - 1];

  const gate = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.14, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff1744, emissiveIntensity: 0.9 })
  );
  gate.position.set(start.x, 0.9, start.z);
  group.add(gate);
  group.userData.gate = gate;

  const core = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x69f0ae, emissive: 0x00e676, emissiveIntensity: 0.7, roughness: 0.3,
  });
  const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), coreMat);
  coreGem.position.y = 1.1;
  core.add(coreGem);
  const coreBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.05, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x22303f, roughness: 0.7 })
  );
  coreBase.position.y = 0.25;
  core.add(coreBase);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.06, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 0.8 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.1;
  core.add(ring);
  core.position.set(end.x, 0, end.z);
  group.add(core);
  group.userData.core = core;
  group.userData.coreRing = ring;

  // 星空背景
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 400; i++) {
    const r = 45 + Math.random() * 30;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI * 0.45;
    starPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) + 4, r * Math.sin(ph) * Math.sin(th));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  group.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0x9fb8d0, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.8,
  })));

  return group;
}
