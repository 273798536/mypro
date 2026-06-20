import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, List, Typography, Empty, Divider } from 'antd';
import {
  FolderOpenOutlined, AlertOutlined, EditOutlined,
  FileSearchOutlined, DownloadOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { handoverApi, exportApi } from '../api';
import { HandoverInfo } from '../types';
import StatusBadge from '../components/StatusBadge';

const { Title, Text, Paragraph } = Typography;

const HandoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [info, setInfo] = useState<HandoverInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const res = await handoverApi.getInfo();
      setInfo(res.data);
    } finally {
      setLoading(false);
    }
  };

  if (!info) return <div style={{ padding: 24 }}>加载中...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">接班视图</h1>
        <Button type="primary" onClick={loadInfo}>刷新</Button>
      </div>

      <div className="handover-section">
        <div className="handover-title">
          <AlertOutlined style={{ color: '#fa8c16' }} />
          待处理异常
        </div>
        
        {info.pending_delays.length === 0 && info.temporary_judgments.length === 0 ? (
          <Empty description="暂无待处理异常" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {info.pending_delays.map(d => (
              <div key={d.id} className="delay-card pending">
                <Space justify="space-between" style={{ width: '100%' }}>
                  <Space>
                    <StatusBadge status={d.status} type="delay" />
                    <strong>{d.feature_name}</strong>
                    {d.task_name && <Tag color="blue">{d.task_name}</Tag>}
                  </Space>
                  <Button type="link" onClick={() => navigate(`/tasks/${d.task_id}`)}>
                    去处理 <ArrowRightOutlined />
                  </Button>
                </Space>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  {d.suspected_reason && <div><Text type="secondary">疑似原因:</Text> {d.suspected_reason}</div>}
                  {d.impact_scope && <div><Text type="secondary">影响范围:</Text> {d.impact_scope}</div>}
                </div>
              </div>
            ))}
            
            {info.temporary_judgments.map(j => (
              <div key={j.id} style={{
                padding: 16,
                background: '#fff7e6',
                border: '1px solid #ffd591',
                borderLeft: '4px solid #fa8c16',
                borderRadius: 8,
                marginBottom: 12
              }}>
                <Space justify="space-between" style={{ width: '100%' }}>
                  <Space>
                    <Tag color="orange">临时判断</Tag>
                    <strong>{j.judgment_type}</strong>
                    {j.task_name && <Tag color="blue">{j.task_name}</Tag>}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {j.judged_by} · {dayjs(j.created_at).format('MM-DD HH:mm')}
                    </Text>
                  </Space>
                  <Button type="link" onClick={() => navigate(`/tasks/${j.task_id}`)}>
                    去确认 <ArrowRightOutlined />
                  </Button>
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Text delete type="secondary">{j.original_value}</Text>
                  {' → '}
                  <Text strong style={{ color: '#1677ff' }}>{j.modified_value}</Text>
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  原因: {j.reason}
                </div>
              </div>
            ))}
          </Space>
        )}
      </div>

      <div className="handover-section">
        <div className="handover-title">
          <FileSearchOutlined style={{ color: '#1677ff' }} />
          样本证据位置
        </div>
        
        {info.sample_locations.length === 0 ? (
          <Empty description="暂无样本数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={info.sample_locations}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button type="link" onClick={() => navigate(`/tasks/${item.task_id}`)}>
                    查看样本
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <FolderOpenOutlined />
                      {item.task_name}
                    </Space>
                  }
                  description={`任务ID: ${item.task_id} · 样本数: ${item.evidence_count}`}
                />
              </List.Item>
            )}
          />
        )}
      </div>

      <div className="handover-section">
        <div className="handover-title">
          <DownloadOutlined style={{ color: '#52c41a' }} />
          导出方式
        </div>
        
        <List
          dataSource={info.export_methods}
          renderItem={item => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => window.open(item.endpoint.replace(':taskId', '1').replace(':taskAId', '1').replace(':taskBId', '2'), '_blank')}>
                  示例
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <DownloadOutlined />
                    {item.name}
                  </Space>
                }
                description={
                  <Space direction="vertical">
                    <span>{item.description}</span>
                    <code style={{ background: '#f5f5f5', padding: '2px 6px', fontSize: 12 }}>
                      {item.endpoint}
                    </code>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </div>

      <div className="handover-section">
        <div className="handover-title">
          <FolderOpenOutlined style={{ color: '#722ed1' }} />
          最近任务
        </div>
        
        <List
          dataSource={info.latest_tasks}
          renderItem={item => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => navigate(`/tasks/${item.id}`)}>
                  查看详情 <ArrowRightOutlined />
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <StatusBadge status={item.status} />
                    {item.name}
                  </Space>
                }
                description={
                  <Space>
                    <Tag color="blue">{item.model_version}</Tag>
                    <Text type="secondary">{item.index_type}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.created_by} · {dayjs(item.updated_at).format('MM-DD HH:mm')}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </div>

      <Card style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5} style={{ margin: 0, color: '#389e0d' }}>📋 接班检查清单</Title>
          <Paragraph style={{ margin: 0, color: '#389e0d' }}>
            1. 查看上方「待处理异常」，确认所有特征迟到和临时判断都已处理<br />
            2. 查看「样本证据位置」，点击进入任务可查看具体样本详情<br />
            3. 如需导出数据，参考「导出方式」中的API说明<br />
            4. 所有人工判断都会保留历史记录，不会被新版本覆盖
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default HandoverPage;
