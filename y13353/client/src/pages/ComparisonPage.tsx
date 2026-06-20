import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Select, Button, Space, Tag, Row, Col, Alert,
  Table, Empty, Typography, Divider, message
} from 'antd';
import {
  ArrowLeftOutlined, DiffOutlined, DownloadOutlined,
  BarChartOutlined, CheckOutlined, CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { tasksApi, comparisonApi, exportApi } from '../api';
import { EvalTask, TaskComparison } from '../types';
import StatusBadge from '../components/StatusBadge';

const { Option } = Select;
const { Title, Text } = Typography;

const ComparisonPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<EvalTask[]>([]);
  const [comparison, setComparison] = useState<TaskComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await tasksApi.getTasks({ limit: 100 });
      setTasks(res.data.tasks);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompare = async (values: { taskA: number; taskB: number }) => {
    if (!values.taskA || !values.taskB) {
      message.warning('请选择两个任务进行对比');
      return;
    }
    if (values.taskA === values.taskB) {
      message.warning('请选择不同的任务进行对比');
      return;
    }
    setLoading(true);
    try {
      const res = await comparisonApi.compare(values.taskA, values.taskB);
      setComparison(res.data);
    } catch (e) {
      message.error('对比失败');
    } finally {
      setLoading(false);
    }
  };

  const renderDiffIcon = (changePercent: number | null) => {
    if (changePercent === null) return null;
    if (changePercent > 0) return <span style={{ color: '#52c41a' }}><CheckOutlined /> +{changePercent.toFixed(2)}%</span>;
    if (changePercent < 0) return <span style={{ color: '#f5222d' }}><CloseOutlined /> {changePercent.toFixed(2)}%</span>;
    return <span style={{ color: '#8c8c8c' }}>—</span>;
  };

  const getBetterOrWorse = (field: string, changePercent: number | null) => {
    if (changePercent === null) return '';
    const higherIsBetter = [
      'Recall@1', 'Recall@10', 'Recall@100', 'Precision@1', 'QPS', '综合分数', '样本准确率'
    ];
    const lowerIsBetter = [
      '平均延迟(ms)', 'P99延迟(ms)', '内存使用(MB)', 'CPU使用率', '索引大小(GB)', '构建时间(s)'
    ];
    
    if (higherIsBetter.includes(field)) {
      return changePercent > 0 ? '更好' : changePercent < 0 ? '更差' : '';
    }
    if (lowerIsBetter.includes(field)) {
      return changePercent < 0 ? '更好' : changePercent > 0 ? '更差' : '';
    }
    return '';
  };

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回
          </Button>
          <h1 className="page-title">历史版本对比</h1>
        </Space>
        {comparison && (
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => exportApi.exportComparisonCsv(comparison.task_a.id, comparison.task_b.id)}
          >
            导出对比报告
          </Button>
        )}
      </div>

      <Card
        title={
          <Space>
            <DiffOutlined />
            选择两个任务进行对比
          </Space>
        }
        style={{ marginBottom: 20 }}
      >
        <Form
          form={form}
          layout="inline"
          onFinish={handleCompare}
          initialValues={{ taskA: 1, taskB: 2 }}
        >
          <Form.Item name="taskA" label="任务 A" rules={[{ required: true }]}>
            <Select style={{ width: 300 }} placeholder="选择基准任务">
              {tasks.map(t => (
                <Option key={t.id} value={t.id}>
                  {t.name} ({t.model_version})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <span style={{ color: '#8c8c8c', fontSize: 20 }}>VS</span>
          <Form.Item name="taskB" label="任务 B" rules={[{ required: true }]}>
            <Select style={{ width: 300 }} placeholder="选择对比任务">
              {tasks.map(t => (
                <Option key={t.id} value={t.id}>
                  {t.name} ({t.model_version})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<DiffOutlined />}>
              开始对比
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {comparison ? (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={12}>
              <Card>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag color="blue">基准 (A)</Tag>
                    <Title level={4} style={{ margin: 0 }}>{comparison.task_a.name}</Title>
                  </Space>
                  <Space wrap>
                    <Text type="secondary">模型:</Text> {comparison.task_a.model_version}
                    <Divider type="vertical" />
                    <Text type="secondary">索引:</Text> {comparison.task_a.index_type}
                    <Divider type="vertical" />
                    <StatusBadge status={comparison.task_a.status} />
                  </Space>
                  {comparison.task_a.result && (
                    <Row gutter={[16, 8]} style={{ marginTop: 12 }}>
                      <Col span={8}>
                        <div className="metric-card">
                          <div className="metric-value">{comparison.task_a.result.overall_score}</div>
                          <div className="metric-label">综合分数</div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div className="metric-card">
                          <div className="metric-value">{(comparison.task_a.result.recall_at_10 * 100).toFixed(1)}%</div>
                          <div className="metric-label">Recall@10</div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div className="metric-card">
                          <div className="metric-value">{comparison.task_a.result.avg_latency_ms}ms</div>
                          <div className="metric-label">平均延迟</div>
                        </div>
                      </Col>
                    </Row>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    创建: {dayjs(comparison.task_a.created_at).format('YYYY-MM-DD HH:mm')}
                  </Text>
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag color="purple">对比 (B)</Tag>
                    <Title level={4} style={{ margin: 0 }}>{comparison.task_b.name}</Title>
                  </Space>
                  <Space wrap>
                    <Text type="secondary">模型:</Text> {comparison.task_b.model_version}
                    <Divider type="vertical" />
                    <Text type="secondary">索引:</Text> {comparison.task_b.index_type}
                    <Divider type="vertical" />
                    <StatusBadge status={comparison.task_b.status} />
                  </Space>
                  {comparison.task_b.result && (
                    <Row gutter={[16, 8]} style={{ marginTop: 12 }}>
                      <Col span={8}>
                        <div className="metric-card">
                          <div className="metric-value">{comparison.task_b.result.overall_score}</div>
                          <div className="metric-label">综合分数</div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div className="metric-card">
                          <div className="metric-value">{(comparison.task_b.result.recall_at_10 * 100).toFixed(1)}%</div>
                          <div className="metric-label">Recall@10</div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div className="metric-card">
                          <div className="metric-value">{comparison.task_b.result.avg_latency_ms}ms</div>
                          <div className="metric-label">平均延迟</div>
                        </div>
                      </Col>
                    </Row>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    创建: {dayjs(comparison.task_b.created_at).format('YYYY-MM-DD HH:mm')}
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>

          {comparison.task_a.model_version !== comparison.task_b.model_version && (
            <Alert
              message="模型版本变更"
              description={`注意：两个任务使用了不同的模型版本 (${comparison.task_a.model_version} → ${comparison.task_b.model_version})，指标差异可能源于模型升级而非索引参数调整。旧版本的人工判断已保留。`}
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />
          )}

          {comparison.differences.length > 0 && (
            <Card title={<Space><BarChartOutlined /> 指标差异 ({comparison.differences.length} 项)</Space>}>
              <div>
                <div className="comparison-row header">
                  <div>指标</div>
                  <div>任务 A</div>
                  <div>任务 B</div>
                  <div>变化</div>
                </div>
                {comparison.differences.map((diff, idx) => {
                  const quality = getBetterOrWorse(diff.field, diff.change_percent);
                  return (
                    <div className="comparison-row" key={idx}>
                      <div style={{ fontWeight: 500 }}>{diff.field}</div>
                      <div className="comparison-value-a">
                        {typeof diff.value_a === 'number' ? diff.value_a.toFixed(4) : String(diff.value_a)}
                      </div>
                      <div className="comparison-value-b">
                        {typeof diff.value_b === 'number' ? diff.value_b.toFixed(4) : String(diff.value_b)}
                      </div>
                      <div>
                        <Space>
                          {renderDiffIcon(diff.change_percent)}
                          {quality && <Tag color={quality === '更好' ? 'green' : 'red'}>{quality}</Tag>}
                        </Space>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Row gutter={16} style={{ marginTop: 20 }}>
            <Col span={12}>
              <Card title={`任务 A 人工判断 (${comparison.task_a.manual_judgments.length})`} size="small">
                {comparison.task_a.manual_judgments.length === 0 ? (
                  <Empty description="无人工判断" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  comparison.task_a.manual_judgments.map(j => (
                    <div key={j.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        {j.is_temporary ? <Tag color="orange">临时</Tag> : <Tag color="green">已确认</Tag>}
                        <Text type="secondary">{j.judged_by} · {dayjs(j.created_at).format('MM-DD HH:mm')}</Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        <Text delete type="secondary">{j.original_value}</Text>
                        {' → '}
                        <Text strong>{j.modified_value}</Text>
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{j.reason}</div>
                    </div>
                  ))
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title={`任务 B 人工判断 (${comparison.task_b.manual_judgments.length})`} size="small">
                {comparison.task_b.manual_judgments.length === 0 ? (
                  <Empty description="无人工判断" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  comparison.task_b.manual_judgments.map(j => (
                    <div key={j.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        {j.is_temporary ? <Tag color="orange">临时</Tag> : <Tag color="green">已确认</Tag>}
                        <Text type="secondary">{j.judged_by} · {dayjs(j.created_at).format('MM-DD HH:mm')}</Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        <Text delete type="secondary">{j.original_value}</Text>
                        {' → '}
                        <Text strong>{j.modified_value}</Text>
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{j.reason}</div>
                    </div>
                  ))
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 20 }}>
            <Col span={12}>
              <Card title={`任务 A 特征迟到 (${comparison.task_a.feature_delays.length})`} size="small">
                {comparison.task_a.feature_delays.length === 0 ? (
                  <Empty description="无特征迟到" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  comparison.task_a.feature_delays.map(d => (
                    <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <StatusBadge status={d.status} type="delay" />
                        <Text strong>{d.feature_name}</Text>
                      </Space>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                        期望: {d.expected_date} {d.actual_date && `→ 实际: ${d.actual_date}`}
                      </div>
                      {d.suspected_reason && (
                        <div style={{ fontSize: 12, marginTop: 2 }}>原因: {d.suspected_reason}</div>
                      )}
                    </div>
                  ))
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title={`任务 B 特征迟到 (${comparison.task_b.feature_delays.length})`} size="small">
                {comparison.task_b.feature_delays.length === 0 ? (
                  <Empty description="无特征迟到" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  comparison.task_b.feature_delays.map(d => (
                    <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <StatusBadge status={d.status} type="delay" />
                        <Text strong>{d.feature_name}</Text>
                      </Space>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                        期望: {d.expected_date} {d.actual_date && `→ 实际: ${d.actual_date}`}
                      </div>
                      {d.suspected_reason && (
                        <div style={{ fontSize: 12, marginTop: 2 }}>原因: {d.suspected_reason}</div>
                      )}
                    </div>
                  ))
                )}
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <Empty
            description={
              <Space direction="vertical">
                <Text type="secondary">请选择两个任务开始对比</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  系统将对比召回率、延迟、资源消耗等各项指标，并保留旧版本的人工判断记录
                </Text>
              </Space>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}
    </div>
  );
};

export default ComparisonPage;
