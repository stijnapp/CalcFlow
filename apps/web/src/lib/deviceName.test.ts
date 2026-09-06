import { describe, expect, it } from 'vitest';
import { detectDeviceName, deviceLabel } from './deviceName';

const TAB = 'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const PHONE_WV = 'Mozilla/5.0 (Linux; Android 15; SM-S928B Build/AP3A.240905.015; wv) AppleWebKit/537.36';

describe('detectDeviceName', () => {
  it('reads the model out of an Android user-agent', () => {
    expect(detectDeviceName(TAB)).toBe('SM-X910');
  });

  it('drops the build tag and the WebView marker', () => {
    expect(detectDeviceName(PHONE_WV)).toBe('SM-S928B');
  });

  it('names the desktops it can tell apart', () => {
    expect(detectDeviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('Mac');
    expect(detectDeviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows PC');
    expect(detectDeviceName('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Linux PC');
    expect(detectDeviceName('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)')).toBe('iPad');
  });

  it('falls back rather than inventing a name', () => {
    expect(detectDeviceName('something else entirely')).toBe('this device');
  });
});

describe('deviceLabel', () => {
  it('prefers what he typed', () => {
    expect(deviceLabel('  tablet ')).toBe('tablet');
  });

  it('detects when the field is blank', () => {
    expect(deviceLabel('   ')).toBe(detectDeviceName());
  });
});
