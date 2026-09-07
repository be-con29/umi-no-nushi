import { MoneyBadge } from "../ui/MoneyBadge";
import { PrimaryButton, ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface HarborScreenProps {
  money: number;
  stockCount: number;
  onGoFishing: () => void;
  onGoStock: () => void;
  onGoZukan: () => void;
}

export function HarborScreen({ money, stockCount, onGoFishing, onGoStock, onGoZukan }: HarborScreenProps) {
  return (
    <ScreenShell title="港町" subtitle="今日はどこへ出かけますか？">
      <div className="flex justify-center py-2">
        <MoneyBadge money={money} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
        <div className="text-7xl">⛵</div>
        <p className="text-white/70 text-sm">波は穏やか。絶好の釣り日和だ。</p>
      </div>

      <div className="flex flex-col gap-3">
        <PrimaryButton onClick={onGoFishing}>🎣 釣りに出る</PrimaryButton>
        <SecondaryButton onClick={onGoStock}>
          🧺 在庫を売る {stockCount > 0 && `(${stockCount})`}
        </SecondaryButton>
        <SecondaryButton onClick={onGoZukan}>📖 図鑑を見る</SecondaryButton>
      </div>
    </ScreenShell>
  );
}
