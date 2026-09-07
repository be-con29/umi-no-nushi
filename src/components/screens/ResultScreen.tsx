import type { FishDefinition } from "../../types";
import { PrimaryButton, ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface ResultScreenProps {
  status: "won" | "lost";
  fish: FishDefinition;
  sizeCm?: number;
  price?: number;
  isNewRecord?: boolean;
  onContinue: () => void;
  onBackToHarbor: () => void;
}

export function ResultScreen({
  status,
  fish,
  sizeCm,
  price,
  isNewRecord,
  onContinue,
  onBackToHarbor,
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
            <p className="text-white/50 text-xs mt-1">港の在庫に追加されました。図鑑にも登録済み。</p>
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
        <SecondaryButton onClick={onBackToHarbor}>港に戻る</SecondaryButton>
      </div>
    </ScreenShell>
  );
}
