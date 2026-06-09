import React from 'react';
import { ReagentRecord, RecordStatus } from '../types';

interface ReagentLedgerProps {
  reagents: ReagentRecord[];
}

const statusConfig: Record<RecordStatus, { label: string; bg: string; text: string }> = {
  valid: { label: '有效', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  invalid: { label: '无效', bg: 'bg-red-50', text: 'text-red-700' },
  review_needed: { label: '待审核', bg: 'bg-amber-50', text: 'text-amber-700' },
  expired: { label: '过期', bg: 'bg-red-50', text: 'text-red-700' },
};

export const ReagentLedger: React.FC<ReagentLedgerProps> = ({ reagents }) => {
  const unusable = reagents.filter(r => r.status !== 'valid');
  const usable = reagents.filter(r => r.status === 'valid');

  const renderRow = (r: ReagentRecord) => {
    const cfg = statusConfig[r.status];
    return (
      <tr key={r.reagentId} className={r.status !== 'valid' ? 'bg-red-50/50' : ''}>
        <td className="px-4 py-3 text-sm font-mono text-slate-700">{r.reagentId}</td>
        <td className="px-4 py-3 text-sm text-slate-800 font-medium">{r.reagentName}</td>
        <td className="px-4 py-3 text-sm text-slate-600">{r.batchNumber}</td>
        <td className="px-4 py-3 text-sm text-slate-600">{r.concentration}</td>
        <td className="px-4 py-3 text-sm text-slate-600">{r.expiryDate}</td>
        <td className="px-4 py-3 text-sm text-slate-600">{r.storageCondition}</td>
        <td className="px-4 py-3">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          {r.manualNote && (
            <div className="rounded bg-yellow-50 border border-yellow-200 px-2 py-1 text-xs text-yellow-800 mb-1">
              💬 {r.manualNote}
            </div>
          )}
          {r.handoverRemark && (
            <div className="rounded bg-red-50 border border-red-200 px-2 py-1 text-xs text-red-800">
              ⚠ {r.handoverRemark}
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-800">试剂台账 - 月底转交视图</h3>
        <p className="mt-1 text-xs text-slate-500">
          学生更关心哪些记录不能用：<span className="font-medium text-red-600">{unusable.length} 种状态异常</span>，
          {usable.length} 种正常。导出报告时异常记录会标红并写入"不可用记录"章节。
        </p>
      </div>
      {unusable.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <h4 className="text-sm font-semibold text-red-800 mb-2">
            ⚠ 不能使用/需重点关注的试剂（月底转交前必须处理）
          </h4>
          <div className="overflow-x-auto rounded-md border border-red-200 bg-white">
            <table className="w-full text-left">
              <thead className="bg-red-50/70 text-xs uppercase tracking-wider text-red-700">
                <tr>
                  <th className="px-4 py-2">编号</th>
                  <th className="px-4 py-2">名称</th>
                  <th className="px-4 py-2">批号</th>
                  <th className="px-4 py-2">浓度</th>
                  <th className="px-4 py-2">有效期</th>
                  <th className="px-4 py-2">储存</th>
                  <th className="px-4 py-2">状态</th>
                  <th className="px-4 py-2">备注/转交说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {unusable.map(renderRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">全部试剂</h4>
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">编号</th>
                <th className="px-4 py-2">名称</th>
                <th className="px-4 py-2">批号</th>
                <th className="px-4 py-2">浓度</th>
                <th className="px-4 py-2">有效期</th>
                <th className="px-4 py-2">储存</th>
                <th className="px-4 py-2">状态</th>
                <th className="px-4 py-2">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reagents.map(renderRow)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
