
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Card, Input, Select, Tag, Button, Drawer, Descriptions, Space, Modal } from 'antd';
import { SearchOutlined, EyeOutlined, LinkOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { BillItem, PatientBill } from '../types';

const { Option } = Select;

const statusColors: Record<string, string> = {
  pending: 'blue',
  processing: 'orange',
  completed: 'green',
  exception: 'red',
};

const statusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  exception: '异常',
};

export default function PatientBills() {
  const [searchParams] = useSearchParams();
  const patientBills = useStore((state) => state.patientBills);
  const settlements = useStore((state) => state.settlements);
  const refunds = useStore((state) => state.refunds);
  const departments = useStore((state) => state.departments);

  const [searchText, setSearchText] = useState(searchParams.get('search') || '');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<PatientBill | null>(null);

  const filteredBills = useMemo(() => {
    return patientBills.filter((bill) => {
      const matchSearch =
        bill.patientName.includes(searchText) ||
        bill.hospitalNumber.includes(searchText) ||
        bill.billId.includes(searchText);
      const matchDept = deptFilter === 'all' || bill.departmentId === deptFilter;
      const matchStatus = statusFilter === 'all' || bill.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [patientBills, searchText, deptFilter, statusFilter]);

  const showDetail = (bill: PatientBill) => {
    setSelectedBill(bill);
    setDetailVisible(true);
  };

  const navigateToSettlement = (settlementId?: string) => {
    if (!settlementId) return;
    Modal.info({
      title: '关联医保结算单',
      content: (
        <div>
          <p>结算单号：{settlementId}</p>
          <p>请在左侧菜单点击"医保结算单"查看详情</p>
        </div>
      ),
    });
  };

  const getRelatedRefunds = (billId: string) => {
    return refunds.filter((r) => r.billId === billId);
  };

  const getRelatedSettlement = (settlementId?: string) => {
    if (!settlementId) return null;
    return settlements.find((s) => s.settlementId === settlementId);
  };

  const columns = [
    {
      title: '账单编号',
      dataIndex: 'billId',
      key: 'billId',
      render: (id: string) => <span className="font-mono text-blue-600">{id}</span>,
    },
    {
      title: '患者姓名',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: '住院号',
      dataIndex: 'hospitalNumber',
      key: 'hospitalNumber',
    },
    {
      title: '科室',
      dataIndex: 'departmentName',
      key: 'departmentName',
    },
    {
      title: '总费用(元)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (v: number) => v.toLocaleString(),
      sorter: (a: PatientBill, b: PatientBill) => a.totalAmount - b.totalAmount,
    },
    {
      title: '医保垫付(元)',
      dataIndex: 'insuranceAdvance',
      key: 'insuranceAdvance',
      render: (v: number) => v.toLocaleString(),
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
      render: (_: unknown, record: PatientBill) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)}>
            详情
          </Button>
          {record.settlementId && (
            <Button
              type="link"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => navigateToSettlement(record.settlementId)}
            >
              结算单
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-4 mb-4 flex-wrap">
          <Input
            placeholder="搜索患者姓名、住院号、账单号"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            value={deptFilter}
            onChange={setDeptFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="all">全部科室</Option>
            {departments.map((dept) => (
              <Option key={dept.deptId} value={dept.deptId}>
                {dept.deptName}
              </Option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="all">全部状态</Option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <Option key={key} value={key}>
                {label}
              </Option>
            ))}
          </Select>
        </div>

        <Table
          dataSource={filteredBills}
          columns={columns}
          rowKey="billId"
          rowClassName={(record) =>
            record.status === 'exception' ? 'bg-red-50 border-l-4 border-red-500' : ''
          }
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title="账单详情"
        placement="right"
        width={720}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedBill && (
          <div className="space-y-6">
            <Descriptions title="基本信息" bordered column={2}>
              <Descriptions.Item label="账单编号">{selectedBill.billId}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{selectedBill.patientName}</Descriptions.Item>
              <Descriptions.Item label="住院号">{selectedBill.hospitalNumber}</Descriptions.Item>
              <Descriptions.Item label="科室">{selectedBill.departmentName}</Descriptions.Item>
              <Descriptions.Item label="入院日期">{selectedBill.admissionDate}</Descriptions.Item>
              <Descriptions.Item label="出院日期">{selectedBill.dischargeDate}</Descriptions.Item>
              <Descriptions.Item label="总费用">
                ¥{selectedBill.totalAmount.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="医保垫付">
                ¥{selectedBill.insuranceAdvance.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={statusColors[selectedBill.status]}>
                  {statusLabels[selectedBill.status]}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Card title="费用明细" size="small">
              <Table
                dataSource={selectedBill.items}
                rowKey="itemId"
                pagination={false}
                size="small"
              >
                <Table.Column title="项目名称" dataIndex="itemName" key="itemName" />
                <Table.Column
                  title="科室编码"
                  dataIndex="departmentCode"
                  key="departmentCode"
                  render={(code, record: BillItem) => {
                    const dept = departments.find((d) => d.deptId === selectedBill.departmentId);
                    const isValid = dept?.validCodes.includes(code);
                    return (
                      <span className={isValid ? '' : 'text-red-600 font-medium'}>
                        {code}
                        {!isValid && ' (错误)'}
                      </span>
                    );
                  }}
                />
                <Table.Column
                  title="金额(元)"
                  dataIndex="amount"
                  key="amount"
                  render={(v) => v.toLocaleString()}
                />
                <Table.Column
                  title="状态"
                  dataIndex="isRejected"
                  key="isRejected"
                  render={(rejected, record: BillItem) =>
                    rejected ? (
                      <Tag color="red">拒付</Tag>
                    ) : (
                      <Tag color="green">正常</Tag>
                    )
                  }
                />
                <Table.Column title="备注" dataIndex="remark" key="remark" />
              </Table>
            </Card>

            {selectedBill.settlementId && (
              <Card title="关联医保结算单" size="small">
                {getRelatedSettlement(selectedBill.settlementId) && (
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="结算单号">
                      <span className="text-blue-600">
                        {getRelatedSettlement(selectedBill.settlementId)?.settlementId}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="提交日期">
                      {getRelatedSettlement(selectedBill.settlementId)?.submitDate}
                    </Descriptions.Item>
                    <Descriptions.Item label="医保应回款">
                      ¥{getRelatedSettlement(selectedBill.settlementId)?.expectedAmount.toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="医保实际回款">
                      ¥{getRelatedSettlement(selectedBill.settlementId)?.actualAmount.toLocaleString()}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </Card>
            )}

            {getRelatedRefunds(selectedBill.billId).length > 0 && (
              <Card title="关联退费记录" size="small">
                <Table
                  dataSource={getRelatedRefunds(selectedBill.billId)}
                  rowKey="refundId"
                  pagination={false}
                  size="small"
                >
                  <Table.Column title="退费单号" dataIndex="refundId" key="refundId" />
                  <Table.Column title="申请日期" dataIndex="applyDate" key="applyDate" />
                  <Table.Column
                    title="金额(元)"
                    dataIndex="amount"
                    key="amount"
                    render={(v) => v.toLocaleString()}
                  />
                  <Table.Column
                    title="状态"
                    dataIndex="status"
                    key="status"
                    render={(status: string) => {
                      const colorMap: Record<string, string> = {
                        applied: 'blue',
                        received: 'green',
                        delayed: 'orange',
                        rollback: 'gray',
                      };
                      const labelMap: Record<string, string> = {
                        applied: '申请中',
                        received: '已到账',
                        delayed: '晚到',
                        rollback: '已回滚',
                      };
                      return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>;
                    }}
                  />
                  <Table.Column
                    title="晚到天数"
                    dataIndex="lateDays"
                    key="lateDays"
                    render={(days) => (days && days > 0 ? <span className="text-red-600">{days}天</span> : '-')}
                  />
                </Table>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
