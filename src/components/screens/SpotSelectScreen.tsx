import type { SpotDefinition } from "../../types";
import { ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface SpotSelectScreenProps {
  spots: SpotDefinition[];
  onSelect: (spotId: string) => void;
  onBack: () => void;
}

export function SpotSelectScreen({ spots, onSelect, onBack }: SpotSelectScreenProps) {
  return (
    <ScreenShell title="釣り場を選ぶ" footer={<SecondaryButton onClick={onBack}>村に戻る</SecondaryButton>}>
      <div className="flex flex-col gap-3">
        {spots.map((spot) => (
          <button
            key={spot.id}
            onClick={() => onSelect(spot.id)}
            className="text-left rounded-xl bg-white/10 border border-white/20 p-4 active:scale-[0.98] transition"
          >
            <div className="font-bold text-lg">{spot.name}</div>
            <p className="text-sm text-white/70 mt-1">{spot.description}</p>
          </button>
        ))}
      </div>
    </ScreenShell>
  );
}
