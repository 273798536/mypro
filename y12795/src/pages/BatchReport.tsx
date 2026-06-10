import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { useBatchStore } from '@/store/batchStore';
import { BatchTimeline } from '@/components/BatchTimeline';
import { ConsistencyPanel } from '@/components/ConsistencyPanel';
import { SourceBadge } from '@/components/SourceBadge';
import { buildSummary, checkConsistency } from '@/utils/consistency';
import { exportToExcel, exportToPDF, type ExportData } from '@/utils/export';

export function BatchReport() {
  const navigate = useNavigate();
  const { batch, weighingRows, experimentRecords, reactionTimes } = useExperimentStore();
  const { reviewItems, calculationResults, timeline, addTimelineEvent } = useBatchStore();

  const uiSummary = useMemo(() => buildSummary(reviewItems, calculationResults), [reviewItems, calculationResults]);
  const issues = useMemo(() => checkConsistency(uiSummary, uiSummary), [uiSummary]);
  const canExport = issues.filter((i) => i.severity === 'error').length === 0;

  const prepareExportData = (): ExportData => ({
    batch,
    weighingRows,
    experimentRecords,
    reactionTimes,
    reviewItems,
    calculationResults,
    timeline,
    summary: {
      totalSamples: weighingRows.length,
      passCount: uiSummary.passCount,
      retestCount: uiSummary.retestCount,
      reviewCount: uiSummary.reviewCount,
      finalConclusion: uiSummary.finalConclusion,
    },
  });

  const handleExportExcel = () => {
    if (!canExport) return;
    exportToExcel(prepareExportData());
    addTimelineEvent({
      batchId: batch.id, type: '导出',
      description: '导出Excel格式批次报告',
      operator: batch.operator || '当前用户',
      timestamp: new Date().toLocaleString('zh-CN'),
      sourceRef: `报告：${batch.name}`,
    });
  };

  const handleExportPDF = async () => {
    if (!canExport) return;
    await exportToPDF(prepareExportData());
    addTimelineEvent({
      batchId: batch.id, type: '导出',
      description: '导出PDF格式批次报告',
      operator: batch.operator || '当前用户',
      timestamp: new Date().toLocaleString('zh-CN'),
      sourceRef: `报告：${batch.name}`,
    });
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b border-lab-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-sm">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-serif text-xl font-semibold text-lab-navy">批次报告</h1>
              <p className="text-xs text-gray-500">时间线追踪 · 摘要一致性校验 · 导出</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              disabled={!canExport}
              className={`lab-btn flex items-center gap-1.5 text-sm ${canExport ? 'bg-lab-green text-white hover:bg-lab-greenLight' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              <FileSpreadsheet size={16} /> 导出Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!canExport}
              className={`lab-btn flex items-center gap-1.5 text-sm ${canExport ? 'bg-lab-navy text-white hover:bg-lab-navyLight' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              <FileText size={16} /> 导出PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="lab-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-lab-navy">{batch.name || '未命名批次'}</h2>
              <p className="text-sm text-gray-500 mt-1">操作员：{batch.operator || '未填写'} · 创建于 {batch.createdAt}</p>
              {batch.sourceNote && (
                <p className="text-sm mt-2"><SourceBadge remark={batch.sourceNote} /></p>
              )}
            </div>
            <div className={`px-4 py-2 rounded-sm text-white font-medium ${
              uiSummary.batchStatus === '已完成' ? 'bg-lab-green' :
              uiSummary.batchStatus === '待复核' ? 'bg-lab-amber' : 'bg-lab-navy'
            }`}>
              {uiSummary.batchStatus}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-lab-line">
            <div>
              <p className="text-xs text-gray-500">称量单数据</p>
              <p className="font-mono text-2xl font-semibold text-lab-navy">{weighingRows.length}<span className="text-sm font-normal text-gray-500 ml-1">行</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">实验记录</p>
              <p className="font-mono text-2xl font-semibold text-lab-navy">{experimentRecords.length}<span className="text-sm font-normal text-gray-500 ml-1">组</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">计算结果</p>
              <p className="font-mono text-2xl font-semibold text-lab-navy">{calculationResults.length}<span className="text-sm font-normal text-gray-500 ml-1">项</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500">最终结论</p>
              <p className={`text-sm font-medium ${
                uiSummary.overallGrade === '通过' ? 'text-lab-green' :
                uiSummary.overallGrade === '建议复测' ? 'text-lab-amber' :
                uiSummary.overallGrade === '必须复核' ? 'text-lab-red' : 'text-gray-500'
              }`}>{uiSummary.finalConclusion}</p>
            </div>
          </div>
        </div>

        {calculationResults.length > 0 && (
          <div className="lab-card p-5">
            <h3 className="font-serif text-lg font-semibold text-lab-navy mb-4">计算结果汇总</h3>
            <div className="overflow-x-auto">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>计算类型</th>
                    <th>数值</th>
                    <th>单位</th>
                    <th>使用公式</th>
                    <th>适用范围</th>
                    <th>结果分级</th>
                    <th>建议</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationResults.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.type}</td>
                      <td className="font-mono">{r.value}</td>
                      <td className="font-mono">{r.unit}</td>
                      <td className="font-mono text-xs">{r.formula}</td>
                      <td className="text-xs text-gray-600">{r.scope}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-sm text-xs font-medium text-white ${
                          r.grade === '通过' ? 'bg-lab-green' :
                          r.grade === '建议复测' ? 'bg-lab-amber' : 'bg-lab-red'
                        }`}>{r.grade}</span>
                      </td>
                      <td className="text-sm text-gray-700">{r.suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BatchTimeline events={timeline} />
          <ConsistencyPanel
            uiSummary={uiSummary}
            issues={issues}
            onRefresh={() => {}}
            canExport={canExport}
          />
        </div>

        {reviewItems.length > 0 && (
          <div className="lab-card p-5">
            <h3 className="font-serif text-lg font-semibold text-lab-navy mb-4">复核记录详情（含溯源信息）</h3>
            <div className="overflow-x-auto">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>类别</th>
                    <th>检查项</th>
                    <th>状态</th>
                    <th>错误码</th>
                    <th>来源引用</th>
                    <th>复核人</th>
                    <th>复核时间</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewItems.map((r) => (
                    <tr key={r.id}>
                      <td>{r.category}</td>
                      <td>{r.itemName}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-sm text-xs font-medium ${
                          r.status === '已通过' ? 'bg-green-100 text-lab-green' :
                          r.status === '需复测' ? 'bg-red-100 text-lab-red' : 'bg-amber-100 text-lab-amber'
                        }`}>{r.status}</span>
                      </td>
                      <td className="font-mono text-xs">{r.errorCode || '-'}</td>
                      <td className="text-xs"><SourceBadge remark={r.sourceRef} /></td>
                      <td>{r.reviewer || '-'}</td>
                      <td className="text-xs text-gray-500">{r.reviewedAt || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button onClick={() => navigate('/review')} className="lab-btn bg-white border border-lab-line text-lab-ink hover:bg-gray-50">
            返回复核工作台
          </button>
          <div className="flex gap-2">
            <button onClick={handleExportExcel} disabled={!canExport} className={`lab-btn flex items-center gap-1.5 ${canExport ? 'bg-lab-green text-white hover:bg-lab-greenLight' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
              <Download size={16} /> 下载Excel
            </button>
            <button onClick={handleExportPDF} disabled={!canExport} className={`lab-btn flex items-center gap-1.5 ${canExport ? 'bg-lab-navy text-white hover:bg-lab-navyLight' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
              <Download size={16} /> 下载PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
