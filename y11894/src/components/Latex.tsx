import { useEffect, useRef } from 'react';
import katex from 'katex';

interface LatexProps {
  formula: string;
  displayMode?: boolean;
}

export default function Latex({ formula, displayMode = true }: LatexProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(formula, ref.current, {
          displayMode,
          throwOnError: false,
        });
      } catch {
        ref.current.textContent = formula;
      }
    }
  }, [formula, displayMode]);

  return <span ref={ref} />;
}
