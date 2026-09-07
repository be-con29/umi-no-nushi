import type { ReactNode } from "react";

interface ScreenShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** 全画面共通の縦長カードレイアウト(スマホ縦画面を想定) */
export function ScreenShell({ title, subtitle, children, footer }: ScreenShellProps) {
  return (
    <div className="w-full max-w-md min-h-svh flex flex-col bg-gradient-to-b from-sky-700 via-sky-800 to-blue-950 text-white shadow-2xl">
      <header className="px-5 pt-6 pb-4 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-wide">{title}</h1>
        {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
      </header>
      <main className="flex-1 px-5 py-4 flex flex-col gap-4 overflow-y-auto">{children}</main>
      {footer && <footer className="px-5 py-4 border-t border-white/10">{footer}</footer>}
    </div>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`w-full min-h-11 rounded-xl bg-amber-400 text-blue-950 font-bold py-3 px-4 active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100 ${className}`}
    />
  );
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`w-full min-h-11 rounded-xl bg-white/10 border border-white/30 text-white font-semibold py-3 px-4 active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100 ${className}`}
    />
  );
}
