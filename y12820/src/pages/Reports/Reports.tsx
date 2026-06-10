import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  FlaskConical,
  ShieldCheck,
  BarChart3,
  Layers,
  BookOpen,
} from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import { useQCStore } from '@/store/qcStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { useUIStore } from '@/store/uiStore';
import { Report, SampleStatus, StudentSampleView } from '@/types';
import StudentStatusCard from '@/components/common/StudentStatusCard';
import TraceChain from '@/components/common/TraceChain';
import { cn } from '@/lib/utils';

const mockReports: Report[] = [
  { id: 'R001', title: '2024年6月叶绿素荧光实验报告', type: 'standard', includedSampleIds: ['S001', 'S002', 'S003', 'S004'], analysisId: 'A001', status: 'ready', format: 'html', createdAt: new Date(Date.now() - 86400000), createdBy: '张检验师', generatedAt: new Date(Date.now() - 86000000) },
  { id: 'R002', title: '学生实验报告-光照胁迫组', type: 'student', includedSampleIds: ['S001', 'S002', 'S003'], status: 'ready', format: 'html', createdAt: new Date(Date.now() - 172800000), createdBy: '张检验师', generatedAt: new Date(Date.now() - 172000000) },
  { id: 'R003', title: '干旱胁迫差异分析报告', type: 'standard', includedSampleIds: ['S005', 'S006', 'S007', 'S008'], status: 'generating', format: 'pdf', createdAt: new Date(Date.now() - 3600000), createdBy: '李检验师' },
];

export default function Reports() {
  const { samples, currentUser } = useSampleStore();
  const { getQualityStats, getTraceChain } = useQCStore();
  const { getSignificantResults, analyses } = useAnalysisStore();
  const { showNotification, currentView, setCurrentView } = useUIStore();

  const [reports, setReports] = useState<Report[]>(mockReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(mockReports[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReportType, setNewReportType] = useState<'standard' | 'student'>('standard');

  const qualityStats = getQualityStats();

  const studentViews = useMemo((): StudentSampleView[] => {
    if (!selectedReport) return [];
    return selectedReport.includedSampleIds
      .map((id) => samples.find((s) => s.id === id))
      .filter(Boolean)
      .map((sample) => {
        const canUse = sample!.status === SampleStatus.AVAILABLE;
        const needsReview = sample!.status === SampleStatus.REVIEWING;
        return {
          sample: sample!,
          statusInfo: {
            icon: canUse ? 'check' : needsReview ? 'clock' : 'alert',
            color: canUse ? 'green' : needsReview ? 'yellow' : 'red',
            title: canUse ? '数据可用' : needsReview ? '待审核' : '数据无效',
            description: canUse ? '数据质量良好，可直接分析' : needsReview ? '存在备注冲突，需审核确认' : '数据质量不合格',
          },
          canUseDirectly: canUse,
          needsReview,
          reviewNotes: needsReview ? ['病理备注存在冲突'] : [],
          learningPath: canUse
            ? [{ id: '1', title: '样本采集', description: '了解采集流程', status: 'completed' }, { id: '2', title: '数据分析', description: '掌握分析方法', status: 'current' }]
            : [{ id: '1', title: '核实数据', description: '确认原始数据', status: 'current' }],
        };
      });
  }, [selectedReport, samples]);

  const handleGenerateReport = () => {
    const newReport: Report = {
      id: `R${String(reports.length + 1).padStart(3, '0')}`,
      title: `${new Date().toLocaleDateString('zh-CN')} ${newReportType === 'standard' ? '标准' : '学生'}报告`,
      type: newReportType,
      includedSampleIds: samples.slice(0, 6).map((s) => s.id),
      status: 'generating',
      format: 'html',
      createdAt: new Date(),
      createdBy: currentUser,
    };
    setReports([newReport, ...reports]);
    setShowCreateModal(false);
    showNotification('info', '报告生成中...');
    setTimeout(() => {
      setReports((prev) => prev.map((r) => r.id === newReport.id ? { ...r, status: 'ready', generatedAt: new Date() } : r));
      showNotification('success', '报告生成成功');
    }, 2000);
  };

  const handleExport = (format: 'pdf' | 'html') => {
    showNotification('success', `正在导出 ${format.toUpperCase()} 格式...`);
  };

  const getStatusIcon = (status: string) => {
    if (status === 'ready') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'generating') return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'ready') return { text: '已完成', class: 'bg-green-100 text-green-700' };
    if (status === 'generating') return { text: '生成中', class: 'bg-yellow-100 text-yellow-700' };
    return { text: '失败', class: 'bg-red-100 text-red-700' };
  };

  const selectedAnalysis = selectedReport?.analysisId ? analyses.find((a) => a.id === selectedReport.analysisId) : null;
  const significantResults = selectedAnalysis ? getSignificantResults(selectedAnalysis.id) : [];
  const traceChain = selectedReport?.includedSampleIds[0] ? getTraceChain(selectedReport.includedSampleIds[0]) : [];
  const upCount = significantResults.filter((r) => r.regulation === 'up').length;
  const downCount = significantResults.filter((r) => r.regulation === 'down').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报告中心</h1>
          <p className="mt-1 text-sm text-gray-500">生成和管理实验分析报告</p>
        </div>
        <div className="flex gap-3">
          <div className="flex rounded-lg border border-gray-200 p-1">
            <button onClick={() => setCurrentView('standard')} className={cn('px-3 py-1.5 text-sm font-medium rounded-md', currentView === 'standard' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>标准视图</button>
            <button onClick={() => setCurrentView('student')} className={cn('px-3 py-1.5 text-sm font-medium rounded-md', currentView === 'student' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>学生视图</button>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />生成新报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><FileText className="h-5 w-5 text-gray-600" /><h2 className="text-lg font-semibold text-gray-900">报告列表</h2></div>
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} onClick={() => setSelectedReport(report)} className={cn('rounded-lg border p-4 cursor-pointer', selectedReport?.id === report.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50')}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {report.type === 'standard' ? <BookOpen className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-purple-500" />}
                      <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{report.includedSampleIds.length}个样本 · {report.createdBy}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(report.createdAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                  <div className="ml-3">{getStatusIcon(report.status)}</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusLabel(report.status).class)}>{getStatusLabel(report.status).text}</span>
                  <span className="text-xs text-gray-400">{report.type === 'standard' ? '标准' : '学生'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedReport && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-gray-600" /><h2 className="text-lg font-semibold text-gray-900">报告预览</h2><span className="text-sm text-gray-500">- {selectedReport.title}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => handleExport('html')} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"><Download className="h-4 w-4" />HTML</button>
                  <button onClick={() => handleExport('pdf')} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"><Download className="h-4 w-4" />PDF</button>
                </div>
              </div>

              {currentView === 'student' ? (
                <div className="grid grid-cols-1 gap-4">{studentViews.map((view) => <StudentStatusCard key={view.sample.id} view={view} />)}</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-lg border p-4 text-center"><FlaskConical className="mx-auto h-6 w-6 text-blue-500 mb-2" /><p className="text-2xl font-bold text-gray-900">{selectedReport.includedSampleIds.length}</p><p className="text-xs text-gray-500">样本总数</p></div>
                    <div className="rounded-lg border p-4 text-center"><ShieldCheck className="mx-auto h-6 w-6 text-green-500 mb-2" /><p className="text-2xl font-bold text-green-600">{qualityStats.passed}</p><p className="text-xs text-gray-500">质控通过</p></div>
                    <div className="rounded-lg border p-4 text-center"><BarChart3 className="mx-auto h-6 w-6 text-purple-500 mb-2" /><p className="text-2xl font-bold text-purple-600">{significantResults.length}</p><p className="text-xs text-gray-500">显著差异</p></div>
                    <div className="rounded-lg border p-4 text-center"><Layers className="mx-auto h-6 w-6 text-orange-500 mb-2" /><p className="text-2xl font-bold text-orange-600">{qualityStats.avgScore.toFixed(1)}</p><p className="text-xs text-gray-500">平均质控分</p></div>
                  </div>

                  <div><h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4" />差异分析摘要</h3>
                    <div className="rounded-lg border p-4"><p className="text-sm text-gray-600">{selectedAnalysis ? `${selectedAnalysis.name}：发现${significantResults.length}个显著差异，上调${upCount}个，下调${downCount}个` : '暂无差异分析结果'}</p></div>
                  </div>

                  <div><h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Layers className="h-4 w-4" />溯源链示例</h3>
                    {traceChain.length > 0 ? <TraceChain nodes={traceChain} /> : <p className="text-sm text-gray-500">暂无追溯数据</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-white p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">生成新报告</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">报告类型</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setNewReportType('standard')} className={cn('rounded-lg border p-4 text-center', newReportType === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50')}>
                  <BookOpen className="mx-auto h-6 w-6 text-blue-500 mb-2" /><p className="text-sm font-medium text-gray-900">标准视图</p><p className="text-xs text-gray-500">完整数据分析</p>
                </button>
                <button onClick={() => setNewReportType('student')} className={cn('rounded-lg border p-4 text-center', newReportType === 'student' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50')}>
                  <User className="mx-auto h-6 w-6 text-purple-500 mb-2" /><p className="text-sm font-medium text-gray-900">学生视图</p><p className="text-xs text-gray-500">学习友好格式</p>
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={handleGenerateReport} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">生成报告</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
