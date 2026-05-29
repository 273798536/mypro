import { useState, useMemo } from 'react';
import { Card, Button, Select, List, Tag, Empty, message } from 'antd';
import { FileDown, FileText, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { exportToPDF, exportToExcel, exportScheduleToExcel } from '@/utils/export';
import { formatCurrency } from '@/utils/calculator';
import type { PrepaymentResult } from '@/types';

const { Option } = Select;

export default function Export() {
  const navigate = useNavigate();
  const { loanInfo, repaymentSchedule, prepaymentResults, activeResultId, setActiveResultId } = useAppStore();
  const [selectedResultId, setSelectedResultId] = useState<string | null>(activeResultId);

  const selectedResult = useMemo(
    () => prepaymentResults.find((r) => r.id === selectedResultId) || null,
    [prepaymentResults, selectedResultId]
  );

  const handleExportPDF = () => {
    if (!selectedResult || !loanInfo) {
      message.warning('请选择要导出的试算结果');
      return;
    }
    const warnings = {
      unhandled: selectedResult.warnings.filter(w => w.level === 'info').map(w => w.message),
      corrected: repaymentSchedule.filter(i => i.isCorrected).map(i => `第${i.period}期：${i.correctionNote || '已修正'}`),
      needConfirm: selectedResult.warnings.filter(w => w.level === 'warning' || w.level === 'error').map(w => w.message),
    };
    exportToPDF(loanInfo, selectedResult, warnings);
    message.success('PDF报告已导出');
  };

  const handleExportExcel = () => {
    if (!selectedResult || !loanInfo) {
      message.warning('请选择要导出的试算结果');
      return;
    }
    exportToExcel(loanInfo, selectedResult);
    message.success('Excel明细已导出');
  };

  const handleExportSchedule = () => {
    if (repaymentSchedule.length === 0) {
      message.warning('暂无还款计划可导出');
      return;
    }
    exportScheduleToExcel(repaymentSchedule);
    message.success('还款计划已导出');
  };

  const getResultSummary = (result: PrepaymentResult) => {
    const typeText = result.params.prepaymentType === 'full' ? '全部提前还款' : '部分提前还款';
    const optionText = result.params.partialOption === 'reduce_payment' ? '减少月供' : result.params.partialOption === 'reduce_term' ? '缩短期限' : '';
    return `${typeText} ${formatCurrency(result.params.prepaymentAmount)} ${optionText}`;
  };

  if (!loanInfo) {
    return (
      <div className="p-6">
        <Card className="text-center py-16">
          <FileDown size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">请先录入贷款信息</h3>
          <p className="text-slate-400 mb-4">需要先完成贷款基础信息录入并生成还款计划</p>
          <Button type="primary" onClick={() => navigate('/loan-info')}>
            去录入贷款信息
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">报告导出</h1>
        <p className="text-slate-500 text-sm mt-1">导出专业PDF报告和Excel数据明细</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <FileText size={18} /> 选择导出内容
          </h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-2">选择试算方案</label>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择要导出的试算方案"
              value={selectedResultId || undefined}
              onChange={(value) => {
                setSelectedResultId(value);
                setActiveResultId(value);
              }}
            >
              {prepaymentResults.map((result) => (
                <Option key={result.id} value={result.id}>
                  {result.name || `方案 ${prepaymentResults.indexOf(result) + 1}`}
                </Option>
              ))}
            </Select>
            {prepaymentResults.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">暂无已保存的试算方案，请先去试算页面保存</p>
            )}
          </div>

          {selectedResult && (
            <div className="bg-slate-50 p-4 rounded-lg mb-6">
              <h4 className="text-sm font-medium text-slate-700 mb-3">方案详情</h4>
              <List size="small">
                <List.Item>
                  <span className="text-slate-500">提前还款日</span>
                  <span className="font-medium">{selectedResult.params.prepaymentDate}</span>
                </List.Item>
                <List.Item>
                  <span className="text-slate-500">还款类型</span>
                  <span>{getResultSummary(selectedResult)}</span>
                </List.Item>
                <List.Item>
                  <span className="text-slate-500">节省利息</span>
                  <span className="text-emerald-600 font-medium">{formatCurrency(selectedResult.interestSaved)}</span>
                </List.Item>
                <List.Item>
                  <span className="text-slate-500">违约金</span>
                  <span className={selectedResult.penaltyAmount > 0 ? 'text-red-500' : 'text-slate-400'}>
                    {selectedResult.penaltyAmount > 0 ? formatCurrency(selectedResult.penaltyAmount) : '无'}
                  </span>
                </List.Item>
                <List.Item>
                  <span className="text-slate-500">净收益</span>
                  <span className={`font-bold ${selectedResult.netBenefit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(selectedResult.netBenefit)}
                  </span>
                </List.Item>
              </List>
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="primary"
              block
              size="large"
              icon={<FileDown size={16} />}
              onClick={handleExportPDF}
              disabled={!selectedResult}
            >
              导出PDF摘要报告
            </Button>
            <Button
              block
              size="large"
              icon={<FileSpreadsheet size={16} />}
              onClick={handleExportExcel}
              disabled={!selectedResult}
            >
              导出Excel数据明细
            </Button>
            <Button
              block
              size="large"
              icon={<FileSpreadsheet size={16} />}
              onClick={handleExportSchedule}
              disabled={repaymentSchedule.length === 0}
            >
              导出完整还款计划
            </Button>
            <Button
              block
              onClick={() => navigate('/calculator')}
            >
              去试算页面
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card title="数据状态说明">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <Tag color="blue">未处理项</Tag>
                <p className="text-2xl font-bold text-blue-700 mt-2">
                  {selectedResult?.warnings.filter(w => w.level === 'info').length || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">项信息提示</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <Tag color="orange">已修正项</Tag>
                <p className="text-2xl font-bold text-amber-700 mt-2">
                  {repaymentSchedule.filter(i => i.isCorrected).length}
                </p>
                <p className="text-xs text-slate-500 mt-1">期人工修正</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <Tag color="red">需人工确认</Tag>
                <p className="text-2xl font-bold text-red-700 mt-2">
                  {selectedResult?.warnings.filter(w => w.level === 'warning' || w.level === 'error').length || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">项需确认</p>
              </div>
            </div>

            {selectedResult && (
              <div className="space-y-4">
                {selectedResult.warnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-500" /> 风险提示（将在报告中显示）
                    </h4>
                    <div className="space-y-2">
                      {selectedResult.warnings.map((warning, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-sm ${
                            warning.level === 'error'
                              ? 'bg-red-50 border border-red-200'
                              : warning.level === 'warning'
                              ? 'bg-amber-50 border border-amber-200'
                              : 'bg-blue-50 border border-blue-200'
                          }`}
                        >
                          <p className={`font-medium ${
                            warning.level === 'error' ? 'text-red-700' : warning.level === 'warning' ? 'text-amber-700' : 'text-blue-700'
                          }`}>
                            {warning.message}
                          </p>
                          <p className="text-slate-600 mt-1">{warning.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {repaymentSchedule.filter(i => i.isCorrected).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <CheckCircle size={16} className="text-purple-500" /> 人工修正记录（将在报告中显示）
                    </h4>
                    <div className="space-y-2">
                      {repaymentSchedule.filter(i => i.isCorrected).slice(0, 5).map((item) => (
                        <div key={item.period} className="bg-purple-50 p-3 rounded-lg text-sm">
                          <p className="font-medium text-purple-700">
                            第 {item.period} 期 · 应还日 {item.dueDate}
                          </p>
                          <p className="text-slate-600 mt-1">{item.correctionNote || '已修正，无备注'}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            修正后：本金 {formatCurrency(item.principal)} + 利息 {formatCurrency(item.interest)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!selectedResult && prepaymentResults.length === 0 && (
              <Empty description="暂无试算结果，请先保存试算方案" />
            )}
          </Card>

          <Card title="报告内容说明">
            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">PDF摘要报告包含：</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>贷款基础信息概览</li>
                  <li>试算参数和结果明细</li>
                  <li>数据状态分类（未处理/已修正/需确认）</li>
                  <li>风险提示和注意事项</li>
                  <li>数据来源标记说明</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-1">Excel数据明细包含：</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>试算摘要Sheet（核心指标对比）</li>
                  <li>新还款计划Sheet（完整期数明细）</li>
                  <li>每行标记数据来源和修正状态</li>
                </ul>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg text-amber-700">
                <p className="font-medium">重要提示</p>
                <p className="mt-1">本报告由系统自动生成，仅供参考，实际金额以银行柜台计算为准。</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
