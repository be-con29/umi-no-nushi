// フィールド探索の移動・当たり判定。副作用のない純粋関数として実装し、
// UI(FieldScreen.tsx)はこの結果を描画・画面遷移に反映するだけにする。
import type { Direction, FieldEntity, VillageMapDefinition } from "../types";

export interface FieldPosition {
  x: number;
  y: number;
  facing: Direction;
}

const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function findEntityAt(map: VillageMapDefinition, x: number, y: number): FieldEntity | undefined {
  return map.entities.find((e) => e.x === x && e.y === y);
}

function inBounds(map: VillageMapDefinition, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export type MoveResult =
  /** 空きマスへ実際に移動した(出口に乗った場合は steppedOn にそのエンティティが入る) */
  | { kind: "moved"; position: FieldPosition; steppedOn?: FieldEntity }
  /** NPC/建物にぶつかって足止めされた(向きだけ変わる)。呼び出し側でそのエンティティのactionを実行する */
  | { kind: "interact"; position: FieldPosition; entity: FieldEntity }
  /** マップ外に出ようとして向きだけ変わった */
  | { kind: "blocked"; position: FieldPosition };

/**
 * 現在位置から指定方向へ1マス移動を試みる。移動可否・インタラクション発生を判定して返す。
 */
export function attemptMove(
  map: VillageMapDefinition,
  current: FieldPosition,
  direction: Direction,
): MoveResult {
  const { dx, dy } = DIRECTION_DELTA[direction];
  const targetX = current.x + dx;
  const targetY = current.y + dy;
  const faced: FieldPosition = { ...current, facing: direction };

  if (!inBounds(map, targetX, targetY)) {
    return { kind: "blocked", position: faced };
  }

  const entity = findEntityAt(map, targetX, targetY);
  if (entity && (entity.type === "npc" || entity.type === "building")) {
    return { kind: "interact", position: faced, entity };
  }

  const moved: FieldPosition = { x: targetX, y: targetY, facing: direction };
  if (entity && entity.type === "exit") {
    return { kind: "moved", position: moved, steppedOn: entity };
  }
  return { kind: "moved", position: moved };
}
