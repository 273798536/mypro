import { useState, useRef, useCallback, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
  explanation?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = "m",
  explanation,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const percent = ((value - min) / (max - min)) * 100;

  const updateValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawVal = min + pct * (max - min);
      const stepped = Math.round(rawVal / step) * step;
      onChange(Math.max(min, Math.min(max, stepped)));
    },
    [min, max, step, onChange]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => updateValue(e.clientX);
    const handleUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, updateValue]);

  return (
    <div className="mb-4">
      <div className="param-label">
        <span className="flex items-center gap-1">
          {label}
          {explanation && (
            <span
              className="relative inline-flex"
              onMouseEnter={() => setShowExplanation(true)}
              onMouseLeave={() => setShowExplanation(false)}
            >
              <HelpCircle className="w-3 h-3 text-surface-500 hover:text-primary-400 cursor-help" />
              {showExplanation && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 rounded-lg bg-surface-800/95 border border-primary-500/30 shadow-glow-primary z-50 animate-fade-in">
                  <p className="text-xs text-surface-200 leading-relaxed">{explanation}</p>
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-surface-800 border-r border-b border-primary-500/30 rotate-45" />
                </div>
              )}
            </span>
          )}
        </span>
        <span className="param-value">
          {value}
          {unit}
        </span>
      </div>
      <div
        ref={trackRef}
        className="slider-track cursor-pointer"
        onMouseDown={(e) => {
          setDragging(true);
          updateValue(e.clientX);
        }}
      >
        <div className="slider-fill" style={{ width: `${percent}%` }} />
        <div className="slider-thumb" style={{ left: `calc(${percent}% - 8px)` }} />
      </div>
    </div>
  );
}

export function InfoTooltip({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 rounded-lg bg-surface-800/95 border border-surface-600 text-xs text-surface-200 whitespace-nowrap z-50 animate-fade-in shadow-lg">
          {text}
        </div>
      )}
    </span>
  );
}
