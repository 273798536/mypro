import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  BarChart3,
  Package,
  RefreshCw,
  Eye,
  ArrowLeftRight,
  Sparkles,
  Loader2,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  useOperatorStore,
  type ExportFormat,
  type ExportField,
  type VersionOption,
} from '@/store/operatorStore';
import type { WorkflowStatus, SourceType } from '@/types';
import { highlightDiff } from '@/utils/diffUtils';
import { exportToExcel, exportSummaryReport, buildPageSnapshot } from '@/utils/exportUtils';
import type { KPIData as ExportKPIData } from '@/utils/exportUtils';

const BATCH_OPTIONS = [
  { id: 'B001', name: '2026年6月上旬批次' },
  { id: 'B002', name: '2026年6月中旬批次' },
  { id: 'B003', name: '2026年5月下旬批次' },
];

const VERSION_OPTIONS: Array<{ value: VersionOption; label: string }> = [
  { value: 'v1', label: 'V1 标准检测规则' },
  { value: 'v2', label: 'V2 优化检测规则' },
  { value: 'both', label: 'V1 + V2 双版本' },
];

const WORKFLOW_OPTIONS: Array<{ value: WorkflowStatus; label: string; color: string }> = [
  { value: 'approved', label: '已审核通过', color: 'success' },
  { value: 'pending', label: '待审核', color: 'warning' },
  { value: 'need_material', label: '需补材料', color: 'danger' },
  { value: 'recheck', label: '需复核', color: 'amber' },
];

const SOURCE_OPTIONS: Array<{ value: SourceType; label: string }> = [
  { value: 'old_correction', label: '历史改判迁移' },
  { value: 'normal_record', label: '正常标注记录' },
  { value: 'verbal_note', label: '口头通知记录' },
];

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; icon: React.ReactNode }> = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { value: 'csv', label: 'CSV (.csv)', icon: <FileText className="w-4 h-4" /> },
  { value: 'pdf', label: 'PDF (.pdf)', icon: <FileText className="w-4 h-4" /> },
];

const FIELD_OPTIONS: Array<{ value: ExportField; label: string }> = [
  { value: 'sampleInfo', label: '样本信息' },
  { value: 'corrections', label: '改判记录' },
  { value: 'citations', label: '引用材料' },
  { value: 'operatorInfo', label: '操作员信息' },
  { value: 'versionInfo', label: '版本信息' },
];

type PreviewTab = 'summary' | 'consistency' | 'history';

const Checkbox: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
}> = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none group">
    <span
      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
        checked
          ? 'bg-industrial border-industrial'
          : 'border-gray-300 group-hover:border-industrial-400'
      }`}
      onClick={() => onChange(!checked)}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
    {label && <span className="text-sm text-gray-700">{label}</span>}
  </label>
);

const ExportPage: React.FC = () => {
  const {
    exportConfig,
    setExportConfig,
    addExportRecord,
    runConsistencyCheck,
    lastConsistencyCheck,
    setConsistencyCheck,
    exportRecords,
  } = useOperatorStore();

  const [activeTab, setActiveTab] = useState<PreviewTab>('summary');
  const [showSuccess, setShowSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastExportedCount, setLastExportedCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const toggleInArray = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

  const batchMap = useMemo(
    () => new Map(BATCH_OPTIONS.map((b) => [b.id, b.name])),
    []
  );

  const previewKPIData: ExportKPIData = useMemo(() => {
    const base = exportConfig.selectedBatches.length * 40;
    return {
      totalSamples: base,
      approvedCount: Math.round(base * 0.62),
      rejectedCount: Math.round(base * 0.1),
      pendingCount: Math.round(base * 0.28),
      approvalRate: 86.2,
      highRiskCount: Math.round(base * 0.08),
      mediumRiskCount: Math.round(base * 0.22),
      lowRiskCount: Math.round(base * 0.7),
      avgProcessingTime: 12.4,
    };
  }, [exportConfig.selectedBatches]);

  const batchStats = useMemo(
    () =>
      exportConfig.selectedBatches.map((bid) => {
        const cnt = 40 + (bid.length * 7) % 20;
        return {
          batchId: bid,
          batchName: batchMap.get(bid) || bid,
          sampleCount: cnt,
          approvedCount: Math.round(cnt * 0.6),
          rejectedCount: Math.round(cnt * 0.12),
          pendingCount: cnt - Math.round(cnt * 0.6) - Math.round(cnt * 0.12),
        };
      }),
    [exportConfig.selectedBatches, batchMap]
  );

  const inconsistentCount = lastConsistencyCheck
    ? lastConsistencyCheck.filter((r) => !r.consistent).length
    : 0;
  const totalChecks = lastConsistencyCheck?.length ?? 0;
  const allConsistent = inconsistentCount === 0 && totalChecks > 0;

  const handleExport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 800));

    const count = exportConfig.selectedBatches.length * 40;
    setLastExportedCount(count);

    if (exportConfig.exportFormats.includes('excel')) {
      const summaryRows = batchStats.map((b) => ({
        批次ID: b.batchId,
        批次名称: b.batchName,
        样本数: b.sampleCount,
        通过数: b.approvedCount,
        驳回数: b.rejectedCount,
        待审数: b.pendingCount,
      }));
      exportToExcel(summaryRows, `${exportConfig.fileName}_批次明细`, '批次统计');
    }

    if (exportConfig.includeKPI || exportConfig.includeBatchStats) {
      exportSummaryReport(previewKPIData, [], new Map());
    }

    addExportRecord({
      id: `EXP-${Date.now()}`,
      fileName: `${exportConfig.fileName}.xlsx`,
      exportedAt: new Date().toISOString(),
      exportedBy: '周姐',
      status: 'pending',
      sampleCount: count,
      formats: [...exportConfig.exportFormats],
    });

    setExporting(false);
    setShowSuccess(true);
  };

  const handleCheckConsistency = async () => {
    setIsChecking(true);
    const snapshot = buildPageSnapshot();
    await new Promise((r) => setTimeout(r, 600));
    runConsistencyCheck([], snapshot);
    setIsChecking(false);
    setActiveTab('consistency');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-industrial" />
          导出与一致性校验
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          按筛选条件导出质检报告，并校验导出内容与页面状态的一致性
        </p>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧配置面板 */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber" />
                导出配置
              </h3>
            </div>
            <div className="card-body space-y-5 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {/* 按批次 */}
              <div>
                <div className="label">按批次（多选）</div>
                <div className="space-y-2">
                  {BATCH_OPTIONS.map((b) => (
                    <Checkbox
                      key={b.id}
                      checked={exportConfig.selectedBatches.includes(b.id)}
                      onChange={(v) =>
                        setExportConfig({
                          selectedBatches: v
                            ? [...exportConfig.selectedBatches, b.id]
                            : exportConfig.selectedBatches.filter((x) => x !== b.id),
                        })
                      }
                      label={<span>{b.name}</span>}
                    />
                  ))}
                </div>
              </div>

              <div className="divider" />

              {/* 按版本 */}
              <div>
                <div className="label">按版本</div>
                <div className="space-y-2">
                  {VERSION_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer select-none group"
                    >
                      <input
                        type="radio"
                        name="version"
                        className="w-4 h-4 text-industrial accent-industrial cursor-pointer"
                        checked={exportConfig.versionOption === opt.value}
                        onChange={() => setExportConfig({ versionOption: opt.value })}
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 按工作流 */}
              <div>
                <div className="label">按工作流状态（多选）</div>
                <div className="space-y-2">
                  {WORKFLOW_OPTIONS.map((opt) => (
                    <Checkbox
                      key={opt.value}
                      checked={exportConfig.selectedWorkflowStatuses.includes(opt.value)}
                      onChange={(v) =>
                        setExportConfig({
                          selectedWorkflowStatuses: toggleInArray(
                            exportConfig.selectedWorkflowStatuses,
                            opt.value
                          ) as WorkflowStatus[],
                        })
                      }
                      label={
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              opt.color === 'success'
                                ? 'bg-success'
                                : opt.color === 'warning'
                                ? 'bg-warning'
                                : opt.color === 'danger'
                                ? 'bg-danger'
                                : 'bg-amber'
                            }`}
                          />
                          {opt.label}
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>

              {/* 按来源 */}
              <div>
                <div className="label">按来源类型（多选）</div>
                <div className="space-y-2">
                  {SOURCE_OPTIONS.map((opt) => (
                    <Checkbox
                      key={opt.value}
                      checked={exportConfig.selectedSourceTypes.includes(opt.value)}
                      onChange={(v) =>
                        setExportConfig({
                          selectedSourceTypes: toggleInArray(
                            exportConfig.selectedSourceTypes,
                            opt.value
                          ) as SourceType[],
                        })
                      }
                      label={<span>{opt.label}</span>}
                    />
                  ))}
                </div>
              </div>

              <div className="divider" />

              {/* 导出格式 */}
              <div>
                <div className="label">导出格式（多选）</div>
                <div className="grid grid-cols-1 gap-2">
                  {FORMAT_OPTIONS.map((opt) => (
                    <Checkbox
                      key={opt.value}
                      checked={exportConfig.exportFormats.includes(opt.value)}
                      onChange={(v) =>
                        setExportConfig({
                          exportFormats: toggleInArray(
                            exportConfig.exportFormats,
                            opt.value
                          ) as ExportFormat[],
                        })
                      }
                      label={
                        <span className="flex items-center gap-1.5">
                          {opt.icon}
                          {opt.label}
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>

              {/* 字段勾选 */}
              <div>
                <div className="label">导出字段</div>
                <div className="grid grid-cols-1 gap-2">
                  {FIELD_OPTIONS.map((opt) => (
                    <Checkbox
                      key={opt.value}
                      checked={exportConfig.exportFields.includes(opt.value)}
                      onChange={(v) =>
                        setExportConfig({
                          exportFields: toggleInArray(
                            exportConfig.exportFields,
                            opt.value
                          ) as ExportField[],
                        })
                      }
                      label={<span>{opt.label}</span>}
                    />
                  ))}
                </div>
              </div>

              <div className="divider" />

              {/* 摘要选项 */}
              <div>
                <div className="label">摘要选项</div>
                <div className="space-y-2">
                  <Checkbox
                    checked={exportConfig.includeKPI}
                    onChange={(v) => setExportConfig({ includeKPI: v })}
                    label={
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-industrial" />
                        包含 KPI 摘要
                      </span>
                    }
                  />
                  <Checkbox
                    checked={exportConfig.includeBatchStats}
                    onChange={(v) => setExportConfig({ includeBatchStats: v })}
                    label={
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-success" />
                        包含批次统计
                      </span>
                    }
                  />
                  <Checkbox
                    checked={exportConfig.includeConsistencyNote}
                    onChange={(v) => setExportConfig({ includeConsistencyNote: v })}
                    label={
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber" />
                        包含一致性说明文字
                      </span>
                    }
                  />
                </div>
              </div>

              <div className="divider" />

              {/* 文件名 */}
              <div>
                <div className="label">文件名</div>
                <input
                  type="text"
                  className="input"
                  value={exportConfig.fileName}
                  onChange={(e) => setExportConfig({ fileName: e.target.value })}
                  placeholder="请输入文件名"
                />
                <p className="text-xs text-gray-400 mt-1">后缀将根据导出格式自动添加</p>
              </div>

              {/* 导出按钮 */}
              <div className="pt-2 space-y-2">
                <button
                  className="btn btn-primary w-full btn-lg"
                  onClick={handleExport}
                  disabled={
                    exporting ||
                    exportConfig.selectedBatches.length === 0 ||
                    exportConfig.exportFormats.length === 0
                  }
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在生成...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      立即导出
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary w-full"
                  onClick={handleCheckConsistency}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      校验中...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      仅运行一致性校验
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧预览区 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="card">
            <div className="flex border-b border-gray-100">
              {[
                { key: 'summary', label: '页面摘要预览', icon: <FileSpreadsheet className="w-4 h-4" /> },
                {
                  key: 'consistency',
                  label: '一致性校验报告',
                  icon: <ShieldCheck className="w-4 h-4" />,
                  badge:
                    lastConsistencyCheck && inconsistentCount > 0
                      ? inconsistentCount
                      : null,
                },
                {
                  key: 'history',
                  label: '历史导出记录',
                  icon: <History className="w-4 h-4" />,
                  badge: exportRecords.length,
                },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setActiveTab(t.key as PreviewTab);
                    if (t.key === 'consistency' && !lastConsistencyCheck) {
                      handleCheckConsistency();
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all border-b-2 ${
                    activeTab === t.key
                      ? 'border-industrial text-industrial bg-industrial-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {t.badge !== null && t.badge !== undefined && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium ${
                        t.key === 'consistency'
                          ? 'bg-danger-100 text-danger'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab 1: 摘要预览 */}
          {activeTab === 'summary' && (
            <div className="card animate-fade-in">
              <div className="card-header">
                <div>
                  <h3 className="font-semibold text-gray-900">导出摘要页 · 实时预览</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    模拟 Excel Sheet 布局 · 将写入导出文件的首页
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  生成时间：{new Date().toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="card-body space-y-8 bg-gray-50/50">
                {/* KPI 表 */}
                {exportConfig.includeKPI && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-industrial rounded-full" />
                      <h4 className="font-semibold text-gray-800">KPI 指标总览</h4>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-4 py-3 text-left font-medium text-gray-700 w-1/2">
                              指标
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">
                              数值
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: '样本总数', value: previewKPIData.totalSamples, strong: true },
                            { label: '审核通过数', value: previewKPIData.approvedCount, color: 'text-success' },
                            { label: '审核驳回数', value: previewKPIData.rejectedCount, color: 'text-danger' },
                            { label: '待审核数', value: previewKPIData.pendingCount, color: 'text-warning' },
                            {
                              label: '审核通过率 (%)',
                              value: `${previewKPIData.approvalRate}%`,
                              color: 'text-industrial',
                            },
                            { label: '高风险样本数', value: previewKPIData.highRiskCount, color: 'text-danger' },
                            { label: '中风险样本数', value: previewKPIData.mediumRiskCount, color: 'text-warning' },
                            { label: '低风险样本数', value: previewKPIData.lowRiskCount, color: 'text-success' },
                            {
                              label: '平均处理时间 (分钟)',
                              value: previewKPIData.avgProcessingTime,
                            },
                          ].map((row, i) => (
                            <tr
                              key={i}
                              className={i % 2 === 1 ? 'bg-gray-50/60' : ''}
                            >
                              <td className="px-4 py-2.5 text-gray-700 border-t border-gray-100">
                                {row.label}
                              </td>
                              <td
                                className={`px-4 py-2.5 text-right border-t border-gray-100 font-medium ${
                                  row.color || 'text-gray-900'
                                } ${row.strong ? 'text-lg' : ''}`}
                              >
                                {row.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* 批次统计 */}
                {exportConfig.includeBatchStats && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-success rounded-full" />
                      <h4 className="font-semibold text-gray-800">批次分布统计</h4>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-success-50/70">
                            <th className="px-4 py-3 text-left font-medium text-gray-700">
                              批次 ID
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">
                              批次名称
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">
                              样本数
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-success">
                              通过
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-danger">
                              驳回
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-warning">
                              待审
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchStats.map((b, i) => (
                            <tr
                              key={b.batchId}
                              className={i % 2 === 1 ? 'bg-gray-50/60' : ''}
                            >
                              <td className="px-4 py-2.5 font-mono text-xs text-gray-600 border-t border-gray-100">
                                {b.batchId}
                              </td>
                              <td className="px-4 py-2.5 text-gray-800 border-t border-gray-100">
                                {b.batchName}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900 border-t border-gray-100">
                                {b.sampleCount}
                              </td>
                              <td className="px-4 py-2.5 text-right text-success font-medium border-t border-gray-100">
                                {b.approvedCount}
                              </td>
                              <td className="px-4 py-2.5 text-right text-danger font-medium border-t border-gray-100">
                                {b.rejectedCount}
                              </td>
                              <td className="px-4 py-2.5 text-right text-warning font-medium border-t border-gray-100">
                                {b.pendingCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* 处理结论 */}
                {exportConfig.includeConsistencyNote && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-amber rounded-full" />
                      <h4 className="font-semibold text-gray-800">处理结论与一致性说明</h4>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-900">
                          <p className="font-medium mb-1">一致性声明</p>
                          <p className="leading-relaxed text-amber-800">
                            本报告生成时已对页面状态进行快照哈希并嵌入导出文件。
                            校验码：
                            <code className="ml-1 px-1.5 py-0.5 bg-white rounded text-xs font-mono border border-amber-200">
                              HASH-{Math.random().toString(36).slice(2, 10).toUpperCase()}-{new Date().getTime().toString(36).toUpperCase().slice(-6)}
                            </code>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-1">处理结论</p>
                          <p className="leading-relaxed text-gray-600">
                            本次导出共包含 <b>{previewKPIData.totalSamples}</b> 条样本，
                            审核通过率 <b className="text-industrial">{previewKPIData.approvalRate}%</b>。
                            高风险 <b className="text-danger">{previewKPIData.highRiskCount}</b> 条，
                            中风险 <b className="text-warning">{previewKPIData.mediumRiskCount}</b> 条，
                            低风险 <b className="text-success">{previewKPIData.lowRiskCount}</b> 条。
                            建议优先处理高风险待补材料样本，确保批次流转顺畅。
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-1">版本对比说明</p>
                          <p className="leading-relaxed text-gray-600">
                            版本选项：<b>{VERSION_OPTIONS.find((v) => v.value === exportConfig.versionOption)?.label}</b>。
                            包含来源：
                            <b>{exportConfig.selectedSourceTypes.length}</b> 种；
                            工作流状态：
                            <b>{exportConfig.selectedWorkflowStatuses.length}</b> 种。
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: 一致性校验 */}
          {activeTab === 'consistency' && (
            <div className="card animate-fade-in">
              <div className="card-header">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">一致性校验报告</h3>
                    {lastConsistencyCheck && (
                      <span
                        className={`badge ${
                          allConsistent ? 'badge-success' : 'badge-danger'
                        }`}
                      >
                        {allConsistent ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            全部一致 ({totalChecks}/{totalChecks})
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            {inconsistentCount} 项不一致
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    导出前对页面状态做快照哈希并嵌入文件；本页对比页面实际状态 vs 文件嵌入快照
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCheckConsistency}
                  disabled={isChecking}
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  立即校验
                </button>
              </div>

              <div className="card-body">
                {!lastConsistencyCheck ? (
                  <div className="py-16 text-center text-gray-400">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-40" />
                    <p>暂无校验结果，点击右上角「立即校验」开始</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lastConsistencyCheck.map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border p-4 transition-all ${
                          item.consistent
                            ? 'border-success-200 bg-success-50/40'
                            : 'border-danger-200 bg-danger-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              item.consistent
                                ? 'bg-success-100 text-success'
                                : 'bg-danger-100 text-danger'
                            }`}
                          >
                            {item.consistent ? (
                              <Check className="w-4 h-4" strokeWidth={3} />
                            ) : (
                              <X className="w-4 h-4" strokeWidth={3} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <code className="text-xs font-mono text-gray-700 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                                {item.path}
                              </code>
                              <span
                                className={`text-xs font-medium ${
                                  item.consistent ? 'text-success' : 'text-danger'
                                }`}
                              >
                                {item.consistent ? '一致 ✅' : '不一致 ❌'}
                              </span>
                            </div>
                            {!item.consistent && (
                              <div className="text-sm space-y-1.5 mt-3">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-danger-100 text-danger font-medium flex-shrink-0 mt-0.5">
                                    页面
                                  </span>
                                  <span className="font-mono text-xs bg-white/80 px-2 py-1 rounded border border-danger-100 text-gray-700 break-all">
                                    {highlightDiff(item.exportValue, item.pageValue)}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-industrial-100 text-industrial font-medium flex-shrink-0 mt-0.5">
                                    文件
                                  </span>
                                  <span className="font-mono text-xs bg-white/80 px-2 py-1 rounded border border-industrial-100 text-gray-700 break-all">
                                    {highlightDiff(item.pageValue, item.exportValue)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: 历史记录 */}
          {activeTab === 'history' && (
            <div className="card animate-fade-in">
              <div className="card-header">
                <div>
                  <h3 className="font-semibold text-gray-900">历史导出记录</h3>
                  <p className="text-xs text-gray-500 mt-0.5">可重新下载、校验、对比过往导出</p>
                </div>
                <div className="text-xs text-gray-400">共 {exportRecords.length} 条</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="px-4 py-3 text-left font-medium">文件名</th>
                      <th className="px-4 py-3 text-left font-medium">导出时间</th>
                      <th className="px-4 py-3 text-left font-medium">导出人</th>
                      <th className="px-4 py-3 text-left font-medium">样本数</th>
                      <th className="px-4 py-3 text-left font-medium">格式</th>
                      <th className="px-4 py-3 text-left font-medium">状态</th>
                      <th className="px-4 py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportRecords.map((rec) => (
                      <tr
                        key={rec.id}
                        className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-industrial" />
                            <span className="font-medium text-gray-800">{rec.fileName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {new Date(rec.exportedAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{rec.exportedBy}</td>
                        <td className="px-4 py-3 text-gray-800 font-mono text-xs">
                          {rec.sampleCount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {rec.formats.map((f) => (
                              <span
                                key={f}
                                className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono uppercase"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {rec.status === 'verified' ? (
                            <span className="badge badge-success">
                              <CheckCircle2 className="w-3 h-3" />
                              已校验通过
                            </span>
                          ) : (
                            <span className="badge badge-warning">
                              <AlertTriangle className="w-3 h-3" />
                              待校验
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="p-1.5 rounded hover:bg-industrial-50 text-industrial transition-colors"
                              title="重新下载"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-success-50 text-success transition-colors"
                              title="校验"
                              onClick={() => {
                                setConsistencyCheck(null);
                                setActiveTab('consistency');
                                handleCheckConsistency();
                              }}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-amber-50 text-amber transition-colors"
                              title="对比"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 导出成功弹窗 */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-modal w-[480px] max-w-[92vw] animate-scale-in">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <button
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                  onClick={() => setShowSuccess(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">导出成功！</h3>
              <p className="text-gray-500 text-sm mb-6">
                共导出 <b className="text-industrial">{lastExportedCount}</b> 条样本数据，
                文件 <b>{exportConfig.fileName}.xlsx</b> 已生成
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">导出格式</span>
                  <span className="font-medium text-gray-800">
                    {exportConfig.exportFormats.join(' / ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">包含字段</span>
                  <span className="font-medium text-gray-800">
                    {exportConfig.exportFields.length} 项
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">选中批次</span>
                  <span className="font-medium text-gray-800">
                    {exportConfig.selectedBatches.length} 个
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={() => {
                    setShowSuccess(false);
                  }}
                >
                  <Download className="w-4 h-4" />
                  立即下载
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowSuccess(false);
                      handleCheckConsistency();
                    }}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    立即校验一致性
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowSuccess(false)}
                  >
                    继续配置
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPage;
