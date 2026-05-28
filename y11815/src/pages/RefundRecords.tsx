
import { useState } from 'react';
import { Table, Card, Tag, Button, Space, Modal, message, DatePicker } from 'antd';
import { CheckCircleOutlined, RollbackOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { RefundRecord } from '../types';
import dayjs from 'dayjs';

const { confirm } = Modal;

const statusColors: Record<string, string> = {
  applied: 'blue',
  received: 'green',
  delayed: 'orange',
  rollback: 'gray',
};

const statusLabels: Record<string, string> = {
  applied: '申请中',
  received: '已到账',
  delayed: '晚到',
  rollback: '已回滚',
};

export default function RefundRecords() {
  const refunds = useStore((state) => state.refunds);
  const patientBills = useStore((state) => state.patientBills);
  const markRefundReceived = useStore((state) => state.markRefundReceived);
  const rollbackRefund = useStore((state) => state.rollbackRefund);

  const [selectDate, setSelectDate] = useState<dayjs.Dayjs | null>(null);
  const [markingRefundId, setMarkingRefundId] = useState<string | null>(null);

  const getRelatedBill = (billId: string) => {
    return patientBills.find((b) => b.billId === billId);
  };

  const handleMarkReceived = (record: RefundRecord) => {
    if (!selectDate) {
      message.warning('请选择到账日期');
      return;
    }
    markRefundReceived(record.refundId, selectDate.format('YYYY-MM-DD'));
    message.success('退费已标记为到账，账本数据已更新');
    setMarkingRefundId(null);
    setSelectDate(null);
  };

  const handleRollback = (record: RefundRecord) => {
    confirm({
      title: '确认回滚退费',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>退费单号：{record.refundId}</p>
          <p>患者姓名：{record.patientName}</p>
          <p>退费金额：¥{record.amount.toLocaleString()}</p>
          <p className="text-orange-600 mt-2">
            回滚后将恢复未到账状态，账本数据会重新计算
          </p>
        </div>
      ),
      okText: '确认回滚',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        rollbackRefund(record.refundId);
        message.success('退费已回滚，账本数据已更新');
      },
    });
  };

  const columns = [
    {
      title: '退费单号',
      dataIndex: 'refundId',
      key: 'refundId',
      render: (id: string) => <span className="font-mono text-blue-600">{id}</span>,
    },
    {
      title: '患者姓名',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: '关联账单',
      dataIndex: 'billId',
      key: 'billId',
      render: (id: string) => (
        <span className="text-blue-600 cursor-pointer hover:underline">{id}</span>
      ),
    },
    {
      title: '科室',
      dataIndex: 'billId',
      key: 'department',
      render: (billId: string) => getRelatedBill(billId)?.departmentName || '-',
    },
    {
      title: '申请日期',
      dataIndex: 'applyDate',
      key: 'applyDate',
      sorter: (a: RefundRecord, b: RefundRecord) =>
        dayjs(a.applyDate).unix() - dayjs(b.applyDate).unix(),
    },
    {
      title: '实际到账日期',
      dataIndex: 'actualDate',
      key: 'actualDate',
      render: (date?: string) => date || '-',
    },
    {
      title: '退费金额(元)',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => v.toLocaleString(),
      sorter: (a: RefundRecord, b: RefundRecord) => a.amount - b.amount,
    },
    {
      title: '晚到天数',
      dataIndex: 'lateDays',
      key: 'lateDays',
      render: (days: number | undefined, record: RefundRecord) => {
        if (record.status === 'received' || record.status === 'rollback') return '-';
        const calcDays = days || 0;
        return calcDays > 0 ? (
          <Tag color="red" icon={<ExclamationCircleOutlined />}>
            晚到{calcDays}天
          </Tag>
        ) : (
          <Tag color="blue">正常</Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: RefundRecord) => (
        <Space>
          {record.status === 'delayed' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => setMarkingRefundId(record.refundId)}
            >
              标记到账
            </Button>
          )}
          {record.status === 'received' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<RollbackOutlined />}
              onClick={() => handleRollback(record)}
            >
              回滚
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const delayedCount = refunds.filter((r) => r.status === 'delayed').length;
  const delayedAmount = refunds
    .filter((r) => r.status === 'delayed')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-4">
      {delayedCount > 0 && (
        <Card className="bg-orange-50 border-orange-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationCircleOutlined className="text-orange-500 mr-2 text-xl" />
              <span className="font-medium text-orange-700">
                有 {delayedCount} 笔退费晚到，涉及金额 ¥{delayedAmount.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-orange-600">
              请及时跟进，避免影响科室核算
            </div>
          </div>
        </Card>
      )}

      {markingRefundId && (
        <Card className="bg-blue-50 border-blue-300">
          <div className="flex items-center gap-4">
            <span className="font-medium">选择到账日期：</span>
            <DatePicker
              value={selectDate}
              onChange={setSelectDate}
              style={{ width: 200 }}
            />
            <Button
              type="primary"
              onClick={() => {
                const refund = refunds.find((r) => r.refundId === markingRefundId);
                if (refund) handleMarkReceived(refund);
              }}
            >
              确认标记到账
            </Button>
            <Button onClick={() => setMarkingRefundId(null)}>取消</Button>
          </div>
        </Card>
      )}

      <Card>
        <Table
          dataSource={refunds}
          columns={columns}
          rowKey="refundId"
          rowClassName={(record) =>
            record.status === 'delayed' ? 'bg-orange-50 border-l-4 border-orange-500' : ''
          }
          expandable={{
            expandedRowRender: (record) => (
              <div className="pl-4 py-2 bg-gray-50 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">退费单号：</span>
                    <span className="font-mono">{record.refundId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">关联账单：</span>
                    <span className="text-blue-600">{record.billId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">申请日期：</span>
                    <span>{record.applyDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">到账日期：</span>
                    <span>{record.actualDate || '未到账'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">退费金额：</span>
                    <span className="font-semibold">¥{record.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">当前状态：</span>
                    <Tag color={statusColors[record.status]}>{statusLabels[record.status]}</Tag>
                  </div>
                </div>
                {record.lateDays && record.lateDays > 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-red-600 text-sm">
                    <ExclamationCircleOutlined className="mr-1" />
                    该退费已晚到 {record.lateDays} 天，请尽快核实处理
                  </div>
                )}
              </div>
            ),
          }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card title="操作说明" size="small">
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>标记到账：</strong>
            选择到账日期后确认，系统自动更新退费状态并重新计算垫付账本
          </p>
          <p>
            <strong>回滚操作：</strong>
            若误标记到账，可执行回滚操作，退费恢复为未到账状态，账本数据同步更新
          </p>
          <p>
            <strong>晚到判定：</strong>
            申请日期超过7天未到账自动标记为晚到，显示晚到天数提醒
          </p>
          <p className="text-orange-600">
            * 所有操作都会实时影响垫付账本和追偿报告数据，请谨慎操作
          </p>
        </div>
      </Card>
    </div>
  );
}
