import type { FishDefinition } from "../../types";
import { PrimaryButton, ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface ResultScreenProps {
  status: "won" | "lost";
  fish: FishDefinition;
  sizeCm?: number;
  price?: number;
  isNewRecord?: boolean;
  /** 初めてぬしを釣り上げ、新しい釣り場が解放された場合にその名前を渡す */
  unlockedSpotName?: string;
  onContinue: () => void;
  onBackToVillage: () => void;
}

export function ResultScreen({
  status,
  fish,
  sizeCm,
  price,
  isNewRecord,
  unlockedSpotName,
  onContinue,
  onBackToVillage,
}: ResultScreenProps) {
  return (
    <ScreenShell title={status === "won" ? "釣果！" : "残念…"}>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <div className="text-8xl">{status === "won" ? fish.emoji : "💦"}</div>
        {status === "won" ? (
          <>
            <p className="text-2xl font-bold">{fish.name}</p>
            <p className="text-white/80">{sizeCm}cm</p>
            {isNewRecord && (
              <p className="text-amber-300 font-bold text-sm">🏆 自己記録更新！</p>
            )}
            <p className="text-amber-300 font-bold text-xl mt-2">売値目安 {price?.toLocaleString()}円</p>
            <p className="text-white/50 text-xs mt-1">漁協の在庫に追加されました。図鑑にも登録済み。</p>
            {unlockedSpotName && (
              <p className="text-sky-300 font-bold text-sm mt-2 animate-pulse">
                🌊 新しい釣り場「{unlockedSpotName}」が解放された！
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-lg">{fish.name}に糸を切られてしまった…</p>
            <p className="text-white/60 text-sm">次はもっと慎重にテンションを管理しよう。</p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <PrimaryButton onClick={onContinue}>続けて釣る</PrimaryButton>
        <SecondaryButton onClick={onBackToVillage}>村に戻る</SecondaryButton>
      </div>
    </ScreenShell>
  );
}
