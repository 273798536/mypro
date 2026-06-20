import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Table,
  Progress,
  Button,
  Space,
  Tooltip,
  message,
  Empty,
  Statistic
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  WarningOutlined,
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Link, useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getPlaybackRun,
  getSamples,
  createPlaybackRun,
  exportSamples
} from '../utils/api.js';

const reviewStatusMap = {
  pending: { color: 'default', text: '待处理' },
  in_progress: { color: 'warning', text: '处理中' },
  corrected: { color: 'blue', text: '已改判' },
  confirmed_normal: { color: 'success', text: '已确认正常' },
  corrected_anomaly: { color: 'purple', text: '已改判异常' }
};

export default function RunDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const runData = await getPlaybackRun(runId);
      setRun(runData);
      const sampleData = await getSamples({ run_id: runId, page_size: 50 });
      setSamples(sampleData.data);
      setTotal(sampleData.total);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [runId]);

  const handleRerun = async () => {
    if (!run) return;
    try {
      await createPlaybackRun({
        config_id: run.config_id,
        triggered_by: 'manual_rerun',
        rerun_note: `基于 ${run.run_id} 重跑`
      });
      message.success('重跑任务已启动');
      setTimeout(() => navigate('/runs'), 1000);
    } catch (err) {
      message.error('重跑失败');
    }
  };

  if (!run) return <Empty />;

  const channelData = run.metrics?.channels ? Object.entries(run.metrics.channels).map(([name, data]) => ({
    key: name,
    channel: name,
    rate: data.rate,
    baseline: data.baseline,
    diff: data.rate - data.baseline,
    anomaly_samples: data.anomaly_samples
  })) : [];

  const sampleColumns = [
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
      title: '通道',
      dataIndex: 'channel',
      key: 'channel',
      width: 140
    },
    {
      title: '是否异常',
      dataIndex: 'is_anomaly',
      key: 'is_anomaly',
      width: 90,
      render: (v) => v ? <Tag color="red">异常</Tag> : <Tag color="green">正常</Tag>
    },
    {
      title: '异常类型',
      dataIndex: 'anomaly_type',
      key: 'anomaly_type',
      width: 130,
      render: (v) => v || '-'
    },
    {
      title: '命中率 / 基线',
      key: 'rate',
      width: 200,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span>
            <strong>{(r.recall_hit_rate * 100).toFixed(1)}%</strong>
            <span style={{ color: '#999' }}> / {(r.baseline_hit_rate * 100).toFixed(1)}%</span>
          </span>
          <Progress percent={r.recall_hit_rate * 100} size="small" showInfo={false} />
        </Space>
      )
    },
    {
      title: '人工改判',
      dataIndex: 'manual_correction',
      key: 'manual_correction',
      width: 90,
      render: (v) => v ? <Tag color="blue">有</Tag> : <span style={{ color: '#999' }}>无</span>
    },
    {
      title: '审核状态',
      dataIndex: 'review_status',
      key: 'review_status',
      width: 100,
      render: (s) => {
        const cfg = reviewStatusMap[s] || { color: 'default', text: s };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      }
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
      <Space style={{ marginBottom: 16 }}>
        <Link to="/runs">
          <Button icon={<ArrowLeftOutlined />}>返回列表</Button>
        </Link>
        <Button icon={<ReloadOutlined />} onClick={handleRerun} type="primary">重跑此任务</Button>
        <Button icon={<DownloadOutlined />} onClick={() => exportSamples({ run_id: runId })}>
          导出样本 CSV
        </Button>
      </Space>

      <Card title="回放任务概览" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#1677ff' }}>{run.sample_count?.toLocaleString()}</div>
              <div className="stat-label">样本总数</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#cf1322' }}>{run.anomaly_count}</div>
              <div className="stat-label">异常样本</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: run.metrics?.overall_recall_rate >= run.metrics?.baseline_recall_rate ? '#52c41a' : '#cf1322' }}>
                {run.metrics ? (run.metrics.overall_recall_rate * 100).toFixed(2) + '%' : '-'}
              </div>
              <div className="stat-label">召回率</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#666' }}>
                {run.metrics ? (run.metrics.baseline_recall_rate * 100).toFixed(2) + '%' : '-'}
              </div>
              <div className="stat-label">基线召回率</div>
            </Card>
          </Col>
        </Row>

        <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="运行ID">
            <Space>
              <strong>{run.run_id}</strong>
              {run.run_id_duplicate && (
                <Tooltip title={run.duplicate_note || 'run_id 存在重复'}>
                  <Tag color="orange" icon={<WarningOutlined />}>ID重复</Tag>
                </Tooltip>
              )}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={run.status === 'completed' ? 'success' : run.status === 'running' ? 'processing' : 'error'}>
              {run.status === 'completed' ? '已完成' : run.status === 'running' ? '运行中' : '失败'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="灰度配置">
            {run.config_name || run.config_id}（{run.config?.bucket}）
          </Descriptions.Item>
          <Descriptions.Item label="触发方式">
            {run.triggered_by === 'manual_rerun' ? '人工重跑' : '定时调度'}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {dayjs(run.start_time).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {run.end_time ? dayjs(run.end_time).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          {run.rerun_from && (
            <Descriptions.Item label="基于重跑">
              <Link to={`/runs/${run.rerun_from}`}>{run.rerun_from}</Link>
            </Descriptions.Item>
          )}
          {run.rerun_note && (
            <Descriptions.Item label="重跑说明">{run.rerun_note}</Descriptions.Item>
          )}
          <Descriptions.Item label="证据路径" span={2}>
            <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>
              {run.evidence_path}
            </code>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="分通道召回率对比" style={{ marginBottom: 16 }}>
        <Table
          dataSource={channelData}
          pagination={false}
          size="middle"
          columns={[
            {
              title: '召回通道',
              dataIndex: 'channel',
              key: 'channel',
              width: 160
            },
            {
              title: '当前召回率',
              dataIndex: 'rate',
              key: 'rate',
              width: 300,
              render: (v, record) => (
                <Space style={{ width: '100%' }}>
                  <Progress
                    percent={v * 100}
                    size="small"
                    strokeColor={v >= record.baseline ? '#52c41a' : '#cf1322'}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                    {(v * 100).toFixed(1)}%
                  </span>
                </Space>
              )
            },
            {
              title: '基线',
              dataIndex: 'baseline',
              key: 'baseline',
              width: 100,
              render: (v) => (v * 100).toFixed(1) + '%'
            },
            {
              title: '差值',
              dataIndex: 'diff',
              key: 'diff',
              width: 100,
              render: (v) => (
                <Tag color={v >= 0 ? 'green' : 'red'}>
                  {v >= 0 ? '+' : ''}{(v * 100).toFixed(2)}pp
                </Tag>
              )
            },
            {
              title: '通道异常样本数',
              dataIndex: 'anomaly_samples',
              key: 'anomaly_samples',
              render: (v) => <strong style={{ color: v > 50 ? '#cf1322' : '#333' }}>{v}</strong>
            }
          ]}
        />
      </Card>

      <Card title={`样本列表（共 ${total} 条）`}>
        <Table
          columns={sampleColumns}
          dataSource={samples}
          rowKey="sample_id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
