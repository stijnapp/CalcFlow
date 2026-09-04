const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * ULIDs are generated on-device and double as the sync idempotency key, so two
 * devices that solve offline and meet later never collide or duplicate.
 */
export function ulid(now = Date.now()): string {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i += 1) {
    time = ALPHABET[t % 32]! + time;
    t = Math.floor(t / 32);
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let random = '';
  for (let i = 0; i < 16; i += 1) random += ALPHABET[bytes[i]! % 32];
  return time + random;
}
