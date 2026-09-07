import type { Direction } from "../../types";

interface DPadProps {
  /** ボタンを押し始めた時、その方向への移動を開始する */
  onDirectionDown: (direction: Direction) => void;
  /** ボタンを離した時、移動を止める */
  onDirectionUp: () => void;
  disabled?: boolean;
}

const BUTTON_CLASS =
  "flex items-center justify-center rounded-lg bg-slate-900/40 border border-white/30 text-xl text-white active:scale-90 active:bg-slate-900/60 transition disabled:opacity-30";

/**
 * フィールド移動用のオンスクリーン十字キー。押している間だけ移動する(TensionGameScreenの
 * 「巻く」「緩める」ボタンと同じ、ホールド型の操作感)。画面に半透明で重ねて使う想定。
 */
export function DPad({ onDirectionDown, onDirectionUp, disabled }: DPadProps) {
  function bind(direction: Direction) {
    return {
      onPointerDown: () => onDirectionDown(direction),
      onPointerUp: onDirectionUp,
      onPointerLeave: onDirectionUp,
      onPointerCancel: onDirectionUp,
    };
  }

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36 select-none opacity-80">
      <div />
      <button className={BUTTON_CLASS} disabled={disabled} {...bind("up")} aria-label="上へ">
        ▲
      </button>
      <div />
      <button className={BUTTON_CLASS} disabled={disabled} {...bind("left")} aria-label="左へ">
        ◀
      </button>
      <div />
      <button className={BUTTON_CLASS} disabled={disabled} {...bind("right")} aria-label="右へ">
        ▶
      </button>
      <div />
      <button className={BUTTON_CLASS} disabled={disabled} {...bind("down")} aria-label="下へ">
        ▼
      </button>
      <div />
    </div>
  );
}
