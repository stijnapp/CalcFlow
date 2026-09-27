import type { CanvasSurface } from '@calcflow/shared';
import { paintArrows, paintItems, paintPlane, type Plane } from '../plane';
import { ACCENT, geometryOf, pixelRatio, type Scene } from './scene';
import type { Layers, StrokePoint } from '../strokes';

/** One frame of the canvas: the paper or the plane, the ink, and any loop being drawn. */
export function paintScene(scene: Scene, paper: CanvasSurface): void {
  const ctx = scene.canvas?.getContext('2d');
  if (!ctx) return;
  const { w, h } = scene.size;
  const dpr = pixelRatio();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const geo = geometryOf(scene);
  const frame = { width: w, height: h, panY: scene.pan, dpr };
  scene.surface.draw(ctx, frame, geo ? 'blank' : paper, layersFor(scene, geo));

  // The loop they are drawing lives here rather than in the surface: it is a
  // gesture, and it must never end up in the ink or in the undo stack.
  paintLoop(ctx, scene.lasso, Math.round(scene.pan * dpr) / dpr);
}

/** On a graph question: axes and the question's marks under the ink, arrows and the answer over it. */
function layersFor(scene: Scene, geo: Plane | null): Layers {
  const view = scene.plane;
  const { w, h } = scene.size;
  const showMine = !view || view.reveal !== 'answer';
  const showAnswer = !!view && (view.reveal === 'answer' || view.reveal === 'both');
  if (!geo) return { hideInk: !showMine };
  return {
    hideInk: !showMine,
    underlay: (c, pan) => {
      paintPlane(c, geo, w, h, pan);
      if (view?.spec.given) paintItems(c, geo, view.spec.given, { top: pan, bottom: pan + h }, 'given');
    },
    overlay: (c, pan) => {
      const live = scene.drawingArrow;
      if (showMine) {
        paintArrows(c, geo, scene.arrows, pan);
        if (live) paintArrows(c, geo, [live], pan, '#a89e92');
      }
      if (showAnswer) paintItems(c, geo, view!.spec.answer, { top: pan, bottom: pan + h }, 'answer');
    },
  };
}

function paintLoop(ctx: CanvasRenderingContext2D, loop: StrokePoint[] | null, pan: number): void {
  if (!loop || loop.length < 2) return;
  ctx.save();
  ctx.translate(0, -pan);
  ctx.beginPath();
  ctx.moveTo(loop[0]!.x, loop[0]!.y);
  for (let i = 1; i < loop.length; i += 1) ctx.lineTo(loop[i]!.x, loop[i]!.y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(245,165,36,0.08)';
  ctx.fill();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
