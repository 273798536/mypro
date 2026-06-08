import { ANOMALY_TYPE_LABEL, ANOMALY_COLORS } from '@/types';
import type { AnomalyType } from '@/types';

interface Props {
  type: AnomalyType;
}

export default function AnomalyTag({ type }: Props) {
  const color = ANOMALY_COLORS[type];
  const label = ANOMALY_TYPE_LABEL[type];

  return (
    <span
      className="tag"
      style={{ backgroundColor: `${color.hex}22`, color: color.hex, border: `1px solid ${color.hex}55` }}
      title={color.name}
    >
      <span
        className="inline-block w-2 h-2 rounded-sm mr-1.5"
        style={{ backgroundColor: color.hex }}
      />
      {label}
    </span>
  );
}
