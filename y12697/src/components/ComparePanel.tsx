import type { ProcessingRecord, HistoryRecord } from '../../../shared/types';
import { formatDateTime } from '../utils';

interface Props {
  currentRecord: ProcessingRecord | null;
  history: HistoryRecord[];
}

function ValueBlock({ label, value, variant }: { label: string; value: string; variant: 'old' | 'new' | 'same' }) {
  const cls =
    variant === 'new'
      ? 'border-alert-green text-alert-green bg-alert-green/5'
      : variant === 'old'
        ? 'border-charcoal-600 text-charcoal-400 line-through'
        : 'border-charcoal-700 text-charcoal-200';
  return (
    <div className={`border rounded-sm px-3 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider text-charcoal-500 mb-0.5">{label}</div>
      <div className="font-mono text-xs break-all">{value || '—'}</div>
    </div>
  );
}

export default function ComparePanel({ currentRecord, history }: Props) {
  const previousRecord = history[1] ? history[1].processingRecordId : null;
  const latestHistory = history[0];

  const oldConclusion = history[1]?.changes?.find((c) => c.field === 'conclusion')?.oldValue as string | undefined;
  const oldRisk = history[1]?.changes?.find((c) => c.field === 'riskNotes')?.oldValue as string | undefined;

  const currentConclusion = currentRecord?.conclusion ?? '';
  const currentRisk = currentRecord?.riskNotes ?? '';

  return (
    <div className="card-panel h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-charcoal-800">
        <div className="text-sm font-medium">新旧结论并排对比</div>
        <div className="text-xs text-charcoal-500 mt-0.5 font-mono">
          {latestHistory
            ? `v${latestHistory.version} · ${latestHistory.operator} · ${formatDateTime(latestHistory.createdAt)}`
            : '无历史版本'}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-charcoal-500 mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-charcoal-500" /> 旧结论
              {history[1] ? <span className="ml-auto text-charcoal-600">v{history[1].version}</span> : null}
            </div>
            <ValueBlock label="结论" value={oldConclusion ?? '（空）'} variant="old" />
            <div className="h-2" />
            <ValueBlock label="风险备注" value={oldRisk ?? '（空）'} variant="old" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-charcoal-500 mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-alert-green" /> 新结论
              <span className="ml-auto text-charcoal-600">
                {latestHistory ? `v${latestHistory.version}` : '当前'}
              </span>
            </div>
            <ValueBlock
              label="结论"
              value={currentConclusion || '（空）'}
              variant={oldConclusion === currentConclusion ? 'same' : 'new'}
            />
            <div className="h-2" />
            <ValueBlock
              label="风险备注"
              value={currentRisk || '（空）'}
              variant={oldRisk === currentRisk ? 'same' : 'new'}
            />
          </div>
        </div>

        {latestHistory && (
          <div className="border-t border-charcoal-800 pt-4">
            <div className="text-[10px] uppercase tracking-wider text-charcoal-500 mb-2">
              本次变更明细
            </div>
            <div className="space-y-2">
              {latestHistory.changes.length === 0 && (
                <div className="text-xs text-charcoal-500">无字段变化</div>
              )}
              {latestHistory.changes.map((c, i) => (
                <div key={i} className="bg-charcoal-800/50 border border-charcoal-700 rounded-sm px-3 py-2">
                  <div className="text-[11px] text-charcoal-400 font-mono mb-1">{c.field}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-charcoal-400 line-through">
                      {JSON.stringify(c.oldValue) ?? '—'}
                    </div>
                    <div className="text-alert-green">{JSON.stringify(c.newValue) ?? '—'}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-charcoal-400">
              <span className="text-charcoal-500">修改原因：</span>
              {latestHistory.changeReason || '（未填写）'}
            </div>
          </div>
        )}

        {!previousRecord && history.length <= 1 && (
          <div className="text-center text-xs text-charcoal-500 py-6">
            尚无旧版本可供对比 · 提交复核后将自动生成对比
          </div>
        )}
      </div>
    </div>
  );
}
