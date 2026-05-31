import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getLevelById } from '../data/levels';
import { RelationGraph } from '../components/RelationGraph';
import {
  getRiskLevelText,
  getNodeTypeIcon,
  formatTimestamp,
  getFocusPointText,
  downloadTextFile,
  generateReportText,
} from '../utils';
import type { Operation } from '../types';

export default function Review() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { loadLevel, stateWithHistory, currentLevel, jumpToStep, generateReport } =
    useGameStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (levelId) {
      const level = getLevelById(levelId);
      if (!level) {
        navigate('/');
        return;
      }
      loadLevel(levelId);
    }
  }, [levelId, loadLevel, navigate]);

  useEffect(() => {
    if (isPlaying && stateWithHistory) {
      const allStates = [...stateWithHistory.past, stateWithHistory.present, ...stateWithHistory.future];
      timerRef.current = window.setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= allStates.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          jumpToStep(prev + 1);
          return prev + 1;
        });
      }, 2000 / speed);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, stateWithHistory, jumpToStep]);

  if (!stateWithHistory || !currentLevel) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const { past, present, future } = stateWithHistory;
  const allStates = [...past, present, ...future];
  const operations = present.operations;
  const totalSteps = allStates.length;
  const falsePositiveNodes = currentLevel.nodes.filter((n) => n.falsePositiveType);
  const correctCount = operations.filter((op) => op.isCorrect).length;
  const accuracyRate = operations.length > 0 ? (correctCount / operations.length) * 100 : 0;
  const mistakeCount = operations.length - correctCount;
  const riskCounts = {
    blacklist: Object.values(present.nodeStates).filter((s) => s === 'blacklist').length,
    safe: Object.values(present.nodeStates).filter((s) => s === 'safe').length,
    suspicious: Object.values(present.nodeStates).filter((s) => s === 'suspicious').length,
  };

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handlePrev = () => currentStep > 0 && (setCurrentStep(currentStep - 1), jumpToStep(currentStep - 1));
  const handleNext = () => currentStep < totalSteps - 1 && (setCurrentStep(currentStep + 1), jumpToStep(currentStep + 1));
  const handleReset = () => (setCurrentStep(0), setIsPlaying(false), jumpToStep(0));
  const handleStepClick = (index: number) => (setCurrentStep(index), jumpToStep(index), setIsPlaying(false));
  const handleExportText = () => {
    const report = generateReport();
    if (report) downloadTextFile(generateReportText(report), `review-report-${levelId}.txt`);
  };
  const handleExportImage = () => navigate(`/report/${levelId}`);
  const getOpIcon = (a: Operation['action']) => (a === 'mark-safe' ? '✅' : a === 'mark-suspicious' ? '⚠️' : '🚫');
  const getFalsePositiveTip = (t: string) =>
    t === 'device-sharing' ? '设备共享不等于风险关联，需结合资金往来判断'
    : t === 'chain-too-long' ? '超过3度的关联需谨慎，避免过度牵连'
    : '关注标签更新时间，历史标签不代表当前状态';

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg">← 返回</button>
          <div>
            <h1 className="text-xl font-bold">复盘分析 - {currentLevel.title}</h1>
            <p className="text-xs text-slate-400">核心知识点：{getFocusPointText(currentLevel.focusPoint)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${present.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {present.status === 'completed' ? '已完成' : '已失败'}
        </span>
      </motion.div>

      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 100px)' }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="col-span-5 bg-slate-800 rounded-xl p-4 overflow-hidden">
          <h3 className="text-sm font-semibold mb-3 text-slate-300">关系图谱</h3>
          <div className="h-full">
            <RelationGraph nodes={currentLevel.nodes} edges={currentLevel.edges} nodeStates={present.nodeStates} showCorrectAnswers={true} width={500} height={500} />
          </div>
        </motion.div>

        <div className="col-span-7 flex flex-col gap-4 overflow-hidden">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800 rounded-xl p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">操作时间线</h3>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-700 rounded-lg p-1">
                  {[0.5, 1, 2].map((s) => (
                    <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-1 text-xs rounded ${speed === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                      {s}x
                    </button>
                  ))}
                </div>
                <button onClick={handleReset} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">🔄</button>
                <button onClick={handlePrev} disabled={currentStep === 0} className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg">⏮</button>
                <button onClick={handlePlayPause} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg px-4">{isPlaying ? '⏸' : '▶'}</button>
                <button onClick={handleNext} disabled={currentStep === totalSteps - 1} className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg">⏭</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700" />
                {operations.map((op, index) => (
                  <motion.div key={op.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} onClick={() => handleStepClick(index + 1)} className="relative pl-10 pb-4 cursor-pointer">
                    <div className={`absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${index + 1 === currentStep ? 'bg-blue-500 border-blue-400' : op.isCorrect ? 'bg-emerald-500/20 border-emerald-500' : 'bg-red-500/20 border-red-500'}`}>
                      {index + 1 === currentStep ? '▶' : getOpIcon(op.action)}
                    </div>
                    <div className={`p-3 rounded-lg ${index + 1 === currentStep ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-slate-700/50 hover:bg-slate-700'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{currentLevel.nodes.find((n) => n.id === op.nodeId)?.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${op.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {op.isCorrect ? '正确' : '错误'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{getRiskLevelText(op.oldValue)} → {getRiskLevelText(op.newValue)}</div>
                      <div className="text-xs text-slate-500 mt-1">{formatTimestamp(op.timestamp)}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-slate-300">误判统计</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-400">{accuracyRate.toFixed(1)}%</div><div className="text-xs text-slate-400">准确率</div></div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-red-400">{mistakeCount}</div><div className="text-xs text-slate-400">错误次数</div></div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-red-500">{riskCounts.blacklist}</div><div className="text-xs text-slate-400">黑名单</div></div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-emerald-500">{riskCounts.safe}</div><div className="text-xs text-slate-400">安全</div></div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center col-span-2"><div className="text-xl font-bold text-amber-500">{riskCounts.suspicious}</div><div className="text-xs text-slate-400">可疑</div></div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-slate-300">报告导出</h3>
              <div className="space-y-3">
                <button onClick={handleExportText} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center justify-center gap-2">📄 导出文本报告</button>
                <button onClick={handleExportImage} className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium flex items-center justify-center gap-2">🖼️ 生成图片报告</button>
              </div>
            </div>
          </motion.div>

          {falsePositiveNodes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-slate-300">误伤详情</h3>
              <div className="grid grid-cols-2 gap-3">
                {falsePositiveNodes.map((node) => (
                  <div key={node.id} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getNodeTypeIcon(node.type)}</span>
                      <span className="font-medium text-amber-300">{node.name}</span>
                    </div>
                    <div className="text-xs text-slate-300 mb-2"><span className="text-red-400">⚠️ 误伤原因：</span>{node.falsePositiveReason}</div>
                    <div className="text-xs text-slate-400"><span className="text-blue-400">💡 教学要点：</span>{getFalsePositiveTip(node.falsePositiveType!)}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
