import type { SpotDefinition, ZukanEntry } from "../../types";
import { ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface SpotSelectScreenProps {
  spots: SpotDefinition[];
  zukan: Record<string, ZukanEntry>;
  onSelect: (spotId: string) => void;
  onBack: () => void;
}

function isUnlocked(spot: SpotDefinition, zukan: Record<string, ZukanEntry>): boolean {
  return !spot.unlockRequiresFishId || (zukan[spot.unlockRequiresFishId]?.caught ?? false);
}

export function SpotSelectScreen({ spots, zukan, onSelect, onBack }: SpotSelectScreenProps) {
  return (
    <ScreenShell title="釣り場を選ぶ" footer={<SecondaryButton onClick={onBack}>村に戻る</SecondaryButton>}>
      <div className="flex flex-col gap-3">
        {spots.map((spot) => {
          const unlocked = isUnlocked(spot, zukan);
          return (
            <button
              key={spot.id}
              onClick={() => unlocked && onSelect(spot.id)}
              disabled={!unlocked}
              className={`text-left rounded-xl border p-4 transition ${
                unlocked
                  ? "bg-white/10 border-white/20 active:scale-[0.98]"
                  : "bg-black/20 border-white/10 opacity-60"
              }`}
            >
              <div className="font-bold text-lg flex items-center gap-2">
                {!unlocked && <span>🔒</span>}
                {spot.name}
              </div>
              <p className="text-sm text-white/70 mt-1">
                {unlocked ? spot.description : "この先の釣り場に棲む「ぬし」を釣り上げると解放される。"}
              </p>
            </button>
          );
        })}
      </div>
    </ScreenShell>
  );
}
