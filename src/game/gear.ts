// 所持している竿・リール・糸から、現在の装備ステータスを求める。副作用のない純粋関数。
// 餌・仕掛けと違い、道具屋で買った所持品の中から tier が最も高いものを自動装備する方針
// (CLAUDE.md参照)。
import type { LineDefinition, ReelDefinition, RodDefinition } from "../types";

export interface GearStats {
  /** 竿の弾力。糸切れ耐性(tensionSnapBonus)に加算される */
  rodFlex: number;
  /** リールの巻き取り力。「巻く」操作の体力ダメージに掛かる倍率 */
  reelPower: number;
  /** 糸の強度。魚の requiredLineStrength と比較するゲート判定に使う */
  lineStrength: number;
}

function highestTierOwned<T extends { id: string; tier: number }>(all: T[], ownedIds: string[]): T {
  const owned = all.filter((item) => ownedIds.includes(item.id));
  const pool = owned.length > 0 ? owned : all;
  return pool.reduce((best, cur) => (cur.tier > best.tier ? cur : best), pool[0]);
}

export function currentGear(
  rods: RodDefinition[],
  reels: ReelDefinition[],
  lines: LineDefinition[],
  ownedRodIds: string[],
  ownedReelIds: string[],
  ownedLineIds: string[],
): GearStats {
  const rod = highestTierOwned(rods, ownedRodIds);
  const reel = highestTierOwned(reels, ownedReelIds);
  const line = highestTierOwned(lines, ownedLineIds);
  return { rodFlex: rod.flex, reelPower: reel.reelPower, lineStrength: line.strength };
}
