import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Plus, Minus, AlertTriangle, Plane, DollarSign, Info } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatMileage, getAnomalyTypeLabel } from '../utils/calculator';
import { getCabinName } from '../utils/mockData';
import type { Segment, CabinClass } from '../types';
import StepIndicator from '../components/StepIndicator';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: 'economy', label: '经济舱' },
  { value: 'premium_economy', label: '超级经济舱' },
  { value: 'business', label: '商务舱' },
  { value: 'first', label: '头等舱' },
];

const RebookCalculator: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { tickets, rebookRecords, createRebookRecord, updateRebookRecord, submitForReview, addExplanation, currentUser, loadTickets, loadRebookRecords, error, setError } = useStore();

  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [newSegments, setNewSegments] = useState<Segment[]>([]);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [explanationText, setExplanationText] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    loadTickets();
    loadRebookRecords();
  }, [loadTickets, loadRebookRecords]);

  useEffect(() => {
    if (id) {
      const record = rebookRecords.find(r => r.id === id);
      if (record) {
        setSelectedTicketId(record.ticketId);
        setNewSegments(record.newSegments);
        setCalculationResult({
          fareDifference: record.fareDifference,
          taxDifference: record.taxDifference,
          mileageRefund: record.mileageRefund,
          totalDifference: record.totalDifference,
          anomalies: record.anomalies,
          details: record.calculationDetails,
        });
        setCurrentStep(3);
      }
    }
  }, [id, rebookRecords]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const handleTicketSelect = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setNewSegments(ticket.originalSegments.map(s => ({ ...s, id: crypto.randomUUID() })));
      setCalculationResult(null);
      setCurrentStep(2);
    }
  };

  const updateSegment = (index: number, field: keyof Segment, value: any) => {
    setNewSegments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setCalculationResult(null);
  };

  const handleCalculate = async () => {
    if (!selectedTicket || newSegments.length === 0) return;

    setIsCalculating(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!id) {
        const recordId = await createRebookRecord(
          selectedTicketId,
          newSegments,
          currentUser?.name || 'system'
        );
        const record = rebookRecords.find(r => r.id === recordId) || (await useStore.getState().rebookRecords.find(r => r.id === recordId));
        if (record) {
          setCalculationResult({
            fareDifference: record.fareDifference,
            taxDifference: record.taxDifference,
            mileageRefund: record.mileageRefund,
            totalDifference: record.totalDifference,
            anomalies: record.anomalies,
            details: record.calculationDetails,
          });
        }
      } else {
        await updateRebookRecord(id, { newSegments });
        const record = rebookRecords.find(r => r.id === id);
        if (record) {
          setCalculationResult({
            fareDifference: record.fareDifference,
            taxDifference: record.taxDifference,
            mileageRefund: record.mileageRefund,
            totalDifference: record.totalDifference,
            anomalies: record.anomalies,
            details: record.calculationDetails,
          });
        }
      }
      setCurrentStep(3);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id) return;

    try {
      for (const [anomalyId, text] of Object.entries(explanationText)) {
        if (text.trim()) {
          await addExplanation(id, anomalyId, text.trim(), currentUser?.name || 'system');
        }
      }
      await submitForReview(id, currentUser?.name || 'system');
      setShowConfirmModal(false);
      navigate('/review');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const canSubmit = calculationResult && (
    calculationResult.anomalies.length === 0 ||
    calculationResult.anomalies.every((a: any) => explanationText[a.id]?.trim())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">联程改签差价计算</h1>
              <p className="text-sm text-slate-500">输入改签信息，系统自动计算差价并检测异常</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {id && (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!canSubmit}
                className="btn btn-primary gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                提交复核
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <StepIndicator
          steps={[
            { label: '选择客票', status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'pending' },
            { label: '修改航段', status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'pending' },
            { label: '确认计算', status: currentStep === 3 ? 'current' : 'pending' },
          ]}
        />
      </div>

      <div className="px-6 pb-6 space-y-6">
        {currentStep >= 1 && (
          <div className="card p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary-600" />
              选择客票
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">选择客票订单</label>
                <select
                  value={selectedTicketId}
                  onChange={(e) => handleTicketSelect(e.target.value)}
                  className="input"
                >
                  <option value="">请选择客票</option>
                  {tickets.map(ticket => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticket.orderNo} - {ticket.passengerName} ({ticket.originalSegments.length}个航段)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTicket && (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">订单号：</span>
                    <span className="font-medium text-slate-800">{selectedTicket.orderNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">乘客：</span>
                    <span className="font-medium text-slate-800">{selectedTicket.passengerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">航段数：</span>
                    <span className="font-medium text-slate-800">{selectedTicket.originalSegments.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">原票价：</span>
                    <span className="font-medium text-slate-800">{formatCurrency(selectedTicket.totalOriginalAmount)}</span>
                  </div>
                </div>
                {selectedTicket.mileageUsed > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="text-slate-500">里程抵扣：</span>
                    <span className="font-medium text-primary-600">{formatMileage(selectedTicket.mileageUsed)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep >= 2 && selectedTicket && (
          <div className="card p-6 animate-fade-in animate-fade-in-delay-1">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">修改航段信息</h2>
            <p className="text-sm text-slate-500 mb-4">修改改签后的航段信息，系统将自动重算差价和税费</p>

            <div className="space-y-6">
              {newSegments.map((segment, index) => (
                <div key={segment.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-700">第 {index + 1} 航段</h3>
                    {selectedTicket.originalSegments[index] && (
                      <div className="text-xs text-slate-500">
                        原航班：{selectedTicket.originalSegments[index].flightNo}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                      <label className="label">航班号</label>
                      <input
                        type="text"
                        value={segment.flightNo}
                        onChange={(e) => updateSegment(index, 'flightNo', e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">出发机场</label>
                      <input
                        type="text"
                        value={segment.departureAirport}
                        onChange={(e) => updateSegment(index, 'departureAirport', e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">到达机场</label>
                      <input
                        type="text"
                        value={segment.arrivalAirport}
                        onChange={(e) => updateSegment(index, 'arrivalAirport', e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">舱位等级</label>
                      <select
                        value={segment.cabinClass}
                        onChange={(e) => updateSegment(index, 'cabinClass', e.target.value as CabinClass)}
                        className="input"
                      >
                        {CABIN_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">舱位代码</label>
                      <input
                        type="text"
                        value={segment.cabinCode}
                        onChange={(e) => updateSegment(index, 'cabinCode', e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">国家/地区</label>
                      <input
                        type="text"
                        value={segment.country}
                        onChange={(e) => updateSegment(index, 'country', e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">舱位价格</label>
                      <input
                        type="number"
                        value={segment.baseFare}
                        onChange={(e) => updateSegment(index, 'baseFare', Number(e.target.value))}
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="btn btn-primary gap-2"
              >
                <DollarSign className="w-4 h-4" />
                {isCalculating ? '计算中...' : '计算差价'}
              </button>
            </div>
          </div>
        )}

        {currentStep >= 3 && calculationResult && (
          <div className="card p-6 animate-fade-in animate-fade-in-delay-2">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent-green-600" />
              计算结果
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-500 mb-1">舱位差价</div>
                <div className={`text-xl font-bold ${calculationResult.fareDifference >= 0 ? 'text-accent-red-600' : 'text-accent-green-600'}`}>
                  {calculationResult.fareDifference >= 0 ? '+' : ''}{formatCurrency(calculationResult.fareDifference)}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-500 mb-1">税费差价</div>
                <div className={`text-xl font-bold ${calculationResult.taxDifference >= 0 ? 'text-accent-red-600' : 'text-accent-green-600'}`}>
                  {calculationResult.taxDifference >= 0 ? '+' : ''}{formatCurrency(calculationResult.taxDifference)}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-500 mb-1">里程调整</div>
                <div className={`text-xl font-bold ${calculationResult.mileageRefund >= 0 ? 'text-accent-green-600' : 'text-accent-red-600'}`}>
                  {calculationResult.mileageRefund >= 0 ? '+' : ''}{formatCurrency(calculationResult.mileageRefund)}
                </div>
              </div>
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <div className="text-sm text-primary-600 mb-1">应收差价合计</div>
                <div className={`text-2xl font-bold ${calculationResult.totalDifference >= 0 ? 'text-accent-red-600' : 'text-accent-green-600'}`}>
                  {calculationResult.totalDifference >= 0 ? '+' : ''}{formatCurrency(calculationResult.totalDifference)}
                </div>
              </div>
            </div>

            {calculationResult.anomalies.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-accent-amber-500" />
                  检测到异常项 ({calculationResult.anomalies.length})
                </h3>
                <div className="space-y-3">
                  {calculationResult.anomalies.map((anomaly: any) => (
                    <div
                      key={anomaly.id}
                      className={`border-l-4 p-4 rounded-r-lg ${
                        anomaly.severity === 'error'
                          ? 'bg-accent-red-50 border-accent-red-500'
                          : 'bg-accent-amber-50 border-accent-amber-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              anomaly.severity === 'error' ? 'bg-accent-red-100 text-accent-red-700' : 'bg-accent-amber-100 text-accent-amber-700'
                            }`}>
                              {getAnomalyTypeLabel(anomaly.type)}
                            </span>
                            <span className="text-sm font-medium text-slate-700">{anomaly.description}</span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <div>影响结果：{anomaly.affectedResults.join('、')}</div>
                            <div>金额影响：{anomaly.amountImpact >= 0 ? '+' : ''}{formatCurrency(anomaly.amountImpact)}</div>
                            <div>规则依据：{anomaly.ruleBasis}</div>
                          </div>
                        </div>
                        <StatusBadge status={anomaly.severity} size="sm" />
                      </div>
                      <div className="mt-3">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          <Info className="w-3 h-3 inline mr-1" />
                          请添加解释说明（提交复核前必填）
                        </label>
                        <textarea
                          value={explanationText[anomaly.id] || ''}
                          onChange={(e) => setExplanationText(prev => ({ ...prev, [anomaly.id]: e.target.value }))}
                          placeholder="请解释该异常情况的原因..."
                          className="input min-h-[80px] text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium text-slate-700 mb-3">计算明细</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-4 py-2 font-medium text-slate-600">项目</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600">原金额</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600">新金额</th>
                      <th className="text-right px-4 py-2 font-medium text-slate-600">差额</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-600">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculationResult.details.map((detail: any, idx: number) => (
                      <tr key={detail.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-2 text-slate-700">{detail.item}</td>
                        <td className="px-4 py-2 text-right text-slate-600 font-mono">{formatCurrency(detail.originalAmount)}</td>
                        <td className="px-4 py-2 text-right text-slate-600 font-mono">{formatCurrency(detail.newAmount)}</td>
                        <td className={`px-4 py-2 text-right font-mono font-medium ${
                          detail.difference >= 0 ? 'text-accent-red-600' : 'text-accent-green-600'
                        }`}>
                          {detail.difference >= 0 ? '+' : ''}{formatCurrency(detail.difference)}
                        </td>
                        <td className="px-4 py-2 text-slate-500 text-xs">{detail.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="确认提交复核"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            确认提交该改签差价记录进行复核吗？提交后将进入复核流程。
          </p>
          {calculationResult?.anomalies.length > 0 && (
            <div className="p-4 bg-accent-amber-50 rounded-lg">
              <p className="text-sm text-accent-amber-700">
                该记录包含 {calculationResult.anomalies.length} 个异常项，复核员将重点审核。
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleSubmitReview}
              className="btn btn-primary"
            >
              确认提交
            </button>
          </div>
        </div>
      </Modal>

      {error && (
        <div className="fixed bottom-4 right-4 bg-accent-red-50 border border-accent-red-200 text-accent-red-700 px-4 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default RebookCalculator;
