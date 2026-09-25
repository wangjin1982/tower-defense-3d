// ===== UI 层（DOM） =====
import { TOWERS, TOWER_KEYS, MAX_LEVEL, DIFFICULTIES, BUILDABLE_KEYS } from './config.js?v=1.1';

const BAND_COLORS = { red: '#ff5252', yellow: '#ffd740', green: '#76ff03' };

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(cb) {
    this.cb = cb; // { onStart(diffKey), onRestart, onMenu, onSelectBuild, onStartWave, onSpeed, onPause, onMute, onUpgrade, onSell }
    this.buildBtns = {};
    this.selectedBuild = null;
    this.diffKey = 'normal';
    this.toastTimer = null;

    $('btn-start').addEventListener('click', () => cb.onStart(this.diffKey));
    $('btn-restart').addEventListener('click', () => cb.onRestart());
    $('btn-menu').addEventListener('click', () => cb.onMenu());
    $('btn-wave').addEventListener('click', () => cb.onStartWave());
    $('btn-speed').addEventListener('click', () => cb.onSpeed());
    $('btn-pause').addEventListener('click', () => cb.onPause());
    $('btn-mute').addEventListener('click', () => cb.onMute());
    $('btn-cancel-build').addEventListener('click', () => this.selectBuild(null));

    // 难度选择
    const seg = $('seg-diff');
    for (const btn of seg.querySelectorAll('button')) {
      btn.addEventListener('click', () => {
        this.diffKey = btn.dataset.v;
        for (const b of seg.querySelectorAll('button')) {
          b.classList.toggle('selected', b === btn);
        }
        $('diff-desc').textContent = DIFFICULTIES[this.diffKey].desc;
      });
    }

    // 建造栏（合体塔不可直接建造）
    const bar = $('buildbar');
    BUILDABLE_KEYS.forEach((key, i) => {
      const def = TOWERS[key];
      const btn = document.createElement('button');
      btn.className = 'build-btn';
      btn.innerHTML = `
        <span class="icon">${def.icon}</span>
        <span class="name">${def.name}</span>
        <span class="cost">💰<span class="cost-num">${def.cost}</span></span>
        <span class="hotkey">${i + 1}</span>`;
      btn.title = def.desc;
      btn.addEventListener('click', () => this.selectBuild(this.selectedBuild === key ? null : key));
      bar.appendChild(btn);
      this.buildBtns[key] = btn;
    });
  }

  selectBuild(key) {
    this.selectedBuild = key;
    for (const [k, btn] of Object.entries(this.buildBtns)) {
      btn.classList.toggle('selected', k === key);
    }
    $('ghost-hint').classList.toggle('hidden', !key);
    $('btn-cancel-build').classList.toggle('hidden', !key);
    if (key) {
      const def = TOWERS[key];
      $('ghost-hint').textContent = `点击空地放置「${def.name}」`;
      this.hideTowerPanel();
    }
    this.cb.onSelectBuild(key);
  }

  refreshAffordable(gold) {
    for (const [key, btn] of Object.entries(this.buildBtns)) {
      btn.classList.toggle('poor', TOWERS[key].cost > gold);
    }
  }

  setStats({ lives, gold, wave, totalWaves }) {
    $('lives').textContent = lives;
    $('gold').textContent = gold;
    $('wave').textContent = totalWaves > 0 ? `${wave} / ${totalWaves}` : `${wave}`;
    this.refreshAffordable(gold);
    // 金币不足时取消已选建造
    if (this.selectedBuild && TOWERS[this.selectedBuild].cost > gold) {
      this.selectBuild(null);
    }
  }

  setDifficultyText(text) { $('diff-chip').textContent = text; }

  showWaveButton(visible, label) {
    $('wave-cta').classList.toggle('hidden', !visible);
    if (label) $('btn-wave').textContent = label;
  }

  setSpeedText(text) { $('btn-speed').textContent = text; }
  setPauseText(paused) { $('btn-pause').textContent = paused ? '▶' : '⏸'; }
  setMuteText(muted) { $('btn-mute').textContent = muted ? '🔇' : '🔊'; }

  // ===== 选中炮塔面板 =====
  showTowerPanel(info) {
    // info: { def, level, dmg, range, rate, kills, nextCost, sellValue }
    const p = $('tower-panel');
    p.classList.remove('hidden');
    const stars = '⭐'.repeat(info.level) + '·'.repeat(MAX_LEVEL - info.level);
    $('tp-name').textContent = `${info.def.icon} ${info.def.name} Lv.${info.level}`;
    $('tp-stars').textContent = stars;
    $('tp-stats').innerHTML = `
      <div>伤害 <b>${info.dmg.toFixed(0)}</b></div>
      <div>射程 <b>${info.effRange.toFixed(1)}</b></div>
      <div>攻速 <b>${info.effRate.toFixed(2)}/s</b></div>
      <div>耐久 <b style="color:${BAND_COLORS[info.band.key]}">${Math.max(0, Math.round(info.hp))}/${info.maxHp}</b>（${info.band.name}）</div>
      <div>击杀 <b>${info.kills}</b></div>`;
    // 修理按钮：耐久不在绿色区时出现，只修到下一个变色临界点
    const rep = $('btn-repair');
    if (info.repair) {
      rep.classList.remove('hidden');
      rep.textContent = `🔧 修理至${info.repair.toBand}区 💰${info.repair.cost}`;
      rep.disabled = false;
    } else {
      rep.classList.add('hidden');
    }
    // 合体按钮（相邻满级机枪+冰霜时出现）
    const fuse = $('btn-fuse');
    if (info.fuse) {
      fuse.classList.remove('hidden');
      fuse.textContent = `${info.fuse.label} 💰${info.fuse.cost}`;
      fuse.disabled = false;
    } else {
      fuse.classList.add('hidden');
    }
    const up = $('btn-upgrade');
    if (info.nextCost != null) {
      up.classList.remove('hidden');
      up.disabled = false;
      up.textContent = `⬆ 升级 💰${info.nextCost}`;
    } else {
      up.classList.remove('hidden');
      up.disabled = true;
      up.textContent = '已满级';
    }
    $('btn-sell').textContent = `💵 出售 +${info.sellValue}`;
  }

  hideTowerPanel() { $('tower-panel').classList.add('hidden'); }

  announce(text, sub = '') {
    const el = $('announce');
    el.innerHTML = `<div class="a-main">${text}</div>${sub ? `<div class="a-sub">${sub}</div>` : ''}`;
    el.classList.remove('anim');
    void el.offsetWidth; // 重启动画
    el.classList.add('anim');
  }

  // 超级怪兽入场：震屏（横幅由游戏内 Sprite 渲染，见 game.superCinematic）
  superCinematic() {
    const gl = $('gl');
    gl.classList.remove('shake');
    void gl.offsetWidth;
    gl.classList.add('shake');
    clearTimeout(this.cineTimer);
    this.cineTimer = setTimeout(() => gl.classList.remove('shake'), 700);
  }

  toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  flashDamage() {
    const el = $('flash');
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');
  }

  showGame() {
    $('menu').classList.add('hidden');
    $('gameover').classList.add('hidden');
    $('topbar').classList.remove('hidden');
    $('buildbar').classList.remove('hidden');
    $('hint').classList.remove('hidden');
  }

  showMenu() {
    $('gameover').classList.add('hidden');
    $('topbar').classList.add('hidden');
    $('buildbar').classList.add('hidden');
    $('tower-panel').classList.add('hidden');
    $('wave-cta').classList.add('hidden');
    $('hint').classList.add('hidden');
    $('ghost-hint').classList.add('hidden');
    $('btn-cancel-build').classList.add('hidden');
    $('menu').classList.remove('hidden');
  }

  showGameOver(win, { wave, kills, goldEarned, diffName }) {
    $('topbar').classList.add('hidden');
    $('buildbar').classList.add('hidden');
    $('tower-panel').classList.add('hidden');
    $('wave-cta').classList.add('hidden');
    $('hint').classList.add('hidden');
    $('go-title').textContent = win ? '🏆 防线守住了！' : '💀 基地陷落…';
    $('go-sub').textContent = win
      ? `你抵御了全部 20 波进攻 · ${diffName}`
      : `在第 ${wave} 波被击溃 · ${diffName}`;
    $('go-stats').innerHTML = `
      <div class="stat"><span>到达波次</span><b>${wave}</b></div>
      <div class="stat"><span>击杀敌人</span><b>${kills}</b></div>
      <div class="stat"><span>累计金币</span><b>${goldEarned}</b></div>`;
    $('gameover').classList.remove('hidden');
  }
}
