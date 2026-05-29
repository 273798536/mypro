import { useState, useMemo } from 'react';
import { Card, Form, DatePicker, InputNumber, Select, Button, Tabs, Table, Tag, Space, Modal, Input, message } from 'antd';
import { Calculator as CalculatorIcon, FileDown, Save, GitCompare } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store';
import { calculatePrepayment, formatCurrency } from '@/utils/calculator';
import { exportToPDF, exportToExcel } from '@/utils/export';
import StatCard from '@/components/StatCard';
import WarningAlerts from '@/components/WarningAlerts';
import type { PrepaymentResult, RepaymentItem, PrepaymentParams } from '@/types';

const { Option } = Select;

export default function Calculator() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const {
    loanInfo,
    repaymentSchedule,
    rateAdjustments,
    penaltyRule,
    prepaymentResults,
    activeResultId,
    addPrepaymentResult,
    addComparisonScheme,
    setActiveResultId,
  } = useAppStore();

  const [currentResult, setCurrentResult] = useState<PrepaymentResult | null>(null);
  const [saveModal, setSaveModal] = useState(false);
  const [resultName, setResultName] = useState('');

  const activeResult = useMemo(
    () => prepaymentResults.find((r) => r.id === activeResultId) || null,
    [prepaymentResults, activeResultId]
  );

  if (!loanInfo || repaymentSchedule.length === 0) {
    return (
      <div className="p-6">
        <Card className="text-center py-16">
          <CalculatorIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">请先录入贷款信息</h3>
          <p className="text-slate-400 mb-4">需要先完成贷款基础信息录入并生成还款计划</p>
          <Button type="primary" onClick={() => navigate('/loan-info')}>
            去录入贷款信息
          </Button>
        </Card>
      </div>
    );
  }

  const handleCalculate = (values: PrepaymentParams & { prepaymentDate: { format: (format: string) => string } }) => {
    const params: PrepaymentParams = {
      ...values,
      prepaymentDate: values.prepaymentDate.format('YYYY-MM-DD'),
    };

    const result = calculatePrepayment(
      loanInfo,
      repaymentSchedule,
      rateAdjustments,
      penaltyRule,
      params
    );

    setCurrentResult(result);
  };

  const handleSaveResult = () => {
    if (!currentResult) return;

    const namedResult = { ...currentResult, name: resultName || `试算方案 ${prepaymentResults.length + 1}` };
    addPrepaymentResult(namedResult);
    setSaveModal(false);
    setResultName('');
    message.success('试算结果已保存，可在历史记录中查看');
  };

  const handleAddToCompare = () => {
    if (!currentResult) return;
    addComparisonScheme({
      resultId: currentResult.id,
      name: currentResult.name || `方案 ${Date.now()}`,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    });
    message.success('已添加到方案对比');
  };

  const handleExportPDF = () => {
    if (!currentResult) return;
    const warnings = {
      unhandled: currentResult.warnings.filter(w => w.level === 'info').map(w => w.message),
      corrected: repaymentSchedule.filter(i => i.isCorrected).map(i => `第${i.period}期：${i.correctionNote || '已修正'}`),
      needConfirm: currentResult.warnings.filter(w => w.level === 'warning' || w.level === 'error').map(w => w.message),
    };
    exportToPDF(loanInfo, currentResult, warnings);
  };

  const handleExportExcel = () => {
    if (!currentResult) return;
    exportToExcel(loanInfo, currentResult);
  };

  const scheduleColumns: ColumnsType<RepaymentItem> = [
    { title: '期数', dataIndex: 'period', width: 70 },
    { title: '应还日期', dataIndex: 'dueDate', width: 110 },
    { title: '应还本金', dataIndex: 'principal', width: 100, render: (v) => formatCurrency(v) },
    { title: '应还利息', dataIndex: 'interest', width: 100, render: (v) => formatCurrency(v) },
    { title: '应还总额', dataIndex: 'totalPayment', width: 110, render: (v) => formatCurrency(v) },
    { title: '剩余本金', dataIndex: 'remainingPrincipal', width: 120, render: (v) => formatCurrency(v) },
    { title: '来源', dataIndex: 'source', width: 100 },
  ];

  const getChartOption = (result: PrepaymentResult) => {
    const newInterest = result.newTotalInterest;
    const savedInterest = result.interestSaved;
    const penalty = result.penaltyAmount;

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}元 ({d}%)' },
      legend: { orient: 'vertical', left: 'left' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
          labelLine: { show: false },
          data: [
            { value: newInterest, name: '仍需支付利息', itemStyle: { color: '#f59e0b' } },
            { value: savedInterest, name: '节省利息', itemStyle: { color: '#10b981' } },
            { value: penalty, name: '违约金', itemStyle: { color: '#ef4444' } },
          ],
        },
      ],
    };
  };

  const getTrendChartOption = (result: PrepaymentResult) => {
    const periods = result.newRepaymentSchedule.slice(0, 60).map((item) => `第${item.period}期`);
    const principals = result.newRepaymentSchedule.slice(0, 60).map((item) => item.principal);
    const interests = result.newRepaymentSchedule.slice(0, 60).map((item) => item.interest);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['本金', '利息'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: periods, axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: { type: 'value', name: '金额(元)' },
      series: [
        { name: '本金', type: 'bar', stack: 'total', data: principals, itemStyle: { color: '#3b82f6' } },
        { name: '利息', type: 'bar', stack: 'total', data: interests, itemStyle: { color: '#f59e0b' } },
      ],
    };
  };

  const displayResult = currentResult || activeResult;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">提前还款试算</h1>
        <p className="text-slate-500 text-sm mt-1">输入提前还款参数，系统自动计算并提示风险</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <CalculatorIcon size={18} /> 试算参数
          </h3>
          <Form form={form} layout="vertical" onFinish={handleCalculate}>
            <Form.Item name="prepaymentDate" label="提前还款日" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="prepaymentType" label="还款类型" rules={[{ required: true }]} initialValue="partial">
              <Select>
                <Option value="partial">部分提前还款</Option>
                <Option value="full">全部提前还款</Option>
              </Select>
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.prepaymentType !== curr.prepaymentType}
            >
              {({ getFieldValue }) =>
                getFieldValue('prepaymentType') === 'partial' && (
                  <>
                    <Form.Item name="prepaymentAmount" label="提前还款金额(元)" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} min={1000} />
                    </Form.Item>
                    <Form.Item name="partialOption" label="部分还款后" rules={[{ required: true }]}>
                      <Select>
                        <Option value="reduce_payment">减少月供，期限不变</Option>
                        <Option value="reduce_term">缩短期限，月供不变</Option>
                      </Select>
                    </Form.Item>
                  </>
                )
              }
            </Form.Item>
            <Form.Item name="gracePeriod" label="宽限期(天)">
              <InputNumber style={{ width: '100%' }} placeholder="如：3" min={0} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" icon={<CalculatorIcon size={16} />}>
              开始计算
            </Button>
          </Form>

          {prepaymentResults.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-medium text-slate-600 mb-3">已保存的试算方案</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {prepaymentResults.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeResultId === r.id ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      setActiveResultId(r.id);
                      setCurrentResult(r);
                    }}
                  >
                    <p className="text-sm font-medium text-slate-700">{r.name}</p>
                    <p className="text-xs text-slate-500">
                      {r.params.prepaymentDate} · 节省{r.interestSaved.toLocaleString()}元
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {displayResult && (
            <>
              <WarningAlerts warnings={displayResult.warnings} />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="提前还款时已还期数"
                  value={displayResult.periodAtPrepayment}
                  type="number"
                  suffix="期"
                />
                <StatCard
                  title="剩余本金"
                  value={displayResult.remainingPrincipal}
                  trend="neutral"
                />
                <StatCard
                  title="节省利息"
                  value={displayResult.interestSaved}
                  trend="up"
                />
                <StatCard
                  title="违约金"
                  value={displayResult.penaltyAmount}
                  trend="down"
                  isNegative={displayResult.penaltyAmount > 0}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                  title="原总利息"
                  value={displayResult.originalTotalInterest}
                  description={`月供: ${repaymentSchedule[0]?.totalPayment.toLocaleString()}元`}
                />
                <StatCard
                  title="新总利息"
                  value={displayResult.newTotalInterest}
                  description={displayResult.newMonthlyPayment ? `新月供: ${displayResult.newMonthlyPayment.toLocaleString()}元` : displayResult.newTerm !== undefined ? `新期限: ${displayResult.newTerm}期` : ''}
                />
                <StatCard
                  title="净收益（节省-违约金）"
                  value={Math.max(0, displayResult.netBenefit)}
                  trend={displayResult.netBenefit > 0 ? 'up' : 'down'}
                  isNegative={displayResult.netBenefit < 0}
                  description={displayResult.netBenefit < 0 ? '违约金超过节省利息' : '建议提前还款'}
                />
                {displayResult.newTerm !== undefined && (
                  <StatCard
                    title="还款期限变化"
                    value={displayResult.originalRemainingTerm - displayResult.newTerm}
                    type="number"
                    suffix="期"
                    trend="down"
                    description={`原剩余${displayResult.originalRemainingTerm}期 → 新${displayResult.newTerm}期`}
                  />
                )}
              </div>

              <Card title="图表分析">
                <Tabs defaultActiveKey="pie" size="small">
                  <Tabs.TabPane tab="利息构成" key="pie">
                    <ReactECharts option={getChartOption(displayResult)} style={{ height: 300 }} />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="月供趋势" key="trend">
                    <ReactECharts option={getTrendChartOption(displayResult)} style={{ height: 300 }} />
                  </Tabs.TabPane>
                </Tabs>
              </Card>

              <Card
                title="新还款计划预览"
                extra={
                  <Space>
                    {!prepaymentResults.find(r => r.id === displayResult.id) && (
                      <Button icon={<Save size={14} />} onClick={() => setSaveModal(true)}>
                        保存方案
                      </Button>
                    )}
                    <Button icon={<GitCompare size={14} />} onClick={handleAddToCompare}>
                      加入对比
                    </Button>
                    <Button icon={<FileDown size={14} />} onClick={handleExportPDF}>
                      导出PDF
                    </Button>
                    <Button icon={<FileDown size={14} />} onClick={handleExportExcel}>
                      导出Excel
                    </Button>
                  </Space>
                }
              >
                <Table
                  columns={scheduleColumns}
                  dataSource={displayResult.newRepaymentSchedule}
                  rowKey="period"
                  scroll={{ x: 700, y: 300 }}
                  size="small"
                  pagination={{ pageSize: 10 }}
                />
              </Card>

              <Card title="数据状态说明">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <Tag color="blue">未处理项</Tag>
                    <ul className="mt-2 text-sm text-slate-600 space-y-1">
                      {displayResult.warnings.filter(w => w.level === 'info').length > 0 ? (
                        displayResult.warnings.filter(w => w.level === 'info').map((w, i) => (
                          <li key={i}>• {w.message}</li>
                        ))
                      ) : (
                        <li className="text-slate-400">暂无</li>
                      )}
                    </ul>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <Tag color="orange">已修正项</Tag>
                    <ul className="mt-2 text-sm text-slate-600 space-y-1">
                      {repaymentSchedule.filter(i => i.isCorrected).length > 0 ? (
                        repaymentSchedule.filter(i => i.isCorrected).slice(0, 3).map((item, i) => (
                          <li key={i}>• 第{item.period}期：{item.correctionNote || '已修正'}</li>
                        ))
                      ) : (
                        <li className="text-slate-400">暂无人工修正</li>
                      )}
                    </ul>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <Tag color="red">需人工确认</Tag>
                    <ul className="mt-2 text-sm text-slate-600 space-y-1">
                      {displayResult.warnings.filter(w => w.level === 'warning' || w.level === 'error').length > 0 ? (
                        displayResult.warnings.filter(w => w.level === 'warning' || w.level === 'error').map((w, i) => (
                          <li key={i}>• {w.message}</li>
                        ))
                      ) : (
                        <li className="text-slate-400">无需确认</li>
                      )}
                    </ul>
                  </div>
                </div>
              </Card>
            </>
          )}

          {!displayResult && (
            <Card className="text-center py-16">
              <CalculatorIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">请输入参数开始计算</h3>
              <p className="text-slate-400">在左侧填写提前还款参数，点击计算查看结果</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        title="保存试算方案"
        open={saveModal}
        onOk={handleSaveResult}
        onCancel={() => setSaveModal(false)}
      >
        <Input
          placeholder="请输入方案名称，如：提前还10万缩短期限"
          value={resultName}
          onChange={(e) => setResultName(e.target.value)}
        />
      </Modal>
    </div>
  );
}
