import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProblemSpot } from '@/types/game';
import { useGameStore } from '@/store/gameStore';

interface VinylRecordProps {
  problemSpots: ProblemSpot[];
  onSpotClick: (position: number, track: number) => void;
  disabled?: boolean;
}

const TRACK_COUNT = 4;
const RECORD_SIZE = 400;
const CENTER_SIZE = 80;

export const VinylRecord: React.FC<VinylRecordProps> = ({
  problemSpots,
  onSpotClick,
  disabled = false,
}) => {
  const [rotation, setRotation] = useState(0);
  const [beatPosition, setBeatPosition] = useState(0);
  const updateBeatPosition = useGameStore((state) => state.updateBeatPosition);
  const animationRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setRotation((prev) => (prev + 0.3) % 360);
      setBeatPosition((prev) => {
        const newPos = (prev + 0.5) % 100;
        updateBeatPosition(newPos);
        return newPos;
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [updateBeatPosition]);

  const getTrackRadius = (track: number): number => {
    const minRadius = CENTER_SIZE / 2 + 20;
    const maxRadius = RECORD_SIZE / 2 - 20;
    const step = (maxRadius - minRadius) / TRACK_COUNT;
    return minRadius + step * (track - 0.5);
  };

  const getSpotPosition = (spot: ProblemSpot) => {
    const radius = getTrackRadius(spot.track);
    const angle = (spot.position / 100) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const centerX = RECORD_SIZE / 2;
    const centerY = RECORD_SIZE / 2;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  const getBeatLinePosition = () => {
    const angle = (beatPosition / 100) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const centerX = RECORD_SIZE / 2;
    const centerY = RECORD_SIZE / 2;
    const innerRadius = CENTER_SIZE / 2 + 10;
    const outerRadius = RECORD_SIZE / 2 - 10;
    return {
      x1: centerX + innerRadius * Math.cos(rad),
      y1: centerY + innerRadius * Math.sin(rad),
      x2: centerX + outerRadius * Math.cos(rad),
      y2: centerY + outerRadius * Math.sin(rad),
    };
  };

  const handleRecordClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = RECORD_SIZE / 2;
    const centerY = RECORD_SIZE / 2;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < CENTER_SIZE / 2 || distance > RECORD_SIZE / 2 - 10) {
      return;
    }

    const minRadius = CENTER_SIZE / 2 + 20;
    const maxRadius = RECORD_SIZE / 2 - 20;
    const trackRange = (maxRadius - minRadius) / TRACK_COUNT;
    const track = Math.ceil((distance - minRadius) / trackRange);

    if (track < 1 || track > TRACK_COUNT) return;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    const position = (angle / 360) * 100;

    onSpotClick(position, track);
  };

  const getSpotColor = (type: ProblemSpot['type']): string => {
    switch (type) {
      case 'noise':
        return '#6B7280';
      case 'pop':
        return '#DC2626';
      case 'drift':
        return '#D97706';
    }
  };

  const getSpotSize = (severity: ProblemSpot['severity']): number => {
    switch (severity) {
      case 'low':
        return 8;
      case 'medium':
        return 12;
      case 'high':
        return 16;
    }
  };

  const beatLinePos = getBeatLinePosition();

  return (
    <div className="relative">
      <motion.div
        className="relative"
        style={{
          width: RECORD_SIZE,
          height: RECORD_SIZE,
          rotate: `${rotation}deg`,
        }}
      >
        <svg
          width={RECORD_SIZE}
          height={RECORD_SIZE}
          className="cursor-pointer"
          onClick={handleRecordClick}
          style={{ pointerEvents: disabled ? 'none' : 'auto' }}
        >
          <defs>
            <radialGradient id="vinylGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="70%" stopColor="#0a0a0a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx={RECORD_SIZE / 2}
            cy={RECORD_SIZE / 2}
            r={RECORD_SIZE / 2 - 2}
            fill="url(#vinylGradient)"
            stroke="#333"
            strokeWidth="2"
          />

          {[1, 2, 3, 4, 5].map((i) => (
            <circle
              key={i}
              cx={RECORD_SIZE / 2}
              cy={RECORD_SIZE / 2}
              r={CENTER_SIZE / 2 + i * 28}
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="1"
            />
          ))}

          {[1, 2, 3, 4].map((track) => (
            <circle
              key={`track-${track}`}
              cx={RECORD_SIZE / 2}
              cy={RECORD_SIZE / 2}
              r={getTrackRadius(track)}
              fill="none"
              stroke="#3d2914"
              strokeWidth="3"
              opacity="0.6"
            />
          ))}

          <circle
            cx={RECORD_SIZE / 2}
            cy={RECORD_SIZE / 2}
            r={CENTER_SIZE / 2}
            fill="#8B4513"
            stroke="#A0522D"
            strokeWidth="2"
          />
          <circle
            cx={RECORD_SIZE / 2}
            cy={RECORD_SIZE / 2}
            r={12}
            fill="#1a1a1a"
          />

          <line
            x1={beatLinePos.x1}
            y1={beatLinePos.y1}
            x2={beatLinePos.x2}
            y2={beatLinePos.y2}
            stroke="#FFD700"
            strokeWidth="3"
            opacity="0.8"
            filter="url(#glow)"
          />

          <AnimatePresence>
            {problemSpots
              .filter((spot) => !spot.isFixed)
              .map((spot) => {
                const pos = getSpotPosition(spot);
                const size = getSpotSize(spot.severity);
                return (
                  <g key={spot.id}>
                    {spot.type === 'noise' && (
                      <motion.circle
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        cx={pos.x}
                        cy={pos.y}
                        r={size}
                        fill={getSpotColor(spot.type)}
                        opacity="0.8"
                      />
                    )}
                    {spot.type === 'pop' && (
                      <motion.text
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        x={pos.x}
                        y={pos.y + size / 2}
                        fontSize={size * 1.5}
                        fill={getSpotColor(spot.type)}
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                      >
                        ★
                      </motion.text>
                    )}
                    {spot.type === 'drift' && (
                      <motion.text
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        x={pos.x}
                        y={pos.y + size / 2}
                        fontSize={size * 1.5}
                        fill={getSpotColor(spot.type)}
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                      >
                        ➤
                      </motion.text>
                    )}
                  </g>
                );
              })}
          </AnimatePresence>
        </svg>
      </motion.div>

      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-500"></span>
          <span className="text-gray-400">噪声</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-600">★</span>
          <span className="text-gray-400">爆音</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-amber-500">➤</span>
          <span className="text-gray-400">节拍</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-4 bg-amber-400 rounded"></span>
          <span className="text-gray-400">节拍线</span>
        </div>
      </div>
    </div>
  );
};
