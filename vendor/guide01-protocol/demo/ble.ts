import {
  type Guide01Protocol,
  type Uuids,
  type TouchEventData,
  type GifTextStatusItem,
  type DisplayItem,
  type MotionItem,
} from '@guide01/protocol';

const CHUNK_GAP_MS = 20;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Guide01Ble {
  private device?: BluetoothDevice;
  private server?: BluetoothRemoteGATTServer;
  private readonly chars = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private readonly writeWithResponse = new Set<string>();
  private readonly uuids: Uuids;

  mtu = 247;

  onTouchEvent?: (event: TouchEventData) => void;
  onGifTextStatus?: (items: GifTextStatusItem[]) => void;
  onDisconnect?: () => void;
  onLog?: (message: string) => void;

  constructor(private readonly protocol: Guide01Protocol) {
    this.uuids = protocol.uuids();
  }

  get connected(): boolean {
    return this.server?.connected ?? false;
  }

  async connect(): Promise<string> {
    const filter = this.protocol.scanFilter();
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        {
          manufacturerData: [
            { companyIdentifier: filter.id, dataPrefix: filter.data as BufferSource },
          ],
        },
      ],
      optionalServices: [
        this.canonicalUuid(this.uuids.SERVICE),
        this.canonicalUuid(this.uuids.SETTINGS_SERVICE),
        this.canonicalUuid('180a'),
        this.canonicalUuid('180f'),
      ],
    });
    this.device = device;
    device.addEventListener('gattserverdisconnected', () => {
      this.chars.clear();
      this.writeWithResponse.clear();
      this.onDisconnect?.();
    });

    const server = await device.gatt!.connect();
    this.server = server;
    this.chars.clear();
    this.writeWithResponse.clear();

    for (const service of await server.getPrimaryServices()) {
      let characteristics: BluetoothRemoteGATTCharacteristic[];
      try {
        characteristics = await service.getCharacteristics();
      } catch {
        continue;
      }
      for (const c of characteristics) {
        const key = this.canonicalUuid(c.uuid);
        this.chars.set(key, c);
        // prefer write-without-response when the char supports it (FILE transfer must be no-response;
        // matches the iOS demo's BLEManager logic). only force with-response when it's the only option.
        if (c.properties.write && !c.properties.writeWithoutResponse) this.writeWithResponse.add(key);
        if (c.properties.notify || c.properties.indicate) {
          try {
            await c.startNotifications();
            c.addEventListener('characteristicvaluechanged', () =>
              this.onValueChanged(c),
            );
          } catch {
          }
        }
      }
    }
    const fileChar = this.chars.get(this.canonicalUuid(this.uuids.FILE));
    if (fileChar) {
      const p = fileChar.properties;
      console.info(
        `[guide01] FILE char props: write(with-resp)=${p.write} writeWithoutResponse=${p.writeWithoutResponse} notify=${p.notify}`,
      );
    }
    this.log(`connected: ${device.name ?? device.id}`);
    return device.name ?? device.id;
  }

  disconnect(): void {
    this.server?.disconnect();
  }

  async write(characteristic: string, bytes: Uint8Array): Promise<void> {
    const key = this.canonicalUuid(characteristic);
    const c = this.chars.get(key);
    if (!c) throw new Error(`characteristic ${characteristic} not found on device`);
    const value = bytes as BufferSource;
    if (this.writeWithResponse.has(key)) await c.writeValueWithResponse(value);
    else await c.writeValueWithoutResponse(value);
  }

  async writeAll(
    characteristic: string,
    messages: Uint8Array[],
    onProgress?: (progress: number) => void,
    gap = CHUNK_GAP_MS,
  ): Promise<void> {
    for (let i = 0; i < messages.length; i++) {
      await this.write(characteristic, messages[i]!);
      onProgress?.((i + 1) / messages.length);
      if (i + 1 < messages.length && gap > 0) await delay(gap);
    }
  }

  private async writeAllAdaptive(
    characteristic: string,
    build: (mtu: number) => Uint8Array[],
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    const candidates = [this.mtu, 247, 185]
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => b - a);
    let lastError: unknown;
    for (const mtu of candidates) {
      try {
        await this.writeAll(characteristic, build(mtu), onProgress);
        this.log(`transfer ok at mtu=${mtu}`);
        return;
      } catch (e) {
        lastError = e;
        this.log(`mtu=${mtu} write failed (${e instanceof Error ? e.message : e}); retrying smaller`);
      }
    }
    throw lastError;
  }

  async read(characteristic: string): Promise<Uint8Array> {
    const c = this.chars.get(this.canonicalUuid(characteristic));
    if (!c) throw new Error(`characteristic ${characteristic} not found on device`);
    const view = await c.readValue();
    return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  }

  setBrightness(value: number) {
    return this.write(this.uuids.BRIGHTNESS, this.protocol.brightness(value));
  }
  setSleepTime(seconds: number) {
    return this.write(this.uuids.SLEEP_TIME, this.protocol.setSleepTime(seconds));
  }
  setTime(timestamp?: number) {
    return this.write(this.uuids.SETTINGS_TIME, this.protocol.setTime(timestamp));
  }
  setWeather(temperature: string) {
    return this.write(this.uuids.WEATHER, this.protocol.weather(temperature));
  }
  sendNotification(name: string, title: string, content: string, time = '') {
    return this.write(
      this.uuids.MSG_NOTIFY,
      this.protocol.notification(name, title, content, time),
    );
  }
  setNotificationDisplayTime(seconds: number) {
    return this.write(this.uuids.CMD, this.protocol.notificationDisplayTime(seconds));
  }
  setScreenMode(side: number) {
    return this.write(this.uuids.CMD, this.protocol.screenMode(side));
  }
  pageSwitchToTime() {
    return this.write(this.uuids.CMD, this.protocol.pageSwitchToTime());
  }
  sendSongInfo(title: string, artist: string) {
    return this.write(this.uuids.LYRIC, this.protocol.songInfo(title, artist));
  }
  sendLyric(line1: string, line2: string, line3: string) {
    return this.write(this.uuids.LYRIC, this.protocol.lyricData(line1, line2, line3));
  }
  stopLyric() {
    return this.write(this.uuids.LYRIC, this.protocol.lyricStop());
  }
  sendLyricTextColors(
    titleR: number, titleG: number, titleB: number,
    prevR: number, prevG: number, prevB: number,
    curR: number, curG: number, curB: number,
    nextR: number, nextG: number, nextB: number,
  ) {
    return this.write(
      this.uuids.LYRIC,
      this.protocol.lyricTextColors(
        titleR, titleG, titleB, prevR, prevG, prevB, curR, curG, curB, nextR, nextG, nextB,
      ),
    );
  }

  sendImage(jpeg: Uint8Array, onProgress?: (p: number) => void) {
    return this.writeAllAdaptive(
      this.uuids.FILE,
      (mtu) => this.protocol.imageMessages(jpeg, mtu),
      onProgress,
    );
  }
  clearImage() {
    return this.write(
      this.uuids.FILE,
      new Uint8Array([this.protocol.imageConsts().CMD_CLEAR]),
    );
  }

  uploadGifTextImage(imageId: number, data: Uint8Array, onProgress?: (p: number) => void) {
    return this.writeAllAdaptive(
      this.uuids.FILE,
      (mtu) => this.protocol.gifTextImageMessages(imageId, data, mtu),
      onProgress,
    );
  }
  uploadGifTextGif(gifId: number, data: Uint8Array, onProgress?: (p: number) => void) {
    return this.writeAllAdaptive(
      this.uuids.FILE,
      (mtu) => this.protocol.gifTextGifMessages(gifId, data, mtu),
      onProgress,
    );
  }
  displayGifTextImageCenter(imageId: number) {
    return this.write(
      this.uuids.GIF_TEXT_DISPLAY,
      this.protocol.gifTextDisplayImageCenter(imageId),
    );
  }
  displayGifTextElements(showStatusBar: boolean, items: DisplayItem[]) {
    return this.write(
      this.uuids.GIF_TEXT_DISPLAY,
      this.protocol.gifTextDisplayElements(showStatusBar, items),
    );
  }
  removeGifTextElement(layerId: number) {
    return this.write(this.uuids.GIF_TEXT_DISPLAY, this.protocol.gifTextRemoveElement(layerId));
  }
  closeGifTextPage() {
    return this.write(this.uuids.GIF_TEXT_DISPLAY, this.protocol.gifTextClosePage());
  }
  queryGifTextImages() {
    return this.write(this.uuids.FILE, this.protocol.gifTextStatusQueryImages());
  }
  queryGifTextStatus() {
    return this.write(this.uuids.FILE, this.protocol.gifTextStatusQueryAllGifs());
  }

  setMotionLayout(groups: number) {
    return this.write(this.uuids.MOTION, this.protocol.motionSetLayout(groups));
  }
  sendMotionData(items: MotionItem[]) {
    return this.write(this.uuids.MOTION, this.protocol.motionData(items));
  }

  async readBattery(): Promise<number> {
    return this.protocol.parseBatteryResponse(await this.read(this.uuids.BATTERY_LEVEL)).level;
  }
  async readBoxBattery(): Promise<number> {
    return this.protocol.parseBatteryResponse(await this.read(this.uuids.BOX_BATTERY)).level;
  }
  readSerialNumber() {
    return this.readString(this.uuids.SERIAL_NUMBER);
  }
  readFirmwareVersion() {
    return this.readString(this.uuids.FIRMWARE_REV);
  }
  readHardwareVersion() {
    return this.readString(this.uuids.HARDWARE_REV);
  }
  readSoftwareVersion() {
    return this.readString(this.uuids.SOFTWARE_REV);
  }

  async readResourceVersion(timeoutMs = 10_000): Promise<string> {
    const version = new Promise<string>((resolve, reject) => {
      this.resourceVersionWaiter = resolve;
      setTimeout(() => {
        if (this.resourceVersionWaiter === resolve) {
          this.resourceVersionWaiter = undefined;
          reject(new Error('resource version: no response'));
        }
      }, timeoutMs);
    });
    await this.write(this.uuids.CMD, this.protocol.resourceVersionQuery());
    return version;
  }

  private resourceVersionWaiter?: (version: string) => void;

  private async readString(uuid: string): Promise<string> {
    return new TextDecoder().decode(await this.read(uuid));
  }

  private onValueChanged(c: BluetoothRemoteGATTCharacteristic): void {
    const view = c.value;
    if (!view) return;
    const bytes = new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
    const resource = this.protocol.parseResourceVersion(bytes);
    if (resource !== null) {
      this.resourceVersionWaiter?.(resource);
      this.resourceVersionWaiter = undefined;
      return;
    }
    try {
      this.onTouchEvent?.(this.protocol.parseTouchEvent(bytes));
      return;
    } catch {
    }
    try {
      this.onGifTextStatus?.(this.protocol.gifTextParseStatusResponse(bytes));
    } catch {
    }
  }

  private canonicalUuid(uuid: string): string {
    const h = uuid.replace(/-/g, '').toLowerCase();
    if (h.length === 4) return `0000${h}-0000-1000-8000-00805f9b34fb`;
    if (h.length === 8) return `${h}-0000-1000-8000-00805f9b34fb`;
    if (h.length === 32) {
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
    return uuid.toLowerCase();
  }

  private log(message: string): void {
    this.onLog?.(message);
  }
}
