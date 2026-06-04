import React from 'react';
import { X } from 'lucide-react';
import type { Anomaly } from '../../types';
import { SEVERITY_COLORS } from '../../types';

interface AnomalyMarkerProps {
  anomaly: Anomaly;
  zoom: number;
  panX: number;
  panY: number;
  imageWidth: number;
  imageHeight: number;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

export function AnomalyMarker({
  anomaly,
  zoom,
  panX,
  panY,
  imageWidth,
  imageHeight,
  selected,
  onSelect,
  onDelete,
}: AnomalyMarkerProps) {
  const displayX = (anomaly.position_x / imageWidth) * 100;
  const displayY = (anomaly.position_y / imageHeight) * 100;

  return (
    <div
      className="absolute cursor-pointer transition-all duration-200"
      style={{
        left: `${displayX}%`,
        top: `${displayY}%`,
        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
        zIndex: selected ? 20 : 10,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        className="relative"
        style={{
          width: selected ? '28px' : '20px',
          height: selected ? '28px' : '20px',
        }}
      >
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: SEVERITY_COLORS[anomaly.severity] }}
        />
        <div
          className="absolute inset-0 rounded-full border-2 flex items-center justify-center"
          style={{
            backgroundColor: `${SEVERITY_COLORS[anomaly.severity]}20`,
            borderColor: SEVERITY_COLORS[anomaly.severity],
            boxShadow: selected
              ? `0 0 0 3px ${SEVERITY_COLORS[anomaly.severity]}40, 0 0 12px ${SEVERITY_COLORS[anomaly.severity]}60`
              : `0 0 0 2px ${SEVERITY_COLORS[anomaly.severity]}30`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: SEVERITY_COLORS[anomaly.severity] }}
          />
        </div>

        {selected && (
          <button
            className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
