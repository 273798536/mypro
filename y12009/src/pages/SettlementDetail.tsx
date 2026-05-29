import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Plus, Clock, ChevronRight } from 'lucide-react';
import { useSettlementStore } from '@/store';

const deductionTypeMap: Record<string, string> = {
  repair: '维修费',
  appraisal: '鉴定费',
  storage: '仓储费',
  other: '其他',
};

const fmt = (n: number) => '¥' + n.toLocaleString('zh-CN');

export default function SettlementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentDetail,
    trail,
    loadSettlementDetail,
    loadTrail,
    confirmSettlementAction,
    cancelSettlementAction,
    addDeductionAction,
    loading,
  } = useSettlementStore();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deductForm, setDeductForm] = useState({ type: 'repair', amount: '', description: '', sourceRef: '' });

  useEffect(() => {
    if (id) {
      loadSettlementDetail(id);
      loadTrail(id);
    }
  }, [id]);

  if (!currentDetail) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        {loading ? '加载中...' : '暂无数据'}
      </div>
    );
  }

  const { settlement, consignment, appraisalRecords, saleOrder, commissionRule, deductions } = currentDetail;
  const isPending = settlement.status === 'pending';
  const isCancelled = settlement.status === 'cancelled';

  const handleConfirm = () => id && confirmSettlementAction(id);
  const handleCancel = () => {
    if (!id || !cancelReason.trim()) return;
    cancelSettlementAction(id, cancelReason);
    setCancelOpen(false);
    setCancelReason('');
  };
  const handleAddDeduction = () => {
    if (!id || !deductForm.amount) return;
    addDeductionAction(id, {
      type: deductForm.type,
      amount: Number(deductForm.amount),
      description: deductForm.description,
      sourceRef: deductForm.sourceRef,
    });
    setDeductOpen(false);
    setDeductForm({ type: 'repair', amount: '', description: '', sourceRef: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">结算详情</h2>
        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
          isPending ? 'bg-yellow-100 text-yellow-700' :
          isCancelled ? 'bg-red-100 text-red-700' :
          'bg-green-100 text-green-700'
        }`}>{settlement.status}</span>
      </div>

      <div className="flex gap-6">
        <div className="w-[60%] space-y-6">
          <div className="bg-white rounded-lg shadow border-l-4 border-[#c9a96e] p-5 space-y-3">
            <h3 className="font-semibold text-gray-700 mb-2">寄售信息</h3>
            {([
              ['寄售编号', consignment.consignment_no],
              ['商品名称', consignment.item_name],
              ['品牌', consignment.item_brand],
              ['卖家', consignment.seller_name],
              ['联系方式', consignment.seller_contact],
              ['成色', consignment.item_condition],
              ['挂牌价', fmt(consignment.listed_price)],
              ['状态', consignment.status],
              ['创建时间', consignment.created_at],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-800 font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow border-l-4 border-[#c9a96e] p-5">
            <h3 className="font-semibold text-gray-700 mb-4">鉴定记录</h3>
            <div className="relative pl-6 space-y-4">
              {appraisalRecords.map((r, i) => (
                <div key={r.id} className="relative">
                  <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                    r.result === 'passed' ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'
                  }`} />
                  {i < appraisalRecords.length - 1 && <div className="absolute -left-[18px] top-4 w-0.5 h-full bg-gray-200" />}
                  <div className="ml-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">{r.appraisal_date}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        r.result === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{r.result === 'passed' ? '通过' : '退回'}</span>
                    </div>
                    <p className="text-sm text-gray-600">鉴定师: {r.appraiser}</p>
                    {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                  </div>
                </div>
              ))}
              {appraisalRecords.length === 0 && <p className="text-sm text-gray-400">暂无鉴定记录</p>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border-l-4 border-[#c9a96e] p-5 space-y-3">
            <h3 className="font-semibold text-gray-700 mb-2">成交信息</h3>
            {([
              ['成交单号', saleOrder?.sale_no ?? '-'],
              ['成交日期', saleOrder?.sale_date ?? '-'],
              ['成交价', saleOrder ? fmt(saleOrder.sale_price) : '-'],
              ['状态', saleOrder?.status ?? '-'],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className={`font-medium ${
                  label === '状态' && value === 'active' ? 'text-green-600' :
                  label === '状态' && value === 'cancelled' ? 'text-red-600' :
                  'text-gray-800'
                }`}>
                  {label === '状态' ? (value === 'active' ? '有效' : value === 'cancelled' ? '已取消' : value) : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-[40%] space-y-6">
          <div className="bg-white rounded-lg shadow border-l-4 border-[#c9a96e] p-5 space-y-3">
            <h3 className="font-semibold text-gray-700 mb-2">佣金试算</h3>
            {([
              ['规则名称', commissionRule?.name ?? '-'],
              ['费率', commissionRule ? (commissionRule.rate * 100) + '%' : '-'],
              ['固定费', commissionRule ? fmt(commissionRule.fixed_fee) : '-'],
              ['佣金金额', fmt(settlement.commission_amount)],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-800 font-medium">{value}</span>
              </div>
            ))}
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-500">
              成交价 × 费率 + 固定费 = 佣金：{fmt(saleOrder?.sale_price ?? 0)} × {commissionRule ? (commissionRule.rate * 100) + '%' : '-'} + {commissionRule ? fmt(commissionRule.fixed_fee) : '-'} = {fmt(settlement.commission_amount)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border-l-4 border-[#c9a96e] p-5">
            <h3 className="font-semibold text-gray-700 mb-3">费用抵扣明细</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left py-1.5 font-medium">类型</th>
                  <th className="text-right py-1.5 font-medium">金额</th>
                  <th className="text-left py-1.5 font-medium">说明</th>
                  <th className="text-left py-1.5 font-medium">来源</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700">{deductionTypeMap[d.type] ?? d.type}</td>
                    <td className="py-1.5 text-right text-gray-800">{fmt(d.amount)}</td>
                    <td className="py-1.5 text-gray-500">{d.description}</td>
                    <td className="py-1.5 text-gray-400">{d.source_ref}</td>
                  </tr>
                ))}
                {deductions.length === 0 && (
                  <tr><td colSpan={4} className="py-3 text-center text-gray-400">暂无抵扣</td></tr>
                )}
              </tbody>
            </table>
            <div className="flex justify-between mt-3 pt-2 border-t text-sm font-medium">
              <span className="text-gray-500">合计</span>
              <span className="text-gray-800">{fmt(settlement.total_deductions)}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border-l-4 border-[#c9a96e] p-5 text-center">
            <h3 className="font-semibold text-gray-700 mb-2">净结算额</h3>
            <p className="text-2xl font-bold text-[#c9a96e]">{fmt(settlement.net_amount)}</p>
            <p className="mt-2 text-xs text-gray-400">
              {fmt(saleOrder?.sale_price ?? 0)} - {fmt(settlement.commission_amount)} - {fmt(settlement.total_deductions)} = {fmt(settlement.net_amount)}
            </p>
            {saleOrder?.sale_no && (
              <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                来源: {saleOrder.sale_no}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5 space-y-4">
        <div className="flex gap-3">
          {isPending && (
            <button onClick={handleConfirm} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
              <Check size={16} />确认结算
            </button>
          )}
          {!isCancelled && (
            <button onClick={() => setCancelOpen(true)} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm">
              <X size={16} />取消结算
            </button>
          )}
          <button onClick={() => setDeductOpen(true)} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm">
            <Plus size={16} />添加抵扣
          </button>
          <button onClick={() => navigate(`/settlement/${id}/amend`)} disabled={isCancelled || loading} className="flex items-center gap-1.5 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm">
            <ChevronRight size={16} />修改
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-3">来源追溯</h3>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {trail.map((t, i) => (
              <div key={t.id} className="flex items-start shrink-0">
                <div className="flex flex-col items-center w-36">
                  <div className="w-7 h-7 rounded-full bg-[#c9a96e] flex items-center justify-center">
                    <Clock size={14} className="text-white" />
                  </div>
                  <span className="mt-1 text-xs font-medium text-gray-700">{t.ref_no}</span>
                  <span className="text-xs text-gray-400 text-center leading-tight">{t.description}</span>
                  <span className="text-xs text-gray-300 mt-0.5">{t.timestamp}</span>
                </div>
                {i < trail.length - 1 && <ChevronRight size={16} className="mt-1.5 text-gray-300 mx-1" />}
              </div>
            ))}
            {trail.length === 0 && <p className="text-sm text-gray-400">暂无追溯记录</p>}
          </div>
        </div>
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCancelOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-3">取消结算</h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="请输入取消原因..."
              className="w-full border rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setCancelOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">关闭</button>
              <button onClick={handleCancel} disabled={!cancelReason.trim()} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">确认取消</button>
            </div>
          </div>
        </div>
      )}

      {deductOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeductOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-3">添加抵扣</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">类型</label>
                <select
                  value={deductForm.type}
                  onChange={(e) => setDeductForm({ ...deductForm, type: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="repair">维修费</option>
                  <option value="appraisal">鉴定费</option>
                  <option value="storage">仓储费</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">金额</label>
                <input
                  type="number"
                  value={deductForm.amount}
                  onChange={(e) => setDeductForm({ ...deductForm, amount: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">说明</label>
                <input
                  value={deductForm.description}
                  onChange={(e) => setDeductForm({ ...deductForm, description: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">来源单号</label>
                <input
                  value={deductForm.sourceRef}
                  onChange={(e) => setDeductForm({ ...deductForm, sourceRef: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeductOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">关闭</button>
              <button onClick={handleAddDeduction} disabled={!deductForm.amount} className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">确认添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
