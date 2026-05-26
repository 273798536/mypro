import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calculator, Plus, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useClaimStore } from '@/store/claimStore';
import { AnomalyAlert, SourceBadge } from '@/components/Badges';
import { Card, Button, Input } from '@/components/UI';
import { calculatePayout, matchDeductRule, detectAnomalies, generateCalculationNote } from '@/utils/rulesEngine';
import type { Receipt, Supplement } from '@/types';

export default function ClaimEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const claim = useClaimStore((state) => state.getClaimById(id || ''));
  const deductRules = useClaimStore((state) => state.deductRules);
  const updateClaim = useClaimStore((state) => state.updateClaim);
  const recalculateClaim = useClaimStore((state) => state.recalculateClaim);
  const addReceipt = useClaimStore((state) => state.addReceipt);
  const removeReceipt = useClaimStore((state) => state.removeReceipt);
  const addSupplement = useClaimStore((state) => state.addSupplement);
  const updateSupplement = useClaimStore((state) => state.updateSupplement);
  const updateClaimStatus = useClaimStore((state) => state.updateClaimStatus);
  const getAllReceiptNos = useClaimStore((state) => state.getAllReceiptNos);

  const [newReceipt, setNewReceipt] = useState({
    receiptNo: '',
    amount: '',
    issueDate: new Date().toISOString().split('T')[0],
    source: 'manual' as 'system' | 'manual',
  });
  const [newSupplement, setNewSupplement] = useState({
    itemName: '',
    status: 'pending' as Supplement['status'],
    remark: '',
  });
  const [conclusion, setConclusion] = useState('');
  const [calcResult, setCalcResult] = useState<ReturnType<typeof calculatePayout> | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (claim) {
      setConclusion(claim.conclusion);
      const rule = matchDeductRule(claim.policy.productName, deductRules);
      if (rule) {
        const totalAmount = claim.receipts.reduce((sum, r) => sum + r.amount, 0);
        setCalcResult(calculatePayout(totalAmount, rule));
      }
    }
  }, [claim, deductRules]);

  if (!claim) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">理赔单不存在</p>
        <Button onClick={() => navigate('/claims')} className="mt-4">
          <ArrowLeft size={16} />
          返回列表
        </Button>
      </div>
    );
  }

  const handleCalculate = () => {
    const result = recalculateClaim(claim.id);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const handleAddReceipt = () => {
    setReceiptError('');
    if (!newReceipt.receiptNo || !newReceipt.amount) {
      setReceiptError('请填写票据号和金额');
      return;
    }

    const allReceiptNos = getAllReceiptNos();
    if (allReceiptNos.has(newReceipt.receiptNo)) {
      setReceiptError('该票据号已存在，涉嫌重复报销！');
      return;
    }

    const result = addReceipt(claim.id, {
      receiptNo: newReceipt.receiptNo,
      amount: parseFloat(newReceipt.amount),
      issueDate: newReceipt.issueDate,
      source: newReceipt.source,
    });

    if (result.success) {
      setNewReceipt({ receiptNo: '', amount: '', issueDate: new Date().toISOString().split('T')[0], source: 'manual' });
    } else {
      setReceiptError(result.message);
    }
  };

  const handleRemoveReceipt = (receiptId: string) => {
    if (confirm('确定要删除该票据吗？')) {
      removeReceipt(claim.id, receiptId);
    }
  };

  const handleAddSupplement = () => {
    if (!newSupplement.itemName) return;
    addSupplement(claim.id, newSupplement);
    setNewSupplement({ itemName: '', status: 'pending', remark: '' });
  };

  const handleSave = () => {
    const anomalies = detectAnomalies(claim, getAllReceiptNos());
    if (anomalies.includes('not_recalculated')) {
      if (!confirm('数据已变更，尚未重新计算。是否继续保存？')) {
        return;
      }
    }
    if (anomalies.includes('duplicate_receipt')) {
      alert('存在重复票据，请先处理后再保存！');
      return;
    }
    updateClaim(claim.id, { conclusion });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleApprove = () => {
    const reason = prompt('请输入审核通过原因：', conclusion || '材料齐全，计算无误');
    if (reason !== null) {
      updateClaimStatus(claim.id, 'approved', reason);
      navigate(`/claims/${claim.id}`);
    }
  };

  const handleReject = () => {
    const reason = prompt('请输入驳回原因：', '');
    if (reason) {
      updateClaimStatus(claim.id, 'rejected', reason);
      navigate(`/claims/${claim.id}`);
    }
  };

  const currentTotal = claim.receipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/claims/${claim.id}`)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">编辑复核</h1>
            <p className="text-sm text-slate-500 mt-1">
              {claim.claimant} | {claim.policy.productName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/claims/${claim.id}`)}>
            取消
          </Button>
          <Button variant="warning" onClick={handleReject}>
            <XCircle size={16} />
            驳回
          </Button>
          <Button variant="success" onClick={handleApprove}>
            <CheckCircle size={16} />
            通过
          </Button>
          <Button onClick={handleSave}>
            <Save size={16} />
            保存
          </Button>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
          <CheckCircle size={18} />
          操作成功
        </div>
      )}

      <AnomalyAlert anomalies={claim.anomalies} onRecalculate={claim.needsRecalculate ? handleCalculate : undefined} />

      <div className="grid grid-cols-3 gap-6">
        <Card title="赔付计算" icon={<Calculator size={18} className="text-blue-600" />}>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="text-sm text-blue-600 mb-1">当前票据总额</div>
              <div className="text-2xl font-bold text-blue-700">¥{currentTotal.toFixed(2)}</div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">免赔额</span>
                <span className="font-medium">¥{claim.deductRule.deductibleAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">共保比例</span>
                <span className="font-medium">{(claim.deductRule.coinsuranceRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">应付赔付</span>
                <span className="font-bold text-lg text-blue-600">
                  ¥{((currentTotal - claim.deductRule.deductibleAmount) * claim.deductRule.coinsuranceRate).toFixed(2)}
                </span>
              </div>
            </div>

            <Button variant="warning" className="w-full" onClick={handleCalculate}>
              <Calculator size={16} />
              执行规则引擎计算
            </Button>

            {calcResult && (
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <div className="font-medium text-slate-700 mb-2">计算明细：</div>
                {calcResult.calculationSteps.map((step, i) => (
                  <div key={i}>{step}</div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="票据管理" icon={<Plus size={18} className="text-blue-600" />} className="col-span-2">
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3 items-end">
              <Input
                label="票据号"
                value={newReceipt.receiptNo}
                onChange={(v) => setNewReceipt({ ...newReceipt, receiptNo: v })}
                placeholder="如：INV-2025-0001"
              />
              <Input
                label="金额 (元)"
                type="number"
                value={newReceipt.amount}
                onChange={(v) => setNewReceipt({ ...newReceipt, amount: v })}
                placeholder="0.00"
              />
              <Input
                label="开票日期"
                type="date"
                value={newReceipt.issueDate}
                onChange={(v) => setNewReceipt({ ...newReceipt, issueDate: v })}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">来源</label>
                <select
                  value={newReceipt.source}
                  onChange={(e) => setNewReceipt({ ...newReceipt, source: e.target.value as 'system' | 'manual' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">人工录入</option>
                  <option value="system">系统导入</option>
                </select>
              </div>
              <Button onClick={handleAddReceipt}>
                <Plus size={16} />
                添加
              </Button>
            </div>
            {receiptError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle size={14} />
                {receiptError}
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {claim.receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    receipt.isDuplicate ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm">{receipt.receiptNo}</span>
                    <span className="text-sm text-slate-500">{receipt.issueDate}</span>
                    <SourceBadge source={receipt.source} />
                    {receipt.isDuplicate && (
                      <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertTriangle size={12} />
                        与其他理赔单重复
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">¥{receipt.amount.toFixed(2)}</span>
                    <button
                      onClick={() => handleRemoveReceipt(receipt.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="补充材料">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 items-end">
            <Input
              label="材料名称"
              value={newSupplement.itemName}
              onChange={(v) => setNewSupplement({ ...newSupplement, itemName: v })}
              placeholder="如：身份证复印件"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
              <select
                value={newSupplement.status}
                onChange={(e) => setNewSupplement({ ...newSupplement, status: e.target.value as Supplement['status'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">待提供</option>
                <option value="provided">已提供</option>
                <option value="waived">已豁免</option>
              </select>
            </div>
            <Input
              label="备注"
              value={newSupplement.remark}
              onChange={(v) => setNewSupplement({ ...newSupplement, remark: v })}
              placeholder="可选"
            />
            <Button onClick={handleAddSupplement}>
              <Plus size={16} />
              添加
            </Button>
          </div>

          <div className="space-y-2">
            {claim.supplements.map((supplement) => (
              <div key={supplement.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-slate-800">{supplement.itemName}</span>
                  <span className="text-sm text-slate-500">{supplement.remark}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={supplement.status}
                    onChange={(e) => updateSupplement(claim.id, supplement.id, { status: e.target.value as Supplement['status'] })}
                    className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">待提供</option>
                    <option value="provided">已提供</option>
                    <option value="waived">已豁免</option>
                  </select>
                </div>
              </div>
            ))}
            {claim.supplements.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">暂无补充材料要求</p>
            )}
          </div>
        </div>
      </Card>

      <Card title="赔付结论">
        <textarea
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="请输入赔付结论说明..."
        />
        <div className="mt-2 text-xs text-slate-400 flex justify-between">
          <span>结论将随赔付说明一起导出</span>
          <span>{conclusion.length} 字</span>
        </div>
      </Card>
    </div>
  );
}
