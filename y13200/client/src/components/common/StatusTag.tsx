import { Tag } from 'antd';
import { PauseCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { TagProps } from 'antd';
import type { TrackStatus } from '@/types';

export interface StatusTagProps {
  status: TrackStatus;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<TrackStatus, { color: TagProps['color']; label: string }> = {
  pending: { color: 'default', label: '待处理' },
  matching: { color: 'processing', label: '匹配中' },
  matched: { color: 'blue', label: '已匹配' },
  mismatch: { color: 'red', label: '匹配失败' },
  reviewing: { color: 'orange', label: '审核中' },
  suspended: { color: 'red', label: '已暂停' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已拒绝' },
};

const StatusTag: React.FC<StatusTagProps> = ({ status, showIcon = true }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const icon = showIcon ? (
    status === 'suspended' ? (
      <PauseCircleOutlined />
    ) : status === 'approved' ? (
      <CheckCircleOutlined />
    ) : undefined
  ) : undefined;

  return (
    <Tag color={config.color} icon={icon}>
      {config.label}
    </Tag>
  );
};

export default StatusTag;
