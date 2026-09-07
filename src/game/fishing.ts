// アタリ抽選・魚の選択・釣果のサイズ/価格計算。副作用のない純粋関数として実装する。
import type { BaitDefinition, FishDefinition, RigDefinition, SpotDefinition, TimeOfDay, Weather } from "../types";
import { CAST_GAUGE_PERIOD_MS } from "./balance";

/**
 * キャストの飛距離ゲージの現在位置(0〜100)を、経過時間から求める。
 * 三角波で0→100→0を往復させ、中央(50)がジャストタイミングの「的」になる。
 */
export function castGaugePosition(elapsedMs: number): number {
  const t = (elapsedMs % (CAST_GAUGE_PERIOD_MS * 2)) / CAST_GAUGE_PERIOD_MS;
  return t <= 1 ? t * 100 : (2 - t) * 100;
}

/** ゲージ停止位置(0〜100)から、中央にどれだけ近いかを 0(外れ)〜1(ジャスト) の質で返す */
export function castQualityFromPosition(position: number): number {
  const distanceFromCenter = Math.abs(position - 50);
  return Math.max(0, 1 - distanceFromCenter / 50);
}

/**
 * キャストの質をアタリ待ち時間の倍率に変換する。質が高いほど遠くまで飛び、待ち時間が短くなる
 * (biteRateMultiplier 相当としてそのまま rollBiteWaitMs に掛け合わせられる)。
 */
export function castQualityBiteMultiplier(quality: number): number {
  return 1 + quality * 0.5;
}

/**
 * 指定の釣り場・餌・時間帯・天候で食いつく可能性のある魚の一覧を返す。
 * `appearsInTimeOfDay` / `appearsInWeather` が設定されている魚(主にぬし)は、
 * その条件に合致しない限り候補から外れる=アタリが発生しない。
 */
export function candidateFish(
  fish: FishDefinition[],
  spot: SpotDefinition,
  bait: BaitDefinition,
  timeOfDay: TimeOfDay,
  weather: Weather,
): FishDefinition[] {
  return fish.filter(
    (f) =>
      spot.fishIds.includes(f.id) &&
      f.favoredBaitIds.includes(bait.id) &&
      (!f.appearsInTimeOfDay || f.appearsInTimeOfDay.includes(timeOfDay)) &&
      (!f.appearsInWeather || f.appearsInWeather.includes(weather)),
  );
}

/**
 * spawnWeight による重み付き抽選で1匹選ぶ。
 * 該当する魚がいない場合は null を返す(呼び出し側で「反応なし」等を表示する)。
 */
export function pickFish(candidates: FishDefinition[], random: () => number = Math.random): FishDefinition | null {
  if (candidates.length === 0) return null;
  const totalWeight = candidates.reduce((sum, f) => sum + f.spawnWeight, 0);
  let roll = random() * totalWeight;
  for (const f of candidates) {
    roll -= f.spawnWeight;
    if (roll <= 0) return f;
  }
  return candidates[candidates.length - 1];
}

/** アタリが発生するまでの待ち時間(ms)を、釣り場・餌・仕掛けの倍率から計算する */
export function rollBiteWaitMs(
  spot: SpotDefinition,
  bait: BaitDefinition,
  rig: RigDefinition,
  random: () => number = Math.random,
): number {
  const multiplier = bait.biteRateMultiplier * rig.biteRateMultiplier;
  const min = spot.biteWaitMinMs / multiplier;
  const max = spot.biteWaitMaxMs / multiplier;
  return min + random() * (max - min);
}

/** 釣れた魚のサイズ(cm)をランダムに決定する */
export function rollSizeCm(fish: FishDefinition, random: () => number = Math.random): number {
  return Math.round(fish.minSizeCm + random() * (fish.maxSizeCm - fish.minSizeCm));
}

/** サイズに応じた売却価格を計算する(最大サイズ比でbasePriceを補正) */
export function calcPrice(fish: FishDefinition, sizeCm: number): number {
  const ratio = sizeCm / fish.maxSizeCm;
  // 小さくても基準額の40%は保証し、大きいほど基準額に近づく
  const scaled = fish.basePrice * (0.4 + 0.6 * ratio);
  return Math.max(1, Math.round(scaled));
}
