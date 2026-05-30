import type { Annotation } from '@/types';

interface HighlightProps {
  annotation: Annotation;
  onSelect?: () => void;
  selected?: boolean;
}

export default function Highlight({ annotation, onSelect, selected }: HighlightProps) {
  const { position, endPosition, color, type } = annotation;

  if (!endPosition) return null;

  const x = Math.min(position.x, endPosition.x);
  const y = Math.min(position.y, endPosition.y);
  const width = Math.abs(endPosition.x - position.x);
  const height = Math.abs(endPosition.y - position.y);

  const dashArray = type === 'circle' ? undefined : '5,3';

  return (
    <g onClick={onSelect} style={{ cursor: 'pointer' }}>
      {type === 'circle' ? (
        <>
          <ellipse
            cx={x + width / 2}
            cy={y + height / 2}
            rx={width / 2}
            ry={height / 2}
            fill="none"
            stroke={color}
            strokeWidth={selected ? 3 : 2}
            opacity={0.8}
          />
          <ellipse
            cx={x + width / 2}
            cy={y + height / 2}
            rx={width / 2}
            ry={height / 2}
            fill={color}
            fillOpacity={0.1}
          />
        </>
      ) : (
        <>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke={color}
            strokeWidth={selected ? 3 : 2}
            strokeDasharray={dashArray}
            rx={4}
            opacity={0.8}
          />
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={color}
            fillOpacity={0.1}
            rx={4}
          />
        </>
      )}
      {selected && (
        <>
          <circle cx={x} cy={y} r={5} fill={color} />
          <circle cx={x + width} cy={y} r={5} fill={color} />
          <circle cx={x} cy={y + height} r={5} fill={color} />
          <circle cx={x + width} cy={y + height} r={5} fill={color} />
        </>
      )}
    </g>
  );
}
