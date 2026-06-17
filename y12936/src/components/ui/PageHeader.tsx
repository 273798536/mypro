import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  desc,
  right,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-800 px-6 py-5">
      <div className="animate-fade-up">
        <div className="field-label mb-1.5">{eyebrow}</div>
        <h1 className="font-serif text-3xl leading-none text-ink-100">{title}</h1>
        {desc && (
          <p className="mt-2 max-w-2xl text-sm text-ink-400 text-balance">{desc}</p>
        )}
      </div>
      {right && <div className="animate-fade-up">{right}</div>}
    </header>
  );
}
