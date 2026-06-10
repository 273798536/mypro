import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ConsistencyIssue, SummaryData } from '@/utils/consistency';

interface ConsistencyPanelProps {
  uiSummary: SummaryData;
  issues: ConsistencyIssue[];
  onRefresh: () => void;
  onExport?: () => void;
  canExport: boolean;
}

export function ConsistencyPanel({ uiSummary, issues, onRefresh, onExport, canExport }: ConsistencyPanelProps) {
  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasWarnings = issues.some((i) => i.severity === 'warning');

  return (
    <div className="lab-card p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-serif text-lg font-semibold text-lab-navy">摘要一致性校验</h3>
          <p className="text-sm text-gray-500 mt-1">确保界面显示结论与导出文件内容完全一致</p>
        </div>
        <button
          onClick={onRefresh}
          className="lab-btn bg-white border border-lab-line text-lab-ink hover:bg-gray-50 flex items-center gap-1.5 text-sm"
        >
          <RefreshCw size={16} /> 重新校验
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="bg-white border border-lab-line rounded-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">界面摘要（当前显示）</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">整体状态</span>
              <span className="font-medium">{uiSummary.batchStatus}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">结果分级</span>
              <span className={`font-medium ${
                uiSummary.overallGrade === '通过' ? 'text-lab-green' :
                uiSummary.overallGrade === '建议复测' ? 'text-lab-amber' :
                uiSummary.overallGrade === '必须复核' ? 'text-lab-red' : ''
              }`}>
                {uiSummary.overallGrade}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">待复核项</span>
              <span className="font-mono">{uiSummary.pendingReviewCount}</span>
            </div>
          </div>
        </div>

        <div className={`bg-white border rounded-sm p-4 ${hasErrors ? 'border-lab-red' : hasWarnings ? 'border-lab-amber' : 'border-lab-green'}`}>
          <p className="text-xs font-medium text-gray-500 mb-2">导出预览（待写入文件）</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">最终结论</span>
              <span className="font-medium text-right max-w-[60%]">{uiSummary.finalConclusion}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">通过/复测/复核</span>
              <span className="font-mono">
                <span className="text-lab-green">{uiSummary.passCount}</span>
                {' / '}
                <span className="text-lab-amber">{uiSummary.retestCount}</span>
                {' / '}
                <span className="text-lab-red">{uiSummary.reviewCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="grade-pass p-4 rounded-sm flex items-center gap-3">
          <CheckCircle2 size={22} className="text-lab-green shrink-0" />
          <div>
            <p className="font-medium text-lab-green">一致性校验通过</p>
            <p className="text-sm text-gray-600 mt-0.5">界面摘要与导出内容完全一致，可以安全导出</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => {
            const Icon = issue.severity === 'error' ? AlertCircle : AlertTriangle;
            const cls = issue.severity === 'error' ? 'grade-review' : 'grade-retest';
            return (
              <div key={i} className={`${cls} p-4 rounded-sm`}>
                <div className="flex items-start gap-3">
                  <Icon size={20} className={issue.severity === 'error' ? 'text-lab-red' : 'text-lab-amber shrink-0'} />
                  <div className="flex-1">
                    <p className="font-medium">{issue.field}：{issue.description}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">界面值</p>
                        <p className="font-mono bg-white/60 px-2 py-1 rounded-sm">{issue.uiValue || '(空)'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">导出值</p>
                        <p className="font-mono bg-white/60 px-2 py-1 rounded-sm">{issue.exportValue || '(空)'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onExport && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={onExport}
            disabled={!canExport}
            className={`lab-btn text-sm ${canExport
              ? 'bg-lab-navy text-white hover:bg-lab-navyLight'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            {canExport ? '导出批次报告' : '请先解决一致性问题'}
          </button>
        </div>
      )}
    </div>
  );
}
