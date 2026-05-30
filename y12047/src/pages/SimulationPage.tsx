import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BridgeCanvas } from '../components/BridgeCanvas';
import { useBridgeStore, useSimulationStore, useVersionStore } from '../store';
import { PRESET_LEVELS } from '../data/presetLevels';
import { exportToCSV } from '../utils/export';
import type { SimulationResult } from '../types';

export function SimulationPage() {
  const navigate = useNavigate();
  const animationRef = useRef<number | null>(null);
  
  const {
    currentLevelId,
    currentVersionId,
    nodes,
    members,
    budget,
    renderOptions,
    setRenderOptions,
  } = useBridgeStore();

  const {
    isSimulating,
    isComputing,
    currentStep,
    totalSteps,
    results,
    currentResult,
    judgeResult,
    loadMagnitude,
    progress,
    setLoadMagnitude,
    setCurrentStep,
    runSimulation,
    judgeCurrentResult,
    loadResults,
    verifyReproducibility,
    reset: resetSimulation,
  } = useSimulationStore();

  const { loadVersionResults } = useVersionStore();

  const [playSpeed, setPlaySpeed] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [showResultPanel, setShowResultPanel] = useState(false);

  const currentLevel = PRESET_LEVELS.find((l) => l.id === currentLevelId);

  useEffect(() => {
    if (currentVersionId) {
      loadResults(currentVersionId);
      loadVersionResults(currentVersionId);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentVersionId]);

  if (!currentLevel || nodes.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">请先选择关卡</h2>
        <p className="text-slate-600 mb-6">返回关卡选择页面，选择一个关卡开始设计</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          去选择关卡
        </button>
      </div>
    );
  }

  const handleStartSimulation = async () => {
    if (!currentVersionId) return;
    
    resetSimulation();
    
    await runSimulation(nodes, members, currentVersionId, budget, (step, result) => {
    });
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    judgeCurrentResult(nodes, members, budget);
  };

  const handlePlayAnimation = () => {
    if (results.length === 0) return;
    
    let step = currentStep;
    const animate = () => {
      step = (step + 1) % (totalSteps + 1);
      setCurrentStep(step);
      
      if (step < totalSteps) {
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animate, 1000 / playSpeed);
        });
      }
    };
    
    animate();
  };

  const handleStopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const handleVerifyReproducibility = async () => {
    if (!currentVersionId) return;
    
    setVerificationStatus('正在验证...');
    const result = await verifyReproducibility(nodes, members, currentVersionId, budget);
    setVerificationStatus(result.message);
  };

  const handleExportReport = () => {
    if (!currentVersionId || results.length === 0) return;
    
    const version = useBridgeStore.getState().currentVersionId;
    const report = {
      versionId: currentVersionId,
      levelName: currentLevel.name,
      totalSteps,
      loadMagnitude,
      results: results as SimulationResult[],
      finalResult: results[results.length - 1],
      judgeResult,
      members,
      nodes,
      budget,
    };
    
    const csv = exportToCSV(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation_report_${currentVersionId}.csv`;
    a.click();
  };

  const getStepLoadPosition = () => {
    return (currentStep / totalSteps) * 100;
  };

  const getResultStatusColor = () => {
    if (!judgeResult) return 'bg-slate-100 text-slate-600';
    if (judgeResult.passed) return 'bg-green-100 text-green-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{currentLevel.name} - 受力模拟</h2>
          <p className="text-sm text-slate-500 mt-1">载荷逐步推进，实时显示应力和变形</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleVerifyReproducibility}
            disabled={isSimulating}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            验证结果可复现
          </button>
          <button
            onClick={handleExportReport}
            disabled={results.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            导出成绩报告
          </button>
          <button
            onClick={() => navigate('/comparison')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            去复盘对比 →
          </button>
        </div>
      </div>

      {verificationStatus && (
        <div className={`p-4 rounded-lg border ${
          verificationStatus.includes('通过')
            ? 'bg-green-50 border-green-200 text-green-700'
            : verificationStatus.includes('失败') || verificationStatus.includes('出错')
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {verificationStatus}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">桥梁受力可视化</h3>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={renderOptions.showDeformation}
                    onChange={(e) => setRenderOptions({ showDeformation: e.target.checked })}
                  />
                  变形显示
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={renderOptions.showStressColors}
                    onChange={(e) => setRenderOptions({ showStressColors: e.target.checked })}
                  />
                  应力颜色
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={renderOptions.showForces}
                    onChange={(e) => setRenderOptions({ showForces: e.target.checked })}
                  />
                  轴力数值
                </label>
              </div>
            </div>
            <div className="h-96">
              <BridgeCanvas
                nodes={nodes}
                members={members}
                result={currentResult}
                renderOptions={renderOptions}
                loadPosition={getStepLoadPosition()}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">动画控制</h3>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600">
                  速度：
                  <select
                    value={playSpeed}
                    onChange={(e) => setPlaySpeed(Number(e.target.value))}
                    className="ml-2 px-2 py-1 border border-slate-300 rounded text-sm"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartSimulation}
                  disabled={isSimulating || isComputing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                >
                  {isComputing ? '计算中...' : isSimulating ? '运行中...' : '▶ 开始模拟'}
                </button>
                <button
                  onClick={handlePlayAnimation}
                  disabled={results.length === 0 || isSimulating}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  ▶ 播放动画
                </button>
                <button
                  onClick={handleStopAnimation}
                  disabled={results.length === 0}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  ⏸ 暂停
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 w-20">步骤</span>
                <input
                  type="range"
                  min={0}
                  max={totalSteps}
                  value={currentStep}
                  onChange={(e) => handleStepChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-slate-700 w-20 text-right">
                  {currentStep} / {totalSteps}
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500">载荷大小</div>
                  <div className="text-lg font-bold text-slate-800">{loadMagnitude.toLocaleString()} N</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500">载荷位置</div>
                  <div className="text-lg font-bold text-slate-800">{getStepLoadPosition().toFixed(0)}%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500">最大应力</div>
                  <div className="text-lg font-bold text-slate-800">
                    {currentResult ? `${(currentResult.maxStress / 1e6).toFixed(2)} MPa` : '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">判定结果</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getResultStatusColor()}`}>
                {!judgeResult ? '未判定' : judgeResult.passed ? '✓ 通过' : '✗ 失败'}
              </span>
            </div>
            
            {judgeResult && !judgeResult.passed && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-sm font-medium text-red-700">失败原因</div>
                <div className="text-xs text-red-600 mt-1">{judgeResult.message}</div>
                {judgeResult.memberId && (
                  <div className="text-xs text-red-600 mt-1">杆件：{judgeResult.memberId}</div>
                )}
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">杆件过载</span>
                <span className={judgeResult?.details?.overload ? 'text-red-600' : 'text-green-600'}>
                  {judgeResult?.details?.overload ? '✗ 超限' : '✓ 正常'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">支点错位</span>
                <span className={judgeResult?.details?.misalignment ? 'text-red-600' : 'text-green-600'}>
                  {judgeResult?.details?.misalignment ? '✗ 错误' : '✓ 正确'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">预算超支</span>
                <span className={judgeResult?.details?.overbudget ? 'text-red-600' : 'text-green-600'}>
                  {judgeResult?.details?.overbudget ? '✗ 超支' : '✓ 正常'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowResultPanel(!showResultPanel)}
              className="w-full mt-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              {showResultPanel ? '收起详情 ▲' : '查看详细数据 ▼'}
            </button>
          </div>

          {showResultPanel && currentResult && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 max-h-80 overflow-y-auto">
              <h3 className="font-semibold text-slate-800 mb-3">杆件应力数据</h3>
              <div className="space-y-2">
                {members.map((m) => {
                  const force = currentResult.memberForces[m.id] || 0;
                  const stress = currentResult.memberStresses[m.id] || 0;
                  const ratio = stress / (m.yieldStrength * 1e6);
                  
                  return (
                    <div key={m.id} className="p-2 bg-slate-50 rounded">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{m.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          ratio > 1.0 ? 'bg-red-100 text-red-700' :
                          ratio > 0.9 ? 'bg-orange-100 text-orange-700' :
                          ratio > 0.6 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {(ratio * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        轴力：{force > 0 ? '拉' : '压'} {Math.abs(force).toFixed(0)} N | 
                        应力：{(stress / 1e6).toFixed(2)} MPa
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">应力图例</h3>
            <div className="space-y-2">
              {[
                { color: '#165DFF', label: '< 30%', desc: '安全' },
                { color: '#00B42A', label: '30-60%', desc: '良好' },
                { color: '#FF7D00', label: '60-90%', desc: '警告' },
                { color: '#F53F3F', label: '90-100%', desc: '危险' },
                { color: '#D9001B', label: '> 100%', desc: '过载' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 w-16">{item.label}</span>
                  <span className="text-slate-500 text-xs">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
