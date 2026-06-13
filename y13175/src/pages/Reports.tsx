import { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  Clock,
  AlertTriangle,
  Edit3,
  CheckCircle,
  Filter,
  ArrowUpDown,
  Copy,
  Share2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '@/store/useAppStore';
import { ReportCategory } from '@/types';
import { cn } from '@/lib/utils';

const categories: { key: ReportCategory; label: string; icon: any; color: string }[] = [
  { key: 'processed', label: '已处理', icon: CheckCircle, color: 'text-green-400' },
  { key: 'pending_material', label: '待补材料', icon: Clock, color: 'text-amber-400' },
  { key: 'manual_override', label: '人工改判', icon: Edit3, color: 'text-purple-400' },
];

function CategoryCard({
  category,
  label,
  icon: Icon,
  color,
  count,
  isActive,
  onClick,
}: {
  category: ReportCategory;
  label: string;
  icon: any;
  color: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-all',
        isActive
          ? 'bg-slate-800/80 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
          : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-md bg-slate-800', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">{label}</div>
            <div className="text-xs text-slate-500">报告数量</div>
          </div>
        </div>
        <div className="text-2xl font-bold text-slate-100">{count}</div>
      </div>
    </div>
  );
}

function ReportListItem({
  report,
  isSelected,
  onClick,
}: {
  report: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  const category = categories.find((c) => c.key === report.category);
  const Icon = category?.icon || FileText;

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 border-b border-slate-800 cursor-pointer transition-colors',
        isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', category?.color || 'text-slate-400')}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-200 font-medium truncate">{report.title}</div>
          <div className="text-xs text-slate-500 mt-1">
            {new Date(report.generatedAt).toLocaleString('zh-CN')}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded',
              report.category === 'processed' ? 'bg-green-500/20 text-green-400' :
              report.category === 'pending_material' ? 'bg-amber-500/20 text-amber-400' :
              'bg-purple-500/20 text-purple-400'
            )}>
              {category?.label}
            </span>
            <span className="text-xs text-slate-600">
              来源: {report.dataSources.length} 项
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportPreview({ report }: { report: any }) {
  const handleExport = () => {
    const blob = new Blob([report.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report.content);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/30">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-medium text-slate-200">{report.title}</h2>
          <div className="text-xs text-slate-500 mt-0.5">
            生成于 {new Date(report.generatedAt).toLocaleString('zh-CN')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="复制"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="prose prose-invert prose-sm max-w-none">
            <style>{`
              .prose table { width: 100%; border-collapse: collapse; }
              .prose th, .prose td { border: 1px solid #334155; padding: 0.5rem 0.75rem; text-align: left; }
              .prose th { background: #1e293b; }
              .prose h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #f1f5f9; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
              .prose h2 { font-size: 1.125rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #e2e8f0; }
              .prose h3 { font-size: 1rem; margin-top: 1rem; margin-bottom: 0.5rem; color: #cbd5e1; }
              .prose p { color: #94a3b8; line-height: 1.75; }
              .prose ul, .prose ol { color: #94a3b8; }
              .prose strong { color: #e2e8f0; }
              .prose code { background: #1e293b; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875em; }
            `}</style>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report.content}
            </ReactMarkdown>
          </div>

          <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="text-xs text-slate-500 mb-2">📎 数据来源线索</div>
            <div className="flex flex-wrap gap-2">
              {report.dataSources.map((src: string, idx: number) => (
                <span key={idx} className="text-xs px-2 py-1 bg-slate-700/50 text-slate-400 rounded">
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const reports = useAppStore((s) => s.reports);
  const [activeCategory, setActiveCategory] = useState<ReportCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    reports.length > 0 ? reports[0].id : null
  );
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

  const filteredReports = reports
    .filter((r) => activeCategory === 'all' || r.category === activeCategory)
    .filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
      }
      return a.title.localeCompare(b.title);
    });

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  const getCategoryCount = (cat: ReportCategory) =>
    reports.filter((r) => r.category === cat).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <h1 className="text-xl font-semibold text-slate-100 mb-4">报告中心</h1>
        <div className="grid grid-cols-4 gap-4">
          <CategoryCard
            category={'processed' as ReportCategory}
            label="全部报告"
            icon={FileText}
            color="text-cyan-400"
            count={reports.length}
            isActive={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
          />
          {categories.map((cat) => (
            <CategoryCard
              key={cat.key}
              category={cat.key}
              label={cat.label}
              icon={cat.icon}
              color={cat.color}
              count={getCategoryCount(cat.key)}
              isActive={activeCategory === cat.key}
              onClick={() => setActiveCategory(cat.key)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/30 flex-shrink-0">
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="搜索报告..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
                <Filter className="w-3.5 h-3.5" />
                筛选
              </button>
              <button
                onClick={() => setSortBy(sortBy === 'date' ? 'title' : 'date')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortBy === 'date' ? '按时间' : '按标题'}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredReports.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">暂无报告</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <ReportListItem
                  key={report.id}
                  report={report}
                  isSelected={selectedReportId === report.id}
                  onClick={() => setSelectedReportId(report.id)}
                />
              ))
            )}
          </div>
        </div>

        {selectedReport ? (
          <ReportPreview report={selectedReport} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">选择一份报告查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
