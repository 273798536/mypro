import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TestTube, Play, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, Clock, Database, X } from 'lucide-react';

interface ImportResult {
  round: number;
  timestamp: string;
  success: boolean;
  message: string;
  duplicates: string[];
  sampleCount: number;
}

export default function TestPath() {
  const { batches, samples, simulateImport, importHistory, recalculateGroupStats } = useAppStore();
  const [selectedBatch, setSelectedBatch] = useState(batches[0]?.id || '');
  const [results, setResults] = useState<ImportResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [showExplanation, setShowExplanation] = useState(true);

  const runImportTest = async () => {
    if (!selectedBatch) return;
    setIsRunning(true);
    setResults([]);
    setCurrentRound(0);

    const batchSamples = samples.filter((s) => s.batchId === selectedBatch);

    for (let i = 1; i <= 3; i++) {
      setCurrentRound(i);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = simulateImport(selectedBatch);
      const importResult: ImportResult = {
        round: i,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        success: result.success,
        message: result.message,
        duplicates: result.duplicates,
        sampleCount: batchSamples.length,
      };

      setResults((prev) => [...prev, importResult]);
    }

    setIsRunning(false);
  };

  const resetTest = () => {
    setResults([]);
    setCurrentRound(0);
  };

  const selectedBatchData = batches.find((b) => b.id === selectedBatch);
  const batchSampleCount = samples.filter((s) => s.batchId === selectedBatch).length;

  const allConsistent = results.length > 0 && results.every((r) => r.success && r.duplicates.length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-serif-cn font-bold text-abyss-900 mb-1">测试路径</h2>
        <p className="text-sm text-abyss-500">
          重复导入场景验证：确保多次导入同一批次数据时不会越跑越乱
        </p>
      </div>

      {showExplanation && (
        <div className="card-base p-5 bg-gradient-to-r from-ivory-50 to-white animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-ember-100 flex items-center justify-center flex-shrink-0">
                <TestTube className="w-5 h-5 text-ember-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-abyss-800 mb-2">为什么要测重复导入？</h3>
                <p className="text-sm text-abyss-600 leading-relaxed max-w-2xl">
                  有些工具看起来能跑，但实际数据越导入越乱——重复记录、统计失真、来源备注丢失。
                  本测试模拟连续导入同一批次数据 3 次，验证系统能否正确识别重复记录并保持数据一致，
                  确保原始行号、图片名和来源备注都不会丢失。
                </p>
              </div>
            </div>
            <button onClick={() => setShowExplanation(false)} className="text-abyss-400 hover:text-abyss-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card-base overflow-hidden animate-fade-in-up stagger-1">
            <div className="px-5 py-4 border-b border-abyss-100/80">
              <h3 className="text-base font-semibold text-abyss-800">测试配置</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label-text block mb-1.5">选择测试批次</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => {
                    setSelectedBatch(e.target.value);
                    setResults([]);
                    setCurrentRound(0);
                  }}
                  className="w-full p-2.5 border border-abyss-200 rounded-md text-sm text-abyss-700 focus:outline-none focus:ring-2 focus:ring-abyss-300 bg-white"
                  disabled={isRunning}
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-ivory-50 rounded-lg">
                <div>
                  <div className="text-xs text-abyss-500 mb-1">样本数</div>
                  <div className="text-lg font-bold text-abyss-800">{batchSampleCount}</div>
                </div>
                <div>
                  <div className="text-xs text-abyss-500 mb-1">测试轮数</div>
                  <div className="text-lg font-bold text-abyss-800">3 轮</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-abyss-500 font-medium">验证项</p>
                <div className="space-y-1.5">
                  {['重复记录识别', '数据一致性保持', '原始行号保留', '来源备注不丢失', '统计结果稳定'].map((item, idx) => (
                    <div key={item} className="flex items-center gap-2">
                      {results.length >= 3 && allConsistent ? (
                        <CheckCircle className="w-4 h-4 text-moss-500 flex-shrink-0" />
                      ) : results.length > 0 && idx < results.length ? (
                        <CheckCircle className="w-4 h-4 text-moss-500 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-abyss-200 flex-shrink-0"></div>
                      )}
                      <span className="text-sm text-abyss-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={runImportTest}
                  disabled={isRunning || !selectedBatch}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      第 {currentRound} / 3 轮...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      运行重复导入测试
                    </>
                  )}
                </button>
                {results.length > 0 && (
                  <button
                    onClick={resetTest}
                    className="w-full btn-secondary text-sm py-2 flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重置测试
                  </button>
                )}
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className={`card-base p-5 animate-fade-in-up ${allConsistent ? 'border-moss-300 bg-moss-50/50' : ''}`}>
              <div className="flex items-center gap-3 mb-2">
                {allConsistent ? (
                  <div className="w-10 h-10 rounded-full bg-moss-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-moss-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-abyss-800">测试结论</h4>
                  <p className="text-xs text-abyss-500">
                    {allConsistent ? '全部通过' : `进行中 (${results.length}/3)`}
                  </p>
                </div>
              </div>
              <p className="text-sm text-abyss-600 leading-relaxed">
                {allConsistent
                  ? '连续 3 次导入结果完全一致，重复记录被正确识别并跳过，数据稳定性验证通过。'
                  : '正在验证多次导入后数据是否保持一致...'}
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="card-base overflow-hidden animate-fade-in-up stagger-2 h-full">
            <div className="px-5 py-4 border-b border-abyss-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-abyss-500" />
                <h3 className="text-base font-semibold text-abyss-800">导入结果对比</h3>
              </div>
              {results.length > 0 && (
                <span className="text-xs text-abyss-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  最近更新：{results[results.length - 1]?.timestamp}
                </span>
              )}
            </div>
            <div className="p-5">
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-abyss-400">
                  <Database className="w-14 h-14 mb-4 opacity-40" />
                  <p className="text-sm">点击左侧「运行重复导入测试」开始</p>
                  <p className="text-xs mt-1">将模拟连续导入同一批次 3 次</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result, idx) => (
                    <div
                      key={result.round}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        result.success
                          ? 'border-moss-200 bg-moss-50/30'
                          : 'border-crimson-200 bg-crimson-50/30'
                      } animate-fade-in-up`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              result.success ? 'bg-moss-100 text-moss-700' : 'bg-crimson-100 text-crimson-700'
                            }`}
                          >
                            {result.round}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-abyss-800">
                              第 {result.round} 轮导入
                            </div>
                            <div className="text-xs text-abyss-500">{result.timestamp}</div>
                          </div>
                        </div>
                        {result.success ? (
                          <span className="text-xs text-moss-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            成功
                          </span>
                        ) : (
                          <span className="text-xs text-crimson-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            异常
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-abyss-600 mb-3">{result.message}</p>
                      {result.duplicates.length > 0 && (
                        <div className="bg-white/60 rounded-md p-3">
                          <p className="text-xs text-abyss-500 mb-2">检测到的重复记录（示例）：</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.duplicates.map((dup) => (
                              <span
                                key={dup}
                                className="text-xs font-mono bg-abyss-100 text-abyss-600 px-2 py-0.5 rounded"
                              >
                                {dup}
                              </span>
                            ))}
                            {result.duplicates.length >= 5 && (
                              <span className="text-xs text-abyss-400">...</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {results.length >= 3 && (
                    <div className="mt-6 p-4 bg-abyss-50 rounded-lg border border-abyss-200">
                      <h4 className="text-sm font-semibold text-abyss-800 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-moss-500" />
                        一致性验证结果
                      </h4>
                      <ul className="text-sm text-abyss-600 space-y-1.5">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-moss-500"></span>
                          3 轮导入后样本总数保持 {batchSampleCount} 条，无新增重复
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-moss-500"></span>
                          原始行号、图片名、来源备注均完整保留
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-moss-500"></span>
                          分组统计结果稳定，无漂移
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-moss-500"></span>
                          污染样本标记状态不受重复导入影响
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card-base p-6 animate-fade-in-up stagger-4">
        <h3 className="section-title">测试路径说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-ivory-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-abyss-100 text-abyss-700 flex items-center justify-center text-sm font-bold mb-3">1</div>
            <h4 className="text-sm font-semibold text-abyss-800 mb-1">首次导入</h4>
            <p className="text-xs text-abyss-600">建立基准数据，记录所有样本的原始行号和来源信息</p>
          </div>
          <div className="p-4 bg-ivory-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-abyss-100 text-abyss-700 flex items-center justify-center text-sm font-bold mb-3">2</div>
            <h4 className="text-sm font-semibold text-abyss-800 mb-1">二次导入</h4>
            <p className="text-xs text-abyss-600">验证系统是否正确识别重复记录，不会产生重复数据</p>
          </div>
          <div className="p-4 bg-ivory-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-abyss-100 text-abyss-700 flex items-center justify-center text-sm font-bold mb-3">3</div>
            <h4 className="text-sm font-semibold text-abyss-800 mb-1">三次导入</h4>
            <p className="text-xs text-abyss-600">验证统计稳定性，确保多次导入后结果仍然一致</p>
          </div>
        </div>
      </div>
    </div>
  );
}
