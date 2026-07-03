import {
  type DisplayItem,
  type GifTextStatusItem,
  type Guide01Protocol,
  type MotionItem,
  type TouchEventData,
  type Uuids,
} from '@guide01/protocol';

const CHUNK_GAP_MS = 20;
const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

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

  async connect(options: { relaxedScan?: boolean } = {}): Promise<string> {
    const filter = this.protocol.scanFilter();
    const optionalServices = [
        this.canonicalUuid(this.uuids.SERVICE),
        this.canonicalUuid(this.uuids.SETTINGS_SERVICE),
        this.canonicalUuid('180a'),
        this.canonicalUuid('180f'),
    ];
    const device = await navigator.bluetooth.requestDevice(
      options.relaxedScan
        ? {
            acceptAllDevices: true,
            optionalServices,
          }
        : {
            filters: [
              {
                manufacturerData: [
                  { companyIdentifier: filter.id, dataPrefix: filter.data as BufferSource },
                ],
              },
            ],
            optionalServices,
          },
    );

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

      for (const characteristic of characteristics) {
        const key = this.canonicalUuid(characteristic.uuid);
        this.chars.set(key, characteristic);
        if (characteristic.properties.write && !characteristic.properties.writeWithoutResponse) {
          this.writeWithResponse.add(key);
        }
        if (characteristic.properties.notify || characteristic.properties.indicate) {
          try {
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', () =>
              this.onValueChanged(characteristic),
            );
          } catch {
          }
        }
      }
    }

    this.log(`connected: ${device.name ?? device.id}`);
    return device.name ?? device.id;
  }

  disconnect(): void {
    this.server?.disconnect();
  }

  async write(characteristic: string, bytes: Uint8Array): Promise<void> {
    const key = this.canonicalUuid(characteristic);
    const characteristicRef = this.chars.get(key);
    if (!characteristicRef) throw new Error(`characteristic ${characteristic} not found on device`);
    const value = bytes as BufferSource;
    if (this.writeWithResponse.has(key)) await characteristicRef.writeValueWithResponse(value);
    else await characteristicRef.writeValueWithoutResponse(value);
  }

  async writeAll(
    characteristic: string,
    messages: Uint8Array[],
    onProgress?: (progress: number) => void,
    gap = CHUNK_GAP_MS,
  ): Promise<void> {
    for (let i = 0; i < messages.length; i += 1) {
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
      .filter((value, index, all) => all.indexOf(value) === index)
      .sort((a, b) => b - a);
    let lastError: unknown;

    for (const mtu of candidates) {
      try {
        await this.writeAll(characteristic, build(mtu), onProgress);
        this.log(`transfer ok at mtu=${mtu}`);
        return;
      } catch (error) {
        lastError = error;
        this.log(`mtu=${mtu} write failed (${error instanceof Error ? error.message : error}); retrying smaller`);
      }
    }
    throw lastError;
  }

  async read(characteristic: string): Promise<Uint8Array> {
    const characteristicRef = this.chars.get(this.canonicalUuid(characteristic));
    if (!characteristicRef) throw new Error(`characteristic ${characteristic} not found on device`);
    const view = await characteristicRef.readValue();
    return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  }

  displayGifTextElements(showStatusBar: boolean, items: DisplayItem[]) {
    return this.write(
      this.uuids.GIF_TEXT_DISPLAY,
      this.protocol.gifTextDisplayElements(showStatusBar, items),
    );
  }

  closeGifTextPage() {
    return this.write(this.uuids.GIF_TEXT_DISPLAY, this.protocol.gifTextClosePage());
  }

  setTime(timestamp?: number) {
    return this.write(this.uuids.SETTINGS_TIME, this.protocol.setTime(timestamp));
  }

  sendNotification(name: string, title: string, content: string, time = '') {
    return this.write(
      this.uuids.MSG_NOTIFY,
      this.protocol.notification(name, title, content, time),
    );
  }

  sendImage(jpeg: Uint8Array, onProgress?: (progress: number) => void) {
    return this.writeAllAdaptive(
      this.uuids.FILE,
      (mtu) => this.protocol.imageMessages(jpeg, mtu),
      onProgress,
    );
  }

  setMotionLayout(groups: number) {
    return this.write(this.uuids.MOTION, this.protocol.motionSetLayout(groups));
  }

  sendMotionData(items: MotionItem[]) {
    return this.write(this.uuids.MOTION, this.protocol.motionData(items));
  }

  private onValueChanged(characteristic: BluetoothRemoteGATTCharacteristic): void {
    const view = characteristic.value;
    if (!view) return;
    const bytes = new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));

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
