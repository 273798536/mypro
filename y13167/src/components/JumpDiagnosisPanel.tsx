import React from 'react';
import { Card, List, Tag, Alert, Button, Space } from 'antd';
import { ThunderboltOutlined, InfoCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import dayjs from 'dayjs';

const CAUSE_COLORS: Record<string, string> = {
  threshold_cross: 'orange',
  unit_change: 'blue',
  name_mismatch: 'red',
  unknown: 'default'
};

const CAUSE_LABELS: Record<string, string> = {
  threshold_cross: '阈值穿越',
  unit_change: '单位变化',
  name_mismatch: '名称不一致',
  unknown: '未知原因'
};

const JumpDiagnosisPanel: React.FC = () => {
  const { pageSummary, dispatch, filteredRecords } = useAppContext();
  const { jump_events } = pageSummary;

  const handleViewRecord = (recordId: string) => {
    dispatch({ type: 'SELECT_RECORD', payload: recordId });
    dispatch({ type: 'TOGGLE_DETAIL_MODAL', payload: true });
  };

  if (jump_events.length === 0) {
    return (
      <Card
        title={
          <span>
            <ThunderboltOutlined style={{ marginRight: 8, color: '#a0d911' }} />
            跳变诊断
          </span>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Alert
          type="success"
          showIcon
          message="未检测到跳变事件"
          description="当前筛选范围内的数据扭矩值变化平稳，未超过 50% 跳变阈值"
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <span>
          <ThunderboltOutlined style={{ marginRight: 8, color: '#faad14' }} />
          跳变诊断（共 {jump_events.length} 次跳变）
          <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>
            自动识别3类原因
          </Tag>
        </span>
      }
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Space>
          <Tag color="orange">阈值穿越</Tag>
          <Tag color="blue">单位变化</Tag>
          <Tag color="red">名称不一致</Tag>
        </Space>
      }
    >
      <List
        size="small"
        dataSource={jump_events}
        renderItem={(event) => {
          const currentRecord = filteredRecords.find(r => r.id === event.record_id);
          const previousRecord = event.previous_record_id
            ? filteredRecords.find(r => r.id === event.previous_record_id)
            : null;

          return (
            <List.Item
              key={event.record_id}
              actions={[
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleViewRecord(event.record_id)}
                >
                  查看详情
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Tag color={CAUSE_COLORS[event.cause]}>
                    {CAUSE_LABELS[event.cause]}
                  </Tag>
                }
                title={
                  <Space>
                    <span style={{ fontWeight: 'bold' }}>
                      {dayjs(event.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                    </span>
                    <Tag color="red">
                      跳变 {event.jump_value.toFixed(2)} N·m ({event.jump_percentage.toFixed(1)}%)
                    </Tag>
                  </Space>
                }
                description={
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {previousRecord && currentRecord && (
                      <div style={{ marginBottom: 4 }}>
                        <Tag color="default">{previousRecord.device_name}</Tag>
                        <span style={{ margin: '0 8px' }}>
                          {previousRecord.torque_value} {previousRecord.torque_unit}
                        </span>
                        <ArrowRightOutlined style={{ margin: '0 8px', color: '#faad14' }} />
                        <Tag color={CAUSE_COLORS[event.cause]}>{currentRecord.device_name}</Tag>
                        <span style={{ margin: '0 8px' }}>
                          {currentRecord.torque_value} {currentRecord.torque_unit}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      <span>{event.cause_detail}</span>
                    </div>
                  </div>
                }
              />
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default JumpDiagnosisPanel;
