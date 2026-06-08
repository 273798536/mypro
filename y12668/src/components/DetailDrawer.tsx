import { useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  Link,
  ArrowLeftRight,
  FileImage,
  FileText,
  ExternalLink,
  GitBranch,
  CheckCircle2,
  MapPin,
  Layers,
} from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';
import {
  ANOMALY_LABELS,
  ANOMALY_COLORS,
  SEVERITY_DOT,
  STATUS_LABELS,
} from '@/types';

export default function DetailDrawer() {
  const selectedId = useProjectionStore((s) => s.selectedRecordId);
  const getRecordById = useProjectionStore((s) => s.getRecordById);
  const getDuplicateChain = useProjectionStore((s) => s.getDuplicateChain);
  const selectRecord = useProjectionStore((s) => s.selectRecord);
  const setFocusSection = useProjectionStore((s) => s.setFocusSection);
  const focusSection = useProjectionStore((s) => s.focusSection);
  const resolveRecord = useProjectionStore((s) => s.resolveRecord);

  const crossSectionRef = useRef<HTMLDivElement>(null);
  const conclusionRef = useRef<HTMLDivElement>(null);

  const record = selectedId ? getRecordById(selectedId) : undefined;
  const chain = selectedId ? getDuplicateChain(selectedId) : [];

  useEffect(() => {
    if (!record) return;
    if (focusSection === 'cross-section' && crossSectionRef.current) {
      crossSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (focusSection === 'conclusion' && conclusionRef.current) {
      conclusionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const t = setTimeout(() => setFocusSection(null), 1200);
    return () => clearTimeout(t);
  }, [focusSection, record, setFocusSection]);

  if (!record) return null;

  const isCameraLost = record.anomalyType === 'camera_view_lost';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={() => selectRecord(null)}
      />
      <div className="fixed top-0 right-0 bottom-0 w-[600px] max-w-[90vw] bg-panel-bg border-l border-panel-border z-50 flex flex-col animate-slide-in-right">
        <header className="border-b border-panel-border px-5 py-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`chip ${ANOMALY_COLORS[record.anomalyType]}`}>
                {isCameraLost && <AlertTriangle className="w-3 h-3" />}
                {ANOMALY_LABELS[record.anomalyType]}
              </span>
              <span className={`w-2 h-2 ${SEVERITY_DOT[record.severity]}`} />
              <span className="text-xs text-zinc-500">{record.severity.toUpperCase()}</span>
              <span className="text-xs text-zinc-600 ml-2">{STATUS_LABELS[record.status]}</span>
            </div>
            <div className="data-mono text-zinc-100 text-sm truncate">{record.imageName}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{record.projectName}</div>
          </div>
          <button onClick={() => selectRecord(null)} className="btn-ghost p-1.5" title="关闭">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 来源追溯区 */}
          <section className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-medium text-zinc-100">来源追溯</h3>
              </div>
              <button className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                回到原始表
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="label-sm mb-1">原始行号</div>
                <div className="data-mono text-amber-400 text-lg font-semibold">
                  Row {record.originalRowNumber}
                </div>
              </div>
              <div>
                <div className="label-sm mb-1">图片名</div>
                <div className="data-mono text-zinc-200">{record.imageName}</div>
              </div>
              <div className="col-span-2">
                <div className="label-sm mb-1">来源备注</div>
                <div className="data-mono text-zinc-300 bg-panel-bg border border-panel-border px-3 py-2">
                  {record.sourceNote || '—'}
                </div>
              </div>
              <div>
                <div className="label-sm mb-1">导入批次</div>
                <div className="data-mono text-zinc-400">{record.importBatchId}</div>
              </div>
              <div>
                <div className="label-sm mb-1">导入时间</div>
                <div className="data-mono text-zinc-400">
                  {new Date(record.importedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
            {isCameraLost && (
              <div className="mt-3 px-3 py-2 border border-rose-500/30 bg-rose-500/5 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium mb-0.5">相机视角丢失记录</div>
                  <div className="text-rose-400/80">
                    已保留原始行号 {record.originalRowNumber}，来源「{record.sourceNote || '未备注'}」。
                    点击"回到原始表"可直接定位到该条记录。
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 原始快照 */}
          <section className="panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-100">原始数据快照</h3>
            </div>
            <div className="bg-panel-bg border border-panel-border overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(record.rawSnapshot).map(([k, v]) => (
                    <tr key={k} className="border-b border-panel-border/50 last:border-0">
                      <td className="px-3 py-1.5 w-32 font-mono text-zinc-500">{k}</td>
                      <td className="px-3 py-1.5 font-mono text-zinc-300">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 剖面图区域（可点击跳转结论） */}
          <section
            ref={crossSectionRef}
            className={`panel p-4 transition-all ${
              focusSection === 'cross-section' ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-panel-bg' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-medium text-zinc-100">剖面图</h3>
              </div>
              <button
                onClick={() => setFocusSection('conclusion')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-1 border border-cyan-500/30 hover:border-cyan-500/60 transition-colors"
              >
                <ArrowLeftRight className="w-3 h-3" />
                跳转至结论
              </button>
            </div>
            <div className="aspect-[16/7] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-panel-border relative overflow-hidden">
              <svg viewBox="0 0 800 350" className="w-full h-full">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="1" />
                  </pattern>
                  <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#18181b" />
                    <stop offset="100%" stopColor="#0a0a0b" />
                  </linearGradient>
                </defs>
                <rect width="800" height="350" fill="url(#sky)" />
                <rect width="800" height="350" fill="url(#grid)" />
                {isCameraLost ? (
                  <>
                    <polygon points="100,280 260,120 260,280" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
                    <polygon points="300,280 460,80 460,280" fill="#3f3f46" stroke="#71717a" strokeWidth="1.5" strokeDasharray="0" />
                    <polygon points="500,280 660,160 660,280" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="6 4" />
                    <line x1="460" y1="80" x2="500" y2="160" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 3" />
                    <text x="560" y="150" fill="#f43f5e" fontSize="12" fontFamily="monospace">视角丢失</text>
                    <text x="560" y="168" fill="#f43f5e" fontSize="10" fontFamily="monospace">gap ~3.2m</text>
                  </>
                ) : record.anomalyType === 'projection_distortion' ? (
                  <>
                    <path d="M 150 280 Q 250 100 350 280 T 550 280 T 700 280" fill="none" stroke="#f59e0b" strokeWidth="2" />
                    <rect x="150" y="100" width="400" height="180" fill="none" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1" />
                    <text x="160" y="120" fill="#f59e0b" fontSize="11" fontFamily="monospace">畸变区域</text>
                  </>
                ) : record.anomalyType === 'scale_mismatch' ? (
                  <>
                    <line x1="100" y1="200" x2="700" y2="200" stroke="#22d3ee" strokeWidth="1.5" />
                    <line x1="100" y1="230" x2="700" y2="230" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 3" />
                    <text x="110" y="190" fill="#22d3ee" fontSize="11" fontFamily="monospace">设计标高</text>
                    <text x="110" y="250" fill="#22d3ee" fontSize="11" fontFamily="monospace">实际投影 (Δ 0.45m)</text>
                  </>
                ) : (
                  <>
                    <polygon points="100,280 220,150 340,280" fill="#27272a" stroke="#a3e635" strokeWidth="1.5" />
                    <polygon points="360,280 480,100 600,280" fill="#3f3f46" stroke="#a3e635" strokeWidth="1.5" />
                    <polygon points="620,280 710,190 710,280" fill="#27272a" stroke="#a3e635" strokeWidth="1.5" />
                    <text x="360" y="60" fill="#a3e635" fontSize="11" fontFamily="monospace">投影正常 ✓</text>
                  </>
                )}
                <line x1="0" y1="280" x2="800" y2="280" stroke="#52525b" strokeWidth="1" />
                <text x="10" y="305" fill="#52525b" fontSize="10" fontFamily="monospace">0.00</text>
                <text x="770" y="305" fill="#52525b" fontSize="10" fontFamily="monospace">80m</text>
                <text x="20" y="30" fill="#52525b" fontSize="10" fontFamily="monospace">
                  {record.imageName} / R{record.originalRowNumber}
                </text>
              </svg>
            </div>
            <button
              onClick={() => setFocusSection('conclusion')}
              className="mt-3 w-full py-2 border border-dashed border-panel-border text-xs text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors flex items-center justify-center gap-2"
            >
              <Link className="w-3 h-3" />
              点击查看此剖面图对应的最终结论 →
            </button>
          </section>

          {/* 最终结论（可点击跳转剖面图） */}
          <section
            ref={conclusionRef}
            className={`panel p-4 transition-all ${
              focusSection === 'conclusion' ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-panel-bg' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-medium text-zinc-100">最终结论</h3>
              </div>
              <button
                onClick={() => setFocusSection('cross-section')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 border border-amber-500/30 hover:border-amber-500/60 transition-colors"
              >
                <ArrowLeftRight className="w-3 h-3" />
                跳转至剖面图
              </button>
            </div>
            <div className="bg-panel-bg border-l-2 border-amber-500/60 px-4 py-3 text-sm text-zinc-200 leading-relaxed">
              {record.conclusion}
            </div>

            <div className="mt-4">
              <div className="label-sm mb-2">处理意见</div>
              <div className="text-sm text-zinc-300 leading-relaxed bg-panel-bg border border-panel-border px-4 py-3">
                {record.suggestion}
              </div>
            </div>

            <button
              onClick={() => setFocusSection('cross-section')}
              className="mt-3 w-full py-2 border border-dashed border-panel-border text-xs text-zinc-500 hover:text-amber-400 hover:border-amber-500/40 transition-colors flex items-center justify-center gap-2"
            >
              <Link className="w-3 h-3" />
              ← 点击在剖面图中查看对应位置
            </button>
          </section>

          {/* 重复/补录链 */}
          {chain.length > 1 && (
            <section className="panel p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-100">同事件历史记录（已去重合并）</h3>
              </div>
              <div className="space-y-2">
                {chain
                  .sort((a, b) => a.importedAt.localeCompare(b.importedAt))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectRecord(c.id)}
                      className={`w-full text-left px-3 py-2 border text-sm transition-colors ${
                        c.id === record.id
                          ? 'border-amber-500/60 bg-amber-500/5'
                          : 'border-panel-border hover:border-zinc-500 bg-panel-bg'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="data-mono text-zinc-300">{c.importBatchId}</span>
                        <span className="text-xs text-zinc-500">
                          {STATUS_LABELS[c.status]}
                          {c.supplementedFields?.length
                            ? ` · 补录字段: ${c.supplementedFields.join(', ')}`
                            : ''}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {new Date(c.importedAt).toLocaleString('zh-CN')} · {c.sourceNote}
                      </div>
                    </button>
                  ))}
              </div>
            </section>
          )}
        </div>

        <footer className="border-t border-panel-border px-5 py-3 flex items-center gap-3">
          {record.status !== 'resolved' ? (
            <button
              onClick={() => resolveRecord(record.id)}
              className="btn-primary flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              标记为已处理
            </button>
          ) : (
            <span className="text-lime-400 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              已处理
            </span>
          )}
          <div className="ml-auto text-xs text-zinc-500 font-mono">
            ID: {record.id}
          </div>
        </footer>
      </div>
    </>
  );
}
