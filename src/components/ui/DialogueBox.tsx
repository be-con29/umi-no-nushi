interface DialogueBoxProps {
  speakerName: string;
  text: string;
  isLast: boolean;
  onAdvance: () => void;
}

/** 画面下部に固定表示する会話ウィンドウ。タップで1文ずつ送る */
export function DialogueBox({ speakerName, text, isLast, onAdvance }: DialogueBoxProps) {
  return (
    <button
      onClick={onAdvance}
      className="w-full text-left rounded-xl border-2 border-white/40 bg-blue-950/95 p-4 shadow-lg"
    >
      <div className="text-amber-300 font-bold text-sm mb-1">{speakerName}</div>
      <p className="text-white leading-relaxed">{text}</p>
      <div className="text-right text-white/50 text-xs mt-2 animate-pulse">
        {isLast ? "▼ タップして閉じる" : "▼ タップして次へ"}
      </div>
    </button>
  );
}
