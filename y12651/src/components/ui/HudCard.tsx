import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HudCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  accent?: 'cyan' | 'orange' | 'green' | 'yellow';
}

const accentMap = {
  cyan: 'border-cyber-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.1)]',
  orange: 'border-alert-orange/40 shadow-[0_0_15px_rgba(255,107,53,0.1)]',
  green: 'border-success-green/40 shadow-[0_0_15px_rgba(0,255,136,0.1)]',
  yellow: 'border-warn-yellow/40 shadow-[0_0_15px_rgba(255,217,61,0.1)]',
};

export default function HudCard({ title, children, className, accent = 'cyan' }: HudCardProps) {
  return (
    <div
      className={cn(
        'clip-chamfer glass-panel relative overflow-hidden p-4',
        accentMap[accent],
        className
      )}
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-40"
           style={{ color: accent === 'cyan' ? '#00e5ff' : accent === 'orange' ? '#ff6b35' : accent === 'green' ? '#00ff88' : '#ffd93d' }} />
      {title && (
        <div className="hud-text text-xs mb-3 opacity-80 tracking-wider flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: accent === 'cyan' ? '#00e5ff' : accent === 'orange' ? '#ff6b35' : accent === 'green' ? '#00ff88' : '#ffd93d' }} />
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
