import { useRef, useState } from 'react';
import { X, Upload, Camera, CheckCircle2, XCircle, Clock, AlertOctagon, StickyNote } from 'lucide-react';
import { BeatNode } from '@/types';
import { useProductionStore } from '@/store/productionStore';

function HitBadge({ result }: { result: BeatNode['hitDetectionResult'] }) {
  const cfg = {
    passed: { label: '通过', color: 'text-emerald-300', bg: 'bg-emerald-500/15', icon: CheckCircle2 },
    failed: { label: '未通过', color: 'text-rose-300', bg: 'bg-rose-500/15', icon: XCircle },
    pending: { label: '待处理', color: 'text-amber-300', bg: 'bg-amber-500/15', icon: Clock },
  } as const;
  const c = cfg[result];
  const Icon = c.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${c.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${c.color}`} />
      <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>
    </div>
  );
}

export function DetailDrawer() {
  const { productionData, selectedNodeId, selectNode, uploadScreenshot } = useProductionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const node =
    selectedNodeId
      ? productionData.lanes.flatMap((l) => l.nodes).find((n) => n.id === selectedNodeId) ?? null
      : null;

  if (!node) {
    return (
      <div className="flex flex-col h-full bg-slate-900/60 border-l border-slate-700/60">
        <div className="px-4 py-3 border-b border-slate-700/60">
          <h3 className="text-sm font-semibold text-slate-200" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            节点明细
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
          点击泳道图中的节点以查看详细信息
        </div>
      </div>
    );
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  const lane = productionData.lanes.find((l) => l.id === node.laneId);

  return (
    <div className="relative flex flex-col h-full bg-slate-900/70 border-l border-slate-700/60">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
        <div>
          <h3 className="text-sm font-semibold text-slate-100" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            节点明细
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-400">{lane?.name} · {node.id}</p>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section>
          <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">节点信息</h4>
          <div className="space-y-1.5 rounded-lg bg-slate-800/50 border border-slate-700/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">标题</span>
              <span className="text-sm text-slate-100 font-medium">{node.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">时间</span>
              <span className="text-sm text-slate-300 tabular-nums">
                {node.startTime} – {node.startTime + node.duration} 分（共 {node.duration} 分钟）
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">命中检测</span>
              <HitBadge result={node.hitDetectionResult} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">截图素材</span>
              <span className={`text-xs ${node.hasScreenshot ? 'text-emerald-300' : 'text-amber-300'}`}>
                {node.hasScreenshot ? '已补录' : '未补录'}
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <StickyNote className="w-3.5 h-3.5 text-sky-400" />
            <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">人工备注（保留原话）</h4>
          </div>
          <blockquote className="rounded-lg border-l-4 border-sky-500/60 bg-sky-500/5 px-4 py-3 text-[13px] leading-relaxed text-slate-200 italic">
            “{node.manualNote || '（无备注）'}”
          </blockquote>
          <p className="mt-1.5 text-[10px] text-slate-500">
            以上为人工备注原话，系统未做任何自动修正或润色。
          </p>
        </section>

        {node.colorOutOfBounds && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">颜色越界拦截理由</h4>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block w-5 h-5 rounded border border-slate-600"
                  style={{ backgroundColor: node.colorHex }}
                />
                <code className="text-xs text-rose-200 font-mono">{node.colorHex}</code>
              </div>
              <p className="text-[13px] leading-relaxed text-rose-100">{node.colorBoundReason}</p>
              <p className="mt-2 text-[11px] text-rose-300/80">
                评审老师通过导出报告即可看到以上原因，无需现场口头解释。
              </p>
            </div>
          </section>
        )}

        <section>
          <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">下一步操作建议</h4>
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3">
            <p className="text-[13px] leading-relaxed text-slate-200">{node.nextAction}</p>
          </div>
        </section>

        {!node.hasScreenshot && (
          <section>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">补录截图素材</h4>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-200 text-sm hover:bg-amber-500/20 transition"
            >
              <Camera className="w-4 h-4" />
              上传截图（补录后自动更新命中检测）
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadScreenshot(node.id, file);
                  showToast('截图已补录，命中检测已同步更新');
                  e.target.value = '';
                }
              }}
            />
          </section>
        )}

        {node.hasScreenshot && (
          <section>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">截图素材</h4>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-200">截图已补录，命中检测状态已同步</span>
            </div>
          </section>
        )}
      </div>

      {toast && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-800 border border-slate-600 text-slate-100 text-xs px-3 py-2 rounded-md shadow-lg text-center animate-pulse">
          {toast}
        </div>
      )}
    </div>
  );
}
