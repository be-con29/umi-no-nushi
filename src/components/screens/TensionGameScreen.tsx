import { useEffect, useRef, useState } from "react";
import type { FishDefinition, RigDefinition } from "../../types";
import {
  createFightState,
  tensionPercent,
  tickFight,
  type FightAction,
  type FightState,
} from "../../game/fightEngine";
import { TICK_MS, TENSION_WARNING } from "../../game/balance";
import { Gauge } from "../ui/Gauge";
import { ScreenShell } from "../ui/ScreenShell";

interface TensionGameScreenProps {
  fish: FishDefinition;
  rig: RigDefinition;
  onFinish: (status: "won" | "lost") => void;
}

export function TensionGameScreen({ fish, rig, onFinish }: TensionGameScreenProps) {
  const [state, setState] = useState<FightState>(() => createFightState(fish));
  const actionRef = useRef<FightAction>("idle");
  const finishedRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (prev.status !== "fighting") return prev;
        return tickFight(prev, actionRef.current, fish, rig);
      });
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [fish, rig]);

  useEffect(() => {
    if (state.status !== "fighting" && !finishedRef.current) {
      finishedRef.current = true;
      const timer = window.setTimeout(() => onFinish(state.status as "won" | "lost"), 600);
      return () => window.clearTimeout(timer);
    }
  }, [state.status, onFinish]);

  const staminaPercent = (state.stamina / state.staminaMax) * 100;
  const tensPercent = tensionPercent(state, rig);

  function setAction(action: FightAction) {
    if (state.status === "fighting") actionRef.current = action;
  }

  return (
    <ScreenShell title="ファイト中！" subtitle={`${fish.emoji} ${fish.name}`}>
      <div className="flex flex-col gap-4">
        <Gauge label="魚の体力" percent={staminaPercent} colorClass="bg-emerald-400" />
        <Gauge
          label="糸の張力"
          percent={tensPercent}
          colorClass="bg-sky-400"
          warningPercent={TENSION_WARNING}
          warningColorClass="bg-red-500"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-8xl">{fish.emoji}</div>
        {state.status === "won" && <p className="mt-4 text-emerald-300 font-bold text-lg">釣り上げた！</p>}
        {state.status === "lost" && <p className="mt-4 text-red-400 font-bold text-lg">糸が切れた…逃げられた！</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 select-none">
        <button
          onPointerDown={() => setAction("reel")}
          onPointerUp={() => setAction("idle")}
          onPointerLeave={() => setAction("idle")}
          onPointerCancel={() => setAction("idle")}
          disabled={state.status !== "fighting"}
          className="min-h-16 rounded-xl bg-amber-400 text-blue-950 font-bold text-lg active:scale-[0.97] transition disabled:opacity-40"
        >
          巻く
        </button>
        <button
          onPointerDown={() => setAction("ease")}
          onPointerUp={() => setAction("idle")}
          onPointerLeave={() => setAction("idle")}
          onPointerCancel={() => setAction("idle")}
          disabled={state.status !== "fighting"}
          className="min-h-16 rounded-xl bg-white/10 border border-white/30 text-white font-bold text-lg active:scale-[0.97] transition disabled:opacity-40"
        >
          緩める
        </button>
      </div>
      <p className="text-center text-xs text-white/50">ボタンを押している間、そのアクションが続きます</p>
    </ScreenShell>
  );
}
