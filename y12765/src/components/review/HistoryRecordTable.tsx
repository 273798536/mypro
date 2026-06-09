import { History, ArrowRight, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVerificationStore } from '@/store/useVerificationStore';
import type { VerificationRecord } from '@/types';

function StatusChip({ status }: { status: VerificationRecord['status'] }) {
  if (status === 'pass') return <span className="chip bg-pass-500 text-white"><CheckCircle size={11} />通过</span>;
  if (status === 'review') return <span className="chip bg-warn-500 text-white"><AlertTriangle size={11} />待复核</span>;
  if (status === 'fail') return <span className="chip bg-fail-500 text-white"><XCircle size={11} />不合格</span>;
  return <span className="chip bg-slate-100 text-slate-600">待核验</span>;
}

export default function HistoryRecordTable() {
  const { historyRecords, loadRecord, temperatureProfiles } = useVerificationStore();
  const nav = useNavigate();

  return (
    <div className="card p-4">
      <div className="section-title">
        <History size={18} className="text-brand-700" />
        历史核验记录
      </div>
      <div className="overflow-auto -mx-2 px-2">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2 py-2 text-left">批次号</th>
              <th className="px-2 py-2 text-left">核验时间</th>
              <th className="px-2 py-2 text-left">温度曲线</th>
              <th className="px-2 py-2 text-left">汇总</th>
              <th className="px-2 py-2 text-left">判定</th>
              <th className="px-2 py-2 text-left">复核人</th>
              <th className="px-2 py-2 w-24 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {historyRecords.map((r) => {
              const p = temperatureProfiles.find((x) => x.id === r.temperatureProfileId);
              return (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-2 font-mono text-brand-700 font-semibold">{r.batchNumber}</td>
                  <td className="px-2 py-2 text-slate-600">{r.createdAt}</td>
                  <td className="px-2 py-2 text-slate-600 text-xs">
                    {p ? `${p.version} · ${p.name}` : '未选择'}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600">
                    <span className="text-pass-700 font-medium">{r.summary.passCount}</span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="text-warn-700 font-medium">{r.summary.reviewCount}</span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="text-fail-700 font-medium">{r.summary.failCount}</span>
                    <span className="text-slate-400 ml-1">共{r.summary.total}</span>
                  </td>
                  <td className="px-2 py-2"><StatusChip status={r.status} /></td>
                  <td className="px-2 py-2 text-slate-600 text-xs">{r.reviewedBy}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      className="btn-ghost !py-1 !px-2 text-xs"
                      onClick={() => { loadRecord(r.id); nav('/'); }}
                    >
                      复盘 <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
