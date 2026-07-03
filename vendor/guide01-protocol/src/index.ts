import { initWasm, initWasmFromUrl, initWasmFromBytes } from './wasm.js';
import type {
  WasmHelpers,
  BatteryData,
  TouchEventData,
  ScanFilter,
  GifTextStatusItem,
  DisplayItem,
  RgbColor,
  MotionItem,
  TouchConsts,
  GifTextConsts,
  ImageConsts,
  MotionCmdConsts,
  MotionTypeConsts,
} from './wasm.js';

export const SCREEN_SIDE_LEFT = 0;
export const SCREEN_SIDE_RIGHT = 1;

export interface Uuids {
  SERVICE: string;
  SETTINGS_SERVICE: string;
  SETTINGS_TIME: string;
  MSG_NOTIFY: string;
  FILE: string;
  BRIGHTNESS: string;
  BATTERY_LEVEL: string;
  BATTERY_STATUS: string;
  BOX_BATTERY: string;
  WEATHER: string;
  LYRIC: string;
  SLEEP_TIME: string;
  GIF_TEXT_DISPLAY: string;
  CMD: string;
  MOTION: string;
  SERIAL_NUMBER: string;
  FIRMWARE_REV: string;
  HARDWARE_REV: string;
  SOFTWARE_REV: string;
}

export type {
  BatteryData,
  TouchEventData,
  ScanFilter,
  GifTextStatusItem,
  DisplayItem,
  RgbColor,
  MotionItem,
  TouchConsts,
  GifTextConsts,
  ImageConsts,
  MotionCmdConsts,
  MotionTypeConsts,
};

export class Guide01Protocol {
  private constructor(private readonly h: WasmHelpers) {}

  static async load(wasmPath?: string): Promise<Guide01Protocol> {
    return new Guide01Protocol(await initWasm(wasmPath));
  }

  static async loadFromUrl(url: string | URL): Promise<Guide01Protocol> {
    return new Guide01Protocol(await initWasmFromUrl(url));
  }

  static async fromBytes(bytes: BufferSource): Promise<Guide01Protocol> {
    return new Guide01Protocol(await initWasmFromBytes(bytes));
  }

  version(): string {
    return this.h.version();
  }

  uuids(): Uuids {
    return this.h.uuids() as unknown as Uuids;
  }

  notification(name: string, title: string, content: string, time = ''): Uint8Array {
    return this.h.notification(name, title, content, time);
  }

  notificationDisplayTime(seconds: number): Uint8Array {
    return this.h.notificationDisplayTime(seconds);
  }

  brightness(value: number): Uint8Array {
    return this.h.brightness(value);
  }

  parseBatteryResponse(data: Uint8Array): BatteryData {
    return this.h.parseBatteryResponse(data);
  }

  weather(temperature = ''): Uint8Array {
    return this.h.weather(temperature);
  }

  setTime(timestamp?: number): Uint8Array {
    const ts = timestamp ?? Math.floor(Date.now() / 1000);
    return this.h.timeSet(ts);
  }

  pageSwitchToTime(): Uint8Array {
    return this.h.pageSwitchToTime();
  }

  screenMode(side: number): Uint8Array {
    return this.h.screenMode(side);
  }

  screenModeLeft(): Uint8Array {
    return this.h.screenModeLeft();
  }

  screenModeRight(): Uint8Array {
    return this.h.screenModeRight();
  }

  songInfo(title: string, artist: string): Uint8Array {
    return this.h.songInfo(title, artist);
  }

  lyricData(line1 = '', line2 = '', line3 = ''): Uint8Array {
    return this.h.lyricData(line1, line2, line3);
  }

  lyricStop(): Uint8Array {
    return this.h.lyricStop();
  }

  lyricTextColors(
    titleR: number, titleG: number, titleB: number,
    prevR: number, prevG: number, prevB: number,
    curR: number, curG: number, curB: number,
    nextR: number, nextG: number, nextB: number,
  ): Uint8Array {
    return this.h.lyricTextColors(
      titleR, titleG, titleB,
      prevR, prevG, prevB,
      curR, curG, curB,
      nextR, nextG, nextB,
    );
  }

  imageInfo(jpeg: Uint8Array, md5HexBytes: Uint8Array): Uint8Array {
    return this.h.imageInfo(jpeg, md5HexBytes);
  }

  imageChunk(chunk: Uint8Array, totalChunks: number, chunkIndex: number): Uint8Array {
    return this.h.imageChunk(chunk, totalChunks, chunkIndex);
  }

  imageMessages(jpeg: Uint8Array, mtu = 512): Uint8Array[] {
    return this.h.imageMessages(jpeg, mtu);
  }

  gifTextGifMessages(gifId: number, file: Uint8Array, mtu = 512): Uint8Array[] {
    return this.h.gifTextGifMessages(gifId, file, mtu);
  }

  gifTextImageMessages(imageId: number, file: Uint8Array, mtu = 512): Uint8Array[] {
    return this.h.gifTextImageMessages(imageId, file, mtu);
  }

  gifTextValidateGifUpload(gifId: number, fileSize: number): number {
    return this.h.gifTextValidateGifUpload(gifId, fileSize);
  }

  gifTextValidateImageUpload(imageId: number, fileSize: number): number {
    return this.h.gifTextValidateImageUpload(imageId, fileSize);
  }

  gifTextUploadGif(gifId: number, file: Uint8Array): Uint8Array {
    return this.h.gifTextUploadGif(gifId, file);
  }

  gifTextUploadImage(imageId: number, file: Uint8Array): Uint8Array {
    return this.h.gifTextUploadImage(imageId, file);
  }

  gifTextUploadGifData(totalPackets: number, currentIndex: number, data: Uint8Array): Uint8Array {
    return this.h.gifTextUploadGifData(totalPackets, currentIndex, data);
  }

  gifTextUploadImageData(totalPackets: number, currentIndex: number, data: Uint8Array): Uint8Array {
    return this.h.gifTextUploadImageData(totalPackets, currentIndex, data);
  }

  gifTextDisplayGifCenter(gifId: number): Uint8Array {
    return this.h.gifTextDisplayGifCenter(gifId);
  }

  gifTextDisplayGifAt(gifId: number, x: number, y: number): Uint8Array {
    return this.h.gifTextDisplayGifAt(gifId, x, y);
  }

  gifTextDisplayGifWithText(gifId: number, text: string, textY: number): Uint8Array {
    return this.h.gifTextDisplayGifWithText(gifId, text, textY);
  }

  gifTextDisplayImageCenter(imageId: number): Uint8Array {
    return this.h.gifTextDisplayImageCenter(imageId);
  }

  gifTextDisplayElements(showStatusBar: boolean, items: DisplayItem[]): Uint8Array {
    return this.h.gifTextDisplayElements(showStatusBar, items);
  }

  gifTextRemoveElement(layerId: number): Uint8Array {
    return this.h.gifTextRemoveElement(layerId);
  }

  gifTextClosePage(): Uint8Array {
    return this.h.gifTextClosePage();
  }

  gifTextStatusQueryGif(gifId: number): Uint8Array {
    return this.h.gifTextStatusQueryGif(gifId);
  }

  gifTextStatusQueryAllGifs(): Uint8Array {
    return this.h.gifTextStatusQueryAllGifs();
  }

  gifTextStatusQueryImages(): Uint8Array {
    return this.h.gifTextStatusQueryImages();
  }

  gifTextParseUploadResponse(data: Uint8Array): number {
    return this.h.gifTextParseUploadResponse(data);
  }

  gifTextParseStatusResponse(data: Uint8Array): GifTextStatusItem[] {
    return this.h.gifTextParseStatusResponse(data);
  }

  gifTextParseSingleGifStatusResponse(data: Uint8Array): GifTextStatusItem {
    return this.h.gifTextParseSingleGifStatusResponse(data);
  }

  setSleepTime(seconds: number): Uint8Array {
    return this.h.setSleepTime(seconds);
  }

  parseSleepTime(data: Uint8Array): number {
    return this.h.parseSleepTime(data);
  }

  resourceVersionQuery(): Uint8Array {
    return this.h.resourceVersionQuery();
  }

  parseResourceVersion(data: Uint8Array): string | null {
    return this.h.parseResourceVersion(data);
  }

  motionSetLayout(groups: number): Uint8Array {
    return this.h.motionSetLayout(groups);
  }

  motionData(items: MotionItem[]): Uint8Array {
    return this.h.motionData(items);
  }

  scanFilter(): ScanFilter {
    return this.h.scanFilter();
  }

  parseTouchEvent(data: Uint8Array): TouchEventData {
    return this.h.parseTouchEvent(data);
  }

  touchConsts(): TouchConsts {
    return this.h.touchConsts();
  }

  gifTextConsts(): GifTextConsts {
    return this.h.gifTextConsts();
  }

  imageConsts(): ImageConsts {
    return this.h.imageConsts();
  }

  motionCmdConsts(): MotionCmdConsts {
    return this.h.motionCmdConsts();
  }

  motionTypeConsts(): MotionTypeConsts {
    return this.h.motionTypeConsts();
  }
}

export { initWasm, initWasmFromUrl, initWasmFromBytes } from './wasm.js';
