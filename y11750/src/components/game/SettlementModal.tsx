import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle, Download, FileText } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { CashFlowItem, GameEvent } from '@/types/game';
import { exportGameToCSV, downloadCSV, generateFilename } from '@/utils/export';
import { cn } from '@/lib/utils';

export const SettlementModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    showSettlement,
    lastSettlement,
    status,
    round,
    maxRounds,
    closeSettlement,
    saveToHistory,
  } = useGameStore();

  const isGameEnded = status === 'ended' || status === 'bankrupt';

  const handleExport = () => {
    const gameState = useGameStore.getState();
    const csv = exportGameToCSV(gameState);
    const filename = generateFilename(gameState);
    downloadCSV(csv, filename);
  };

  const handleViewReport = () => {
    saveToHistory();
    navigate('/report');
  };

  if (!lastSettlement) return null;

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getCashFlowIcon = (category: string) => {
    switch (category) {
      case 'revenue':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'cost':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'fee':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'penalty':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={showSettlement}
      onClose={isGameEnded ? () => {} : closeSettlement}
      title={
        isGameEnded
          ? status === 'bankrupt'
            ? '经营失败 - 破产清算'
            : '经营周期结束'
          : `第 ${lastSettlement.round} 回合结算`
      }
      className="max-w-3xl"
    >
      <div className="p-6 space-y-6">
        {status === 'bankrupt' && lastSettlement.events.some(e => e.type === 'cash_shortage') && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <h4 className="font-bold text-red-900">公司破产</h4>
                <p className="text-sm text-red-700">
                  {lastSettlement.events.find(e => e.type === 'cash_shortage')?.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">净利润</p>
            <p
              className={cn(
                'text-2xl font-bold',
                lastSettlement.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {lastSettlement.netProfit >= 0 ? '+' : ''}¥
              {lastSettlement.netProfit.toLocaleString('zh-CN', {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">期末现金</p>
            <p className="text-2xl font-bold text-blue-700">
              ¥{lastSettlement.endingCash.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-600">期末库存</p>
            <p className="text-2xl font-bold text-amber-700">{lastSettlement.endingInventory} 件</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-slate-900 mb-3">现金流明细</h4>
          <div className="space-y-2">
            {lastSettlement.cashFlow.map((item: CashFlowItem, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getCashFlowIcon(item.category)}
                  <span className="text-slate-700">{item.description}</span>
                </div>
                <span
                  className={cn(
                    'font-semibold',
                    item.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {item.amount >= 0 ? '+' : ''}¥{item.amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {lastSettlement.events.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-900 mb-3">重要事件</h4>
            <div className="space-y-2">
              {lastSettlement.events.map((event: GameEvent, index: number) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    getSeverityStyle(event.severity)
                  )}
                >
                  {getSeverityIcon(event.severity)}
                  <span>{event.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {isGameEnded ? (
            <>
              <Button variant="primary" className="flex-1" onClick={handleViewReport}>
                <FileText className="w-4 h-4 mr-2" />
                查看完整报告
              </Button>
              <Button variant="secondary" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                导出CSV
              </Button>
            </>
          ) : (
            <Button variant="primary" className="flex-1" onClick={closeSettlement}>
              继续下一回合
            </Button>
          )}
        </div>

        {isGameEnded && (
          <p className="text-center text-sm text-slate-500">
            本次经营共 {round} 回合，最终得分将保存到历史记录
          </p>
        )}
      </div>
    </Modal>
  );
};
