import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, AlertCircle } from 'lucide-react';
import { useSettlementStore } from '@/store';

const DEDUCTION_TYPES = [
  { value: 'repair', label: '维修费' },
  { value: 'appraisal', label: '鉴定费' },
  { value: 'storage', label: '仓储费' },
  { value: 'other', label: '其他' },
];

const AMEND_FIELDS = [
  { value: 'commission_rate', label: '佣金比例' },
  { value: 'sale_price', label: '销售价格' },
];

export default function SettlementAmend() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentDetail, amendSettlementAction, addDeductionAction,
    loadSettlementDetail, loadCommissionRules, calculateCommissionAction,
  } = useSettlementStore();

  const [amendField, setAmendField] = useState('commission_rate');
  const [amendValue, setAmendValue] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [deductType, setDeductType] = useState('repair');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductDesc, setDeductDesc] = useState('');
  const [deductRef, setDeductRef] = useState('');
  const [preview, setPreview] = useState<{ commission: number; net: number } | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) { loadSettlementDetail(id); loadCommissionRules(); }
  }, [id]);

  const settlement = currentDetail?.settlement;
  const deductions = currentDetail?.deductions ?? [];
  const amendments = currentDetail?.amendments ?? [];

  const calcPreview = useCallback(async () => {
    if (!settlement || !amendValue) { setPreview(null); return; }
    const val = Number(amendValue);
    const curNet = settlement.net_amount;
    if (amendField === 'commission_rate') {
      const commission = settlement.sale_price * val / 100;
      const net = settlement.sale_price - commission - settlement.total_deductions;
      setPreview({ commission, net });
    } else {
      const calc = await calculateCommissionAction(val);
      const net = val - calc.amount - settlement.total_deductions;
      setPreview({ commission: calc.amount, net });
    }
  }, [amendField, amendValue, settlement, calculateCommissionAction]);

  useEffect(() => { calcPreview(); }, [calcPreview]);

  const handleAmend = async () => {
    if (!id || !amendReason.trim()) return;
    await amendSettlementAction(id, { field: amendField, newValue: amendValue, reason: amendReason }, 'admin');
    setAmendValue(''); setAmendReason(''); setPreview(null);
    setSuccess('修正成功'); setTimeout(() => setSuccess(''), 2000);
    loadSettlementDetail(id);
  };

  const handleAddDeduction = async () => {
    if (!id || !deductAmount) return;
    await addDeductionAction(id, {
      type: deductType, amount: Number(deductAmount),
      description: deductDesc, sourceRef: deductRef,
    }, 'admin');
    setDeductAmount(''); setDeductDesc(''); setDeductRef('');
    setSuccess('抵扣添加成功'); setTimeout(() => setSuccess(''), 2000);
    loadSettlementDetail(id);
  };

  if (!settlement) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  const diff = preview ? preview.net - settlement.net_amount : 0;

  return (
    <div className="space-y-6">
      {success && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">{success}</div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-800">结算修正</h1>
        <span className="text-sm text-gray-400">#{id}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6 text-gray-900">
            <h2 className="text-lg font-bold mb-4">修正表单</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">修正字段</label>
                <select value={amendField} onChange={e => setAmendField(e.target.value)}
                  className="w-full border-2 border-gray-800 rounded px-3 py-2 text-sm">
                  {AMEND_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">新值</label>
                <input type="number" value={amendValue} onChange={e => setAmendValue(e.target.value)}
                  className="w-full border-2 border-gray-800 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">原因 <span className="text-red-500">*</span></label>
                <input type="text" value={amendReason} onChange={e => setAmendReason(e.target.value)}
                  className="w-full border-2 border-gray-800 rounded px-3 py-2 text-sm" placeholder="必填" />
              </div>
              <button onClick={handleAmend} disabled={!amendValue || !amendReason.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#c9a96e] text-white py-2 rounded hover:bg-[#b8954f] disabled:opacity-40 text-sm">
                <Save size={16} /> 提交修正
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-gray-900">
            <h2 className="text-lg font-bold mb-4">费用抵扣添加</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">类型</label>
                <select value={deductType} onChange={e => setDeductType(e.target.value)}
                  className="w-full border-2 border-gray-800 rounded px-3 py-2 text-sm">
                  {DEDUCTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">金额</label>
                <input type="number" value={deductAmount} onChange={e => setDeductAmount(e.target.value)}
                  className="w-full border-2 border-gray-800 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <input type="text" value={deductDesc} onChange={e => setDeductDesc(e.target.value)}
                  className="w-full border-2 border-gray-800 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">来源单号</label>
                <input type="text" value={deductRef} onChange={e => setDeductRef(e.target.value)}
                  className="w-full border-2 border-gray-800 rounded px-3 py-2 text-sm" />
              </div>
              <button onClick={handleAddDeduction} disabled={!deductAmount}
                className="w-full flex items-center justify-center gap-2 bg-[#c9a96e] text-white py-2 rounded hover:bg-[#b8954f] disabled:opacity-40 text-sm">
                <Plus size={16} /> 添加抵扣
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 text-gray-900">
          <h2 className="text-lg font-bold mb-4">修正预览</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">当前销售价格</div>
                <div className="font-bold">¥{settlement.sale_price.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">当前佣金比例</div>
                <div className="font-bold">{settlement.commission_rate}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">当前佣金</div>
                <div className="font-bold">¥{settlement.commission_amount.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500 mb-1">当前抵扣总额</div>
                <div className="font-bold">¥{settlement.total_deductions.toLocaleString()}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-bold mb-2">变更后</div>
              {preview ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">新佣金</span>
                    <span className="font-bold text-[#c9a96e]">¥{preview.commission.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">新净额</span>
                    <span className="font-bold text-[#c9a96e]">¥{preview.net.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-gray-600">净额差异</span>
                    <span className={`font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {diff >= 0 ? '+' : ''}¥{diff.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <AlertCircle size={16} /> 请输入新值查看预览
                </div>
              )}
            </div>

            {deductions.length > 0 && (
              <div className="border-t pt-4">
                <div className="text-sm font-bold mb-2">当前抵扣明细</div>
                {deductions.map(d => (
                  <div key={d.id} className="flex justify-between text-sm py-1">
                    <span>{DEDUCTION_TYPES.find(t => t.value === d.type)?.label ?? d.type} - {d.description}</span>
                    <span className="text-red-600">-¥{d.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {amendments.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 text-gray-900 mt-6">
          <h2 className="text-lg font-bold mb-4">历史修正记录</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">字段</th>
                  <th className="py-2 pr-4">变更</th>
                  <th className="py-2 pr-4">原因</th>
                  <th className="py-2 pr-4">操作人</th>
                  <th className="py-2">时间</th>
                </tr>
              </thead>
              <tbody>
                {amendments.map(a => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{AMEND_FIELDS.find(f => f.value === a.field)?.label ?? a.field}</td>
                    <td className="py-2 pr-4">
                      <span className="text-gray-500">{a.old_value}</span>
                      <span className="mx-1">→</span>
                      <span className="text-[#c9a96e] font-medium">{a.new_value}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{a.reason}</td>
                    <td className="py-2 pr-4">{a.operator}</td>
                    <td className="py-2 text-gray-400">{a.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
