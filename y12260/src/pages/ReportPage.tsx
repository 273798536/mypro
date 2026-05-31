import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { ScoreCalculator } from '@/engine/ScoreCalculator';
import { ConflictDetector } from '@/engine/ConflictDetector';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Copy,
  Printer,
  Download,
  Check,
  FileText,
  Link2Off,
  Box,
  Users,
  Trophy,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

export const ReportPage = () => {
  const navigate = useNavigate();
  const {
    humanReport,
    generateReport,
    conflicts,
    level,
    score,
    baseScore,
    penalties,
    placedDevices,
    cables,
    walkPaths,
    timeLeft,
    totalTime,
    scoreResult
  } = useGameStore();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'cable' | 'device' | 'walk'>('report');

  useEffect(() => {
    if (!humanReport) {
      generateReport();
    }
  }, [humanReport, generateReport]);

  const result = scoreResult || ScoreCalculator.calculate(
    placedDevices,
    cables,
    walkPaths,
    conflicts,
    level,
    timeLeft,
    totalTime
  );

  const cableConflicts = conflicts.filter(c => c.type === 'cable_cross');
  const deviceConflicts = conflicts.filter(c => c.type === 'device_block');
  const walkConflicts = conflicts.filter(c => c.type === 'walk_conflict');

  const handleCopy = async () => {
    if (humanReport) {
      await navigator.clipboard.writeText(humanReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (humanReport) {
      const blob = new Blob([humanReport], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `乐队设备抢修夜-报告-${new Date().toLocaleDateString('zh-CN')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const tabs: Array<{
    id: 'report' | 'cable' | 'device' | 'walk';
    label: string;
    icon: typeof FileText;
    count?: number;
  }> = [
    { id: 'report', label: '完整报告', icon: FileText },
    { id: 'cable', label: '线缆穿越', icon: Link2Off, count: cableConflicts.length },
    { id: 'device', label: '设备遮挡', icon: Box, count: deviceConflicts.length },
    { id: 'walk', label: '走位冲突', icon: Users, count: walkConflicts.length }
  ];

  const renderConflictExplanation = (conflict: any, index: number) => (
    <div key={conflict.id} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
      <div className="flex items-start gap-3 mb-4">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          conflict.type === 'cable_cross' && 'bg-red-500/20',
          conflict.type === 'device_block' && 'bg-orange-500/20',
          conflict.type === 'walk_conflict' && 'bg-yellow-500/20'
        )}>
          <span className="text-sm font-bold text-white">#{index + 1}</span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-1">{conflict.description}</h4>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>位置: {conflict.positions.map((p: any) => `(${p.x},${p.y})`).join('、')}</span>
            <span className="text-red-400 font-medium">扣{conflict.penalty}分</span>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb size={16} className="text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-purple-400 mb-1">人话解释</div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {conflict.humanExplanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/result')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={18} />
              <span>返回结算</span>
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-lg font-bold text-white">调度报告</h1>
              <p className="text-xs text-slate-400">{level.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-all duration-200"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              <span className="text-sm">{copied ? '已复制' : '复制全文'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-all duration-200"
            >
              <Printer size={16} />
              <span className="text-sm">打印</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all duration-200"
            >
              <Download size={16} />
              <span className="text-sm">下载</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <Trophy size={28} style={{ color: ScoreCalculator.getRatingColor(result.rating) }} />
                <span
                  className="text-4xl font-bold"
                  style={{ color: ScoreCalculator.getRatingColor(result.rating) }}
                >
                  {result.rating}
                </span>
              </div>
              <p className="text-slate-300 max-w-md">
                {ScoreCalculator.getRatingDescription(result.rating)}
              </p>
            </div>

            <div className="text-center">
              <div className="text-sm text-slate-400 mb-1">最终得分</div>
              <div className="text-5xl font-bold text-yellow-400 font-mono">
                {result.totalScore}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="bg-slate-900/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-400 font-mono">+{result.deviceScore}</div>
              <div className="text-xs text-slate-400 mt-1">设备得分</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-cyan-400 font-mono">+{result.cableScore}</div>
              <div className="text-xs text-slate-400 mt-1">线缆得分</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-slate-400 font-mono">+{result.pathScore}</div>
              <div className="text-xs text-slate-400 mt-1">走位得分</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-yellow-400 font-mono">+{result.timeBonus}</div>
              <div className="text-xs text-slate-400 mt-1">时间奖励</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-400 font-mono">-{result.penalties}</div>
              <div className="text-xs text-slate-400 mt-1">冲突扣分</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-4 mb-6">
          <div className="flex items-center gap-1 p-1 bg-slate-900/50 rounded-xl overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                    isActive
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  )}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      isActive ? 'bg-white/20' : 'bg-slate-700 text-slate-300'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'report' && (
            <div className="bg-white rounded-2xl p-8 text-slate-800 prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap font-sans">
                {humanReport || '正在生成报告...'}
              </div>
            </div>
          )}

          {activeTab === 'cable' && (
            <div className="space-y-4">
              {cableConflicts.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700">
                  <Link2Off size={48} className="mx-auto mb-3 text-green-500/50" />
                  <p className="text-lg text-slate-300">太棒了！没有线缆穿越问题</p>
                  <p className="text-slate-500 mt-1">你的线缆管理非常专业</p>
                </div>
              ) : (
                cableConflicts.map((conflict, idx) => renderConflictExplanation(conflict, idx))
              )}
            </div>
          )}

          {activeTab === 'device' && (
            <div className="space-y-4">
              {deviceConflicts.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700">
                  <Box size={48} className="mx-auto mb-3 text-green-500/50" />
                  <p className="text-lg text-slate-300">太棒了！没有设备遮挡问题</p>
                  <p className="text-slate-500 mt-1">你的设备摆放非常合理</p>
                </div>
              ) : (
                deviceConflicts.map((conflict, idx) => renderConflictExplanation(conflict, idx))
              )}
            </div>
          )}

          {activeTab === 'walk' && (
            <div className="space-y-4">
              {walkConflicts.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700">
                  <Users size={48} className="mx-auto mb-3 text-green-500/50" />
                  <p className="text-lg text-slate-300">太棒了！没有走位冲突问题</p>
                  <p className="text-slate-500 mt-1">你的走位规划非常顺畅</p>
                </div>
              ) : (
                walkConflicts.map((conflict, idx) => renderConflictExplanation(conflict, idx))
              )}
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-purple-300 mb-1">报告说明</div>
              <div className="text-sm text-slate-400">
                本报告由「乐队设备抢修夜」游戏自动生成。所有冲突解释都经过"人话翻译"处理，
                即使是不懂技术的同事也能看懂。报告包含完整的版本信息和时间戳，可作为调度方案的存档记录。
              </div>
              <div className="mt-3 text-xs text-slate-500 space-y-1">
                <div>游戏版本: v1.0.0</div>
                <div>关卡版本: {level.version}</div>
                <div>关卡来源: {level.source}</div>
                <div>生成时间: {new Date().toLocaleString('zh-CN')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
