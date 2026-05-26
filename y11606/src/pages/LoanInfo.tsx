import { useState } from 'react';
import { Card, Form, Input, InputNumber, DatePicker, Select, Button, Table, Modal, message, Tabs, Tag, Space, Popconfirm } from 'antd';
import { Plus, Edit2, Trash2, Download, Upload, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store';
import { generateRepaymentSchedule, generateId } from '@/utils/calculator';
import { exportScheduleToExcel } from '@/utils/export';
import type { LoanBaseInfo, RateAdjustment, RepaymentItem, PenaltyRule } from '@/types';

const { Option } = Select;
const { TextArea } = Input;

export default function LoanInfo() {
  const [form] = Form.useForm();
  const {
    loanInfo,
    repaymentSchedule,
    rateAdjustments,
    penaltyRule,
    setLoanInfo,
    setRepaymentSchedule,
    updateRepaymentItem,
    addRateAdjustment,
    removeRateAdjustment,
    setPenaltyRule,
  } = useAppStore();

  const [editModal, setEditModal] = useState<{ open: boolean; item: RepaymentItem | null }>({ open: false, item: null });
  const [editForm] = Form.useForm();
  const [rateModal, setRateModal] = useState(false);
  const [rateForm] = Form.useForm();
  const [penaltyModal, setPenaltyModal] = useState(false);
  const [penaltyForm] = Form.useForm();

  const handleSaveLoanInfo = (values: any) => {
    const info: LoanBaseInfo = {
      id: loanInfo?.id || generateId(),
      borrowerName: values.borrowerName,
      loanAmount: values.loanAmount,
      loanTerm: values.loanTerm,
      interestRate: values.interestRate,
      repaymentMethod: values.repaymentMethod,
      disbursementDate: values.disbursementDate.format('yyyy-MM-dd'),
      firstRepaymentDate: values.firstRepaymentDate.format('yyyy-MM-dd'),
      repricingDate: values.repricingDate.format('yyyy-MM-dd'),
      repricingCycle: values.repricingCycle,
      contractNumber: values.contractNumber,
      source: '贷款合同录入',
      createdAt: loanInfo?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLoanInfo(info);
    message.success('贷款基础信息已保存');
  };

  const handleGenerateSchedule = () => {
    if (!loanInfo) {
      message.warning('请先保存贷款基础信息');
      return;
    }
    const schedule = generateRepaymentSchedule(loanInfo, rateAdjustments);
    setRepaymentSchedule(schedule);
    message.success(`已生成 ${schedule.length} 期还款计划`);
  };

  const handleEditItem = () => {
    editForm.validateFields().then((values) => {
      if (editModal.item) {
        updateRepaymentItem(editModal.item.period, values, values.correctionNote);
        setEditModal({ open: false, item: null });
        editForm.resetFields();
        message.success('已修正并记录操作痕迹');
      }
    });
  };

  const handleAddRateAdjustment = () => {
    rateForm.validateFields().then((values) => {
      addRateAdjustment({
        effectiveDate: values.effectiveDate.format('yyyy-MM-dd'),
        oldRate: values.oldRate,
        newRate: values.newRate,
        basis: values.basis,
        spread: values.spread,
        source: values.source,
        note: values.note,
      });
      setRateModal(false);
      rateForm.resetFields();
      message.success('利率调整记录已添加');
    });
  };

  const handleSavePenaltyRule = () => {
    penaltyForm.validateFields().then((values) => {
      const rule: PenaltyRule = {
        type: values.type,
        value: values.value,
        freePeriod: values.freePeriod,
        minAmount: values.minAmount,
        maxAmount: values.maxAmount,
        specialClauses: values.specialClauses,
        source: values.source,
      };
      setPenaltyRule(rule);
      setPenaltyModal(false);
      penaltyForm.resetFields();
      message.success('违约金规则已保存');
    });
  };

  const scheduleColumns: ColumnsType<RepaymentItem> = [
    { title: '期数', dataIndex: 'period', width: 70 },
    { title: '应还日期', dataIndex: 'dueDate', width: 110 },
    { title: '应还本金', dataIndex: 'principal', width: 100, render: (v) => `¥${v.toLocaleString()}` },
    { title: '应还利息', dataIndex: 'interest', width: 100, render: (v) => `¥${v.toLocaleString()}` },
    { title: '应还总额', dataIndex: 'totalPayment', width: 110, render: (v) => `¥${v.toLocaleString()}` },
    { title: '剩余本金', dataIndex: 'remainingPrincipal', width: 120, render: (v) => `¥${v.toLocaleString()}` },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v) => (
        <Tag color={v === 'paid' ? 'green' : v === 'overdue' ? 'red' : 'default'}>
          {v === 'paid' ? '已还' : v === 'overdue' ? '逾期' : '待还'}
        </Tag>
      ),
    },
    { title: '来源', dataIndex: 'source', width: 100 },
    {
      title: '修正',
      dataIndex: 'isCorrected',
      width: 80,
      render: (v, record) => (
        v ? <Tag color="orange">已修正</Tag> : null
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<Edit2 size={14} />}
          onClick={() => {
            setEditModal({ open: true, item: record });
            editForm.setFieldsValue(record);
          }}
        >
          修正
        </Button>
      ),
    },
  ];

  const rateColumns: ColumnsType<RateAdjustment> = [
    { title: '生效日期', dataIndex: 'effectiveDate', width: 110 },
    { title: '调整前利率', dataIndex: 'oldRate', width: 100, render: (v) => `${v}%` },
    { title: '调整后利率', dataIndex: 'newRate', width: 100, render: (v) => `${v}%` },
    { title: '定价基准', dataIndex: 'basis', width: 100, render: (v) => (v === 'lpr' ? 'LPR' : '固定利率') },
    { title: '浮动点差', dataIndex: 'spread', width: 100, render: (v) => v ? `${v}BP` : '-' },
    { title: '来源', dataIndex: 'source', width: 120 },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Popconfirm title="确定删除?" onConfirm={() => removeRateAdjustment(record.id)}>
          <Button type="link" danger size="small" icon={<Trash2 size={14} />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">贷款信息录入</h1>
        <p className="text-slate-500 text-sm mt-1">从贷款合同、还款计划等材料录入基础数据</p>
      </div>

      <Tabs
        defaultActiveKey="base"
        items={[
          {
            key: 'base',
            label: (
              <span className="flex items-center gap-2">
                <FileText size={16} /> 基础信息
              </span>
            ),
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={
                    loanInfo
                      ? {
                          ...loanInfo,
                          disbursementDate: loanInfo.disbursementDate ? new Date(loanInfo.disbursementDate) : undefined,
                          firstRepaymentDate: loanInfo.firstRepaymentDate ? new Date(loanInfo.firstRepaymentDate) : undefined,
                          repricingDate: loanInfo.repricingDate ? new Date(loanInfo.repricingDate) : undefined,
                        }
                      : undefined
                  }
                  onFinish={handleSaveLoanInfo}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Form.Item name="borrowerName" label="借款人姓名">
                      <Input placeholder="请输入借款人姓名" />
                    </Form.Item>
                    <Form.Item name="contractNumber" label="贷款合同号">
                      <Input placeholder="请输入合同编号" />
                    </Form.Item>
                    <Form.Item name="loanAmount" label="贷款金额(元)" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} placeholder="请输入贷款金额" min={0} />
                    </Form.Item>
                    <Form.Item name="loanTerm" label="贷款期限(月)" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} placeholder="如：360" min={1} max={600} />
                    </Form.Item>
                    <Form.Item name="interestRate" label="初始年利率(%)" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} placeholder="如：4.9" step={0.01} min={0} max={30} />
                    </Form.Item>
                    <Form.Item name="repaymentMethod" label="还款方式" rules={[{ required: true }]}>
                      <Select placeholder="请选择还款方式">
                        <Option value="equal_principal_interest">等额本息</Option>
                        <Option value="equal_principal">等额本金</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="disbursementDate" label="放款日" rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="firstRepaymentDate" label="首次还款日" rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="repricingDate" label="利率重定价日" rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="repricingCycle" label="重定价周期(月)" rules={[{ required: true }]}>
                      <Select placeholder="请选择周期">
                        <Option value={12}>12个月（每年）</Option>
                        <Option value={6}>6个月（每半年）</Option>
                        <Option value={1}>1个月（每月）</Option>
                      </Select>
                    </Form.Item>
                  </div>
                  <Button type="primary" htmlType="submit" size="large">
                    保存贷款信息
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'schedule',
            label: (
              <span className="flex items-center gap-2">
                <FileText size={16} /> 还款计划
              </span>
            ),
            children: (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <Space>
                    <Button icon={<RefreshCw size={14} />} onClick={handleGenerateSchedule}>
                      重新生成还款计划
                    </Button>
                    <Button icon={<Download size={14} />} onClick={() => exportScheduleToExcel(repaymentSchedule, loanInfo)}>
                      导出Excel
                    </Button>
                  </Space>
                  {repaymentSchedule.length > 0 && (
                    <span className="text-sm text-slate-500">
                      共 {repaymentSchedule.length} 期，已修正 {repaymentSchedule.filter(i => i.isCorrected).length} 期
                    </span>
                  )}
                </div>
                <Table
                  columns={scheduleColumns}
                  dataSource={repaymentSchedule}
                  rowKey="period"
                  scroll={{ x: 1000, y: 500 }}
                  size="small"
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
          {
            key: 'rate',
            label: (
              <span className="flex items-center gap-2">
                <FileText size={16} /> 利率调整
              </span>
            ),
            children: (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-slate-500">
                    {loanInfo ? `当前执行利率：${rateAdjustments.length > 0 ? rateAdjustments[rateAdjustments.length - 1].newRate : loanInfo.interestRate}%` : '请先保存贷款信息'}
                  </span>
                  <Button type="primary" icon={<Plus size={14} />} onClick={() => setRateModal(true)} disabled={!loanInfo}>
                    添加利率调整
                  </Button>
                </div>
                <Table
                  columns={rateColumns}
                  dataSource={rateAdjustments}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'penalty',
            label: (
              <span className="flex items-center gap-2">
                <FileText size={16} /> 违约金规则
              </span>
            ),
            children: (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  {penaltyRule ? (
                    <Tag color="green">已配置违约金规则</Tag>
                  ) : (
                    <Tag color="orange">未配置</Tag>
                  )}
                  <Button type="primary" icon={<Plus size={14} />} onClick={() => {
                    setPenaltyModal(true);
                    if (penaltyRule) penaltyForm.setFieldsValue(penaltyRule);
                  }}>
                    {penaltyRule ? '编辑规则' : '配置违约金规则'}
                  </Button>
                </div>
                {penaltyRule && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">计算方式</p>
                        <p className="font-medium">
                          {penaltyRule.type === 'months_interest'
                            ? `${penaltyRule.value}个月利息`
                            : penaltyRule.type === 'percentage'
                            ? `${penaltyRule.value}%提前还款额`
                            : `固定${penaltyRule.value}元`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">免罚期</p>
                        <p className="font-medium">放款后 {penaltyRule.freePeriod} 个月内</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">最低违约金</p>
                        <p className="font-medium">{penaltyRule.minAmount ? `¥${penaltyRule.minAmount}` : '无限制'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">最高违约金</p>
                        <p className="font-medium">{penaltyRule.maxAmount ? `¥${penaltyRule.maxAmount}` : '无限制'}</p>
                      </div>
                    </div>
                    {penaltyRule.specialClauses && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-xs text-slate-500">特殊条款</p>
                        <p className="text-sm">{penaltyRule.specialClauses}</p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-4">来源：{penaltyRule.source}</p>
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="修正还款计划"
        open={editModal.open}
        onOk={handleEditItem}
        onCancel={() => setEditModal({ open: false, item: null })}
        width={500}
      >
        <Form form={editForm} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="principal" label="应还本金" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="interest" label="应还利息" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="totalPayment" label="应还总额" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="correctionNote" label="修正说明" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="请说明修正原因和依据来源" />
          </Form.Item>
          <p className="text-xs text-amber-600">
            注意：修正操作将被记录在历史中，保留原始数据和修改痕迹
          </p>
        </Form>
      </Modal>

      <Modal
        title="添加利率调整记录"
        open={rateModal}
        onOk={handleAddRateAdjustment}
        onCancel={() => setRateModal(false)}
        width={500}
      >
        <Form form={rateForm} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="effectiveDate" label="生效日期" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="basis" label="定价基准" rules={[{ required: true }]}>
              <Select>
                <Option value="lpr">LPR</Option>
                <Option value="fixed">固定利率</Option>
              </Select>
            </Form.Item>
            <Form.Item name="oldRate" label="调整前利率(%)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} step={0.01} />
            </Form.Item>
            <Form.Item name="newRate" label="调整后利率(%)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} step={0.01} />
            </Form.Item>
            <Form.Item name="spread" label="浮动点差(BP)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="source" label="数据来源" rules={[{ required: true }]}>
              <Input placeholder="如：LPR报价/合同条款" />
            </Form.Item>
          </div>
          <Form.Item name="note" label="备注">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="配置违约金规则"
        open={penaltyModal}
        onOk={handleSavePenaltyRule}
        onCancel={() => setPenaltyModal(false)}
        width={600}
      >
        <Form form={penaltyForm} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="type" label="计算方式" rules={[{ required: true }]}>
              <Select>
                <Option value="months_interest">按还款月数利息计算</Option>
                <Option value="percentage">按提前还款额比例</Option>
                <Option value="fixed">固定金额</Option>
              </Select>
            </Form.Item>
            <Form.Item name="value" label="数值" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} placeholder="月数/比例/金额" />
            </Form.Item>
            <Form.Item name="freePeriod" label="免罚期(月)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} placeholder="如：36" />
            </Form.Item>
            <Form.Item name="source" label="来源依据" rules={[{ required: true }]}>
              <Input placeholder="如：贷款合同第X条" />
            </Form.Item>
            <Form.Item name="minAmount" label="最低违约金(元)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxAmount" label="最高违约金(元)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="specialClauses" label="特殊条款说明">
            <TextArea rows={3} placeholder="如：部分还款每年仅限一次等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
