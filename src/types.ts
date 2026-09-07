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

// ---- フィールド探索 ----

export type Direction = "up" | "down" | "left" | "right";

export type FieldEntityType = "npc" | "building" | "exit";

/**
 * フィールド上のエンティティ(NPC/建物/出口)にぶつかった時の振る舞い。
 * - talk: villagers.json の会話データを表示する
 * - dialogue: その場に書かれた台詞をそのまま表示する(ショップの仮台詞など)
 * - screen: 既存の画面(Screen)へ遷移する
 * - restAtInn: 宿屋で休む(時間帯を進める)
 */
export type FieldEntityAction =
  | { kind: "talk"; villagerId: string }
  | { kind: "dialogue"; speakerName: string; lines: string[] }
  | { kind: "screen"; target: "stock" | "zukan" | "spotSelect" }
  | { kind: "restAtInn" };

export interface FieldEntity {
  id: string;
  type: FieldEntityType;
  name: string;
  emoji: string;
  x: number;
  y: number;
  action: FieldEntityAction;
}

export interface VillageMapDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  entities: FieldEntity[];
  /** プレイヤーの初期出現位置 */
  startX: number;
  startY: number;
}

export interface VillagerDefinition {
  id: string;
  name: string;
  emoji: string;
  /** 1回の会話で1文ずつ順番に表示する台詞 */
  lines: string[];
}

// ---- 時間・天候 ----

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";
export type Weather = "sunny" | "cloudy" | "rainy";

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
  version: 2;
  money: number;
  stock: CaughtFish[];
  zukan: Record<string, ZukanEntry>;
  lastBaitId?: string;
  lastRigId?: string;
  /** 経過日数(1始まり) */
  day: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
  /** 村人から聞いて解放した噂ID(将来、釣り場の解放条件として使う) */
  rumors: string[];
}
