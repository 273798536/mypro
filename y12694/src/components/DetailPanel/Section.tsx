import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
  title: string;
  icon?: ReactNode;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export const Section = ({
  title,
  icon,
  badge,
  badgeColor = '#22D3EE',
  defaultOpen = true,
  children,
}: SectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/40 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-slate-800/30"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span
            className="text-[12px] font-bold uppercase tracking-wider text-slate-200"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {title}
          </span>
          {badge && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: `${badgeColor}1A`,
                color: badgeColor,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="px-4 pb-3.5 pt-1">{children}</div>}
    </div>
  );
};
