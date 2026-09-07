export function MoneyBadge({ money }: { money: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-black/30 border border-amber-300/40 px-3 py-1.5 text-amber-300 font-bold text-sm">
      <span>💰</span>
      <span>{money.toLocaleString()} 円</span>
    </div>
  );
}
