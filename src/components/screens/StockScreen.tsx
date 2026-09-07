import type { CaughtFish, FishDefinition } from "../../types";
import { MoneyBadge } from "../ui/MoneyBadge";
import { PrimaryButton, ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface StockScreenProps {
  money: number;
  stock: CaughtFish[];
  findFish: (id: string) => FishDefinition | undefined;
  onSell: (instanceId: string) => void;
  onSellAll: () => void;
  onBack: () => void;
}

export function StockScreen({ money, stock, findFish, onSell, onSellAll, onBack }: StockScreenProps) {
  const total = stock.reduce((sum, f) => sum + f.price, 0);

  return (
    <ScreenShell
      title="在庫/売却"
      footer={<SecondaryButton onClick={onBack}>港に戻る</SecondaryButton>}
    >
      <div className="flex justify-center">
        <MoneyBadge money={money} />
      </div>

      {stock.length === 0 ? (
        <p className="text-center text-white/60 py-8">在庫はありません。釣りに出かけよう。</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {stock.map((item) => {
              const fish = findFish(item.fishId);
              return (
                <div
                  key={item.instanceId}
                  className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/20 p-3"
                >
                  <span className="text-2xl">{fish?.emoji ?? "🐟"}</span>
                  <div className="flex-1">
                    <div className="font-bold">{fish?.name ?? "???"}</div>
                    <div className="text-xs text-white/60">{item.sizeCm}cm</div>
                  </div>
                  <div className="text-amber-300 font-bold text-sm">{item.price.toLocaleString()}円</div>
                  <button
                    onClick={() => onSell(item.instanceId)}
                    className="rounded-lg bg-amber-400 text-blue-950 text-xs font-bold px-3 py-2"
                  >
                    売る
                  </button>
                </div>
              );
            })}
          </div>

          <PrimaryButton onClick={onSellAll} className="mt-auto">
            まとめて売る（{total.toLocaleString()}円）
          </PrimaryButton>
        </>
      )}
    </ScreenShell>
  );
}
