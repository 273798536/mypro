import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Switch,
  Descriptions,
  Row,
  Col,
  Statistic,
  Spin,
  Divider,
  message,
  Tooltip,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, EyeOutlined, ExportOutlined, AlertOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { runsApi, fieldMappingApi } from '../api';
import type { EvaluationRun, EvaluationRecord } from '../types';

const { Search } = Input;

const RunDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const runId = Number(id);

  const [run, setRun] = useState<EvaluationRun | null>(null);
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [fieldMappings, setFieldMappings] = useState<any[]>([]);

  useEffect(() => {
    if (runId) {
      runsApi.get(runId).then(setRun);
      fieldMappingApi.list({ run_id: runId }).then(setFieldMappings);
      loadRecords();
    }
  }, [runId]);

  const loadRecords = () => {
    setLoading(true);
    runsApi
      .records(runId, {
        anomaly_only: anomalyOnly,
        query_keyword: keyword || undefined,
        limit: 500,
      })
      .then((d) => {
        setRecords(d);
        setLoading(false);
      });
  };

  const anomalyCount = records.filter((r) => r.anomaly_flag).length;
  const judgedCount = records.filter((r) => (r.judgments?.length || 0) > 0).length;

  const columns = [
    { title: '行号', dataIndex: 'original_row_index', width: 70 },
    { title: 'Query ID', dataIndex: 'query_id', width: 100 },
    {
      title: '查询文本',
      dataIndex: 'query_text',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '召回率',
      dataIndex: 'metrics',
      width: 90,
      render: (m: any) =>
        m && typeof m.recall_rate === 'number' ? (m.recall_rate * 100).toFixed(1) + '%' : '-',
    },
    {
      title: '精确率',
      dataIndex: 'metrics',
      width: 90,
      render: (m: any) =>
        m && typeof m.precision === 'number' ? (m.precision * 100).toFixed(1) + '%' : '-',
    },
    {
      title: 'F1',
      dataIndex: 'metrics',
      width: 90,
      render: (m: any) => (m && typeof m.f1 === 'number' ? m.f1.toFixed(3) : '-'),
    },
    {
      title: '正例数 / 召回到',
      width: 130,
      render: (_: any, r: EvaluationRecord) => (
        <span>
          {(r.expected_docs || []).length} / {(r.recalled_docs || []).length}
        </span>
      ),
    },
    {
      title: '人工改判',
      width: 100,
      render: (_: any, r: EvaluationRecord) =>
        (r.judgments?.length || 0) > 0 ? (
          <Tag color="orange">{r.judgments.length} 条</Tag>
        ) : (
          <span style={{ color: '#bbb' }}>无</span>
        ),
    },
    {
      title: '异常 / 污染',
      width: 130,
      render: (_: any, r: EvaluationRecord) =>
        r.anomaly_flag ? (
          <Tooltip title={r.anomaly_desc}>
            <Tag color={r.anomaly_flag.includes('pollution') ? 'red' : 'gold'}>
              {r.anomaly_flag.includes('pollution') ? '验证集污染' : '异常'}
            </Tag>
          </Tooltip>
        ) : (
          <span style={{ color: '#bbb' }}>正常</span>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, r: EvaluationRecord) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/records/${r.id}`)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  if (!run) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/runs')} style={{ marginBottom: 12 }}>
          返回批次列表
        </Button>
        <Card>
          <Descriptions title={`评测批次 #${run.id} · ${run.original_filename}`} column={3}>
            <Descriptions.Item label="模型版本">
              <Tag color="blue">{run.model_version}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="复核人">{run.evaluator}</Descriptions.Item>
            <Descriptions.Item label="导入时间">
              {dayjs(run.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color="green">{run.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="原始文件">{run.original_filename}</Descriptions.Item>
            <Descriptions.Item label="备注">{run.notes || '-'}</Descriptions.Item>
          </Descriptions>
          <Divider style={{ margin: '12px 0' }} />
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="总记录数" value={run.record_count} />
            </Col>
            <Col span={6}>
              <Statistic title="异常/污染条数" value={anomalyCount} valueStyle={{ color: '#ff4d4f' }} />
            </Col>
            <Col span={6}>
              <Statistic title="已人工改判" value={judgedCount} valueStyle={{ color: '#fa8c16' }} />
            </Col>
            <Col span={6}>
              <Statistic
                title="待处理"
                value={anomalyCount - records.filter((r) => r.anomalies?.some((a) => a.status === 'resolved')).length}
                valueStyle={{ color: '#1677ff' }}
              />
            </Col>
          </Row>
        </Card>
      </div>

      <Card
        title="字段归一化映射（来源追踪）"
        size="small"
        style={{ marginBottom: 16 }}
      >
        {fieldMappings.length === 0 ? (
          <span style={{ color: '#999' }}>无字段映射</span>
        ) : (
          <Space wrap>
            {fieldMappings.map((f) => (
              <Tag key={f.id} color="blue">
                {f.source_field} → <strong>{f.standard_field}</strong>
              </Tag>
            ))}
          </Space>
        )}
      </Card>

      <Card
        title="评测记录列表"
        extra={
          <Space>
            <Search
              placeholder="搜索 query 文本或 ID"
              style={{ width: 260 }}
              allowClear
              onSearch={(v) => {
                setKeyword(v);
                setTimeout(loadRecords, 0);
              }}
              enterButton={<SearchOutlined />}
            />
            <span style={{ color: '#666' }}>仅看异常</span>
            <Switch checked={anomalyOnly} onChange={(v) => { setAnomalyOnly(v); setTimeout(loadRecords, 0); }} />
            <Button
              icon={<AlertOutlined />}
              onClick={() => navigate('/anomalies')}
            >
              异常追踪台
            </Button>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={async () => {
                const data = await runsApi.export(runId);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gatekeeper_run_${runId}_${run.model_version}.json`;
                a.click();
                message.success('已导出完整 JSON');
              }}
            >
              重新导出（带改判和异常）
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={records}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

export default RunDetail;
