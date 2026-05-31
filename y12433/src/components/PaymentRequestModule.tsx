import React, { useState, useMemo } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Descriptions,
  Divider,
  Alert,
  message,
  Statistic,
  Row,
  Col,
  Timeline,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  UploadOutlined,
  HistoryOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import type { PaymentRequest } from '../types';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
} from '../utils/settlement';

const { Option } = Select;
const { TextArea } = Input;

const PaymentRequestModule: React.FC = () => {
  const {
    paymentRequests,
    settlements,
    contracts,
    addPaymentRequest,
    updatePaymentRequest,
  } = useAppStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<PaymentRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<PaymentRequest | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const paymentStats = useMemo(() => {
    const total = paymentRequests.reduce((sum, r) => sum + r.currentRequest, 0);
    const paid = paymentRequests
      .filter((r) => r.status === 'paid')
      .reduce((sum, r) => sum + r.currentRequest, 0);
    const pending = paymentRequests
      .filter((r) => r.status === 'draft' || r.status === 'reviewing')
      .reduce((sum, r) => sum + r.currentRequest, 0);
    return { total, paid, pending, count: paymentRequests.length };
  }, [paymentRequests]);

  const getSettlementPayments = (settlementId: string) => {
    return paymentRequests.filter((r) => r.settlementId === settlementId);
  };

  const columns: ColumnsType<PaymentRequest> = [
    {
      title: '申请单号',
      dataIndex: 'requestNo',
      key: 'requestNo',
      width: 150,
      render: (text) => <a className="font-mono">{text}</a>,
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
      width: 150,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '关联合同',
      dataIndex: 'contractNo',
      key: 'contractNo',
      width: 150,
      render: (text) => <span className="font-mono">{text}</span>,
    },
    {
      title: '应付总额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (value) => formatCurrency(value),
    },
    {
      title: '已付金额',
      dataIndex: 'previousPaid',
      key: 'previousPaid',
      width: 130,
      render: (value) => (
        <span className={value > 0 ? 'text-green-600' : ''}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: '本次申请',
      dataIndex: 'currentRequest',
      key: 'currentRequest',
      width: 130,
      render: (value) => (
        <span className="font-semibold text-blue-600">{formatCurrency(value)}</span>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (value) => <Tag icon={<HistoryOutlined />}>v{value}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
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
            查看
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingRequest(null);
    createForm.resetFields();
    setIsCreateModalOpen(true);
  };

  const handleEdit = (request: PaymentRequest) => {
    setEditingRequest(request);
    editForm.setFieldsValue({
      ...request,
    });
    setIsVersionModalOpen(true);
  };

  const handleViewDetail = (request: PaymentRequest) => {
    setViewingRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      const settlement = settlements.find((s) => s.id === values.settlementId);
      if (!settlement) return;

      const contract = contracts.find((c) => c.id === settlement.contractId);
      if (!contract) return;

      const previousPayments = getSettlementPayments(values.settlementId);
      const previousPaid = previousPayments
        .filter((r) => r.status === 'paid' || r.status === 'approved')
        .reduce((sum, r) => sum + r.currentRequest, 0);

      const remaining = settlement.netPayable - previousPaid;
      const currentRequest = Math.min(values.currentRequest, remaining);

      if (currentRequest <= 0) {
        message.error('该清算单已无剩余可申请金额');
        return;
      }

      const newRequest: PaymentRequest = {
        id: `pay-${Date.now()}`,
        requestNo: `FK-${dayjs().format('YYYY-MM')}-${String(paymentRequests.length + 1).padStart(3, '0')}`,
        settlementId: settlement.id,
        settlementNo: settlement.settlementNo,
        contractId: contract.id,
        contractNo: contract.contractNo,
        influencerId: settlement.influencerId,
        influencerName: settlement.influencerName,
        amount: settlement.netPayable,
        previousPaid,
        currentRequest,
        status: 'draft',
        paymentMethod: values.paymentMethod,
        bankAccount: values.bankAccount,
        remarks: values.remarks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        attachments: [],
      };

      addPaymentRequest(newRequest);
      setIsCreateModalOpen(false);
      createForm.resetFields();
      message.success('付款申请创建成功');
    } catch (error) {
      console.error('Create failed:', error);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRequest) return;
    try {
      const values = await editForm.validateFields();
      const settlement = settlements.find((s) => s.id === editingRequest.settlementId);
      if (!settlement) return;

      const previousPayments = getSettlementPayments(editingRequest.settlementId).filter(
        (r) => r.id !== editingRequest.id
      );
      const previousPaid = previousPayments
        .filter((r) => r.status === 'paid' || r.status === 'approved')
        .reduce((sum, r) => sum + r.currentRequest, 0);

      const remaining = settlement.netPayable - previousPaid;
      const currentRequest = Math.min(values.currentRequest, remaining);

      if (currentRequest <= 0) {
        message.error('该清算单已无剩余可申请金额');
        return;
      }

      const updatedRequest: PaymentRequest = {
        ...editingRequest,
        currentRequest,
        paymentMethod: values.paymentMethod,
        bankAccount: values.bankAccount,
        remarks: values.remarks,
        updatedAt: new Date().toISOString(),
        version: editingRequest.version + 1,
      };

      updatePaymentRequest(updatedRequest);
      setIsVersionModalOpen(false);
      message.success(`已更新为 v${updatedRequest.version} 版本`);
    } catch (error) {
      console.error('Edit failed:', error);
    }
  };

  const handleSettlementChange = (settlementId: string) => {
    const settlement = settlements.find((s) => s.id === settlementId);
    if (settlement) {
      const previousPayments = getSettlementPayments(settlementId);
      const previousPaid = previousPayments
        .filter((r) => r.status === 'paid' || r.status === 'approved')
        .reduce((sum, r) => sum + r.currentRequest, 0);
      const remaining = settlement.netPayable - previousPaid;
      createForm.setFieldsValue({
        currentRequest: remaining,
        previousPaid,
        amount: settlement.netPayable,
      });
    }
  };

  const renderPaymentTimeline = (settlementId: string) => {
    const payments = getSettlementPayments(settlementId).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (payments.length === 0) {
      return <Alert type="info" showIcon message="暂无付款记录" />;
    }

    return (
      <Timeline>
        {payments.map((payment, index) => (
          <Timeline.Item
            key={payment.id}
            color={
              payment.status === 'paid'
                ? 'green'
                : payment.status === 'approved'
                ? 'blue'
                : payment.status === 'rejected'
                ? 'red'
                : 'gray'
            }
          >
            <div>
              <Space>
                <span className="font-medium">{payment.requestNo}</span>
                <Tag color={getStatusColor(payment.status)}>
                  {getStatusLabel(payment.status)}
                </Tag>
                <Tag>v{payment.version}</Tag>
              </Space>
              <div className="mt-1">
                <span className="text-green-600 font-semibold">
                  {formatCurrency(payment.currentRequest)}
                </span>
                <span className="text-gray-400 text-sm ml-2">
                  ({formatDate(payment.createdAt)})
                </span>
              </div>
              {payment.remarks && (
                <div className="text-sm text-gray-500 mt-1">
                  备注：{payment.remarks}
                </div>
              )}
              {index < payments.length - 1 && (
                <div className="text-xs text-gray-400 mt-1">
                  累计已付：
                  {formatCurrency(
                    payments
                      .slice(0, index + 1)
                      .filter((r) => r.status === 'paid' || r.status === 'approved')
                      .reduce((sum, r) => sum + r.currentRequest, 0)
                  )}
                </div>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="申请总数"
              value={paymentStats.count}
              suffix="笔"
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="申请总金额"
              value={paymentStats.total}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已支付"
              value={paymentStats.paid}
              precision={2}
              prefix={
                <Space>
                  <CheckCircleOutlined />
                  ¥
                </Space>
              }
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待支付"
              value={paymentStats.pending}
              precision={2}
              prefix={
                <Space>
                  <ExclamationCircleOutlined />
                  ¥
                </Space>
              }
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="付款申请列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增申请
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={paymentRequests}
          rowKey="id"
          scroll={{ x: 1500 }}
        />
      </Card>

      <Modal
        title="新增付款申请"
        open={isCreateModalOpen}
        onOk={handleCreateSubmit}
        onCancel={() => setIsCreateModalOpen(false)}
        width={700}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="settlementId"
            label="选择清算单"
            rules={[{ required: true, message: '请选择清算单' }]}
          >
            <Select
              placeholder="请选择关联的清算单"
              onChange={handleSettlementChange}
            >
              {settlements.map((s) => {
                const previousPayments = getSettlementPayments(s.id);
                const previousPaid = previousPayments
                  .filter((r) => r.status === 'paid' || r.status === 'approved')
                  .reduce((sum, r) => sum + r.currentRequest, 0);
                const remaining = s.netPayable - previousPaid;
                return (
                  <Option key={s.id} value={s.id} disabled={remaining <= 0}>
                    {s.settlementNo} - {s.influencerName} (剩余:{' '}
                    {formatCurrency(remaining)})
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="amount" label="应付总额">
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `¥ ${value}`}
                  parser={(value) => (Number(value?.replace(/\¥\s?/g, '')) || 0) as number}
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="previousPaid" label="已付金额">
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `¥ ${value}`}
                  parser={(value) => (Number(value?.replace(/\¥\s?/g, '')) || 0) as number}
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="currentRequest"
                label="本次申请金额"
                rules={[{ required: true, message: '请输入申请金额' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `¥ ${value}`}
                  parser={(value) => (Number(value?.replace(/\¥\s?/g, '')) || 0) as number}
                  min={0 as number}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paymentMethod"
                label="付款方式"
                rules={[{ required: true, message: '请选择付款方式' }]}
                initialValue="银行转账"
              >
                <Select>
                  <Option value="银行转账">银行转账</Option>
                  <Option value="支付宝">支付宝</Option>
                  <Option value="微信支付">微信支付</Option>
                  <Option value="对公转账">对公转账</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bankAccount"
                label="收款账户"
                rules={[{ required: true, message: '请输入收款账户' }]}
              >
                <Input placeholder="如：招商银行 6226 **** 8888" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remarks" label="备注说明">
            <TextArea rows={3} placeholder="请输入付款备注说明..." />
          </Form.Item>

          <Form.Item label="上传附件">
            <Upload multiple>
              <Button icon={<UploadOutlined />}>上传凭证</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑付款申请"
        open={isVersionModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => setIsVersionModalOpen(false)}
        width={700}
        destroyOnClose
      >
        {editingRequest && (
          <div className="space-y-4">
            <Alert
              type="info"
              showIcon
              message={`当前版本 v${editingRequest.version}，保存后将生成新版本`}
            />
            <Form form={editForm} layout="vertical">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="应付总额">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `¥ ${value}`}
                      parser={(value) => (Number(value?.replace(/\¥\s?/g, '')) || 0) as number}
                      value={editingRequest.amount}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="已付金额">
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `¥ ${value}`}
                      parser={(value) => (Number(value?.replace(/\¥\s?/g, '')) || 0) as number}
                      value={editingRequest.previousPaid}
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="currentRequest"
                    label="本次申请金额"
                    rules={[{ required: true, message: '请输入申请金额' }]}
                    initialValue={editingRequest.currentRequest}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={(value) => `¥ ${value}`}
                      parser={(value) => (Number(value?.replace(/\¥\s?/g, '')) || 0) as number}
                      min={0 as number}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="paymentMethod"
                    label="付款方式"
                    rules={[{ required: true, message: '请选择付款方式' }]}
                    initialValue={editingRequest.paymentMethod}
                  >
                    <Select>
                      <Option value="银行转账">银行转账</Option>
                      <Option value="支付宝">支付宝</Option>
                      <Option value="微信支付">微信支付</Option>
                      <Option value="对公转账">对公转账</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="bankAccount"
                    label="收款账户"
                    rules={[{ required: true, message: '请输入收款账户' }]}
                    initialValue={editingRequest.bankAccount}
                  >
                    <Input placeholder="如：招商银行 6226 **** 8888" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="remarks"
                label="备注说明"
                initialValue={editingRequest.remarks}
              >
                <TextArea rows={3} placeholder="请输入付款备注说明..." />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title="付款申请详情"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {viewingRequest && (
          <div className="space-y-4">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="申请单号">
                {viewingRequest.requestNo}
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                <Tag>v{viewingRequest.version}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(viewingRequest.status)}>
                  {getStatusLabel(viewingRequest.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="达人">
                {viewingRequest.influencerName}
              </Descriptions.Item>
              <Descriptions.Item label="关联清算单">
                {viewingRequest.settlementNo}
              </Descriptions.Item>
              <Descriptions.Item label="关联合同">
                {viewingRequest.contractNo}
              </Descriptions.Item>
              <Descriptions.Item label="应付总额">
                <span className="font-semibold">
                  {formatCurrency(viewingRequest.amount)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="已付金额">
                <span className="text-green-600">
                  {formatCurrency(viewingRequest.previousPaid)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="本次申请">
                <span className="font-semibold text-blue-600">
                  {formatCurrency(viewingRequest.currentRequest)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="剩余应付">
                <span className="text-orange-500">
                  {formatCurrency(
                    viewingRequest.amount -
                      viewingRequest.previousPaid -
                      (viewingRequest.status === 'paid' || viewingRequest.status === 'approved'
                        ? viewingRequest.currentRequest
                        : 0)
                  )}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="付款方式">
                {viewingRequest.paymentMethod}
              </Descriptions.Item>
              <Descriptions.Item label="收款账户">
                {viewingRequest.bankAccount}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={1}>
                {formatDate(viewingRequest.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间" span={1}>
                {formatDate(viewingRequest.updatedAt)}
              </Descriptions.Item>
              {viewingRequest.remarks && (
                <Descriptions.Item label="备注" span={2}>
                  {viewingRequest.remarks}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <div>
              <h4 className="font-medium mb-3">
                <Space>
                  <DollarOutlined />
                  该清算单付款历史
                </Space>
              </h4>
              {renderPaymentTimeline(viewingRequest.settlementId)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentRequestModule;
