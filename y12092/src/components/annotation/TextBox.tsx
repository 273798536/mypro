import { useState, useEffect, useRef } from 'react';
import type { Annotation } from '@/types';
import { X, Type } from 'lucide-react';

interface TextBoxProps {
  annotation: Annotation;
  onUpdate?: (id: string, updates: Partial<Annotation>) => void;
  onDelete?: (id: string) => void;
  onSelect?: () => void;
  selected?: boolean;
}

export default function TextBox({ annotation, onUpdate, onDelete, onSelect, selected }: TextBoxProps) {
  const { position, text, color } = annotation;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onUpdate && editText !== text) {
      onUpdate(annotation.id, { text: editText });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setEditText(text || '');
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(annotation.id);
    }
  };

  const padding = 12;
  const fontSize = 14;
  const estimatedWidth = (editText.length || 1) * fontSize + padding * 2;
  const estimatedHeight = fontSize + padding * 2;

  return (
    <g onClick={onSelect} style={{ cursor: 'move' }}>
      <rect
        x={position.x}
        y={position.y}
        width={estimatedWidth}
        height={estimatedHeight}
        fill={color}
        fillOpacity={0.9}
        rx={4}
        stroke={selected ? '#ffffff' : 'transparent'}
        strokeWidth={selected ? 2 : 0}
      />
      {isEditing ? (
        <foreignObject
          x={position.x + padding / 2}
          y={position.y + padding / 2}
          width={estimatedWidth - padding}
          height={estimatedHeight - padding}
        >
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-transparent text-white text-sm font-medium outline-none border-none"
            style={{ fontSize: `${fontSize}px` }}
          />
        </foreignObject>
      ) : (
        <>
          <text
            x={position.x + padding}
            y={position.y + estimatedHeight / 2 + fontSize / 3}
            fill="#ffffff"
            fontSize={fontSize}
            fontWeight={500}
            onDoubleClick={handleDoubleClick}
          >
            {text || '双击编辑'}
          </text>
          {selected && (
            <g onClick={handleDelete} style={{ cursor: 'pointer' }}>
              <circle
                cx={position.x + estimatedWidth}
                cy={position.y}
                r={8}
                fill="#ef4444"
              />
              <X
                x={position.x + estimatedWidth - 4}
                y={position.y - 4}
                width={8}
                height={8}
                color="#ffffff"
              />
            </g>
          )}
        </>
      )}
    </g>
  );
}
