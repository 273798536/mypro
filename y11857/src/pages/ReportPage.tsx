import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, CheckCircle, XCircle, AlertTriangle, User, File, Calendar } from 'lucide-react';
import { useAppStore } from '../store';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const {
    stationName,
    floors,
    issues,
    getBlockedEscalatorCount,
    validationReport
  } = useAppStore();

  const totalEscalators = floors.reduce((sum, f) => sum + f.escalators.length, 0);
  const blockedCount = getBlockedEscalatorCount();
  const escalatorIssues = issues.filter(i => i.type === 'escalator_capacity');
  const unresolvedIssues = issues.filter(i => i.status !== 'resolved');

  const dataIntegrityScore = validationReport
    ? Math.max(0, 100 - validationReport.missingFields.length * 15 - validationReport.warnings.length * 5)
    : 100;

  const exportToPDF = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: '#0F2B5B',
      scale: 2
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${stationName || 'station'}-analysis-report.pdf`);
  };

  const exportToJSON = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      stationName,
      coreConclusion: {
        escalatorCapacityBlocked: blockedCount > 0,
        blockedCount,
        totalEscalators,
        dataIntegrityScore
      },
      issues,
      parameterSnapshot: {
        escalatorCapacities: Object.fromEntries(
          floors.flatMap(f => f.escalators.map(e => [e.id, e.capacity]))
        ),
        gateRates: Object.fromEntries(
          floors.flatMap(f => f.gates.map(g => [g.id, g.passRate]))
        ),
        activeBarriers: floors.flatMap(f => f.barriers.filter(b => b.active).map(b => b.id))
      },
      recommendations: generateRecommendations()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stationName || 'station'}-analysis-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateRecommendations = (): string[] => {
    const recs: string[] = [];
    
    if (blockedCount > 0) {
      recs.push(`优先处理 ${blockedCount} 个扶梯容量越界问题，确保数据准确性`);
    }
    
    const overloadedEscalators = floors.flatMap(f => 
      f.escalators.filter(e => e.status === 'error').map(e => e.name)
    );
    if (overloadedEscalators.length > 0) {
      recs.push(`以下扶梯处于过载状态，建议优化: ${overloadedEscalators.join(', ')}`);
    }

    const inactiveBarriers = floors.flatMap(f => 
      f.barriers.filter(b => !b.active).map(b => b.name)
    );
    if (inactiveBarriers.length > 0) {
      recs.push(`围挡 ${inactiveBarriers.join(', ')} 未生效，请注意客流回流风险`);
    }

    if (validationReport?.missingFields.length) {
      recs.push(`建议补充 ${validationReport.missingFields.length} 个缺失字段以提高分析精度`);
    }

    if (recs.length === 0) {
      recs.push('当前数据状态良好，可继续监控运行');
    }

    return recs;
  };

  const recommendations = generateRecommendations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 grid-bg">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/analyzer')}
              className="flex items-center gap-2 px-3 py-2 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回分析
            </button>
            <div className="h-6 w-px bg-blue-500/30" />
            <h1 className="text-2xl font-display font-bold text-white">分析报告</h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportToJSON}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/30"
            >
              <Download className="w-4 h-4" />
              导出 PDF
            </button>
          </div>
        </div>

        <div ref={reportRef} className="max-w-4xl mx-auto">
          <div className="glass-panel rounded-2xl p-8 mb-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">
                  {stationName || '未命名站点'}
                </h2>
                <p className="text-blue-200/60">换乘客流分析报告</p>
              </div>
              <div className="flex items-center gap-2 text-blue-300">
                <Calendar className="w-5 h-5" />
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                {blockedCount > 0 ? (
                  <XCircle className="w-6 h-6 text-red-400" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
                核心结论
              </h3>
              <div className="text-center py-4">
                <p className="text-5xl font-display font-bold mb-2">
                  <span className={blockedCount > 0 ? 'text-red-400' : 'text-green-400'}>
                    {blockedCount}
                  </span>
                  <span className="text-2xl text-blue-200/60 mx-3">/</span>
                  <span className="text-3xl text-white">{totalEscalators}</span>
                </p>
                <p className="text-xl text-blue-200/80">
                  扶梯容量错误
                  <span className={blockedCount > 0 ? 'text-red-400' : 'text-green-400'}>
                    {blockedCount > 0 ? ' 已被拦截' : ' 全部正常'}
                  </span>
                </p>
                {blockedCount > 0 && (
                  <p className="text-sm text-red-300 mt-2">
                    异常数据未纳入正常计算队列
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-display font-bold text-white">{totalEscalators}</p>
                <p className="text-sm text-blue-200/60">扶梯总数</p>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-display font-bold text-yellow-400">{unresolvedIssues.length}</p>
                <p className="text-sm text-blue-200/60">待处理问题</p>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                <p className={`text-3xl font-display font-bold ${dataIntegrityScore >= 80 ? 'text-green-400' : dataIntegrityScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {dataIntegrityScore}%
                </p>
                <p className="text-sm text-blue-200/60">数据完整性</p>
              </div>
            </div>
          </div>

          {escalatorIssues.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 mb-6">
              <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                扶梯容量问题明细
              </h3>
              <div className="space-y-3">
                {escalatorIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{issue.title}</p>
                        <p className="text-sm text-blue-200/60 mt-1">{issue.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-blue-300">
                            <User className="w-3 h-3" />
                            {issue.responsiblePerson}
                          </span>
                          <span className="flex items-center gap-1 text-blue-300">
                            <File className="w-3 h-3" />
                            {issue.documentPath}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        issue.status === 'resolved' ? 'bg-green-500/30 text-green-300' :
                        issue.status === 'in_progress' ? 'bg-yellow-500/30 text-yellow-300' :
                        'bg-red-500/30 text-red-300'
                      }`}>
                        {issue.status === 'resolved' ? '已解决' : issue.status === 'in_progress' ? '处理中' : '待处理'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-panel rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              改进建议
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-sm font-medium shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-blue-200/80">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-blue-200/40 text-sm">
            <p>本报告由轨道交通换乘客流分析系统自动生成</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
