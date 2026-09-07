import { useEffect, useRef } from "react";
import {
  SEA_ANIM_FRAME_MS,
  SEA_ANIM_FRAMES,
  TILE_SIZE,
  getBobberCanvas,
  getFishShadowCanvas,
  getTileCanvas,
} from "../../game/pixelArt";

const SCALE = 3;
const VIEW_TILES_W = 8;
const VIEW_TILES_H = 5;
const CANVAS_W = VIEW_TILES_W * TILE_SIZE * SCALE;
const CANVAS_H = VIEW_TILES_H * TILE_SIZE * SCALE;

export type WaterPhase = "idle" | "cast" | "waiting" | "bite";

interface WaterSceneProps {
  phase: WaterPhase;
  /** waiting中の魚影の接近度(0=まだ遠い 〜 1=ウキのすぐ近く)。bite/idleでは無視される */
  approach?: number;
  className?: string;
}

/**
 * 釣り画面(キャスト〜アタリ待ち)の水面演出。村マップと同じ pixelArt.ts の描画資産を使い、
 * 波アニメ+ウキの浮き沈み+待機中に近づいてくる魚影をCanvasで表現する。
 */
export function WaterScene({ phase, approach = 0, className = "" }: WaterSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ seaFrame: 0, seaAccum: 0, elapsedMs: 0 });
  const phaseRef = useRef(phase);
  const approachRef = useRef(approach);
  useEffect(() => {
    phaseRef.current = phase;
    approachRef.current = approach;
  }, [phase, approach]);

  useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();

    function render() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.imageSmoothingEnabled = false;
      const s = stateRef.current;

      for (let ty = 0; ty < VIEW_TILES_H; ty++) {
        for (let tx = 0; tx < VIEW_TILES_W; tx++) {
          const variant = (tx * 5 + ty * 3) % 3;
          const tile = getTileCanvas("sea", variant, s.seaFrame);
          ctx.drawImage(tile, tx * TILE_SIZE * SCALE, ty * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
        }
      }

      const centerX = CANVAS_W / 2;
      const centerY = CANVAS_H / 2;

      if (phaseRef.current === "waiting" || phaseRef.current === "cast") {
        const bob = Math.sin(s.elapsedMs / 260) * 3 * SCALE;
        const bobber = getBobberCanvas();
        ctx.drawImage(
          bobber,
          centerX - (TILE_SIZE * SCALE) / 2,
          centerY - (TILE_SIZE * SCALE) / 2 + bob,
          TILE_SIZE * SCALE,
          TILE_SIZE * SCALE,
        );

        if (phaseRef.current === "waiting" && approachRef.current > 0) {
          const shadow = getFishShadowCanvas();
          const dist = (1 - approachRef.current) * (CANVAS_W / 2 + 30);
          const sx = centerX - dist - 12 * SCALE;
          const sy = centerY + 10 * SCALE;
          const w = (24 + approachRef.current * 10) * SCALE * 0.5;
          const h = (12 + approachRef.current * 4) * SCALE * 0.5;
          ctx.drawImage(shadow, sx, sy, w, h);
        }
      } else if (phaseRef.current === "bite") {
        // アタリ: ウキが大きく沈む+波紋を強調
        const bobber = getBobberCanvas();
        const jitter = Math.sin(s.elapsedMs / 40) * 2 * SCALE;
        ctx.drawImage(
          bobber,
          centerX - (TILE_SIZE * SCALE) / 2 + jitter,
          centerY - (TILE_SIZE * SCALE) / 2 + 6 * SCALE,
          TILE_SIZE * SCALE,
          TILE_SIZE * SCALE,
        );
      }
    }

    function loop(now: number) {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;
      const s = stateRef.current;
      s.elapsedMs += dt;
      s.seaAccum += dt;
      if (s.seaAccum >= SEA_ANIM_FRAME_MS) {
        s.seaAccum = 0;
        s.seaFrame = (s.seaFrame + 1) % SEA_ANIM_FRAMES;
      }
      render();
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className={`border-2 border-black/30 rounded-sm ${className}`}
      style={{ imageRendering: "pixelated", width: CANVAS_W, height: CANVAS_H }}
    />
  );
}
