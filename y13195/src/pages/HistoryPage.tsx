import { useParams, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { ArrowLeft, Clock, User, GitCompare } from 'lucide-react';

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const date = d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return { date, time };
}

export default function HistoryPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const records = useStore((s) => s.records);
  const getHistoriesByRecordId = useStore((s) => s.getHistoriesByRecordId);

  const record = records.find((r) => r.id === recordId) ?? null;
  const histories = recordId ? getHistoriesByRecordId(recordId) : [];

  return (
    <div className="min-h-screen bg-base-900">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-base-600 bg-base-800">
        <Link
          to="/"
          className="flex items-center gap-1 text-base-400 hover:text-industrial-blue-light transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-medium text-white">判断历史</h1>
        {record && (
          <span className="font-mono text-xs text-base-400">{record.id}</span>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {!record ? (
          <div className="flex flex-col items-center justify-center py-20 text-base-400">
            <Clock size={40} className="mb-3 opacity-30" />
            <p>未找到记录</p>
          </div>
        ) : histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-base-400">
            <Clock size={40} className="mb-3 opacity-30" />
            <p>暂无修改历史</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[88px] top-0 bottom-0 w-px bg-base-600" />

            {histories.map((entry, index) => {
              const { date, time } = formatTimestamp(entry.timestamp);
              return (
                <div key={entry.id} className="relative flex gap-4 pb-8 last:pb-0">
                  <div className="w-20 shrink-0 text-right pt-1">
                    <div className="font-mono text-xs text-base-400">{date}</div>
                    <div className="font-mono text-xs text-base-500">{time}</div>
                  </div>

                  <div className="relative flex items-start justify-center w-4 shrink-0 pt-1">
                    <div
                      className={`w-3 h-3 rounded-full bg-industrial-blue shadow-[0_0_8px_rgba(59,130,246,0.6)] ${
                        index === 0 ? 'ring-2 ring-industrial-blue/40' : ''
                      }`}
                    />
                  </div>

                  <div className="card-base flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={14} className="text-base-400" />
                      <span className="text-sm text-white">{entry.operator}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <GitCompare size={14} className="text-base-500" />
                      <span className="text-sm text-base-300">从</span>
                      <span className="font-mono text-sm text-amber-400">
                        {entry.previousJudgment}
                      </span>
                      <span className="text-sm text-base-300">改为</span>
                      <span className="font-mono text-sm text-blue-400">
                        {entry.newJudgment}
                      </span>
                    </div>

                    {entry.reason && (
                      <p className="text-xs text-base-500 leading-relaxed">
                        {entry.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
