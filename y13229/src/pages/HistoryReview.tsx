import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  History,
  User,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  GitCompare,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { ChangeLog, SplitRecord, TrackVersion } from '@/types';
import { formatDateTime } from '@/utils/storage';
import { formatValue } from '@/utils/diff';
import { exportReviewCsv, downloadBlob } from '@/utils/export';

const fieldZh: Record<string, string> = {
  status: '状态',
  artistRatio: '艺人比例',
  venueRatio: '剧场比例',
  distributionRatio: '发行比例',
  authExpiryDate: '授权到期日',
  trackVersionId: '引用曲目版本',
  confirmedBy: '确认人',
  confirmedAt: '确认时间',
  'trackVersion.isLatest': '曲目最新版标记',
  performanceName: '演出场次',
  performanceDate: '演出日期',
  humanReason: '异常原因',
};

export default function HistoryReview() {
  const logs = useAppStore((s) => s.changeLogs);
  const records = useAppStore((s) => s.splitRecords);
  const versions = useAppStore((s) => s.trackVersions);
  const filter = useAppStore((s) => s.filterState);
  const user = useAppStore((s) => s.currentUser);

  const [openId, setOpenId] = useState<string | null>(null);

  const versionMap = useMemo(
    () => new Map(versions.map((v) => [v.id, v]) as [string, TrackVersion][]),
    [versions]
  );
  const recordMap = useMemo(
    () =>
      new Map(
        records.map((r) => [r.id, r]) as [string, SplitRecord][]
      ),
    [records]
  );

  const sortedLogs = useMemo(
    () =>
      logs
        .slice()
        .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1)),
    [logs]
  );

  function resolveId(id?: string) {
    if (!id) return '（空）';
    const v = versionMap.get(id);
    if (v) return `${v.trackName} · ${v.versionTag}`;
    return id;
  }

  function prettyValue(field: string, v: unknown) {
    if (field === 'trackVersionId' || field === 'oldValue' || field === 'newValue') {
      if (typeof v === 'string' && v.startsWith('tv_')) return resolveId(v);
    }
    if (typeof v === 'string' && v.startsWith('tv_')) return resolveId(v);
    return formatValue(v);
  }

  function handleExportReview() {
    const csv = exportReviewCsv({
      records,
      versions,
      notes: useAppStore.getState().notes,
      screenshots: useAppStore.getState().screenshots,
      changeLogs: logs,
      filter,
      generatedAt: new Date().toISOString(),
      user,
    });
    downloadBlob(
      csv,
      `评审复盘文档_${formatDateSafe()}.csv`,
      'text/csv;charset=utf-8'
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wider text-amber-500">
            历史变更 & 评审复盘
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink-800">
            每次变化都留痕，评审会上讲得清
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            人工确认前后的变化、切换最新版、调整比例——
            每一步都有人、有时间、有原因。评审会前直接导出复盘文档。
          </p>
        </div>
        <button onClick={handleExportReview} className="theater-btn-amber">
          <Download size={16} /> 导出评审复盘 CSV
        </button>
      </header>

      <div className="theater-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <History size={18} className="text-amber-500" />
          <h3 className="font-display text-base font-semibold text-ink-700">
            变更时间线
          </h3>
          <span className="ml-auto text-xs text-ink-400">
            共 {logs.length} 条变更记录
          </span>
        </div>

        {sortedLogs.length === 0 && (
          <div className="p-12 text-center text-ink-400">
            <RefreshCw size={32} className="mx-auto mb-3 opacity-40" />
            暂无变更记录。去主页操作一下就有了。
          </div>
        )}

        <ol className="relative ml-3 space-y-4 border-l-2 border-ink-100 pl-7">
          {sortedLogs.map((log, idx) => {
            const rec = recordMap.get(log.splitRecordId);
            const v = rec ? versionMap.get(rec.trackVersionId) : undefined;
            const isOpen = openId === log.id;
            const leftSide = idx % 2 === 0;
            return (
              <li key={log.id} className="relative">
                <span
                  className={`absolute -left-[34px] top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow ${
                    log.changedBy === '系统'
                      ? 'bg-rouge-400'
                      : 'bg-amber-400'
                  }`}
                >
                  {log.changedBy === '系统' ? (
                    <GitCompare size={11} className="text-white" />
                  ) : (
                    <User size={11} className="text-white" />
                  )}
                </span>
                <div
                  className={`rounded-xl border border-ink-100 bg-white p-4 shadow-card transition hover:border-amber-200 ${
                    !leftSide ? 'ml-0 md:ml-12' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-ink-700 px-2 py-0.5 text-[11px] text-white">
                      <FileText size={11} />
                      {v?.trackName ?? '未知曲目'}
                    </span>
                    <span className="text-xs text-ink-500">
                      {rec?.performanceName ?? '—'}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-400">
                      <User size={11} /> {log.changedBy}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
                      <Calendar size={11} />
                      {formatDateTime(log.changedAt)}
                    </span>
                  </div>

                  <button
                    onClick={() => setOpenId(isOpen ? null : log.id)}
                    className="mt-3 flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-700">
                        修改字段：
                        <span className="text-amber-600">
                          {fieldZh[log.fieldName] ?? log.fieldName}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        变更原因：{log.changeReason || '未说明'}
                      </p>
                    </div>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-ink-400" />
                    ) : (
                      <ChevronDown size={16} className="text-ink-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="mt-3 rounded-lg border border-ink-100 bg-ink-50 p-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="rounded-md border border-rouge-200 bg-rouge-50 p-2">
                          <p className="text-[11px] font-medium text-rouge-500">
                            变更前
                          </p>
                          <p className="mt-0.5 line-through text-sm text-rouge-700">
                            {prettyValue(log.fieldName, log.oldValue)}
                          </p>
                        </div>
                        <div className="rounded-md border border-pine-200 bg-pine-50 p-2">
                          <p className="text-[11px] font-medium text-pine-500">
                            变更后
                          </p>
                          <p className="mt-0.5 underline decoration-pine-400 decoration-2 underline-offset-2 text-sm text-pine-700">
                            {prettyValue(log.fieldName, log.newValue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function formatDateSafe() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
