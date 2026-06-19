import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Layout, Button, Table, Tag, Space, Row, Col, Card, Select, Statistic,
  message, Spin, Typography, Divider, Empty, Tooltip
} from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, EyeOutlined,
  WarningOutlined, CheckCircleOutlined, CloudServerOutlined,
  BarChartOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Run, ReportRecord, AnomalyType, MigrationStatus,
  ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS,
  MIGRATION_STATUS_LABELS, MIGRATION_STATUS_COLORS,
  ANOMALY_STATUS_LABELS, ANOMALY_STATUS_COLORS, OverviewStats
} from '../types';
import { runApi, recordApi, statsApi, exportApi } from '../api';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function EvaluationPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterAnomalyType, setFilterAnomalyType] = useState<AnomalyType | 'all' | 'has' | 'none'>('all');
  const [filterMigrationStatus, setFilterMigrationStatus] = useState<MigrationStatus | 'all'>('all');

  const loadAll = async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const [r, recs, s] = await Promise.all([
        runApi.get(Number(runId)),
        recordApi.list({ run_id: Number(runId) }),
        statsApi.overview(Number(runId))
      ]);
      setRun(r);
      setRecords(recs);
      setStats(s);
    } catch (e: any) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [runId]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterAnomalyType === 'has' && r.anomalies.length === 0) return false;
      if (filterAnomalyType === 'none' && r.anomalies.length > 0) return false;
      if (filterAnomalyType !== 'all' && filterAnomalyType !== 'has' && filterAnomalyType !== 'none') {
        if (!r.anomalies.some((a) => a.anomaly_type === filterAnomalyType)) return false;
      }
      if (filterMigrationStatus !== 'all' && r.migration_status !== filterMigrationStatus) return false;
      return true;
    });
  }, [records, filterAnomalyType, filterMigrationStatus]);

  const anomalyTypeData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byAnomalyType).map(([key, value]) => ({
      name: ANOMALY_TYPE_LABELS[key as AnomalyType] || key,
      value,
      color: ANOMALY_TYPE_COLORS[key as AnomalyType] || '#8c8c8c'
    }));
  }, [stats]);

  const migrationStatusData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byMigrationStatus).map(([key, value]) => ({
      name: MIGRATION_STATUS_LABELS[key as MigrationStatus] || key,
      value,
      color: MIGRATION_STATUS_COLORS[key as MigrationStatus] || '#bfbfbf'
    }));
  }, [stats]);

  const handleExport = () => {
    const a = document.createElement('a');
    a.href = exportApi.downloadUrl(Number(runId));
    a.download = '';
    a.click();
  };

  const columns = [
    {
      title: '报表名称',
      dataIndex: 'report_name',
      fixed: 'left' as const,
      width: 180,
      render: (text: string, record: ReportRecord) => (
        <Link to={`/records/${record.id}`} style={{ fontWeight: 500 }}>{text}</Link>
      )
    },
    { title: '表名', dataIndex: 'table_name', width: 160 },
    {
      title: '压缩率',
      dataIndex: 'compression_ratio',
      width: 90,
      render: (v: number) => {
        const pct = (v * 100).toFixed(1) + '%';
        return v < 0.3 ? <Text type="warning">{pct}</Text> : <Text>{pct}</Text>;
      }
    },
    {
      title: '备份',
      dataIndex: 'backup_exists',
      width: 70,
      render: (v: boolean) => v
        ? <Tag color="green" icon={<CheckCircleOutlined />}>已备份</Tag>
        : <Tag color="red" icon={<WarningOutlined />}>缺失</Tag>
    },
    {
      title: '迁移状态',
      dataIndex: 'migration_status',
      width: 100,
      render: (v: MigrationStatus) => (
        <Tag color={MIGRATION_STATUS_COLORS[v]}>{MIGRATION_STATUS_LABELS[v]}</Tag>
      )
    },
    {
      title: '异常明细（按类型区分，点击标题查看详情）',
      dataIndex: 'anomalies',
      render: (_: any, record: ReportRecord) => {
        if (record.anomalies.length === 0) {
          return <Tag color="green">无异常</Tag>;
        }
        const grouped = new Map<AnomalyType, number>();
        record.anomalies.forEach((a) => {
          if (a.status === 'resolved') return;
          grouped.set(a.anomaly_type, (grouped.get(a.anomaly_type) || 0) + 1);
        });
        if (grouped.size === 0) {
          return <Tag color="green">已全部处理</Tag>;
        }
        return (
          <div>
            {Array.from(grouped.entries()).map(([type, count]) => (
              <Tooltip
                key={type}
                title={
                  <div>
                    <div><b>{ANOMALY_TYPE_LABELS[type]}</b> × {count}</div>
                    {record.anomalies
                      .filter((a) => a.anomaly_type === type && a.status !== 'resolved')
                      .map((a) => (
                        <div key={a.id} style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
                          • {a.description}
                          <div style={{ color: '#faad14' }}>下一步：{a.next_action}</div>
                        </div>
                      ))}
                  </div>
                }
              >
                <span
                  className="anomaly-chip"
                  style={{
                    background: ANOMALY_TYPE_COLORS[type] + '18',
                    color: ANOMALY_TYPE_COLORS[type],
                    border: `1px solid ${ANOMALY_TYPE_COLORS[type]}40`
                  }}
                >
                  {ANOMALY_TYPE_LABELS[type]} × {count}
                </span>
              </Tooltip>
            ))}
          </div>
        );
      }
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      width: 100,
      render: (v: string) => v || <Text type="secondary">未分配</Text>
    },
    {
      title: '操作',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, record: ReportRecord) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/records/${record.id}`)}>
          详情
        </Button>
      )
    }
  ];

  if (loading && !run) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/runs')}>返回</Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChartOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <Title level={4} style={{ margin: 0 }}>{run?.run_name}</Title>
            </div>
          </Space>
          <Space>
            <Button icon={<DownloadOutlined />} type="primary" onClick={handleExport}>
              下载评估报告
            </Button>
          </Space>
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div className="card-block" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={5}>
                <Card size="small">
                  <Statistic title="记录总数" value={stats?.total || 0} prefix={<CloudServerOutlined />} />
                </Card>
              </Col>
              <Col span={5}>
                <Card size="small">
                  <Statistic
                    title="异常记录"
                    value={stats?.withAnomaly || 0}
                    valueStyle={{ color: stats?.withAnomaly ? '#ff4d4f' : '#52c41a' }}
                    prefix={<WarningOutlined />}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card size="small">
                  <Statistic
                    title="严重异常"
                    value={stats?.errorCount || 0}
                    valueStyle={{ color: '#ff4d4f' }}
                    prefix={<WarningOutlined />}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card size="small">
                  <Statistic
                    title="警告异常"
                    value={stats?.warningCount || 0}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card size="small">
                  <Statistic
                    title="已完成迁移"
                    value={stats?.byMigrationStatus?.completed || 0}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<SafetyCertificateOutlined />}
                  />
                </Card>
              </Col>
            </Row>
            <div className="chart-explanation">
              <b>统计说明：</b>异常记录指至少存在 1 条未解决异常的报表。
              严重异常包括<b style={{ color: '#ff4d4f' }}>备份缺口</b>等阻塞性问题；
              警告异常包括压缩率异常、权限缺失等需关注但不阻塞的问题。
              迁移状态会随着权限补录、异常解决自动更新，也可手动调整。
            </div>
          </div>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <div className="card-block">
                <h3 className="section-title">异常类型分布</h3>
                {anomalyTypeData.length === 0 ? (
                  <Empty description="暂无异常" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={anomalyTypeData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {anomalyTypeData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <ReTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="chart-explanation">
                      <b>图表说明：</b>不同颜色对应不同异常类型，不要只看红色数字。
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: 20 }}>
                        <li><b style={{ color: '#ff4d4f' }}>备份缺口</b>：需补材料（备份凭证）或改口径（确认无需备份）</li>
                        <li><b style={{ color: '#fa8c16' }}>权限缺失</b>：补录负责人及权限清单</li>
                        <li><b style={{ color: '#faad14' }}>压缩率异常</b>：改口径（检查字段编码/压缩算法）</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </Col>
            <Col span={12}>
              <div className="card-block">
                <h3 className="section-title">迁移状态分布</h3>
                {migrationStatusData.length === 0 ? (
                  <Empty description="暂无数据" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={migrationStatusData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <ReTooltip />
                        <Bar dataKey="value" name="报表数">
                          {migrationStatusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="chart-explanation">
                      <b>图表说明：</b>
                      <span style={{ color: '#bfbfbf' }}>■ 未开始</span>：初始状态 /
                      <span style={{ color: '#1677ff' }}> ■ 进行中</span>：权限清单补录后自动进入 /
                      <span style={{ color: '#52c41a' }}> ■ 已完成</span>：手动标记 /
                      <span style={{ color: '#ff4d4f' }}> ■ 已阻塞</span>：存在未解决严重异常
                    </div>
                  </>
                )}
              </div>
            </Col>
          </Row>

          <div className="card-block">
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <h3 className="section-title" style={{ margin: 0 }}>异常记录列表</h3>
              </Col>
              <Col>
                <Space wrap>
                  <Select
                    value={filterAnomalyType}
                    onChange={setFilterAnomalyType}
                    style={{ width: 180 }}
                    options={[
                      { value: 'all', label: '全部异常类型' },
                      { value: 'has', label: '仅看有异常' },
                      { value: 'none', label: '仅看无异常' },
                      { value: 'backup_gap', label: '备份缺口' },
                      { value: 'permission_missing', label: '权限缺失' },
                      { value: 'compression_abnormal', label: '压缩率异常' }
                    ]}
                  />
                  <Select
                    value={filterMigrationStatus}
                    onChange={setFilterMigrationStatus as any}
                    style={{ width: 160 }}
                    options={[
                      { value: 'all', label: '全部迁移状态' },
                      { value: 'not_started', label: '未开始' },
                      { value: 'in_progress', label: '进行中' },
                      { value: 'completed', label: '已完成' },
                      { value: 'blocked', label: '已阻塞' }
                    ]}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    共 {filteredRecords.length} / {records.length} 条
                  </Text>
                </Space>
              </Col>
            </Row>
            <p className="hint-text" style={{ marginBottom: 12 }}>
              异常按类型分色展示，鼠标悬停可查看异常描述和下一步操作建议。
              点击报表名称或「详情」可查看完整来源信息、处理意见和权限补录。
            </p>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={filteredRecords}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 1100 }}
              size="middle"
            />
          </div>
        </div>
      </Content>
    </Layout>
  );
}
