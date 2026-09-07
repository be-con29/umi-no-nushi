import type { Direction } from "../../types";

interface DPadProps {
  onMove: (direction: Direction) => void;
  disabled?: boolean;
}

const BUTTON_CLASS =
  "flex items-center justify-center rounded-lg bg-white/15 border border-white/30 text-xl active:scale-90 active:bg-white/25 transition disabled:opacity-30";

/** フィールド移動用のオンスクリーン十字キー */
export function DPad({ onMove, disabled }: DPadProps) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36 mx-auto select-none">
      <div />
      <button className={BUTTON_CLASS} disabled={disabled} onClick={() => onMove("up")} aria-label="上へ">
        ▲
      </button>
      <div />
      <button className={BUTTON_CLASS} disabled={disabled} onClick={() => onMove("left")} aria-label="左へ">
        ◀
      </button>
      <div className="rounded-lg bg-white/5" />
      <button className={BUTTON_CLASS} disabled={disabled} onClick={() => onMove("right")} aria-label="右へ">
        ▶
      </button>
      <div />
      <button className={BUTTON_CLASS} disabled={disabled} onClick={() => onMove("down")} aria-label="下へ">
        ▼
      </button>
      <div />
    </div>
  );
}
