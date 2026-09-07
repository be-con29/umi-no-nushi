interface GaugeProps {
  label: string;
  percent: number; // 0-100
  colorClass: string;
  warningPercent?: number;
  warningColorClass?: string;
}

/** テンション/体力ゲージ共通の横棒ゲージ */
export function Gauge({ label, percent, colorClass, warningPercent, warningColorClass }: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const isWarning = warningPercent !== undefined && clamped >= warningPercent;
  const barColor = isWarning && warningColorClass ? warningColorClass : colorClass;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-medium text-white/80 mb-1">
        <span>{label}</span>
        <span>{Math.round(clamped)}%</span>
      </div>
      <div className="h-4 w-full rounded-full bg-black/30 overflow-hidden border border-white/20">
        <div
          className={`h-full rounded-full transition-[width] duration-150 ease-linear ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
