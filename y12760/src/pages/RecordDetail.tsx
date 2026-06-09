import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Download, ShieldCheck, AlertTriangle, FileDown,
  FlaskConical, User, Calendar, BarChart3, GitMerge, BookOpen, Clock, History,
} from 'lucide-react';
import { useRecords } from '@/hooks/useRecord';
import { useRecordStore } from '@/store/useRecordStore';
import { useUiStore } from '@/store/useUiStore';
import { StatusBadge, SectionCard } from '@/components/common/UIComponents';
import { PeakTable } from '@/components/record/PeakTable';
import { AlignmentTimeline } from '@/components/alignment/AlignmentTimeline';
import { CalculationPanel } from '@/components/calculation/CalculationPanel';
import { OperationLogList } from '@/components/record/OperationLogList';
import { formatDateTime, formatNumber } from '@/utils/format';
import { exportToExcel, exportToPdf } from '@/utils/export';
import { cn } from '@/lib/utils';

export default function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loaded } = useRecords();
  const getRecord = useRecordStore(s => s.getRecord);
  const recalculate = useRecordStore(s => s.recalculateBalance);
  const updateStatus = useRecordStore(s => s.updateRecordStatus);
  const currentRole = useUiStore(s => s.currentRole);

  const record = useMemo(() => (id ? getRecord(id) : undefined), [id, getRecord, loaded]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <FlaskConical className="w-6 h-6 animate-pulse text-lab-500" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="card p-12 text-center">
        <h2 className="font-serif text-xl text-lab-800 mb-2">记录不存在</h2>
        <p className="text-sm text-zinc-500 mb-4">该记录可能已被删除或编号错误</p>
        <Link to="/" className="btn-secondary inline-flex">返回总览</Link>
      </div>
    );
  }

  const canEdit = currentRole === 'safety_officer';
  const peakIssues = record.peaks.filter(p => p.dataQuality !== 'normal').length;

  return (
    <div className="space-y-5 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost !px-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-serif text-2xl font-semibold text-lab-900">{record.sampleName}</h1>
              <StatusBadge status={record.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500 flex-wrap">
              <span className="font-mono text-lab-600">{record.batchNumber}</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{record.operator}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateTime(record.injectionTime)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && record.status !== 'ready' && (
            <button
              onClick={() => updateStatus(record.id, 'ready', '安全员复核通过', '人工复核确认数据可用')}
              className="btn-success"
            >
              <ShieldCheck className="w-4 h-4" />
              标记为可使用
            </button>
          )}
          {canEdit && record.status !== 'needs_review' && record.status !== 'invalid' && (
            <button
              onClick={() => updateStatus(record.id, 'needs_review', '安全员标记', '需要进一步复核确认')}
              className="btn-warning"
            >
              <AlertTriangle className="w-4 h-4" />
              标记待复核
            </button>
          )}
          {canEdit && (
            <Link to={`/records/${record.id}/edit`} className="btn-secondary">
              <Edit3 className="w-4 h-4" />
              编辑
            </Link>
          )}
          <button onClick={() => exportToExcel(record)} className="btn-secondary">
            <Download className="w-4 h-4" />
            导出 Excel
          </button>
          <button
            onClick={() => exportToPdf(record, 'report-content')}
            className="btn-primary"
          >
            <FileDown className="w-4 h-4" />
            导出 PDF
          </button>
        </div>
      </div>

      {record.status === 'needs_review' && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-warning-800">该记录需要安全员复核。</span>
            <span className="text-warning-700"> 检测到 {peakIssues} 处数据质量问题，课题组使用前请联系安全员确认。</span>
          </div>
        </div>
      )}
      {record.status === 'invalid' && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-danger-800">该记录为无效/坏数据，不得用于任何正式报告。</span>
            <span className="text-danger-700"> 仅供教学演示和问题分析。</span>
          </div>
        </div>
      )}

      <div id="report-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <SectionCard
              title="基本信息"
              icon={<FlaskConical className="w-5 h-5 text-lab-500" />}
              className="stagger-1"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: '仪器型号', value: record.instrumentModel },
                  { label: '色谱柱', value: record.chromatogramParams.column || '—' },
                  { label: '载气', value: record.chromatogramParams.carrierGas || '—' },
                  { label: '柱流速', value: record.chromatogramParams.flowRate ? `${record.chromatogramParams.flowRate} mL/min` : '—' },
                  { label: '进样量', value: record.chromatogramParams.injectionVolume || '—' },
                  { label: '检测器', value: record.chromatogramParams.detector || '—' },
                ].map(f => (
                  <div key={f.label}>
                    <div className="text-xs text-zinc-500 mb-0.5">{f.label}</div>
                    <div className="text-lab-800 font-medium">{f.value}</div>
                  </div>
                ))}
                {record.chromatogramParams.temperatureProgram && (
                  <div className="col-span-2 md:col-span-3">
                    <div className="text-xs text-zinc-500 mb-0.5">柱温程序</div>
                    <div className="text-lab-800 font-medium">{record.chromatogramParams.temperatureProgram}</div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="谱图峰数据"
              icon={<BarChart3 className="w-5 h-5 text-lab-500" />}
              extra={
                peakIssues > 0 && (
                  <span className="badge-warning">
                    <AlertTriangle className="w-3 h-3" />
                    {peakIssues} 处质量标记
                  </span>
                )
              }
              className="stagger-2"
            >
              <PeakTable peaks={record.peaks} />
            </SectionCard>

            <CalculationPanel
              result={record.calculationResult}
              onRecalculate={canEdit ? () => recalculate(record.id) : undefined}
              className="stagger-3"
            />
          </div>

          <div className="space-y-5">
            <SectionCard
              title="判读结论"
              icon={<BookOpen className="w-5 h-5 text-lab-500" />}
              className="stagger-1"
            >
              <div className="space-y-3">
                <p className="text-sm text-lab-800 leading-relaxed bg-lab-50/60 p-3 rounded-md border border-lab-100/60">
                  {record.conclusion || <span className="text-zinc-400 italic">暂未填写判读结论</span>}
                </p>
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-1 flex items-center gap-1">
                    <GitMerge className="w-3 h-3" />
                    结论来源追溯
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {record.conclusionSource || <span className="text-zinc-400 italic">未关联来源材料</span>}
                  </p>
                </div>
                {record.calculationResult && (
                  <div className="flex items-center gap-3 pt-2 border-t border-lab-50">
                    <div className="flex-1">
                      <div className="text-[11px] text-zinc-500 uppercase tracking-wide">主含量</div>
                      <div className="font-serif text-xl font-semibold text-lab-800 tabular-nums">
                        {formatNumber(record.calculationResult.finalResult)}
                        <span className="text-sm text-zinc-500 font-normal ml-0.5">{record.calculationResult.unit}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-zinc-500 uppercase tracking-wide">配平总和</div>
                      <div className={cn(
                        'font-serif text-xl font-semibold tabular-nums',
                        Math.abs(record.calculationResult.totalPercentage - 100) < 1 ? 'text-success-600' : 'text-warning-600',
                      )}>
                        {formatNumber(record.calculationResult.totalPercentage)}
                        <span className="text-sm text-zinc-500 font-normal ml-0.5">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="保留时间对齐过程"
              icon={<Clock className="w-5 h-5 text-lab-500" />}
              className="stagger-2"
            >
              <AlignmentTimeline steps={record.alignmentSteps} />
            </SectionCard>

            <SectionCard
              title="操作日志"
              icon={<History className="w-5 h-5 text-lab-500" />}
              className="stagger-3"
            >
              <OperationLogList logs={record.operationLogs} />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
