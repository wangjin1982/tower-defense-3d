// ===== 入口：渲染器、灯光、主循环 =====
import * as THREE from 'three';
import { buildMap } from './map.js?v=2.3';
import { AudioFX } from './audio.js?v=2.3';
import { Effects } from './effects.js?v=2.3';
import { UI } from './ui.js?v=2.3';
import { Game } from './game.js?v=2.3';
import { InputController } from './input.js?v=2.3';
import { BUILDABLE_KEYS } from './config.js?v=2.3';

const $ = (id) => document.getElementById(id);

const canvas = $('gl');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
scene.fog = new THREE.Fog(0x070b14, 38, 85);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

// 灯光
scene.add(new THREE.HemisphereLight(0x8fa8c8, 0x26344a, 1.35));
scene.add(new THREE.AmbientLight(0x33445f, 0.9));
const sun = new THREE.DirectionalLight(0xfff3e0, 1.6);
sun.position.set(14, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
sun.shadow.camera.far = 60;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x4fc3f7, 0.35);
rim.position.set(-12, 10, -14);
scene.add(rim);

// 场景与模块
const mapGroup = buildMap(scene);
const audio = new AudioFX();
const effects = new Effects(scene);

const game = new Game({ scene, camera, audio, effects, ui: null });
const ui = new UI({
  onStart: (diffKey) => game.start(diffKey),
  onRestart: () => game.restart(),
  onMenu: () => game.backToMenu(),
  onSelectBuild: (key) => game.onSelectBuild(key),
  onStartWave: () => game.startNextWave(),
  onSpeed: () => game.toggleSpeed(),
  onPause: () => game.togglePause(),
  onMute: () => ui.setMuteText(audio.toggleMute()),
  onUpgrade: () => game.upgradeSelected(),
  onSell: () => game.sellSelected(),
  onFuse: () => game.fuseSelected(),
});
game.ui = ui;
ui.setMuteText(false);

const input = new InputController(canvas, camera, {
  onLeftClick: (cell) => game.onLeftClick(cell),
  onHover: (cell) => game.onHover(cell),
  onDrag: () => {},
});
game.mapRefs = mapGroup.userData;

// 事件绑定
$('btn-upgrade').addEventListener('click', () => game.upgradeSelected());
$('btn-sell').addEventListener('click', () => game.sellSelected());
$('btn-fuse').addEventListener('click', () => game.fuseSelected());
$('btn-repair').addEventListener('click', () => game.repairSelected());

window.addEventListener('keydown', (e) => {
  if (game.state !== 'playing') return;
  if (e.code === 'Space') { e.preventDefault(); game.startNextWave(); }
  else if (e.key === 'Escape') game.cancelAll();
  else if (e.key === 'p' || e.key === 'P') game.togglePause();
  else if (e.key === 'm' || e.key === 'M') ui.setMuteText(audio.toggleMute());
  else {
    const idx = parseInt(e.key, 10);
    if (idx >= 1 && idx <= BUILDABLE_KEYS.length) {
      const key = BUILDABLE_KEYS[idx - 1];
      ui.selectBuild(ui.selectedBuild === key ? null : key);
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 主循环
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  game.update(dt);
  renderer.render(scene, camera);
}
animate();

// 调试句柄（控制台可用：__td.startNextWave() 等）
window.__td = game;
window.__tdPlace = (col, row, key = 'gun') => game.placeTower(key, col, row);
window.__tr = renderer; // 渲染器句柄（逐帧驱动录制用）
