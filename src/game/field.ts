// フィールド探索の地形パース・当たり判定・移動計算。副作用のない純粋関数として実装し、
// UI(FieldScreen.tsx)はこの結果を毎フレーム反映して描画するだけにする。
// プレイヤーはマス目単位ではなく、ピクセル単位で連続的に移動する(SFC風の滑らかな歩行)。
import type { BuildingDefinition, Direction, ExitPlacement, TileType, VillageMapDefinition } from "../types";
import { isTileSolid, TILE_SIZE } from "./pixelArt";

/** village.json の terrainRows で使う1文字コードとTileTypeの対応表 */
export const TILE_CODE: Record<string, TileType> = {
  g: "grass",
  d: "dirt",
  s: "sand",
  c: "cobble",
  r: "rock",
  w: "sea",
  b: "beach",
  p: "pier",
};

export function parseTerrain(rows: string[]): TileType[][] {
  return rows.map((row) => row.split("").map((ch) => TILE_CODE[ch] ?? "grass"));
}

export function tileAt(terrain: TileType[][], x: number, y: number): TileType | undefined {
  return terrain[y]?.[x];
}

/** プレイヤー/NPCの当たり判定に使う「足元」の小さな矩形(見た目の16x16全体より小さくする) */
export const PLAYER_HITBOX = { width: 10, height: 6, offsetX: 3, offsetY: 9 };

const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** 建物が指定タイルを占有し、かつそこが入口ではない(=壁として塞ぐ)かどうか */
function buildingBlocksTile(building: BuildingDefinition, x: number, y: number): boolean {
  const withinFootprint =
    x >= building.x && x < building.x + building.width && y >= building.y && y < building.y + building.height;
  if (!withinFootprint) return false;
  const isEntrance = x === building.x + building.entranceOffsetX && y === building.y + building.entranceOffsetY;
  return !isEntrance;
}

export function isTileWalkable(map: VillageMapDefinition, terrain: TileType[][], x: number, y: number): boolean {
  const tile = tileAt(terrain, x, y);
  if (!tile || isTileSolid(tile)) return false;
  if (map.buildings.some((b) => buildingBlocksTile(b, x, y))) return false;
  if (map.npcs.some((n) => n.x === x && n.y === y)) return false;
  return true;
}

export interface FieldPosition {
  /** ワールド座標(ピクセル単位、タイル座標×TILE_SIZE換算)。スプライト左上を指す */
  x: number;
  y: number;
  facing: Direction;
}

export function startPosition(map: VillageMapDefinition): FieldPosition {
  return { x: map.startX * TILE_SIZE, y: map.startY * TILE_SIZE, facing: "down" };
}

/** 現在のワールド座標から、プレイヤーが立っているタイル座標(当たり判定の中心)を求める */
export function currentTile(pos: FieldPosition): { x: number; y: number } {
  const cx = pos.x + PLAYER_HITBOX.offsetX + PLAYER_HITBOX.width / 2;
  const cy = pos.y + PLAYER_HITBOX.offsetY + PLAYER_HITBOX.height / 2;
  return { x: Math.floor(cx / TILE_SIZE), y: Math.floor(cy / TILE_SIZE) };
}

/**
 * 移動先が占有可能かどうかを判定する。
 * 当たり判定は「足元の矩形が重なる全タイル」ではなく、矩形の中心が乗るタイル1つだけを見る
 * (currentTile と同じ考え方)。入口や桟橋のような1マス幅の通路で、足元の矩形が隣の壁/水に
 * わずかに掛かっただけで身動きが取れなくなる問題を避けるための単純化。
 */
function canOccupy(map: VillageMapDefinition, terrain: TileType[][], px: number, py: number): boolean {
  const cx = px + PLAYER_HITBOX.offsetX + PLAYER_HITBOX.width / 2;
  const cy = py + PLAYER_HITBOX.offsetY + PLAYER_HITBOX.height / 2;
  if (cx < 0 || cy < 0 || cx >= map.width * TILE_SIZE || cy >= map.height * TILE_SIZE) return false;
  const tx = Math.floor(cx / TILE_SIZE);
  const ty = Math.floor(cy / TILE_SIZE);
  return isTileWalkable(map, terrain, tx, ty);
}

/**
 * 指定方向へ `speedPx` だけ移動を試みる。ぶつかる場合は移動せず向きだけ変える。
 * X軸・Y軸を別々に判定するため、斜め移動は発生しない(4方向移動)。
 */
export function stepMove(
  map: VillageMapDefinition,
  terrain: TileType[][],
  pos: FieldPosition,
  direction: Direction,
  speedPx: number,
): FieldPosition {
  const { dx, dy } = DIRECTION_DELTA[direction];
  const nx = pos.x + dx * speedPx;
  const ny = pos.y + dy * speedPx;
  if (canOccupy(map, terrain, nx, ny)) {
    return { x: nx, y: ny, facing: direction };
  }
  return { ...pos, facing: direction };
}

/** 現在のタイルから見て facing 方向に隣接するタイル座標 */
export function tileInFront(tile: { x: number; y: number }, facing: Direction): { x: number; y: number } {
  const { dx, dy } = DIRECTION_DELTA[facing];
  return { x: tile.x + dx, y: tile.y + dy };
}

export function findBuildingEntranceAt(
  map: VillageMapDefinition,
  x: number,
  y: number,
): BuildingDefinition | undefined {
  return map.buildings.find((b) => x === b.x + b.entranceOffsetX && y === b.y + b.entranceOffsetY);
}

export function findExitAt(map: VillageMapDefinition, x: number, y: number): ExitPlacement | undefined {
  return map.exits.find((e) => e.x === x && e.y === y);
}
