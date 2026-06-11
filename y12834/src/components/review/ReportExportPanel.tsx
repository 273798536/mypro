import { useState, useMemo } from 'react';
import { Download, Eye, FileText, GitCompare, ListChecks, Clock } from 'lucide-react';
import type { WorkflowRun } from '../../types';
import { generateReportFileName } from '../../utils/export';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

/**
 * 报告类型
 */
export type ReportType = 'single_run' | 'compare_runs' | 'all_anomalies';

/**
 * 报告导出格式
 */
export type ReportFormat = 'csv' | 'txt';

/**
 * 报告导出面板属性接口
 */
interface ReportExportPanelProps {
  /** 工作流运行列表 */
  runs: WorkflowRun[];
  /** 导出报告回调 */
  onExport: (options: {
    reportType: ReportType;
    format: ReportFormat;
    runId1: string;
    runId2?: string;
    fileName: string;
  }) => void;
  /** 预览报告回调 */
  onPreview: (options: {
    reportType: ReportType;
    runId1: string;
    runId2?: string;
  }) => void;
}

/**
 * 报告类型选项配置
 */
const reportTypeOptions: {
  value: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'single_run',
    label: '单次运行报告',
    description: '导出指定单次工作流运行的完整分析报告',
    icon: <FileText size={18} />,
  },
  {
    value: 'compare_runs',
    label: '版本对比报告',
    description: '对比两个版本的差异，输出变更分析报告',
    icon: <GitCompare size={18} />,
  },
  {
    value: 'all_anomalies',
    label: '全量异常报告',
    description: '导出所有历史运行中检测到的异常汇总报告',
    icon: <ListChecks size={18} />,
  },
];

/**
 * 报告导出面板组件
 * 支持三种报告类型、版本选择、格式选择、预览和下载
 */
export function ReportExportPanel({ runs, onExport, onPreview }: ReportExportPanelProps) {
  /** 选中的报告类型 */
  const [reportType, setReportType] = useState<ReportType>('single_run');

  /** 选中的第一个运行ID（单次或对比） */
  const [runId1, setRunId1] = useState<string>(runs[0]?.id ?? '');

  /** 选中的第二个运行ID（仅对比报告） */
  const [runId2, setRunId2] = useState<string>(runs[1]?.id ?? '');

  /** 选中的导出格式 */
  const [format, setFormat] = useState<ReportFormat>('csv');

  /**
   * 获取当前选中的运行信息
   */
  const selectedRun1 = useMemo(
    () => runs.find((r) => r.id === runId1),
    [runs, runId1]
  );
  const selectedRun2 = useMemo(
    () => runs.find((r) => r.id === runId2),
    [runs, runId2]
  );

  /**
   * 生成预览文件名（包含版本号和时间戳）
   */
  const previewFileName = useMemo(() => {
    const versionLabel = selectedRun1?.version_label ?? 'unknown';
    const typeLabel: Record<ReportType, string> = {
      single_run: 'report',
      compare_runs: 'compare',
      all_anomalies: 'anomalies',
    };
    return generateReportFileName(
      runId1,
      reportType === 'compare_runs' && selectedRun2
        ? `${versionLabel}_vs_${selectedRun2.version_label}`
        : versionLabel,
      typeLabel[reportType],
      format
    );
  }, [runId1, selectedRun1, selectedRun2, reportType, format]);

  /**
   * 处理导出
   */
  const handleExport = () => {
    onExport({
      reportType,
      format,
      runId1,
      runId2: reportType === 'compare_runs' ? runId2 : undefined,
      fileName: previewFileName,
    });
  };

  /**
   * 处理预览
   */
  const handlePreview = () => {
    onPreview({
      reportType,
      runId1,
      runId2: reportType === 'compare_runs' ? runId2 : undefined,
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-deep-ocean text-lg">
              报告导出
            </h3>
            <p className="text-sm text-deep-ocean/50 mt-0.5">
              选择报告类型和格式，预览后下载
            </p>
          </div>
          <Badge variant="info">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {new Date().toLocaleString('zh-CN')}
            </span>
          </Badge>
        </div>

        {/* 报告类型单选 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-deep-ocean/70">报告类型</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reportTypeOptions.map((option) => (
              <label
                key={option.value}
                className={`relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  reportType === option.value
                    ? 'border-deep-ocean bg-deep-ocean/5'
                    : 'border-deep-ocean/10 hover:border-deep-ocean/30 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="reportType"
                  value={option.value}
                  checked={reportType === option.value}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="sr-only"
                />
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${
                    reportType === option.value
                      ? 'bg-deep-ocean text-paper'
                      : 'bg-paper-dark text-deep-ocean/60'
                  }`}
                >
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      reportType === option.value ? 'text-deep-ocean' : 'text-deep-ocean/80'
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="text-xs text-deep-ocean/50 mt-0.5 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 版本选择区域（根据报告类型显示） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 第一个版本选择 */}
          {reportType !== 'all_anomalies' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-deep-ocean/70">
                {reportType === 'compare_runs' ? '基准版本' : '运行版本'}
              </label>
              <select
                value={runId1}
                onChange={(e) => setRunId1(e.target.value)}
                className="input-field"
              >
                {runs.length === 0 ? (
                  <option value="">暂无运行记录</option>
                ) : (
                  runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.version_label} - {run.status === 'completed' ? '已完成' : run.status}
                      {' ('}
                      {new Date(run.started_at).toLocaleDateString('zh-CN')}
                      {')'}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* 第二个版本选择（仅对比报告） */}
          {reportType === 'compare_runs' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-deep-ocean/70">对比版本</label>
              <select
                value={runId2}
                onChange={(e) => setRunId2(e.target.value)}
                className="input-field"
              >
                {runs
                  .filter((r) => r.id !== runId1)
                  .length === 0 ? (
                  <option value="">暂无其他运行记录</option>
                ) : (
                  runs
                    .filter((r) => r.id !== runId1)
                    .map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.version_label} - {run.status === 'completed' ? '已完成' : run.status}
                        {' ('}
                        {new Date(run.started_at).toLocaleDateString('zh-CN')}
                        {')'}
                      </option>
                    ))
                )}
              </select>
            </div>
          )}

          {/* 导出格式选择 */}
          <div
            className={`space-y-2 ${reportType === 'all_anomalies' ? 'md:col-span-2' : ''}`}
          >
            <label className="text-sm font-medium text-deep-ocean/70">导出格式</label>
            <div className="flex gap-3">
              <label
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  format === 'csv'
                    ? 'border-deep-ocean bg-deep-ocean/5 text-deep-ocean'
                    : 'border-deep-ocean/10 hover:border-deep-ocean/30 text-deep-ocean/60'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="sr-only"
                />
                <FileText size={16} />
                <span className="text-sm font-medium">CSV 表格</span>
              </label>
              <label
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  format === 'txt'
                    ? 'border-deep-ocean bg-deep-ocean/5 text-deep-ocean'
                    : 'border-deep-ocean/10 hover:border-deep-ocean/30 text-deep-ocean/60'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="txt"
                  checked={format === 'txt'}
                  onChange={() => setFormat('txt')}
                  className="sr-only"
                />
                <FileText size={16} />
                <span className="text-sm font-medium">TXT 文本</span>
              </label>
            </div>
          </div>
        </div>

        {/* 文件名预览 */}
        <div className="p-4 bg-paper-dark/50 rounded-lg border border-deep-ocean/10">
          <div className="flex items-center gap-2 text-xs font-medium text-deep-ocean/50 mb-1">
            <FileText size={12} />
            文件名预览
          </div>
          <p className="font-mono text-sm text-deep-ocean break-all">{previewFileName}</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={handlePreview}
            disabled={reportType !== 'all_anomalies' && !runId1}
          >
            <span className="flex items-center gap-2">
              <Eye size={16} />
              预览报告
            </span>
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={
              reportType !== 'all_anomalies' && !runId1
                ? true
                : reportType === 'compare_runs' && !runId2
            }
          >
            <span className="flex items-center gap-2">
              <Download size={16} />
              下载报告
            </span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
