// ゲームデータ・セーブデータの型定義。
// src/data/*.json はここで定義した型に沿って追記していくだけで拡張できる想定。

/** 魚の「引きのクセ」パターン。fightEngine.ts で解釈する。 */
export type PullPattern = "steady" | "burst" | "diver" | "erratic";

export interface FishDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** 1(よく釣れる)〜5(激レア) */
  rarity: 1 | 2 | 3 | 4 | 5;
  /** アタリ抽選時の相対的な出現しやすさ。数字が大きいほど釣れやすい */
  spawnWeight: number;
  minSizeCm: number;
  maxSizeCm: number;
  /** サイズ最大時の売却基準額。実際の価格はサイズ比率で補正する */
  basePrice: number;

  /** テンション管理ミニゲームでの体力(HP)。0になったら釣り上げ成功 */
  staminaMax: number;
  /** 引きのクセ */
  pullPattern: PullPattern;
  /** 引きの基本の強さ(1tickあたりのテンション上昇量の目安) */
  pullPower: number;
  /** burstパターン用: 1tickごとに強い引きが発生する確率(0〜1) */
  burstChance?: number;
  /** burstパターン用: 発生時のpullPower倍率 */
  burstMultiplier?: number;
  /** burstパターン用: 強い引きが継続するtick数 */
  burstDurationTicks?: number;
  /** diverパターン用: 「潜り」フェーズの長さ(tick数) */
  diveDurationTicks?: number;
  /** diverパターン用: 「ダッシュ」フェーズの長さ(tick数) */
  dashDurationTicks?: number;
  /** diverパターン用: ダッシュ時のpullPower倍率 */
  dashMultiplier?: number;

  /** このIDの餌でないと食いつかない */
  favoredBaitIds: string[];
  /** 生息する釣り場ID */
  spotIds: string[];
}

export interface BaitDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** 1回の釣行で使用する際のコスト(所持金から差し引く) */
  cost: number;
  /** アタリが発生するまでの待ち時間・確率に掛かる倍率。大きいほどアタリが早い */
  biteRateMultiplier: number;
}

export interface RigDefinition {
  id: string;
  name: string;
  description: string;
  /** 糸切れ判定(tension>=100)への耐性。実効テンション = tension - tensionSnapBonus */
  tensionSnapBonus: number;
  /** 「巻く」操作時のテンション上昇量に掛かる倍率 */
  reelTensionModifier: number;
  /** アタリ発生率に掛かる倍率 */
  biteRateMultiplier: number;
}

export interface SpotDefinition {
  id: string;
  name: string;
  description: string;
  fishIds: string[];
  /** アタリが発生するまでの基準待ち時間(ms) */
  biteWaitMinMs: number;
  biteWaitMaxMs: number;
}

// ---- セーブデータ ----

export interface CaughtFish {
  instanceId: string;
  fishId: string;
  sizeCm: number;
  price: number;
  caughtAt: number;
}

export interface ZukanEntry {
  caught: boolean;
  count: number;
  bestSizeCm: number;
}

export interface SaveData {
  version: 1;
  money: number;
  stock: CaughtFish[];
  zukan: Record<string, ZukanEntry>;
  lastBaitId?: string;
  lastRigId?: string;
}
