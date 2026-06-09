import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, FileSpreadsheet, Download, Eye, ChevronRight, FlaskConical,
  CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';
import { useRecords } from '@/hooks/useRecord';
import { SectionCard, EmptyState } from '@/components/common/UIComponents';
import { exportToExcel } from '@/utils/export';
import { statusLabel, statusBadgeClass, formatDateTime } from '@/utils/format';
import type { GCRecord } from '@/types';
import { cn } from '@/lib/utils';

type ReportTemplate = 'batch' | 'calculation' | 'comprehensive';

const templates: { id: ReportTemplate; name: string; desc: string; icon: typeof FileText }[] = [
  { id: 'batch', name: '批次报告', desc: '包含基本信息、谱图数据、状态标记', icon: FileText },
  { id: 'calculation', name: '配平计算报告', desc: '重点展示计算公式、中间值、各组分含量', icon: FileSpreadsheet },
  { id: 'comprehensive', name: '综合报告', desc: '包含全部模块：对齐过程 + 计算 + 结论 + 日志', icon: FileText },
];

export default function ReportCenter() {
  const { records, loaded } = useRecords();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('comprehensive');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  const recordList = useMemo(() =>
    [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  [records]);

  const preview = selectedRecord ? records.find(r => r.id === selectedRecord) : recordList[0];

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <FlaskConical className="w-6 h-6 animate-pulse text-lab-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-lab-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-lab-600" />
            报告中心
          </h1>
          <p className="text-sm text-zinc-500 mt-1">选择模板和记录，导出正式报告（Excel / PDF）</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((t, idx) => {
          const Icon = t.icon;
          const active = selectedTemplate === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={cn(
                'card card-hover p-5 text-left opacity-0 animate-fade-in-up relative',
                `stagger-${idx + 1}`,
                active && 'ring-2 ring-lab-400/60 border-lab-300',
              )}
              style={{ animationFillMode: 'forwards' }}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                active ? 'bg-lab-600 text-white' : 'bg-lab-100 text-lab-600',
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-semibold text-lab-800 mb-1">{t.name}</h3>
              <p className="text-xs text-zinc-500">{t.desc}</p>
              {active && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-success-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="选择记录" icon={<FileText className="w-5 h-5 text-lab-500" />} className="lg:col-span-1">
          {recordList.length === 0 ? (
            <EmptyState
              title="暂无记录"
              description="请先在总览页创建一条色谱记录"
              action={{ label: '去创建', to: '/records/new' }}
            />
          ) : (
            <div className="space-y-2 -mx-2">
              {recordList.map(r => (
                <RecordRow
                  key={r.id}
                  record={r}
                  active={preview?.id === r.id}
                  onClick={() => setSelectedRecord(r.id)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="报告预览"
          icon={<Eye className="w-5 h-5 text-lab-500" />}
          className="lg:col-span-2"
          extra={preview && (
            <button onClick={() => exportToExcel(preview)} className="btn-primary text-xs">
              <Download className="w-3.5 h-3.5" />
              导出 Excel
            </button>
          )}
        >
          {!preview ? (
            <EmptyState title="请选择一条记录以预览报告" icon={<Eye className="w-10 h-10" />} />
          ) : (
            <ReportPreview record={preview} template={selectedTemplate} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function RecordRow({ record, active, onClick }: { record: GCRecord; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
        active ? 'bg-lab-50 border border-lab-200' : 'hover:bg-lab-50/50',
      )}
    >
      <div className="w-1 h-10 rounded-full shrink-0" style={{
        background: record.status === 'ready' ? '#10b981' : record.status === 'needs_review' ? '#f59e0b' : '#ef4444',
      }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-lab-600 font-medium">{record.batchNumber}</span>
        </div>
        <div className="text-sm font-medium text-lab-800 truncate">{record.sampleName}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', statusBadgeClass(record.status))}>
            {statusLabel(record.status)}
          </span>
          <span className="text-[10px] text-zinc-400">{formatDateTime(record.updatedAt)}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
    </button>
  );
}

function ReportPreview({ record, template }: { record: GCRecord; template: ReportTemplate }) {
  return (
    <div className="bg-white border border-lab-100 rounded-lg shadow-sm p-6 max-h-[600px] overflow-auto">
      <div className="text-center border-b border-lab-100 pb-4 mb-4">
        <h2 className="font-serif text-xl font-semibold text-lab-800">气相色谱分析报告</h2>
        <p className="text-xs text-zinc-500 mt-1">{template === 'batch' ? '批次报告' : template === 'calculation' ? '配平计算报告' : '综合报告'}</p>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-2">基本信息</h3>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-xs">
            <div className="flex"><span className="text-zinc-500 w-20 shrink-0">批号</span><span className="font-mono text-lab-700">{record.batchNumber}</span></div>
            <div className="flex"><span className="text-zinc-500 w-20 shrink-0">样品名</span><span className="text-lab-700">{record.sampleName}</span></div>
            <div className="flex"><span className="text-zinc-500 w-20 shrink-0">进样时间</span><span className="text-lab-700">{record.injectionTime}</span></div>
            <div className="flex"><span className="text-zinc-500 w-20 shrink-0">仪器</span><span className="text-lab-700">{record.instrumentModel}</span></div>
            <div className="flex"><span className="text-zinc-500 w-20 shrink-0">操作员</span><span className="text-lab-700">{record.operator}</span></div>
            <div className="flex"><span className="text-zinc-500 w-20 shrink-0">状态</span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', statusBadgeClass(record.status))}>
                {statusLabel(record.status)}
              </span>
            </div>
          </div>
        </div>

        {(template === 'batch' || template === 'comprehensive') && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-2">谱图峰数据</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-1.5 px-2 border-b border-lab-100">#</th>
                  <th className="py-1.5 px-2 border-b border-lab-100">组分</th>
                  <th className="py-1.5 px-2 border-b border-lab-100 text-right">RT(min)</th>
                  <th className="py-1.5 px-2 border-b border-lab-100 text-right">面积</th>
                  <th className="py-1.5 px-2 border-b border-lab-100 text-right">含量%</th>
                </tr>
              </thead>
              <tbody>
                {record.peaks.map(p => {
                  const comp = record.calculationResult?.components.find(c => c.name === p.compoundName);
                  return (
                    <tr key={p.id}>
                      <td className="py-1 px-2 border-b border-lab-50 text-zinc-400">{p.peakIndex}</td>
                      <td className="py-1 px-2 border-b border-lab-50 text-lab-700">{p.compoundName || '—'}</td>
                      <td className="py-1 px-2 border-b border-lab-50 text-right font-mono">{p.retentionTime?.toFixed(3) || '—'}</td>
                      <td className="py-1 px-2 border-b border-lab-50 text-right font-mono">{p.peakArea?.toLocaleString() || '—'}</td>
                      <td className="py-1 px-2 border-b border-lab-50 text-right font-mono text-lab-700">
                        {comp ? comp.percentage.toFixed(2) + '%' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(template === 'calculation' || template === 'comprehensive') && record.calculationResult && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-2">配平计算</h3>
            <div className="bg-lab-50/50 rounded p-3 border border-lab-100 text-xs">
              <div className="mb-2"><span className="text-zinc-500">公式：</span><code className="font-mono bg-white px-1 rounded">{record.calculationResult.formula}</code></div>
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500">主含量结果：</span>
                <span className="font-serif text-lg font-semibold text-lab-800">{record.calculationResult.finalResult.toFixed(2)}%</span>
                <span className="text-zinc-400 text-xs ml-2">（配平总和 {record.calculationResult.totalPercentage.toFixed(2)}%）</span>
              </div>
              {record.calculationResult.note && (
                <div className="mt-2 text-zinc-600 text-xs italic">{record.calculationResult.note}</div>
              )}
            </div>
          </div>
        )}

        {template === 'comprehensive' && (
          <>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-2">对齐处理步骤</h3>
              <ol className="space-y-1 text-xs">
                {record.alignmentSteps.map(s => (
                  <li key={s.id} className="flex items-start gap-2">
                    {s.isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-zinc-300 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium text-lab-700">Step {s.stepOrder}：{s.stepName}</span>
                      <span className="text-zinc-500 ml-1">— {s.description}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-2">判读结论</h3>
              <p className="text-xs text-lab-800 bg-lab-50/60 p-3 rounded border border-lab-100 leading-relaxed">{record.conclusion}</p>
              {record.conclusionSource && (
                <p className="text-[11px] text-zinc-500 mt-1.5 italic">来源：{record.conclusionSource}</p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 pt-3 border-t border-lab-100 flex items-center justify-between text-[10px] text-zinc-400">
        <span>报告生成时间：{new Date().toLocaleString('zh-CN')}</span>
        <Link to={`/records/${record.id}`} className="text-lab-500 hover:text-lab-700 inline-flex items-center gap-0.5">
          查看完整记录 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
