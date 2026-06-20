import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Select,
  Button,
  Space,
  Progress,
  Tooltip,
  Alert,
  message,
  Statistic
} from 'antd';
import {
  ReloadOutlined,
  WarningOutlined,
  EyeOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getImpactAnalysis, getPlaybackRuns } from '../utils/api.js';

const { Option } = Select;

export default function ImpactAnalysisPage() {
  const [data, setData] = useState({ channel_impact: [], high_impact_samples: [] });
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterRun, setFilterRun] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterRun) params.run_id = filterRun;
      const [impactData, runData] = await Promise.all([
        getImpactAnalysis(params),
        getPlaybackRuns()
      ]);
      setData(impactData);
      setRuns(runData);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterRun]);

  const totalDrops = data.channel_impact.reduce((sum, c) => sum + c.total_rate_drop, 0);

  const channelColumns = [
    {
      title: '召回通道',
      dataIndex: 'channel',
      key: 'channel',
      width: 160
    },
    {
      title: '异常样本数',
      dataIndex: 'anomaly_count',
      key: 'anomaly_count',
      width: 110,
      render: (v, record) => (
        <Space>
          <strong style={{ color: v > 50 ? '#cf1322' : '#333', fontSize: 16 }}>{v}</strong>
          {record.corrected_count > 0 && (
            <Tag color="blue">已改判 {record.corrected_count}</Tag>
          )}
        </Space>
      )
    },
    {
      title: '平均命中率下降',
      dataIndex: 'avg_rate_drop',
      key: 'avg_rate_drop',
      width: 180,
      render: (v) => (
        <Space style={{ width: '100%' }}>
          <Progress
            percent={v * 100}
            max={1}
            size="small"
            strokeColor="#cf1322"
            style={{ flex: 1 }}
          />
          <strong style={{ color: '#cf1322', minWidth: 70, textAlign: 'right' }}>
            -{(v * 100).toFixed(2)}pp
          </strong>
        </Space>
      )
    },
    {
      title: '累计影响（对总指标的拉动）',
      dataIndex: 'total_rate_drop',
      key: 'total_rate_drop',
      width: 260,
      render: (v, record) => {
        const pct = totalDrops > 0 ? (v / totalDrops) * 100 : 0;
        return (
          <Space style={{ width: '100%' }}>
            <Progress
              percent={pct}
              size="small"
              strokeColor={pct > 40 ? '#cf1322' : pct > 20 ? '#faad14' : '#1677ff'}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 100, textAlign: 'right' }}>
              <strong>{(v * record.anomaly_count).toFixed(1)}</strong>
              <span style={{ color: '#999' }}> · {pct.toFixed(0)}%</span>
            </span>
          </Space>
        );
      },
      sorter: (a, b) => a.total_rate_drop * a.anomaly_count - b.total_rate_drop * b.anomaly_count
    },
    {
      title: 'Top 偏离样本',
      dataIndex: 'samples',
      key: 'samples',
      render: (samples) => (
        <Space wrap size={4}>
          {samples.slice(0, 5).map(s => (
            <Link key={s.sample_id} to={`/samples/${s.sample_id}`}>
              <Tag color={s.corrected ? 'blue' : 'red'} style={{ cursor: 'pointer' }}>
                {s.sample_id.slice(-4)} -{(s.drop * 100).toFixed(0)}pp
              </Tag>
            </Link>
          ))}
          {samples.length > 5 && <Tag>+{samples.length - 5}</Tag>}
        </Space>
      )
    }
  ];

  const sampleColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 70,
      render: (_, __, idx) => (
        <Space>
          {idx < 3 && <ArrowDownOutlined style={{ color: '#cf1322' }} />}
          <strong style={{ color: idx < 3 ? '#cf1322' : '#333', fontSize: idx < 3 ? 16 : 14 }}>
            #{idx + 1}
          </strong>
        </Space>
      )
    },
    {
      title: '样本ID',
      dataIndex: 'sample_id',
      key: 'sample_id',
      width: 170,
      render: (text) => <Link to={`/samples/${text}`}><strong>{text}</strong></Link>
    },
    {
      title: '运行ID',
      dataIndex: 'run_id',
      key: 'run_id',
      width: 170,
      render: (text) => <Link to={`/runs/${text}`}>{text}</Link>
    },
    {
      title: '通道',
      dataIndex: 'channel',
      key: 'channel',
      width: 140
    },
    {
      title: '命中率下降',
      dataIndex: 'rate_drop',
      key: 'rate_drop',
      width: 220,
      render: (v) => (
        <Space style={{ width: '100%' }}>
          <Progress
            percent={v * 100}
            max={1}
            size="small"
            strokeColor="#cf1322"
            style={{ flex: 1 }}
          />
          <strong style={{ color: '#cf1322', minWidth: 70, textAlign: 'right' }}>
            -{(v * 100).toFixed(2)}pp
          </strong>
        </Space>
      )
    },
    {
      title: '命中率 / 基线',
      key: 'rate',
      width: 180,
      render: (_, r) => (
        <span>
          <strong style={{ color: '#cf1322' }}>{(r.recall_hit_rate * 100).toFixed(1)}%</strong>
          <span style={{ color: '#999' }}> / {(r.baseline_hit_rate * 100).toFixed(1)}%</span>
        </span>
      )
    },
    {
      title: '异常分数',
      dataIndex: 'anomaly_score',
      key: 'anomaly_score',
      width: 100,
      render: (v) => (
        <Tag color={v > 0.8 ? 'red' : v > 0.5 ? 'orange' : 'default'}>
          {(v * 100).toFixed(0)}
        </Tag>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, r) => (
        <Space>
          {r.has_correction && <Tag color="blue">已改判</Tag>}
          {r.review_status === 'confirmed_normal' && <Tag color="green">已确认</Tag>}
          {!r.has_correction && r.review_status === 'pending' && (
            <Tag color="default">待处理</Tag>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => (
        <Link to={`/samples/${r.sample_id}`}>
          <Button type="link" icon={<EyeOutlined />} size="small">查看</Button>
        </Link>
      )
    }
  ];

  return (
    <div>
      <Alert
        type="info"
        showIcon
        message="影响分析说明"
        description={
          <span>
            以下分析帮助评审时快速定位<strong>哪些样本把整体结论拉偏了</strong>。
            按通道和样本维度分别展示对总召回率的影响程度，优先处理 Top 偏离样本可快速缩小指标差距。
          </span>
        }
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#cf1322' }}>
              {data.high_impact_samples.length}
            </div>
            <div className="stat-label">Top 偏离样本</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#faad14' }}>
              {data.channel_impact.length}
            </div>
            <div className="stat-label">涉及异常通道</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#1677ff' }}>
              {data.channel_impact.reduce((s, c) => s + c.corrected_count, 0)}
            </div>
            <div className="stat-label">已人工改判</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#52c41a' }}>
              {data.channel_impact.length > 0 ? data.channel_impact[0].channel : '-'}
            </div>
            <div className="stat-label">影响最大通道</div>
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="按回放任务筛选"
          style={{ width: 280 }}
          allowClear
          showSearch
          value={filterRun}
          onChange={setFilterRun}
        >
          {runs.map(r => (
            <Option key={r.run_id} value={r.run_id}>
              {r.run_id} {r.config_name}
            </Option>
          ))}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
      </Space>

      <Card
        title="通道维度影响分析（按对总指标拉动排序）"
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={channelColumns}
          dataSource={data.channel_impact}
          rowKey="channel"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Card title="样本维度 Top 偏离排行（最可能拉偏结论的样本）">
        <Table
          columns={sampleColumns}
          dataSource={data.high_impact_samples}
          rowKey="sample_id"
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
