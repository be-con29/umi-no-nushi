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
