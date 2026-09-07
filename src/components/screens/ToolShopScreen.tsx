import type { LineDefinition, ReelDefinition, RodDefinition } from "../../types";
import { MoneyBadge } from "../ui/MoneyBadge";
import { ScreenShell, SecondaryButton } from "../ui/ScreenShell";

interface ToolShopScreenProps {
  money: number;
  rods: RodDefinition[];
  reels: ReelDefinition[];
  lines: LineDefinition[];
  ownedRodIds: string[];
  ownedReelIds: string[];
  ownedLineIds: string[];
  onBuy: (category: "rod" | "reel" | "line", id: string, cost: number) => void;
  onBack: () => void;
}

interface ShopRow {
  id: string;
  name: string;
  description: string;
  cost: number;
  statLabel: string;
  owned: boolean;
}

function ShopSection({
  title,
  rows,
  money,
  onBuy,
}: {
  title: string;
  rows: ShopRow[];
  money: number;
  onBuy: (id: string, cost: number) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold text-white/80 mb-2">{title}</h2>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`rounded-xl border p-3 ${row.owned ? "bg-white/5 border-white/10" : "bg-white/10 border-white/20"}`}
          >
            <div className="flex justify-between items-baseline">
              <span className="font-bold">{row.name}</span>
              <span className="text-xs text-sky-200">{row.statLabel}</span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">{row.description}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-amber-200">{row.cost > 0 ? `${row.cost.toLocaleString()}円` : "初期装備"}</span>
              {row.owned ? (
                <span className="text-xs font-bold text-emerald-300">所持済み</span>
              ) : (
                <button
                  onClick={() => onBuy(row.id, row.cost)}
                  disabled={money < row.cost}
                  className="rounded-lg bg-amber-400 text-blue-950 text-xs font-bold px-3 py-2 disabled:opacity-40"
                >
                  購入する
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ToolShopScreen({
  money,
  rods,
  reels,
  lines,
  ownedRodIds,
  ownedReelIds,
  ownedLineIds,
  onBuy,
  onBack,
}: ToolShopScreenProps) {
  const rodRows: ShopRow[] = rods.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    cost: r.cost,
    statLabel: `弾力 ${r.flex}`,
    owned: ownedRodIds.includes(r.id),
  }));
  const reelRows: ShopRow[] = reels.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    cost: r.cost,
    statLabel: `巻取力 ×${r.reelPower.toFixed(2)}`,
    owned: ownedReelIds.includes(r.id),
  }));
  const lineRows: ShopRow[] = lines.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    cost: l.cost,
    statLabel: `強度 ${l.strength}`,
    owned: ownedLineIds.includes(l.id),
  }));

  return (
    <ScreenShell
      title="道具屋"
      subtitle="竿・リール・糸は買うと自動的に一番良いものを使う"
      footer={<SecondaryButton onClick={onBack}>村に戻る</SecondaryButton>}
    >
      <div className="flex justify-center">
        <MoneyBadge money={money} />
      </div>
      <ShopSection title="竿" rows={rodRows} money={money} onBuy={(id, cost) => onBuy("rod", id, cost)} />
      <ShopSection title="リール" rows={reelRows} money={money} onBuy={(id, cost) => onBuy("reel", id, cost)} />
      <ShopSection title="糸" rows={lineRows} money={money} onBuy={(id, cost) => onBuy("line", id, cost)} />
    </ScreenShell>
  );
}
