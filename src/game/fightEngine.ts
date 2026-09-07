// テンション管理ミニゲームの1tick分の状態遷移。副作用のない純粋関数として実装し、
// UI(TensionGameScreen)からは createFightState / tickFight を呼ぶだけにする。
import type { FishDefinition, RigDefinition } from "../types";
import {
  EASE_STAMINA_REGEN,
  EASE_TENSION_RELIEF,
  REEL_DAMAGE,
  REEL_TENSION_COST,
  TENSION_SNAP,
} from "./balance";

export type FightAction = "reel" | "ease" | "idle";
export type FightStatus = "fighting" | "won" | "lost";

interface BurstPatternState {
  kind: "burst";
  ticksRemaining: number;
}
interface DiverPatternState {
  kind: "diver";
  phase: "dive" | "dash";
  ticksRemaining: number;
}
interface SimplePatternState {
  kind: "steady" | "erratic";
}
export type PatternState = BurstPatternState | DiverPatternState | SimplePatternState;

export interface FightState {
  /** 生の張力値。表示用の0-100%への変換は effectiveSnapTension() を使う */
  tension: number;
  stamina: number;
  staminaMax: number;
  status: FightStatus;
  patternState: PatternState;
  /** UI演出用: 直近tickで魚の引きがどれだけ強かったか */
  lastFishPull: number;
}

/** 仕掛け補正込みの「これに達したら糸が切れる」張力値 */
export function effectiveSnapTension(rig: RigDefinition): number {
  return TENSION_SNAP + rig.tensionSnapBonus;
}

/** ゲージ表示用に 0-100 の割合へ変換する */
export function tensionPercent(state: FightState, rig: RigDefinition): number {
  return Math.min(100, (state.tension / effectiveSnapTension(rig)) * 100);
}

export function createFightState(fish: FishDefinition): FightState {
  let patternState: PatternState;
  switch (fish.pullPattern) {
    case "burst":
      patternState = { kind: "burst", ticksRemaining: 0 };
      break;
    case "diver":
      patternState = { kind: "diver", phase: "dive", ticksRemaining: fish.diveDurationTicks ?? 4 };
      break;
    default:
      patternState = { kind: fish.pullPattern === "erratic" ? "erratic" : "steady" };
  }
  return {
    tension: 25,
    stamina: fish.staminaMax,
    staminaMax: fish.staminaMax,
    status: "fighting",
    patternState,
    lastFishPull: 0,
  };
}

/** 魚の引きによるテンション増減量(このtick分)と、更新後のpatternStateを計算する */
function computeFishPull(
  fish: FishDefinition,
  patternState: PatternState,
  random: () => number,
): { delta: number; nextPatternState: PatternState } {
  switch (fish.pullPattern) {
    case "steady": {
      return { delta: fish.pullPower, nextPatternState: patternState };
    }
    case "erratic": {
      // 毎tickランダムに強弱が変わる予測不能な引き(マイナスに触れることもある)
      const delta = fish.pullPower * (random() * 1.8 - 0.4);
      return { delta, nextPatternState: patternState };
    }
    case "burst": {
      const state = patternState as BurstPatternState;
      if (state.ticksRemaining > 0) {
        const delta = fish.pullPower * (fish.burstMultiplier ?? 2.5);
        return {
          delta,
          nextPatternState: { kind: "burst", ticksRemaining: state.ticksRemaining - 1 },
        };
      }
      const triggered = random() < (fish.burstChance ?? 0.15);
      if (triggered) {
        const duration = fish.burstDurationTicks ?? 3;
        const delta = fish.pullPower * (fish.burstMultiplier ?? 2.5);
        return { delta, nextPatternState: { kind: "burst", ticksRemaining: duration - 1 } };
      }
      return { delta: fish.pullPower * 0.4, nextPatternState: state };
    }
    case "diver": {
      const state = patternState as DiverPatternState;
      if (state.phase === "dive") {
        // 潜行中は引きが弱く、テンションはむしろ緩む(油断を誘う)
        const delta = -fish.pullPower * 0.5;
        if (state.ticksRemaining > 1) {
          return { delta, nextPatternState: { ...state, ticksRemaining: state.ticksRemaining - 1 } };
        }
        return {
          delta,
          nextPatternState: {
            kind: "diver",
            phase: "dash",
            ticksRemaining: fish.dashDurationTicks ?? 2,
          },
        };
      }
      // dashフェーズ: 一気に強い引き
      const delta = fish.pullPower * (fish.dashMultiplier ?? 4);
      if (state.ticksRemaining > 1) {
        return { delta, nextPatternState: { ...state, ticksRemaining: state.ticksRemaining - 1 } };
      }
      return {
        delta,
        nextPatternState: {
          kind: "diver",
          phase: "dive",
          ticksRemaining: fish.diveDurationTicks ?? 4,
        },
      };
    }
  }
}

export function tickFight(
  state: FightState,
  action: FightAction,
  fish: FishDefinition,
  rig: RigDefinition,
  random: () => number = Math.random,
): FightState {
  if (state.status !== "fighting") return state;

  const { delta: fishDelta, nextPatternState } = computeFishPull(fish, state.patternState, random);

  let tension = state.tension + fishDelta;
  let stamina = state.stamina;

  if (action === "reel") {
    tension += REEL_TENSION_COST * rig.reelTensionModifier;
    stamina -= REEL_DAMAGE;
  } else if (action === "ease") {
    tension -= EASE_TENSION_RELIEF;
    stamina += EASE_STAMINA_REGEN;
  }

  tension = Math.max(0, tension);
  stamina = Math.min(state.staminaMax, Math.max(0, stamina));

  const effectiveSnap = effectiveSnapTension(rig);

  let status: FightStatus = "fighting";
  if (stamina <= 0) status = "won";
  else if (tension >= effectiveSnap) status = "lost";

  return {
    tension,
    stamina,
    staminaMax: state.staminaMax,
    status,
    patternState: nextPatternState,
    lastFishPull: fishDelta,
  };
}
