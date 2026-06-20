import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Table,
  Tag,
  Space,
  Button,
  Statistic,
  Divider,
  message,
  Spin,
  Descriptions,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowRightOutlined } from '@ant-design/icons';
import { runsApi, compareApi } from '../api';
import type { EvaluationRun, ComparisonResult } from '../types';

const { Option } = Select;

const CompareRuns: React.FC = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [runA, setRunA] = useState<number | null>(null);
  const [runB, setRunB] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    runsApi.list().then((d) => {
      setRuns(d);
      if (d.length >= 2) {
        setRunA(d[1].id);
        setRunB(d[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (runA && runB && runA !== runB) {
      doCompare();
    }
  }, [runA, runB]);

  const doCompare = async () => {
    if (!runA || !runB || runA === runB) return;
    setLoading(true);
    try {
      const r = await compareApi.runs(runA, runB);
      setResult(r);
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '对比失败');
    } finally {
      setLoading(false);
    }
  };

  const metricCols = result
    ? [
        { title: '指标', dataIndex: 'metric', width: 120 },
        {
          title: `${result.model_a} (Run #${result.run_a_id})`,
          dataIndex: `avg_v${result.model_a}`,
          render: (v: any) => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
        },
        {
          title: `${result.model_b} (Run #${result.run_b_id})`,
          dataIndex: `avg_v${result.model_b}`,
          render: (v: any) => (typeof v === 'number' ? (v * 100).toFixed(2) + '%' : '-'),
        },
        {
          title: '变化量 (B - A)',
          dataIndex: 'delta',
          render: (v: any) => {
            if (typeof v !== 'number') return '-';
            const pct = (v * 100).toFixed(2) + '%';
            const color = v > 0 ? 'green' : v < 0 ? 'red' : 'default';
            return <Tag color={color}>{v > 0 ? '+' : ''}{pct}</Tag>;
          },
        },
      ]
    : [];

  const queryCols = result
    ? [
        { title: 'Query ID', dataIndex: 'query_id', width: 100 },
        { title: '查询文本', dataIndex: 'query_text', ellipsis: true },
        {
          title: '指标差异',
          dataIndex: 'metrics_diff',
          render: (v: any) => {
            if (!v || Object.keys(v).length === 0) return <span style={{ color: '#999' }}>-</span>;
            return (
              <Space wrap>
                {Object.entries(v).map(([k, d]: [string, any]) => (
                  <Tag
                    key={k}
                    color={d.delta > 0 ? 'green' : d.delta < 0 ? 'red' : 'default'}
                  >
                    {k}: {(d.before * 100).toFixed(0)}% → {(d.after * 100).toFixed(0)}%
                    ({d.delta > 0 ? '+' : ''}{(d.delta * 100).toFixed(1)}%)
                  </Tag>
                ))}
              </Space>
            );
          },
        },
        {
          title: '召回结果变化',
          dataIndex: 'recalled_changed',
          width: 120,
          render: (v: boolean, r: any) =>
            v ? (
              <Tag color="orange">已变化</Tag>
            ) : (
              <span style={{ color: '#999' }}>无</span>
            ),
        },
        {
          title: '异常状态',
          width: 140,
          render: (_: any, r: any) => (
            <Space>
              {r.anomaly_a && <Tag color="gold">{r.anomaly_a} (A)</Tag>}
              {r.anomaly_b && <Tag color="red">{r.anomaly_b} (B)</Tag>}
              {!r.anomaly_a && !r.anomaly_b && <span style={{ color: '#bbb' }}>正常</span>}
            </Space>
          ),
        },
      ]
    : [];

  return (
    <div>
      <Card title="选择两个评测批次进行对比（旧版本人工判断不被覆盖）" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>版本 A（基准 / 旧）</div>
            <Select
              style={{ width: '100%' }}
              value={runA}
              onChange={setRunA}
              placeholder="选择评测批次"
              showSearch
              optionFilterProp="label"
            >
              {runs.map((r) => (
                <Option
                  key={r.id}
                  value={r.id}
                  label={`#${r.id} ${r.model_version} - ${r.original_filename}`}
                >
                  <Tag color="blue">{r.model_version}</Tag>
                  #{r.id} {r.original_filename}
                  <span style={{ color: '#999' }}> — {r.evaluator} · {r.record_count}条</span>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>版本 B（对比 / 新）</div>
            <Select
              style={{ width: '100%' }}
              value={runB}
              onChange={setRunB}
              placeholder="选择评测批次"
              showSearch
              optionFilterProp="label"
            >
              {runs.map((r) => (
                <Option
                  key={r.id}
                  value={r.id}
                  label={`#${r.id} ${r.model_version} - ${r.original_filename}`}
                >
                  <Tag color="blue">{r.model_version}</Tag>
                  #{r.id} {r.original_filename}
                  <span style={{ color: '#999' }}> — {r.evaluator} · {r.record_count}条</span>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button type="primary" onClick={doCompare} loading={loading}>
              执行对比
            </Button>
          </Col>
        </Row>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      )}

      {!loading && result && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="总 Query 数" value={result.total_queries} />
              </Col>
              <Col span={6}>
                <Statistic title="两个版本共有 Query" value={result.common_queries} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic
                  title={`仅在 A (${result.model_a}) 中`}
                  value={result.only_in_a}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={`仅在 B (${result.model_b}) 中`}
                  value={result.only_in_b}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Col>
            </Row>
          </Card>

          <Card
            title={`整体指标变化（${result.model_a} vs ${result.model_b}）`}
            style={{ marginBottom: 16 }}
          >
            {result.metric_diffs.length === 0 ? (
              <div style={{ color: '#999' }}>无可用指标数据</div>
            ) : (
              <Table
                rowKey="metric"
                columns={metricCols}
                dataSource={result.metric_diffs}
                pagination={false}
                size="small"
              />
            )}
          </Card>

          <Card
            title="有差异的 Query 明细（点击进入查看详情和历史改判）"
            style={{ marginBottom: 16 }}
          >
            {result.query_diffs.length === 0 ? (
              <div style={{ color: '#999' }}>两个版本无 Query 级差异</div>
            ) : (
              <Table
                rowKey="query_id"
                columns={queryCols}
                dataSource={result.query_diffs}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 900 }}
                size="small"
              />
            )}
          </Card>

          {(result.only_a_queries?.length || 0) + (result.only_b_queries?.length || 0) > 0 && (
            <Row gutter={16}>
              <Col span={12}>
                <Card title={`仅在版本 A (${result.model_a}) 中的 Query (${result.only_in_a})`} size="small">
                  <Space wrap>
                    {(result.only_a_queries || []).map((q) => (
                      <Tag key={q} color="orange">{q}</Tag>
                    ))}
                    {result.only_in_a === 0 && <span style={{ color: '#999' }}>无</span>}
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card title={`仅在版本 B (${result.model_b}) 中的 Query (${result.only_in_b})`} size="small">
                  <Space wrap>
                    {(result.only_b_queries || []).map((q) => (
                      <Tag key={q} color="blue">{q}</Tag>
                    ))}
                    {result.only_in_b === 0 && <span style={{ color: '#999' }}>无</span>}
                  </Space>
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}
    </div>
  );
};

export default CompareRuns;
