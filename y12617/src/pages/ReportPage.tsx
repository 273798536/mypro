import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatsOverview, AnomalyTimeline, ExplanationCard, TraceFlow } from '../components/Report';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { useLevelStore, useAnnotationStore, usePhysicsStore } from '../store';
import { ReportGenerator } from '../services/ReportGenerator';
import { ExportService } from '../services/ExportService';
import { ArrowLeft, Download, FileJson, Printer, FileText, Share2 } from 'lucide-react';
import type { Report, AnomalyItem } from '../types/report';

const ReportPage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { getLevelById, setCurrentLevel } = useLevelStore();
  const { annotations, loadMockAnnotations } = useAnnotationStore();
  const { collisionEvents } = usePhysicsStore();

  const level = getLevelById(levelId || '');
  const reportGenerator = useMemo(() => new ReportGenerator(), []);
  const exportService = useMemo(() => new ExportService(), []);

  useEffect(() => {
    if (levelId) {
      setCurrentLevel(levelId);
      generateReport();
    }
  }, [levelId]);

  const generateReport = () => {
    if (!level) return;

    setIsGenerating(true);

    setTimeout(() => {
      const levelAnnotations = annotations.filter(a => a.levelId === levelId);

      let finalAnnotations = levelAnnotations;
      if (finalAnnotations.length === 0) {
        loadMockAnnotations(level.id);
        finalAnnotations = useAnnotationStore.getState().annotations.filter(a => a.levelId === levelId);
      }

      const generatedReport = reportGenerator.generate(level, finalAnnotations, collisionEvents);
      setReport(generatedReport);

      if (generatedReport.anomalies.length > 0) {
        setSelectedAnomaly(generatedReport.anomalies[0]);
      }

      setIsGenerating(false);
    }, 500);
  };

  const handleExportHTML = () => {
    if (report) {
      exportService.downloadHTML(report);
    }
  };

  const handleExportJSON = () => {
    if (report) {
      exportService.downloadJSON(report);
    }
  };

  const handlePrint = () => {
    if (report) {
      exportService.printReport(report);
    }
  };

  const handleSelectAnomaly = (anomaly: AnomalyItem) => {
    setSelectedAnomaly(anomaly);
  };

  const selectedTraceChain = useMemo(() => {
    if (!selectedAnomaly || !report) return [];
    return reportGenerator.generateTraceChain(selectedAnomaly, report.annotations);
  }, [selectedAnomaly, report]);

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">关卡不存在</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  if (isGenerating || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">正在生成报告...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                返回首页
              </Button>
              <div>
                <h1 className="font-display text-lg font-bold text-neutral-800">
                  结算报告
                </h1>
                <p className="text-xs text-neutral-500">{level.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={generateReport}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                重新生成
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                打印
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportJSON}
                className="gap-2"
              >
                <FileJson className="w-4 h-4" />
                JSON
              </Button>
              <Button
                variant="primary"
                onClick={handleExportHTML}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                导出报告
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <StatsOverview
            stats={report.stats}
            levelName={report.levelName}
            generatedAt={report.generatedAt}
          />

          <ExplanationCard explanation={report.plainTextExplanation} />

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <AnomalyTimeline
                anomalies={report.anomalies}
                onSelectAnomaly={handleSelectAnomaly}
                selectedAnomalyId={selectedAnomaly?.id}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedAnomaly ? (
                <TraceFlow
                  traceChain={selectedTraceChain}
                  title={`追溯链路 - ${selectedAnomaly.description}`}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-neutral-800">追溯链路</h3>
                        <p className="text-sm text-neutral-500">选择异常查看详细追溯</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-neutral-500">
                      <p>点击左侧异常条目查看完整追溯链路</p>
                      <p className="text-sm mt-2">从异常 → 标注草稿 → 画布快照 → 处理意见</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <h3 className="font-display font-semibold text-neutral-800">操作提示</h3>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-neutral-600">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <p>点击「导出报告」可下载完整HTML报告，发给不懂代码的同事也能直接打开查看</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <p>「普通话解释」中的内容可以直接复制粘贴到邮件或工作群中</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <p>点击左侧异常可以看到完整的追溯链路，验证数据一致性</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <h3 className="font-display font-semibold text-neutral-800">所有标注记录</h3>
              <p className="text-sm text-neutral-500">共 {report.annotations.length} 条记录</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">时间点</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">类型</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">内容</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">状态</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">创建人</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">处理记录</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.annotations.map((annotation) => (
                      <tr
                        key={annotation.id}
                        className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-neutral-600">
                          {formatTime(annotation.timePoint)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            annotation.type === 'boundary_error'
                              ? 'bg-red-100 text-red-700'
                              : annotation.type === 'collision_miss'
                              ? 'bg-orange-100 text-orange-700'
                              : annotation.type === 'missing_unit'
                              ? 'bg-yellow-100 text-yellow-700'
                              : annotation.type === 'duplicate'
                              ? 'bg-purple-100 text-purple-700'
                              : annotation.type === 'normal'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {{
                              boundary_error: '边界误判',
                              collision_miss: '碰撞漏标',
                              missing_unit: '单位缺失',
                              duplicate: '重复标注',
                              normal: '正常标注',
                              other: '其他问题',
                            }[annotation.type]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-700 max-w-xs truncate">
                          {annotation.content}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            annotation.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : annotation.status === 'pending_review'
                              ? 'bg-blue-100 text-blue-700'
                              : annotation.status === 'merged'
                              ? 'bg-neutral-100 text-neutral-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {{
                              draft: '草稿',
                              confirmed: '已确认',
                              pending_review: '待审核',
                              merged: '已合并',
                            }[annotation.status]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-600">
                          {annotation.createdBy}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-neutral-500">
                            {annotation.processNotes.length} 条
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="bg-white border-t border-neutral-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-neutral-500">
          <p>本报告由二维物理碰撞演示系统自动生成 | 报告ID：{report.id}</p>
        </div>
      </footer>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export default ReportPage;
