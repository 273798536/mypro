import React, { useState, useEffect } from 'react';
import {
  Tabs, Card, Button, Space, Tag, Descriptions, Table, Form,
  Input, Select, Modal, message, Alert, List, Comment, Avatar,
  Divider, Statistic, Row, Col, Popconfirm
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, ReloadOutlined,
  FileTextOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined, SendOutlined, UserOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  sessionAPI, correctionAPI, leakAPI, reportAPI,
  commentAPI, snapshotAPI
} from '../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const statusMap = {
  pending: { color: 'default', text: '待处理' },
  processing: { color: 'processing', text: '处理中' },
  waiting_confirm: { color: 'warning', text: '待确认' },
  completed: { color: 'success', text: '已完成' },
  error: { color: 'error', text: '异常' }
};

const correctionTypeMap = {
  false_positive: '误报修正',
  false_negative: '漏报修正',
  threshold_adjust: '阈值调整',
  other: '其他'
};

const leakStatusMap = {
  detected: { color: 'red', text: '已检测' },
  confirmed: { color: 'orange', text: '已确认' },
  resolved: { color: 'green', text: '已解决' },
  dismissed: { color: 'default', text: '已驳回' }
};

function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [correctionModal, setCorrectionModal] = useState(false);
  const [leakModal, setLeakModal] = useState(false);
  const [leakConfirmModal, setLeakConfirmModal] = useState(false);
  const [leakResolveModal, setLeakResolveModal] = useState(false);
  const [selectedLeak, setSelectedLeak] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [impactAnalysis, setImpactAnalysis] = useState(null);
  const [form] = Form.useForm();
  const [leakForm] = Form.useForm();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isReviewer = user.role !== 'scheduler';

  useEffect(() => {
    loadSessionDetail();
    loadImpactAnalysis();
  }, [id]);

  const loadSessionDetail = async () => {
    setLoading(true);
    try {
      const response = await sessionAPI.get(id);
      setSession(response.data);
    } catch (error) {
      message.error('加载会话详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadImpactAnalysis = async () => {
    try {
      const response = await leakAPI.getImpactAnalysis(id);
      setImpactAnalysis(response.data);
    } catch (error) {
      console.error('加载影响分析失败', error);
    }
  };

  const handleProcess = async () => {
    try {
      const response = await sessionAPI.process(id);
      message.success(response.data.message);
      loadSessionDetail();
      loadImpactAnalysis();
    } catch (error) {
      message.error(error.response?.data?.detail || '操作失败');
    }
  };

  const handleComplete = async () => {
    try {
      await sessionAPI.complete(id);
      message.success('会话已完成');
      loadSessionDetail();
    } catch (error) {
      message.error(error.response?.data?.detail || '操作失败');
    }
  };

  const handleRerun = () => {
    Modal.confirm({
      title: '重跑会话',
      content: '是否保留历史人工修正记录？',
      okText: '保留并重跑',
      cancelText: '不保留',
      onOk: async () => {
        await sessionAPI.rerun(id, { reason: '手动触发重跑', preserve_corrections: true });
        message.success('重跑已开始');
        loadSessionDetail();
      },
      onCancel: async () => {
        await sessionAPI.rerun(id, { reason: '手动触发重跑', preserve_corrections: false });
        message.success('重跑已开始');
        loadSessionDetail();
      }
    });
  };

  const handleCreateCorrection = async (values) => {
    try {
      await correctionAPI.create({
        ...values,
        session_id: parseInt(id),
        changed_fields: values.changed_fields || ['result']
      });
      message.success('人工修正已提交');
      setCorrectionModal(false);
      form.resetFields();
      loadSessionDetail();
    } catch (error) {
      message.error(error.response?.data?.detail || '提交失败');
    }
  };

  const handleCreateLeak = async (values) => {
    try {
      await leakAPI.create(id, {
        ...values,
        affected_items: values.affected_items ? 
          values.affected_items.split(',').map(s => ({ id: s.trim() })) : []
      });
      message.success('泄漏警告已创建');
      setLeakModal(false);
      leakForm.resetFields();
      loadSessionDetail();
      loadImpactAnalysis();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleConfirmLeak = async (values) => {
    try {
      await leakAPI.confirm(selectedLeak.id, values);
      message.success('已确认泄漏原因');
      setLeakConfirmModal(false);
      loadSessionDetail();
      loadImpactAnalysis();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleResolveLeak = async (values) => {
    try {
      await leakAPI.resolve(selectedLeak.id, values);
      message.success('泄漏已处理');
      setLeakResolveModal(false);
      loadSessionDetail();
      loadImpactAnalysis();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDismissLeak = async (alert) => {
    try {
      await leakAPI.dismiss(alert.id, '经核实为误报');
      message.success('已驳回警告');
      loadSessionDetail();
      loadImpactAnalysis();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await commentAPI.create({
        session_id: parseInt(id),
        content: commentText,
        comment_type: 'note'
      });
      setCommentText('');
      loadSessionDetail();
    } catch (error) {
      message.error('添加备注失败');
    }
  };

  const handleGenerateReport = async () => {
    try {
      await reportAPI.generate(id, `${session.session_name}-灰度报告`);
      message.success('报告生成成功');
      loadSessionDetail();
    } catch (error) {
      message.error('报告生成失败');
    }
  };

  const handleOverrideCorrection = async (correction) => {
    try {
      await correctionAPI.override(correction.id);
      message.success('修正已覆盖');
      loadSessionDetail();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const savePageSnapshot = async () => {
    try {
      await snapshotAPI.create({
        session_id: parseInt(id),
        snapshot_data: {
          timestamp: dayjs().toISOString(),
          status: session.status,
          activeTab: activeTab,
          scrollPosition: window.scrollY,
          filters: {}
        },
        snapshot_type: 'page_state'
      });
      message.success('页面状态已保存');
    } catch (error) {
      message.error('保存失败');
    }
  };

  if (!session) return <div style={{ padding: 24 }}>加载中...</div>;

  const statusInfo = statusMap[session.status] || statusMap.pending;

  const correctionColumns = [
    { title: '类型', dataIndex: 'correction_type', key: 'type', 
      render: t => <Tag>{correctionTypeMap[t] || t}</Tag> },
    { title: '目标项', dataIndex: 'target_item_name', key: 'name' },
    { title: '操作人', dataIndex: 'operator_name', key: 'operator' },
    { title: '改变的字段', dataIndex: 'changed_fields', key: 'fields',
      render: fields => fields?.join(', ') || '-' },
    { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: '状态', dataIndex: 'is_overridden', key: 'status',
      render: o => o ? <Tag color="default">已覆盖</Tag> : <Tag color="green">生效中</Tag> },
    { title: '时间', dataIndex: 'created_at', key: 'time',
      render: t => dayjs(t).format('MM-DD HH:mm') },
    { title: '操作', key: 'action', render: (_, record) => (
      isReviewer && !record.is_overridden && (
        <Popconfirm
          title="确认覆盖此修正？"
          onConfirm={() => handleOverrideCorrection(record)}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>覆盖</Button>
        </Popconfirm>
      )
    )}
  ];

  const leakColumns = [
    { title: '状态', dataIndex: 'status', key: 'status',
      render: s => {
        const info = leakStatusMap[s] || leakStatusMap.detected;
        return <Tag color={info.color}>{info.text}</Tag>;
      }},
    { title: '泄漏类型', dataIndex: 'leak_type', key: 'type' },
    { title: '疑似原因', dataIndex: 'suspected_cause', key: 'cause', ellipsis: true },
    { title: '影响样本数', dataIndex: 'affected_count', key: 'count' },
    { title: '检测时间', dataIndex: 'detected_at', key: 'time',
      render: t => dayjs(t).format('MM-DD HH:mm') },
    { title: '操作', key: 'action', render: (_, record) => (
      <Space size="small">
        {record.status === 'detected' && isReviewer && (
          <Button type="link" size="small" onClick={() => {
            setSelectedLeak(record);
            setLeakConfirmModal(true);
          }}>确认原因</Button>
        )}
        {record.status === 'confirmed' && isReviewer && (
          <Button type="link" size="small" onClick={() => {
            setSelectedLeak(record);
            setLeakResolveModal(true);
          }}>处理解决</Button>
        )}
        {record.status === 'detected' && isReviewer && (
          <Popconfirm
            title="确认驳回此警告？"
            onConfirm={() => handleDismissLeak(record)}
          >
            <Button type="link" size="small">驳回</Button>
          </Popconfirm>
        )}
      </Space>
    )}
  ];

  return (
    <div className="page-container">
      {session.has_sample_leak && impactAnalysis && (
        <div className="leak-warning">
          <Alert
            message={<Space><WarningOutlined style={{ color: '#ff4d4f' }} /> 检测到样本泄漏！</Space>}
            description={
              <div>
                <p>当前有 {impactAnalysis.active_alerts_count} 个未处理的泄漏警告，影响 {impactAnalysis.total_affected_items} 个样本。</p>
                <p>请先确认泄漏原因和影响范围，处理完毕后再继续。</p>
                <Button type="primary" size="small" onClick={() => setActiveTab('leaks')}>
                  查看泄漏详情
                </Button>
              </div>
            }
            type="error"
            showIcon
          />
        </div>
      )}

      <Card
        title={
          <Space>
            <span>{session.session_name}</span>
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            {session.has_sample_leak && <Tag color="red" icon={<WarningOutlined />}>样本泄漏</Tag>}
          </Space>
        }
        extra={
          <Space>
            {isReviewer && (
              <>
                <Button icon={<EditOutlined />} onClick={savePageSnapshot}>
                  保存页面状态
                </Button>
                {session.status === 'pending' && (
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleProcess}>
                    开始处理
                  </Button>
                )}
                {session.status !== 'completed' && session.status !== 'waiting_confirm' && (
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleComplete}>
                    标记完成
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={handleRerun}>重跑</Button>
                <Button icon={<FileTextOutlined />} onClick={handleGenerateReport}>
                  生成报告
                </Button>
              </>
            )}
            <Button onClick={() => navigate('/sessions')}>返回列表</Button>
          </Space>
        }
      >
        <Descriptions column={3} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="创建人">{session.creator_name}</Descriptions.Item>
          <Descriptions.Item label="处理人">{session.assignee_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="批次ID">{session.batch_id || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(session.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{dayjs(session.updated_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="上次处理">{session.last_processed_at ? dayjs(session.last_processed_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="描述" span={3}>{session.description || '-'}</Descriptions.Item>
        </Descriptions>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="人工修正" value={session.corrections_count} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="备注记录" value={session.comments_count} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="泄漏警告" value={session.leak_alerts_count} valueStyle={{ color: session.leak_alerts_count > 0 ? '#ff4d4f' : undefined }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="灰度报告" value={session.reports?.length || 0} />
            </Card>
          </Col>
        </Row>

        {session.summary && (
          <Alert
            message="页面摘要"
            description={session.summary}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="概览" key="overview">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="原始结果" size="small">
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                    {JSON.stringify(session.original_result, null, 2)}
                  </pre>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="当前结果" size="small">
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                    {JSON.stringify(session.current_result, null, 2)}
                  </pre>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="人工修正" key="corrections">
            <Card
              size="small"
              extra={isReviewer && (
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCorrectionModal(true)}>
                  添加修正
                </Button>
              )}
            >
              <Table
                columns={correctionColumns}
                dataSource={session.corrections}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </TabPane>

          <TabPane tab="样本泄漏" key="leaks">
            <Card
              size="small"
              extra={isReviewer && (
                <Button type="primary" size="small" danger icon={<WarningOutlined />} onClick={() => setLeakModal(true)}>
                  上报泄漏
                </Button>
              )}
            >
              {impactAnalysis && impactAnalysis.active_alerts_count > 0 && (
                <Alert
                  message={`影响分析：共 ${impactAnalysis.active_alerts_count} 个警告，影响 ${impactAnalysis.total_affected_items} 个样本`}
                  description={impactAnalysis.recommendation}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              <Table
                columns={leakColumns}
                dataSource={session.leak_alerts}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </TabPane>

          <TabPane tab="灰度报告" key="reports">
            <List
              dataSource={session.reports}
              renderItem={report => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => navigate(`/reports`)}>
                      查看详情
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={report.report_name}
                    description={
                      <Space>
                        <Tag>v{report.report_version}</Tag>
                        <span>共 {report.total_changed} 项变更</span>
                        <span type="secondary">{dayjs(report.generated_at).format('YYYY-MM-DD HH:mm')}</span>
                      </Space>
                    }
                  />
                  {report.overall_summary}
                </List.Item>
              )}
            />
          </TabPane>

          <TabPane tab="备注记录" key="comments">
            <Card size="small">
              <List
                dataSource={session.comments}
                renderItem={comment => (
                  <div className={`comment-item ${comment.comment_type}`}>
                    <Comment
                      author={comment.author_name}
                      avatar={<Avatar icon={<UserOutlined />} />}
                      content={comment.content}
                      datetime={dayjs(comment.created_at).format('YYYY-MM-DD HH:mm')}
                    />
                  </div>
                )}
              />
              <Divider />
              <Space.Compact style={{ width: '100%' }}>
                <TextArea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="添加备注说明..."
                  rows={3}
                />
                <Button 
                  type="primary" 
                  icon={<SendOutlined />}
                  onClick={handleAddComment}
                  style={{ height: 'auto' }}
                >
                  发送
                </Button>
              </Space.Compact>
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="添加人工修正"
        open={correctionModal}
        onCancel={() => setCorrectionModal(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCorrection}>
          <Form.Item name="correction_type" label="修正类型" rules={[{ required: true }]}>
            <Select>
              {Object.entries(correctionTypeMap).map(([key, value]) => (
                <Option key={key} value={key}>{value}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="target_item_id" label="目标项ID" rules={[{ required: true }]}>
            <Input placeholder="样本或记录的唯一标识" />
          </Form.Item>
          <Form.Item name="target_item_name" label="目标项名称">
            <Input placeholder="便于识别的名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="original_judgment" label="原始判断" rules={[{ required: true }]}>
                <TextArea rows={4} placeholder='{"result": "positive", "confidence": 0.85}' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="new_judgment" label="新判断" rules={[{ required: true }]}>
                <TextArea rows={4} placeholder='{"result": "negative", "confidence": 0.9}' />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="changed_fields" label="改变的字段">
            <Select mode="tags" placeholder="输入字段名，按回车添加">
              <Option value="result">result</Option>
              <Option value="confidence">confidence</Option>
              <Option value="label">label</Option>
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="修正原因（必填）" rules={[{ required: true, message: '请说明改变了哪些判断' }]}>
            <TextArea rows={3} placeholder="请详细说明此修正的原因和依据，改变了哪些判断..." />
          </Form.Item>
          <Form.Item name="impact_description" label="影响说明">
            <TextArea rows={2} placeholder="此修正可能带来的影响..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交修正</Button>
              <Button onClick={() => setCorrectionModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上报样本泄漏"
        open={leakModal}
        onCancel={() => setLeakModal(false)}
        footer={null}
      >
        <Form form={leakForm} layout="vertical" onFinish={handleCreateLeak}>
          <Form.Item name="leak_type" label="泄漏类型">
            <Select placeholder="选择泄漏类型">
              <Option value="train_test_overlap">训练测试集交叉</Option>
              <Option value="data_duplication">数据重复</Option>
              <Option value="label_leakage">标签泄漏</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="suspected_cause" label="疑似原因" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="描述疑似的泄漏原因..." />
          </Form.Item>
          <Form.Item name="affected_count" label="影响样本数">
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item name="affected_items" label="受影响样本ID（逗号分隔）">
            <TextArea rows={2} placeholder="id1, id2, id3" />
          </Form.Item>
          <Form.Item name="impact_scope" label="影响范围">
            <TextArea rows={2} placeholder='{"scope": "validation_set", "severity": "high"}' />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">提交警告</Button>
              <Button onClick={() => setLeakModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="确认泄漏原因"
        open={leakConfirmModal}
        onCancel={() => setLeakConfirmModal(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleConfirmLeak}>
          <Form.Item name="confirmed_cause" label="确认的原因" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="详细描述确认的泄漏原因..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认</Button>
              <Button onClick={() => setLeakConfirmModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理泄漏问题"
        open={leakResolveModal}
        onCancel={() => setLeakResolveModal(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleResolveLeak}>
          <Form.Item name="resolution_notes" label="处理说明" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="描述如何处理此泄漏问题..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">标记已解决</Button>
              <Button onClick={() => setLeakResolveModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SessionDetail;
