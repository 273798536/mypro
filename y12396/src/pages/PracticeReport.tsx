import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileJson, FileText, Printer, ArrowLeft } from 'lucide-react';
import { usePracticeStore } from '@/store/practiceStore';
import type { PracticeReport } from '@/lib/api';

export default function PracticeReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPractice, loading, fetchPracticeDetail, generateReport } = usePracticeStore();
  const [report, setReport] = useState<PracticeReport | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadDetail = useCallback(() => {
    if (id) fetchPracticeDetail(id);
  }, [id, fetchPracticeDetail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const result = await generateReport(id);
      setReport(result);
    } catch {
      setGenerating(false);
    }
    setGenerating(false);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportJSON = () => {
    if (!report || !currentPractice) return;
    const data = {
      report,
      practice: currentPractice.record,
      rhythmDetection: currentPractice.rhythmDetection,
      speedTier: currentPractice.speedTier,
      conflicts: currentPractice.conflicts,
      corrections: currentPractice.corrections,
      evidenceMapping: currentPractice.evidenceMapping,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practice-report-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !currentPractice) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentPractice) {
    return <div className="text-center py-20 text-text-muted">未找到练习记录</div>;
  }

  const { record, rhythmDetection, speedTier, conflicts, corrections, evidenceMapping } = currentPractice;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <button onClick={() => navigate(`/practices/${id}`)} className="hover:text-text-primary transition-colors">
          练习详情
        </button>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary">练习报告</span>
      </div>

      {!report && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-30" />
            <p className="text-text-secondary mb-4">尚未生成报告</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-amber-primary text-dark-primary hover:bg-amber-hover shadow-lg shadow-amber-primary/20 transition-all disabled:opacity-50"
            >
              {generating ? '生成中...' : '生成报告'}
            </button>
          </div>
        </div>
      )}

      {report && (
        <>
          <div className="print:hidden flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(`/practices/${id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-dark-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回详情
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-primary text-dark-primary hover:bg-amber-hover shadow-lg shadow-amber-primary/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              导出PDF
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-dark-tertiary text-text-secondary hover:text-text-primary hover:bg-dark-border transition-colors"
            >
              <FileJson className="w-4 h-4" />
              导出JSON
            </button>
          </div>

          <div className="max-w-3xl mx-auto bg-[#fafafa] text-gray-900 rounded-xl shadow-2xl print:shadow-none print:rounded-none p-8 print:p-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">鼓手练习速度阶梯报告</h1>
              <p className="text-sm text-gray-500">生成时间: {new Date(report.generatedAt).toLocaleString('zh-CN')}</p>
            </div>

            <section className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">练习信息</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">学生姓名:</span> <span className="font-medium">{record.studentName}</span></div>
                <div><span className="text-gray-500">练习日期:</span> <span className="font-medium">{record.practiceDate}</span></div>
                <div><span className="text-gray-500">音频文件:</span> <span className="font-medium">{record.audioFileName}</span></div>
                <div><span className="text-gray-500">状态:</span> <span className="font-medium">{record.status}</span></div>
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">节奏检测结果</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">检测BPM:</span> <span className="font-medium">{rhythmDetection?.detectedBPM ?? '-'}</span></div>
                <div><span className="text-gray-500">置信度:</span> <span className="font-medium">{rhythmDetection ? (rhythmDetection.confidenceScore * 100).toFixed(1) : '-'}%</span></div>
                <div><span className="text-gray-500">检测方法:</span> <span className="font-medium">{rhythmDetection?.detectionMethod ?? '-'}</span></div>
                <div><span className="text-gray-500">检测时间:</span> <span className="font-medium">{rhythmDetection?.detectedAt ?? '-'}</span></div>
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">速度分层</h2>
              <div className="space-y-2">
                {(speedTier?.tiers || []).map((tier) => (
                  <div key={tier.tierIndex} className="flex items-center justify-between text-sm bg-gray-100 rounded-lg p-3">
                    <span className="font-medium">{tier.label}</span>
                    <span className="text-amber-700">{tier.bpmRange[0]}-{tier.bpmRange[1]} BPM</span>
                    <span className="text-gray-500 text-xs">{tier.startTime} - {tier.endTime}</span>
                  </div>
                ))}
              </div>
            </section>

            {conflicts.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">冲突记录</h2>
                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <div key={conflict.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-red-800">{conflict.conflictType}</span>
                        <span className="text-xs text-red-500">{conflict.severity}</span>
                      </div>
                      <p className="text-sm text-gray-700">{conflict.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {corrections.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">修正记录</h2>
                <div className="space-y-2">
                  {corrections.map((correction) => (
                    <div key={correction.id} className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-green-800">{correction.field}</span>
                        <span className="text-xs text-gray-500">{correction.operator}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="line-through text-red-500">{correction.oldValue}</span>
                        {' → '}
                        <span className="text-green-700 font-medium">{correction.newValue}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">原因: {correction.reason}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-800 mb-2">口径说明</h3>
                <p className="text-sm text-gray-700">{report.methodologyNote || speedTier?.methodology || '暂无'}</p>
              </div>
            </section>

            {evidenceMapping.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">证据对应关系</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-2 font-medium">音频片段</th>
                        <th className="text-left p-2 font-medium">BPM区间</th>
                        <th className="text-left p-2 font-medium">报告条目</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceMapping.map((em) => (
                        <tr key={em.id} className="border-t border-gray-200">
                          <td className="p-2">
                            <div className="font-medium">{em.audioSegment.label}</div>
                            <div className="text-xs text-gray-500">{em.audioSegment.startTime}s - {em.audioSegment.endTime}s</div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium">Tier {em.bpmTier.tierIndex}</div>
                            <div className="text-xs text-gray-500">{em.bpmTier.bpmRange[0]}-{em.bpmTier.bpmRange[1]} BPM</div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{em.reportEntry.section}</div>
                            <div className="text-xs text-gray-500">{em.reportEntry.content}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
