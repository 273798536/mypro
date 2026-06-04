import { useEffect, useState } from 'react';
import type { Point } from '../types';

interface RippleEffectProps {
  x: number;
  y: number;
  isHit: boolean;
  onComplete: () => void;
}

export function RippleEffect({ x, y, isHit, onComplete }: RippleEffectProps) {
  const [scale, setScale] = useState(0);
  const [opacity, setOpacity] = useState(0.6);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 800;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setScale(0.1 + progress * 2.5);
      setOpacity(0.6 * (1 - progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  const color = isHit ? '#27AE60' : '#E74C3C';

  return (
    <div
      className="absolute pointer-events-none rounded-full"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: '100px',
        height: '100px',
        border: `3px solid ${color}`,
        opacity,
        boxShadow: `0 0 20px ${color}40`,
      }}
    />
  );
}

interface RippleManagerProps {
  ripples: Array<{ id: number; point: Point; isHit: boolean }>;
  onRemove: (id: number) => void;
}

export function RippleManager({ ripples, onRemove }: RippleManagerProps) {
  return (
    <>
      {ripples.map((ripple) => (
        <RippleEffect
          key={ripple.id}
          x={ripple.point.x}
          y={ripple.point.y}
          isHit={ripple.isHit}
          onComplete={() => onRemove(ripple.id)}
        />
      ))}
    </>
  );
}
