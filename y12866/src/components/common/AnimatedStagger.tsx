import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function AnimatedStagger({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animationDelay = `${delay}ms`;
  }, [delay]);

  return (
    <div ref={ref} className={`stagger-item ${className}`}>
      {children}
    </div>
  );
}
