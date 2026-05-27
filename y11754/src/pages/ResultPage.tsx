import { useMemo, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ScoreOverview } from '@/components/report/ScoreOverview';
import { ErrorList } from '@/components/report/ErrorList';
import { generateReportData, downloadReport } from '@/utils/export';
import { Home, RotateCcw, Download, FileJson, FileText, FileSpreadsheet } from 'lucide-react';
import type { ReportData } from '../types';

interface ResultPageProps {
  onNavigate: (page: 'start' | 'history') => void;
}

export function ResultPage({ onNavigate }: ResultPageProps) {
  const { gameHistory, resetGame, status, updateErrorStatus } = useGameStore();
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'md' | null>(null);

  const latestRecord = useMemo(() => {
    if (gameHistory.length === 0) return null;
    return gameHistory[gameHistory.length - 1];
  }, [gameHistory]);

  const report: ReportData | null = useMemo(() => {
    if (!latestRecord) return null;
    return generateReportData(latestRecord);
  }, [latestRecord]);

  const handleRestart = () => {
    resetGame();
    onNavigate('start');
  };

  const handleExport = (format: 'json' | 'csv' | 'md') => {
    if (!report) return;
    downloadReport(report, format);
    setExportFormat(null);
  };

  const isWin = status === 'allComplete';

  if (!report || !latestRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-400 mb-4">暂无游戏记录</p>
            <Button onClick={handleRestart}>
              <Home className="w-5 h-5 mr-2" />
              返回主页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {isWin ? (
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                🎉 恭喜通关！
              </span>
            ) : (
              <span className="text-white">游戏结束</span>
            )}
          </h1>
          <p className="text-slate-400">
            {isWin
              ? '你成功征服了所有函数曲线！'
              : '生命值耗尽，再接再厉！'}
          </p>
        </div>

        <ScoreOverview report={report} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ErrorList
              errors={latestRecord.errors}
              onUpdateStatus={updateErrorStatus}
            />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleRestart}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  重新开始
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => onNavigate('start')}
                >
                  <Home className="w-5 h-5 mr-2" />
                  返回主页
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => onNavigate('history')}
                >
                  查看历史记录
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">导出报告</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {exportFormat === null ? (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => setExportFormat('json')}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    导出报告
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() => handleExport('json')}
                    >
                      <FileJson className="w-5 h-5 mr-2" />
                      JSON 格式
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() => handleExport('csv')}
                    >
                      <FileSpreadsheet className="w-5 h-5 mr-2" />
                      CSV 格式
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() => handleExport('md')}
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Markdown 格式
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setExportFormat(null)}
                    >
                      取消
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">错误分类统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">未处理</span>
                  <span className="text-red-400 font-bold">
                    {report.errorsByStatus.unprocessed.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">需人工确认</span>
                  <span className="text-yellow-400 font-bold">
                    {report.errorsByStatus.needsManualReview.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">已修正</span>
                  <span className="text-green-400 font-bold">
                    {report.errorsByStatus.corrected.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
