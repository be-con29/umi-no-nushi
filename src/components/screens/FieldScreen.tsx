import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BuildingDefinition, Direction, FieldEntityAction, TimeOfDay, VillageMapDefinition, Weather } from "../../types";
import {
  currentTile,
  findBuildingEntranceAt,
  findExitAt,
  parseTerrain,
  startPosition,
  stepMove,
  tileAt,
  type FieldPosition,
} from "../../game/field";
import {
  PLAYER_COLORS,
  SEA_ANIM_FRAME_MS,
  SEA_ANIM_FRAMES,
  TILE_SIZE,
  WALK_ANIM_FRAME_MS,
  getBuildingCellCanvas,
  getCharacterCanvas,
  getTileCanvas,
  tileVariantFor,
  villagerColors,
} from "../../game/pixelArt";
import { findVillager } from "../../data";
import { TIME_LABEL, WEATHER_LABEL } from "../../game/time";
import { DPad } from "../ui/DPad";
import { DialogueBox } from "../ui/DialogueBox";
import { PixelPanel } from "../ui/PixelPanel";
import { SecondaryButton } from "../ui/ScreenShell";

const SCALE = 2;
const VIEW_TILES_W = 9;
const VIEW_TILES_H = 10;
const CANVAS_W = VIEW_TILES_W * TILE_SIZE * SCALE;
const CANVAS_H = VIEW_TILES_H * TILE_SIZE * SCALE;
const MOVE_SPEED_PX_PER_SEC = 92;

const DIRECTION_SEQUENCE: Direction[] = ["down", "left", "up", "right"];

/** NPCは基本その場の向きのまま、数秒おきに少しだけ向きを変える程度の生きた雰囲気を出す */
function npcFacingAt(npcId: string, baseFacing: Direction, elapsedMs: number): Direction {
  let hash = 0;
  for (let i = 0; i < npcId.length; i++) hash = (hash * 31 + npcId.charCodeAt(i)) >>> 0;
  const period = 3200;
  const step = Math.floor(elapsedMs / period) + hash;
  if (step % 3 !== 0) return baseFacing;
  return DIRECTION_SEQUENCE[(hash + step) % DIRECTION_SEQUENCE.length];
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: BuildingDefinition,
  camX: number,
  camY: number,
): void {
  const roofRows = building.height <= 2 ? 1 : 2;
  for (let ry = 0; ry < building.height; ry++) {
    for (let rx = 0; rx < building.width; rx++) {
      const isEntrance = rx === building.entranceOffsetX && ry === building.entranceOffsetY;
      const kind = ry < roofRows ? (ry === roofRows - 1 ? "roofEdge" : "roof") : isEntrance ? "door" : "wall";
      const cell = getBuildingCellCanvas(kind, building.roofColor, building.wallColor);
      const tx = building.x + rx;
      const ty = building.y + ry;
      const dx = Math.round((tx * TILE_SIZE - camX) * SCALE);
      const dy = Math.round((ty * TILE_SIZE - camY) * SCALE);
      ctx.drawImage(cell, dx, dy, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
    }
  }
}

interface ActiveDialogue {
  speakerName: string;
  lines: string[];
  lineIndex: number;
}

interface FieldScreenProps {
  map: VillageMapDefinition;
  money: number;
  day: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
  onNavigate: (target: "stock" | "zukan" | "spotSelect" | "toolShop") => void;
  onRestAtInn: () => void;
}

interface LoopState {
  pos: FieldPosition;
  heldDirection: Direction | null;
  walking: boolean;
  animFrame: 0 | 1;
  animAccum: number;
  seaFrame: number;
  seaAccum: number;
  elapsedMs: number;
  lastTalkedNpcId: string | null;
  lastTriggeredTileKey: string | null;
}

export function FieldScreen({ map, money, day, timeOfDay, weather, onNavigate, onRestAtInn }: FieldScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terrain = useMemo(() => parseTerrain(map.terrainRows), [map]);

  const [dialogue, setDialogue] = useState<ActiveDialogue | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const dialogueOpenRef = useRef(false);
  useEffect(() => {
    dialogueOpenRef.current = dialogue !== null;
  }, [dialogue]);
  const menuOpenRef = useRef(false);
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  const stateRef = useRef<LoopState>({
    pos: startPosition(map),
    heldDirection: null,
    walking: false,
    animFrame: 0,
    animAccum: 0,
    seaFrame: 0,
    seaAccum: 0,
    elapsedMs: 0,
    lastTalkedNpcId: null,
    lastTriggeredTileKey: null,
  });

  useEffect(() => {
    stateRef.current.pos = startPosition(map);
    stateRef.current.lastTalkedNpcId = null;
    stateRef.current.lastTriggeredTileKey = null;
  }, [map]);

  const triggerActionRef = useRef<(action: FieldEntityAction) => void>(() => {});
  useEffect(() => {
    triggerActionRef.current = (action: FieldEntityAction) => {
      switch (action.kind) {
        case "talk": {
          const villager = findVillager(action.villagerId);
          if (villager) setDialogue({ speakerName: villager.name, lines: villager.lines, lineIndex: 0 });
          break;
        }
        case "dialogue":
          setDialogue({ speakerName: action.speakerName, lines: action.lines, lineIndex: 0 });
          break;
        case "screen":
          onNavigate(action.target);
          break;
        case "restAtInn":
          onRestAtInn();
          setDialogue({ speakerName: "宿屋", lines: ["ぐっすり眠った……。"], lineIndex: 0 });
          break;
      }
    };
  }, [onNavigate, onRestAtInn]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    const s = stateRef.current;

    const mapPxW = map.width * TILE_SIZE;
    const mapPxH = map.height * TILE_SIZE;
    const viewNativeW = CANVAS_W / SCALE;
    const viewNativeH = CANVAS_H / SCALE;
    const camX = Math.max(0, Math.min(s.pos.x + TILE_SIZE / 2 - viewNativeW / 2, Math.max(0, mapPxW - viewNativeW)));
    const camY = Math.max(0, Math.min(s.pos.y + TILE_SIZE / 2 - viewNativeH / 2, Math.max(0, mapPxH - viewNativeH)));

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const startTileX = Math.floor(camX / TILE_SIZE);
    const startTileY = Math.floor(camY / TILE_SIZE);
    const endTileX = Math.ceil((camX + viewNativeW) / TILE_SIZE);
    const endTileY = Math.ceil((camY + viewNativeH) / TILE_SIZE);

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const type = tileAt(terrain, tx, ty);
        if (!type) continue;
        const tileCanvas = getTileCanvas(type, tileVariantFor(tx, ty), s.seaFrame);
        const dx = Math.round((tx * TILE_SIZE - camX) * SCALE);
        const dy = Math.round((ty * TILE_SIZE - camY) * SCALE);
        ctx.drawImage(tileCanvas, dx, dy, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
      }
    }

    for (const building of map.buildings) drawBuilding(ctx, building, camX, camY);

    for (const npc of map.npcs) {
      const villager = findVillager(npc.villagerId);
      const facing = npcFacingAt(npc.id, npc.facing, s.elapsedMs);
      const sprite = getCharacterCanvas(facing, 0, villagerColors(villager?.spriteColor ?? "charcoal"));
      const dx = Math.round((npc.x * TILE_SIZE - camX) * SCALE);
      const dy = Math.round((npc.y * TILE_SIZE - camY) * SCALE);
      ctx.drawImage(sprite, dx, dy, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
    }

    const playerSprite = getCharacterCanvas(s.pos.facing, s.animFrame, PLAYER_COLORS);
    const pdx = Math.round((s.pos.x - camX) * SCALE);
    const pdy = Math.round((s.pos.y - camY) * SCALE);
    ctx.drawImage(playerSprite, pdx, pdy, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
  }, [map, terrain]);

  useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();

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

      const canMove = !dialogueOpenRef.current && !menuOpenRef.current;
      if (canMove && s.heldDirection) {
        const direction = s.heldDirection;
        const tile = currentTile(s.pos);
        const dxDir = direction === "left" ? -1 : direction === "right" ? 1 : 0;
        const dyDir = direction === "up" ? -1 : direction === "down" ? 1 : 0;
        const frontTile = { x: tile.x + dxDir, y: tile.y + dyDir };
        const npc = map.npcs.find((n) => n.x === frontTile.x && n.y === frontTile.y);

        if (npc) {
          s.pos = { ...s.pos, facing: direction };
          s.walking = false;
          if (s.lastTalkedNpcId !== npc.id) {
            s.lastTalkedNpcId = npc.id;
            triggerActionRef.current({ kind: "talk", villagerId: npc.villagerId });
          }
        } else {
          s.lastTalkedNpcId = null;
          const before = s.pos;
          const speed = (MOVE_SPEED_PX_PER_SEC * dt) / 1000;
          const moved = stepMove(map, terrain, before, direction, speed);
          s.pos = moved;
          s.walking = moved.x !== before.x || moved.y !== before.y;

          if (s.walking) {
            const newTile = currentTile(moved);
            const key = `${newTile.x},${newTile.y}`;
            const entrance = findBuildingEntranceAt(map, newTile.x, newTile.y);
            const exit = findExitAt(map, newTile.x, newTile.y);
            if ((entrance || exit) && s.lastTriggeredTileKey !== key) {
              s.lastTriggeredTileKey = key;
              triggerActionRef.current((entrance ?? exit)!.action);
            } else if (!entrance && !exit) {
              s.lastTriggeredTileKey = null;
            }
          }
        }
      } else {
        s.walking = false;
      }

      if (s.walking) {
        s.animAccum += dt;
        if (s.animAccum >= WALK_ANIM_FRAME_MS) {
          s.animAccum = 0;
          s.animFrame = s.animFrame === 0 ? 1 : 0;
        }
      } else {
        s.animAccum = 0;
        s.animFrame = 0;
      }

      render();
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [map, terrain, render]);

  function handleDirectionDown(direction: Direction) {
    stateRef.current.heldDirection = direction;
  }
  function handleDirectionUp() {
    stateRef.current.heldDirection = null;
  }

  function advanceDialogue() {
    setDialogue((current) => {
      if (!current) return current;
      if (current.lineIndex + 1 >= current.lines.length) return null;
      return { ...current, lineIndex: current.lineIndex + 1 };
    });
  }

  return (
    <div className="w-full max-w-md min-h-svh flex flex-col bg-gradient-to-b from-sky-700 via-sky-800 to-blue-950 text-white shadow-2xl">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
        <PixelPanel className="flex-1 px-3 py-2">
          <div className="flex justify-between items-baseline text-amber-300 font-bold text-sm">
            <span>💰 {money.toLocaleString()}円</span>
          </div>
          <div className="text-xs text-white/70 mt-0.5">
            {map.name} ・ {day}日目 {TIME_LABEL[timeOfDay]} / {WEATHER_LABEL[weather]}
          </div>
        </PixelPanel>
        <button
          onClick={() => setMenuOpen(true)}
          className="shrink-0 rounded-lg bg-white/10 border border-white/30 px-3 py-2 text-xs font-bold"
        >
          ☰
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="border-2 border-black/40 rounded-sm"
          style={{ imageRendering: "pixelated", width: CANVAS_W, height: CANVAS_H }}
        />
      </div>

      <div className="relative px-4 pb-5 pt-2 min-h-[9.5rem] flex items-end justify-center">
        {dialogue ? (
          <DialogueBox
            speakerName={dialogue.speakerName}
            text={dialogue.lines[dialogue.lineIndex]}
            isLast={dialogue.lineIndex + 1 >= dialogue.lines.length}
            onAdvance={advanceDialogue}
          />
        ) : (
          <DPad onDirectionDown={handleDirectionDown} onDirectionUp={handleDirectionUp} disabled={menuOpen} />
        )}
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-10 flex items-end justify-center bg-black/50"
          onClick={() => setMenuOpen(false)}
        >
          <div className="w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <PixelPanel className="p-4 flex flex-col gap-2">
              <h2 className="text-white font-bold mb-1">メニュー</h2>
              <SecondaryButton
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate("zukan");
                }}
              >
                📖 魚図鑑
              </SecondaryButton>
              <SecondaryButton onClick={() => setMenuOpen(false)}>閉じる</SecondaryButton>
            </PixelPanel>
          </div>
        </div>
      )}
    </div>
  );
}
