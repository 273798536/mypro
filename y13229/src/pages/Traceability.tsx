import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  GitBranch,
  AlertTriangle,
  FileWarning,
  MessageSquare,
  Users,
  ArrowRight,
  CheckCircle,
  Target,
  Layers,
} from 'lucide-react';
import {
  INFLUENCE_LABEL,
  SplitRecord,
  TrackVersion,
  TraceNode,
} from '@/types';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDateTime } from '@/utils/storage';

const influenceIcon = {
  old_version: Layers,
  manual_add: MessageSquare,
  verbal: Users,
  system_check: AlertTriangle,
};

const influenceBg = {
  old_version: 'from-ink-100 to-ink-50 border-ink-300',
  manual_add: 'from-pine-100 to-pine-50 border-pine-300',
  verbal: 'from-amber-100 to-amber-50 border-amber-300',
  system_check: 'from-rouge-100 to-rouge-50 border-rouge-300',
};

export default function Traceability() {
  const records = useAppStore((s) => s.splitRecords);
  const versions = useAppStore((s) => s.trackVersions);
  const traceNodes = useAppStore((s) => s.traceNodes);
  const [rid, setRid] = useState<string | null>(records[0]?.id ?? null);

  const versionMap = useMemo(
    () => new Map(versions.map((v) => [v.id, v]) as [string, TrackVersion][]),
    [versions]
  );
  const selectedRecord = records.find((r) => r.id === rid);
  const selectedVersion = selectedRecord
    ? versionMap.get(selectedRecord.trackVersionId)
    : undefined;

  const chains = useMemo(() => {
    const map = new Map<string, TraceNode[]>();
    traceNodes.forEach((t) => {
      const arr = map.get(t.splitRecordId) ?? [];
      arr.push(t);
      map.set(t.splitRecordId, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => a.orderIndex - b.orderIndex));
    return map;
  }, [traceNodes]);

  const currentChain = rid ? chains.get(rid) ?? [] : [];
  const groupedBySource = useMemo(() => {
    const g: Record<string, TraceNode[]> = {
      old_version: [],
      manual_add: [],
      verbal: [],
      system_check: [],
    };
    currentChain.forEach((n) => {
      g[n.influenceType].push(n);
    });
    return g;
  }, [currentChain]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium tracking-wider text-amber-500">
          影响溯源面板
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink-800">
          分清谁影响了结论
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          一条结论怎么来的？<b className="text-ink-600">旧版曲目表</b>带过来的、
          <b className="text-pine-600">后补人工备注</b>改的、还是
          <b className="text-amber-600">口头转达</b>说的——全给你串成一条链。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_1fr]">
        {/* 左侧：记录选择 */}
        <aside className="theater-card p-3">
          <p className="mb-2 px-2 pt-1 pb-2 text-xs font-medium tracking-wider text-ink-400">
            选择一条记录查看影响链
          </p>
          <ul className="max-h-[70vh] space-y-1 overflow-auto scrollbar-thin pr-1">
            {records.map((r) => {
              const v = versionMap.get(r.trackVersionId);
              const chainLen = chains.get(r.id)?.length ?? 0;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setRid(r.id)}
                    className={`group w-full rounded-lg p-3 text-left transition ${
                      rid === r.id
                        ? 'bg-ink-700 text-white shadow-pop'
                        : 'hover:bg-ink-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-medium ${
                            rid === r.id ? 'text-white' : 'text-ink-700'
                          }`}
                        >
                          {v?.trackName ?? '未知曲目'}
                        </p>
                        <p
                          className={`truncate text-xs ${
                            rid === r.id ? 'text-amber-100/80' : 'text-ink-400'
                          }`}
                        >
                          {r.performanceName}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <p
                      className={`mt-2 text-[11px] ${
                        rid === r.id ? 'text-amber-100/70' : 'text-ink-400'
                      }`}
                    >
                      影响节点数：<b>{chainLen}</b>
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* 右侧：影响链 */}
        <section className="space-y-5">
          {selectedRecord ? (
            <>
              <div className="theater-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink-400">
                      当前查看 · {selectedVersion?.trackName}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-ink-800">
                      {selectedRecord.performanceName}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedRecord.status} />
                      <span className="text-xs text-ink-400">
                        {selectedVersion?.versionTag} · 最后确认：
                        {formatDateTime(selectedRecord.confirmedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-ink-700 max-w-sm">
                    <b className="text-amber-700">人话异常原因：</b>
                    <br />
                    {selectedRecord.humanReason || '暂无异常'}
                  </div>
                </div>
              </div>

              {/* 三类影响源聚合 */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SourceCard
                  title="旧版曲目表"
                  desc="从历史版本里带过来的信息"
                  nodes={groupedBySource.old_version}
                  accent="ink"
                />
                <SourceCard
                  title="后补人工备注"
                  desc="事后补录的文字说明"
                  nodes={groupedBySource.manual_add}
                  accent="pine"
                />
                <SourceCard
                  title="口头备注转录"
                  desc="电话/当面说的，后来写下来"
                  nodes={groupedBySource.verbal}
                  accent="amber"
                />
              </div>

              {/* 横向流动影响链 */}
              <div className="theater-card overflow-x-auto p-5">
                <div className="mb-4 flex items-center gap-2">
                  <GitBranch size={16} className="text-amber-500" />
                  <h3 className="font-display text-base font-semibold text-ink-700">
                    影响链 · 从来源到结论
                  </h3>
                </div>
                <div className="flex min-w-[800px] items-center gap-2">
                  {currentChain.length === 0 && (
                    <p className="text-sm text-ink-400">
                      暂无影响节点，去主页操作一次就有了
                    </p>
                  )}
                  {currentChain.map((n, i) => {
                    const Icon = influenceIcon[n.influenceType];
                    const isLast = i === currentChain.length - 1;
                    return (
                      <div key={n.id} className="flex items-center">
                        <div
                          className={`relative w-56 shrink-0 rounded-xl border bg-gradient-to-br p-4 shadow-card animate-popin ${influenceBg[n.influenceType]}`}
                        >
                          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80">
                              <Icon size={11} />
                            </span>
                            步骤 {i + 1} · {INFLUENCE_LABEL[n.influenceType]}
                          </div>
                          <p className="text-xs leading-relaxed text-ink-700">
                            {n.description}
                          </p>
                          {isLast && (
                            <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-ink-700 px-2 py-0.5 text-[10px] text-white shadow">
                              <Target size={10} /> 最终影响
                            </div>
                          )}
                        </div>
                        {!isLast && (
                          <ArrowRight
                            size={20}
                            className="mx-1 shrink-0 text-ink-300"
                          />
                        )}
                      </div>
                    );
                  })}
                  {currentChain.length > 0 && (
                    <div className="ml-1 flex shrink-0 items-center rounded-xl border border-pine-400 bg-gradient-to-br from-pine-100 to-white p-4 shadow-card">
                      <div className="flex items-center gap-2">
                        <CheckCircle
                          size={22}
                          className="text-pine-500"
                        />
                        <div>
                          <p className="text-[11px] text-pine-600">
                            当前结论
                          </p>
                          <p className="text-sm font-semibold text-pine-700">
                            {selectedRecord.humanReason || '已对齐'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {groupedBySource.system_check.length > 0 && (
                <div className="theater-card border-rouge-200 p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rouge-500" />
                    <h3 className="font-display text-base font-semibold text-rouge-600">
                      系统校验触发的动作
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {groupedBySource.system_check.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-lg border border-rouge-100 bg-rouge-50/50 p-3 text-sm text-rouge-700"
                      >
                        {n.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="theater-card p-12 text-center text-ink-400">
              <FileWarning size={36} className="mx-auto mb-3 opacity-50" />
              请从左侧选择一条记录查看影响链
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SourceCard({
  title,
  desc,
  nodes,
  accent,
}: {
  title: string;
  desc: string;
  nodes: TraceNode[];
  accent: 'ink' | 'pine' | 'amber';
}) {
  const accentClasses: Record<string, string> = {
    ink: 'border-ink-200 from-ink-50 to-white',
    pine: 'border-pine-200 from-pine-50 to-white',
    amber: 'border-amber-200 from-amber-50 to-white',
  };
  return (
    <div
      className={`theater-card border bg-gradient-to-br p-4 ${accentClasses[accent]}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-ink-700">{title}</h4>
          <p className="text-[11px] text-ink-400">{desc}</p>
        </div>
        <span className="theater-chip bg-white text-ink-600 ring-1 ring-ink-200">
          {nodes.length} 条
        </span>
      </div>
      <ul className="space-y-1.5">
        {nodes.length === 0 && (
          <li className="text-xs text-ink-300">暂无来自此来源的影响</li>
        )}
        {nodes.map((n) => (
          <li
            key={n.id}
            className="rounded-md bg-white/80 px-2 py-1.5 text-xs leading-relaxed text-ink-600"
          >
            步骤 {n.orderIndex} · {n.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
