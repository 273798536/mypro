import React from 'react';
import { Trophy, DollarSign, Target, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { GameState } from '@/types/game';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { calculateFinalScore } from '@/utils/storage';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  game: GameState;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ game }) => {
  const score = calculateFinalScore(game);

  const totalProfit = game.history.reduce((sum, h) => sum + h.netProfit, 0);
  const avgProfit = totalProfit / Math.max(1, game.history.length);

  const warningCount = game.history.reduce(
    (sum, h) => sum + h.events.filter(e => e.severity === 'warning').length,
    0
  );
  const errorCount = game.history.reduce(
    (sum, h) => sum + h.events.filter(e => e.severity === 'error').length,
    0
  );

  const bestRound = [...game.history].sort((a, b) => b.netProfit - a.netProfit)[0];
  const worstRound = [...game.history].sort((a, b) => a.netProfit - b.netProfit)[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className={cn(
        game.status === 'bankrupt' ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-3 rounded-lg',
              game.status === 'bankrupt' ? 'bg-red-100' : 'bg-emerald-100'
            )}>
              <Trophy className={cn(
                'w-6 h-6',
                game.status === 'bankrupt' ? 'text-red-600' : 'text-emerald-600'
              )} />
            </div>
            <div>
              <p className="text-sm text-slate-600">
                {game.status === 'bankrupt' ? '经营状态' : '最终得分'}
              </p>
              <p className={cn(
                'text-2xl font-bold',
                game.status === 'bankrupt' ? 'text-red-600' : 'text-emerald-600'
              )}>
                {game.status === 'bankrupt' ? '破产' : `${score} 分`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">最终现金</p>
              <p className="text-2xl font-bold text-blue-600">
                ¥{game.cash.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-100">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">累计净利润</p>
              <p className={cn(
                'text-2xl font-bold',
                totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {totalProfit >= 0 ? '+' : ''}¥{totalProfit.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-100">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">经营回合</p>
              <p className="text-2xl font-bold text-purple-600">{game.round} / {game.maxRounds}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            经营摘要
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">平均每回合利润</span>
              <span className={cn(
                'font-semibold',
                avgProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {avgProfit >= 0 ? '+' : ''}¥{avgProfit.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">最佳回合</span>
              <span className="font-semibold text-emerald-600">
                第{bestRound?.round}回合 (+¥{bestRound?.netProfit.toLocaleString('zh-CN', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">最差回合</span>
              <span className="font-semibold text-red-600">
                第{worstRound?.round}回合 (¥{worstRound?.netProfit.toLocaleString('zh-CN', { maximumFractionDigits: 0 })})
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">期末库存</span>
              <span className="font-semibold text-amber-600">{game.inventory} 件</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            风险事件统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-amber-800">警告事件</span>
              <span className="text-2xl font-bold text-amber-600">{warningCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-red-800">严重错误</span>
              <span className="text-2xl font-bold text-red-600">{errorCount}</span>
            </div>
          </div>
          {game.endReason && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>结束原因：</strong>{game.endReason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
