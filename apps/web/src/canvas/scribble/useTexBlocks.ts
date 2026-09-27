import {
  useCallback,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { RULE_SPACING, type TexBlock } from '../strokes';
import { follow, toWorld, type ClientPoint, type Scene } from './scene';

export interface TexBlocks {
  blocks: TexBlock[];
  activeId: number | null;
  /** The block being written, if there is one. */
  active: TexBlock | null;
  typeTap(at: ClientPoint): void;
  editActive(latex: string): void;
  deselect(): void;
  deleteActive(): void;
  /** Picking a block up makes it the one being written, and starts dragging it. */
  pickBlock(block: TexBlock, e: ReactPointerEvent<HTMLDivElement>): void;
  moveBlocks(ids: ReadonlySet<number>, dx: number, dy: number): void;
  removeBlocks(ids: ReadonlySet<number>): void;
  /**
   * Replaces every block, for a page restored or cleared. Ids only ever count
   * up, so a new block never shares a key with one still animating out.
   */
  resetBlocks(list: TexBlock[]): void;
}

/** Blocks exist from the first tap; an empty one is dropped on the way out. */
function dropEmpties(list: TexBlock[]): TexBlock[] {
  return list.filter((b) => b.latex.trim() !== '');
}

/** Lines of typed LaTeX laid on the page, which pan with the ink. */
export function useTexBlocks(sceneRef: RefObject<Scene>, markDirty: () => void): TexBlocks {
  const [blocks, setBlocks] = useState<TexBlock[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = blocks.find((b) => b.id === activeId) ?? null;

  /**
   * Placing a block does not open the keyboard, and neither does picking one up.
   * Focus arrived on pointerdown, so starting to drag a block raised the
   * keyboard mid-drag, the page moved up to make room, and the block shot out
   * from under their finger. The bar at the bottom is focused by tapping the
   * bar, like every other field in the app.
   */
  const place = useCallback(
    (x: number, y: number, latex = '') => {
      const id = sceneRef.current.nextBlockId++;
      setBlocks((bs) => [...dropEmpties(bs), { id, x, y, latex }]);
      setActiveId(id);
    },
    [sceneRef],
  );

  const deselect = useCallback(() => {
    setBlocks(dropEmpties);
    setActiveId(null);
  }, []);

  /**
   * A line in progress is settled by the next tap; only then does the tap after
   * it start a new one, on the line they touched.
   */
  const typeTap = (at: ClientPoint) => {
    if (active && active.latex.trim() !== '') {
      deselect();
      return;
    }
    const p = toWorld(sceneRef.current, at);
    place(p.x, Math.round(p.y / RULE_SPACING) * RULE_SPACING);
  };

  const editActive = (latex: string) => {
    if (active) {
      setBlocks((bs) => bs.map((b) => (b.id === active.id ? { ...b, latex } : b)));
      return;
    }
    // Typing with nothing placed drops a block on the first free line below.
    place(40, Math.round((sceneRef.current.pan + 80) / RULE_SPACING) * RULE_SPACING, latex);
  };

  const deleteActive = () => {
    setBlocks((bs) => bs.filter((b) => b.id !== activeId));
    setActiveId(null);
  };

  const pickBlock = (block: TexBlock, e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setBlocks((bs) => bs.filter((x) => x.id === block.id || x.latex.trim() !== ''));
    setActiveId(block.id);
    const { clientX: startX, clientY: startY } = e;
    const drag = (ev: PointerEvent) => {
      const x = block.x + (ev.clientX - startX);
      const y = block.y + (ev.clientY - startY);
      setBlocks((bs) => bs.map((b) => (b.id === block.id ? { ...b, x, y } : b)));
    };
    follow(e, drag, markDirty);
  };

  const moveBlocks = useCallback((ids: ReadonlySet<number>, dx: number, dy: number) => {
    const moved = (b: TexBlock) => (ids.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b);
    setBlocks((bs) => bs.map(moved));
  }, []);

  const removeBlocks = useCallback((ids: ReadonlySet<number>) => {
    setBlocks((bs) => bs.filter((b) => !ids.has(b.id)));
  }, []);

  const resetBlocks = useCallback(
    (list: TexBlock[]) => {
      const scene = sceneRef.current;
      scene.blocks = list;
      scene.nextBlockId = list.reduce((m, b) => Math.max(m, b.id + 1), scene.nextBlockId);
      setBlocks(list);
      setActiveId(null);
    },
    [sceneRef],
  );

  return {
    blocks,
    activeId,
    active,
    typeTap,
    editActive,
    deselect,
    deleteActive,
    pickBlock,
    moveBlocks,
    removeBlocks,
    resetBlocks,
  };
}
