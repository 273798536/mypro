import { useState, useMemo } from 'react';
import {
  Lock,
  Unlock,
  FileDown,
  Eye,
  X,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { useAppStoreShallow } from '@/store/useAppStoreShallow';

export default function ReviewPage() {
  const {
    parameters,
    anomalies,
    snapshots,
    isLocked,
    selectedSnapshotId,
    reviewExplanation,
    reviewConclusion,
    setReviewExplanation,
    setReviewConclusion,
    lockSnapshot,
    unlockSnapshot,
    selectSnapshot,
    generateMarkdown,
    records,
    expandedRecords,
  } = useAppStoreShallow((s) => ({
    parameters: s.parameters,
    anomalies: s.anomalies,
    snapshots: s.snapshots,
    isLocked: s.isLocked,
    selectedSnapshotId: s.selectedSnapshotId,
    reviewExplanation: s.reviewExplanation,
    reviewConclusion: s.reviewConclusion,
    setReviewExplanation: s.setReviewExplanation,
    setReviewConclusion: s.setReviewConclusion,
    lockSnapshot: s.lockSnapshot,
    unlockSnapshot: s.unlockSnapshot,
    selectSnapshot: s.selectSnapshot,
    generateMarkdown: s.generateMarkdown,
    records: s.records,
    expandedRecords: s.expandedRecords,
    reset: s.reset,
  }));

  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedSnap = useMemo(
    () => snapshots.find((s) => s.id === selectedSnapshotId) ?? null,
    [snapshots, selectedSnapshotId],
  );

  const displayParams = selectedSnap?.paramsState ?? parameters;
  const displayAnomalies = selectedSnap?.anomaliesState ?? anomalies;
  const displayExp = selectedSnap?.reviewState.explanation ?? reviewExplanation;
  const displayConc = selectedSnap?.reviewState.conclusion ?? reviewConclusion;

  const previewMarkdown = useMemo(() => {
    if (selectedSnap) return selectedSnap.markdown;
    // 实时预览：基于当前状态生成一个临时ID
    return generateMarkdown('preview-' + Date.now());
  }, [
    selectedSnap,
    displayParams,
    displayAnomalies,
    displayExp,
    displayConc,
    expandedRecords,
    records,
  ]);

  const handleLock = () => {
    const id = lockSnapshot('运营主管');
    selectSnapshot(id);
  };

  const handleDownload = () => {
    const blob = new Blob([previewMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = selectedSnap?.lockTime?.replace(/[:\s\-]/g, '') ?? 'live';
    a.href = url;
    a.download = `整数规划错题复盘_${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col fade-in">
      {/* 顶部锁定条 */}
      <div
        className={`shrink-0 h-12 px-6 flex items-center justify-between ${
          isLocked
            ? 'bg-green-600/10 border-b border-green-500/30 text-green-800'
            : 'bg-ink-700 text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          {isLocked ? (
            <>
              <CheckCircle2 size={17} className="text-green-700" />
              <span className="text-sm font-hei">已锁定 · 可导出</span>
              <span className="text-[11px] opacity-75">
                {selectedSnap?.lockTime} · {selectedSnap?.lockedBy}
              </span>
            </>
          ) : (
            <>
              <Pencil size={17} />
              <span className="text-sm font-hei">编辑中 · 参数/异常/解释均可修改</span>
            </>
          )}
          <div className="hidden md:flex items-center gap-2 ml-4 text-[11px] opacity-80">
            <span>共 {parameters.length} 参数</span>
            <span>·</span>
            <span>{anomalies.length} 条异常</span>
            <span>·</span>
            <span>{records.length} 条记录 · {expandedRecords.length} 展开</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLocked && (
            <>
              <button
                onClick={() => setShowPreview(true)}
                className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-[2px] font-hei inline-flex items-center gap-1.5 transition-colors"
              >
                <Eye size={13} /> 预览Markdown
              </button>
              <button
                onClick={handleLock}
                className="px-3 py-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-ink-900 rounded-[2px] font-hei inline-flex items-center gap-1.5 transition-colors"
              >
                <Lock size={13} /> 锁定快照 & 导出
              </button>
            </>
          )}
          {isLocked && (
            <>
              <button
                onClick={() => setShowPreview(true)}
                className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-[2px] font-hei inline-flex items-center gap-1.5 transition-colors"
              >
                <Eye size={13} /> 查看导出内容
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-xs bg-ink-700 hover:bg-ink-600 text-white rounded-[2px] font-hei inline-flex items-center gap-1.5 transition-colors"
              >
                <FileDown size={13} /> 下载 .md
              </button>
              <button
                onClick={unlockSnapshot}
                className="px-3 py-1.5 text-xs bg-white/60 hover:bg-white text-green-800 rounded-[2px] font-hei inline-flex items-center gap-1.5 transition-colors"
              >
                <Unlock size={13} /> 解锁继续编辑
              </button>
            </>
          )}
        </div>
      </div>

      {/* 三栏同屏：25% / 40% / 35% */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[25%_40%_35%] gap-0 divide-x divide-ink-200 bg-white min-h-0">
        {/* 左栏：参数版本快照 */}
        <div className="flex flex-col min-h-0">
          <ColHeader icon={<Archive size={14} />} label="参数版本快照" count={displayParams.length} />
          <div className="flex-1 overflow-auto scroll-thin divide-y divide-ink-100">
            {displayParams.map((p) => {
              const changed = p.changeCount > 0;
              return (
                <div key={p.id} className="p-3 hover:bg-ink-50/50 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">
                      {changed ? (
                        <Pencil size={12} className="text-amber-500" />
                      ) : (
                        <span className="w-3 h-3 rounded-full bg-ink-300 block mt-0.5" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ink-800 font-hei leading-snug">
                        {p.name}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-ink-600">
                          {p.currentValue} <span className="text-ink-400">{p.unit}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-12 h-1 bg-ink-100 rounded-full overflow-hidden">
                            <span
                              className={`block h-full ${
                                changed ? 'bg-amber-400' : 'bg-ink-500'
                              }`}
                              style={{ width: `${Math.min(100, p.currentWeight * 180)}%` }}
                            />
                          </span>
                          <span className="font-mono text-ink-700 w-10 text-right">
                            {p.currentWeight.toFixed(2)}
                          </span>
                        </span>
                      </div>
                      {changed && (
                        <div className="mt-1 text-[10px] text-amber-700 font-hei">
                          已变更 {p.changeCount} 次 · 见版本历史
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* 历史快照切换 */}
          {snapshots.length > 0 && (
            <div className="border-t border-ink-200 bg-ink-50/60 p-3">
              <div className="text-[10px] text-ink-400 tracking-widest font-hei mb-2">
                历史快照
              </div>
              <div className="space-y-1.5">
                {snapshots.slice(-5).reverse().map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      selectSnapshot(s.id);
                      unlockSnapshot();
                      // mark as view only
                    }}
                    className={`w-full text-left px-2 py-1.5 text-[11px] rounded-[2px] border transition-colors ${
                      selectedSnapshotId === s.id
                        ? 'bg-white border-ink-400 text-ink-800'
                        : 'bg-white/60 border-transparent hover:border-ink-200 text-ink-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-hei">{s.lockTime}</span>
                      <span className="text-[10px] text-ink-500">{s.lockedBy}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 中栏：异常点列表 + 记录状态 */}
        <div className="flex flex-col min-h-0">
          <ColHeader
            icon={<AlertTriangle size={14} />}
            label="异常点 & 记录状态"
            count={displayAnomalies.length + records.length}
          />
          <div className="flex-1 overflow-auto scroll-thin divide-y divide-ink-100">
            {displayAnomalies.map((a) => (
              <div
                key={a.id}
                className="p-3 bg-amber-50/50 border-l-4 border-amber-400"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-700 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-ink-800 font-hei">
                      {a.title}
                    </div>
                    <div className="mt-1.5 text-[11px] text-ink-600 leading-relaxed">
                      <div className="text-amber-800/80 font-hei mb-0.5">
                        原始说法：
                      </div>
                      {a.rawStatement}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="px-3 py-2 bg-ink-50/60 text-[10px] text-ink-400 tracking-widest font-hei">
              错题记录 · 与页面展开/折叠一致
            </div>
            {records.map((r) => {
              const open = expandedRecords.includes(r.id);
              return (
                <div key={r.id} className="p-3 hover:bg-ink-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-[2px] font-hei ${
                        open
                          ? 'bg-ink-700 text-white'
                          : 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {open ? '展开' : '折叠'}
                    </span>
                    {r.isSeeminglyNormal && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-[2px] font-hei">
                        影响结论
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-ink-400 ml-auto">
                      贡献 {r.contributionToConclusion}%
                    </span>
                  </div>
                  <div className="text-xs text-ink-800 mt-1.5 leading-snug truncate">
                    {r.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右栏：结论解释文字 */}
        <div className="flex flex-col min-h-0">
          <ColHeader icon={<FileDown size={14} />} label="复核解释 / 最终结论" />
          <div className="flex-1 overflow-auto scroll-thin p-4 space-y-4">
            <div>
              <label className="block text-[11px] text-ink-400 tracking-widest font-hei mb-1.5">
                复核解释（将写入 Markdown 报告）
              </label>
              <textarea
                disabled={isLocked}
                value={displayExp}
                onChange={(e) => setReviewExplanation(e.target.value)}
                className="w-full h-56 p-3 text-xs text-ink-800 font-mono leading-relaxed bg-ink-50/60 border border-ink-200 rounded-[2px] focus:outline-none focus:border-ink-400 disabled:bg-white disabled:cursor-default resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink-400 tracking-widest font-hei mb-1.5">
                最终结论
              </label>
              <textarea
                disabled={isLocked}
                value={displayConc}
                onChange={(e) => setReviewConclusion(e.target.value)}
                className="w-full h-32 p-3 text-sm text-ink-800 font-song leading-relaxed bg-ink-50/60 border-2 border-amber-300 rounded-[2px] focus:outline-none focus:border-amber-400 disabled:bg-white disabled:cursor-default resize-none"
              />
            </div>
            <div className="pt-2 border-t border-dashed border-ink-200">
              <div className="text-[11px] text-ink-500 leading-relaxed space-y-1">
                <p>
                  · 导出的 Markdown 文件开头包含
                  <code className="px-1 bg-ink-100 font-mono rounded">snapshot_id</code>
                  与锁定时间，防止歧义。
                </p>
                <p>
                  · 所有展开/折叠状态、琥珀黄标记、权重异动都会体现在 Markdown 里，页面和文件严格一致。
                </p>
                <p>
                  · 若需要重新编辑，先点"解锁继续编辑"。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Markdown 预览弹窗 */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-6 fade-in">
          <div className="w-full max-w-5xl h-[85vh] bg-white rounded-[2px] shadow-2xl flex flex-col">
            <div className="h-12 shrink-0 border-b border-ink-200 px-5 flex items-center justify-between bg-ink-50/60">
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-ink-600" />
                <span className="font-hei text-sm text-ink-800">
                  Markdown 预览 · 与页面状态一致
                </span>
                <span className="text-[11px] text-ink-400 font-mono">
                  {selectedSnap?.id ?? '实时预览'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-[11px] border border-ink-200 text-ink-700 hover:bg-white rounded-[2px] font-hei inline-flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={12} /> 已复制
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> 复制
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-[11px] bg-ink-700 text-white hover:bg-ink-600 rounded-[2px] font-hei inline-flex items-center gap-1"
                >
                  <FileDown size={12} /> 下载.md
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="w-8 h-8 inline-flex items-center justify-center text-ink-500 hover:text-ink-800 rounded-[2px] hover:bg-ink-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 min-h-0">
              <div className="border-r border-ink-200 p-5 overflow-auto scroll-thin">
                <div className="text-[10px] text-ink-400 tracking-widest font-hei mb-2">
                  原始 Markdown 文本
                </div>
                <pre className="font-mono text-[11px] text-ink-700 whitespace-pre-wrap leading-relaxed">
                  {previewMarkdown}
                </pre>
              </div>
              <div className="p-5 overflow-auto scroll-thin bg-ink-50/40">
                <div className="text-[10px] text-ink-400 tracking-widest font-hei mb-2">
                  渲染效果
                </div>
                <MarkdownRender src={previewMarkdown} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <div className="h-10 shrink-0 border-b border-ink-200 bg-ink-50/60 px-4 flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-700 font-hei">
        {icon}
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[10px] text-ink-400 font-mono">{count}</span>
      )}
    </div>
  );
}

// 一个非常轻量的 Markdown→React 渲染器（满足预览需求）
function MarkdownRender({ src }: { src: string }) {
  const blocks = src.split('\n');
  const items: React.ReactNode[] = [];
  let i = 0;
  let inFm = false;
  let fmClosed = false;

  while (i < blocks.length) {
    const line = blocks[i];
    // YAML Front Matter
    if (i === 0 && line === '---') {
      const fm: string[] = ['---'];
      i++;
      inFm = true;
      while (i < blocks.length && blocks[i] !== '---') {
        fm.push(blocks[i]);
        i++;
      }
      if (i < blocks.length) {
        fm.push('---');
        i++;
      }
      fmClosed = true;
      items.push(
        <pre
          key={`fm-${items.length}`}
          className="mb-4 p-3 bg-ink-100 text-[11px] text-ink-600 font-mono rounded-[2px] leading-relaxed"
        >
          {fm.join('\n')}
        </pre>,
      );
      continue;
    }

    if (line.startsWith('# ')) {
      items.push(
        <h1 key={i} className="font-song text-xl text-ink-800 mb-3 mt-1">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith('## ')) {
      items.push(
        <h2
          key={i}
          className="font-song text-base text-ink-800 mt-5 mb-2 pb-1 border-b border-ink-200"
        >
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('### ')) {
      const txt = line.slice(4);
      const m = txt.match(/^\[(展开|折叠)\]\s*(.*)$/);
      items.push(
        <h3 key={i} className="font-hei text-sm text-ink-800 mt-4 mb-1.5 flex items-center gap-2">
          {m && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-[2px] font-hei ${
                m[1] === '展开'
                  ? 'bg-ink-700 text-white'
                  : 'bg-ink-100 text-ink-600'
              }`}
            >
              {m[1]}
            </span>
          )}
          {m ? m[2] : txt}
        </h3>,
      );
    } else if (line.startsWith('> ')) {
      // 引用，支持多行
      const buf: string[] = [line.slice(2)];
      i++;
      while (i < blocks.length && blocks[i].startsWith('>')) {
        buf.push(blocks[i].replace(/^>\s?/, ''));
        i++;
      }
      const isWarn = buf.some((b) => b.includes('⚠️') || b.includes('外推越界') || b.includes('权重异动'));
      items.push(
        <blockquote
          key={i}
          className={`border-l-4 pl-3 py-1 my-2 text-xs leading-relaxed ${
            isWarn
              ? 'border-amber-400 bg-amber-50/60 text-amber-900'
              : 'border-ink-300 bg-ink-50/60 text-ink-700'
          }`}
          dangerouslySetInnerHTML={{ __html: renderInline(buf.join('\n')) }}
        />,
      );
      continue;
    } else if (line.startsWith('- **')) {
      const m = line.match(/^- \*\*(.+?)\*\*(（.+?）)?：(.*)$/);
      items.push(
        <li key={i} className="text-xs text-ink-700 leading-relaxed flex items-start gap-2 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-400 mt-1.5 shrink-0" />
          {m ? (
            <>
              <span className="font-hei text-ink-800">{m[1]}</span>
              {m[2] && (
                <span className="text-[10px] text-amber-700 font-hei shrink-0">
                  {m[2]}
                </span>
              )}
              <span className="flex-1">{m[3]}</span>
            </>
          ) : (
            <span>{line.slice(2)}</span>
          )}
        </li>,
      );
    } else if (line.startsWith('- ')) {
      items.push(
        <li key={i} className="text-xs text-ink-700 leading-relaxed ml-2 list-disc">
          {line.slice(2)}
        </li>,
      );
    } else if (line.trim() === '') {
      items.push(<div key={i} className="h-2" />);
    } else {
      items.push(
        <p
          key={i}
          className="text-xs text-ink-700 leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: renderInline(line) }}
        />,
      );
    }
    i++;
  }

  return <div className="space-y-1">{items}</div>;
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-hei">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 bg-ink-100 font-mono rounded text-[11px]">$1</code>')
    .replace(/⚠️/g, '<span class="inline-flex mr-1">⚠️</span>')
    .replace(/✏️/g, '<span class="inline-flex mr-1">✏️</span>');
}
