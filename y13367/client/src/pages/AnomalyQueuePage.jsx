import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Tooltip,
  Progress,
  message,
  Tabs
} from 'antd';
import {
  ReloadOutlined,
  WarningOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { getAnomalyQueue, getUsers } from '../utils/api.js';

const { Option } = Select;

const processingMap = {
  pending: { color: 'default', text: '待处理', icon: <ClockCircleOutlined /> },
  in_progress: { color: 'warning', text: '处理中', icon: <EditOutlined /> },
  corrected: { color: 'blue', text: '已改判', icon: <CheckCircleOutlined /> },
  confirmed_normal: { color: 'green', text: '已确认正常', icon: <CheckCircleOutlined /> }
};

const anomalyTypeMap = {
  recall_rate_drop: { color: 'red', text: '召回率下降' },
  zero_hit: { color: 'volcano', text: '零命中' },
  truncate_bug: { color: 'magenta', text: '截断异常' }
};

export default function AnomalyQueuePage() {
  const [data, setData] = useState({ stats: {}, data: [] });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      let statusParam = null;
      if (activeTab !== 'all') {
        statusParam = activeTab;
      }
      const params = {};
      if (statusParam) params.status = statusParam;
      if (filterAssignee) params.assignee = filterAssignee;

      const [queueData, userData] = await Promise.all([
        getAnomalyQueue(params),
        getUsers()
      ]);
      setData(queueData);
      setUsers(userData);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, filterAssignee]);

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>全部 <Tag style={{ marginLeft: 8 }}>{data.stats.total || 0}</Tag></span>
      )
    },
    {
      key: 'pending',
      label: (
        <span>待处理 <Tag color="default" style={{ marginLeft: 8 }}>{data.stats.pending || 0}</Tag></span>
      )
    },
    {
      key: 'in_progress',
      label: (
        <span>处理中 <Tag color="warning" style={{ marginLeft: 8 }}>{data.stats.in_progress || 0}</Tag></span>
      )
    },
    {
      key: 'corrected',
      label: (
        <span>已改判 <Tag color="blue" style={{ marginLeft: 8 }}>{data.stats.corrected || 0}</Tag></span>
      )
    },
    {
      key: 'confirmed_normal',
      label: (
        <span>已确认正常 <Tag color="green" style={{ marginLeft: 8 }}>{data.stats.confirmed_normal || 0}</Tag></span>
      )
    }
  ];

  const columns = [
    {
      title: '样本ID',
      dataIndex: 'sample_id',
      key: 'sample_id',
      width: 170,
      render: (text, record) => (
        <Space>
          <Link to={`/samples/${text}`}><strong>{text}</strong></Link>
          {record.run_id_duplicate && (
            <Tooltip title="所属 run_id 存在重复">
              <Tag color="orange" icon={<WarningOutlined />}>ID重复</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '运行ID / 配置',
      key: 'run',
      width: 200,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Link to={`/runs/${r.run_id}`}>{r.run_id}</Link>
          <span style={{ color: '#666', fontSize: 12 }}>{r.config_name}</span>
        </Space>
      )
    },
    {
      title: '场景/通道',
      key: 'scene',
      width: 140,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span>{r.scene}</span>
          <Tag style={{ marginTop: 2 }}>{r.channel}</Tag>
        </Space>
      )
    },
    {
      title: '异常类型',
      dataIndex: 'anomaly_type',
      key: 'anomaly_type',
      width: 110,
      render: (v) => v ? (
        <Tag color={anomalyTypeMap[v]?.color || 'default'}>
          {anomalyTypeMap[v]?.text || v}
        </Tag>
      ) : '-'
    },
    {
      title: '异常分数',
      dataIndex: 'anomaly_score',
      key: 'anomaly_score',
      width: 100,
      render: (v) => (
        <Progress
          type="dashboard"
          percent={v * 100}
          size={60}
          strokeColor={v > 0.8 ? '#cf1322' : v > 0.5 ? '#faad14' : '#52c41a'}
        />
      )
    },
    {
      title: '命中率 / 基线',
      key: 'rate',
      width: 180,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span>
            <strong style={{ color: '#cf1322' }}>{(r.recall_hit_rate * 100).toFixed(1)}%</strong>
            <span style={{ color: '#999' }}> / {(r.baseline_hit_rate * 100).toFixed(1)}%</span>
          </span>
          <Tag color="red" style={{ marginTop: 2 }}>
            -{((r.baseline_hit_rate - r.recall_hit_rate) * 100).toFixed(1)}pp
          </Tag>
        </Space>
      )
    },
    {
      title: '处理状态',
      dataIndex: 'processing_status',
      key: 'processing_status',
      width: 110,
      render: (s) => {
        const cfg = processingMap[s] || { color: 'default', text: s, icon: null };
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>;
      }
    },
    {
      title: '处理人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 90,
      render: (v, r) => (
        <Space>
          {v || <span style={{ color: '#999' }}>未分配</span>}
          {r.has_manual_correction && <Tag color="blue">有改判</Tag>}
        </Space>
      )
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (t) => dayjs(t).format('MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 80,
      render: (_, r) => (
        <Link to={`/samples/${r.sample_id}`}>
          <Button type="link" icon={<EyeOutlined />} size="small">处理</Button>
        </Link>
      )
    }
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#1677ff' }}>{data.stats.total || 0}</div>
            <div className="stat-label">异常总数</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#faad14' }}>{data.stats.pending || 0}</div>
            <div className="stat-label">待处理</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#1677ff' }}>{data.stats.in_progress || 0}</div>
            <div className="stat-label">处理中</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#52c41a' }}>
              {(data.stats.corrected || 0) + (data.stats.confirmed_normal || 0)}
            </div>
            <div className="stat-label">已处理</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#cf1322' }}>{data.stats.need_evidence || 0}</div>
            <div className="stat-label">需补证据</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#fa8c16' }}>
              {data.stats.total ? (
                ((1 - (data.stats.pending || 0) / data.stats.total) * 100).toFixed(0) + '%'
              ) : '0%'}
            </div>
            <div className="stat-label">处理完成率</div>
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Select
            placeholder="按处理人筛选"
            style={{ width: 160 }}
            allowClear
            value={filterAssignee}
            onChange={setFilterAssignee}
          >
            {users.map(u => (
              <Option key={u.username} value={u.username}>
                {u.name}（{u.team}）
              </Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
        </Space>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: 0 }}
        />

        <Table
          columns={columns}
          dataSource={data.data}
          rowKey="sample_id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>
    </div>
  );
}
