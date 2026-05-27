import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';
import { SummaryCard } from '@/components/report/SummaryCard';
import { ProfitChart } from '@/components/report/ProfitChart';
import { Timeline } from '@/components/report/Timeline';
import { getGameDetail } from '@/utils/storage';
import { exportGameToCSV, downloadCSV, generateFilename } from '@/utils/export';
import { GameState } from '@/types/game';

export const HistoryDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const data = getGameDetail(id);
      setGame(data);
    }
    setLoading(false);
  }, [id]);

  const handleExport = () => {
    if (game) {
      const csv = exportGameToCSV(game);
      const filename = generateFilename(game);
      downloadCSV(csv, filename);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">加载中...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="text-center py-16">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <p className="text-slate-600 mb-2">记录不存在</p>
              <p className="text-sm text-slate-400">该游戏记录可能已被删除</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-xl font-bold text-slate-900">历史记录详情</h1>
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
