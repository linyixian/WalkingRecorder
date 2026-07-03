import {
  Guide01Protocol,
  SCREEN_SIDE_LEFT,
  SCREEN_SIDE_RIGHT,
  type DisplayItem,
} from '@guide01/protocol';
import { Guide01Ble } from './ble';
import wasmUrl from './libguide01_protocol.wasm?url';
import sampleImageUrl from './test_image_624x405.jpg?url';

type Attrs = Record<string, string | number | boolean | EventListener>;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') {
      e.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'class') {
      e.className = String(v);
    } else if (typeof v === 'boolean') {
      if (v) e.setAttribute(k, '');
    } else {
      e.setAttribute(k, String(v));
    }
  }
  e.append(...children);
  return e;
}

const card = (title: string, ...rows: (Node | string)[]) =>
  el('div', { class: 'card' }, el('h3', {}, title), ...rows);
const rowEl = (...children: (Node | string)[]) => el('div', { class: 'row' }, ...children);
const action = (label: string, onClick: () => void) =>
  el('button', { class: 'action', onclick: onClick }, label);
const outlined = (label: string, onClick: () => void) =>
  el('button', { class: 'outline', onclick: onClick }, label);
const tile = (label: string, trailing: string, onClick: () => void) =>
  el('div', { class: 'tile', onclick: onClick }, el('span', {}, label), el('span', { class: 'chev' }, trailing));

function textField(label: string, value = ''): HTMLInputElement {
  return el('input', { type: 'text', value });
}
function field(label: string, input: Node): HTMLElement {
  return el('div', { class: 'field' }, el('span', {}, label), input);
}
function numField(label: string, value: number): HTMLInputElement {
  return el('input', { type: 'number', value });
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const appEl = document.getElementById('app')!;
const titleEl = document.getElementById('title')!;
const backEl = document.getElementById('back') as HTMLButtonElement;
const snackbarEl = document.getElementById('snackbar')!;

let snackTimer: number | undefined;
function snackbar(message: string): void {
  snackbarEl.textContent = message;
  snackbarEl.classList.add('show');
  window.clearTimeout(snackTimer);
  snackTimer = window.setTimeout(() => snackbarEl.classList.remove('show'), 3500);
}

interface Screen {
  title: string;
  render: () => HTMLElement;
}

const stack: Screen[] = [];

function renderTop(): void {
  const top = stack[stack.length - 1];
  if (!top) return;
  titleEl.textContent = top.title;
  backEl.style.display = stack.length > 1 ? 'block' : 'none';
  appEl.replaceChildren(top.render());
}
function push(screen: Screen): void {
  stack.push(screen);
  renderTop();
}
function reset(screen: Screen): void {
  stack.length = 0;
  push(screen);
}
backEl.addEventListener('click', () => {
  if (stack.length <= 1) return;
  if (stack.length === 2) {
    ble?.disconnect();
    return;
  }
  stack.pop();
  renderTop();
});

async function run(label: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    snackbar(`${label}: ok`);
  } catch (e) {
    console.error(`${label} failed:`, e);
    snackbar(`${label}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

let protocol: Guide01Protocol | undefined;
let ble: Guide01Ble | undefined;
let touchView: ((line: string) => void) | undefined;

function P(): Guide01Protocol {
  if (!protocol) throw new Error('protocol not loaded');
  return protocol;
}
function bleOrThrow(): Guide01Ble {
  if (!ble) throw new Error('not connected');
  return ble;
}

async function connect(): Promise<void> {
  if (!protocol) {
    protocol = await Guide01Protocol.loadFromUrl(wasmUrl);
  }
  const b = new Guide01Ble(protocol);
  b.onLog = snackbar;
  b.onTouchEvent = (e) => {
    const line = `page ${e.page_id}: ${touchLabel(e.touch_event)}`;
    touchView?.(line);
  };
  b.onGifTextStatus = (items) =>
    snackbar(`gif status: ${items.map((i) => `#${i.id}=${i.status}`).join(', ') || '(none)'}`);
  b.onDisconnect = () => reset(scanScreen());
  await b.connect();
  ble = b;
  push(menuScreen());
}

function touchLabel(e: number): string {
  const t = P().touchConsts();
  if (e === t.TOUCH_SINGLE_CLICK) return 'Single Click';
  if (e === t.TOUCH_DOUBLE_CLICK) return 'Double Click';
  if (e === t.TOUCH_SWIPE_FORWARD) return 'Swipe Forward';
  if (e === t.TOUCH_SWIPE_BACK) return 'Swipe Back';
  if (e === t.TOUCH_LONG_PRESS) return 'Long Press';
  return `event ${e}`;
}

async function toDeviceJpeg(file: Blob, quality: number): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = 624;
  canvas.height = 405;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(bitmap, 0, 0, 624, 405);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality / 100));
  if (!blob) throw new Error('JPEG encode failed');
  return new Uint8Array(await blob.arrayBuffer());
}

function scanScreen(): Screen {
  return {
    title: 'Guide01',
    render: () => {
      const supported = 'bluetooth' in navigator;
      const scanBtn = action('Scan', () => run('connect', connect).catch(() => {}));
      scanBtn.toggleAttribute('disabled', !supported);
      return el(
        'div',
        {},
        card(
          'Scan',
          el('p', { class: 'muted' }, 'Chrome / Edge only. Click Scan; the browser lists nearby Guide01 devices — pick one to connect.'),
          rowEl(scanBtn),
          supported ? el('span', {}) : el('p', { class: 'muted' }, 'Web Bluetooth unavailable in this browser.'),
        ),
      );
    },
  };
}

function menuScreen(): Screen {
  const items: [string, () => Screen][] = [
    ['Status', statusScreen],
    ['Notification', notificationScreen],
    ['Lyrics', lyricsScreen],
    ['GIF Text Sample', gifTextSampleScreen],
    ['GIF Text Utility', gifTextUtilityScreen],
    ['Image Transfer', imageScreen],
    ['Touch Event', touchScreen],
    ['Screen Mode', screenModeScreen],
    ['Motion', motionScreen],
  ];
  return {
    title: 'Guide01',
    render: () =>
      el(
        'div',
        {},
        ...items.map(([label, screen]) => tile(label, '›', () => push(screen()))),
        tile('Switch Time Page', '⤴', () => run('switchTimePage', () => bleOrThrow().pageSwitchToTime())),
      ),
  };
}

function statusScreen(): Screen {
  return {
    title: 'Status',
    render: () => {
      const info = el('div', {});
      const deviceBat = el('span', {}, 'Device: --');
      const caseBat = el('span', {}, 'Case: --');
      const brightness = el('input', { type: 'range', min: 1, max: 100, value: 50 });
      const brightnessBtn = action('Set Brightness (50)', () =>
        run('setBrightness', () => bleOrThrow().setBrightness(Number(brightness.value))),
      );
      brightness.addEventListener('input', () => (brightnessBtn.textContent = `Set Brightness (${brightness.value})`));
      const sleep = numField('Seconds', 30);
      const temp = numField('Temperature (C)', 20);
      const displayTime = numField('Seconds (1-255)', 10);

      return el(
        'div',
        {},
        card(
          'Device Info',
          info,
          action('Read Info', () =>
            run('readInfo', async () => {
              const b = bleOrThrow();
              const reads: [string, () => Promise<string>][] = [
                ['Serial', () => b.readSerialNumber()],
                ['Firmware', () => b.readFirmwareVersion()],
                ['Hardware', () => b.readHardwareVersion()],
                ['Software', () => b.readSoftwareVersion()],
                ['Resource', () => b.readResourceVersion()],
              ];
              info.replaceChildren();
              for (const [label, read] of reads) {
                let value: string;
                try {
                  value = await read();
                } catch {
                  value = 'n/a';
                }
                info.append(el('div', { class: 'listrow' }, `${label}: ${value}`));
              }
            }),
          ),
        ),
        card(
          'Battery',
          rowEl(deviceBat, el('span', { class: 'grow' }), action('Read', () =>
            run('readBattery', async () => {
              deviceBat.textContent = `Device: ${await bleOrThrow().readBattery()}%`;
            }),
          )),
          rowEl(caseBat, el('span', { class: 'grow' }), action('Read', () =>
            run('readBoxBattery', async () => {
              caseBat.textContent = `Case: ${await bleOrThrow().readBoxBattery()}%`;
            }),
          )),
        ),
        card('Brightness', brightness, brightnessBtn),
        card('Sleep Time', field('Seconds', sleep), action('Set Sleep Time', () =>
          run('setSleepTime', () => bleOrThrow().setSleepTime(Number(sleep.value) || 30)),
        )),
        card('Time Sync', action('Sync Current Time', () => run('setTime', () => bleOrThrow().setTime()))),
        card('Weather', field('Temperature (C)', temp), action('Send Weather', () =>
          run('setWeather', () => bleOrThrow().setWeather(`${temp.value}C`)),
        )),
        card('Notification Display Time', field('Seconds (1-255)', displayTime), action('Set & Test Notification', () =>
          run('setDisplayTime', async () => {
            const s = Number(displayTime.value) || 0;
            if (s < 1 || s > 255) throw new Error('seconds must be 1-255');
            await bleOrThrow().setNotificationDisplayTime(s);
            await bleOrThrow().sendNotification('Guide01 Demo', 'Display Time', `${s}s test`, timestamp());
          }),
        )),
      );
    },
  };
}

function notificationScreen(): Screen {
  return {
    title: 'Notification',
    render: () => {
      const app = textField('App Name', 'Guide01 Demo');
      app.value = 'Guide01 Demo';
      const title = textField('Title');
      title.value = 'Hello';
      const content = textField('Content');
      content.value = 'Test notification';
      const showTime = el('input', { type: 'checkbox', checked: true });
      return el(
        'div',
        {},
        card(
          'Notification',
          field('App Name', app),
          el('label', {}, showTime, ' Show Time'),
          field('Title', title),
          field('Content', content),
          action('Send Notification', () =>
            run('sendNotification', () =>
              bleOrThrow().sendNotification(app.value, title.value, content.value, showTime.checked ? timestamp() : ''),
            ),
          ),
        ),
      );
    },
  };
}

function lyricsScreen(): Screen {
  return {
    title: 'Lyrics',
    render: () => {
      const songTitle = textField('Title');
      songTitle.value = 'Demo Song';
      const artist = textField('Artist');
      artist.value = 'Artist';
      const l1 = textField('Line 1');
      l1.value = 'line 1';
      const l2 = textField('Line 2');
      l2.value = 'line 2';
      const l3 = textField('Line 3');
      l3.value = 'line 3';
      return el(
        'div',
        {},
        card('Song Info', field('Title', songTitle), field('Artist', artist), action('Send Song Info', () =>
          run('sendSongInfo', () => bleOrThrow().sendSongInfo(songTitle.value, artist.value)),
        )),
        card(
          'Lyric Lines',
          field('Line 1', l1),
          field('Line 2', l2),
          field('Line 3', l3),
          rowEl(
            action('Send Lyric', () => run('sendLyric', () => bleOrThrow().sendLyric(l1.value, l2.value, l3.value))),
            outlined('Stop', () => run('stopLyric', () => bleOrThrow().stopLyric())),
          ),
        ),
        card(
          'Text Colors',
          rowEl(
            action('Default Colors', () =>
              run('lyricColors', () => bleOrThrow().sendLyricTextColors(255, 255, 255, 128, 128, 128, 255, 255, 255, 128, 128, 128)),
            ),
            outlined('All White', () =>
              run('lyricColors', () => bleOrThrow().sendLyricTextColors(255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255)),
            ),
          ),
        ),
      );
    },
  };
}

function screenModeScreen(): Screen {
  return {
    title: 'Screen Mode',
    render: () => {
      const left = action('Left', () => run('screenLeft', () => bleOrThrow().setScreenMode(SCREEN_SIDE_LEFT)));
      const right = action('Right', () => run('screenRight', () => bleOrThrow().setScreenMode(SCREEN_SIDE_RIGHT)));
      left.classList.add('grow');
      right.classList.add('grow');
      return el('div', {}, card('Left / Right Screen', rowEl(left, right)));
    },
  };
}

function motionScreen(): Screen {
  return {
    title: 'Motion',
    render: () => {
      const mt = P().motionTypeConsts();
      const ml = P().motionCmdConsts();

      const TYPES = [
        { key: 'DISTANCE', label: 'Distance', max: 50000 },
        { key: 'SPEED', label: 'Speed', max: 60 },
        { key: 'AVG_SPEED', label: 'Avg Speed', max: 60 },
        { key: 'MAX_SPEED', label: 'Max Speed', max: 70 },
        { key: 'HEART_RATE', label: 'Heart Rate', max: 200 },
        { key: 'MAX_HEART_RATE', label: 'Max Heart Rate', max: 200 },
        { key: 'CADENCE', label: 'Cadence', max: 130 },
        { key: 'MAX_CADENCE', label: 'Max Cadence', max: 140 },
        { key: 'POWER', label: 'Power', max: 400 },
        { key: 'MAX_POWER', label: 'Max Power', max: 500 },
      ] as const;
      const rnd = (max: number) => 1 + Math.floor(Math.random() * max);

      const layouts = [
        { n: 1, groups: ml.LAYOUT_ONE },
        { n: 2, groups: ml.LAYOUT_TWO },
        { n: 3, groups: ml.LAYOUT_THREE },
        { n: 5, groups: ml.LAYOUT_FIVE },
      ];
      let slotCount = 3;
      const slotKeys: string[] = TYPES.map((t) => t.key);

      const slotsBox = el('div', {});
      const renderSlots = () => {
        slotsBox.replaceChildren();
        for (let i = 0; i < slotCount; i++) {
          const sel = el(
            'select',
            {},
            ...TYPES.map((t) => el('option', { value: t.key }, t.label)),
          ) as HTMLSelectElement;
          sel.value = slotKeys[i]!;
          sel.onchange = () => {
            slotKeys[i] = sel.value;
          };
          slotsBox.append(field(`Slot ${i + 1}`, sel));
        }
      };
      renderSlots();

      const setLayout = (n: number, groups: number) => {
        slotCount = n;
        renderSlots();
        run('motionLayout', () => bleOrThrow().setMotionLayout(groups));
      };

      const sendData = () =>
        run('motionData', () =>
          bleOrThrow().sendMotionData(
            Array.from({ length: slotCount }, (_, i) => {
              const t = TYPES.find((x) => x.key === slotKeys[i])!;
              return { type: mt[t.key as keyof typeof mt], value: rnd(t.max) };
            }),
          ),
        );

      return el(
        'div',
        {},
        card(
          'Layout',
          rowEl(...layouts.map((l) => outlined(String(l.n), () => setLayout(l.n, l.groups)))),
        ),
        card(
          'Slots (values are randomized on send)',
          slotsBox,
          action('Send', sendData),
        ),
      );
    },
  };
}

function touchScreen(): Screen {
  return {
    title: 'Touch Event',
    render: () => {
      const list = el('div', {}, el('p', { class: 'muted' }, 'Touch the device...'));
      let count = 0;
      touchView = (line) => {
        if (count === 0) list.replaceChildren();
        count++;
        list.prepend(el('div', { class: 'listrow' }, `${new Date().toLocaleTimeString()}  ${line}`));
      };
      return el(
        'div',
        {},
        card('Touch events (notified by the device)', rowEl(outlined('Clear', () => {
          count = 0;
          list.replaceChildren(el('p', { class: 'muted' }, 'Touch the device...'));
        })), list),
      );
    },
  };
}

function imageScreen(): Screen {
  return {
    title: 'Image Transfer',
    render: () => {
      const fileInput = el('input', { type: 'file', accept: 'image/*' });
      const status = el('span', { class: 'muted' }, 'Pick a photo');
      const quality = el('input', { type: 'range', min: 10, max: 100, value: 80 });
      const qualityLabel = el('div', {}, 'JPEG quality: 80');
      const progress = el('progress', { max: 1, value: 0 });
      progress.style.display = 'none';
      let jpeg: Uint8Array | undefined;

      async function reencode(): Promise<void> {
        const f = fileInput.files?.[0];
        if (!f) return;
        jpeg = await toDeviceJpeg(f, Number(quality.value));
        status.textContent = `${jpeg.length} bytes @ q${quality.value}`;
      }
      fileInput.addEventListener('change', () => void run('reencode', reencode));
      quality.addEventListener('input', () => (qualityLabel.textContent = `JPEG quality: ${quality.value}`));
      quality.addEventListener('change', () => void run('reencode', reencode));

      const sendBtn = action('Send', () =>
        run('sendImage', async () => {
          if (!jpeg) throw new Error('pick a photo first');
          progress.style.display = '';
          progress.value = 0;
          try {
            await bleOrThrow().sendImage(jpeg, (p) => (progress.value = p));
            status.textContent = `sent ${jpeg.length} bytes`;
          } finally {
            progress.style.display = 'none';
          }
        }),
      );

      return el(
        'div',
        {},
        card('Select Image', fileInput, status),
        card('Quality', quality, qualityLabel),
        card('Send', sendBtn, progress),
        card('Clear', outlined('Clear Device Image', () => run('clearImage', () => bleOrThrow().clearImage()))),
      );
    },
  };
}

function gifTextSampleScreen(): Screen {
  const IMAGE_ID = 0;
  return {
    title: 'GIF Text Sample',
    render: () => {
      const log = el('div', { class: 'mono' }, '');
      const progress = el('progress', { max: 1, value: 0 });
      progress.style.display = 'none';
      const addLog = (s: string) => log.prepend(el('div', {}, s));

      const sampleItems = (): DisplayItem[] => {
        const gt = P().gifTextConsts();
        return [
          { layer_id: 0, type: gt.ELEMENT_TYPE_IMAGE, x: gt.POS_CENTER, y: gt.POS_CENTER, resource_id: IMAGE_ID },
          { layer_id: 1, type: gt.ELEMENT_TYPE_TEXT, x: 50, y: 60, font_size: 64, color: { r: 255, g: 0, b: 0 }, text: 'Hello' },
          { layer_id: 2, type: gt.ELEMENT_TYPE_TEXT, x: 220, y: 170, font_size: 48, color: { r: 0, g: 255, b: 0 }, text: 'Hello' },
          { layer_id: 3, type: gt.ELEMENT_TYPE_TEXT, x: 390, y: 280, font_size: 32, color: { r: 0, g: 0, b: 255 }, text: 'Hello' },
        ];
      };

      return el(
        'div',
        {},
        card(
          'Built-in image (ID 0) + 3 diagonal texts',
          action('1. Upload Sample Image (ID 0)', () =>
            run('uploadSample', async () => {
              const data = new Uint8Array(await (await fetch(sampleImageUrl)).arrayBuffer());
              addLog(`[upload] start (${data.length} bytes)`);
              progress.style.display = '';
              progress.value = 0;
              try {
                await bleOrThrow().uploadGifTextImage(IMAGE_ID, data, (p) => (progress.value = p));
                addLog('[upload] complete');
              } finally {
                progress.style.display = 'none';
              }
            }),
          ),
          progress,
          action('2. Query Images', () => run('queryImages', () => bleOrThrow().queryGifTextImages())),
          action('3. Display (Image + 3 Texts)', () =>
            run('display', async () => {
              await bleOrThrow().displayGifTextElements(true, sampleItems());
              addLog('[display] sent (statusBar=true)');
            }),
          ),
          action('4. Display (No Status Bar)', () =>
            run('display', async () => {
              await bleOrThrow().displayGifTextElements(false, sampleItems());
              addLog('[display] sent (statusBar=false)');
            }),
          ),
          outlined('Close Page', () => run('closePage', () => bleOrThrow().closeGifTextPage())),
        ),
        card('Log', log),
      );
    },
  };
}

function gifTextUtilityScreen(): Screen {
  return {
    title: 'GIF Text Utility',
    render: () => {
      const uploadTab = el('div', {});
      const displayTab = el('div', {});
      displayTab.style.display = 'none';
      const uploadBtn = el('div', { class: 'tab active' }, 'Upload');
      const displayBtn = el('div', { class: 'tab' }, 'Display');
      const select = (upload: boolean) => {
        uploadTab.style.display = upload ? '' : 'none';
        displayTab.style.display = upload ? 'none' : '';
        uploadBtn.classList.toggle('active', upload);
        displayBtn.classList.toggle('active', !upload);
      };
      uploadBtn.addEventListener('click', () => select(true));
      displayBtn.addEventListener('click', () => select(false));

      const idSelect = (count: number) => {
        const s = el('select', {});
        for (let i = 0; i < count; i++) s.append(el('option', { value: i }, String(i)));
        return s;
      };
      const gifId = idSelect(10);
      const imageId = idSelect(5);
      let gifData: Uint8Array | undefined;
      let imageData: Uint8Array | undefined;
      const gifPick = outlined('Select GIF', () => {});
      const imagePick = outlined('Select Image', () => {});
      const progress = el('progress', { max: 1, value: 0 });
      progress.style.display = 'none';
      const gifFile = el('input', { type: 'file', accept: 'image/gif,image/*' });
      const imageFile = el('input', { type: 'file', accept: 'image/*' });
      gifFile.style.display = 'none';
      imageFile.style.display = 'none';
      gifPick.addEventListener('click', () => gifFile.click());
      imagePick.addEventListener('click', () => imageFile.click());
      gifFile.addEventListener('change', () =>
        void run('selectGif', async () => {
          const f = gifFile.files?.[0];
          if (!f) return;
          gifData = new Uint8Array(await f.arrayBuffer());
          gifPick.textContent = `GIF: ${gifData.length} bytes`;
        }),
      );
      imageFile.addEventListener('change', () =>
        void run('selectImage', async () => {
          const f = imageFile.files?.[0];
          if (!f) return;
          imageData = await toDeviceJpeg(f, 80);
          imagePick.textContent = `Image: ${imageData.length} bytes`;
        }),
      );
      const statusList = el('div', {}, el('p', { class: 'muted' }, 'No status yet'));
      if (ble) {
        ble.onGifTextStatus = (items) => {
          statusList.replaceChildren(
            ...(items.length
              ? items.map((it) => el('div', { class: 'listrow' }, `id=${it.id} status=${it.status} size=${it.file_size}`))
              : [el('p', { class: 'muted' }, 'No status yet')]),
          );
        };
      }
      uploadTab.append(
        card('GIF Upload', field('GIF ID', gifId), gifPick, gifFile, action('Upload GIF', () =>
          run('uploadGif', async () => {
            if (!gifData) throw new Error('select a GIF first');
            progress.style.display = '';
            progress.value = 0;
            try {
              await bleOrThrow().uploadGifTextGif(Number(gifId.value), gifData, (p) => (progress.value = p));
            } finally {
              progress.style.display = 'none';
            }
          }),
        )),
        card('Image Upload', field('Image ID', imageId), imagePick, imageFile, action('Upload Image', () =>
          run('uploadImage', async () => {
            if (!imageData) throw new Error('select an image first');
            progress.style.display = '';
            progress.value = 0;
            try {
              await bleOrThrow().uploadGifTextImage(Number(imageId.value), imageData, (p) => (progress.value = p));
            } finally {
              progress.style.display = 'none';
            }
          }),
        )),
        progress,
        card('Query', rowEl(
          action('Query GIFs', () => run('queryGifs', () => bleOrThrow().queryGifTextStatus())),
          action('Query Images', () => run('queryImages', () => bleOrThrow().queryGifTextImages())),
        ), statusList),
      );

      const statusBar = el('input', { type: 'checkbox', checked: true });
      const text = textField('Text');
      text.value = 'Hello';
      const removeLayer = numField('Layer', 0);
      const items: DisplayItem[] = [];
      const itemList = el('div', {});
      const renderItems = () => {
        itemList.replaceChildren(
          ...items.map((it) =>
            el('div', { class: 'listrow' }, `layer ${it.layer_id}: type ${it.type}${it.text ? ` "${it.text}"` : ''} (${it.x ?? 0}, ${it.y ?? 0})`),
          ),
        );
      };
      displayTab.append(
        card(
          'Elements',
          el('label', {}, statusBar, ' Status Bar'),
          field('Text', text),
          rowEl(
            outlined('Add Image', () => {
              const gt = P().gifTextConsts();
              items.push({ layer_id: items.length, type: gt.ELEMENT_TYPE_IMAGE, x: gt.POS_CENTER, y: gt.POS_CENTER, resource_id: Number(imageId.value) });
              renderItems();
            }),
            outlined('Add Text', () => {
              const gt = P().gifTextConsts();
              items.push({ layer_id: items.length, type: gt.ELEMENT_TYPE_TEXT, x: 50, y: 50 + items.length * 40, font_size: 48, color: { r: 255, g: 255, b: 255 }, text: text.value });
              renderItems();
            }),
          ),
          itemList,
          rowEl(
            action('Display', () =>
              run('display', () => {
                if (!items.length) throw new Error('add an element first');
                return bleOrThrow().displayGifTextElements(statusBar.checked, items);
              }),
            ),
            outlined('Reset', () => {
              items.length = 0;
              renderItems();
            }),
          ),
        ),
        card('Remove / Close',
          rowEl(field('Layer', removeLayer), outlined('Remove Layer', () =>
            run('removeLayer', () => bleOrThrow().removeGifTextElement(Number(removeLayer.value) || 0)),
          )),
          outlined('Close Page', () => run('closePage', () => bleOrThrow().closeGifTextPage())),
        ),
      );

      return el('div', {}, el('div', { class: 'tabbar' }, uploadBtn, displayBtn), uploadTab, displayTab);
    },
  };
}

reset(scanScreen());
