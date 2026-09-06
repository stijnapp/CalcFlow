/*
 * A name for this device, for the `device` field on every attempt — the only
 * thing that says which of them a row in the log came from once two have
 * merged. Typing one in Settings wins; this is what an empty field means.
 *
 * Android puts the model straight in the user-agent string, and that is the
 * useful part: "SM-X910" is unambiguous in a way that "Android" is not. The
 * client hints API would give the same thing more politely, but it is async and
 * this is read while an attempt is being written.
 */

const ANDROID = /\bAndroid[^;)]*;\s*([^;)]+)/;

export function detectDeviceName(ua: string = navigator.userAgent): string {
  const android = ANDROID.exec(ua);
  if (android?.[1]) {
    // "SM-X910 Build/UP1A.231005.007" in a WebView, and "wv" tacked on the end.
    const model = android[1].replace(/\s+Build\/.*$/, '').replace(/\s*\bwv\b\s*$/, '').trim();
    if (model && model !== 'Android') return model;
    return 'Android';
  }
  if (/\biPad\b/.test(ua)) return 'iPad';
  if (/\biPhone\b/.test(ua)) return 'iPhone';
  if (/\bCrOS\b/.test(ua)) return 'Chromebook';
  if (/\bMacintosh\b/.test(ua)) return 'Mac';
  if (/\bWindows NT\b/.test(ua)) return 'Windows PC';
  if (/\bLinux\b/.test(ua)) return 'Linux PC';
  return 'this device';
}

/** What to stamp on an attempt: what he typed, or what the browser admits to. */
export function deviceLabel(typed: string): string {
  return typed.trim() || detectDeviceName();
}
