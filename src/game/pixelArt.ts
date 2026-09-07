// SFC風のドット絵を全てコードで生成するモジュール。画像アセットは一切使わない。
// タイル・キャラクタースプライトは 16x16 のCanvasにピクセル単位で描画し、
// 一度描いた結果をメモ化してから FieldScreen の描画ループで drawImage するだけにする
// (毎フレーム塗り直すのは無駄なため)。
import type { Direction, TileType } from "../types";

export const TILE_SIZE = 16;

/** 静的タイル(草・土・砂・石畳・砂浜)のバリエーション数。マップ位置ごとに見た目を散らす */
export const TILE_VARIANTS = 3;
/** 海タイルのアニメフレーム数 */
export const SEA_ANIM_FRAMES = 3;
export const SEA_ANIM_FRAME_MS = 450;
export const WALK_ANIM_FRAME_MS = 160;

// ---- パレット(彩度低めの和風配色) ----
const PALETTE = {
  grassBase: "#7c9163",
  grassDark: "#66794f",
  grassLight: "#8fa374",
  dirtBase: "#a48a66",
  dirtDark: "#8a7050",
  dirtLight: "#b89b77",
  sandBase: "#dbc99e",
  sandDark: "#c7b287",
  sandLight: "#e8d9b3",
  cobbleBase: "#98958c",
  cobbleDark: "#7c7970",
  cobbleLight: "#adaaa0",
  cobbleGrout: "#68655c",
  rockBase: "#807c76",
  rockDark: "#5f5c56",
  rockLight: "#9a968e",
  rockShadow: "#494642",
  seaBase: "#3d5c74",
  seaDark: "#2d4457",
  seaFoam: "#aacbd4",
  seaLight: "#4f7691",
  beachBase: "#cdd0b4",
  beachDark: "#b7bb9c",
  beachFoam: "#d9e6e8",
  pierBase: "#8a6a44",
  pierDark: "#6d5233",
  pierLight: "#a3815a",
  pierNail: "#3d2e1f",
  outline: "#2a2119",
} as const;

/** 村人・主人公の服の色(VillagerDefinition.spriteColor と対応) */
export const CLOTHING_COLORS: Record<string, string> = {
  indigo: "#3f5064",
  crimson: "#8a4a42",
  ochre: "#a67c3d",
  moss: "#5c6e46",
  charcoal: "#4a463f",
};

interface CharacterColors {
  skin: string;
  hair: string;
  outfit: string;
  pants: string;
}

export const PLAYER_COLORS: CharacterColors = {
  skin: "#e6b98c",
  hair: "#3a2a1c",
  outfit: CLOTHING_COLORS.indigo,
  pants: "#2e2a24",
};

export function villagerColors(spriteColorKey: string): CharacterColors {
  return {
    skin: "#e6b98c",
    hair: "#2e2015",
    outfit: CLOTHING_COLORS[spriteColorKey] ?? CLOTHING_COLORS.charcoal,
    pants: "#332e28",
  };
}

// ---- 決定論的な疑似乱数(タイルの見た目を再現可能にランダム化する) ----
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function newTileCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  return canvas;
}

/** ベース色に暗色/明色を疎らに散らして、単調でない自然な質感を作る */
function speckle(
  ctx: CanvasRenderingContext2D,
  seed: number,
  base: string,
  dark: string,
  light: string,
  darkCount = 16,
  lightCount = 8,
): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  const rand = mulberry32(seed);
  for (let i = 0; i < darkCount; i++) {
    setPixel(ctx, Math.floor(rand() * TILE_SIZE), Math.floor(rand() * TILE_SIZE), dark);
  }
  for (let i = 0; i < lightCount; i++) {
    setPixel(ctx, Math.floor(rand() * TILE_SIZE), Math.floor(rand() * TILE_SIZE), light);
  }
}

function drawGrassTile(ctx: CanvasRenderingContext2D, seed: number): void {
  speckle(ctx, seed, PALETTE.grassBase, PALETTE.grassDark, PALETTE.grassLight, 14, 6);
  // 短い草の房を数本
  const rand = mulberry32(seed + 999);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rand() * (TILE_SIZE - 1));
    const y = Math.floor(rand() * (TILE_SIZE - 2));
    setPixel(ctx, x, y, PALETTE.grassDark);
    setPixel(ctx, x, y + 1, PALETTE.grassDark);
  }
}

function drawDirtTile(ctx: CanvasRenderingContext2D, seed: number): void {
  speckle(ctx, seed, PALETTE.dirtBase, PALETTE.dirtDark, PALETTE.dirtLight, 12, 6);
}

function drawSandTile(ctx: CanvasRenderingContext2D, seed: number): void {
  speckle(ctx, seed, PALETTE.sandBase, PALETTE.sandDark, PALETTE.sandLight, 10, 8);
}

function drawCobbleTile(ctx: CanvasRenderingContext2D, seed: number): void {
  speckle(ctx, seed, PALETTE.cobbleBase, PALETTE.cobbleDark, PALETTE.cobbleLight, 8, 6);
  // 目地(グラウト)線: 互い違いの煉瓦調パターン
  ctx.fillStyle = PALETTE.cobbleGrout;
  const rowOffset = (seed % 2) * 4;
  for (let y = 0; y < TILE_SIZE; y += 4) {
    ctx.fillRect(0, y, TILE_SIZE, 1);
  }
  for (let x = -rowOffset; x < TILE_SIZE; x += 8) {
    for (let y = 0; y < TILE_SIZE; y += 4) {
      if (x >= 0) ctx.fillRect(x, y, 1, 4);
    }
  }
}

function drawRockTile(ctx: CanvasRenderingContext2D, seed: number): void {
  ctx.fillStyle = PALETTE.grassBase;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // 岩の塊(通行不可の目印として画面いっぱいに大きめの塊を描く)
  ctx.fillStyle = PALETTE.rockBase;
  ctx.fillRect(2, 3, 12, 11);
  ctx.fillStyle = PALETTE.rockLight;
  ctx.fillRect(2, 3, 5, 4);
  ctx.fillRect(3, 2, 4, 1);
  ctx.fillStyle = PALETTE.rockShadow;
  ctx.fillRect(9, 10, 5, 4);
  ctx.fillRect(2, 13, 12, 1);
  const rand = mulberry32(seed);
  for (let i = 0; i < 6; i++) {
    setPixel(ctx, 3 + Math.floor(rand() * 10), 4 + Math.floor(rand() * 9), PALETTE.rockDark);
  }
}

function drawSeaTile(ctx: CanvasRenderingContext2D, frame: number): void {
  ctx.fillStyle = PALETTE.seaBase;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = PALETTE.seaDark;
  for (let y = 1; y < TILE_SIZE; y += 4) {
    ctx.fillRect(0, y, TILE_SIZE, 1);
  }
  // 波: フレームごとに位相をずらした明るい線
  ctx.fillStyle = PALETTE.seaFoam;
  const phase = frame * 5;
  for (let y = -4 + (phase % 8); y < TILE_SIZE; y += 8) {
    for (let x = 0; x < TILE_SIZE; x += 4) {
      const yy = y + ((x + phase) % 4 < 2 ? 0 : 1);
      if (yy >= 0 && yy < TILE_SIZE) setPixel(ctx, x, yy, PALETTE.seaFoam);
    }
  }
  ctx.fillStyle = PALETTE.seaLight;
  for (let x = (phase * 2) % TILE_SIZE; x < TILE_SIZE; x += 6) {
    setPixel(ctx, x, 6, PALETTE.seaLight);
    setPixel(ctx, x, 12, PALETTE.seaLight);
  }
}

function drawBeachTile(ctx: CanvasRenderingContext2D, seed: number): void {
  speckle(ctx, seed, PALETTE.beachBase, PALETTE.beachDark, PALETTE.beachFoam, 10, 6);
  // 波打ち際の泡(上端)
  ctx.fillStyle = PALETTE.beachFoam;
  const rand = mulberry32(seed + 42);
  for (let x = 0; x < TILE_SIZE; x += 2) {
    if (rand() > 0.35) setPixel(ctx, x, 0, PALETTE.beachFoam);
  }
}

function drawPierTile(ctx: CanvasRenderingContext2D, seed: number): void {
  speckle(ctx, seed, PALETTE.pierBase, PALETTE.pierDark, PALETTE.pierLight, 8, 6);
  // 木の板目地(横線)
  ctx.fillStyle = PALETTE.pierDark;
  for (let y = 3; y < TILE_SIZE; y += 5) {
    ctx.fillRect(0, y, TILE_SIZE, 1);
  }
  // 釘
  ctx.fillStyle = PALETTE.pierNail;
  setPixel(ctx, 2, 1, PALETTE.pierNail);
  setPixel(ctx, 13, 1, PALETTE.pierNail);
  setPixel(ctx, 2, 6, PALETTE.pierNail);
  setPixel(ctx, 13, 6, PALETTE.pierNail);
}

/** 16進カラーを指定量だけ明るく/暗くする(正で明るく、負で暗く) */
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const tileCache = new Map<string, HTMLCanvasElement>();

/** 通行不可のタイル種別 */
export function isTileSolid(type: TileType): boolean {
  return type === "sea" || type === "rock";
}

function pickSeed(x: number, y: number, variant: number): number {
  return ((x * 374761393 + y * 668265263 + variant * 97) >>> 0) & 0xffff;
}

/** マップ座標から見た目のバリエーション番号を決める(静的タイル用) */
export function tileVariantFor(x: number, y: number): number {
  return (x * 7 + y * 13) % TILE_VARIANTS;
}

/**
 * タイル種別+バリエーション(+海のアニメフレーム)に対応する、事前描画済みCanvasを返す。
 * 同じ引数なら常に同じCanvasインスタンスを返す(メモ化)。
 */
export function getTileCanvas(type: TileType, variant: number, seaFrame: number): HTMLCanvasElement {
  const key = type === "sea" ? `sea:${seaFrame}` : `${type}:${variant}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const canvas = newTileCanvas();
  const ctx = canvas.getContext("2d")!;
  const seed = pickSeed(variant, variant * 31 + 7, variant);
  switch (type) {
    case "grass":
      drawGrassTile(ctx, seed);
      break;
    case "dirt":
      drawDirtTile(ctx, seed);
      break;
    case "sand":
      drawSandTile(ctx, seed);
      break;
    case "cobble":
      drawCobbleTile(ctx, seed);
      break;
    case "rock":
      drawRockTile(ctx, seed);
      break;
    case "sea":
      drawSeaTile(ctx, seaFrame);
      break;
    case "beach":
      drawBeachTile(ctx, seed);
      break;
    case "pier":
      drawPierTile(ctx, seed);
      break;
  }
  tileCache.set(key, canvas);
  return canvas;
}

// ---- 建物(屋根・壁・入口) ----
// 建物は複数タイルの矩形で構成する。1セルずつ役割(屋根/屋根の軒/壁/入口)に応じて描く。

export type BuildingCellKind = "roof" | "roofEdge" | "wall" | "door";

function drawRoofCell(ctx: CanvasRenderingContext2D, base: string): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = shade(base, 18);
  ctx.fillRect(0, 0, TILE_SIZE, 1);
  ctx.fillStyle = shade(base, -18);
  for (let x = 0; x < TILE_SIZE; x += 4) ctx.fillRect(x, 0, 1, TILE_SIZE);
}

function drawRoofEdgeCell(ctx: CanvasRenderingContext2D, base: string): void {
  drawRoofCell(ctx, base);
  ctx.fillStyle = shade(base, -32);
  ctx.fillRect(0, 12, TILE_SIZE, 4);
  ctx.fillStyle = shade(base, -45);
  ctx.fillRect(0, 15, TILE_SIZE, 1);
}

function drawWallCell(ctx: CanvasRenderingContext2D, base: string): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = shade(base, -14);
  for (let y = 0; y < TILE_SIZE; y += 4) ctx.fillRect(0, y, TILE_SIZE, 1);
  // 窓
  ctx.fillStyle = shade(base, -30);
  ctx.fillRect(5, 5, 6, 5);
  ctx.fillStyle = shade(base, 22);
  ctx.fillRect(5, 5, 6, 1);
  ctx.fillStyle = shade(base, -50);
  ctx.fillRect(6, 6, 4, 3);
}

function drawDoorCell(ctx: CanvasRenderingContext2D, base: string): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = shade(base, -40);
  ctx.fillRect(4, 4, 8, 12);
  ctx.fillStyle = shade(base, -20);
  ctx.fillRect(4, 4, 8, 2);
  ctx.fillStyle = shade(base, -55);
  ctx.fillRect(4, 15, 8, 1);
  ctx.fillStyle = "#c9a55f";
  ctx.fillRect(10, 10, 1, 1);
}

const buildingCellCache = new Map<string, HTMLCanvasElement>();

export function getBuildingCellCanvas(kind: BuildingCellKind, roofColor: string, wallColor: string): HTMLCanvasElement {
  const key = `${kind}:${roofColor}:${wallColor}`;
  const cached = buildingCellCache.get(key);
  if (cached) return cached;

  const canvas = newTileCanvas();
  const ctx = canvas.getContext("2d")!;
  switch (kind) {
    case "roof":
      drawRoofCell(ctx, roofColor);
      break;
    case "roofEdge":
      drawRoofEdgeCell(ctx, roofColor);
      break;
    case "wall":
      drawWallCell(ctx, wallColor);
      break;
    case "door":
      drawDoorCell(ctx, wallColor);
      break;
  }
  buildingCellCache.set(key, canvas);
  return canvas;
}

// ---- キャラクタースプライト ----

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: keyof CharacterColors | "outline";
}

function frame(rects: Rect[]): Rect[] {
  return rects;
}

/** 立ち姿・歩行2frame分のパーツ定義(下向き基準)。骨格はSFC風の簡略化した2頭身チビキャラ */
const DOWN_FRAMES: [Rect[], Rect[]] = [
  frame([
    { x: 3, y: 0, w: 10, h: 16, color: "outline" },
    { x: 4, y: 1, w: 8, h: 3, color: "hair" },
    { x: 5, y: 3, w: 6, h: 4, color: "skin" },
    { x: 6, y: 5, w: 1, h: 1, color: "outline" },
    { x: 9, y: 5, w: 1, h: 1, color: "outline" },
    { x: 4, y: 7, w: 8, h: 5, color: "outfit" },
    { x: 5, y: 12, w: 3, h: 3, color: "pants" },
    { x: 8, y: 12, w: 3, h: 3, color: "pants" },
  ]),
  frame([
    { x: 3, y: 0, w: 10, h: 16, color: "outline" },
    { x: 4, y: 1, w: 8, h: 3, color: "hair" },
    { x: 5, y: 3, w: 6, h: 4, color: "skin" },
    { x: 6, y: 5, w: 1, h: 1, color: "outline" },
    { x: 9, y: 5, w: 1, h: 1, color: "outline" },
    { x: 4, y: 7, w: 8, h: 5, color: "outfit" },
    { x: 4, y: 12, w: 3, h: 3, color: "pants" },
    { x: 9, y: 12, w: 3, h: 3, color: "pants" },
  ]),
];

const UP_FRAMES: [Rect[], Rect[]] = [
  frame([
    { x: 3, y: 0, w: 10, h: 16, color: "outline" },
    { x: 4, y: 1, w: 8, h: 6, color: "hair" },
    { x: 4, y: 7, w: 8, h: 5, color: "outfit" },
    { x: 5, y: 12, w: 3, h: 3, color: "pants" },
    { x: 8, y: 12, w: 3, h: 3, color: "pants" },
  ]),
  frame([
    { x: 3, y: 0, w: 10, h: 16, color: "outline" },
    { x: 4, y: 1, w: 8, h: 6, color: "hair" },
    { x: 4, y: 7, w: 8, h: 5, color: "outfit" },
    { x: 4, y: 12, w: 3, h: 3, color: "pants" },
    { x: 9, y: 12, w: 3, h: 3, color: "pants" },
  ]),
];

const LEFT_FRAMES: [Rect[], Rect[]] = [
  frame([
    { x: 4, y: 0, w: 8, h: 16, color: "outline" },
    { x: 5, y: 1, w: 7, h: 3, color: "hair" },
    { x: 5, y: 3, w: 5, h: 4, color: "skin" },
    { x: 6, y: 5, w: 1, h: 1, color: "outline" },
    { x: 5, y: 7, w: 7, h: 5, color: "outfit" },
    { x: 5, y: 12, w: 3, h: 3, color: "pants" },
    { x: 8, y: 12, w: 2, h: 3, color: "pants" },
  ]),
  frame([
    { x: 4, y: 0, w: 8, h: 16, color: "outline" },
    { x: 5, y: 1, w: 7, h: 3, color: "hair" },
    { x: 5, y: 3, w: 5, h: 4, color: "skin" },
    { x: 6, y: 5, w: 1, h: 1, color: "outline" },
    { x: 5, y: 7, w: 7, h: 5, color: "outfit" },
    { x: 4, y: 12, w: 3, h: 3, color: "pants" },
    { x: 9, y: 12, w: 2, h: 3, color: "pants" },
  ]),
];

const FRAMES_BY_DIRECTION: Record<Exclude<Direction, "right">, [Rect[], Rect[]]> = {
  down: DOWN_FRAMES,
  up: UP_FRAMES,
  left: LEFT_FRAMES,
};

const characterCache = new Map<string, HTMLCanvasElement>();

/**
 * 方向+歩行フレーム+配色に対応する16x16スプライトの事前描画済みCanvasを返す(メモ化)。
 * 'right' は 'left' を左右反転して使う(見た目は対称なので別途定義しない)。
 */
export function getCharacterCanvas(direction: Direction, frameIndex: 0 | 1, colors: CharacterColors): HTMLCanvasElement {
  const key = `${direction}:${frameIndex}:${colors.outfit}:${colors.hair}`;
  const cached = characterCache.get(key);
  if (cached) return cached;

  const flip = direction === "right";
  const rects = FRAMES_BY_DIRECTION[flip ? "left" : (direction as Exclude<Direction, "right">)][frameIndex];

  const canvas = newTileCanvas();
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  if (flip) {
    ctx.translate(TILE_SIZE, 0);
    ctx.scale(-1, 1);
  }
  for (const r of rects) {
    ctx.fillStyle = r.color === "outline" ? PALETTE.outline : colors[r.color];
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
  characterCache.set(key, canvas);
  return canvas;
}
