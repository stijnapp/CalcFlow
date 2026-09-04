/**
 * Two-finger tap undoes, three-finger tap redoes — the Procreate/GoodNotes
 * convention.
 *
 * The thresholds matter more than they look. Fingers must land together and
 * lift quickly, and any pointer that travels cancels the whole candidate
 * immediately, so a two-finger *pan* of the canvas never fires an undo. The
 * count is the peak number of fingers down, not the number at lift, so a
 * slightly staggered release still reads as one gesture.
 */

const LAND_WINDOW_MS = 150;
const LIFT_WINDOW_MS = 300;
const MOVE_TOLERANCE_PX = 12;

interface Contact {
  x: number;
  y: number;
  moved: number;
}

export class TapDetector {
  private contacts = new Map<number, Contact>();
  private firstDownAt = 0;
  private peak = 0;
  private valid = false;

  down(pointerId: number, x: number, y: number, now = Date.now()): void {
    if (this.contacts.size === 0) {
      this.firstDownAt = now;
      this.valid = true;
      this.peak = 0;
    } else if (now - this.firstDownAt > LAND_WINDOW_MS) {
      // A finger that arrives late is a separate action, not part of this tap.
      this.valid = false;
    }
    this.contacts.set(pointerId, { x, y, moved: 0 });
    this.peak = Math.max(this.peak, this.contacts.size);
  }

  move(pointerId: number, x: number, y: number): void {
    const c = this.contacts.get(pointerId);
    if (!c) return;
    c.moved = Math.max(c.moved, Math.abs(x - c.x) + Math.abs(y - c.y));
    if (c.moved > MOVE_TOLERANCE_PX) this.valid = false;
  }

  /** Returns the finger count once the last one lifts, or 0 for no gesture. */
  up(pointerId: number, now = Date.now()): number {
    if (!this.contacts.delete(pointerId)) return 0;
    if (this.contacts.size > 0) return 0;

    const count = this.peak;
    const quick = now - this.firstDownAt <= LIFT_WINDOW_MS;
    const fired = this.valid && quick ? count : 0;
    this.reset();
    return fired;
  }

  cancel(pointerId: number): void {
    this.contacts.delete(pointerId);
    if (this.contacts.size === 0) this.reset();
    else this.valid = false;
  }

  /** A pen contact rules out any finger gesture. */
  abort(): void {
    this.valid = false;
  }

  get activeCount(): number {
    return this.contacts.size;
  }

  private reset(): void {
    this.contacts.clear();
    this.peak = 0;
    this.valid = false;
  }
}
