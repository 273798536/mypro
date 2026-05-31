import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, CheckCircle, XCircle, AlertTriangle, Zap, ChevronRight } from 'lucide-react';
import { exampleGames } from '../data/examples';
import { useGameStore } from '../store/useGameStore';
import { ExampleGame, Operation } from '../types';
import RealGameCanvas from '../components/game/GameCanvas';

function ExampleCard({
  example,
  isActive,
  onClick,
}: {
  example: ExampleGame;
  isActive: boolean;
  onClick: () => void;
}) {
  const isNormal = example.type === 'normal';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
        isActive
          ? isNormal
            ? 'border-green-500/50 bg-green-500/10'
            : 'border-red-500/50 bg-red-500/10'
          : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isNormal ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {isNormal ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-slate-200 text-sm mb-1">
            {example.title}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {example.description}
          </p>
          <div className="mt-3 flex items-center gap-3 text-[10px]">
            <span className={`px-2 py-0.5 rounded-full ${
              isNormal ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isNormal ? '正常流程' : '路径堵塞'}
            </span>
            <span className="text-slate-500">
              {example.operations.length} 步
            </span>
            <span className="text-slate-500">
              触发步骤: {example.triggerPointStep}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function OperationStep({
  op,
  index,
  isTrigger,
  anomalyDesc,
}: {
  op: Operation;
  index: number;
  isTrigger: boolean;
  anomalyDesc?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`relative pl-6 pb-4 ${isTrigger ? '' : ''}`}
    >
      <div className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 ${
        isTrigger
          ? 'border-amber-500 bg-amber-500/30'
          : 'border-slate-600 bg-slate-800'
      }`} />
      {index < 5 && (
        <div className="absolute left-[5px] top-4 w-0.5 h-full bg-slate-700/50" />
      )}

      <div className={`p-3 rounded-lg border ${
        isTrigger
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-slate-900/30 border-slate-700/30'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-slate-500">步骤 {op.stepNumber}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            op.type === 'place_power' ? 'bg-amber-500/20 text-amber-400' :
            op.type === 'place_wire' ? 'bg-blue-500/20 text-blue-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {op.type === 'place_power' ? '电源站' : op.type === 'place_wire' ? '导线' : '维修队'}
          </span>
          {isTrigger && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
              ⚡ 触发点
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 flex-shrink-0">来源</span>
            <span className="text-xs text-slate-300">{op.source}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 flex-shrink-0">判断</span>
            <span className="text-xs text-slate-300">{op.judgment}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/10 text-green-400 flex-shrink-0">结果</span>
            <span className={`text-xs ${anomalyDesc ? 'text-red-400' : 'text-slate-300'}`}>
              {op.result}
            </span>
          </div>
          {anomalyDesc && (
            <div className="flex items-start gap-2 mt-1 pt-1 border-t border-red-500/20">
              <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-[10px] text-red-400">{anomalyDesc}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ExamplesPage() {
  const actions = useGameStore(state => state.actions);
  const [activeExample, setActiveExample] = useState<string | null>(null);
  const [playingStep, setPlayingStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedExample = exampleGames.find(ex => ex.id === activeExample);

  const handleLoadExample = (exampleId: string) => {
    setActiveExample(exampleId);
    setPlayingStep(0);
    setIsPlaying(false);
    actions.loadExample(exampleId);
  };

  const handlePlayStep = () => {
    if (!selectedExample) return;
    if (playingStep >= selectedExample.operations.length) return;

    const op = selectedExample.operations[playingStep];

    if (op.type === 'place_power' && op.nodeIds) {
      actions.placePowerStation(op.nodeIds[0]);
    } else if (op.type === 'place_wire' && op.nodeIds) {
      actions.placeWire(op.nodeIds[0], op.nodeIds[1]);
    }

    setPlayingStep(prev => prev + 1);
  };

  const handleAutoPlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    let step = playingStep;

    const playNext = () => {
      if (!selectedExample || step >= selectedExample.operations.length) {
        setIsPlaying(false);
        return;
      }

      const op = selectedExample.operations[step];
      if (op.type === 'place_power' && op.nodeIds) {
        actions.placePowerStation(op.nodeIds[0]);
      } else if (op.type === 'place_wire' && op.nodeIds) {
        actions.placeWire(op.nodeIds[0], op.nodeIds[1]);
      }

      step++;
      setPlayingStep(step);

      if (step < selectedExample.operations.length) {
        setTimeout(playNext, 1200);
      } else {
        setIsPlaying(false);
      }
    };

    playNext();
  };

  const handleResetExample = () => {
    if (!activeExample) return;
    setPlayingStep(0);
    setIsPlaying(false);
    actions.loadExample(activeExample);
  };

  const getAnomalyForStep = (stepNumber: number): string | undefined => {
    if (!selectedExample || selectedExample.type !== 'blockage') return undefined;
    if (stepNumber === 4) return '路径堵塞: B-C-B形成闭环，电流无法正常流通';
    if (stepNumber === 5) return '连接失败: 闭环堵塞导致后续导线无法建立有效连接';
    return undefined;
  };

  return (
    <div className="min-h-screen bg-circuit-darker">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">返回游戏</span>
              </Link>
              <div className="w-px h-6 bg-slate-700" />
              <h1 className="font-display font-bold text-lg text-slate-200">
                样例演示
              </h1>
            </div>

            {selectedExample && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetExample}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors"
                >
                  重置
                </button>
                <button
                  onClick={handleAutoPlay}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-colors ${
                    isPlaying
                      ? 'bg-red-500 hover:bg-red-400 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  {isPlaying ? '停止' : '自动播放'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="bg-blue-500/10 border-b border-blue-500/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <p>
              <strong>教师提示：</strong>
              以下两个样例分别展示正常流程和路径堵塞分支。
              点击样例卡片后逐步播放，观察来源→判断→结果的完整链路。
              路径堵塞样例中异常会进入待确认清单，不会混入正常明细。
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {exampleGames.map(example => (
            <ExampleCard
              key={example.id}
              example={example}
              isActive={activeExample === example.id}
              onClick={() => handleLoadExample(example.id)}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selectedExample && (
            <motion.div
              key={selectedExample.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-7">
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-slate-200">
                      电路状态
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        步骤 {playingStep} / {selectedExample.operations.length}
                      </span>
                      {playingStep < selectedExample.operations.length && (
                        <button
                          onClick={handlePlayStep}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                          下一步
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-[350px]">
                    <RealGameCanvas />
                  </div>
                </div>

                <div className="mt-6 bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                  <h3 className="font-display font-bold text-slate-200 mb-3">
                    预期结果
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    selectedExample.type === 'normal'
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    <div className="flex items-start gap-2">
                      {selectedExample.type === 'normal' ? (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm leading-relaxed ${
                        selectedExample.type === 'normal' ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {selectedExample.expectedResult}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                  <h3 className="font-display font-bold text-slate-200 mb-4">
                    操作链路 · 来源→判断→结果
                  </h3>

                  <div className="space-y-0">
                    {selectedExample.operations.map((op, index) => {
                      const isTrigger = op.stepNumber === selectedExample.triggerPointStep;
                      const anomalyDesc = getAnomalyForStep(op.stepNumber);
                      const isCurrentOrPast = index < playingStep;

                      return (
                        <div
                          key={op.id}
                          className={isCurrentOrPast ? '' : 'opacity-40'}
                        >
                          <OperationStep
                            op={op}
                            index={index}
                            isTrigger={isTrigger && isCurrentOrPast}
                            anomalyDesc={isCurrentOrPast ? anomalyDesc : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedExample.type === 'blockage' && playingStep >= 4 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-red-500/10 rounded-xl border border-red-500/30 p-5"
                  >
                    <h3 className="font-display font-bold text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      异常清单（待确认）
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                            严重
                          </span>
                          <span className="text-xs text-slate-500">步骤 4</span>
                        </div>
                        <p className="text-xs text-red-300">
                          路径堵塞: B→C→B形成闭环回路，电流在环路中无法有效流向用户区
                        </p>
                      </div>
                      {playingStep >= 5 && (
                        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold">
                              错误
                            </span>
                            <span className="text-xs text-slate-500">步骤 5</span>
                          </div>
                          <p className="text-xs text-orange-300">
                            连接失败: C→D导线因路径堵塞无法建立有效电力传输通道
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3">
                      ⚠ 以上异常进入待确认清单，未混入正常明细中
                    </p>
                  </motion.div>
                )}

                {selectedExample.type === 'normal' && playingStep >= selectedExample.operations.length && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-green-500/10 rounded-xl border border-green-500/30 p-5"
                  >
                    <h3 className="font-display font-bold text-green-400 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      正常明细
                    </h3>
                    <div className="space-y-1.5">
                      {selectedExample.operations.map(op => (
                        <div key={op.id} className="flex items-center gap-2 text-xs p-2 rounded bg-slate-900/30">
                          <span className="font-mono text-slate-500">{op.stepNumber}.</span>
                          <span className="text-slate-300 truncate">{op.result}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3">
                      ✅ 全部操作正常，无异常进入待确认清单
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedExample && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Zap className="w-8 h-8 text-amber-500/50" />
            </div>
            <p className="text-slate-500 text-sm">
              点击上方样例卡片开始演示
            </p>
            <p className="text-slate-600 text-xs mt-1">
              包含一条正常记录和一条路径堵塞，无需读代码即可确认分支生效
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
