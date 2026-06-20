import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Row, Col, Button, Space, Tabs, Table, Tag,
  Modal, Form, Input, Select, message, Divider, List, Tooltip,
  Popover, Radio, Typography
} from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, HistoryOutlined,
  DiffOutlined, EditOutlined, CheckOutlined, AlertOutlined,
  LinkOutlined, FileSearchOutlined, CommentOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  tasksApi, evidencesApi, judgmentsApi, delaysApi, paramChangesApi,
  materialLinksApi, exportApi
} from '../api';
import { TaskDetail, SampleEvidence, FeatureDelay } from '../types';
import StatusBadge from '../components/StatusBadge';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Text } = Typography;

const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [evidences, setEvidences] = useState<SampleEvidence[]>([]);
  const [evidenceFilter, setEvidenceFilter] = useState<number | undefined>();
  const [judgmentModal, setJudgmentModal] = useState<{ visible: boolean; evidence: SampleEvidence | null }>({
    visible: false, evidence: null
  });
  const [delayModal, setDelayModal] = useState(false);
  const [paramModal, setParamModal] = useState(false);
  const [materialModal, setMaterialModal] = useState(false);
  const [commentModal, setCommentModal] = useState(false);
  const [form] = Form.useForm();

  const taskId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    if (taskId) {
      loadTaskDetail();
      loadEvidences();
    }
  }, [taskId]);

  const loadTaskDetail = async () => {
    setLoading(true);
    try {
      const res = await tasksApi.getTaskDetail(taskId);
      setTask(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadEvidences = async () => {
    try {
      const res = await evidencesApi.getByTask(taskId, {
        is_correct: evidenceFilter,
        limit: 100
      });
      setEvidences(res.data.evidences);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (taskId) loadEvidences();
  }, [evidenceFilter, taskId]);

  const handleJudgmentSubmit = async (values: any) => {
    if (!judgmentModal.evidence) return;
    try {
      await evidencesApi.updateJudgment(judgmentModal.evidence.id, {
        ...values,
        judged_by: localStorage.getItem('currentUser') || '未知用户'
      });
      message.success('人工判断已保存');
      setJudgmentModal({ visible: false, evidence: null });
      loadTaskDetail();
      loadEvidences();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleDelaySubmit = async (values: any) => {
    try {
      await delaysApi.create({
        task_id: taskId,
        ...values
      });
      message.success('特征迟到已记录，任务状态已更新为警告');
      setDelayModal(false);
      loadTaskDetail();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleConfirmDelay = async (delay: FeatureDelay) => {
    try {
      await delaysApi.confirm(delay.id, {
        confirmed_by: localStorage.getItem('currentUser') || '未知用户',
        suspected_reason: delay.suspected_reason || undefined,
        impact_scope: delay.impact_scope || undefined,
        affected_samples: delay.affected_samples || undefined
      });
      message.success('已确认特征迟到');
      loadTaskDetail();
    } catch (e) {
      message.error('操作失败');
    }
  };

  const handleResolveDelay = async (delayId: number) => {
    try {
      await delaysApi.resolve(delayId, {
        actual_date: dayjs().format('YYYY-MM-DD'),
        confirmed_by: localStorage.getItem('currentUser') || '未知用户'
      });
      message.success('已解决特征迟到');
      loadTaskDetail();
    } catch (e) {
      message.error('操作失败');
    }
  };

  const handleParamSubmit = async (values: any) => {
    try {
      await paramChangesApi.create({
        task_id: taskId,
        changed_by: localStorage.getItem('currentUser') || '未知用户',
        ...values
      });
      message.success('参数变更已记录');
      setParamModal(false);
      form.resetFields();
      loadTaskDetail();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleMaterialSubmit = async (values: any) => {
    try {
      await materialLinksApi.create({
        task_id: taskId,
        confidence: 1.0,
        ...values
      });
      message.success('材料关联已记录');
      setMaterialModal(false);
      form.resetFields();
      loadTaskDetail();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleCommentSubmit = async (values: any) => {
    try {
      await tasksApi.addComment(taskId, {
        comment_by: localStorage.getItem('currentUser') || '未知用户',
        ...values
      });
      message.success('评论已添加');
      setCommentModal(false);
      form.resetFields();
      loadTaskDetail();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleConfirmJudgment = async (judgmentId: number) => {
    try {
      await judgmentsApi.confirm(judgmentId, localStorage.getItem('currentUser') || '未知用户');
      message.success('已确认判断');
      loadTaskDetail();
    } catch (e) {
      message.error('操作失败');
    }
  };

  const handleVerifyMaterial = async (linkId: number) => {
    try {
      await materialLinksApi.verify(linkId, localStorage.getItem('currentUser') || '未知用户');
      message.success('已验证关联');
      loadTaskDetail();
    } catch (e) {
      message.error('操作失败');
    }
  };

  const accuracy = task?.evidence_summary.total
    ? ((task.evidence_summary.correct / task.evidence_summary.total) * 100).toFixed(1)
    : '0';

  if (!task) return <div style={{ padding: 24 }}>加载中...</div>;

  const indexParams = JSON.parse(task.index_params);

  const evidenceColumns = [
    {
      title: 'ID',
      dataIndex: 'query_id',
      key: 'query_id',
      width: 120
    },
    {
      title: '查询文本',
      dataIndex: 'query_text',
      key: 'query_text'
    },
    {
      title: '期望结果',
      dataIndex: 'expected_result',
      key: 'expected_result',
      render: (t: string) => <code style={{ background: '#f5f5f5', padding: '2px 6px' }}>{t}</code>
    },
    {
      title: '实际结果',
      dataIndex: 'actual_result',
      key: 'actual_result',
      render: (t: string) => <code style={{ background: '#f5f5f5', padding: '2px 6px' }}>{t}</code>
    },
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80
    },
    {
      title: '置信度',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (s: number) => (s * 100).toFixed(1) + '%'
    },
    {
      title: '正确',
      dataIndex: 'is_correct',
      key: 'is_correct',
      width: 80,
      render: (v: number) => v ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: SampleEvidence) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => setJudgmentModal({ visible: true, evidence: record })}
        >
          人工判断
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回
          </Button>
          <h1 className="page-title">{task.name}</h1>
          <StatusBadge status={task.status} />
        </Space>
        <Space>
          <Button icon={<DiffOutlined />} onClick={() => navigate('/comparison')}>
            与其他任务对比
          </Button>
          <Popover
            content={
              <Space direction="vertical">
                <Button block onClick={() => exportApi.exportTaskCsv(taskId)}>完整报告 (CSV)</Button>
                <Button block onClick={() => exportApi.exportTaskJson(taskId)}>完整报告 (JSON)</Button>
                <Button block onClick={() => exportApi.exportEvidencesCsv(taskId)}>样本证据 (CSV)</Button>
              </Space>
            }
            trigger="click"
          >
            <Button type="primary" icon={<DownloadOutlined />}>
              导出
            </Button>
          </Popover>
        </Space>
      </div>

      {task.feature_delays.filter(d => d.status !== 'resolved').length > 0 && (
        <Card style={{ marginBottom: 16, border: '1px solid #ffd591', background: '#fff7e6' }}>
          <Space>
            <AlertOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
            <span style={{ fontWeight: 500 }}>
              该任务有 {task.feature_delays.filter(d => d.status !== 'resolved').length} 个特征迟到待处理，评测结果已暂停计算
            </span>
          </Space>
        </Card>
      )}

      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={3} bordered size="small">
          <Descriptions.Item label="模型版本">{task.model_version}</Descriptions.Item>
          <Descriptions.Item label="索引类型">{task.index_type}</Descriptions.Item>
          <Descriptions.Item label="创建人">{task.created_by}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{dayjs(task.updated_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="状态"><StatusBadge status={task.status} /></Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="索引参数" extra={<Button type="link" icon={<EditOutlined />} onClick={() => setParamModal(true)}>记录参数变更</Button>}>
            <Descriptions column={2} size="small">
              {Object.entries(indexParams).map(([k, v]) => (
                <Descriptions.Item key={k} label={k}>{String(v)}</Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="评测结果概览">
            {task.result ? (
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <div className="metric-card">
                    <div className="metric-value">{task.result.overall_score}</div>
                    <div className="metric-label">综合分数</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="metric-card">
                    <div className="metric-value">{(task.result.recall_at_10 * 100).toFixed(1)}%</div>
                    <div className="metric-label">Recall@10</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="metric-card">
                    <div className="metric-value">{accuracy}%</div>
                    <div className="metric-label">样本准确率</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="metric-card">
                    <div className="metric-value">{task.result.avg_latency_ms}ms</div>
                    <div className="metric-label">平均延迟</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="metric-card">
                    <div className="metric-value">{task.result.qps.toLocaleString()}</div>
                    <div className="metric-label">QPS</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="metric-card">
                    <div className="metric-value">{task.result.memory_usage_mb}MB</div>
                    <div className="metric-label">内存使用</div>
                  </div>
                </Col>
              </Row>
            ) : (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 40 }}>
                {task.status === 'warning' ? '特征迟到未解决，结果暂停计算' : '暂无评测结果'}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="evidences">
        <TabPane tab={
          <span><FileSearchOutlined /> 样本证据 ({task.evidence_summary.total})</span>
        } key="evidences">
          <Card
            extra={
              <Space>
                <Radio.Group value={evidenceFilter} onChange={e => setEvidenceFilter(e.target.value)}>
                  <Radio.Button value={undefined}>全部</Radio.Button>
                  <Radio.Button value={1}>正确</Radio.Button>
                  <Radio.Button value={0}>错误</Radio.Button>
                </Radio.Group>
                <Tag color="green">正确: {task.evidence_summary.correct}</Tag>
                <Tag color="red">错误: {task.evidence_summary.incorrect}</Tag>
              </Space>
            }
          >
            <Table
              columns={evidenceColumns}
              dataSource={evidences}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              rowClassName={(record) => record.is_correct ? 'correct' : 'incorrect'}
              onRow={(record) => ({
                style: { borderLeft: record.is_correct ? '4px solid #52c41a' : '4px solid #f5222d' }
              })}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span><HistoryOutlined /> 参数变更 ({task.param_changes.length})</span>} key="params">
          <Card extra={<Button type="primary" icon={<EditOutlined />} onClick={() => setParamModal(true)}>记录参数变更</Button>}>
            {task.param_changes.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 40 }}>暂无参数变更记录</div>
            ) : (
              <div>
                <div className="param-change" style={{ fontWeight: 600, background: '#fafafa' }}>
                  <div>参数名</div>
                  <div>原值</div>
                  <div>新值</div>
                  <div>变更原因 / 影响</div>
                  <div>操作人 / 时间</div>
                </div>
                {task.param_changes.map(pc => (
                  <div className="param-change" key={pc.id}>
                    <div style={{ fontWeight: 500 }}>{pc.param_name}</div>
                    <div className="param-old">{pc.old_value || '-'}</div>
                    <div className="param-new">{pc.new_value}</div>
                    <div>
                      <div>{pc.change_reason || '-'}</div>
                      {pc.result_impact && <div style={{ color: '#52c41a', fontSize: 12 }}>{pc.result_impact}</div>}
                    </div>
                    <div>
                      <div>{pc.changed_by}</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>{dayjs(pc.created_at).format('MM-DD HH:mm')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane tab={<span><EditOutlined /> 人工判断 ({task.manual_judgments.length})</span>} key="judgments">
          <Card>
            {task.manual_judgments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 40 }}>暂无人工判断记录</div>
            ) : (
              <div className="judgment-timeline">
                {task.manual_judgments.map(j => (
                  <div key={j.id} className={`judgment-item ${j.is_temporary ? 'temporary' : ''}`}>
                    <Card size="small" style={{ marginBottom: 8 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          {j.is_temporary && <Tag color="orange">临时判断</Tag>}
                          {!j.is_temporary && <Tag color="green">已确认</Tag>}
                          <Tag color="blue">{j.judgment_type}</Tag>
                          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                            {j.judged_by} · {dayjs(j.created_at).format('YYYY-MM-DD HH:mm')}
                          </span>
                        </Space>
                        <div>
                          <span style={{ color: '#8c8c8c' }}>原值:</span> <span className="param-old">{j.original_value || '-'}</span>
                          <span style={{ margin: '0 8px' }}>→</span>
                          <span style={{ color: '#8c8c8c' }}>新值:</span> <span className="param-new">{j.modified_value}</span>
                        </div>
                        <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                          原因: {j.reason}
                        </div>
                        {j.is_temporary && (
                          <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleConfirmJudgment(j.id)}>
                            确认此判断
                          </Button>
                        )}
                      </Space>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane tab={<span><LinkOutlined /> 材料关联 ({task.material_links.length})</span>} key="materials">
          <Card extra={<Button type="primary" icon={<LinkOutlined />} onClick={() => setMaterialModal(true)}>添加名称关联</Button>}>
            {task.material_links.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 40 }}>
                暂无材料关联记录
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  用于解决名称不一致的材料与结论之间的关联问题
                </div>
              </div>
            ) : (
              task.material_links.map(ml => (
                <div key={ml.id} className="material-link">
                  <span className="material-name">{ml.source_name}</span>
                  <span className="material-arrow">→</span>
                  <span className="material-name">{ml.target_name}</span>
                  <Tag color="purple">{ml.link_type}</Tag>
                  <Tag color={ml.confidence >= 0.9 ? 'green' : 'orange'}>
                    置信度 {(ml.confidence * 100).toFixed(0)}%
                  </Tag>
                  {ml.verified_by ? (
                    <Tag color="green">已验证 · {ml.verified_by}</Tag>
                  ) : (
                    <Button type="link" size="small" onClick={() => handleVerifyMaterial(ml.id)}>
                      验证关联
                    </Button>
                  )}
                  <span style={{ marginLeft: 'auto', color: '#8c8c8c', fontSize: 12 }}>
                    {dayjs(ml.created_at).format('MM-DD HH:mm')}
                  </span>
                </div>
              ))
            )}
          </Card>
        </TabPane>

        <TabPane tab={<span><AlertOutlined /> 特征迟到 ({task.feature_delays.length})</span>} key="delays">
          <Card extra={<Button type="primary" danger icon={<AlertOutlined />} onClick={() => setDelayModal(true)}>报告特征迟到</Button>}>
            {task.feature_delays.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 40 }}>暂无特征迟到记录</div>
            ) : (
              task.feature_delays.map(d => (
                <div key={d.id} className={`delay-card ${d.status}`}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <StatusBadge status={d.status} type="delay" />
                      <strong>{d.feature_name}</strong>
                      <span style={{ color: '#8c8c8c' }}>
                        期望日期: {d.expected_date}
                        {d.actual_date && ` → 实际日期: ${d.actual_date}`}
                      </span>
                    </Space>
                    {d.suspected_reason && (
                      <div>
                        <span style={{ color: '#8c8c8c' }}>疑似原因:</span> {d.suspected_reason}
                      </div>
                    )}
                    {d.impact_scope && (
                      <div>
                        <span style={{ color: '#8c8c8c' }}>影响范围:</span> {d.impact_scope}
                        {d.affected_samples && ` (影响 ${d.affected_samples} 个样本)`}
                      </div>
                    )}
                    <Space>
                      {d.status === 'pending' && (
                        <Button type="primary" size="small" onClick={() => handleConfirmDelay(d)}>
                          确认原因和影响
                        </Button>
                      )}
                      {d.status === 'confirmed' && (
                        <Button type="primary" size="small" onClick={() => handleResolveDelay(d.id)}>
                          标记已解决
                        </Button>
                      )}
                      {d.confirmed_by && (
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {d.confirmed_by} · {dayjs(d.confirmed_at!).format('MM-DD HH:mm')}
                        </span>
                      )}
                    </Space>
                  </Space>
                </div>
              ))
            )}
          </Card>
        </TabPane>

        <TabPane tab={<span><CommentOutlined /> 评论备注 ({task.comments.length})</span>} key="comments">
          <Card extra={<Button type="primary" icon={<CommentOutlined />} onClick={() => setCommentModal(true)}>添加评论</Button>}>
            {task.comments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 40 }}>暂无评论</div>
            ) : (
              <List
                dataSource={task.comments}
                renderItem={item => (
                  <List.Item style={{ alignItems: 'flex-start' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ marginBottom: 4 }}>
                        <Text strong>{item.comment_by}</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </div>
                      <div>{item.comment}</div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title="人工判断样本"
        open={judgmentModal.visible}
        onCancel={() => setJudgmentModal({ visible: false, evidence: null })}
        footer={null}
      >
        {judgmentModal.evidence && (
          <Form
            onFinish={handleJudgmentSubmit}
            initialValues={{
              is_correct: judgmentModal.evidence.is_correct === 1,
              reason: ''
            }}
          >
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>查询:</strong> {judgmentModal.evidence.query_text}
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: '#8c8c8c' }}>期望:</span> <code>{judgmentModal.evidence.expected_result}</code>
              </div>
              <div>
                <span style={{ color: '#8c8c8c' }}>实际:</span> <code>{judgmentModal.evidence.actual_result}</code>
              </div>
            </div>
            <Form.Item name="is_correct" label="是否正确">
              <Radio.Group>
                <Radio value={true}>正确</Radio>
                <Radio value={false}>错误</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="reason" label="判断理由" rules={[{ required: true, message: '请填写理由' }]}>
              <TextArea rows={3} placeholder="请说明判断理由，以便其他同事了解..." />
            </Form.Item>
            <Form.Item name="is_temporary" label="判断类型">
              <Radio.Group>
                <Radio value={false}>正式判断</Radio>
                <Radio value={true}>临时判断 (待确认)</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">保存判断</Button>
                <Button onClick={() => setJudgmentModal({ visible: false, evidence: null })}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title="报告特征迟到"
        open={delayModal}
        onCancel={() => setDelayModal(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleDelaySubmit}>
          <Form.Item name="feature_name" label="特征名称" rules={[{ required: true }]}>
            <Input placeholder="如 user_profile_v2_feature" />
          </Form.Item>
          <Form.Item name="expected_date" label="期望日期" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="suspected_reason" label="疑似原因">
            <TextArea rows={2} placeholder="请描述疑似原因..." />
          </Form.Item>
          <Form.Item name="impact_scope" label="影响范围">
            <TextArea rows={2} placeholder="请描述影响范围..." />
          </Form.Item>
          <Form.Item name="affected_samples" label="影响样本数">
            <Input type="number" placeholder="大约影响多少样本" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交</Button>
              <Button onClick={() => setDelayModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="记录参数变更"
        open={paramModal}
        onCancel={() => setParamModal(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleParamSubmit}>
          <Form.Item name="param_name" label="参数名" rules={[{ required: true }]}>
            <Input placeholder="如 efSearch" />
          </Form.Item>
          <Form.Item name="old_value" label="原值">
            <Input placeholder="变更前的值" />
          </Form.Item>
          <Form.Item name="new_value" label="新值" rules={[{ required: true }]}>
            <Input placeholder="变更后的值" />
          </Form.Item>
          <Form.Item name="change_reason" label="变更原因">
            <TextArea rows={2} placeholder="为什么要调整这个参数?" />
          </Form.Item>
          <Form.Item name="result_impact" label="结果影响">
            <TextArea rows={2} placeholder="对评测结果有什么影响?" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交</Button>
              <Button onClick={() => { setParamModal(false); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加材料名称关联"
        open={materialModal}
        onCancel={() => setMaterialModal(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleMaterialSubmit}>
          <Form.Item name="source_name" label="源名称" rules={[{ required: true }]}>
            <Input placeholder="如 夏季连衣裙" />
          </Form.Item>
          <Form.Item name="target_name" label="目标名称" rules={[{ required: true }]}>
            <Input placeholder="如 夏日碎花长裙" />
          </Form.Item>
          <Form.Item name="link_type" label="关联类型" rules={[{ required: true }]}>
            <Select>
              <Option value="synonym_mapping">同义词映射</Option>
              <Option value="category_alias">类目别名</Option>
              <Option value="brand_alias">品牌别名</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交</Button>
              <Button onClick={() => { setMaterialModal(false); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加评论"
        open={commentModal}
        onCancel={() => setCommentModal(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleCommentSubmit}>
          <Form.Item name="comment" label="评论内容" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="写下你的备注或说明..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交</Button>
              <Button onClick={() => { setCommentModal(false); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskDetailPage;
