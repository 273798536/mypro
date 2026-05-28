
import { useState } from 'react';
import { Table, Card, Tag, Button, Drawer, Descriptions, Space, Modal, Form, Select, InputNumber, Input, message } from 'antd';
import { EyeOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { InsuranceSettlement, BillItem } from '../types';

const { TextArea } = Input;
const { Option } = Select;

const statusColors: Record<string, string> = {
  submitted: 'blue',
  partial: 'orange',
  completed: 'green',
  rejected: 'red',
};

const statusLabels: Record<string, string> = {
  submitted: '已提交',
  partial: '部分回款',
  completed: '已完成',
  rejected: '已拒付',
};

const rejectReasons = [
  '超适应症用药',
  '科室编码错误',
  '项目不在医保目录',
  '材料超标',
  '其他原因',
];

export default function InsuranceSettlements() {
  const settlements = useStore((state) => state.settlements);
  const patientBills = useStore((state) => state.patientBills);
  const addInsuranceReject = useStore((state) => state.addInsuranceReject);

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<InsuranceSettlement | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [form] = Form.useForm();

  const showDetail = (settlement: InsuranceSettlement) => {
    setSelectedSettlement(settlement);
    setDetailVisible(true);
  };

  const showRejectModal = (settlement: InsuranceSettlement) => {
    setSelectedSettlement(settlement);
    form.setFieldsValue({
      settlementId: settlement.settlementId,
    });
    setRejectModalVisible(true);
  };

  const getRelatedBill = (billId: string) => {
    return patientBills.find((b) => b.billId === billId);
  };

  const getBillItems = (billId: string) => {
    const bill = getRelatedBill(billId);
    return bill?.items || [];
  };

  const handleAddReject = (values: any) => {
    if (!selectedSettlement) return;

    const billItem = getBillItems(selectedSettlement.billId).find(
      (item) => item.itemId === values.billItemId
    );

    addInsuranceReject(selectedSettlement.settlementId, {
      billItemId: values.billItemId,
      reason: values.reason,
      position: `患者账单${selectedSettlement.billId} - ${billItem?.itemName || '未知项目'}`,
      amount: values.amount,
    });

    message.success('拒付记录已添加');
    setRejectModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: '结算单号',
      dataIndex: 'settlementId',
      key: 'settlementId',
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
        <span className="text-blue-600 cursor-pointer hover:underline">
          {id}
        </span>
      ),
    },
    {
      title: '提交日期',
      dataIndex: 'submitDate',
      key: 'submitDate',
    },
    {
      title: '医保应回款(元)',
      dataIndex: 'expectedAmount',
      key: 'expectedAmount',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '医保实际回款(元)',
      dataIndex: 'actualAmount',
      key: 'actualAmount',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '差额(元)',
      key: 'diff',
      render: (_: unknown, record: InsuranceSettlement) => {
        const diff = record.expectedAmount - record.actualAmount;
        return (
          <span className={diff > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
            {diff > 0 ? '-' : ''}{Math.abs(diff).toLocaleString()}
          </span>
        );
      },
    },
    {
      title: '拒付项数',
      key: 'rejectCount',
      render: (_: unknown, record: InsuranceSettlement) => record.rejectItems.length,
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
      render: (_: unknown, record: InsuranceSettlement) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => showRejectModal(record)}
          >
            添加拒付
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <Table
          dataSource={settlements}
          columns={columns}
          rowKey="settlementId"
          rowClassName={(record) =>
            record.rejectItems.length > 0 ? 'bg-orange-50' : ''
          }
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title="医保结算单详情"
        placement="right"
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedSettlement && (
          <div className="space-y-6">
            <Descriptions title="基本信息" bordered column={2}>
              <Descriptions.Item label="结算单号">
                {selectedSettlement.settlementId}
              </Descriptions.Item>
              <Descriptions.Item label="患者姓名">
                {selectedSettlement.patientName}
              </Descriptions.Item>
              <Descriptions.Item label="关联账单">
                <span className="text-blue-600">{selectedSettlement.billId}</span>
              </Descriptions.Item>
              <Descriptions.Item label="提交日期">
                {selectedSettlement.submitDate}
              </Descriptions.Item>
              <Descriptions.Item label="实际回款日期">
                {selectedSettlement.actualReceiveDate || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[selectedSettlement.status]}>
                  {statusLabels[selectedSettlement.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="医保应回款">
                ¥{selectedSettlement.expectedAmount.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="医保实际回款">
                ¥{selectedSettlement.actualAmount.toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            {selectedSettlement.rejectItems.length > 0 && (
              <Card
                title={
                  <span className="text-red-600">
                    拒付明细（共{selectedSettlement.rejectItems.length}项）
                  </span>
                }
                size="small"
                className="border-red-200"
              >
                <Table
                  dataSource={selectedSettlement.rejectItems}
                  rowKey="rejectId"
                  pagination={false}
                  size="small"
                >
                  <Table.Column
                    title="拒付单号"
                    dataIndex="rejectId"
                    key="rejectId"
                    width={100}
                  />
                  <Table.Column
                    title="关联账单项"
                    dataIndex="billItemId"
                    key="billItemId"
                    width={100}
                  />
                  <Table.Column title="拒付原因" dataIndex="reason" key="reason" />
                  <Table.Column
                    title="拒付金额(元)"
                    dataIndex="amount"
                    key="amount"
                    render={(v) => v.toLocaleString()}
                    width={120}
                  />
                  <Table.Column
                    title="具体位置"
                    dataIndex="position"
                    key="position"
                    ellipsis
                  />
                </Table>
              </Card>
            )}

            <Card title="关联患者账单费用明细" size="small">
              <Table
                dataSource={getBillItems(selectedSettlement.billId)}
                rowKey="itemId"
                pagination={false}
                size="small"
              >
                <Table.Column title="项目ID" dataIndex="itemId" key="itemId" width={80} />
                <Table.Column title="项目名称" dataIndex="itemName" key="itemName" />
                <Table.Column
                  title="科室编码"
                  dataIndex="departmentCode"
                  key="departmentCode"
                  width={100}
                />
                <Table.Column
                  title="金额(元)"
                  dataIndex="amount"
                  key="amount"
                  render={(v) => v.toLocaleString()}
                  width={100}
                />
                <Table.Column
                  title="状态"
                  dataIndex="isRejected"
                  key="isRejected"
                  width={80}
                  render={(rejected) =>
                    rejected ? (
                      <Tag color="red">已拒付</Tag>
                    ) : (
                      <Tag color="green">正常</Tag>
                    )
                  }
                />
              </Table>
            </Card>
          </div>
        )}
      </Drawer>

      <Modal
        title="添加医保拒付记录"
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddReject}
        >
          <Form.Item name="settlementId" label="结算单号">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="billItemId"
            label="选择拒付项目"
            rules={[{ required: true, message: '请选择拒付项目' }]}
          >
            <Select placeholder="请选择费用项目">
              {selectedSettlement &&
                getBillItems(selectedSettlement.billId)
                  .filter((item) => !item.isRejected)
                  .map((item: BillItem) => (
                    <Option key={item.itemId} value={item.itemId}>
                      {item.itemName} - ¥{item.amount.toLocaleString()}
                    </Option>
                  ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="拒付原因"
            rules={[{ required: true, message: '请选择拒付原因' }]}
          >
            <Select placeholder="请选择拒付原因">
              {rejectReasons.map((reason) => (
                <Option key={reason} value={reason}>
                  {reason}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="拒付金额(元)"
            rules={[{ required: true, message: '请输入拒付金额' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="position" label="具体位置说明">
            <TextArea rows={2} placeholder="请说明具体在单据中的位置" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
