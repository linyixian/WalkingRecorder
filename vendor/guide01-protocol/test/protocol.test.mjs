import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Guide01Protocol,
  SCREEN_SIDE_LEFT,
  SCREEN_SIDE_RIGHT,
} from '../dist/index.js';

const p = await Guide01Protocol.load();

const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
const bytes = (h) => Uint8Array.from(h.match(/../g).map((x) => parseInt(x, 16)));


test('version is 1.0.2', () => {
  assert.equal(p.version(), '1.0.2');
});


test('uuids are lowercase, dash-free, non-empty, all 19 present', () => {
  const u = p.uuids();
  const keys = [
    'SERVICE', 'SETTINGS_SERVICE', 'SETTINGS_TIME', 'MSG_NOTIFY', 'FILE',
    'BRIGHTNESS', 'BATTERY_LEVEL', 'BATTERY_STATUS', 'BOX_BATTERY', 'WEATHER',
    'LYRIC', 'SLEEP_TIME', 'GIF_TEXT_DISPLAY', 'CMD', 'MOTION', 'SERIAL_NUMBER',
    'FIRMWARE_REV', 'HARDWARE_REV', 'SOFTWARE_REV',
  ];
  for (const k of keys) {
    assert.ok(k in u, `missing uuid ${k}`);
    assert.match(u[k], /^[0-9a-f]+$/, `${k}=${u[k]} should be lowercase hex without dashes`);
  }
});

test('motion characteristic resolves to the expected uuid', () => {
  assert.equal(p.uuids().MOTION, 'c259c1bd18d3c348b88d5447aea1b615');
});


test('notification produces a non-empty packet', () => {
  const n = p.notification('App', 'Title', 'Body', '');
  assert.ok(n.length > 0);
});

test('notification_display_time(10) bytes', () => {
  assert.equal(hex(p.notificationDisplayTime(10)), '200c0a');
});


test('brightness(50) bytes', () => {
  assert.equal(hex(p.brightness(50)), '32000000');
});


test('parseBatteryResponse level', () => {
  assert.deepEqual(p.parseBatteryResponse(Uint8Array.of(55)), { level: 55 });
});


test('weather("25") bytes', () => {
  assert.equal(hex(p.weather('25')), '0901010103010101000000323500000000');
});


test('setTime(fixed timestamp) bytes', () => {
  assert.equal(hex(p.setTime(0)), 'b2070101000000040000');
  assert.equal(hex(p.setTime(1700000000)), 'e7070b0e160d14020000');
});

test('pageSwitchToTime bytes', () => {
  assert.equal(hex(p.pageSwitchToTime()), '200a01');
});


test('screen_mode left/right/by-side', () => {
  assert.equal(hex(p.screenModeLeft()), '200200');
  assert.equal(hex(p.screenModeRight()), '200201');
  assert.equal(hex(p.screenMode(SCREEN_SIDE_LEFT)), '200200');
  assert.equal(hex(p.screenMode(SCREEN_SIDE_RIGHT)), '200201');
});


test('lyric helpers bytes', () => {
  assert.equal(hex(p.songInfo('T', 'A')), '010202f00054004100');
  assert.equal(hex(p.lyricData('a', 'b', 'c')), '031e00020202610062006300');
  assert.equal(hex(p.lyricStop()), '02');
  assert.equal(hex(p.lyricTextColors(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)), '040102030405060708090a0b0c');
});


test('imageInfo / imageChunk bytes', () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, ...new Array(100).fill(0), 0xff, 0xd9]);
  const md5 = new TextEncoder().encode('0123456789abcdef0123456789abcdef');
  assert.equal(
    hex(p.imageInfo(jpeg, md5)),
    '21680000003031323334353637383961626364656630313233343536373839616263646566',
  );
  assert.equal(hex(p.imageChunk(Uint8Array.of(1, 2, 3, 4), 2, 0)), '2202000000040001020304e4fb');
});

test('imageMessages yields info packet + chunks', () => {
  const jpeg = new Uint8Array(4096).fill(0xab);
  const msgs = p.imageMessages(jpeg, 180);
  assert.ok(msgs.length >= 2);
  assert.ok(msgs.every((m) => m.length > 0));
});


test('gifText gif/image message builders', () => {
  const gif = Uint8Array.from(new Array(50).keys());
  assert.equal(p.gifTextGifMessages(0, gif, 180).length, 2);
  assert.equal(p.gifTextImageMessages(0, gif, 180).length, 2);
});


test('gifText validate + upload', () => {
  assert.equal(p.gifTextValidateGifUpload(0, 1000), 0);
  const gif = Uint8Array.from(new Array(50).keys());
  assert.equal(hex(p.gifTextUploadGif(0, gif)).slice(0, 12), '310032000000');
  assert.equal(hex(p.gifTextUploadGifData(3, 1, Uint8Array.of(1, 2, 3, 4))), '3203000100040001020304');
  assert.equal(hex(p.gifTextUploadImageData(3, 1, Uint8Array.of(1, 2, 3, 4))), '4203000100040001020304');
});

test('gifTextUploadGif rejects empty file', () => {
  assert.throws(() => p.gifTextUploadGif(0, new Uint8Array(0)));
});


test('gifText display helpers bytes', () => {
  assert.equal(hex(p.gifTextDisplayGifCenter(5)), '7300010000ffffffff0000000005');
  assert.equal(hex(p.gifTextDisplayGifAt(5, 10, 20)), '73000100000a0014000000000005');
  assert.equal(hex(p.gifTextDisplayGifWithText(5, 'hi', 30)), '7300020000ffff640000000000050102ffff1e000000000020ffffff026869');
  assert.equal(hex(p.gifTextDisplayImageCenter(3)), '7300010001ffffffff0000000003');
  assert.equal(hex(p.gifTextRemoveElement(2)), '7502');
  assert.equal(hex(p.gifTextClosePage()), '76');
});

test('gifTextDisplayElements bytes', () => {
  const c = p.gifTextConsts();
  const items = [
    { layer_id: 0, type: c.ELEMENT_TYPE_IMAGE, x: c.POS_CENTER, y: c.POS_CENTER, resource_id: 3 },
    { layer_id: 1, type: c.ELEMENT_TYPE_TEXT, x: 50, y: 60, font_size: 64, color: { r: 255, g: 0, b: 0 }, text: 'Hi' },
  ];
  assert.equal(
    hex(p.gifTextDisplayElements(true, items)),
    '7300020001ffffffff0000000003010232003c000000000040ff0000024869',
  );
});


test('gifText status queries bytes', () => {
  assert.equal(hex(p.gifTextStatusQueryGif(7)), '3307');
  assert.equal(hex(p.gifTextStatusQueryAllGifs()), '33ff');
  assert.equal(hex(p.gifTextStatusQueryImages()), '43');
});


test('gifText parse single gif status round-trip', () => {
  const fileSize = 12345;
  const pkt = Uint8Array.of(
    0x33, 7, 1,
    fileSize & 0xff, (fileSize >> 8) & 0xff, (fileSize >> 16) & 0xff, (fileSize >> 24) & 0xff,
    0xaa, 0xbb, 0xcc, 0xdd,
  );
  assert.deepEqual(p.gifTextParseSingleGifStatusResponse(pkt), {
    id: 7, status: 1, file_size: 12345, md5_tail: 'aabbccdd',
  });
});

test('gifText parse upload response', () => {
  const c = p.gifTextConsts();
  const pkt = Uint8Array.of(c.CMD_GIF_UPLOAD_START, 0, c.RESULT_READY);
  assert.equal(p.gifTextParseUploadResponse(pkt), 0);
});


test('sleep time set + parse round-trip', () => {
  assert.equal(hex(p.setSleepTime(30)), '1e00');
  assert.equal(p.parseSleepTime(p.setSleepTime(45)), 45);
});


test('scanFilter id + data', () => {
  const f = p.scanFilter();
  assert.equal(f.id, 19561);
  assert.equal(hex(f.data), '656e732d7377');
});


test('parseTouchEvent round-trip', () => {
  assert.deepEqual(p.parseTouchEvent(bytes('800140')), { page_id: 1, touch_event: 64 });
  assert.deepEqual(p.parseTouchEvent(bytes('800241')), { page_id: 2, touch_event: 65 });
});


test('resourceVersionQuery bytes + parseResourceVersion', () => {
  assert.equal(hex(p.resourceVersionQuery()), '1001');
  const resp = Uint8Array.from([0x10, 0x01, 0x08, ...new TextEncoder().encode('1.0.1 ja')]);
  assert.equal(p.parseResourceVersion(resp), '1.0.1 ja');
  assert.equal(p.parseResourceVersion(bytes('200200')), null);
});


test('motion layout bytes', () => {
  const ml = p.motionCmdConsts();
  assert.equal(hex(p.motionSetLayout(ml.LAYOUT_ONE)), '0001');
  assert.equal(hex(p.motionSetLayout(ml.LAYOUT_THREE)), '0003');
  assert.equal(hex(p.motionSetLayout(ml.LAYOUT_FIVE)), '0005');
});

test('motionData speed 33 + heart rate 105 (protocol 4.3 example 3)', () => {
  const mt = p.motionTypeConsts();
  const data = p.motionData([
    { type: mt.SPEED, value: 33 },
    { type: mt.HEART_RATE, value: 105 },
  ]);
  assert.equal(hex(data), '020704210000000b0469000000');
});


test('touchConsts values', () => {
  assert.deepEqual(p.touchConsts(), {
    NOTIFY_TOUCH_EVENT: 128,
    TOUCH_SINGLE_CLICK: 64,
    TOUCH_DOUBLE_CLICK: 65,
    TOUCH_SWIPE_FORWARD: 66,
    TOUCH_SWIPE_BACK: 67,
    TOUCH_LONG_PRESS: 68,
  });
});

test('gifTextConsts values', () => {
  const c = p.gifTextConsts();
  assert.equal(c.ELEMENT_TYPE_GIF, 0);
  assert.equal(c.ELEMENT_TYPE_IMAGE, 1);
  assert.equal(c.ELEMENT_TYPE_TEXT, 2);
  assert.equal(c.POS_CENTER, 65535);
  assert.equal(c.SCREEN_WIDTH, 624);
  assert.equal(c.SCREEN_HEIGHT, 405);
  assert.equal(c.CONTENT_HEIGHT, 340);
  assert.equal(c.MAX_GIF_SIZE, 102400);
  assert.equal(c.MAX_GIF_COUNT, 10);
  assert.equal(c.MAX_IMAGE_COUNT, 5);
  assert.equal(c.RESULT_READY, 0);
  assert.equal(c.RESULT_INVALID_ID, 1);
  assert.equal(c.STATUS_NOT_EXISTS, 0);
  assert.equal(c.STATUS_UPLOADED, 1);
  assert.equal(c.CMD_GIF_UPLOAD_START, 49);
  assert.equal(c.CMD_GIF_STATUS_QUERY, 51);
  assert.equal(c.CMD_IMAGE_UPLOAD_START, 65);
  assert.equal(c.CMD_IMAGE_STATUS_QUERY, 67);
});

test('imageConsts values', () => {
  assert.deepEqual(p.imageConsts(), {
    CMD_INFO: 33,
    CMD_CHUNK: 34,
    CMD_CLEAR: 35,
    CHUNK_OVERHEAD: 12,
  });
});
