import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Progress,
  Tooltip,
  message
} from 'antd';
import {
  ReloadOutlined,
  WarningOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { getSamples, getPlaybackRuns, exportSamples } from '../utils/api.js';

const { Option } = Select;

const anomalyTypeMap = {
  recall_rate_drop: { color: 'red', text: '召回率下降' },
  zero_hit: { color: 'volcano', text: '零命中' },
  truncate_bug: { color: 'magenta', text: '截断异常' }
};

const reviewStatusMap = {
  pending: { color: 'default', text: '待处理' },
  in_progress: { color: 'warning', text: '处理中' },
  corrected: { color: 'blue', text: '已改判' },
  confirmed_normal: { color: 'success', text: '已确认正常' },
  corrected_anomaly: { color: 'purple', text: '已改判异常' }
};

export default function SamplesPage() {
  const [samples, setSamples] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filterRun, setFilterRun] = useState(null);
  const [filterAnomaly, setFilterAnomaly] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [filterReview, setFilterReview] = useState(null);
  const [filterCorrection, setFilterCorrection] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (filterRun) params.run_id = filterRun;
      if (filterAnomaly !== null) params.is_anomaly = filterAnomaly;
      if (filterType) params.anomaly_type = filterType;
      if (filterReview) params.review_status = filterReview;
      if (filterCorrection !== null) params.has_manual_correction = filterCorrection;

      const [sampleData, runData] = await Promise.all([
        getSamples(params),
        getPlaybackRuns()
      ]);
      setSamples(sampleData.data);
      setTotal(sampleData.total);
      setRuns(runData);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, filterRun, filterAnomaly, filterType, filterReview, filterCorrection]);

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
      title: '运行ID',
      dataIndex: 'run_id',
      key: 'run_id',
      width: 170,
      render: (text) => <Link to={`/runs/${text}`}>{text}</Link>
    },
    {
      title: '场景',
      dataIndex: 'scene',
      key: 'scene',
      width: 120
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
      width: 110,
      render: (v) => v ? (
        <Tag color={anomalyTypeMap[v]?.color || 'default'}>
          {anomalyTypeMap[v]?.text || v}
        </Tag>
      ) : '-'
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
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 80,
      render: (_, r) => (
        <Link to={`/samples/${r.sample_id}`}>
          <Button type="link" icon={<EyeOutlined />} size="small">查看</Button>
        </Link>
      )
    }
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="按运行ID筛选"
          style={{ width: 200 }}
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
        <Select
          placeholder="是否异常"
          style={{ width: 130 }}
          allowClear
          value={filterAnomaly}
          onChange={setFilterAnomaly}
        >
          <Option value="true">仅异常</Option>
          <Option value="false">仅正常</Option>
        </Select>
        <Select
          placeholder="异常类型"
          style={{ width: 140 }}
          allowClear
          value={filterType}
          onChange={setFilterType}
        >
          <Option value="recall_rate_drop">召回率下降</Option>
          <Option value="zero_hit">零命中</Option>
          <Option value="truncate_bug">截断异常</Option>
        </Select>
        <Select
          placeholder="审核状态"
          style={{ width: 140 }}
          allowClear
          value={filterReview}
          onChange={setFilterReview}
        >
          <Option value="pending">待处理</Option>
          <Option value="in_progress">处理中</Option>
          <Option value="corrected">已改判</Option>
          <Option value="confirmed_normal">已确认正常</Option>
        </Select>
        <Select
          placeholder="人工改判"
          style={{ width: 140 }}
          allowClear
          value={filterCorrection}
          onChange={setFilterCorrection}
        >
          <Option value="true">有改判</Option>
          <Option value="false">无改判</Option>
        </Select>
        <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
        <Button icon={<DownloadOutlined />} onClick={() => exportSamples({ run_id: filterRun })}>
          导出CSV
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={samples}
        rowKey="sample_id"
        loading={loading}
        scroll={{ x: 1500 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: (t) => `共 ${t} 条`
        }}
      />
    </Card>
  );
}
