import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Download, FileText, Table, FileJson, Calendar, User, Shield, FileCheck } from 'lucide-react';
import { useClaimStore } from '@/store/claimStore';
import { StatusBadge, AnomalyBadge, SourceBadge, AnomalyAlert } from '@/components/Badges';
import { Card, DataRow, Button } from '@/components/UI';
import { exportToJSON, exportToCSV, exportCalculationNote } from '@/utils/export';
import { calculatePayout } from '@/utils/rulesEngine';
import { useState } from 'react';

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const claim = useClaimStore((state) => state.getClaimById(id || ''));
  const recalculateClaim = useClaimStore((state) => state.recalculateClaim);
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  const calcResult = calculatePayout(claim.totalAmount, claim.deductRule);

  const handleExport = (type: 'json' | 'csv' | 'note') => {
    if (type === 'json') exportToJSON(claim);
    if (type === 'csv') exportToCSV(claim);
    if (type === 'note') exportCalculationNote(claim, calcResult.calculationSteps, claim.anomalies);
    setShowExportMenu(false);
  };

  const handleRecalculate = () => {
    const result = recalculateClaim(claim.id);
    if (result.success) {
      alert('重新计算完成');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/claims')}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              理赔单详情
              <span className="text-lg font-mono text-blue-600">{claim.id}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              申请人：{claim.claimant} | 保单号：{claim.policyNo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Button variant="secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download size={16} />
              导出
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileJson size={14} />
                  导出 JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <Table size={14} />
                  导出 CSV
                </button>
                <button
                  onClick={() => handleExport('note')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileText size={14} />
                  导出赔付说明
                </button>
              </div>
            )}
          </div>
          <Button onClick={() => navigate(`/claims/${claim.id}/edit`)}>
            <Edit2 size={16} />
            编辑复核
          </Button>
        </div>
      </div>

      <AnomalyAlert anomalies={claim.anomalies} onRecalculate={claim.needsRecalculate ? handleRecalculate : undefined} />

      <div className="grid grid-cols-3 gap-6">
        <Card title="基本信息" icon={<User size={18} className="text-blue-600" />}>
          <DataRow label="理赔单号" value={<span className="font-mono">{claim.id}</span>} />
          <DataRow label="申请人" value={claim.claimant} />
          <DataRow label="当前状态" value={<StatusBadge status={claim.status} />} />
          <DataRow label="创建时间" value={new Date(claim.createdAt).toLocaleString('zh-CN')} />
          <DataRow label="更新时间" value={new Date(claim.updatedAt).toLocaleString('zh-CN')} />
        </Card>

        <Card title="保单信息" icon={<Shield size={18} className="text-blue-600" />}>
          <DataRow label="保单号" value={<span className="font-mono">{claim.policy.policyNo}</span>} />
          <DataRow label="被保险人" value={claim.policy.policyholder} />
          <DataRow label="产品名称" value={claim.policy.productName} />
          <DataRow label="保险金额" value={`¥${claim.policy.coverage.toLocaleString()}`} />
          <DataRow label="保险期间" value={`${claim.policy.effectiveDate} 至 ${claim.policy.expiryDate}`} />
          <DataRow label="数据来源" value={<SourceBadge source={claim.policy.source} />} />
        </Card>

        <Card title="赔付计算" icon={<FileCheck size={18} className="text-blue-600" />}>
          <DataRow label="总费用金额" value={`¥${claim.totalAmount.toFixed(2)}`} />
          <DataRow label="免赔额" value={`¥${claim.deductible.toFixed(2)}`} />
          <DataRow label="共保比例" value={`${(claim.coinsuranceRate * 100).toFixed(0)}%`} />
          <DataRow label="赔付金额" value={<span className="text-xl font-bold text-blue-600">¥{claim.payoutAmount.toFixed(2)}</span>} highlight />
          <DataRow label="适用规则" value={claim.deductRule.ruleName} />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="票据明细" icon={<FileText size={18} className="text-blue-600" />}>
          <div className="space-y-3">
            {claim.receipts.map((receipt) => (
              <div
                key={receipt.id}
                className={`p-3 rounded-lg border ${receipt.isDuplicate ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-slate-700">{receipt.receiptNo}</span>
                  <div className="flex items-center gap-2">
                    <SourceBadge source={receipt.source} />
                    {receipt.isDuplicate && <span className="text-xs text-red-600 font-medium">⚠️ 重复</span>}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">金额</span>
                  <span className="font-semibold text-slate-800">¥{receipt.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">开票日期</span>
                  <span className="text-slate-700">{receipt.issueDate}</span>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-200 flex justify-between font-semibold">
              <span>合计</span>
              <span className="text-blue-600">¥{claim.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <Card title="补充材料" icon={<Calendar size={18} className="text-blue-600" />}>
          {claim.supplements.length > 0 ? (
            <div className="space-y-3">
              {claim.supplements.map((supplement) => (
                <div key={supplement.id} className="p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800">{supplement.itemName}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        supplement.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : supplement.status === 'provided'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {supplement.status === 'pending' ? '待提供' : supplement.status === 'provided' ? '已提供' : '已豁免'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{supplement.remark || '无备注'}</p>
                  <p className="text-xs text-slate-400 mt-1">创建于 {new Date(supplement.createdAt).toLocaleString('zh-CN')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">无需补充材料</p>
          )}
        </Card>
      </div>

      <Card title="计算过程" icon={<FileText size={18} className="text-blue-600" />}>
        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          {calcResult.calculationSteps.map((step, index) => (
            <p key={index} className="text-sm text-slate-700">
              <span className="inline-block w-6 text-slate-400">{index + 1}.</span>
              {step}
            </p>
          ))}
        </div>
      </Card>

      <Card title="赔付结论" icon={<FileCheck size={18} className="text-blue-600" />}>
        <p className="text-sm text-slate-700 leading-relaxed">{claim.conclusion || '暂无结论'}</p>
      </Card>
    </div>
  );
}
