import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Alert,
  List,
  Avatar,
  Upload,
  message,
  Descriptions,
  Divider,
  Tooltip,
  Badge,
} from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  UploadOutlined,
  PlusOutlined,
  EyeOutlined,
  UserOutlined,
  LinkOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '../store';
import type { SettlementIssue, DisputeNote, Order } from '../types';
import {
  formatDate,
  getIssueTypeLabel,
  getStatusLabel,
  getStatusColor,
} from '../utils/settlement';

const { Option } = Select;
const { TextArea } = Input;

const DisputeCenter: React.FC = () => {
  const {
    settlements,
    orders,
    contracts,
    disputeNotes,
    addDisputeNote,
    resolveIssue,
    updateSettlement,
    selectedSettlementId,
    setSelectedSettlementId,
  } = useAppStore();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<SettlementIssue | null>(null);
  const [selectedSettlementIssue, setSelectedSettlementIssue] = useState<{
    settlementId: string;
    issue: SettlementIssue;
  } | null>(null);
  const [noteForm] = Form.useForm();
  const [resolveForm] = Form.useForm();

  const allIssues = useMemo(() => {
    const issues: Array<{
      settlementId: string;
      settlementNo: string;
      influencerName: string;
      issue: SettlementIssue;
      relatedOrder?: Order;
    }> = [];

    settlements.forEach((s) => {
      s.issues.forEach((issue) => {
        const relatedOrder = orders.find((o) => o.id === issue.evidenceId);
        issues.push({
          settlementId: s.id,
          settlementNo: s.settlementNo,
          influencerName: s.influencerName,
          issue,
          relatedOrder,
        });
      });
    });

    return issues;
  }, [settlements, orders]);

  const openIssues = useMemo(() => allIssues.filter((i) => i.issue.status === 'open'), [allIssues]);
  const resolvedIssues = useMemo(() => allIssues.filter((i) => i.issue.status === 'resolved'), [allIssues]);

  const issueStats = useMemo(() => ({
    total: allIssues.length,
    open: openIssues.length,
    resolved: resolvedIssues.length,
    errors: openIssues.filter((i) => i.issue.severity === 'error').length,
    warnings: openIssues.filter((i) => i.issue.severity === 'warning').length,
  }), [allIssues, openIssues, resolvedIssues]);

  const getIssueNotes = (settlementId: string, issueId: string) => {
    return disputeNotes.filter((n) => n.settlementId === settlementId && n.issueId === issueId);
  };

  const columns: ColumnsType<typeof allIssues[0]> = [
    {
      title: '问题类型',
      dataIndex: ['issue', 'type'],
      key: 'type',
      width: 120,
      render: (type) => (
        <Tag
          color={
            type === 'cross_session_return'
              ? 'red'
              : type === 'duplicate_commission'
              ? 'orange'
              : type === 'missing_evidence'
              ? 'warning'
              : 'blue'
          }
        >
          {getIssueTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: '严重程度',
      dataIndex: ['issue', 'severity'],
      key: 'severity',
      width: 100,
      render: (severity) => {
        const icon =
          severity === 'error' ? (
            <ExclamationCircleOutlined className="text-red-500" />
          ) : severity === 'warning' ? (
            <WarningOutlined className="text-orange-500" />
          ) : (
            <FileTextOutlined className="text-blue-500" />
          );
        return (
          <Space>
            {icon}
            <span>
              {severity === 'error' ? '错误' : severity === 'warning' ? '警告' : '提示'}
            </span>
          </Space>
        );
      },
    },
    {
      title: '达人',
      dataIndex: 'influencerName',
      key: 'influencerName',
      width: 120,
    },
    {
      title: '关联清算单',
      dataIndex: 'settlementNo',
      key: 'settlementNo',
      width: 130,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '问题描述',
      dataIndex: ['issue', 'description'],
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '关联材料',
      dataIndex: ['issue', 'evidenceRef'],
      key: 'evidenceRef',
      width: 200,
      render: (text, record) => (
        <Space wrap>
          <Tag color="blue" icon={<LinkOutlined />}>
            {text}
          </Tag>
          {record.relatedOrder && (
            <Tag color="purple" icon={<FileTextOutlined />}>
              {record.relatedOrder.productName}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '备注数',
      key: 'noteCount',
      width: 80,
      render: (_, record) => {
        const count = getIssueNotes(record.settlementId, record.issue.id).length;
        return count > 0 ? <Badge count={count} color="blue" /> : '-';
      },
    },
    {
      title: '状态',
      dataIndex: ['issue', 'status'],
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '发现时间',
      dataIndex: ['issue', 'createdAt'],
      key: 'createdAt',
      width: 150,
      render: (value) => formatDate(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.issue.status === 'open' && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddNote(record)}
            >
              备注
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleViewDetail = (record: typeof allIssues[0]) => {
    setSelectedIssue(record.issue);
    setSelectedSettlementIssue({
      settlementId: record.settlementId,
      issue: record.issue,
    });
    setIsDetailModalOpen(true);
  };

  const handleAddNote = (record: typeof allIssues[0]) => {
    setSelectedIssue(record.issue);
    setSelectedSettlementIssue({
      settlementId: record.settlementId,
      issue: record.issue,
    });
    noteForm.resetFields();
    setIsNoteModalOpen(true);
  };

  const handleSubmitNote = async () => {
    if (!selectedSettlementIssue) return;
    try {
      const values = await noteForm.validateFields();
      const newNote: DisputeNote = {
        id: `note-${Date.now()}`,
        settlementId: selectedSettlementIssue.settlementId,
        issueId: selectedSettlementIssue.issue.id,
        author: '当前用户',
        content: values.content,
        createdAt: new Date().toISOString(),
        attachments: [],
      };
      addDisputeNote(newNote);
      setIsNoteModalOpen(false);
      message.success('备注添加成功');
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleResolveIssue = async () => {
    if (!selectedSettlementIssue) return;
    try {
      const values = await resolveForm.validateFields();
      const settlement = settlements.find((s) => s.id === selectedSettlementIssue.settlementId);
      if (!settlement) return;

      resolveIssue(
        selectedSettlementIssue.settlementId,
        selectedSettlementIssue.issue.id,
        values.resolution
      );

      const updatedSettlement = { ...settlement };
      const newVersion = {
        version: settlement.versions.length + 1,
        createdAt: new Date().toISOString(),
        createdBy: '当前用户',
        baseFee: settlement.baseFee,
        totalCommission: settlement.totalCommission,
        totalReturnDeduction: settlement.totalReturnDeduction,
        crossSessionReturnDeduction: settlement.crossSessionReturnDeduction,
        duplicateCommissionDeduction: settlement.duplicateCommissionDeduction,
        otherDeductions: settlement.otherDeductions,
        netPayable: settlement.netPayable,
        changeLog: `解决问题: ${getIssueTypeLabel(selectedSettlementIssue.issue.type)} - ${values.resolution}`,
      };
      updatedSettlement.versions = [...settlement.versions, newVersion];
      updateSettlement(updatedSettlement);

      setIsDetailModalOpen(false);
      message.success('问题已标记为解决');
    } catch (error) {
      console.error('Resolve failed:', error);
    }
  };

  const renderEvidenceLocation = (issue: SettlementIssue) => {
    const relatedOrder = orders.find((o) => o.id === issue.evidenceId);
    const relatedContract = contracts.find((c) => {
      const s = settlements.find((s) => s.issues.some((i) => i.id === issue.id));
      return s?.contractId === c.id;
    });

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-3">
          <Space>
            <LinkOutlined className="text-blue-500" />
            材料定位
          </Space>
        </h4>
        <Alert
          type="info"
          showIcon
          message="问题卡在哪份材料"
          description={
            <div className="space-y-2 mt-2">
              <div className="flex items-start gap-2">
                <FileTextOutlined className="mt-1 text-blue-500" />
                <div>
                  <strong>证据编号：</strong>
                  <code className="bg-gray-200 px-2 py-0.5 rounded">
                    {issue.evidenceNo || '未找到'}
                  </code>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileImageOutlined className="mt-1 text-blue-500" />
                <div>
                  <strong>材料类型：</strong>
                  <Tag>{issue.evidenceType === 'order' ? '订单数据' : issue.evidenceType}</Tag>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <LinkOutlined className="mt-1 text-blue-500" />
                <div>
                  <strong>证据引用：</strong>
                  <span>{issue.evidenceRef}</span>
                </div>
              </div>
            </div>
          }
        />

        {relatedOrder && (
          <div className="mt-3">
            <Divider className="my-2" />
            <h5 className="font-medium mb-2">关联订单详情</h5>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="订单号">
                <code>{relatedOrder.orderNo}</code>
              </Descriptions.Item>
              <Descriptions.Item label="商品">
                {relatedOrder.productName}
              </Descriptions.Item>
              <Descriptions.Item label="金额">
                ¥{relatedOrder.amount.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="佣金">
                ¥{relatedOrder.commission.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">
                {formatDate(relatedOrder.orderTime)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(relatedOrder.status)}>
                  {getStatusLabel(relatedOrder.status)}
                </Tag>
              </Descriptions.Item>
              {relatedOrder.isCrossSessionReturn && (
                <Descriptions.Item label="退货场次" span={2}>
                  <Tag color="red">
                    跨场退货：{relatedOrder.returnSessionNo}
                  </Tag>
                </Descriptions.Item>
              )}
              {relatedOrder.attributionEvidence && (
                <Descriptions.Item label="归因证据" span={2}>
                  {relatedOrder.attributionEvidence}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}

        {relatedContract && (
          <div className="mt-3">
            <Divider className="my-2" />
            <h5 className="font-medium mb-2">关联合同条款</h5>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="合同编号">
                <code>{relatedContract.contractNo}</code>
              </Descriptions.Item>
              <Descriptions.Item label="达人">
                {relatedContract.influencerName}
              </Descriptions.Item>
              <Descriptions.Item label="佣金比例">
                {(relatedContract.commissionRate * 100).toFixed(0)}%
              </Descriptions.Item>
              <Descriptions.Item label="退货扣点">
                {(relatedContract.returnDeductionRate * 100).toFixed(0)}%
              </Descriptions.Item>
              <Descriptions.Item label="合同期限" span={2}>
                {relatedContract.startDate} ~ {relatedContract.endDate}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <Card size="small">
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{issueStats.total}</div>
            <div className="text-sm text-gray-500">问题总数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{issueStats.errors}</div>
            <div className="text-sm text-gray-500">严重错误</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{issueStats.warnings}</div>
            <div className="text-sm text-gray-500">警告</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-500">{issueStats.open}</div>
            <div className="text-sm text-gray-500">待处理</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{issueStats.resolved}</div>
            <div className="text-sm text-gray-500">已解决</div>
          </div>
        </div>
      </Card>

      <Card
        title="争议问题清单"
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 120 }}>
              <Option value="all">全部问题</Option>
              <Option value="open">待处理</Option>
              <Option value="resolved">已解决</Option>
            </Select>
            <Select defaultValue="all" style={{ width: 140 }}>
              <Option value="all">全部类型</Option>
              <Option value="cross_session_return">跨场退货</Option>
              <Option value="duplicate_commission">佣金重复</Option>
              <Option value="missing_evidence">证据缺失</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={allIssues}
          rowKey={(r) => `${r.settlementId}-${r.issue.id}`}
          scroll={{ x: 1500 }}
          rowClassName={(record) =>
            record.settlementId === selectedSettlementId ? 'bg-blue-50' : ''
          }
          onRow={(record) => ({
            onClick: () => setSelectedSettlementId(record.settlementId),
          })}
        />
      </Card>

      <Modal
        title="问题详情"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={900}
        footer={
          selectedIssue?.status === 'open' ? (
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  resolveForm.resetFields();
                }}
                htmlType="submit"
                form="resolveForm"
              >
                标记为已解决
              </Button>
            </Space>
          ) : null
        }
        destroyOnClose
      >
        {selectedIssue && selectedSettlementIssue && (
          <div className="space-y-4">
            <Alert
              type={selectedIssue.severity === 'error' ? 'error' : 'warning'}
              showIcon
              message={
                <Space>
                  <Tag
                    color={
                      selectedIssue.type === 'cross_session_return'
                        ? 'red'
                        : selectedIssue.type === 'duplicate_commission'
                        ? 'orange'
                        : 'warning'
                    }
                  >
                    {getIssueTypeLabel(selectedIssue.type)}
                  </Tag>
                  <Tag color={getStatusColor(selectedIssue.status)}>
                    {getStatusLabel(selectedIssue.status)}
                  </Tag>
                </Space>
              }
              description={selectedIssue.description}
            />

            {renderEvidenceLocation(selectedIssue)}

            <Divider />

            {selectedIssue.status === 'open' && (
              <Form
                id="resolveForm"
                form={resolveForm}
                layout="vertical"
                onFinish={handleResolveIssue}
              >
                <Form.Item
                  name="resolution"
                  label="处理说明"
                  rules={[{ required: true, message: '请输入处理说明' }]}
                >
                  <TextArea
                    rows={3}
                    placeholder="请说明问题原因、处理方式和依据..."
                  />
                </Form.Item>
              </Form>
            )}

            {selectedIssue.resolution && (
              <Alert
                type="success"
                showIcon
                message="处理结果"
                description={selectedIssue.resolution}
              />
            )}

            <Divider />

            <div>
              <h4 className="font-medium mb-3">
                <Space>
                  <FileTextOutlined />
                  沟通备注 ({getIssueNotes(selectedSettlementIssue.settlementId, selectedIssue.id).length})
                </Space>
              </h4>
              {getIssueNotes(selectedSettlementIssue.settlementId, selectedIssue.id).length > 0 ? (
                <List
                  className="comment-list"
                  dataSource={getIssueNotes(selectedSettlementIssue.settlementId, selectedIssue.id)}
                  renderItem={(item) => (
                    <li key={item.id} className="mb-4">
                      <div className="flex gap-3">
                        <Avatar icon={<UserOutlined />} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{item.author}</span>
                            <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{item.content}</p>
                          {item.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.attachments.map((att) => (
                                <Tag key={att.id} icon={<FileImageOutlined />}>
                                  {att.name}
                                </Tag>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )}
                />
              ) : (
                <Alert type="info" showIcon message="暂无备注记录" />
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="添加备注"
        open={isNoteModalOpen}
        onOk={handleSubmitNote}
        onCancel={() => setIsNoteModalOpen(false)}
        okText="提交备注"
      >
        {selectedIssue && (
          <div className="space-y-4">
            <Alert
              type="info"
              showIcon
              message={getIssueTypeLabel(selectedIssue.type)}
              description={selectedIssue.description}
            />
            <Form form={noteForm} layout="vertical">
              <Form.Item
                name="content"
                label="备注内容"
                rules={[{ required: true, message: '请输入备注内容' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="请输入备注说明，可以补充证据、说明情况等..."
                />
              </Form.Item>
              <Form.Item label="上传凭证">
                <Upload multiple>
                  <Button icon={<UploadOutlined />}>上传附件</Button>
                </Upload>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DisputeCenter;
