import { describe, expect, it } from 'vitest';
import { Surface } from './strokes';

function scribble(surface: Surface, x: number): void {
  surface.begin({ x, y: 0, p: 1 }, 2);
  surface.extend([{ x: x + 5, y: 5, p: 1 }]);
  surface.commit();
}

describe('the surface clock', () => {
  it('stamps strokes in the order they land, and again when they leave', () => {
    const surface = new Surface();
    scribble(surface, 0);
    const between = surface.tick();
    scribble(surface, 10);
    const [a, b] = surface.strokes;
    expect(a!.at).toBeLessThan(between);
    expect(b!.at).toBeGreaterThan(between);

    surface.undo();
    expect(surface.lastUndone?.at).toBeGreaterThan(b!.at - 1);
    expect(surface.newest).toBe(a);
  });

  it('brings a redone stroke back as the newest thing on the page', () => {
    const surface = new Surface();
    scribble(surface, 0);
    surface.undo();
    const arrowAt = surface.tick();
    surface.redo();
    expect(surface.newest!.at).toBeGreaterThan(arrowAt);
  });

  it('keeps the order through storage, and the clock ahead of it', () => {
    const surface = new Surface();
    scribble(surface, 0);
    scribble(surface, 10);
    const saved = surface.serialize();

    const again = new Surface();
    again.restore(saved);
    expect(again.strokes.map((s) => s.at)).toEqual(saved.map((s) => s.at));
    expect(again.tick()).toBeGreaterThan(saved.at(-1)!.at!);
  });

  it('reports whether a mark landed', () => {
    const surface = new Surface();
    expect(surface.commit()).toBe(false);
    surface.begin({ x: 0, y: 0, p: 1 }, 2);
    expect(surface.commit()).toBe(true);
  });
});
