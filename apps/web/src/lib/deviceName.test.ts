import { describe, expect, it } from 'vitest';
import { detectDeviceName, deviceLabel, galaxyName } from './deviceName';

const TAB = 'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const PHONE_WV = 'Mozilla/5.0 (Linux; Android 15; SM-S928B Build/AP3A.240905.015; wv) AppleWebKit/537.36';
/** What Chrome sends now, whatever the phone. */
const REDUCED = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const DESKTOP_SITE = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

describe('detectDeviceName', () => {
  it('reads the model out of an Android user-agent', () => {
    expect(detectDeviceName(TAB, '', 5)).toBe('Galaxy Tab S9 Ultra');
  });

  it('drops the build tag and the WebView marker', () => {
    expect(detectDeviceName(PHONE_WV, '', 5)).toBe('Galaxy S24 Ultra');
  });

  it('prefers the model the client hints give over the reduced user-agent', () => {
    expect(detectDeviceName(REDUCED, 'SM-S918B', 5)).toBe('Galaxy S23 Ultra');
  });

  it('never calls a phone "K"', () => {
    expect(detectDeviceName(REDUCED, '', 5)).toBe('Android phone');
  });

  it('calls a touchscreen "Linux PC" the tablet in desktop mode it is', () => {
    expect(detectDeviceName(DESKTOP_SITE, '', 10)).toBe('Android tablet');
    expect(detectDeviceName(DESKTOP_SITE, '', 0)).toBe('Linux PC');
  });

  it('names the desktops it can tell apart', () => {
    expect(detectDeviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '', 0)).toBe('Mac');
    expect(detectDeviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '', 0)).toBe('Windows PC');
    expect(detectDeviceName('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)', '', 5)).toBe('iPad');
  });

  it('falls back rather than inventing a name', () => {
    expect(detectDeviceName('something else entirely', '', 0)).toBe('this device');
  });
});

describe('galaxyName', () => {
  it('names the phones and tablets by what is on the box', () => {
    expect(galaxyName('SM-S911B')).toBe('Galaxy S23');
    expect(galaxyName('SM-S936B')).toBe('Galaxy S25+');
    expect(galaxyName('SM-X730')).toBe('Galaxy Tab S11');
    expect(galaxyName('SM-X936B')).toBe('Galaxy Tab S11 Ultra');
    expect(galaxyName('SM-X820')).toBe('Galaxy Tab S10+');
  });

  it('keeps a model number it does not know', () => {
    expect(galaxyName('Pixel 9')).toBe('Pixel 9');
    expect(galaxyName('SM-A546B')).toBe('SM-A546B');
  });
});

describe('deviceLabel', () => {
  it('prefers what they typed', () => {
    expect(deviceLabel('  tablet ')).toBe('tablet');
  });

  it('detects when the field is blank', () => {
    expect(deviceLabel('   ')).toBe(detectDeviceName());
  });
});
