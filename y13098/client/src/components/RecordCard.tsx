import React from 'react';
import { Card, Tag, Space } from 'antd';
import { 
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, 
  EditOutlined, WarningOutlined 
} from '@ant-design/icons';
import type { InspectionRecord } from '@shared/types';
import { RECORD_TYPE_LABELS, STATUS_LABELS } from '@shared/constants';
import { formatDate } from '@shared/utils';

interface RecordCardProps {
  record: InspectionRecord;
  selected: boolean;
  onClick: () => void;
  corridorName?: string;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, selected, onClick, corridorName }) => {
  const getStatusIcon = (status: InspectionRecord['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'rejected':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'modified':
        return <EditOutlined style={{ color: '#1890ff' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: InspectionRecord['status']) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'modified':
        return 'processing';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: InspectionRecord['recordType']) => {
    switch (type) {
      case 'normal':
        return 'green';
      case 'abnormal':
        return 'red';
      case 'temporary':
        return 'blue';
      default:
        return 'default';
    }
  };

  return (
    <Card
      className={`record-card ${selected ? 'selected' : ''}`}
      size="small"
      onClick={onClick}
      hoverable
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.title}
          </h4>
          {corridorName && (
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              {corridorName}
            </div>
          )}
        </div>
        {record.isOverlapping && (
          <Tag color="red" icon={<WarningOutlined />} style={{ marginLeft: 8, flexShrink: 0 }}>
            对象重叠
          </Tag>
        )}
      </div>
      
      <p style={{ 
        fontSize: 13, 
        color: '#666', 
        marginBottom: 8,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {record.description}
      </p>
      
      <Space size={[4, 4]} wrap>
        <Tag color={getTypeColor(record.recordType)}>
          {RECORD_TYPE_LABELS[record.recordType]}
        </Tag>
        <Tag icon={getStatusIcon(record.status)} color={getStatusColor(record.status)}>
          {STATUS_LABELS[record.status]}
        </Tag>
        <span style={{ fontSize: 12, color: '#999' }}>
          {formatDate(record.recordDate, 'YYYY-MM-DD')}
        </span>
      </Space>
      
      {record.confirmedBy && (
        <div style={{ fontSize: 12, color: '#888', marginTop: 8, textAlign: 'right' }}>
          确认人：{record.confirmedBy}
        </div>
      )}
    </Card>
  );
};

export default RecordCard;
