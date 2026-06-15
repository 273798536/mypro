import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Sparkles,
  MapPin,
  AlertTriangle,
  Ban,
  FileWarning,
  Download,
  Printer,
  PlayCircle,
  Clock,
  CheckCircle2,
  RefreshCcw,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Users,
} from 'lucide-react';
import StatusBadge from '@/components/common/StatusBadge';
import { exportHandoverCsv, exportReviewCsv, downloadBlob } from '@/utils/export';
import { formatDate, formatDateTime } from '@/utils/storage';
import { SplitRecord, STATUS_LABEL, TrackVersion } from '@/types';

export default function QuickStart() {
  const init = useAppStore((s) => s.init);
  const loadSample = useAppStore((s) => s.loadSample);
  const resetAll = useAppStore((s) => s.resetAll);
  const unlockSuspended = useAppStore((s) => s.unlockSuspended);
  const records = useAppStore((s) => s.splitRecords);
  const versions = useAppStore((s) => s.trackVersions);
  const notes = useAppStore((s) => s.notes);
  const shots = useAppStore((s) => s.screenshots);
  const logs = useAppStore((s) => s.changeLogs);
  const filter = useAppStore((s) => s.filterState);
  const user = useAppStore((s) => s.currentUser);

  const stats = useMemo(() => {
    const suspended = records.filter((r) => r.status === 'suspended').length;
    const conflicted = records.filter((r) => r.status === 'conflicted').length;
    const missing = records.filter((r) => r.status === 'missing_note').length;
    const pending = records.filter((r) => r.status === 'pending').length;
    const aligned = records.filter((r) => r.status === 'aligned').length;
    return { suspended, conflicted, missing, pending, aligned, total: records.length };
  }, [records]);

  const [confirmUser, setConfirmUser] = useState<string>('接手同事');

  const versionMap = useMemo(
    () => new Map(versions.map((v) => [v.id, v]) as [string, TrackVersion][]),
    [versions]
  );

  const ctx = {
    records,
    versions,
    notes,
    screenshots: shots,
    changeLogs: logs,
    filter,
    generatedAt: new Date().toISOString(),
    user,
  };

  function handleHandover() {
    const csv = exportHandoverCsv(ctx);
    downloadBlob(
      csv,
      `剧场返场曲分账交接清单_${stamp()}.csv`,
      'text/csv;charset=utf-8'
    );
  }
  function handleReview() {
    const csv = exportReviewCsv(ctx);
    downloadBlob(
      csv,
      `评审复盘_${stamp()}.csv`,
      'text/csv;charset=utf-8'
    );
  }
  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium tracking-wider text-amber-500">
          新人快速入口
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink-800">
          接班只需看三样：样例在哪、异常在哪、结果怎么导出
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          不看大段说明。一键加载样例体验完整流程；
          一眼看到所有红黄绿异常；点一下就能导出交接给演出/发行同事。
        </p>
      </header>

      {/* 三大卡片：样例 / 异常 / 导出 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="theater-card relative overflow-hidden border-2 border-amber-300 p-5">
          <div className="absolute -right-6 -top-6 text-8xl opacity-10 text-amber-500">
            <Sparkles size={120} />
          </div>
          <div className="relative">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-ink-900">
              <PlayCircle size={24} />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink-800">
              加载样例数据
            </h3>
            <p className="mt-1.5 text-sm text-ink-500">
              包含授权到期、版本冲突、口头备注等典型异常场景，
              点一下就能模拟完整流程。
            </p>
            <div className="mt-4 space-y-2">
              <button onClick={loadSample} className="theater-btn-primary w-full">
                <Sparkles size={14} /> （重新）加载演示样例
              </button>
              <button
                onClick={() => {
                  resetAll();
                  init();
                }}
                className="theater-btn-ghost w-full text-xs"
              >
                <RefreshCcw size={12} /> 清空恢复到初始状态
              </button>
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-ink-700">
              <b className="text-amber-700">样例里包含什么？</b>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>《夜航西飞》v1.0 → v1.2 三版本冲突</li>
                <li>《旧日慢板》授权已到期自动挂起</li>
                <li>《灯塔与海》一条口头备注待补</li>
                <li>《未寄出的信》待人工确认</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="theater-card p-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rouge-400 to-rattan-400 text-white">
            <MapPin size={22} />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-800">
            异常看板（一眼找到坑）
          </h3>
          <p className="mt-1.5 text-sm text-ink-500">
            红=必须挂起，黄=小心处理，绿=可以安心交接。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat
              icon={<Ban size={16} />}
              label="授权到期"
              value={stats.suspended}
              cls="bg-rouge-100 text-rouge-600"
              bar="bg-rouge-400"
            />
            <Stat
              icon={<AlertTriangle size={16} />}
              label="版本冲突"
              value={stats.conflicted}
              cls="bg-rattan-100 text-rattan-600"
              bar="bg-rattan-400"
            />
            <Stat
              icon={<FileWarning size={16} />}
              label="备注待补"
              value={stats.missing}
              cls="bg-amber-100 text-amber-700"
              bar="bg-amber-400"
            />
            <Stat
              icon={<Clock size={16} />}
              label="待确认"
              value={stats.pending}
              cls="bg-ink-100 text-ink-600"
              bar="bg-ink-400"
            />
          </div>
          {stats.total === 0 && (
            <p className="mt-4 rounded-lg border border-dashed border-ink-200 p-3 text-center text-xs text-ink-400">
              还没数据，先去左边加载样例吧
            </p>
          )}
          {stats.total > 0 && (
            <div className="mt-4 rounded-lg bg-ink-50 p-3">
              <p className="text-[11px] font-medium text-ink-500">
                记录总数 {stats.total} ·{' '}
                <b className="text-pine-600">已对齐 {stats.aligned}</b>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-pine-400 transition-all"
                  style={{
                    width: `${stats.total ? (stats.aligned / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="theater-card p-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-pine-400 text-white">
            <Download size={22} />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-800">
            结果一键导出
          </h3>
          <p className="mt-1.5 text-sm text-ink-500">
            给演出同事、发行同事、接手同事——各自拿各自那份。
          </p>
          <div className="mt-4 space-y-2">
            <button
              onClick={handleHandover}
              className="theater-btn-primary w-full justify-start"
              disabled={stats.total === 0}
            >
              <FileSpreadsheet size={16} /> 导出交接清单（CSV）
              <span className="ml-auto text-[11px] opacity-80">
                给演出/发行
              </span>
            </button>
            <button
              onClick={handleReview}
              className="theater-btn-ghost w-full justify-start"
              disabled={logs.length === 0}
            >
              <FileText size={16} /> 导出评审复盘文档
              <span className="ml-auto text-[11px] text-ink-400">评审会用</span>
            </button>
            <button
              onClick={handlePrint}
              className="theater-btn-ghost w-full justify-start"
              disabled={stats.total === 0}
            >
              <Printer size={16} /> 打印交接单
              <span className="ml-auto text-[11px] text-ink-400">纸质版</span>
            </button>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-pine-200 bg-pine-50/50 p-3 text-[11px] leading-relaxed text-pine-700">
            <BookOpen size={14} className="shrink-0" />
            <div>
              <b>交接清单里包含：</b>
              曲目、版本、是否最新版、分账比例三项、
              授权到期日、状态、<b>人话版异常原因</b>、操作人、
              以及<b>带来源标签的所有备注</b>。
            </div>
          </div>
        </div>
      </div>

      {/* 挂起处理专区 */}
      {stats.suspended > 0 && (
        <section className="theater-card border-rouge-200 p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rouge-100 text-rouge-500">
              <Ban size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-rouge-700">
                挂起专区：接手同事，请在这里确认
              </h3>
              <p className="text-xs text-ink-500">
                授权到期的曲目不会自动给出结论，必须有人确认后才解锁继续。
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {records
              .filter((r) => r.status === 'suspended')
              .map((r) => (
                <SuspendedRow
                  key={r.id}
                  record={r}
                  version={versionMap.get(r.trackVersionId)}
                  confirmUser={confirmUser}
                  onConfirmUserChange={setConfirmUser}
                  onUnlock={(uid2, who) => unlockSuspended(uid2, who)}
                />
              ))}
          </div>
        </section>
      )}

      {/* 交接班清单预览 */}
      {records.length > 0 && (
        <section className="theater-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-amber-500" />
              <h3 className="font-display text-base font-semibold text-ink-700">
                交接班清单预览（给演出/发行同事）
              </h3>
            </div>
            <button onClick={handleHandover} className="theater-btn-amber text-xs">
              <Download size={14} /> 导出 CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-ink-50 text-left text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">曲目</th>
                  <th className="px-3 py-2 font-semibold">版本</th>
                  <th className="px-3 py-2 font-semibold">演出场次</th>
                  <th className="px-3 py-2 font-semibold">比例</th>
                  <th className="px-3 py-2 font-semibold">授权</th>
                  <th className="px-3 py-2 font-semibold">状态</th>
                  <th className="px-3 py-2 font-semibold">人话异常原因</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const v = versionMap.get(r.trackVersionId);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-ink-50 last:border-none"
                    >
                      <td className="px-3 py-2 font-medium text-ink-800">
                        {v?.trackName ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-ink-500">
                        {v?.versionTag ?? '—'}{' '}
                        {v?.isLatest && (
                          <span className="text-[10px] text-pine-500">最新</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-ink-600">
                        {r.performanceName}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-600">
                        {r.artistRatio}/{r.venueRatio}/{r.distributionRatio}
                      </td>
                      <td className="px-3 py-2 text-ink-600">
                        {formatDate(r.authExpiryDate)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="max-w-sm px-3 py-2 text-ink-600">
                        {r.humanReason || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  cls,
  bar,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  cls: string;
  bar: string;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-card">
      <div className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] ${cls}`}>
        {icon}
      </div>
      <p className="mt-1 text-xs text-ink-500">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold text-ink-800 tabular-nums">
        {value}
      </p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full ${bar} transition-all`}
          style={{ width: `${Math.min(value * 25, 100)}%` }}
        />
      </div>
    </div>
  );
}

function SuspendedRow({
  record,
  version,
  confirmUser,
  onConfirmUserChange,
  onUnlock,
}: {
  record: SplitRecord;
  version?: TrackVersion;
  confirmUser: string;
  onConfirmUserChange: (s: string) => void;
  onUnlock: (id: string, who: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rouge-100 bg-rouge-50/60 p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink-800">
          {version?.trackName ?? '未知曲目'}
          <span className="ml-2 text-xs text-ink-400">
            {version?.versionTag} · {record.performanceName}
          </span>
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-rouge-600">
          <Ban size={11} className="mb-0.5 mr-1 inline" />
          {record.humanReason}
        </p>
        {record.confirmedBy && (
          <p className="mt-0.5 text-[11px] text-ink-400">
            上一次确认：{record.confirmedBy} · {formatDateTime(record.confirmedAt)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          className="w-36 theater-input text-xs"
          placeholder="接手同事姓名"
          value={confirmUser}
          onChange={(e) => onConfirmUserChange(e.target.value)}
        />
        <button
          onClick={() => onUnlock(record.id, confirmUser || '接手同事')}
          className="theater-btn-amber text-xs"
          disabled={!confirmUser.trim()}
        >
          <CheckCircle2 size={14} /> 已确认，解锁继续
        </button>
      </div>
    </div>
  );
}

function stamp() {
  const d = new Date();
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') +
    '_' +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0')
  );
}
