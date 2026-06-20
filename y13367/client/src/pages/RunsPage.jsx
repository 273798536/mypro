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
  Modal,
  Form,
  Input,
  Tooltip,
  Progress,
  message,
  Statistic
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  FileTextOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getPlaybackRuns,
  getGrayConfigs,
  createPlaybackRun,
  exportSamples
} from '../utils/api.js';

const { Option } = Select;
const { TextArea } = Input;

const statusMap = {
  running: { color: 'processing', text: '运行中' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' }
};

const reviewStatusMap = {
  pending: { color: 'default', text: '待处理' },
  in_progress: { color: 'warning', text: '处理中' },
  corrected: { color: 'blue', text: '已改判' },
  confirmed_normal: { color: 'success', text: '已确认正常' },
  corrected_anomaly: { color: 'purple', text: '已改判异常' }
};

export default function RunsPage() {
  const [runs, setRuns] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterConfig, setFilterConfig] = useState(null);
  const [filterDuplicate, setFilterDuplicate] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterConfig) params.config_id = filterConfig;
      if (filterDuplicate) params.duplicate_only = 'true';
      const [runsData, configsData] = await Promise.all([
        getPlaybackRuns(params),
        getGrayConfigs()
      ]);
      setRuns(runsData);
      setConfigs(configsData);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterConfig, filterDuplicate]);

  const handleCreateRun = async (values) => {
    try {
      await createPlaybackRun({
        config_id: values.config_id,
        triggered_by: 'manual_rerun',
        rerun_note: values.rerun_note
      });
      message.success('回放任务已启动');
      setIsModalOpen(false);
      form.resetFields();
      setTimeout(loadData, 1000);
    } catch (err) {
      message.error('启动回放任务失败');
    }
  };

  const columns = [
    {
      title: '运行ID',
      dataIndex: 'run_id',
      key: 'run_id',
      width: 180,
      render: (text, record) => (
        <Space>
          <Link to={`/runs/${text}`}>
            <strong>{text}</strong>
          </Link>
          {record.run_id_duplicate && (
            <Tooltip title={record.duplicate_note || '该 run_id 存在重复'}>
              <Tag color="orange" icon={<WarningOutlined />} className="duplicate-tag">
                ID重复
              </Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '灰度配置',
      dataIndex: 'config_name',
      key: 'config_name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span>{text}</span>
          <Tag style={{ marginTop: 2 }}>{record.bucket}</Tag>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => {
        const cfg = statusMap[s] || { color: 'default', text: s };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      }
    },
    {
      title: '触发方式',
      dataIndex: 'triggered_by',
      key: 'triggered_by',
      width: 110,
      render: (t) => (t === 'manual_rerun' ? <Tag>人工重跑</Tag> : <Tag color="geekblue">定时调度</Tag>)
    },
    {
      title: '样本数',
      dataIndex: 'sample_count',
      key: 'sample_count',
      width: 90,
      render: (v) => v?.toLocaleString()
    },
    {
      title: '异常数',
      dataIndex: 'anomaly_count',
      key: 'anomaly_count',
      width: 90,
      render: (v, r) => (
        <Space>
          <span style={{ color: v > 100 ? '#cf1322' : '#333', fontWeight: 600 }}>{v}</span>
          {r.metrics && (
            <span style={{ color: '#666', fontSize: 12 }}>
              ({(r.metrics.anomaly_rate * 100).toFixed(2)}%)
            </span>
          )}
        </Space>
      )
    },
    {
      title: '召回率 vs 基线',
      key: 'recall_rate',
      width: 200,
      render: (_, record) => {
        if (!record.metrics) return '-';
        const cur = record.metrics.overall_recall_rate;
        const base = record.metrics.baseline_recall_rate;
        const diff = cur - base;
        return (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Space>
              <span style={{ fontWeight: 600 }}>{(cur * 100).toFixed(1)}%</span>
              <span style={{ color: '#999' }}>/ {(base * 100).toFixed(1)}%</span>
              <Tag color={diff >= 0 ? 'green' : 'red'} style={{ margin: 0 }}>
                {diff >= 0 ? '+' : ''}{(diff * 100).toFixed(2)}pp
              </Tag>
            </Space>
            <Progress percent={cur * 100} size="small" showInfo={false} style={{ margin: 0 }} />
          </Space>
        );
      }
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 170,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Link to={`/runs/${record.run_id}`}>
            <Button type="link" icon={<EyeOutlined />} size="small">
              详情
            </Button>
          </Link>
          <Button
            type="link"
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => {
              form.setFieldsValue({
                config_id: record.config_id,
                rerun_note: `基于 ${record.run_id} 重跑`
              });
              setIsModalOpen(true);
            }}
          >
            重跑
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => exportSamples({ run_id: record.run_id })}
          >
            导出
          </Button>
        </Space>
      )
    }
  ];

  const stats = {
    total: runs.length,
    completed: runs.filter(r => r.status === 'completed').length,
    running: runs.filter(r => r.status === 'running').length,
    anomalies: runs.reduce((sum, r) => sum + (r.anomaly_count || 0), 0)
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#1677ff' }}>{stats.total}</div>
            <div className="stat-label">回放任务总数</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#52c41a' }}>{stats.completed}</div>
            <div className="stat-label">已完成</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#faad14' }}>{stats.running}</div>
            <div className="stat-label">运行中</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <div className="stat-value" style={{ color: '#cf1322' }}>{stats.anomalies}</div>
            <div className="stat-label">异常样本总数</div>
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setIsModalOpen(true)}>
            启动回放
          </Button>
          <Select
            placeholder="按状态筛选"
            style={{ width: 140 }}
            allowClear
            value={filterStatus}
            onChange={setFilterStatus}
          >
            <Option value="running">运行中</Option>
            <Option value="completed">已完成</Option>
            <Option value="failed">失败</Option>
          </Select>
          <Select
            placeholder="按灰度配置筛选"
            style={{ width: 260 }}
            allowClear
            value={filterConfig}
            onChange={setFilterConfig}
            showSearch
            optionFilterProp="label"
          >
            {configs.map(c => (
              <Option key={c.config_id} value={c.config_id} label={c.name}>
                {c.name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="run_id 重复"
            style={{ width: 140 }}
            allowClear
            value={filterDuplicate || undefined}
            onChange={(v) => setFilterDuplicate(v === 'true')}
          >
            <Option value="true">仅看重复ID</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={runs}
          rowKey="run_id"
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="启动回放任务"
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="启动"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateRun}>
          <Form.Item
            name="config_id"
            label="灰度配置"
            rules={[{ required: true, message: '请选择灰度配置' }]}
          >
            <Select placeholder="选择要回放的灰度配置">
              {configs.map(c => (
                <Option key={c.config_id} value={c.config_id}>
                  {c.name}（{c.bucket}）
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="rerun_note" label="重跑说明">
            <TextArea rows={3} placeholder="如：修复 xx 参数后验证、对比基线等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
