import { useState } from "react";
import type { BaitDefinition, RigDefinition } from "../../types";
import { MoneyBadge } from "../ui/MoneyBadge";
import { PrimaryButton, ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface TackleScreenProps {
  baits: BaitDefinition[];
  rigs: RigDefinition[];
  money: number;
  initialBaitId?: string;
  initialRigId?: string;
  /** 現在装備中の竿・リール・糸の名前(表示用) */
  gearSummary: { rodName: string; reelName: string; lineName: string };
  onConfirm: (baitId: string, rigId: string) => void;
  onBack: () => void;
}

export function TackleScreen({
  baits,
  rigs,
  money,
  initialBaitId,
  initialRigId,
  gearSummary,
  onConfirm,
  onBack,
}: TackleScreenProps) {
  const [baitId, setBaitId] = useState(initialBaitId ?? baits[0]?.id);
  const [rigId, setRigId] = useState(initialRigId ?? rigs[0]?.id);

  const selectedBait = baits.find((b) => b.id === baitId);
  const canAfford = !selectedBait || money >= selectedBait.cost;

  return (
    <ScreenShell
      title="餌と仕掛けを選ぶ"
      subtitle="出船前に準備を整えよう"
      footer={
        <div className="flex flex-col gap-2">
          <PrimaryButton
            disabled={!baitId || !rigId || !canAfford}
            onClick={() => baitId && rigId && onConfirm(baitId, rigId)}
          >
            {canAfford ? "出船する" : "お金が足りない"}
          </PrimaryButton>
          <SecondaryButton onClick={onBack}>戻る</SecondaryButton>
        </div>
      }
    >
      <div className="flex justify-center">
        <MoneyBadge money={money} />
      </div>

      <div className="text-xs text-white/60 text-center bg-white/5 border border-white/10 rounded-lg py-2 px-3">
        現在の装備: {gearSummary.rodName} / {gearSummary.reelName} / {gearSummary.lineName}
      </div>

      <section>
        <h2 className="text-sm font-bold text-white/80 mb-2">餌</h2>
        <div className="flex flex-col gap-2">
          {baits.map((bait) => (
            <button
              key={bait.id}
              onClick={() => setBaitId(bait.id)}
              className={`text-left rounded-xl border p-3 flex gap-3 items-start transition ${
                baitId === bait.id
                  ? "bg-amber-400/20 border-amber-300"
                  : "bg-white/10 border-white/20"
              }`}
            >
              <span className="text-2xl leading-none">{bait.emoji}</span>
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">{bait.name}</span>
                  <span className="text-xs text-amber-200">{bait.cost}円</span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">{bait.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-white/80 mb-2">仕掛け</h2>
        <div className="flex flex-col gap-2">
          {rigs.map((rig) => (
            <button
              key={rig.id}
              onClick={() => setRigId(rig.id)}
              className={`text-left rounded-xl border p-3 transition ${
                rigId === rig.id
                  ? "bg-amber-400/20 border-amber-300"
                  : "bg-white/10 border-white/20"
              }`}
            >
              <div className="font-bold">{rig.name}</div>
              <p className="text-xs text-white/70 mt-0.5">{rig.description}</p>
            </button>
          ))}
        </div>
      </section>
    </ScreenShell>
  );
}
