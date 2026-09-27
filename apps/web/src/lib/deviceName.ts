/*
 * A name for this device, for the `device` field on every attempt — the only
 * thing that says which of them a row in the log came from once two have
 * merged. Typing one in Settings wins; this is what an empty field means.
 *
 * Chrome no longer puts the model in the user-agent string: every Android phone
 * now says it is a "K" on Android 10, and a tablet asking for desktop sites
 * says it is a Linux PC. The model is still there behind the client hints API,
 * which is async, so it is asked for once at start and kept for the moment an
 * attempt is written.
 */

interface UserAgentData {
  getHighEntropyValues?(hints: string[]): Promise<{ model?: string }>;
}

let hinted = '';

/** Asks the browser for the model it leaves out of the user-agent string. Once, at start. */
export async function learnDeviceModel(): Promise<void> {
  const data = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
  try {
    const values = await data?.getHighEntropyValues?.(['model']);
    hinted = values?.model?.trim() ?? '';
  } catch {
    // Not offered, or refused: the user-agent string is all there is.
  }
}

const PHONE_SIZE: Record<string, string> = { '1': '', '6': '+', '7': ' Edge', '8': ' Ultra' };
const TAB_SIZE: Record<string, string> = { '7': '', '8': '+', '9': ' Ultra' };

/**
 * Samsung's model numbers, as the names on the box. SM-S9[g][s] is a Galaxy S
 * from the S22 on, generation then size; SM-X[s][g]0 is a Tab S from the S8 on,
 * size then generation. Anything else keeps its model number, which still
 * tells two devices apart.
 */
export function galaxyName(model: string): string {
  const phone = /^SM-S9(\d)([1678])/.exec(model);
  if (phone) return `Galaxy S${22 + Number(phone[1])}${PHONE_SIZE[phone[2]!]}`;
  const tab = /^SM-X([789])(\d)\d/.exec(model);
  if (tab) return `Galaxy Tab S${8 + Number(tab[2])}${TAB_SIZE[tab[1]!]}`;
  return model;
}

const ANDROID = /\bAndroid[^;)]*;\s*([^;)]+)/;

function androidName(ua: string, match: RegExpExecArray): string {
  // "SM-X910 Build/UP1A.231005.007" in a WebView, and "wv" tacked on the end.
  const model = match[1]!.replace(/\s+Build\/.*$/, '').replace(/\s*\bwv\b\s*$/, '').trim();
  // "K" is the placeholder Chrome sends in place of every model.
  if (model && model !== 'Android' && model !== 'K') return galaxyName(model);
  return /\bMobile\b/.test(ua) ? 'Android phone' : 'Android tablet';
}

export function detectDeviceName(
  ua: string = navigator.userAgent,
  model: string = hinted,
  touch: number = navigator.maxTouchPoints,
): string {
  if (model) return galaxyName(model);
  const android = ANDROID.exec(ua);
  if (android) return androidName(ua, android);
  if (/\biPad\b/.test(ua)) return 'iPad';
  if (/\biPhone\b/.test(ua)) return 'iPhone';
  if (/\bCrOS\b/.test(ua)) return 'Chromebook';
  if (/\bMacintosh\b/.test(ua)) return 'Mac';
  if (/\bWindows NT\b/.test(ua)) return 'Windows PC';
  // A Linux desktop with a touchscreen is, in practice, an Android tablet with
  // "desktop site" on — which Chrome turns on for tablets by default.
  if (/\bLinux\b/.test(ua)) return touch > 0 ? 'Android tablet' : 'Linux PC';
  return 'this device';
}

/** What to stamp on an attempt: what they typed, or what the browser admits to. */
export function deviceLabel(typed: string): string {
  return typed.trim() || detectDeviceName();
}
