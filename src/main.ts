import { Guide01Protocol, type DisplayItem } from '@guide01/protocol';
import { Guide01Ble } from './ble';
import wasmUrl from './libguide01_protocol.wasm?url';
import './style.css';

const GUIDE01_SEND_INTERVAL_MS = 1000;
const GUIDE01_DISPLAY_SHOW_STATUS_BAR = false;
const HISTORY_KEY = 'walking-guide-history-v2';

type RoutePoint = {
  lat: number;
  lng: number;
  accuracy: number;
  at: number;
};

type WalkRecord = {
  id: string;
  date: string;
  elapsedMs: number;
  distanceMeters: number;
  pace: string;
  steps: number;
  points: RoutePoint[];
};

const state = {
  status: 'idle' as 'idle' | 'active' | 'paused',
  startedAt: 0,
  pausedAt: 0,
  pausedMs: 0,
  distanceMeters: 0,
  steps: 0,
  points: [] as RoutePoint[],
  watchId: null as number | null,
  lastStepAt: 0,
  lastAccel: 0,
};

let guide01Protocol: Guide01Protocol | null = null;
let guide01Ble: Guide01Ble | null = null;
let guide01ConnectedName = '';
let guide01LastSendTime = 0;
let guide01Sending = false;
let guide01AutoSend = true;
let guide01SendTimer: number | null = null;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

app.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Offline walking recorder</p>
        <h1>Walking GUIDE01</h1>
      </div>
      <div class="status-pill" id="connectionStatus">GUIDE01 未接続</div>
    </header>

    <section class="dashboard" aria-label="現在の状況">
      <div class="metric clock"><span>現在時間</span><strong id="currentTime">--:--:--</strong></div>
      <div class="metric"><span>経過時間</span><strong id="elapsedTime">00:00:00</strong></div>
      <div class="metric"><span>距離</span><strong id="distance">0.00 km</strong></div>
      <div class="metric"><span>ペース</span><strong id="pace">--'--"/km</strong></div>
      <div class="metric"><span>歩数</span><strong id="steps">0</strong></div>
      <div class="metric comment"><span>コメント</span><strong id="comment">準備できています</strong></div>
    </section>

    <section class="controls" aria-label="記録操作">
      <button class="primary" id="startBtn">開始</button>
      <button id="pauseBtn" disabled>一時停止</button>
      <button id="finishBtn" disabled>終了</button>
      <button id="connectBtn">GUIDE01接続</button>
      <button id="disconnectBtn" disabled>切断</button>
      <button id="autoSendBtn">自動送信 ON</button>
      <button id="sendNowBtn" disabled>今すぐ表示</button>
    </section>

    <section class="panel">
      <div class="panel-title">
        <h2>経路</h2>
        <span id="gpsStatus">GPS待機中</span>
      </div>
      <canvas id="routeCanvas" width="720" height="420" aria-label="歩いた経路の表示"></canvas>
    </section>

    <section class="panel history-panel">
      <div class="panel-title">
        <h2>日々の記録</h2>
        <button class="small" id="clearHistoryBtn">履歴削除</button>
      </div>
      <div id="historyList" class="history-list"></div>
    </section>

    <section class="panel log-panel">
      <div class="panel-title"><h2>GUIDE01ログ</h2></div>
      <pre id="log">idle</pre>
    </section>
  </main>
`;

const els = {
  currentTime: byId<HTMLElement>('currentTime'),
  elapsedTime: byId<HTMLElement>('elapsedTime'),
  distance: byId<HTMLElement>('distance'),
  pace: byId<HTMLElement>('pace'),
  steps: byId<HTMLElement>('steps'),
  comment: byId<HTMLElement>('comment'),
  gpsStatus: byId<HTMLElement>('gpsStatus'),
  connectionStatus: byId<HTMLElement>('connectionStatus'),
  routeCanvas: byId<HTMLCanvasElement>('routeCanvas'),
  startBtn: byId<HTMLButtonElement>('startBtn'),
  pauseBtn: byId<HTMLButtonElement>('pauseBtn'),
  finishBtn: byId<HTMLButtonElement>('finishBtn'),
  connectBtn: byId<HTMLButtonElement>('connectBtn'),
  disconnectBtn: byId<HTMLButtonElement>('disconnectBtn'),
  autoSendBtn: byId<HTMLButtonElement>('autoSendBtn'),
  sendNowBtn: byId<HTMLButtonElement>('sendNowBtn'),
  clearHistoryBtn: byId<HTMLButtonElement>('clearHistoryBtn'),
  historyList: byId<HTMLElement>('historyList'),
  log: byId<HTMLPreElement>('log'),
};

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} not found`);
  return element as T;
}

function log(message: unknown): void {
  console.log(message);
  els.log.textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
}

function elapsedMs(): number {
  if (!state.startedAt) return 0;
  const end = state.status === 'paused' ? state.pausedAt : Date.now();
  return Math.max(0, end - state.startedAt - state.pausedMs);
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatPace(ms: number, meters: number): string {
  if (meters < 10) return `--'--"/km`;
  const minPerKm = ms / 60000 / (meters / 1000);
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  return `${minutes}'${String(seconds).padStart(2, '0')}"/km`;
}

function getComment(): string {
  if (state.status === 'idle') return '準備できています';
  if (state.status === 'paused') return '一時停止中です';
  if (state.distanceMeters < 100) return 'GPSを捕捉しながら開始しています';
  const paceMin = elapsedMs() / 60000 / (state.distanceMeters / 1000);
  if (paceMin < 9) return 'よいペースです';
  if (paceMin < 13) return '安定して歩けています';
  return 'ゆっくり整えていきましょう';
}

function haversine(a: RoutePoint, b: RoutePoint): number {
  const radius = 6371000;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function updateButtons(): void {
  const connected = Boolean(guide01Ble?.connected);
  els.startBtn.disabled = state.status === 'active';
  els.pauseBtn.disabled = state.status !== 'active' && state.status !== 'paused';
  els.finishBtn.disabled = state.status === 'idle';
  els.pauseBtn.textContent = state.status === 'paused' ? '再開' : '一時停止';
  els.connectBtn.disabled = connected;
  els.disconnectBtn.disabled = !connected;
  els.sendNowBtn.disabled = !connected;
  els.autoSendBtn.textContent = `自動送信 ${guide01AutoSend ? 'ON' : 'OFF'}`;
  els.connectionStatus.textContent = connected
    ? `GUIDE01 接続中 ${guide01ConnectedName || ''}`
    : 'GUIDE01 未接続';
  els.connectionStatus.classList.toggle('connected', connected);
}

function render(): void {
  const ms = elapsedMs();
  els.currentTime.textContent = formatClock(new Date());
  els.elapsedTime.textContent = formatDuration(ms);
  els.distance.textContent = `${(state.distanceMeters / 1000).toFixed(2)} km`;
  els.pace.textContent = formatPace(ms, state.distanceMeters);
  els.steps.textContent = String(state.steps);
  els.comment.textContent = getComment();
  drawRoute();
}

function drawRoute(): void {
  const canvas = els.routeCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#dfe9e5';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(16, 32, 28, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 40; y < height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (state.points.length < 2) {
    ctx.fillStyle = '#64736f';
    ctx.font = '22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('歩行後にここへ経路が表示されます', width / 2, height / 2);
    return;
  }

  const lats = state.points.map((point) => point.lat);
  const lngs = state.points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 34;
  const latRange = maxLat - minLat || 0.0001;
  const lngRange = maxLng - minLng || 0.0001;
  const scale = Math.min((width - pad * 2) / lngRange, (height - pad * 2) / latRange);
  const routeWidth = lngRange * scale;
  const routeHeight = latRange * scale;
  const xOffset = (width - routeWidth) / 2;
  const yOffset = (height - routeHeight) / 2;
  const project = (point: RoutePoint) => ({
    x: xOffset + (point.lng - minLng) * scale,
    y: yOffset + (maxLat - point.lat) * scale,
  });

  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  state.points.forEach((point, index) => {
    const p = project(point);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  const start = project(state.points[0]!);
  const end = project(state.points[state.points.length - 1]!);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(end.x, end.y, 10, 0, Math.PI * 2);
  ctx.fill();
}

function startGps(): void {
  if (!('geolocation' in navigator)) {
    els.gpsStatus.textContent = 'GPS非対応';
    return;
  }
  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (state.status !== 'active') return;
      const point: RoutePoint = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        at: Date.now(),
      };
      els.gpsStatus.textContent = `GPS精度 ${Math.round(point.accuracy)}m`;
      const previous = state.points[state.points.length - 1];
      if (previous) {
        const delta = haversine(previous, point);
        if (delta > 0.5 && delta < 80) state.distanceMeters += delta;
      }
      state.points.push(point);
      render();
    },
    () => {
      els.gpsStatus.textContent = 'GPS取得エラー';
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 },
  );
}

function stopGps(): void {
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
}

async function requestMotionPermission(): Promise<boolean> {
  const motion = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (motion && typeof motion.requestPermission === 'function') {
    const result = await motion.requestPermission();
    return result === 'granted';
  }
  return true;
}

function setupMotion(): void {
  window.addEventListener('devicemotion', (event) => {
    if (state.status !== 'active') return;
    const a = event.accelerationIncludingGravity;
    if (!a) return;
    const magnitude = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    const filtered = Math.abs(magnitude - 9.8);
    const t = Date.now();
    if (filtered > 2.6 && state.lastAccel <= 2.6 && t - state.lastStepAt > 320) {
      state.steps += 1;
      state.lastStepAt = t;
    }
    state.lastAccel = filtered;
  });
}

async function startWalk(): Promise<void> {
  await requestMotionPermission();
  state.status = 'active';
  state.startedAt = Date.now();
  state.pausedAt = 0;
  state.pausedMs = 0;
  state.distanceMeters = 0;
  state.steps = 0;
  state.points = [];
  state.lastStepAt = 0;
  state.lastAccel = 0;
  startGps();
  startGuide01Loop();
  updateButtons();
  render();
}

function togglePause(): void {
  if (state.status === 'active') {
    state.status = 'paused';
    state.pausedAt = Date.now();
    stopGps();
  } else if (state.status === 'paused') {
    state.pausedMs += Date.now() - state.pausedAt;
    state.pausedAt = 0;
    state.status = 'active';
    startGps();
  }
  updateButtons();
  render();
}

function finishWalk(): void {
  const record: WalkRecord = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: new Date().toISOString(),
    elapsedMs: elapsedMs(),
    distanceMeters: state.distanceMeters,
    pace: formatPace(elapsedMs(), state.distanceMeters),
    steps: state.steps,
    points: state.points,
  };
  const history = loadHistory();
  history.unshift(record);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  state.status = 'idle';
  stopGps();
  stopGuide01Loop();
  void sendWalkingToGuide01(true);
  updateButtons();
  renderHistory();
  render();
}

function loadHistory(): WalkRecord[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as WalkRecord[];
  } catch {
    return [];
  }
}

function renderHistory(): void {
  const history = loadHistory();
  els.historyList.innerHTML = '';
  if (history.length === 0) {
    els.historyList.innerHTML = '<p class="empty">まだ記録がありません</p>';
    return;
  }
  for (const record of history) {
    const item = document.createElement('button');
    item.className = 'history-item';
    item.type = 'button';
    const date = new Intl.DateTimeFormat('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(record.date));
    item.innerHTML = `
      <span><strong>${date}</strong>${formatDuration(record.elapsedMs)} / ${(record.distanceMeters / 1000).toFixed(2)} km / ${record.steps}歩</span>
      <span>${record.pace}</span>
    `;
    item.addEventListener('click', () => {
      state.points = record.points || [];
      state.distanceMeters = record.distanceMeters || 0;
      state.steps = record.steps || 0;
      drawRoute();
    });
    els.historyList.append(item);
  }
}

async function connectGuide01(): Promise<void> {
  if (!('bluetooth' in navigator)) {
    log('Web Bluetooth is not available. Android Chrome or iPhone Bluefy over HTTPS is required.');
    return;
  }

  try {
    if (!guide01Protocol) {
      log('loading GUIDE01 protocol wasm...');
      guide01Protocol = await Guide01Protocol.loadFromUrl(wasmUrl);
    }

    const ble = new Guide01Ble(guide01Protocol);
    ble.onLog = (message) => log(`GUIDE01: ${message}`);
    ble.onDisconnect = () => {
      guide01Ble = null;
      guide01ConnectedName = '';
      stopGuide01Loop();
      log('GUIDE01 disconnected');
      updateButtons();
    };
    ble.onTouchEvent = (event) => console.log('GUIDE01 touch:', event);

    const relaxedScan = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    log(relaxedScan
      ? 'GUIDE01: Bluefy/iOS mode. Select GUIDE01 from the device list.'
      : 'GUIDE01: scanning with manufacturer filter...');
    guide01ConnectedName = await ble.connect({ relaxedScan });
    guide01Ble = ble;
    log(`GUIDE01 connected: ${guide01ConnectedName}`);
    updateButtons();
    await sendWalkingToGuide01(true);
  } catch (error) {
    console.error(error);
    log(`GUIDE01 connect error: ${error instanceof Error ? error.message : String(error)}`);
    updateButtons();
  }
}

function disconnectGuide01(): void {
  try {
    guide01Ble?.disconnect();
  } catch (error) {
    console.warn('GUIDE01 disconnect failed:', error);
  }
  guide01Ble = null;
  guide01ConnectedName = '';
  stopGuide01Loop();
  updateButtons();
  log('GUIDE01 disconnect requested');
}

function startGuide01Loop(): void {
  stopGuide01Loop();
  guide01SendTimer = window.setInterval(() => {
    if (guide01AutoSend) void sendWalkingToGuide01(false);
  }, 1000);
}

function stopGuide01Loop(): void {
  if (guide01SendTimer !== null) {
    window.clearInterval(guide01SendTimer);
    guide01SendTimer = null;
  }
}

async function sendWalkingToGuide01(force: boolean): Promise<void> {
  if (!guide01Ble?.connected || !guide01Protocol) return;
  if (guide01Sending) return;

  const now = Date.now();
  if (!force && now - guide01LastSendTime < GUIDE01_SEND_INTERVAL_MS) return;

  guide01Sending = true;
  guide01LastSendTime = now;

  try {
    const gt = guide01Protocol.gifTextConsts();
    const items: DisplayItem[] = [
      {
        layer_id: 0,
        type: gt.ELEMENT_TYPE_TEXT,
        x: 28,
        y: 24,
        font_size: 30,
        color: { r: 0, g: 255, b: 160 },
        text: 'WALKING',
      },
      {
        layer_id: 1,
        type: gt.ELEMENT_TYPE_TEXT,
        x: 28,
        y: 70,
        font_size: 42,
        color: { r: 255, g: 255, b: 255 },
        text: `${els.currentTime.textContent}  ${els.elapsedTime.textContent}`,
      },
      {
        layer_id: 2,
        type: gt.ELEMENT_TYPE_TEXT,
        x: 28,
        y: 126,
        font_size: 48,
        color: { r: 255, g: 210, b: 60 },
        text: `${(state.distanceMeters / 1000).toFixed(2)}km  ${els.pace.textContent}`,
      },
      {
        layer_id: 3,
        type: gt.ELEMENT_TYPE_TEXT,
        x: 28,
        y: 188,
        font_size: 40,
        color: { r: 80, g: 210, b: 255 },
        text: `${state.steps} steps`,
      },
      {
        layer_id: 4,
        type: gt.ELEMENT_TYPE_TEXT,
        x: 28,
        y: 244,
        font_size: 30,
        color: { r: 180, g: 255, b: 220 },
        text: trimGuide01Text(els.comment.textContent || '', 20),
      },
    ];

    await guide01Ble.displayGifTextElements(GUIDE01_DISPLAY_SHOW_STATUS_BAR, items);
    log(force ? 'GUIDE01 display: ok' : 'GUIDE01 display updated');
  } catch (error) {
    console.warn('GUIDE01 display error:', error);
    log(`GUIDE01 display error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    guide01Sending = false;
  }
}

function trimGuide01Text(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}...` : text;
}

els.startBtn.onclick = () => void startWalk();
els.pauseBtn.onclick = togglePause;
els.finishBtn.onclick = finishWalk;
els.connectBtn.onclick = () => void connectGuide01();
els.disconnectBtn.onclick = disconnectGuide01;
els.autoSendBtn.onclick = () => {
  guide01AutoSend = !guide01AutoSend;
  updateButtons();
};
els.sendNowBtn.onclick = () => void sendWalkingToGuide01(true);
els.clearHistoryBtn.onclick = () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
};

setupMotion();
renderHistory();
updateButtons();
render();
window.setInterval(render, 1000);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
