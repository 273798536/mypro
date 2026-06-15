import { useMemo, useState } from 'react';
import { ChevronRight, FileText, Info } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import StatusBadge from '@/components/common/StatusBadge';
import { SplitRecord, TrackVersion } from '@/types';
import { formatDate, isAuthExpired } from '@/utils/storage';
import { getLatestVersion } from '@/utils/reason';
import DetailDrawer from './DetailDrawer';

function useFilteredRecords() {
  const records = useAppStore((s) => s.splitRecords);
  const versions = useAppStore((s) => s.trackVersions);
  const f = useAppStore((s) => s.filterState);
  return useMemo(() => {
    const vMap = new Map(versions.map((v) => [v.id, v]));
    return records
      .map((r) => {
        const v = vMap.get(r.trackVersionId);
        const latest = v ? getLatestVersion(versions, v.trackName) : undefined;
        return { r, v, latest };
      })
      .filter(({ r, v }) => {
        if (f.trackName && v?.trackName !== f.trackName) return false;
        if (f.performanceName && r.performanceName !== f.performanceName)
          return false;
        if (f.dateRangeStart && r.performanceDate < f.dateRangeStart) return false;
        if (f.dateRangeEnd && r.performanceDate > f.dateRangeEnd) return false;
        if (f.statusFilter && f.statusFilter !== 'all' && r.status !== f.statusFilter)
          return false;
        return true;
      });
  }, [records, versions, f]);
}

export default function AlignTable() {
  const rows = useFilteredRecords();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((x) => x.r.id === selectedId);

  return (
    <div>
      <div className="theater-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink-700">
              返场曲分账记录
            </h3>
            <p className="mt-0.5 text-xs text-ink-400">
              共 {rows.length} 条 · 点击行查看详情、补备注、加截图
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <Info size={14} />
            刷新后筛选条件、备注、截图均自动保留
          </div>
        </div>
        <div className="max-h-[620px] overflow-auto scrollbar-thin">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 z-10 bg-ink-50/95 backdrop-blur">
              <tr className="border-b border-ink-100 text-left text-xs font-semibold tracking-wide text-ink-500">
                <th className="px-5 py-3">曲目 / 版本</th>
                <th className="px-3 py-3">演出场次</th>
                <th className="px-3 py-3">演出日期</th>
                <th className="px-3 py-3 text-right">艺人</th>
                <th className="px-3 py-3 text-right">剧场</th>
                <th className="px-3 py-3 text-right">发行</th>
                <th className="px-3 py-3">授权到期</th>
                <th className="px-3 py-3">状态</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, v, latest }, idx) => {
                const isLatest = !!v?.isLatest;
                const expired = isAuthExpired(r.authExpiryDate);
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer border-b border-ink-50 transition hover:bg-amber-50/40 ${
                      idx % 2 ? 'bg-white' : 'bg-ink-50/40'
                    } ${selectedId === r.id ? '!bg-amber-100/60' : ''} ${
                      expired ? '!bg-rouge-50/60' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText
                          size={14}
                          className={isLatest ? 'text-pine-500' : 'text-ink-300'}
                        />
                        <div>
                          <div
                            className={`font-medium ${
                              isLatest
                                ? 'text-ink-800'
                                : 'italic text-ink-400'
                            }`}
                          >
                            {v?.trackName ?? '未知曲目'}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                            <span
                              className={
                                isLatest
                                  ? 'rounded bg-pine-100 px-1.5 py-0.5 text-pine-600 ring-1 ring-pine-400/30'
                                  : 'rounded bg-ink-100 px-1.5 py-0.5 text-ink-500'
                              }
                            >
                              {v?.versionTag}
                            </span>
                            {isLatest && (
                              <span className="rounded-full bg-pine-400/10 px-1.5 text-[10px] font-medium text-pine-500">
                                当前最新
                              </span>
                            )}
                            {!isLatest && latest && (
                              <span className="rounded bg-rattan-100 px-1.5 text-[10px] text-rattan-500">
                                最新为 {latest.versionTag}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-ink-700">
                      {r.performanceName}
                    </td>
                    <td className="px-3 py-3.5 text-ink-600">
                      {formatDate(r.performanceDate)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-ink-700 tabular-nums">
                      {r.artistRatio}%
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-ink-700 tabular-nums">
                      {r.venueRatio}%
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-ink-700 tabular-nums">
                      {r.distributionRatio}%
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`${
                          expired ? 'text-rouge-500' : 'text-ink-600'
                        } text-xs font-medium`}
                      >
                        {formatDate(r.authExpiryDate)}
                        {expired && (
                          <span className="ml-1 rounded bg-rouge-100 px-1 py-0.5 text-[10px]">
                            已到期
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight
                        size={16}
                        className="text-ink-300 transition group-hover:text-amber-500"
                      />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <p className="text-sm text-ink-400">
                      暂无符合条件的记录，试试调整筛选条件
                    </p>
                    <p className="mt-1 text-xs text-ink-300">
                      或者去「新人快速入口」加载样例数据
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DetailDrawer
          open
          record={selected.r}
          version={selected.v}
          latestVersion={selected.latest}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
