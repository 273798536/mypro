import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RotateCcw, History, BookOpen, Shield, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { loadCurrentGame } from '@/utils/storage';
import { GAME_CONFIG } from '@/constants/config';

const RuleSection: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mt-6">
      <CardHeader>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            游戏规则
          </CardTitle>
          <span className="text-sm text-slate-500">
            {expanded ? '收起' : '展开'}
          </span>
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 text-slate-700">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">游戏目标</h4>
            <p className="text-sm">
              经营一家外贸公司，在 {GAME_CONFIG.MAX_ROUNDS} 个回合内，通过合理接单和汇率风险管理，实现公司资产增值。
              初始资金 ¥{GAME_CONFIG.INITIAL_CASH.toLocaleString('zh-CN')}，初始库存 {GAME_CONFIG.INITIAL_INVENTORY} 件。
            </p>
          </div>

          <div>
            <h4 className="font-medium text-slate-900 mb-2">核心玩法</h4>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 mt-0.5 text-blue-500" />
              <span><strong>接单：</strong>每回合会生成新订单，选择接受订单需要消耗库存</span>
              </li>
              <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 text-emerald-500" />
              <span><strong>锁汇：</strong>对已接受的订单可以选择远期锁汇，锁定未来汇率，支付手续费 {GAME_CONFIG.FORWARD_CONTRACT_FEE_RATE * 100}% 手续费</span>
              </li>
              <li className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 mt-0.5 text-amber-500" />
              <span><strong>裸奔：</strong>不锁汇，订单交货时按即期汇率结算，承担汇率波动风险</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-slate-900 mb-2">风险提示</h4>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <strong>锁汇过量：</strong>锁汇金额超过订单金额的 {GAME_CONFIG.OVER_HEDGING_THRESHOLD * 100}%，超额部分罚款 {GAME_CONFIG.OVER_HEDGING_PENALTY_RATE * 100}%
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <strong>订单取消：</strong>订单有一定概率被取消，需支付订单金额 {GAME_CONFIG.ORDER_CANCEL_PENALTY_RATE * 100}% 违约金
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600" />
                <div className="text-sm text-red-800">
                  <strong>现金不足：</strong>期末现金为负将导致破产，游戏结束
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { startNewGame, loadSavedGame } = useGameStore();
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    const saved = loadCurrentGame();
    setHasSavedGame(!!saved && saved.status !== 'ended' && saved.status !== 'bankrupt');
  }, []);

  const handleStartNew = () => {
    if (hasSavedGame) {
      if (!window.confirm('存在未完成的游戏，开始新游戏将覆盖进度，确定继续？')) {
        return;
      }
    }
    startNewGame();
    navigate('/game');
  };

  const handleContinue = () => {
    if (loadSavedGame()) {
      navigate('/game');
    }
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            汇率避险经营赛
          </h1>
          <p className="text-xl text-blue-200 mb-2">
            外贸公司经营模拟 · 汇率风险管理
          </p>
          <p className="text-slate-400">
            在波动的汇率市场中，学会运用远期合约，规避风险，实现财富增长
          </p>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="pt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="text-center p-6 bg-white/5 rounded-xl">
                <div className="text-4xl font-bold text-white mb-2">{GAME_CONFIG.MAX_ROUNDS}</div>
                <div className="text-blue-200">经营回合</div>
              </div>
              <div className="text-center p-6 bg-white/5 rounded-xl">
                <div className="text-4xl font-bold text-white mb-2">
                  ¥{GAME_CONFIG.INITIAL_CASH / 10000}万
                </div>
                <div className="text-blue-200">初始资金</div>
              </div>
              <div className="text-center p-6 bg-white/5 rounded-xl">
                <div className="text-4xl font-bold text-white mb-2">{GAME_CONFIG.INITIAL_INVENTORY}</div>
                <div className="text-blue-200">初始库存</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartNew}
                className="text-lg px-8 py-4"
              >
                <Play className="w-5 h-5 mr-2" />
                开始新游戏
              </Button>
              {hasSavedGame && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleContinue}
                  className="text-lg px-8 py-4"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  继续游戏
                </Button>
              )}
              <Button
                variant="ghost"
                size="lg"
                onClick={handleViewHistory}
                className="text-lg px-8 py-4 bg-white/10 text-white hover:bg-white/20"
              >
                <History className="w-5 h-5 mr-2" />
                历史记录
              </Button>
            </div>
          </CardContent>
        </Card>

        <RuleSection />
        </div>
      </div>
    </div>
  );
};
