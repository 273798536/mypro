import {
  AlertCircle,
  AlertTriangle,
  FileEdit,
  CheckCircle2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function ReviewCard() {
  const version = useAppStore((s) => s.paramVersion);
  const allAbn = useAppStore((s) => s.abnormalPoints);
  const nodes = useAppStore((s) => s.nodes);
  const problems = useAppStore((s) => s.problems);
  const selectedNode = useAppStore((s) => s.selectedNodeId);
  const selectedProblem = useAppStore((s) => s.selectedProblemId);
  const explanation = useAppStore((s) => s.explanation);
  const update = useAppStore((s) => s.updateExplanation);
  const highlight = useAppStore((s) => s.highlightAbnormal);
  const pending = useAppStore((s) => s.pendingConfirmation);
  const shortestPath = useAppStore((s) => s.shortestPath);
  const shortestDistance = useAppStore((s) => s.shortestDistance);
  const generateExplanation = useAppStore((s) => s.generateExplanation);
  const toggleNodeAbnormal = useAppStore((s) => s.toggleNodeAbnormal);

  const currentProblem = problems.find((p) => p.id === selectedProblem);
  const abnForCurrent = allAbn.filter((a) => a.problemId === selectedProblem);

  const regen = () => {
    if (!selectedProblem) return;
    update(generateExplanation(selectedProblem));
  };

  return (
    <div className="paper-card flex h-full flex-col rounded-xl p-4 animate-fadeSlideRight">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-[15px] text-ink-900">
            复核摘要卡
          </div>
          <div className="text-[11.5px] text-slateData-500">
            参数 · 异常 · 解释 同页并排
          </div>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink-900 to-ink-800 text-paper-50 shadow-card">
          <div className="text-center leading-none">
            <div className="font-display text-[9px] opacity-80">版本</div>
            <div className="font-mono-data text-[13px] font-bold">
              {version.version}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-gold-700/20 bg-paper-50 p-2.5 text-[11.5px]">
        <div>
          <span className="text-slateData-500">时间戳</span>
          <div className="font-mono-data text-ink-900">{version.timestamp}</div>
        </div>
        <div>
          <span className="text-slateData-500">算法 / 操作</span>
          <div className="font-mono-data text-ink-900">
            {version.algorithm} · {version.operator.slice(0, 3)}
          </div>
        </div>
      </div>

      {currentProblem && !pending && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-gold-900/5 px-2.5 py-1.5 text-[11.5px] text-gold-900 animate-fadeSlideUp">
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            当前题：
            <span className="font-mono-data font-semibold">
              {currentProblem.id.slice(-6)}
            </span>
            <span className="mx-1 opacity-70">·</span>
            {currentProblem.start} → {currentProblem.end}
            <span className="mx-1 opacity-70">·</span>
            <span className="font-mono-data font-semibold">
              {shortestDistance ?? '—'}{' '}
              {currentProblem.unit || 'km'}
            </span>
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h4 className="inline-flex items-center gap-1.5 font-display text-[13px] text-ink-900">
          <AlertCircle className="h-3.5 w-3.5 text-ochre-700" />
          异常点
          {selectedProblem && !pending ? (
            <span className="font-mono-data text-[11px] text-slateData-500">
              （本题 {abnForCurrent.length} / 全部 {allAbn.length}）
            </span>
          ) : (
            <span className="font-mono-data text-[11px] text-slateData-500">
              （共 {allAbn.length}）
            </span>
          )}
        </h4>
        {pending && (
          <span className="rounded-full bg-ochre-100 px-2 py-0.5 text-[10.5px] text-ochre-700">
            计算挂起
          </span>
        )}
      </div>
      <div className="scroll-thin mt-1.5 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {(selectedProblem && !pending ? abnForCurrent : allAbn).map((a) => {
          const node = nodes.find((n) => n.id === a.nodeId);
          const prob = problems.find((p) => p.id === a.problemId);
          const active = selectedNode === a.nodeId;
          return (
            <button
              key={`${a.nodeId}-${a.problemId}`}
              onClick={() => highlight(a.nodeId, a.problemId)}
              onDoubleClick={() =>
                !pending && toggleNodeAbnormal(a.nodeId, a.problemId)
              }
              title={!pending ? '双击切换异常判定' : undefined}
              className={cn(
                'group w-full rounded-lg border px-2.5 py-2 text-left transition-all hover:-translate-y-[1px] hover:shadow-card',
                active
                  ? 'border-ochre-500 bg-ochre-100/50 shadow-inner'
                  : 'border-gold-700/25 bg-white hover:bg-paper-50'
              )}
            >
              <div className="flex items-center gap-2">
                {a.severity === 'error' ? (
                  <AlertCircle className="h-3.5 w-3.5 text-ochre-700 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-gold-900 shrink-0" />
                )}
                <span className="font-display text-[12px] text-ink-900">
                  {node?.label ?? a.nodeId}
                </span>
                <span className="ml-auto font-mono-data text-[10.5px] text-slateData-500">
                  {prob?.id.slice(-6)}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slateData-700">
                {a.description}
              </p>
              {!pending && (
                <p className="mt-1 text-[10px] text-slateData-400 opacity-0 transition-opacity group-hover:opacity-100">
                  双击可切换异常判定
                </p>
              )}
            </button>
          );
        })}
        {selectedProblem && !pending && abnForCurrent.length === 0 && (
          <div className="rounded-md border border-dashed border-gold-700/30 px-3 py-3 text-center text-[11.5px] text-slateData-500">
            本题暂无异常点，图表双击节点可人工标记
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <h4 className="inline-flex items-center gap-1.5 font-display text-[13px] text-ink-900">
            <FileEdit className="h-3.5 w-3.5 text-ink-800" />
            解释文字
          </h4>
          {!pending && selectedProblem && shortestPath && (
            <button
              onClick={regen}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] text-slateData-500 transition-colors hover:bg-gold-700/10 hover:text-ink-900"
            >
              <RefreshCw className="h-3 w-3" /> 自动生成
            </button>
          )}
        </div>
        <textarea
          value={explanation}
          onChange={(e) => update(e.target.value)}
          disabled={pending}
          className={cn(
            'scroll-thin h-[140px] w-full resize-none rounded-lg border px-3 py-2 text-[12px] leading-relaxed outline-none transition-colors',
            pending
              ? 'cursor-not-allowed border-gold-700/20 bg-paper-100/60 text-slateData-500'
              : 'border-gold-700/30 bg-paper-50 text-ink-900 focus:border-ink-800/60 focus:bg-white'
          )}
          placeholder={
            pending
              ? '单位缺失待确认，暂无法生成解释...'
              : '在此处写入本次最短路径解释...'
          }
        />
        <div className="mt-1 flex items-center justify-between text-[10.5px] text-slateData-500">
          <span>
            <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
            复核人：参数版本 / 异常点 / 解释同页可见
          </span>
          <span className="font-mono-data">
            {explanation.length} 字
            {shortestPath && !pending && (
              <span className="ml-1 text-gold-900">
                · {shortestPath.length} 节点
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
