import React from 'react';
import { Building2, FileText, Banknote, AlertCircle, Lightbulb, ChevronRight } from 'lucide-react';
import { MatchRecord } from '../types';
import { RiskBadge } from './RiskBadge';
import { batchStatusLabels } from '../data/mockData';

interface DetailPanelProps {
  record: MatchRecord;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0
  }).format(amount);
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ record }) => {
  const { project, batch, payment, risks } = record;

  return (
    <div className="bg-slate-900/50 border-t border-slate-700 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">项目档案</span>
            <span className="text-xs text-slate-500 ml-auto">来源：项目管理系统</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">项目名称</span>
              <span className="text-slate-200 text-right">{project.projectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">项目编号</span>
              <span className="text-slate-200 font-mono">{project.projectId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">项目类型</span>
              <span className="text-slate-200">{project.projectType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">所属省份</span>
              <span className="text-slate-200">{project.province}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">装机容量</span>
              <span className="text-slate-200">{project.installedCapacity} MW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">并网时间</span>
              <span className="text-slate-200">{project.gridConnectionDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">并网证明</span>
              <span className="text-slate-200 font-mono text-xs">{project.gridCertificateNo}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-200">补贴批次</span>
            <span className="text-xs text-slate-500 ml-auto">来源：补贴申报系统</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">批次号</span>
              <span className="text-slate-200 font-mono">{batch.batchNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">批次状态</span>
              <span className="text-slate-200">{batchStatusLabels[batch.status]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">申报时间</span>
              <span className="text-slate-200">{batch.declarationDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">应补贴金额</span>
              <span className="text-emerald-400 font-medium">{formatAmount(batch.subsidyAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">发票编号</span>
              <span className="text-slate-200 font-mono text-xs">{batch.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">开票日期</span>
              <span className="text-slate-200">{batch.invoiceDate}</span>
            </div>
            {batch.isInvoiceReversed && (
              <div className="flex justify-between">
                <span className="text-rose-400">红冲原因</span>
                <span className="text-rose-300">{batch.reverseReason}</span>
              </div>
            )}
            {batch.mergedFromBatches && (
              <div className="flex justify-between items-start">
                <span className="text-violet-400">合并来源</span>
                <span className="text-violet-300 text-right font-mono text-xs">
                  {batch.mergedFromBatches.join('\n')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
            <Banknote className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-200">到账报告</span>
            <span className="text-xs text-slate-500 ml-auto">来源：银行流水系统</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">到账编号</span>
              <span className="text-slate-200 font-mono">{payment.paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">到账日期</span>
              <span className="text-slate-200">{payment.paymentDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">到账金额</span>
              <span className="text-amber-400 font-medium">{formatAmount(payment.paymentAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">银行流水号</span>
              <span className="text-slate-200 font-mono text-xs">{payment.bankSerialNo}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-400">付款方</span>
              <span className="text-slate-200 text-right text-xs">{payment.payer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">收款账号</span>
              <span className="text-slate-200 font-mono">{payment.receiverAccount}</span>
            </div>
          </div>
        </div>
      </div>

      {risks.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-200">风险说明</span>
            <span className="text-xs text-slate-500 ml-auto">共 {risks.length} 项风险</span>
          </div>
          <div className="space-y-3">
            {risks.map((risk) => (
              <div key={risk.riskId} className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <RiskBadge riskType={risk.riskType} size="md" />
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    risk.riskLevel === 'high' ? 'bg-rose-900/50 text-rose-300' :
                    risk.riskLevel === 'medium' ? 'bg-amber-900/50 text-amber-300' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {risk.riskLevel === 'high' ? '高风险' : risk.riskLevel === 'medium' ? '中风险' : '低风险'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-slate-400 min-w-16">风险描述</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{risk.description}</span>
                  </div>
                  <div className="flex gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-400 min-w-14">处理建议</span>
                    <span className="text-amber-300">{risk.suggestion}</span>
                  </div>
                  {risk.relatedBatches && risk.relatedBatches.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-slate-400 min-w-16">关联批次</span>
                      <span className="text-slate-400 font-mono">
                        {risk.relatedBatches.join('、')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPanel;
