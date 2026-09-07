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

  /**
   * このファイトに耐えるために必要な糸の強度(LineDefinition.strength)。
   * 実際の糸切れ耐性は `rodFlex + 2 * (lineStrength - requiredLineStrength)` で計算され、
   * 道具がこの値に満たないと閾値が大きく下がり、掛かってもほぼ確実に糸を切られる
   * (game/fightEngine.ts の effectiveSnapTension を参照)。
   */
  requiredLineStrength: number;
  /** エリアの「ぬし」であるか。ぬしを釣ると対応する釣り場の unlockRequiresFishId が解放される */
  isNushi?: boolean;
  /** 指定した場合、この時間帯以外ではアタリが発生しない(ぬしの出現条件) */
  appearsInTimeOfDay?: TimeOfDay[];
  /** 指定した場合、この天候以外ではアタリが発生しない(ぬしの出現条件) */
  appearsInWeather?: Weather[];
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
  /** 指定した場合、このIDの魚を一度でも釣り上げるまでこの釣り場は選択できない */
  unlockRequiresFishId?: string;
}

// ---- 道具(竿・リール・糸) ----
// 餌・仕掛けと違い、釣行ごとの選択ではなく道具屋で購入して持ち帰る「所持品」として扱う。
// 各カテゴリで所持している中から tier が最も高いものを自動装備する(game/gear.ts)。

export interface RodDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** 高いほど強い(所持品から自動装備する基準になる) */
  tier: number;
  /** 竿の弾力。大きいほど糸切れ耐性(tensionSnapBonus)に加算される */
  flex: number;
}

export interface ReelDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  tier: number;
  /** リールの巻き取り力。「巻く」操作の体力ダメージに掛かる倍率(基準1.0) */
  reelPower: number;
}

export interface LineDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  tier: number;
  /** 糸の強度。魚の requiredLineStrength と比較され、不足すると糸切れ耐性が大きく下がる */
  strength: number;
}

// ---- フィールド探索(SFC風タイルマップ) ----
// 見た目は絵文字を一切使わず、game/pixelArt.ts がコードで直接ドット絵を描画する。

export type Direction = "up" | "down" | "left" | "right";

/**
 * 地形タイル種別。1文字コードは data/village.json の `terrainRows` で使う
 * (凡例は game/field.ts の TILE_CODE を参照)。
 * - dirt: 土 / grass: 草 / sand: 砂 / cobble: 石畳 / rock: 岩(通行不可)
 * - sea: 海(通行不可・波アニメ) / beach: 砂浜 / pier: 桟橋の木床
 */
export type TileType = "dirt" | "grass" | "sand" | "cobble" | "rock" | "sea" | "beach" | "pier";

/**
 * フィールド上のインタラクション(建物入口/NPC/出口)にふれた時の振る舞い。
 * - talk: villagers.json の会話データを表示する
 * - dialogue: その場に書かれた台詞をそのまま表示する(ショップの仮台詞など)
 * - screen: 既存の画面(Screen)へ遷移する
 * - restAtInn: 宿屋で休む(時間帯を進める)
 */
export type FieldEntityAction =
  | { kind: "talk"; villagerId: string }
  | { kind: "dialogue"; speakerName: string; lines: string[] }
  | { kind: "screen"; target: "stock" | "zukan" | "spotSelect" | "toolShop" }
  | { kind: "restAtInn" };

/**
 * 建物。左上タイル座標(x, y)から width×height タイルの矩形を占有し、
 * 入口タイル(x+entranceOffsetX, y+entranceOffsetY)以外は通行不可の壁として扱う。
 * 入口タイルに乗ると action が発火する。
 */
export interface BuildingDefinition {
  id: string;
  name: string;
  x: number;
  y: number;
  /** 幅(タイル数)。3〜4程度を想定 */
  width: number;
  /** 高さ(タイル数)。2〜3程度を想定 */
  height: number;
  entranceOffsetX: number;
  entranceOffsetY: number;
  /** 屋根・壁の配色(パレットのキー)。game/pixelArt.ts のパレットに合わせる */
  roofColor: string;
  wallColor: string;
  action: FieldEntityAction;
}

/** フィールド上に配置されたNPC。移動はせず、その場で向きを変える程度の動きをする */
export interface NpcPlacement {
  id: string;
  villagerId: string;
  x: number;
  y: number;
  facing: Direction;
}

/** 1タイルの単純な移動先トリガー(桟橋の先→釣り場選択、など)。地形は通行可能である前提 */
export interface ExitPlacement {
  id: string;
  name: string;
  x: number;
  y: number;
  action: FieldEntityAction;
}

export interface VillageMapDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  /** 1行1文字コードの地形定義。terrainRows[y][x] が TILE_CODE のキー(game/field.ts) */
  terrainRows: string[];
  buildings: BuildingDefinition[];
  npcs: NpcPlacement[];
  exits: ExitPlacement[];
  /** プレイヤーの初期出現位置(タイル座標) */
  startX: number;
  startY: number;
}

export interface VillagerDefinition {
  id: string;
  name: string;
  /** ドット絵スプライトの服の色(パレットのキー)。game/pixelArt.ts のパレットに合わせる */
  spriteColor: string;
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
  version: 3;
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
  /** 所持している竿/リール/糸のID一覧。tierが最も高いものを自動装備する */
  ownedRodIds: string[];
  ownedReelIds: string[];
  ownedLineIds: string[];
}
