// テンション管理ミニゲームのチューニング用定数。
// 魚ごとの差別化は fish.json 側の pullPattern/pullPower/staminaMax で行い、
// ここの値は全魚共通の基礎パラメータとして扱う。

/** ゲームループの1tickあたりの時間(ms) */
export const TICK_MS = 200;

/** 「巻く」操作でのテンション上昇量(仕掛けのreelTensionModifierを掛けた値が実際の増分) */
export const REEL_TENSION_COST = 7;
/** 「巻く」操作での魚の体力減少量 */
export const REEL_DAMAGE = 8;

/** 「緩める」操作でのテンション減少量 */
export const EASE_TENSION_RELIEF = 10;
/** 「緩める」操作での魚の体力回復量 */
export const EASE_STAMINA_REGEN = 2;

/** テンションがこの値以上で警戒ゾーン(UI上の警告表示用) */
export const TENSION_WARNING = 70;
/** テンションがこの値(仕掛け補正後)に達すると糸が切れる */
export const TENSION_SNAP = 100;

/** アタリ発生からフッキングQTEに反応できる制限時間(ms) */
export const HOOK_WINDOW_MS = 1300;

/**
 * 道具(竿+糸)が魚の要求する糸の強度(requiredLineStrength)に対して不足/超過している分を、
 * 何倍にして糸切れ耐性(tensionSnapBonus)に反映するか。大きいほど「道具不足」の罰則が重くなり、
 * 逆に十分な道具を揃えていればその分ファイトが大きく楽になる(game/fightEngine.ts参照)。
 */
export const GEAR_DEFICIT_MULTIPLIER = 2;

/** キャストの飛距離ゲージが端から端まで往復するのにかかる時間(ms)。ゲージバーの周期 */
export const CAST_GAUGE_PERIOD_MS = 1300;
/** 飛距離ゲージの決定後、キャストモーションが終わるまでの演出時間(ms) */
export const CAST_MOTION_MS = 450;
