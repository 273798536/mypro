import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ExplanationTooltipProps {
  text: string;
  children: ReactNode;
}

export default function ExplanationTooltip({ text, children }: ExplanationTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className={cn(
          'absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2',
          'w-56 px-3 py-2 rounded-md bg-ink text-white text-xs leading-relaxed',
          'fade-in'
        )}>
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink" />
        </span>
      )}
    </span>
  );
}
