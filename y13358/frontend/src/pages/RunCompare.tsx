import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Button, Space, Typography, Select, Row, Col, Statistic, Alert, Descriptions, List, Divider, Empty, Tooltip
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SwapOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  MinusOutlined,
  CheckOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { runApi, compareApi, Run, RunComparison, FeatureSnapshot, Judgment } from '../api';

const { Title, Text } = Typography;

function decisionColor(d: string) {
  if (d === '通过') return 'green';
  if (d === '不通过') return 'red';
  return 'default';
}

function diffTag(added: boolean) {
  return added
    ? <Tag color="green" icon={<PlusOutlined />}>新增</Tag>
    : <Tag color="red" icon={<MinusOutlined />}>移除</Tag>;
}

export default function RunCompare() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [runs, setRuns] = useState<Run[]>([]);
  const [base, setBase] = useState<string>(searchParams.get('base') || '');
  const [compare, setCompare] = useState<string>(searchParams.get('compare') || '');
  const [result, setResult] = useState<RunComparison | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runApi.list().then(setRuns);
  }, []);

  useEffect(() => {
    if (base && compare) {
      setSearchParams({ base, compare });
      doCompare();
    }
  }, [base, compare]);

  const doCompare = async () => {
    if (!base || !compare) return;
    setLoading(true);
    try {
      const r = await compareApi.runs(base, compare);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    const b = base;
    setBase(compare);
    setCompare(b);
  };

  const runOptions = runs.map(r => ({ label: `${r.run_id} - ${r.name}`, value: r.run_id }));

  const sampleColumns = (side: 'base' | 'compare') => ([
    {
      title: '样本ID',
      dataIndex: 'sample_id',
      width: 130,
      render: (sid: string) => <Text strong>{sid}</Text>
    },
    {
      title: '模型输出',
      width: 140,
      render: (_: any, row: any) => {
        const j: Judgment = side === 'base' ? row.base : row.compare;
        if (!j) return <Text type="secondary">无</Text>;
        return (
          <Space direction="vertical" size={0}>
            <Tag color={decisionColor(j.model_label)}>{j.model_label}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>{(j.confidence * 100).toFixed(1)}%</Text>
          </Space>
        );
      }
    },
    {
      title: '最终判定',
      width: 120,
      render: (_: any, row: any) => {
        const j: Judgment = side === 'base' ? row.base : row.compare;
        if (!j) return <Text type="secondary">无</Text>;
        return <Tag color={decisionColor(j.final_decision)} style={{ fontSize: 14, padding: '4px 10px' }}>{j.final_decision}</Tag>;
      }
    },
    {
      title: '判定理由',
      render: (_: any, row: any) => {
        const j: Judgment = side === 'base' ? row.base : row.compare;
        if (!j) return '-';
        return j.decision_reason || <Text type="warning">未填写</Text>;
      }
    },
    {
      title: '判定人',
      width: 120,
      render: (_: any, row: any) => {
        const j: Judgment = side === 'base' ? row.base : row.compare;
        if (!j) return '-';
        return (
          <Space direction="vertical" size={0}>
            <Tag color="blue">{j.judged_by}</Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(j.judged_at).format('MM-DD HH:mm')}</Text>
          </Space>
        );
      }
    }
  ]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
            <Title level={3} style={{ margin: 0 }}>运行对比分析</Title>
          </Space>
          <Alert
            type="info"
            showIcon
            message="换一组参数再跑时，接手同事要能看出哪一步让结果变化"
            description="选择两次运行进行对比，查看样本判定变化和特征快照差异，精确定位引入的修改导致的结果变化。"
          />
          <Row gutter={16} align="middle">
            <Col span={9}>
              <Text strong>基线版本</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="选择基线运行"
                value={base || undefined}
                options={runOptions}
                onChange={setBase}
                showSearch
                optionFilterProp="label"
              />
            </Col>
            <Col span={2} style={{ textAlign: 'center' }}>
              <Button shape="circle" icon={<SwapOutlined />} onClick={swap} />
              <div style={{ marginTop: 4 }}><ArrowRightOutlined style={{ color: '#1890ff' }} /></div>
            </Col>
            <Col span={9}>
              <Text strong>对比版本</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="选择对比运行"
                value={compare || undefined}
                options={runOptions}
                onChange={setCompare}
                showSearch
                optionFilterProp="label"
              />
            </Col>
            <Col span={4}>
              <Button type="primary" block icon={<EyeOutlined />} onClick={doCompare} disabled={!base || !compare}>
                对比
              </Button>
            </Col>
          </Row>
        </Space>
      </Card>

      {!result && !loading && (
        <Card>
          <Empty description="请选择两个运行进行对比" />
        </Card>
      )}

      {result && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={4}>
              <Card><Statistic title="样本总数" value={result.summary.total} /></Card>
            </Col>
            <Col span={4}>
              <Card><Statistic title="判定变化" value={result.summary.changed} valueStyle={{ color: '#faad14' }} prefix={<ArrowRightOutlined />} /></Card>
            </Col>
            <Col span={4}>
              <Card><Statistic title="新增样本" value={result.summary.added} valueStyle={{ color: '#52c41a' }} prefix={<PlusOutlined />} /></Card>
            </Col>
            <Col span={4}>
              <Card><Statistic title="移除样本" value={result.summary.removed} valueStyle={{ color: '#ff4d4f' }} prefix={<MinusOutlined />} /></Card>
            </Col>
            <Col span={4}>
              <Card><Statistic title="判定不变" value={result.summary.unchanged} valueStyle={{ color: '#1677ff' }} prefix={<CheckOutlined />} /></Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="特征快照变化"
                  value={result.snapshot_diff.added.length + result.snapshot_diff.removed.length}
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title={<Space><ThunderboltOutlined /><Text strong>特征快照差异</Text></Space>}>
            <Row gutter={16}>
              <Col span={12}>
                <Divider orientation="left">新增特征快照</Divider>
                {result.snapshot_diff.added.length === 0 ? (
                  <Empty description="无新增" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <List
                    dataSource={result.snapshot_diff.added}
                    renderItem={(s: FeatureSnapshot) => (
                      <List.Item>
                        <Space>
                          {diffTag(true)}
                          <Tag color={s.is_temporary ? 'orange' : 'blue'}>{s.snapshot_id}</Tag>
                          <a onClick={() => navigate(`/snapshot/${s.snapshot_id}`)}><Text strong>{s.name}</Text></a>
                          <Text type="secondary">v{s.version}</Text>
                          {s.metric_mismatch_reason && <Tag color="orange" icon={<Tooltip title={s.metric_mismatch_reason}><span>口径差异</span></Tooltip>} />}
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Col>
              <Col span={12}>
                <Divider orientation="left">移除特征快照</Divider>
                {result.snapshot_diff.removed.length === 0 ? (
                  <Empty description="无移除" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <List
                    dataSource={result.snapshot_diff.removed}
                    renderItem={(s: FeatureSnapshot) => (
                      <List.Item>
                        <Space>
                          {diffTag(false)}
                          <Tag color={s.is_temporary ? 'orange' : 'blue'}>{s.snapshot_id}</Tag>
                          <a onClick={() => navigate(`/snapshot/${s.snapshot_id}`)}><Text strong>{s.name}</Text></a>
                          <Text type="secondary">v{s.version}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Col>
            </Row>
            <Divider />
            <Text type="secondary">共同特征快照：</Text>
            <Space wrap style={{ marginTop: 8 }}>
              {result.snapshot_diff.common.map((s: FeatureSnapshot) => (
                <Tag key={s.snapshot_id} color="default">{s.snapshot_id} - {s.name}</Tag>
              ))}
            </Space>
          </Card>

          <Card title={<Space><ArrowRightOutlined style={{ color: '#faad14' }} /><Text strong>判定发生变化的样本（{result.changed_samples.length}）</Text></Space>}>
            {result.changed_samples.length === 0 ? (
              <Empty description="无判定变化" />
            ) : (
              <Row gutter={16}>
                <Col span={12}>
                  <Divider orientation="left">基线版本 {base}</Divider>
                  <Table
                    size="small"
                    rowKey="sample_id"
                    dataSource={result.changed_samples}
                    columns={sampleColumns('base')}
                    pagination={false}
                  />
                </Col>
                <Col span={12}>
                  <Divider orientation="left">对比版本 {compare}</Divider>
                  <Table
                    size="small"
                    rowKey="sample_id"
                    dataSource={result.changed_samples}
                    columns={sampleColumns('compare')}
                    pagination={false}
                  />
                </Col>
              </Row>
            )}
          </Card>

          {result.added_samples.length > 0 && (
            <Card title={<Space><PlusOutlined style={{ color: '#52c41a' }} /><Text strong>对比版本新增样本（{result.added_samples.length}）</Text></Space>}>
              <Table
                size="small"
                rowKey="sample_id"
                dataSource={result.added_samples}
                columns={sampleColumns('compare')}
                pagination={{ pageSize: 5 }}
              />
            </Card>
          )}

          {result.removed_samples.length > 0 && (
            <Card title={<Space><MinusOutlined style={{ color: '#ff4d4f' }} /><Text strong>对比版本移除样本（{result.removed_samples.length}）</Text></Space>}>
              <Table
                size="small"
                rowKey="sample_id"
                dataSource={result.removed_samples}
                columns={sampleColumns('base')}
                pagination={{ pageSize: 5 }}
              />
            </Card>
          )}
        </Space>
      )}
    </Space>
  );
}
