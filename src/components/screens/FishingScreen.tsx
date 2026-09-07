import { useEffect, useRef, useState } from "react";
import type { BaitDefinition, FishDefinition, RigDefinition, SpotDefinition, TimeOfDay, Weather } from "../../types";
import { candidateFish, pickFish, rollBiteWaitMs } from "../../game/fishing";
import { HOOK_WINDOW_MS } from "../../game/balance";
import { PrimaryButton, ScreenShell, SecondaryButton } from "../ui/ScreenShell";

type Phase = "ready" | "casting" | "waiting" | "bite" | "missed" | "noBite";

interface FishingScreenProps {
  spot: SpotDefinition;
  bait: BaitDefinition;
  rig: RigDefinition;
  allFish: FishDefinition[];
  timeOfDay: TimeOfDay;
  weather: Weather;
  onHooked: (fish: FishDefinition) => void;
  onBack: () => void;
}

export function FishingScreen({ spot, bait, rig, allFish, timeOfDay, weather, onHooked, onBack }: FishingScreenProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const hookedFishRef = useRef<FishDefinition | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  function startCast() {
    setPhase("casting");
    timerRef.current = window.setTimeout(() => {
      setPhase("waiting");
      const waitMs = rollBiteWaitMs(spot, bait, rig);
      timerRef.current = window.setTimeout(() => {
        const candidates = candidateFish(allFish, spot, bait, timeOfDay, weather);
        const fish = pickFish(candidates);
        if (!fish) {
          setPhase("noBite");
          return;
        }
        hookedFishRef.current = fish;
        setPhase("bite");
        timerRef.current = window.setTimeout(() => {
          setPhase("missed");
        }, HOOK_WINDOW_MS);
      }, waitMs);
    }, 500);
  }

  function handleHookTap() {
    window.clearTimeout(timerRef.current);
    const fish = hookedFishRef.current;
    if (fish) onHooked(fish);
  }

  return (
    <ScreenShell
      title={spot.name}
      subtitle={`餌: ${bait.emoji}${bait.name} / ${rig.name}`}
      footer={<SecondaryButton onClick={onBack}>タックルを変える</SecondaryButton>}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-6">
        <div className="text-8xl select-none">
          {phase === "bite" ? "❗" : phase === "casting" ? "🎣" : "🌊"}
        </div>

        {phase === "ready" && <p className="text-white/70 text-sm">準備はいいか？キャストしよう。</p>}
        {phase === "casting" && <p className="text-white/70 text-sm">仕掛けを投げ入れた…</p>}
        {phase === "waiting" && <p className="text-white/70 text-sm animate-pulse">魚のアタリを待っている…</p>}
        {phase === "bite" && (
          <p className="text-amber-300 font-bold text-lg animate-bounce">アタリだ！今すぐタップ！</p>
        )}
        {phase === "missed" && <p className="text-white/70 text-sm">逃げられてしまった…</p>}
        {phase === "noBite" && <p className="text-white/70 text-sm">今日はこの餌に反応がないようだ…</p>}
      </div>

      <div className="flex flex-col gap-3">
        {phase === "ready" && <PrimaryButton onClick={startCast}>🎣 キャストする</PrimaryButton>}
        {phase === "bite" && (
          <PrimaryButton className="bg-red-400 animate-pulse" onClick={handleHookTap}>
            合わせる！
          </PrimaryButton>
        )}
        {(phase === "missed" || phase === "noBite") && (
          <PrimaryButton onClick={startCast}>もう一度キャストする</PrimaryButton>
        )}
        {(phase === "casting" || phase === "waiting") && (
          <PrimaryButton disabled>待機中…</PrimaryButton>
        )}
      </div>
    </ScreenShell>
  );
}
