const DEFAULT_WASM_PATH = '../../libs/wasm/libguide01_protocol.wasm';

interface WasmExports {
  memory: WebAssembly.Memory;
  __heap_base: WebAssembly.Global;
  g01_get_version(): number;

  g01_get_ble_service_uuid(): number;
  g01_get_ble_settings_service_uuid(): number;
  g01_get_ble_settings_time_char(): number;
  g01_get_ble_msg_notify_char(): number;
  g01_get_ble_file_char(): number;
  g01_get_ble_brightness_char(): number;
  g01_get_ble_battery_level_char(): number;
  g01_get_ble_battery_status_char(): number;
  g01_get_ble_box_battery_char(): number;
  g01_get_ble_weather_char(): number;
  g01_get_ble_lyric_char(): number;
  g01_get_ble_sleep_time_char(): number;
  g01_get_ble_gif_text_display_char(): number;
  g01_get_ble_cmd_char(): number;
  g01_get_ble_motion_char(): number;
  g01_get_ble_serial_number_uuid(): number;
  g01_get_ble_firmware_revision_uuid(): number;
  g01_get_ble_hardware_revision_uuid(): number;
  g01_get_ble_software_revision_uuid(): number;

  g01_brightness(ret: number, value: number): void;
  g01_notification(ret: number, name: number, title: number, content: number, time: number): void;
  g01_notification_display_time(ret: number, seconds: number): void;
  g01_weather(ret: number, temperature: number): void;
  g01_time_set(ret: number, timestamp: number): void;
  g01_page_switch_to_time(ret: number): void;
  g01_screen_mode(ret: number, side: number): void;
  g01_screen_mode_left(ret: number): void;
  g01_screen_mode_right(ret: number): void;

  g01_parse_battery_response(packet: number, len: number, out: number): number;

  g01_song_info(ret: number, title: number, artist: number): void;
  g01_lyric_data(ret: number, line1: number, line2: number, line3: number): void;
  g01_lyric_stop(ret: number): void;
  g01_lyric_text_colors(
    ret: number,
    titleR: number, titleG: number, titleB: number,
    prevR: number, prevG: number, prevB: number,
    curR: number, curG: number, curB: number,
    nextR: number, nextG: number, nextB: number,
  ): void;

  g01_image_info(ret: number, jpeg: number, jpegSize: number, md5: number): void;
  g01_image_chunk(ret: number, chunk: number, chunkSize: number, total: number, idx: number): void;

  g01_image_builder_size(): number;
  g01_image_builder_init(b: number, jpeg: number, jpegSize: number, mtu: number): number;
  g01_image_builder_chunk_count(b: number): number;
  g01_image_builder_info(ret: number, b: number): void;
  g01_image_builder_chunk(ret: number, b: number, idx: number): void;

  g01_gif_text_builder_size(): number;
  g01_gif_text_builder_init_gif(b: number, id: number, data: number, size: number, mtu: number): number;
  g01_gif_text_builder_init_image(b: number, id: number, data: number, size: number, mtu: number): number;
  g01_gif_text_builder_chunk_count(b: number): number;
  g01_gif_text_builder_start(ret: number, b: number): void;
  g01_gif_text_builder_chunk(ret: number, b: number, idx: number): void;

  g01_gif_text_validate_gif_upload(id: number, size: number): number;
  g01_gif_text_validate_image_upload(id: number, size: number): number;
  g01_gif_text_upload_gif(ret: number, id: number, data: number, size: number): void;
  g01_gif_text_upload_image(ret: number, id: number, data: number, size: number): void;
  g01_gif_text_upload_gif_data(ret: number, total: number, idx: number, data: number, size: number): void;
  g01_gif_text_upload_image_data(ret: number, total: number, idx: number, data: number, size: number): void;
  g01_gif_text_display_gif_center(ret: number, id: number): void;
  g01_gif_text_display_gif_at(ret: number, id: number, x: number, y: number): void;
  g01_gif_text_display_gif_with_text(ret: number, id: number, text: number, textY: number): void;
  g01_gif_text_display_image_center(ret: number, id: number): void;
  g01_gif_text_display_elements(ret: number, showStatusBar: number, items: number, count: number): void;
  g01_gif_text_remove_element(ret: number, layerId: number): void;
  g01_gif_text_close_page(ret: number): void;
  g01_gif_text_status_query_gif(ret: number, id: number): void;
  g01_gif_text_status_query_all_gifs(ret: number): void;
  g01_gif_text_status_query_images(ret: number): void;

  g01_parse_gif_text_upload_response(data: number, len: number): number;
  g01_parse_gif_text_status_response(data: number, len: number, out: number): number;
  g01_parse_gif_text_single_gif_status_response(data: number, len: number, out: number): number;

  g01_sleep_time_set(ret: number, seconds: number): void;
  g01_sleep_time_parse(data: number, len: number): number;

  g01_resource_version_query(ret: number): void;
  g01_parse_resource_version_response(data: number, len: number, out: number, outSize: number): number;

  g01_motion_set_layout(ret: number, groups: number): void;
  g01_motion_data(ret: number, items: number, count: number): void;

  g01_get_scan_filter(ret: number): void;
  g01_parse_touch_event(data: number, len: number, out: number): number;

  g01_get_touch_consts(ret: number): void;
  g01_get_gif_text_consts(ret: number): void;
  g01_get_image_consts(ret: number): void;
  g01_get_motion_cmd_consts(ret: number): void;
  g01_get_motion_type_consts(ret: number): void;

  g01_wasm_ret(): number;
  g01_wasm_str(i: number): number;
  g01_wasm_parse_in(): number;
  g01_wasm_struct_out(): number;
  g01_wasm_items(): number;
  g01_wasm_image_builder(): number;
  g01_wasm_gif_builder(): number;
  g01_wasm_item_text(): number;
  g01_wasm_item_text_cap(): number;
}

const WASM_PAGE = 65536;

export interface BatteryData {
  level: number;
}

export interface TouchEventData {
  page_id: number;
  touch_event: number;
}

export interface ScanFilter {
  id: number;
  data: Uint8Array;
}

export interface GifTextStatusItem {
  id: number;
  status: number;
  file_size: number;
  md5_tail: string;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface DisplayItem {
  layer_id: number;
  type: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  resource_id?: number;
  font_size?: number;
  color?: RgbColor;
  text?: string;
}

export interface MotionItem {
  type: number;
  value?: number;
}

export interface TouchConsts {
  NOTIFY_TOUCH_EVENT: number;
  TOUCH_SINGLE_CLICK: number;
  TOUCH_DOUBLE_CLICK: number;
  TOUCH_SWIPE_FORWARD: number;
  TOUCH_SWIPE_BACK: number;
  TOUCH_LONG_PRESS: number;
}

export interface GifTextConsts {
  ELEMENT_TYPE_GIF: number;
  ELEMENT_TYPE_IMAGE: number;
  ELEMENT_TYPE_TEXT: number;
  RESULT_READY: number;
  RESULT_INVALID_ID: number;
  RESULT_FILE_TOO_LARGE: number;
  RESULT_NO_STORAGE: number;
  RESULT_MD5_FAILED: number;
  RESULT_WRITE_FAILED: number;
  RESULT_PACKET_LOST: number;
  STATUS_NOT_EXISTS: number;
  STATUS_UPLOADED: number;
  SCREEN_WIDTH: number;
  SCREEN_HEIGHT: number;
  CONTENT_HEIGHT: number;
  POS_CENTER: number;
  MAX_GIF_SIZE: number;
  MAX_GIF_COUNT: number;
  MAX_IMAGE_COUNT: number;
  CMD_GIF_UPLOAD_START: number;
  CMD_GIF_STATUS_QUERY: number;
  CMD_IMAGE_UPLOAD_START: number;
  CMD_IMAGE_STATUS_QUERY: number;
}

export interface ImageConsts {
  CMD_INFO: number;
  CMD_CHUNK: number;
  CMD_CLEAR: number;
  CHUNK_OVERHEAD: number;
}

export interface MotionCmdConsts {
  CMD_SET_LAYOUT: number;
  CMD_DATA: number;
  LAYOUT_ONE: number;
  LAYOUT_TWO: number;
  LAYOUT_THREE: number;
  LAYOUT_FIVE: number;
}

export interface MotionTypeConsts {
  DISTANCE: number;
  SPEED: number;
  AVG_SPEED: number;
  MAX_SPEED: number;
  HEART_RATE: number;
  MAX_HEART_RATE: number;
  CADENCE: number;
  MAX_CADENCE: number;
  POWER: number;
  MAX_POWER: number;
}

export class WasmHelpers {
  private readonly W: WasmExports;
  private readonly dec = new TextDecoder();
  private readonly enc = new TextEncoder();

  private readonly RET: number;
  private readonly STR: readonly number[];
  private readonly PARSE_IN: number;
  private readonly STRUCT_OUT: number;
  private readonly ITEMS: number;
  private readonly ITEM_TEXT: number;
  private readonly ITEM_TEXT_CAP: number;
  private readonly IMAGE_BUILDER: number;
  private readonly GIF_TEXT_BUILDER: number;
  private readonly FILE_OFFSET: number;

  constructor(private readonly inst: WebAssembly.Instance) {
    this.W = inst.exports as unknown as WasmExports;
    const W = this.W;
    this.RET = W.g01_wasm_ret();
    this.STR = [W.g01_wasm_str(0), W.g01_wasm_str(1), W.g01_wasm_str(2), W.g01_wasm_str(3)];
    this.PARSE_IN = W.g01_wasm_parse_in();
    this.STRUCT_OUT = W.g01_wasm_struct_out();
    this.ITEMS = W.g01_wasm_items();
    this.IMAGE_BUILDER = W.g01_wasm_image_builder();
    this.GIF_TEXT_BUILDER = W.g01_wasm_gif_builder();
    this.ITEM_TEXT = W.g01_wasm_item_text();
    this.ITEM_TEXT_CAP = W.g01_wasm_item_text_cap();
    this.FILE_OFFSET = W.__heap_base.value as number;
  }

  private get memory(): ArrayBuffer {
    return this.W.memory.buffer as ArrayBuffer;
  }

  private u8(): Uint8Array {
    return new Uint8Array(this.memory);
  }

  private dv(): DataView {
    return new DataView(this.memory);
  }

  private ensureMemory(offset: number, len: number): void {
    const need = Math.ceil((offset + len) / WASM_PAGE);
    const have = this.memory.byteLength / WASM_PAGE;
    if (need > have) this.W.memory.grow(need - have);
  }

  private cstr(ptr: number): string {
    const m = this.u8();
    let e = ptr;
    while (m[e] !== 0) e++;
    return this.dec.decode(m.subarray(ptr, e));
  }

  private writeUtf8(ptr: number, s: string, cap?: number): number {
    const b = this.enc.encode(s);
    if (cap !== undefined && b.length + 1 > cap) {
      throw new RangeError(`string too long: ${b.length + 1} bytes exceeds ${cap}-byte slot`);
    }
    this.u8().set(b, ptr);
    this.u8()[ptr + b.length] = 0;
    return b.length + 1;
  }

  private str(i: number, s: string): number {
    const ptr = this.STR[i];
    if (ptr === undefined) throw new RangeError(`string slot ${i} out of range`);
    this.writeUtf8(ptr, s, 0x100);
    return ptr;
  }

  private writeInput(data: Uint8Array): number {
    this.ensureMemory(this.PARSE_IN, data.length);
    this.u8().set(data, this.PARSE_IN);
    return this.PARSE_IN;
  }

  private callBuf(fn: (ret: number, ...rest: number[]) => void, ...args: number[]): Uint8Array {
    fn(this.RET, ...args);
    const p = this.dv().getUint32(this.RET, true);
    const sz = this.dv().getUint32(this.RET + 4, true);
    return new Uint8Array(this.memory.slice(p, p + sz));
  }

  private hexTail(off: number, len: number): string {
    const m = this.u8();
    let s = '';
    for (let i = 0; i < len; i++) s += m[off + i]!.toString(16).padStart(2, '0');
    return s;
  }

  version(): string {
    return this.cstr(this.W.g01_get_version());
  }

  uuids(): Record<string, string> {
    const u = (p: number): string => this.cstr(p).replace(/-/g, '').toLowerCase();
    return {
      SERVICE: u(this.W.g01_get_ble_service_uuid()),
      SETTINGS_SERVICE: u(this.W.g01_get_ble_settings_service_uuid()),
      SETTINGS_TIME: u(this.W.g01_get_ble_settings_time_char()),
      MSG_NOTIFY: u(this.W.g01_get_ble_msg_notify_char()),
      FILE: u(this.W.g01_get_ble_file_char()),
      BRIGHTNESS: u(this.W.g01_get_ble_brightness_char()),
      BATTERY_LEVEL: u(this.W.g01_get_ble_battery_level_char()),
      BATTERY_STATUS: u(this.W.g01_get_ble_battery_status_char()),
      BOX_BATTERY: u(this.W.g01_get_ble_box_battery_char()),
      WEATHER: u(this.W.g01_get_ble_weather_char()),
      LYRIC: u(this.W.g01_get_ble_lyric_char()),
      SLEEP_TIME: u(this.W.g01_get_ble_sleep_time_char()),
      GIF_TEXT_DISPLAY: u(this.W.g01_get_ble_gif_text_display_char()),
      CMD: u(this.W.g01_get_ble_cmd_char()),
      MOTION: u(this.W.g01_get_ble_motion_char()),
      SERIAL_NUMBER: u(this.W.g01_get_ble_serial_number_uuid()),
      FIRMWARE_REV: u(this.W.g01_get_ble_firmware_revision_uuid()),
      HARDWARE_REV: u(this.W.g01_get_ble_hardware_revision_uuid()),
      SOFTWARE_REV: u(this.W.g01_get_ble_software_revision_uuid()),
    };
  }

  brightness(value: number): Uint8Array {
    return this.callBuf(this.W.g01_brightness, value);
  }

  notification(name: string, title: string, content: string, time: string): Uint8Array {
    const n = this.str(0, name);
    const t = this.str(1, title);
    const c = this.str(2, content);
    const tm = this.str(3, time);
    return this.callBuf(this.W.g01_notification, n, t, c, tm);
  }

  notificationDisplayTime(seconds: number): Uint8Array {
    return this.callBuf(this.W.g01_notification_display_time, seconds);
  }

  weather(temperature: string): Uint8Array {
    return this.callBuf(this.W.g01_weather, this.str(0, temperature));
  }

  timeSet(timestamp: number): Uint8Array {
    return this.callBuf(this.W.g01_time_set, timestamp >>> 0);
  }

  pageSwitchToTime(): Uint8Array {
    return this.callBuf(this.W.g01_page_switch_to_time);
  }

  screenMode(side: number): Uint8Array {
    return this.callBuf(this.W.g01_screen_mode, side);
  }

  screenModeLeft(): Uint8Array {
    return this.callBuf(this.W.g01_screen_mode_left);
  }

  screenModeRight(): Uint8Array {
    return this.callBuf(this.W.g01_screen_mode_right);
  }

  parseBatteryResponse(data: Uint8Array): BatteryData {
    const inp = this.writeInput(data);
    const out = this.STRUCT_OUT;
    const rc = this.W.g01_parse_battery_response(inp, data.length, out);
    if (rc < 0) throw new Error(`parse_battery_response rc=${rc}`);
    return { level: this.u8()[out]! };
  }

  songInfo(title: string, artist: string): Uint8Array {
    return this.callBuf(this.W.g01_song_info, this.str(0, title), this.str(1, artist));
  }

  lyricData(line1: string, line2: string, line3: string): Uint8Array {
    return this.callBuf(
      this.W.g01_lyric_data,
      this.str(0, line1),
      this.str(1, line2),
      this.str(2, line3),
    );
  }

  lyricStop(): Uint8Array {
    return this.callBuf(this.W.g01_lyric_stop);
  }

  lyricTextColors(
    titleR: number, titleG: number, titleB: number,
    prevR: number, prevG: number, prevB: number,
    curR: number, curG: number, curB: number,
    nextR: number, nextG: number, nextB: number,
  ): Uint8Array {
    return this.callBuf(
      this.W.g01_lyric_text_colors,
      titleR, titleG, titleB,
      prevR, prevG, prevB,
      curR, curG, curB,
      nextR, nextG, nextB,
    );
  }

  imageInfo(jpeg: Uint8Array, md5HexBytes: Uint8Array): Uint8Array {
    const jp = this.writeInput(jpeg);
    const md5 = this.PARSE_IN + jpeg.length;
    this.ensureMemory(md5, 32);
    const m = this.u8();
    m.fill(0, md5, md5 + 32);
    m.set(md5HexBytes.subarray(0, 32), md5);
    return this.callBuf(this.W.g01_image_info, jp, jpeg.length, md5);
  }

  imageChunk(chunk: Uint8Array, totalChunks: number, chunkIndex: number): Uint8Array {
    const p = this.writeInput(chunk);
    return this.callBuf(this.W.g01_image_chunk, p, chunk.length, totalChunks, chunkIndex);
  }

  imageMessages(jpeg: Uint8Array, mtu: number): Uint8Array[] {
    this.ensureMemory(this.FILE_OFFSET, jpeg.length);
    this.u8().set(jpeg, this.FILE_OFFSET);

    const B = this.IMAGE_BUILDER;
    const rc = this.W.g01_image_builder_init(B, this.FILE_OFFSET, jpeg.length, mtu);
    if (rc < 0) throw new Error(`image_builder_init rc=${rc}`);

    const chunkCount = this.W.g01_image_builder_chunk_count(B);
    const out: Uint8Array[] = [this.callBuf(this.W.g01_image_builder_info, B)];
    for (let i = 0; i < chunkCount; i++) {
      out.push(this.callBuf(this.W.g01_image_builder_chunk, B, i));
    }
    return out;
  }

  private gifTextMessages(id: number, file: Uint8Array, mtu: number, isImage: boolean): Uint8Array[] {
    this.ensureMemory(this.FILE_OFFSET, file.length);
    this.u8().set(file, this.FILE_OFFSET);

    const B = this.GIF_TEXT_BUILDER;
    const init = isImage
      ? this.W.g01_gif_text_builder_init_image
      : this.W.g01_gif_text_builder_init_gif;
    const rc = init(B, id, this.FILE_OFFSET, file.length, mtu);
    if (rc < 0) throw new Error(`gif_text_builder_init rc=${rc}`);

    const chunkCount = this.W.g01_gif_text_builder_chunk_count(B);
    const out: Uint8Array[] = [this.callBuf(this.W.g01_gif_text_builder_start, B)];
    for (let i = 0; i < chunkCount; i++) {
      out.push(this.callBuf(this.W.g01_gif_text_builder_chunk, B, i));
    }
    return out;
  }

  gifTextGifMessages(gifId: number, file: Uint8Array, mtu: number): Uint8Array[] {
    return this.gifTextMessages(gifId, file, mtu, false);
  }

  gifTextImageMessages(imageId: number, file: Uint8Array, mtu: number): Uint8Array[] {
    return this.gifTextMessages(imageId, file, mtu, true);
  }

  gifTextValidateGifUpload(gifId: number, fileSize: number): number {
    return this.W.g01_gif_text_validate_gif_upload(gifId, fileSize >>> 0);
  }

  gifTextValidateImageUpload(imageId: number, fileSize: number): number {
    return this.W.g01_gif_text_validate_image_upload(imageId, fileSize >>> 0);
  }

  gifTextUploadGif(gifId: number, file: Uint8Array): Uint8Array {
    if (file.length === 0) throw new Error('file_data is empty');
    const rc = this.gifTextValidateGifUpload(gifId, file.length);
    if (rc !== 0) {
      throw new Error(`gif_text_upload_gif validation error: ${rc} (gif_id=${gifId}, size=${file.length})`);
    }
    const p = this.writeInput(file);
    return this.callBuf(this.W.g01_gif_text_upload_gif, gifId, p, file.length);
  }

  gifTextUploadImage(imageId: number, file: Uint8Array): Uint8Array {
    if (file.length === 0) throw new Error('file_data is empty');
    const rc = this.gifTextValidateImageUpload(imageId, file.length);
    if (rc !== 0) {
      throw new Error(`gif_text_upload_image validation error: ${rc} (image_id=${imageId}, size=${file.length})`);
    }
    const p = this.writeInput(file);
    return this.callBuf(this.W.g01_gif_text_upload_image, imageId, p, file.length);
  }

  gifTextUploadGifData(totalPackets: number, currentIndex: number, data: Uint8Array): Uint8Array {
    const p = this.writeInput(data);
    return this.callBuf(this.W.g01_gif_text_upload_gif_data, totalPackets, currentIndex, p, data.length);
  }

  gifTextUploadImageData(totalPackets: number, currentIndex: number, data: Uint8Array): Uint8Array {
    const p = this.writeInput(data);
    return this.callBuf(this.W.g01_gif_text_upload_image_data, totalPackets, currentIndex, p, data.length);
  }

  gifTextDisplayGifCenter(gifId: number): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_display_gif_center, gifId);
  }

  gifTextDisplayGifAt(gifId: number, x: number, y: number): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_display_gif_at, gifId, x, y);
  }

  gifTextDisplayGifWithText(gifId: number, text: string, textY: number): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_display_gif_with_text, gifId, this.str(0, text), textY);
  }

  gifTextDisplayImageCenter(imageId: number): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_display_image_center, imageId);
  }

  gifTextDisplayElements(showStatusBar: boolean, items: DisplayItem[]): Uint8Array {
    const ITEM_SIZE = 20;
    const m = this.u8();
    const dv = this.dv();
    let textPtr = this.ITEM_TEXT;
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      const off = this.ITEMS + i * ITEM_SIZE;
      m[off + 0] = it.layer_id;
      m[off + 1] = it.type;
      dv.setUint16(off + 2, it.x ?? 0, true);
      dv.setUint16(off + 4, it.y ?? 0, true);
      dv.setUint16(off + 6, it.width ?? 0, true);
      dv.setUint16(off + 8, it.height ?? 0, true);
      m[off + 10] = it.resource_id ?? 0;
      m[off + 11] = it.font_size ?? 0;
      m[off + 12] = it.color?.r ?? 0;
      m[off + 13] = it.color?.g ?? 0;
      m[off + 14] = it.color?.b ?? 0;
      m[off + 15] = 0;
      if (it.text !== undefined && it.text.length > 0) {
        const here = textPtr;
        textPtr += this.writeUtf8(textPtr, it.text, this.ITEM_TEXT + this.ITEM_TEXT_CAP - here);
        dv.setUint32(off + 16, here, true);
      } else {
        dv.setUint32(off + 16, 0, true);
      }
    }
    return this.callBuf(
      this.W.g01_gif_text_display_elements,
      showStatusBar ? 1 : 0,
      this.ITEMS,
      items.length,
    );
  }

  gifTextRemoveElement(layerId: number): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_remove_element, layerId);
  }

  gifTextClosePage(): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_close_page);
  }

  gifTextStatusQueryGif(gifId: number): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_status_query_gif, gifId);
  }

  gifTextStatusQueryAllGifs(): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_status_query_all_gifs);
  }

  gifTextStatusQueryImages(): Uint8Array {
    return this.callBuf(this.W.g01_gif_text_status_query_images);
  }

  gifTextParseUploadResponse(data: Uint8Array): number {
    const p = this.writeInput(data);
    const rc = this.W.g01_parse_gif_text_upload_response(p, data.length);
    if (rc < 0) throw new Error(`gif_text_parse_upload_response error: ${rc}`);
    return rc;
  }

  gifTextParseStatusResponse(data: Uint8Array): GifTextStatusItem[] {
    const inp = this.writeInput(data);
    const out = this.STRUCT_OUT;
    this.u8().fill(0, out, out + 124);
    const rc = this.W.g01_parse_gif_text_status_response(inp, data.length, out);
    if (rc < 0) throw new Error(`gif_text_parse_status_response error: ${rc}`);
    const m = this.u8();
    const dv = this.dv();
    const count = m[out]!;
    const items: GifTextStatusItem[] = [];
    for (let i = 0; i < count; i++) {
      const off = out + 4 + i * 12;
      items.push({
        id: m[off]!,
        status: m[off + 1]!,
        file_size: dv.getUint32(off + 4, true),
        md5_tail: this.hexTail(off + 8, 4),
      });
    }
    return items;
  }

  gifTextParseSingleGifStatusResponse(data: Uint8Array): GifTextStatusItem {
    const inp = this.writeInput(data);
    const out = this.STRUCT_OUT;
    this.u8().fill(0, out, out + 12);
    const rc = this.W.g01_parse_gif_text_single_gif_status_response(inp, data.length, out);
    if (rc < 0) {
      throw new Error(`gif_text_parse_single_gif_status_response error: ${rc}`);
    }
    const m = this.u8();
    const dv = this.dv();
    return {
      id: m[out]!,
      status: m[out + 1]!,
      file_size: dv.getUint32(out + 4, true),
      md5_tail: this.hexTail(out + 8, 4),
    };
  }

  setSleepTime(seconds: number): Uint8Array {
    return this.callBuf(this.W.g01_sleep_time_set, seconds);
  }

  parseSleepTime(data: Uint8Array): number {
    const p = this.writeInput(data);
    const rc = this.W.g01_sleep_time_parse(p, data.length);
    if (rc < 0) throw new Error(`parse_sleep_time error: ${rc}`);
    return rc;
  }

  resourceVersionQuery(): Uint8Array {
    return this.callBuf(this.W.g01_resource_version_query);
  }

  parseResourceVersion(data: Uint8Array): string | null {
    const p = this.writeInput(data);
    const out = this.STRUCT_OUT;
    const rc = this.W.g01_parse_resource_version_response(p, data.length, out, 256);
    if (rc < 0) return null;
    return this.cstr(out);
  }

  motionSetLayout(groups: number): Uint8Array {
    return this.callBuf(this.W.g01_motion_set_layout, groups);
  }

  motionData(items: MotionItem[]): Uint8Array {
    const ITEM_SIZE = 12;
    const m = this.u8();
    const dv = this.dv();
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      const off = this.ITEMS + i * ITEM_SIZE;
      m[off + 0] = it.type;
      m[off + 1] = 0;
      m[off + 2] = 0;
      m[off + 3] = 0;
      dv.setUint32(off + 4, (it.value ?? 0) >>> 0, true);
      dv.setUint32(off + 8, 0, true);
    }
    const buf = this.callBuf(this.W.g01_motion_data, this.ITEMS, items.length);
    if (buf.length === 0) throw new Error('motion_data: invalid items');
    return buf;
  }

  scanFilter(): ScanFilter {
    this.W.g01_get_scan_filter(this.RET);
    const dv = this.dv();
    const id = dv.getUint16(this.RET, true);
    const p = dv.getUint32(this.RET + 4, true);
    const n = dv.getUint32(this.RET + 8, true);
    return { id, data: new Uint8Array(this.memory.slice(p, p + n)) };
  }

  parseTouchEvent(data: Uint8Array): TouchEventData {
    const inp = this.writeInput(data);
    const out = this.STRUCT_OUT;
    const rc = this.W.g01_parse_touch_event(inp, data.length, out);
    if (rc < 0) throw new Error(`parse_touch_event error: ${rc}`);
    const m = this.u8();
    return { page_id: m[out]!, touch_event: m[out + 1]! };
  }

  touchConsts(): TouchConsts {
    const p = this.STRUCT_OUT;
    this.W.g01_get_touch_consts(p);
    const m = this.u8();
    return {
      NOTIFY_TOUCH_EVENT: m[p]!,
      TOUCH_SINGLE_CLICK: m[p + 1]!,
      TOUCH_DOUBLE_CLICK: m[p + 2]!,
      TOUCH_SWIPE_FORWARD: m[p + 3]!,
      TOUCH_SWIPE_BACK: m[p + 4]!,
      TOUCH_LONG_PRESS: m[p + 5]!,
    };
  }

  gifTextConsts(): GifTextConsts {
    const p = this.STRUCT_OUT;
    this.W.g01_get_gif_text_consts(p);
    const m = this.u8();
    const dv = this.dv();
    return {
      ELEMENT_TYPE_GIF: m[p + 0]!,
      ELEMENT_TYPE_IMAGE: m[p + 1]!,
      ELEMENT_TYPE_TEXT: m[p + 2]!,
      RESULT_READY: m[p + 3]!,
      RESULT_INVALID_ID: m[p + 4]!,
      RESULT_FILE_TOO_LARGE: m[p + 5]!,
      RESULT_NO_STORAGE: m[p + 6]!,
      RESULT_MD5_FAILED: m[p + 7]!,
      RESULT_WRITE_FAILED: m[p + 8]!,
      RESULT_PACKET_LOST: m[p + 9]!,
      STATUS_NOT_EXISTS: m[p + 10]!,
      STATUS_UPLOADED: m[p + 11]!,
      SCREEN_WIDTH: dv.getUint16(p + 12, true),
      SCREEN_HEIGHT: dv.getUint16(p + 14, true),
      CONTENT_HEIGHT: dv.getUint16(p + 16, true),
      POS_CENTER: dv.getUint16(p + 18, true),
      MAX_GIF_SIZE: dv.getUint32(p + 20, true),
      MAX_GIF_COUNT: m[p + 24]!,
      MAX_IMAGE_COUNT: m[p + 25]!,
      CMD_GIF_UPLOAD_START: m[p + 26]!,
      CMD_GIF_STATUS_QUERY: m[p + 27]!,
      CMD_IMAGE_UPLOAD_START: m[p + 28]!,
      CMD_IMAGE_STATUS_QUERY: m[p + 29]!,
    };
  }

  imageConsts(): ImageConsts {
    const p = this.STRUCT_OUT;
    this.W.g01_get_image_consts(p);
    const m = this.u8();
    return {
      CMD_INFO: m[p]!,
      CMD_CHUNK: m[p + 1]!,
      CMD_CLEAR: m[p + 2]!,
      CHUNK_OVERHEAD: m[p + 3]!,
    };
  }

  motionCmdConsts(): MotionCmdConsts {
    const p = this.STRUCT_OUT;
    this.W.g01_get_motion_cmd_consts(p);
    const m = this.u8();
    return {
      CMD_SET_LAYOUT: m[p]!,
      CMD_DATA: m[p + 1]!,
      LAYOUT_ONE: m[p + 2]!,
      LAYOUT_TWO: m[p + 3]!,
      LAYOUT_THREE: m[p + 4]!,
      LAYOUT_FIVE: m[p + 5]!,
    };
  }

  motionTypeConsts(): MotionTypeConsts {
    const p = this.STRUCT_OUT;
    this.W.g01_get_motion_type_consts(p);
    const m = this.u8();
    return {
      DISTANCE: m[p]!,
      SPEED: m[p + 1]!,
      AVG_SPEED: m[p + 2]!,
      MAX_SPEED: m[p + 3]!,
      HEART_RATE: m[p + 4]!,
      MAX_HEART_RATE: m[p + 5]!,
      CADENCE: m[p + 6]!,
      MAX_CADENCE: m[p + 7]!,
      POWER: m[p + 8]!,
      MAX_POWER: m[p + 9]!,
    };
  }
}

async function instantiateWasm(
  source: BufferSource | WebAssembly.Module,
): Promise<WasmHelpers> {
  const mod =
    source instanceof WebAssembly.Module ? source : await WebAssembly.compile(source);
  const inst = await WebAssembly.instantiate(mod, {});
  return new WasmHelpers(inst);
}

export async function initWasmFromBytes(bytes: BufferSource): Promise<WasmHelpers> {
  return instantiateWasm(bytes);
}

export async function initWasmFromUrl(url: string | URL): Promise<WasmHelpers> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to fetch wasm (${res.status} ${res.statusText}): ${url}`);
  }
  return instantiateWasm(await res.arrayBuffer());
}

export async function initWasm(wasmPath?: string): Promise<WasmHelpers> {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const path = wasmPath ?? process.env['GUIDE01_WASM'] ?? resolve(here, DEFAULT_WASM_PATH);
  return instantiateWasm(await readFile(path));
}
