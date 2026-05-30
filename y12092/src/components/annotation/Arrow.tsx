import type { Annotation } from '@/types';

interface ArrowProps {
  annotation: Annotation;
  onSelect?: () => void;
  selected?: boolean;
}

export default function Arrow({ annotation, onSelect, selected }: ArrowProps) {
  const { position, endPosition, color } = annotation;

  if (!endPosition) return null;

  const dx = endPosition.x - position.x;
  const dy = endPosition.y - position.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const length = Math.sqrt(dx * dx + dy * dy);

  const arrowSize = 8;
  const arrowAngle = Math.PI / 6;

  const arrowPoint1 = {
    x: endPosition.x - arrowSize * Math.cos(angle * Math.PI / 180 - arrowAngle),
    y: endPosition.y - arrowSize * Math.sin(angle * Math.PI / 180 - arrowAngle),
  };
  const arrowPoint2 = {
    x: endPosition.x - arrowSize * Math.cos(angle * Math.PI / 180 + arrowAngle),
    y: endPosition.y - arrowSize * Math.sin(angle * Math.PI / 180 + arrowAngle),
  };

  return (
    <g onClick={onSelect} style={{ cursor: 'pointer' }}>
      <line
        x1={position.x}
        y1={position.y}
        x2={endPosition.x}
        y2={endPosition.y}
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        strokeLinecap="round"
      />
      <line
        x1={endPosition.x}
        y1={endPosition.y}
        x2={arrowPoint1.x}
        y2={arrowPoint1.y}
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        strokeLinecap="round"
      />
      <line
        x1={endPosition.x}
        y1={endPosition.y}
        x2={arrowPoint2.x}
        y2={arrowPoint2.y}
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        strokeLinecap="round"
      />
      {selected && (
        <>
          <circle
            cx={position.x}
            cy={position.y}
            r={6}
            fill={color}
            opacity={0.3}
          />
          <circle
            cx={endPosition.x}
            cy={endPosition.y}
            r={6}
            fill={color}
            opacity={0.3}
          />
        </>
      )}
    </g>
  );
}
