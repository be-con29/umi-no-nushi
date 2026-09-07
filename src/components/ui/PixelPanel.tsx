import type { ReactNode } from "react";

/** SFC風ドット絵ウィンドウの枠。角を欠いた八角形クリップで「ピクセルの切り欠き」を表現する */
const PIXEL_FRAME_STYLE = {
  border: "3px solid #14202b",
  boxShadow: "inset 0 0 0 2px #4d6a80, inset 0 0 0 5px #14202b",
  clipPath:
    "polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px)",
} as const;

export function PixelPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1c2b3a] ${className}`} style={PIXEL_FRAME_STYLE}>
      {children}
    </div>
  );
}
