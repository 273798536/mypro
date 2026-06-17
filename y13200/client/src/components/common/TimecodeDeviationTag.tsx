import { Tag } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import type { TagProps } from 'antd';

export interface TimecodeDeviationTagProps {
  deviation: number;
  showIcon?: boolean;
}

const getDeviationConfig = (
  deviation: number
): { color: TagProps['color']; label: string } => {
  const absDeviation = Math.abs(deviation);
  const sign = deviation > 0 ? '+' : '';
  const label = `${sign}${deviation}ms`;

  if (absDeviation <= 100) {
    return { color: 'green', label };
  }
  if (absDeviation <= 500) {
    return { color: 'orange', label };
  }
  return { color: 'red', label };
};

const TimecodeDeviationTag: React.FC<TimecodeDeviationTagProps> = ({
  deviation,
  showIcon = true,
}) => {
  const config = getDeviationConfig(deviation);
  const absDeviation = Math.abs(deviation);

  const icon = showIcon && absDeviation > 500 ? <WarningOutlined /> : undefined;

  return (
    <Tag color={config.color} icon={icon}>
      {config.label}
    </Tag>
  );
};

export default TimecodeDeviationTag;
