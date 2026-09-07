import { useEffect, useRef, useState } from "react";
import type { BaitDefinition, FishDefinition, RigDefinition, SpotDefinition, TimeOfDay, Weather } from "../../types";
import {
  candidateFish,
  castGaugePosition,
  castQualityBiteMultiplier,
  castQualityFromPosition,
  pickFish,
  rollBiteWaitMs,
} from "../../game/fishing";
import { CAST_MOTION_MS, HOOK_WINDOW_MS } from "../../game/balance";
import { PrimaryButton, ScreenShell, SecondaryButton } from "../ui/ScreenShell";
import { WaterScene, type WaterPhase } from "../ui/WaterScene";

type Phase = "ready" | "castGauge" | "casting" | "waiting" | "bite" | "missed" | "noBite";
type MissReason = "early" | "late" | null;

const WATER_PHASE_BY_PHASE: Partial<Record<Phase, WaterPhase>> = {
  ready: "idle",
  castGauge: "idle",
  casting: "cast",
  waiting: "waiting",
  bite: "bite",
};

/** キャストの飛距離ゲージ。停止位置は呼び出し元が castGaugePosition で改めて計算する(表示との二重計算だが同じ純粋関数なのでズレない) */
function CastGaugeBar({ startTime }: { startTime: number }) {
  const markerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    function loop() {
      if (markerRef.current) {
        const position = castGaugePosition(performance.now() - startTime);
        markerRef.current.style.left = `${position}%`;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [startTime]);

  return (
    <div className="relative w-full h-6 bg-black/30 rounded-full border border-white/30 overflow-hidden">
      <div className="absolute inset-y-0 left-1/2 w-1.5 -ml-0.75 bg-emerald-400/70" />
      <div
        ref={markerRef}
        className="absolute top-0 bottom-0 w-2 -ml-1 bg-amber-400 rounded"
        style={{ left: "0%" }}
      />
    </div>
  );
}

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
  const [missReason, setMissReason] = useState<MissReason>(null);
  const [approach, setApproach] = useState(0);

  const hookedFishRef = useRef<FishDefinition | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const approachIntervalRef = useRef<number | undefined>(undefined);
  const gaugeStartRef = useRef(0);
  const castQualityRef = useRef(0);
  const waitStartRef = useRef(0);
  const waitDurationRef = useRef(1);

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      window.clearInterval(approachIntervalRef.current);
    };
  }, []);

  function startCastGauge() {
    gaugeStartRef.current = performance.now();
    setPhase("castGauge");
  }

  function stopGauge() {
    const elapsed = performance.now() - gaugeStartRef.current;
    castQualityRef.current = castQualityFromPosition(castGaugePosition(elapsed));
    setPhase("casting");
    timerRef.current = window.setTimeout(beginWaiting, CAST_MOTION_MS);
  }

  function beginWaiting() {
    const multiplier = castQualityBiteMultiplier(castQualityRef.current);
    const waitMs = rollBiteWaitMs(spot, bait, rig) / multiplier;
    waitStartRef.current = performance.now();
    waitDurationRef.current = waitMs;
    setApproach(0);
    setPhase("waiting");

    approachIntervalRef.current = window.setInterval(() => {
      setApproach(Math.min(1, (performance.now() - waitStartRef.current) / waitDurationRef.current));
    }, 100);

    timerRef.current = window.setTimeout(() => {
      window.clearInterval(approachIntervalRef.current);
      const candidates = candidateFish(allFish, spot, bait, timeOfDay, weather);
      const fish = pickFish(candidates);
      if (!fish) {
        setPhase("noBite");
        return;
      }
      hookedFishRef.current = fish;
      setPhase("bite");
      timerRef.current = window.setTimeout(() => {
        setMissReason("late");
        setPhase("missed");
      }, HOOK_WINDOW_MS);
    }, waitMs);
  }

  function handleSceneTap() {
    if (phase === "waiting") {
      window.clearTimeout(timerRef.current);
      window.clearInterval(approachIntervalRef.current);
      setMissReason("early");
      setPhase("missed");
    } else if (phase === "bite") {
      handleHookTap();
    }
  }

  function handleHookTap() {
    window.clearTimeout(timerRef.current);
    const fish = hookedFishRef.current;
    if (fish) onHooked(fish);
  }

  const waterPhase = WATER_PHASE_BY_PHASE[phase] ?? "idle";

  return (
    <ScreenShell
      title={spot.name}
      subtitle={`餌: ${bait.emoji}${bait.name} / ${rig.name}`}
      footer={<SecondaryButton onClick={onBack}>タックルを変える</SecondaryButton>}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-2">
        <div onClick={handleSceneTap} className={phase === "waiting" || phase === "bite" ? "cursor-pointer" : ""}>
          <WaterScene phase={waterPhase} approach={approach} />
        </div>

        {phase === "ready" && <p className="text-white/70 text-sm">準備はいいか？キャストしよう。</p>}
        {phase === "castGauge" && (
          <div className="w-full px-2">
            <p className="text-white/70 text-xs text-center mb-1">中央でタイミングよく止めよう</p>
            <CastGaugeBar startTime={gaugeStartRef.current} />
          </div>
        )}
        {phase === "casting" && <p className="text-white/70 text-sm">仕掛けを投げ入れた…</p>}
        {phase === "waiting" && (
          <p className="text-white/70 text-sm animate-pulse">魚のアタリを待っている…(早合わせ注意)</p>
        )}
        {phase === "bite" && (
          <p className="text-amber-300 font-bold text-lg animate-bounce">アタリだ！今すぐタップ！</p>
        )}
        {phase === "missed" && (
          <p className="text-white/70 text-sm">
            {missReason === "early" ? "早合わせしてしまった…魚に逃げられた。" : "合わせが遅れて逃げられてしまった…"}
          </p>
        )}
        {phase === "noBite" && <p className="text-white/70 text-sm">今日はこの餌に反応がないようだ…</p>}
      </div>

      <div className="flex flex-col gap-3">
        {phase === "ready" && <PrimaryButton onClick={startCastGauge}>🎣 キャストする</PrimaryButton>}
        {phase === "castGauge" && <PrimaryButton onClick={stopGauge}>止める！</PrimaryButton>}
        {phase === "bite" && (
          <PrimaryButton className="bg-red-400 animate-pulse" onClick={handleHookTap}>
            合わせる！
          </PrimaryButton>
        )}
        {(phase === "missed" || phase === "noBite") && (
          <PrimaryButton onClick={startCastGauge}>もう一度キャストする</PrimaryButton>
        )}
        {(phase === "casting" || phase === "waiting") && <PrimaryButton disabled>待機中…</PrimaryButton>}
      </div>
    </ScreenShell>
  );
}
