import React, { useState, useMemo } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Select,
  Alert,
  Badge,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  FileImageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '../store';
import type { Order } from '../types';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
  detectCrossSessionReturns,
  detectDuplicateCommissions,
  detectMissingEvidence,
} from '../utils/settlement';

const { Option } = Select;

const OrderManagement: React.FC = () => {
  const { orders } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterIssues, setFilterIssues] = useState<string>('all');
  const [form] = Form.useForm();

  const orderIssues = useMemo(() => {
    const crossSession = detectCrossSessionReturns(orders);
    const duplicates = detectDuplicateCommissions(orders);
    const missing = detectMissingEvidence(orders);

    const issueMap = new Map<string, string[]>();
    crossSession.forEach((o) => {
      const existing = issueMap.get(o.id) || [];
      issueMap.set(o.id, [...existing, '跨场退货']);
    });
    duplicates.forEach((o) => {
      const existing = issueMap.get(o.id) || [];
      issueMap.set(o.id, [...existing, '佣金重复']);
    });
    missing.forEach((o) => {
      const existing = issueMap.get(o.id) || [];
      issueMap.set(o.id, [...existing, '证据缺失']);
    });
    return issueMap;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterStatus !== 'all' && order.status !== filterStatus) return false;
      if (filterIssues !== 'all') {
        const issues = orderIssues.get(order.id) || [];
        if (filterIssues === 'has_issues' && issues.length === 0) return false;
        if (filterIssues === 'no_issues' && issues.length > 0) return false;
      }
      return true;
    });
  }, [orders, filterStatus, filterIssues, orderIssues]);

  const issueStats = useMemo(() => {
    const crossSessionCount = detectCrossSessionReturns(orders).length;
    const duplicateCount = detectDuplicateCommissions(orders).length;
    const missingCount = detectMissingEvidence(orders).length;
    return { crossSessionCount, duplicateCount, missingCount };
  }, [orders]);

  const columns: ColumnsType<Order> = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
      render: (text, record) => {
        const issues = orderIssues.get(record.id) || [];
        return (
          <Space>
            <span className="font-mono">{text}</span>
            {issues.length > 0 && (
              <Badge
                count={issues.length}
                size="small"
                color="red"
              />
            )}
          </Space>
        );
      },
    },
    {
      title: '直播场次',
      dataIndex: 'sessionNo',
      key: 'sessionNo',
      width: 150,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span>{text}</span>
          {record.isCrossSessionReturn && record.returnSessionNo && (
            <Tooltip title="跨场退货：退货发生在另一场直播">
              <Tag color="red" className="text-xs">
                退货场: {record.returnSessionNo}
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '达人',
      dataIndex: 'influencerName',
      key: 'influencerName',
      width: 120,
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '订单金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      render: (value) => formatCurrency(value),
    },
    {
      title: '佣金',
      dataIndex: 'commission',
      key: 'commission',
      width: 100,
      render: (value) => formatCurrency(value),
    },
    {
      title: '下单时间',
      dataIndex: 'orderTime',
      key: 'orderTime',
      width: 150,
      render: (value) => formatDate(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '归因',
      key: 'attribution',
      width: 100,
      render: (_, record) => (
        <Space>
          {record.attributed && record.attributionEvidence ? (
            <Tooltip title={record.attributionEvidence}>
              <CheckCircleOutlined className="text-green-500" />
              <span className="text-green-500 text-xs">已归因</span>
            </Tooltip>
          ) : (
            <Tooltip title="缺少直播归因证据">
              <CloseCircleOutlined className="text-orange-500" />
              <span className="text-orange-500 text-xs">待补充</span>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '问题标记',
      key: 'issues',
      width: 150,
      render: (_, record) => {
        const issues = orderIssues.get(record.id) || [];
        return (
          <Space wrap>
            {issues.map((issue) => (
              <Tag
                key={issue}
                color={
                  issue === '跨场退货'
                    ? 'red'
                    : issue === '佣金重复'
                    ? 'orange'
                    : 'warning'
                }
                icon={
                  issue === '跨场退货' || issue === '佣金重复' ? (
                    <ExclamationCircleOutlined />
                  ) : undefined
                }
              >
                {issue}
              </Tag>
            ))}
            {issues.length === 0 && (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                正常
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<SearchOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    form.setFieldsValue(order);
    setIsModalOpen(true);
  };

  const handleAddEvidence = () => {
    console.log('补充证据');
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-4">
      <Card size="small">
        <Space wrap className="w-full">
          <Alert
            message="问题订单概览"
            type="warning"
            showIcon
            description={
              <Space className="mt-2" wrap>
                <Tag color="red">
                  跨场退货: {issueStats.crossSessionCount} 笔
                </Tag>
                <Tag color="orange">
                  佣金重复: {issueStats.duplicateCount} 笔
                </Tag>
                <Tag color="warning">
                  证据缺失: {issueStats.missingCount} 笔
                </Tag>
              </Space>
            }
          />
        </Space>
      </Card>

      <Card
        title="直播订单管理"
        extra={
          <Space wrap>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="completed">已完成</Option>
              <Option value="returned">已退货</Option>
              <Option value="refunded">已退款</Option>
              <Option value="shipped">已发货</Option>
            </Select>
            <Select
              value={filterIssues}
              onChange={setFilterIssues}
              style={{ width: 140 }}
            >
              <Option value="all">全部订单</Option>
              <Option value="has_issues">有问题订单</Option>
              <Option value="no_issues">正常订单</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          scroll={{ x: 1300 }}
          rowClassName={(record) => {
            const issues = orderIssues.get(record.id) || [];
            if (issues.includes('跨场退货')) return 'bg-red-50';
            if (issues.includes('佣金重复')) return 'bg-orange-50';
            if (issues.includes('证据缺失')) return 'bg-yellow-50';
            return '';
          }}
        />
      </Card>

      <Modal
        title="订单详情"
        open={isModalOpen}
        onOk={handleAddEvidence}
        onCancel={() => setIsModalOpen(false)}
        okText="补充归因证据"
        width={700}
      >
        {selectedOrder && (
          <div className="space-y-4">
            {(orderIssues.get(selectedOrder.id) || []).length > 0 && (
              <Alert
                type="error"
                showIcon
                title="该订单存在以下问题"
                description={
                  <ul className="list-disc pl-4">
                    {(orderIssues.get(selectedOrder.id) || []).map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-500 text-sm">订单编号</label>
                <p className="font-mono font-medium">{selectedOrder.orderNo}</p>
              </div>
              <div>
                <label className="text-gray-500 text-sm">达人</label>
                <p>{selectedOrder.influencerName}</p>
              </div>
              <div>
                <label className="text-gray-500 text-sm">下单场次</label>
                <p>
                  <LinkOutlined className="mr-1" />
                  {selectedOrder.sessionNo}
                </p>
              </div>
              {selectedOrder.isCrossSessionReturn && (
                <div>
                  <label className="text-gray-500 text-sm">退货场次</label>
                  <p className="text-red-500">
                    <ExclamationCircleOutlined className="mr-1" />
                    {selectedOrder.returnSessionNo} (跨场)
                  </p>
                </div>
              )}
              <div>
                <label className="text-gray-500 text-sm">商品</label>
                <p>{selectedOrder.productName}</p>
              </div>
              <div>
                <label className="text-gray-500 text-sm">订单金额</label>
                <p>{formatCurrency(selectedOrder.amount)}</p>
              </div>
              <div>
                <label className="text-gray-500 text-sm">佣金</label>
                <p>{formatCurrency(selectedOrder.commission)}</p>
              </div>
              <div>
                <label className="text-gray-500 text-sm">佣金比例</label>
                <p>{(selectedOrder.commissionRate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <label className="text-gray-500 text-sm">下单时间</label>
                <p>{formatDate(selectedOrder.orderTime)}</p>
              </div>
              {selectedOrder.returnTime && (
                <div>
                  <label className="text-gray-500 text-sm">退货时间</label>
                  <p className="text-red-500">
                    {formatDate(selectedOrder.returnTime)}
                  </p>
                </div>
              )}
              <div>
                <label className="text-gray-500 text-sm">状态</label>
                <p>
                  <Tag color={getStatusColor(selectedOrder.status)}>
                    {getStatusLabel(selectedOrder.status)}
                  </Tag>
                </p>
              </div>
              <div>
                <label className="text-gray-500 text-sm">归因证据</label>
                <p>
                  {selectedOrder.attributionEvidence ? (
                    <span className="text-green-600">
                      <FileImageOutlined className="mr-1" />
                      {selectedOrder.attributionEvidence}
                    </span>
                  ) : (
                    <span className="text-orange-500">
                      <ExclamationCircleOutlined className="mr-1" />
                      缺少归因截图
                    </span>
                  )}
                </p>
              </div>
            </div>

            {selectedOrder.isCrossSessionReturn && (
              <Alert
                type="error"
                showIcon
                message="跨场退货说明"
                description={`该订单于 ${formatDate(selectedOrder.orderTime)} 在直播 ${selectedOrder.sessionNo} 下单，后于 ${formatDate(selectedOrder.returnTime!)} 在直播 ${selectedOrder.returnSessionNo} 申请退货。根据合同条款，需额外扣除坑位费。`}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderManagement;
