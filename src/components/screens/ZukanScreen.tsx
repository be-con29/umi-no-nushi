import type { FishDefinition, ZukanEntry } from "../../types";
import { ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface ZukanScreenProps {
  fishList: FishDefinition[];
  zukan: Record<string, ZukanEntry>;
  onBack: () => void;
}

const RARITY_LABEL: Record<number, string> = {
  1: "★☆☆☆☆",
  2: "★★☆☆☆",
  3: "★★★☆☆",
  4: "★★★★☆",
  5: "★★★★★",
};

export function ZukanScreen({ fishList, zukan, onBack }: ZukanScreenProps) {
  const caughtCount = fishList.filter((f) => zukan[f.id]?.caught).length;

  return (
    <ScreenShell
      title="図鑑"
      subtitle={`${caughtCount} / ${fishList.length} 種 発見`}
      footer={<SecondaryButton onClick={onBack}>村に戻る</SecondaryButton>}
    >
      <div className="flex flex-col gap-2">
        {fishList.map((fish) => {
          const entry = zukan[fish.id];
          const discovered = entry?.caught ?? false;
          return (
            <div
              key={fish.id}
              className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/20 p-3"
            >
              <span className="text-3xl w-10 text-center">{discovered ? fish.emoji : "❔"}</span>
              <div className="flex-1">
                <div className="font-bold">{discovered ? fish.name : "？？？"}</div>
                {discovered ? (
                  <p className="text-xs text-white/70 mt-0.5">{fish.description}</p>
                ) : (
                  <p className="text-xs text-white/40 mt-0.5">まだ釣ったことがない</p>
                )}
                <div className="text-xs text-amber-200 mt-1">{RARITY_LABEL[fish.rarity]}</div>
              </div>
              {discovered && (
                <div className="text-right text-xs text-white/70">
                  <div>最大 {entry.bestSizeCm}cm</div>
                  <div>捕獲数 {entry.count}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}
