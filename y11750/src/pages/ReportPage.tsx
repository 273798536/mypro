import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Home } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';
import { SummaryCard } from '@/components/report/SummaryCard';
import { ProfitChart } from '@/components/report/ProfitChart';
import { Timeline } from '@/components/report/Timeline';
import { exportGameToCSV, downloadCSV, generateFilename } from '@/utils/export';
import { Card, CardContent } from '@/components/common/Card';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const game = useGameStore(state => state);

  const handleExport = () => {
    const csv = exportGameToCSV(game);
    const filename = generateFilename(game);
    downloadCSV(csv, filename);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (game.history.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-slate-600 mb-4">暂无经营数据，请先完成游戏</p>
            <Button variant="primary" onClick={handleGoHome}>
              <Home className="w-4 h-4 mr-2" />
              返回主页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-xl font-bold text-slate-900">经营报告</h1>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出CSV
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          <SummaryCard game={game} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfitChart history={game.history} />
            <Timeline history={game.history} />
          </div>
        </div>
      </div>
    </div>
  );
};
