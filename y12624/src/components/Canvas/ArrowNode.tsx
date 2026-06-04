import React, { useState, useCallback } from 'react';
import { ArrowRecord } from '@/types';
import { statusColors } from '@/data/mockData';

interface ArrowNodeProps {
  record: ArrowRecord;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export const ArrowNode: React.FC<ArrowNodeProps> = ({
  record,
  isSelected,
  onSelect,
  onDragEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: record.x, y: record.y });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: record.x, y: record.y });
    onSelect(record.id);
  }, [record, onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCurrentPos({
      x: Math.max(20, Math.min(780, record.x + dx)),
      y: Math.max(20, Math.min(480, record.y + dy)),
    });
  }, [isDragging, dragStart, record.x, record.y]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd(record.id, currentPos.x, currentPos.y);
    }
  }, [isDragging, record.id, currentPos, onDragEnd]);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const color = statusColors[record.status];
  const displayX = isDragging ? currentPos.x : record.x;
  const displayY = isDragging ? currentPos.y : record.y;

  return (
    <g
      transform={`translate(${displayX}, ${displayY})`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {record.status === 'flipped' && (
        <circle
          r="28"
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.3"
          className="animate-pulse"
        />
      )}
      
      {isSelected && (
        <circle
          r="24"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="3"
          strokeDasharray="6 3"
        />
      )}

      <g transform={`rotate(${record.direction})`}>
        <polygon
          points="0,-16 -10,12 0,6 10,12"
          fill={color}
          stroke={isSelected ? '#3B82F6' : 'rgba(255,255,255,0.3)'}
          strokeWidth="2"
          className="transition-all"
        />
      </g>

      <text
        y="35"
        textAnchor="middle"
        fontSize="11"
        fill="#94A3B8"
        fontWeight="500"
      >
        #{record.id}
      </text>

      {record.remark && (
        <g>
          <rect
            x="20"
            y="-25"
            width="8"
            height="8"
            rx="2"
            fill={record.isManualRemark ? '#F59E0B' : '#6B7280'}
          />
          <text
            x="24"
            y="-19"
            textAnchor="middle"
            fontSize="6"
            fill="white"
            fontWeight="bold"
          >
            {record.isManualRemark ? '人' : '系'}
          </text>
        </g>
      )}
    </g>
  );
};
