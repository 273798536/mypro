import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Table, Tag, Button, Space, Row, Col, Statistic, Progress, Modal,
  App as AntdApp, Tabs, Alert, Tooltip, List, Divider, Empty
} from 'antd';
import {
  PlayCircleOutlined, EyeOutlined, WarningOutlined, BulbOutlined,
  DashboardOutlined, TeamOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../api/client';
import type {
  ErrorAnalysis, ErrorDistribution, CounterExample, ReviewRecord, ResultGrade
} from '../types';

const { TabPane } = Tabs;

const ErrorBar: React.FC<{ value: number; warn: number; critical: number }> = ({ value, warn, critical }) => {
  const pct = Math.min(100, (value / Math.max(critical * 2, 0.2)) * 100);
  let color = '#52c41a';
  if (value >= critical) color = '#f5222d';
  else if (value >= warn) color = '#faad14';
  return (
    <div className="error-bar-container">
      <div className="error-bar">
        <div className="error-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, minWidth: 60, textAlign: 'right' }}>
        {value.toFixed(4)}
      </span>
    </div>
  );
};

const StudentBadge: React.FC<{ grade: ResultGrade | null; excessive: boolean }> = ({ grade, excessive }) => {
  let cls: 'ok' | 'wait' | 'ask' = 'wait';
  let text = '暂缓使用';
  if (grade === '可用' && !excessive) {
    cls = 'ok';
    text = '直接使用';
  } else if (grade === '重新采集' || excessive) {
    cls = 'ask';
    text = '找老师复核';
  }
  return <span className={`student-badge ${cls}`}>{text}</span>;
};

const ErrorAnalysisPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { message, modal } = AntdApp.useApp();
  const [list, setList] = useState<ErrorAnalysis[]>([]);
  const [distribution, setDistribution] = useState<ErrorDistribution | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewMap, setReviewMap] = useState<Record<number, ReviewRecord>>({});
  const [onlyExcessive, setOnlyExcessive] = useState(false);
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: ErrorAnalysis | null }>({
    open: false,
    record: null
  });
  const [counterExamples, setCounterExamples] = useState<CounterExample[]>([]);
  const [ceLoading, setCeLoading] = useState(false);

  const load = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const [lRes, dRes, rRes] = await Promise.all([
        api.get(`/batches/${batchId}/error-analysis?limit=500`),
        api.get(`/batches/${batchId}/error-analysis/distribution`),
        api.get(`/batches/${batchId}/reviews?limit=500`)
      ]);
      setList(lRes.data || []);
      setDistribution(dRes.data);
      const rm: Record<number, ReviewRecord> = {};
      (rRes.data || []).forEach((r: ReviewRecord) => {
        rm[r.question_id] = r;
      });
      setReviewMap(rm);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!batchId) return;
    try {
      message.loading({ content: '正在执行 KKT 误差分析...', key: 'run', duration: 0 });
      await api.post(`/batches/${batchId}/error-analysis/run`);
      message.success({ content: '误差分析完成', key: 'run' });
      load();
    } catch (e) {
      message.error({ content: '分析失败', key: 'run' });
    }
  };

  const openDetail = async (r: ErrorAnalysis) => {
    setDetailModal({ open: true, record: r });
    setCeLoading(true);
    try {
      const res = await api.get(`/questions/${r.question_id}/counter-examples`);
      setCounterExamples(res.data || []);
    } catch (e) {
      setCounterExamples([]);
    } finally {
      setCeLoading(false);
    }
  };

  const generateCE = async (qid: number) => {
    try {
      message.loading({ content: '生成反例中...', key: 'ce', duration: 0 });
      await api.post(`/questions/${qid}/counter-examples/generate`);
      const res = await api.get(`/questions/${qid}/counter-examples`);
      setCounterExamples(res.data || []);
      message.success({ content: '已生成反例', key: 'ce' });
    } catch (e) {
      message.error({ content: '生成失败', key: 'ce' });
    }
  };

  useEffect(() => {
    load();
  }, [batchId]);

  const warn = distribution?.warn_threshold || 0.05;
  const critical = distribution?.critical_threshold || 0.15;

  const filtered = list.filter((r) => !onlyExcessive || r.is_excessive);

  const columns: ColumnsType<ErrorAnalysis> = [
    {
      title: '原始行号',
      dataIndex: ['question', 'original_row_no'],
      width: 90,
      render: (_, r) => r.question?.original_row_no ?? '-'
    },
    {
      title: '题目编号',
      dataIndex: ['question', 'question_code'],
      width: 120,
      render: (_, r) => r.question?.question_code ?? '-'
    },
    {
      title: '题目',
      dataIndex: ['question', 'question_title'],
      ellipsis: true,
      render: (_, r) => (
        <div>
          <div>{r.question?.question_title || '-'}</div>
          {r.question?.image_name && (
            <div className="source-info">图片：{r.question.image_name}</div>
          )}
          {r.question?.source_remark && (
            <Tooltip title={r.question.source_remark}>
              <div className="source-info">来源：{r.question.source_remark}</div>
            </Tooltip>
          )}
        </div>
      )
    },
    {
      title: '平稳性误差',
      dataIndex: 'stationarity_error',
      width: 180,
      render: (v: number) => <ErrorBar value={v} warn={warn} critical={critical} />
    },
    {
      title: '原始可行性误差',
      dataIndex: 'primal_feasibility_error',
      width: 180,
      render: (v: number) => <ErrorBar value={v} warn={warn} critical={critical} />
    },
    {
      title: '对偶可行性误差',
      dataIndex: 'dual_feasibility_error',
      width: 180,
      render: (v: number) => <ErrorBar value={v} warn={warn} critical={critical} />
    },
    {
      title: '互补松弛误差',
      dataIndex: 'complementarity_error',
      width: 180,
      render: (v: number) => <ErrorBar value={v} warn={warn} critical={critical} />
    },
    {
      title: '整体误差',
      dataIndex: 'overall_error',
      width: 180,
      render: (v: number, r) => (
        <div>
          <ErrorBar value={v} warn={warn} critical={critical} />
          {r.is_excessive && (
            <Tag color="red" icon={<WarningOutlined />} style={{ marginTop: 4 }}>
              误差过大
            </Tag>
          )}
        </div>
      )
    },
    {
      title: '学生视角',
      key: 'student_view',
      width: 130,
      render: (_, r) => {
        const review = reviewMap[r.question_id];
        return <StudentBadge grade={review?.result_grade || null} excessive={r.is_excessive} />;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, r) => (
        <Button icon={<EyeOutlined />} onClick={() => openDetail(r)}>
          查看详情 & 反例
        </Button>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <h2 className="page-title">
              <DashboardOutlined /> KKT 误差分析与反例
            </h2>
            <div className="page-subtitle">
              评估 KKT 四项条件（平稳性、原始可行性、对偶可行性、互补松弛）的近似误差。
              误差过大的题目会生成反例回溯源材料；学生视角一眼分清：直接使用 / 暂缓 / 找老师复核。
            </div>
          </Col>
          <Col>
            <Space>
              <Button
                type={onlyExcessive ? 'primary' : 'default'}
                icon={<WarningOutlined />}
                onClick={() => setOnlyExcessive(!onlyExcessive)}
              >
                {onlyExcessive ? '显示全部' : '仅看误差过大'}
              </Button>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={runAnalysis}>
                执行 / 重新分析
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {distribution && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic title="总分析题目数" value={distribution.total} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="误差过大"
                value={distribution.excessive_count}
                valueStyle={{ color: '#cf1322' }}
                suffix={`/ ${distribution.total}`}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="平均整体误差"
                value={distribution.average_error}
                precision={4}
                valueStyle={{
                  color:
                    distribution.average_error >= critical
                      ? '#cf1322'
                      : distribution.average_error >= warn
                        ? '#d46b08'
                        : '#389e0d'
                }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card title="误差区间分布">
              <div style={{ fontSize: 13 }}>
                {Object.entries(distribution.distribution).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>{k}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                警告阈值: {warn}，严重阈值: {critical}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Alert
        type="info"
        showIcon
        icon={<TeamOutlined />}
        style={{ marginBottom: 16 }}
        message="学生视角使用建议"
        description={
          <div>
            <Space size={16}>
              <span className="student-badge ok">直接使用</span>
              <span>分级为"可用"且 KKT 近似误差不过大，学生可直接使用</span>
            </Space>
            <Divider type="vertical" />
            <Space size={16}>
              <span className="student-badge wait">暂缓使用</span>
              <span>存在待确认问题，等排课老师复核后再发</span>
            </Space>
            <Divider type="vertical" />
            <Space size={16}>
              <span className="student-badge ask">找老师复核</span>
              <span>误差过大或分级为"重新采集"，学生必须联系排课老师</span>
            </Space>
          </div>
        }
      />

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1600 }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <EyeOutlined />
            误差详情 & 反例
            {detailModal.record?.is_excessive && <Tag color="red">误差过大</Tag>}
          </Space>
        }
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={[
          detailModal.record && (
            <Button
              key="gen"
              icon={<BulbOutlined />}
              type="primary"
              onClick={() => generateCE(detailModal.record!.question_id)}
            >
              重新生成反例
            </Button>
          ),
          <Button key="close" onClick={() => setDetailModal({ open: false, record: null })}>
            关闭
          </Button>
        ]}
        width={820}
        destroyOnClose
      >
        {detailModal.record && (
          <div>
            <Alert
              style={{ marginBottom: 16 }}
              type="info"
              showIcon
              message={
                <div>
                  <div>
                    <b>题目：</b>
                    {detailModal.record.question?.question_code} -{' '}
                    {detailModal.record.question?.question_title}
                  </div>
                  {detailModal.record.question?.image_name && (
                    <div className="source-info">
                      图片：{detailModal.record.question.image_name}
                    </div>
                  )}
                  {detailModal.record.question?.source_remark && (
                    <div className="source-info">
                      来源：{detailModal.record.question.source_remark}
                    </div>
                  )}
                </div>
              }
              description={detailModal.record.analysis_detail}
            />

            <Row gutter={[12, 12]}>
              {[
                { label: '平稳性误差', v: detailModal.record.stationarity_error },
                { label: '原始可行性', v: detailModal.record.primal_feasibility_error },
                { label: '对偶可行性', v: detailModal.record.dual_feasibility_error },
                { label: '互补松弛', v: detailModal.record.complementarity_error }
              ].map((item) => (
                <Col span={12} key={item.label}>
                  <Card size="small" title={item.label}>
                    <ErrorBar value={item.v} warn={warn} critical={critical} />
                  </Card>
                </Col>
              ))}
              <Col span={24}>
                <Card size="small" title="整体 KKT 违反程度">
                  <Progress
                    percent={Math.min(100, (detailModal.record.overall_error / Math.max(critical * 2, 0.3)) * 100)}
                    status={
                      detailModal.record.overall_error >= critical
                        ? 'exception'
                        : detailModal.record.overall_error >= warn
                          ? 'normal'
                          : 'success'
                    }
                    format={() => (detailModal.record?.overall_error ?? 0).toFixed(6)}
                  />
                </Card>
              </Col>
            </Row>

            <Divider />

            <Card
              title={
                <Space>
                  <BulbOutlined /> 反例（把结论拉回来源材料）
                </Space>
              }
              size="small"
              loading={ceLoading}
            >
              {counterExamples.length === 0 ? (
                <Empty description="暂无反例，点击右上角按钮生成" />
              ) : (
                <List
                  dataSource={counterExamples}
                  renderItem={(item) => (
                    <List.Item key={item.id}>
                      <List.Item.Meta
                        title={
                          <div style={{ color: '#2f54eb', fontWeight: 500 }}>
                            {item.example_content}
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ color: 'rgba(0,0,0,0.65)', marginTop: 4 }}>
                              <b>来源引用：</b>
                              {item.source_reference || '未记录'}
                            </div>
                            {item.explanation && (
                              <div style={{ color: 'rgba(0,0,0,0.55)', marginTop: 4 }}>
                                <b>说明：</b>
                                {item.explanation}
                              </div>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ErrorAnalysisPage;
