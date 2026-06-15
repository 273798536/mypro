import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  FileArchive,
  FileText,
  FolderOpen,
  Home,
  ShieldAlert,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConflictStore } from '@/store/conflictStore';

export default function Report() {
  const navigate = useNavigate();
  const { generateMarkdownReport, getStatistics, getFilteredRecords } = useConflictStore();
  const [copied, setCopied] = useState(false);
  const [ripple, setRipple] = useState(false);

  const md = useMemo(() => generateMarkdownReport(), [generateMarkdownReport]);
  const stats = getStatistics();
  const records = getFilteredRecords();
  const wordCount = md.length;

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 1800);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setRipple(true);
      setTimeout(() => setRipple(false), 600);
    } catch (e) {
      console.warn('复制失败', e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `版权授权排期冲突报告_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const manifest = `交付包清单
================

本交付包由「版权授权排期冲突」管理工具导出
生成时间：${new Date().toLocaleString('zh-CN')}

目录结构
--------
交付包/
├── screenshots/          每条冲突对应的截图（此处为占位清单）
├── records/              处理记录与后补说明的凭证文件（此处为占位清单）
└── report.md             版权授权排期冲突 Markdown 报告（同源）

screenshots/ 占位清单（共 ${records.reduce((s, r) => s + r.screenshots.length, 0)} 张）
${records.flatMap((r) => r.screenshots.map((s) => `  • [${r.title}] ${s.name} ｜${s.sourceGroup}｜${s.timestamp}`)).join('\n')}

records/ 占位清单（共 ${records.reduce((s, r) => s + 1 + r.supplementaryNotes.length, 0)} 份）
${records.flatMap((r) => [
  `  • [${r.title}] 正常处理记录.pdf`,
  ...r.supplementaryNotes.map((n) => `  • [${r.title}] 后补说明_${n.timestamp.slice(0,10)}.pdf (${n.operator})`),
]).join('\n')}

使用提示
--------
1. Markdown 报告、截图清单、处理记录为**同一数据源**生成，三者一一对应。
2. 挂起待确认项请务必让现场老师二次确认后再计入已完成。
3. 右键任何单条冲突均可查看完整变更历史，所有改动永久可追溯。
`;
    const blob = new Blob([manifest], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `交付包_占位清单_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass-nav shadow-lg">
        <div className="container py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-black tracking-wide text-lg leading-tight flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Markdown 报告
              </h1>
              <p className="text-white/70 text-xs mt-0.5">
                与筛选、统计、明细完全同源 · {records.length} 条 · {wordCount.toLocaleString()} 字
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all border border-white/20"
              title="导出交付包占位清单"
            >
              <FileArchive className="w-4 h-4" />
              导出交付包
            </button>
            <button
              onClick={handleDownload}
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all border border-white/20"
            >
              <Download className="w-4 h-4" />
              下载 .md
            </button>
            <button
              onClick={handleCopy}
              className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all overflow-hidden ${
                copied
                  ? 'bg-status-resolved text-white'
                  : 'bg-white text-brand-700 hover:scale-[1.02] hover:shadow-xl'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  一键复制
                </>
              )}
              {ripple && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="absolute w-8 h-8 rounded-full bg-white/60 animate-ripple" />
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <div className="sticky top-28 space-y-4">
              <div className="rounded-2xl bg-white shadow-card p-5 space-y-3 border border-gray-100">
                <div className="flex items-center gap-2 text-brand-700 font-bold text-sm">
                  <RefreshCw className="w-4 h-4" />
                  <span>实时同源统计</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-brand-50 text-center">
                    <div className="text-2xl font-black text-brand-700 tabular-nums">{stats.total}</div>
                    <div className="text-[10px] font-semibold text-brand-600/70 mt-0.5">筛选后总数</div>
                  </div>
                  <div className="p-3 rounded-xl bg-status-resolvedBg text-center">
                    <div className="text-2xl font-black text-status-resolved tabular-nums">{stats.resolved}</div>
                    <div className="text-[10px] font-semibold text-status-resolved/70 mt-0.5">✅ 已处理</div>
                  </div>
                  <div className="p-3 rounded-xl bg-status-evidenceBg text-center">
                    <div className="text-2xl font-black text-status-evidence tabular-nums">{stats.pendingEvidence}</div>
                    <div className="text-[10px] font-semibold text-status-evidence/70 mt-0.5">⚠️ 需补证据</div>
                  </div>
                  <div className="p-3 rounded-xl bg-status-confirmBg text-center">
                    <div className="text-2xl font-black text-status-confirm tabular-nums animate-pulse">{stats.pendingConfirm}</div>
                    <div className="text-[10px] font-semibold text-status-confirm/70 mt-0.5">🔴 挂起待确认</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-paper-50 shadow-card p-5 border border-paper-200">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-status-confirm flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-xs leading-relaxed text-gray-600">
                    <p>
                      <span className="font-bold text-gray-700">交付三步法</span>（林姐专用）
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1">
                      <li>顶部「复制」Markdown 原文</li>
                      <li>「下载 .md」或「导出交付包」</li>
                      <li>把 screenshots/、records/、report.md 对应给第三方</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white shadow-card p-5 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-700 font-bold text-sm mb-3">
                  <FolderOpen className="w-4 h-4" />
                  交付包结构预览
                </div>
                <div className="font-mono text-[11px] leading-relaxed space-y-0.5 text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div>📁 交付包/</div>
                  <div className="pl-4">├ 📁 screenshots/</div>
                  <div className="pl-7 text-gray-400">│ …群聊截图、授权书…</div>
                  <div className="pl-4">├ 📁 records/</div>
                  <div className="pl-7 text-gray-400">│ …处理记录、后补…</div>
                  <div className="pl-4">└ 📄 report.md</div>
                  <div className="pl-7 text-gray-400">  本报告（同源）</div>
                </div>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full btn-secondary justify-center"
              >
                <Home className="w-4 h-4" />
                返回冲突总览
              </button>

              <button
                onClick={handleExport}
                className="w-full md:hidden btn-secondary justify-center"
              >
                <FileArchive className="w-4 h-4" />
                导出交付包
              </button>
              <button
                onClick={handleDownload}
                className="w-full md:hidden btn-primary justify-center"
              >
                <Download className="w-4 h-4" />
                下载 .md 文件
              </button>
            </div>
          </aside>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-paper overflow-hidden border border-gray-100">
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <Printer className="w-3.5 h-3.5" />
                  预览 · 可直接打印
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                  <span>UTF-8</span>
                  <span>·</span>
                  <span>GFM</span>
                  <span>·</span>
                  <span>{wordCount.toLocaleString()} chars</span>
                </div>
              </div>
              <div className="markdown-body p-8 md:p-12 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
