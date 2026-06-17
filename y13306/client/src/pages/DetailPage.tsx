import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Descriptions,
  Timeline,
  Divider,
  Alert,
  Table,
  Modal,
  Form,
  Input,
  Radio,
  message,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  EditOutlined,
  LinkOutlined,
  ExportOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type {
  EvaluationRecord,
  EvaluationStatus,
  ChangeHistory,
} from '../types';
import {
  STATUS_TEXT_MAP,
  STATUS_COLOR_MAP,
  MODEL_TYPE_TEXT_MAP,
  EvaluationStatus as StatusEnum,
} from '../types';

const { TextArea } = Input;

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<EvaluationRecord | null>(null);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [reviseModal, setReviseModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [form] = Form.useForm();
  const [reviseForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await api.getEvaluation(id);
      setRecord(result);
    } catch (e: any) {
      message.error(e.message || '加载详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (values: any) => {
    if (!id) return;
    try {
      await api.withdraw(id, values);
      message.success('撤回成功');
      setWithdrawModal(false);
      form.resetFields();
      loadDetail();
    } catch (e: any) {
      message.error(e.message || '撤回失败');
    }
  };

  const handleConfirm = async (values: any) => {
    if (!id) return;
    try {
      await api.confirm(id, values);
      message.success('确认成功');
      setConfirmModal(false);
      form.resetFields();
      loadDetail();
    } catch (e: any) {
      message.error(e.message || '确认失败');
    }
  };

  const handleRevise = async (values: any) => {
    if (!id) return;
    try {
      await api.revise(id, values);
      message.success('改判成功');
      setReviseModal(false);
      reviseForm.resetFields();
      loadDetail();
    } catch (e: any) {
      message.error(e.message || '改判失败');
    }
  };

  const handleLinkConclusion = async (values: any) => {
    if (!id) return;
    try {
      await api.linkConclusion(id, values);
      message.success('关联成功');
      setLinkModal(false);
      form.resetFields();
      loadDetail();
    } catch (e: any) {
      message.error(e.message || '关联失败');
    }
  };

  const handleExport = () => {
    if (record) {
      api.exportCsv(record.batchId);
      message.success('CSV导出已开始');
    }
  };

  if (!record) {
    return null;
  }

  const renderChangeHistory = (history: ChangeHistory[]) => {
    if (history.length === 0) {
      return <div style={{ color: '#999' }}>暂无变更记录</div>;
    }

    return (
      <Timeline
        mode="left"
        items={history.map((h) => ({
          color: h.operationType === 'CREATE' ? 'green' : h.operationType === 'UPDATE' ? 'blue' : 'red',
          children: (
            <div className="timeline-item">
              <div className="timeline-header">
                <span className="timeline-operation">
                  {h.operationType === 'CREATE'
                    ? '创建记录'
                    : h.operationType === 'UPDATE'
                    ? `更新 ${h.fieldName}`
                    : '删除记录'}
                </span>
                <span className="timeline-time">
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {new Date(h.createdAt).toLocaleString()}
                </span>
              </div>
              {h.operator && (
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                  <UserOutlined style={{ marginRight: 4 }} />
                  {h.operator}
                </div>
              )}
              <div className="timeline-content">
                {h.changeReason && (
                  <div style={{ marginBottom: 4 }}>
                    原因：{h.changeReason}
                  </div>
                )}
                <div className="timeline-change">
                  <div>
                    <span style={{ color: '#ff4d4f' }}>
                      <CloseOutlined style={{ marginRight: 4 }} />
                      原值：
                    </span>
                    {h.oldValue || '（空）'}
                  </div>
                  <div>
                    <span style={{ color: '#52c41a' }}>
                      <CheckOutlined style={{ marginRight: 4 }} />
                      新值：
                    </span>
                    {h.newValue || '（空）'}
                  </div>
                </div>
              </div>
            </div>
          ),
        }))}
      />
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回列表
          </Button>
          {record.status !== StatusEnum.WITHDRAWN &&
            record.status !== StatusEnum.DUPLICATE && (
              <Button
                danger
                icon={<RollbackOutlined />}
                onClick={() => setWithdrawModal(true)}
              >
                撤回
              </Button>
            )}
          {record.status === StatusEnum.EVALUATED && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => setConfirmModal(true)}
            >
              人工确认
            </Button>
          )}
          {(record.status === StatusEnum.EVALUATED ||
            record.status === StatusEnum.CONFIRMED) && (
            <Button icon={<EditOutlined />} onClick={() => setReviseModal(true)}>
              改判
            </Button>
          )}
          {record.status === StatusEnum.WITHDRAWN &&
            !record.finalConclusionId && (
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => setLinkModal(true)}
              >
                关联最终结论
              </Button>
            )}
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出本批次CSV
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card
            title="基本信息"
            className="detail-section"
            extra={
              <Space>
                {record.isDuplicate && (
                  <Tag color="default" icon={<WarningOutlined />}>
                    重复评测
                  </Tag>
                )}
                {record.hasWithdrawal && (
                  <Tag color="warning" icon={<RollbackOutlined />}>
                    有撤回记录
                  </Tag>
                )}
                <Tag color={STATUS_COLOR_MAP[record.status]}>
                  {record.statusText}
                </Tag>
              </Space>
            }
          >
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="记录ID">
                <code>{record.id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="批次ID">
                <code>{record.batchId}</code>
              </Descriptions.Item>
              <Descriptions.Item label="病历ID">
                <code>{record.medicalRecordId}</code>
              </Descriptions.Item>
              <Descriptions.Item label="问题ID">
                <code>{record.questionId}</code>
              </Descriptions.Item>
              <Descriptions.Item label="模型版本" span={2}>
                <Space>
                  {record.modelVersion.name}
                  <Tag
                    color={
                      record.modelVersion.type === 'NEW'
                        ? 'green'
                        : record.modelVersion.type === 'OLD'
                        ? 'default'
                        : 'blue'
                    }
                  >
                    {MODEL_TYPE_TEXT_MAP[record.modelVersion.type]}
                  </Tag>
                  <span style={{ color: '#999' }}>
                    v{record.modelVersion.version}
                  </span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="问题内容" span={2}>
                {record.questionContent}
              </Descriptions.Item>
              <Descriptions.Item label="模型回答" span={2}>
                {record.modelAnswer}
              </Descriptions.Item>
              {record.standardAnswer && (
                <Descriptions.Item label="标准答案" span={2}>
                  {record.standardAnswer}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="是否正确">
                {record.isCorrect === undefined ? (
                  '-'
                ) : record.isCorrect ? (
                  <Tag color="success">正确</Tag>
                ) : (
                  <Tag color="error">错误</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="置信度">
                {record.confidence !== undefined
                  ? `${(record.confidence * 100).toFixed(1)}%`
                  : '-'}
              </Descriptions.Item>
              {record.errorType && (
                <Descriptions.Item label="错误类型">
                  {record.errorType}
                </Descriptions.Item>
              )}
              {record.judgeReason && (
                <Descriptions.Item label="判定理由" span={2}>
                  {record.judgeReason}
                </Descriptions.Item>
              )}
              {record.revisionReason && (
                <Descriptions.Item label="改判理由" span={2}>
                  <Alert
                    type="warning"
                    showIcon
                    message="改判理由"
                    description={record.revisionReason}
                  />
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {new Date(record.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="评测时间">
                {record.evaluatedAt
                  ? new Date(record.evaluatedAt).toLocaleString()
                  : '-'}
              </Descriptions.Item>
              {record.confirmedBy && (
                <Descriptions.Item label="确认人">
                  <UserOutlined style={{ marginRight: 4 }} />
                  {record.confirmedBy}
                </Descriptions.Item>
              )}
              {record.confirmedAt && (
                <Descriptions.Item label="确认时间">
                  {new Date(record.confirmedAt).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {record.isDuplicate && record.duplicateInfo && (
            <Card
              title={
                <div className="detail-section-title">
                  <WarningOutlined style={{ color: '#faad14' }} />
                  重复评测信息
                </div>
              }
              className="detail-section"
              style={{ marginTop: 16 }}
            >
              <Alert
                type="warning"
                showIcon
                message="此记录为重复评测"
                description={
                  <div>
                    <p>
                      重复源记录ID：
                      <Button
                        type="link"
                        onClick={() =>
                          navigate(`/detail/${record.duplicateInfo!.id}`)
                        }
                      >
                        {record.duplicateInfo.id}
                      </Button>
                    </p>
                    <p>
                      重复源病历ID：
                      <code>{record.duplicateInfo.medicalRecordId}</code>
                    </p>
                    <p>
                      重复源问题ID：
                      <code>{record.duplicateInfo.questionId}</code>
                    </p>
                  </div>
                }
              />
            </Card>
          )}

          {record.withdrawalInfo && (
            <Card
              title={
                <div className="detail-section-title">
                  <RollbackOutlined style={{ color: '#faad14' }} />
                  撤回记录信息
                </div>
              }
              className="detail-section"
              style={{ marginTop: 16 }}
            >
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="撤回记录ID">
                  <code>{record.withdrawalInfo.id}</code>
                </Descriptions.Item>
                <Descriptions.Item label="撤回操作人">
                  <UserOutlined style={{ marginRight: 4 }} />
                  {record.withdrawalInfo.operator}
                </Descriptions.Item>
                <Descriptions.Item label="撤回原因" span={2}>
                  {record.withdrawalInfo.reason}
                </Descriptions.Item>
                <Descriptions.Item label="撤回时间" span={2}>
                  {new Date(record.withdrawalInfo.createdAt).toLocaleString()}
                </Descriptions.Item>
                {record.withdrawalInfo.linkedConclusionId && (
                  <Descriptions.Item label="关联结论ID" span={2}>
                    <Button
                      type="link"
                      onClick={() =>
                        navigate(
                          `/detail/${record.withdrawalInfo!.linkedConclusionId}`
                        )
                      }
                    >
                      {record.withdrawalInfo.linkedConclusionId}
                    </Button>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {!record.withdrawalInfo.linkedConclusionId && (
                <div style={{ marginTop: 12 }}>
                  <Alert
                    type="warning"
                    showIcon
                    message="尚未关联最终结论"
                    description="请将此撤回记录与正确的最终结论关联，以保证数据完整性。"
                    action={
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => setLinkModal(true)}
                      >
                        关联结论
                      </Button>
                    }
                  />
                </div>
              )}
            </Card>
          )}

          {record.finalConclusionInfo && (
            <Card
              title={
                <div className="detail-section-title">
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  关联的最终结论
                </div>
              }
              className="detail-section"
              style={{ marginTop: 16 }}
            >
              <Alert
                type="success"
                showIcon
                message="最终结论已关联"
                description={
                  <div>
                    <p>
                      结论ID：
                      <Button
                        type="link"
                        onClick={() =>
                          navigate(
                            `/detail/${record.finalConclusionId!}`
                          )
                        }
                      >
                        {record.finalConclusionId}
                      </Button>
                    </p>
                    <p>
                      状态：
                      <Tag color={STATUS_COLOR_MAP[record.finalConclusionInfo.status]}>
                        {record.finalConclusionInfo.statusText}
                      </Tag>
                    </p>
                    <p>
                      结果：
                      {record.finalConclusionInfo.isCorrect === undefined ? (
                        '-'
                      ) : record.finalConclusionInfo.isCorrect ? (
                        <Tag color="success">正确</Tag>
                      ) : (
                        <Tag color="error">错误</Tag>
                      )}
                    </p>
                    {record.finalConclusionInfo.judgeReason && (
                      <p>理由：{record.finalConclusionInfo.judgeReason}</p>
                    )}
                  </div>
                }
              />
            </Card>
          )}

          {record.revisionComparison && (
            <Card
              title={
                <div className="detail-section-title">
                  <FileTextOutlined style={{ color: '#722ed1' }} />
                  新旧模型对比说明
                </div>
              }
              className="detail-section"
              style={{ marginTop: 16 }}
            >
              <div className="comparison-card">
                <div className="comparison-header">
                  模型改判对比分析
                </div>
                <div className="comparison-row">
                  <div className="comparison-col old">
                    <div className="comparison-label">旧模型</div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {record.revisionComparison.oldModelVersion?.name || '-'}
                    </div>
                    <div>
                      {record.revisionComparison.oldIsCorrect === undefined ? (
                        '-'
                      ) : record.revisionComparison.oldIsCorrect ? (
                        <Tag color="success">判定正确</Tag>
                      ) : (
                        <Tag color="error">判定错误</Tag>
                      )}
                    </div>
                    {record.revisionComparison.oldJudgeReason && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                        理由：{record.revisionComparison.oldJudgeReason}
                      </div>
                    )}
                  </div>
                  <div className="comparison-col new">
                    <div className="comparison-label">新模型</div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {record.revisionComparison.newModelVersion.name}
                    </div>
                    <div>
                      {record.revisionComparison.newIsCorrect ? (
                        <Tag color="success">判定正确</Tag>
                      ) : (
                        <Tag color="error">判定错误</Tag>
                      )}
                    </div>
                    {record.revisionComparison.newJudgeReason && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                        理由：{record.revisionComparison.newJudgeReason}
                      </div>
                    )}
                  </div>
                </div>
                <div className="explanation-box">
                  <div className="explanation-title">改判解释</div>
                  <div className="explanation-content">
                    {record.revisionComparison.revisionExplanation}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card
            title={
              <div className="detail-section-title">
                <ClockCircleOutlined style={{ color: '#1677ff' }} />
                历史变更记录
              </div>
            }
            className="detail-section"
            style={{ marginTop: 16 }}
          >
            {renderChangeHistory(record.changeHistories)}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="操作说明" size="small">
            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#666' }}>
              <p>
                <strong>撤回：</strong>
                当发现记录有误时，可执行撤回操作。撤回后需关联最终结论。
              </p>
              <p>
                <strong>人工确认：</strong>
                人工复核模型输出，确认结果正确无误。
              </p>
              <p>
                <strong>改判：</strong>
                如模型判定有误，可人工改判，并记录改判理由。
              </p>
              <p>
                <strong>关联结论：</strong>
                撤回记录需与正确的最终结论关联，保证数据完整。
              </p>
              <p>
                <strong>导出CSV：</strong>
                导出本批次所有记录，状态与接口保持一致。
              </p>
            </div>
          </Card>

          <Card
            title="CSV与接口一致性"
            size="small"
            style={{ marginTop: 16 }}
          >
            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#666' }}>
              <p>✅ 状态字段完全一致</p>
              <p>✅ 重复标记完全一致</p>
              <p>✅ 撤回标记完全一致</p>
              <p>✅ 包含撤回原因、操作人、时间</p>
              <p>✅ 包含关联结论ID和最终结论</p>
              <p>✅ 包含新旧模型对比说明</p>
              <p>✅ 包含人工确认信息</p>
            </div>
          </Card>

          <Card
            title="导出CSV字段（28列）"
            size="small"
            style={{ marginTop: 16 }}
          >
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: '#666',
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              <p>1. 病历ID</p>
              <p>2. 问题ID</p>
              <p>3. 问题内容</p>
              <p>4. 模型回答</p>
              <p>5. 标准答案</p>
              <p>6. 模型名称</p>
              <p>7. 模型类型</p>
              <p>8. 模型版本</p>
              <p>9. 是否正确</p>
              <p>10. 置信度</p>
              <p>11. 错误类型</p>
              <p>12. 状态</p>
              <p>13. 判定理由</p>
              <p>14. 改判理由</p>
              <p>15. 是否重复</p>
              <p>16. 重复源记录ID</p>
              <p>17. 是否有撤回</p>
              <p>18. 撤回原因</p>
              <p>19. 撤回操作人</p>
              <p>20. 撤回时间</p>
              <p>21. 关联结论ID</p>
              <p>22. 最终结论状态</p>
              <p>23. 最终结论结果</p>
              <p>24. 新旧模型对比说明</p>
              <p>25. 确认人</p>
              <p>26. 确认时间</p>
              <p>27. 创建时间</p>
              <p>28. 评测时间</p>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="撤回记录"
        open={withdrawModal}
        onCancel={() => setWithdrawModal(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleWithdraw}>
          <Form.Item
            name="reason"
            label="撤回原因"
            rules={[{ required: true, message: '请输入撤回原因' }]}
          >
            <TextArea rows={4} placeholder="请输入撤回原因" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请输入操作人' }]}
          >
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认撤回
              </Button>
              <Button onClick={() => setWithdrawModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="人工确认"
        open={confirmModal}
        onCancel={() => setConfirmModal(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleConfirm}>
          <Form.Item name="confirmReason" label="确认说明（可选）">
            <TextArea rows={3} placeholder="请输入确认说明" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请输入操作人' }]}
          >
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认
              </Button>
              <Button onClick={() => setConfirmModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="改判记录"
        open={reviseModal}
        onCancel={() => setReviseModal(false)}
        footer={null}
        width={600}
      >
        <Form
          form={reviseForm}
          layout="vertical"
          onFinish={handleRevise}
          initialValues={{ isCorrect: record?.isCorrect ?? true }}
        >
          <Form.Item
            name="isCorrect"
            label="新的判定结果"
            rules={[{ required: true, message: '请选择判定结果' }]}
          >
            <Radio.Group>
              <Radio value={true}>正确</Radio>
              <Radio value={false}>错误</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="judgeReason"
            label="新的判定理由"
            rules={[{ required: true, message: '请输入判定理由' }]}
          >
            <TextArea rows={3} placeholder="请输入新的判定理由" />
          </Form.Item>
          <Form.Item
            name="revisionReason"
            label="改判原因"
            rules={[{ required: true, message: '请输入改判原因' }]}
          >
            <TextArea rows={3} placeholder="请说明为什么需要改判" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请输入操作人' }]}
          >
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认改判
              </Button>
              <Button onClick={() => setReviseModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="关联最终结论"
        open={linkModal}
        onCancel={() => setLinkModal(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleLinkConclusion}>
          <Form.Item
            name="conclusionId"
            label="结论记录ID"
            rules={[{ required: true, message: '请输入结论记录ID' }]}
          >
            <Input placeholder="请输入作为最终结论的记录ID" />
          </Form.Item>
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请输入操作人' }]}
          >
            <Input placeholder="请输入操作人姓名" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认关联
              </Button>
              <Button onClick={() => setLinkModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
