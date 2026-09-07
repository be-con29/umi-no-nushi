// SFC風のドット絵を全てコードで生成するモジュール。画像アセットは一切使わない。
// タイル・キャラクタースプライトは 16x16 のCanvasにピクセル単位で描画し、
// 一度描いた結果をメモ化してから FieldScreen の描画ループで drawImage するだけにする
// (毎フレーム塗り直すのは無駄なため)。
import type { DecorationPlacement, Direction, TileType } from "../types";

type DecorationKind = DecorationPlacement["kind"];

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
  /** 主人公だけがかぶる麦わら帽子の色。未指定の場合は描かない(村人はかぶらない) */
  cap?: string;
}

export const PLAYER_COLORS: CharacterColors = {
  skin: "#e6b98c",
  hair: "#3a2a1c",
  outfit: CLOTHING_COLORS.indigo,
  pants: "#2e2a24",
  cap: "#c9a866",
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
  // 目地(グラウト)を全面に敷いてから、一回り小さい石畳を載せる=タイル同士の継ぎ目がくっきり出る
  ctx.fillStyle = PALETTE.cobbleGrout;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = PALETTE.cobbleBase;
  ctx.fillRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
  // 面取り: 左上を明るく、右下を暗くして石の厚みを出す
  ctx.fillStyle = PALETTE.cobbleLight;
  ctx.fillRect(1, 1, TILE_SIZE - 2, 1);
  ctx.fillRect(1, 1, 1, TILE_SIZE - 2);
  ctx.fillStyle = PALETTE.cobbleDark;
  ctx.fillRect(1, TILE_SIZE - 2, TILE_SIZE - 2, 1);
  ctx.fillRect(TILE_SIZE - 2, 1, 1, TILE_SIZE - 2);
  // 石の表面のひび・欠け
  const rand = mulberry32(seed);
  for (let i = 0; i < 5; i++) {
    setPixel(ctx, 2 + Math.floor(rand() * (TILE_SIZE - 4)), 2 + Math.floor(rand() * (TILE_SIZE - 4)), PALETTE.cobbleDark);
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

export type BuildingCellKind = "roof" | "roofEdge" | "wall" | "door" | "sign";

function drawRoofCell(ctx: CanvasRenderingContext2D, base: string): void {
  // 上(明るい)から下(暗い)へのグラデーションで、瓦が陽を受けて傾斜している感じを出す
  for (let y = 0; y < TILE_SIZE; y++) {
    const t = y / (TILE_SIZE - 1);
    ctx.fillStyle = shade(base, 14 - t * 26);
    ctx.fillRect(0, y, TILE_SIZE, 1);
  }
  ctx.fillStyle = shade(base, -30);
  for (let x = 0; x < TILE_SIZE; x += 4) ctx.fillRect(x, 0, 1, TILE_SIZE);
  // 棟(むね)のハイライト
  ctx.fillStyle = shade(base, 32);
  ctx.fillRect(0, 0, TILE_SIZE, 1);
}

function drawRoofEdgeCell(ctx: CanvasRenderingContext2D, base: string): void {
  drawRoofCell(ctx, base);
  // 軒先の影と、瓦の出っ張り(一段濃い帯)
  ctx.fillStyle = shade(base, -38);
  ctx.fillRect(0, 11, TILE_SIZE, 4);
  ctx.fillStyle = shade(base, -20);
  ctx.fillRect(0, 11, TILE_SIZE, 1);
  ctx.fillStyle = shade(base, -55);
  ctx.fillRect(0, 15, TILE_SIZE, 1);
}

/** 軒先の中央に商店の看板を吊るしたセル(建物の入口の真上に配置する) */
function drawSignCell(ctx: CanvasRenderingContext2D, roofBase: string): void {
  drawRoofEdgeCell(ctx, roofBase);
  ctx.fillStyle = "#3a2c1e";
  ctx.fillRect(4, 9, 8, 6);
  ctx.fillStyle = "#5c4530";
  ctx.fillRect(4, 9, 8, 1);
  ctx.fillRect(4, 9, 1, 6);
  ctx.fillStyle = "#c9a866";
  ctx.fillRect(6, 11, 4, 2);
}

function drawWallCell(ctx: CanvasRenderingContext2D, base: string): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = shade(base, -14);
  for (let y = 0; y < TILE_SIZE; y += 4) ctx.fillRect(0, y, TILE_SIZE, 1);
  // 柱(左右の端に濃い縦の梁)
  ctx.fillStyle = shade(base, -28);
  ctx.fillRect(0, 0, 2, TILE_SIZE);
  ctx.fillRect(TILE_SIZE - 2, 0, 2, TILE_SIZE);
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
  ctx.fillStyle = shade(base, -28);
  ctx.fillRect(0, 0, 2, TILE_SIZE);
  ctx.fillRect(TILE_SIZE - 2, 0, 2, TILE_SIZE);
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
    case "sign":
      drawSignCell(ctx, roofColor);
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

// ---- 装飾物(木) ----
// 地形タイルの上に重ねて描く見た目だけのオブジェクト。背景は透明にし、下の地形が透けて見えるようにする。

/** 木の樹冠色バリエーション(常緑〜やや黄みがかった緑) */
const TREE_FOLIAGE: readonly string[] = ["#5f7a4a", "#6d8552", "#57724a"];
export const DECORATION_VARIANTS = TREE_FOLIAGE.length;

function drawTree(ctx: CanvasRenderingContext2D, variant: number): void {
  const foliage = TREE_FOLIAGE[variant % TREE_FOLIAGE.length];
  // 根元の影
  ctx.fillStyle = "rgba(20, 20, 10, 0.25)";
  ctx.beginPath();
  ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 幹
  ctx.fillStyle = "#4a3524";
  ctx.fillRect(7, 10, 2, 4);
  // 樹冠(重ねた円でこんもりした茂みを表現)
  ctx.fillStyle = shade(foliage, -15);
  ctx.beginPath();
  ctx.ellipse(8, 7, 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = foliage;
  ctx.beginPath();
  ctx.ellipse(6, 6, 4.5, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(10, 7, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(foliage, 22);
  ctx.beginPath();
  ctx.ellipse(5, 4, 2.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWell(ctx: CanvasRenderingContext2D): void {
  // 石積みの井戸
  ctx.fillStyle = "rgba(20, 20, 10, 0.2)";
  ctx.beginPath();
  ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a877c";
  ctx.beginPath();
  ctx.ellipse(8, 10, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a675c";
  ctx.fillRect(3, 6, 10, 6);
  ctx.fillStyle = "#8a877c";
  ctx.fillRect(3, 6, 10, 1);
  ctx.fillStyle = "#4a4740";
  ctx.beginPath();
  ctx.ellipse(8, 7, 3.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2d4a5a";
  ctx.beginPath();
  ctx.ellipse(8, 7, 2.6, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 屋根柱と小さな屋根
  ctx.fillStyle = "#5c4530";
  ctx.fillRect(2, 1, 1, 6);
  ctx.fillRect(13, 1, 1, 6);
  ctx.fillStyle = "#6d5233";
  ctx.fillRect(1, 0, 14, 2);
}

function drawLantern(ctx: CanvasRenderingContext2D): void {
  // 木の柱に載った石灯籠風の常夜灯
  ctx.fillStyle = "rgba(20, 20, 10, 0.2)";
  ctx.beginPath();
  ctx.ellipse(8, 15, 3, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#726c60";
  ctx.fillRect(7, 9, 2, 6);
  ctx.fillStyle = "#8a8478";
  ctx.fillRect(5, 7, 6, 3);
  ctx.fillStyle = "#f2c96a";
  ctx.fillRect(6, 7, 4, 2);
  ctx.fillStyle = "#726c60";
  ctx.fillRect(4, 5, 8, 2);
  ctx.fillStyle = "#5c574c";
  ctx.beginPath();
  ctx.moveTo(3, 5);
  ctx.lineTo(8, 1);
  ctx.lineTo(13, 5);
  ctx.closePath();
  ctx.fill();
}

function drawFence(ctx: CanvasRenderingContext2D): void {
  // 低い木柵(横木2本+杭)
  ctx.fillStyle = "#7a5c3c";
  for (let x = 1; x < TILE_SIZE; x += 5) {
    ctx.fillRect(x, 6, 2, 8);
  }
  ctx.fillStyle = "#8f6d48";
  ctx.fillRect(0, 7, TILE_SIZE, 2);
  ctx.fillRect(0, 11, TILE_SIZE, 2);
}

const FLOWER_COLORS: readonly string[] = ["#d98a8a", "#e0c15c", "#c78ad9"];

function drawFlower(ctx: CanvasRenderingContext2D, variant: number): void {
  ctx.fillStyle = "#5f7a4a";
  ctx.beginPath();
  ctx.ellipse(8, 12, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const color = FLOWER_COLORS[variant % FLOWER_COLORS.length];
  const rand = mulberry32(variant + 500);
  for (let i = 0; i < 5; i++) {
    const x = 4 + Math.floor(rand() * 8);
    const y = 9 + Math.floor(rand() * 4);
    setPixel(ctx, x, y, color);
    setPixel(ctx, x + 1, y, "#eede9a");
  }
}

const decorationCache = new Map<string, HTMLCanvasElement>();

/** 装飾物の事前描画済みCanvasを返す(メモ化)。背景は透明 */
export function getDecorationCanvas(kind: DecorationKind, variant: number): HTMLCanvasElement {
  const key = `${kind}:${variant}`;
  const cached = decorationCache.get(key);
  if (cached) return cached;
  const canvas = newTileCanvas();
  const ctx = canvas.getContext("2d")!;
  switch (kind) {
    case "tree":
      drawTree(ctx, variant);
      break;
    case "well":
      drawWell(ctx);
      break;
    case "lantern":
      drawLantern(ctx);
      break;
    case "fence":
      drawFence(ctx);
      break;
    case "flower":
      drawFlower(ctx, variant);
      break;
  }
  decorationCache.set(key, canvas);
  return canvas;
}

// ---- 釣りパート: ウキ・魚影 ----
// game/pixelArt.ts の他の描画物と同じく、すべてコードで直接ドット絵を描く。

let bobberCanvas: HTMLCanvasElement | null = null;

/** 水面に浮かぶウキ(赤白の目印)。16x16、背景は透明 */
export function getBobberCanvas(): HTMLCanvasElement {
  if (bobberCanvas) return bobberCanvas;
  const canvas = newTileCanvas();
  const ctx = canvas.getContext("2d")!;
  // 水面の波紋(淡い輪)
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(8, 11, 5, 1.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // 竿糸
  ctx.strokeStyle = "#e8e4d8";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(8, 6);
  ctx.stroke();
  // 浮き本体(上=赤、下=白)
  ctx.fillStyle = "#c94a3a";
  ctx.beginPath();
  ctx.ellipse(8, 6, 2, 3, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#f2ece0";
  ctx.beginPath();
  ctx.ellipse(8, 6, 2, 3, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = "#8a6a44";
  ctx.fillRect(7, 8, 2, 2);
  bobberCanvas = canvas;
  return canvas;
}

let fishShadowCanvas: HTMLCanvasElement | null = null;

/** 接近してくる魚影(水面下のシルエット)。24x12、背景は透明 */
export function getFishShadowCanvas(): HTMLCanvasElement {
  if (fishShadowCanvas) return fishShadowCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 12;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(10, 20, 15, 0.45)";
  ctx.beginPath();
  ctx.ellipse(12, 6, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 6);
  ctx.lineTo(-2, 2);
  ctx.lineTo(-2, 10);
  ctx.closePath();
  ctx.fill();
  fishShadowCanvas = canvas;
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
    { x: 4, y: 0, w: 8, h: 2, color: "cap" },
    { x: 3, y: 2, w: 10, h: 1, color: "cap" },
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
    { x: 4, y: 0, w: 8, h: 2, color: "cap" },
    { x: 3, y: 2, w: 10, h: 1, color: "cap" },
  ]),
];

const UP_FRAMES: [Rect[], Rect[]] = [
  frame([
    { x: 3, y: 0, w: 10, h: 16, color: "outline" },
    { x: 4, y: 1, w: 8, h: 6, color: "hair" },
    { x: 4, y: 7, w: 8, h: 5, color: "outfit" },
    { x: 5, y: 12, w: 3, h: 3, color: "pants" },
    { x: 8, y: 12, w: 3, h: 3, color: "pants" },
    { x: 4, y: 0, w: 8, h: 2, color: "cap" },
    { x: 3, y: 2, w: 10, h: 1, color: "cap" },
  ]),
  frame([
    { x: 3, y: 0, w: 10, h: 16, color: "outline" },
    { x: 4, y: 1, w: 8, h: 6, color: "hair" },
    { x: 4, y: 7, w: 8, h: 5, color: "outfit" },
    { x: 4, y: 12, w: 3, h: 3, color: "pants" },
    { x: 9, y: 12, w: 3, h: 3, color: "pants" },
    { x: 4, y: 0, w: 8, h: 2, color: "cap" },
    { x: 3, y: 2, w: 10, h: 1, color: "cap" },
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
    { x: 5, y: 0, w: 7, h: 2, color: "cap" },
    { x: 4, y: 2, w: 2, h: 1, color: "cap" },
  ]),
  frame([
    { x: 4, y: 0, w: 8, h: 16, color: "outline" },
    { x: 5, y: 1, w: 7, h: 3, color: "hair" },
    { x: 5, y: 3, w: 5, h: 4, color: "skin" },
    { x: 6, y: 5, w: 1, h: 1, color: "outline" },
    { x: 5, y: 7, w: 7, h: 5, color: "outfit" },
    { x: 4, y: 12, w: 3, h: 3, color: "pants" },
    { x: 9, y: 12, w: 2, h: 3, color: "pants" },
    { x: 5, y: 0, w: 7, h: 2, color: "cap" },
    { x: 4, y: 2, w: 2, h: 1, color: "cap" },
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
  const key = `${direction}:${frameIndex}:${colors.outfit}:${colors.hair}:${colors.cap ?? ""}`;
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
    const color = r.color === "outline" ? PALETTE.outline : colors[r.color];
    if (!color) continue;
    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
  characterCache.set(key, canvas);
  return canvas;
}
