import { useFitStore } from '../hooks/useFitStore';
import { models, sampleDatasets } from '../utils/models';
import Latex from './Latex';

export default function DataInput() {
  const {
    rawData,
    setRawData,
    selectedModelId,
    setSelectedModel,
    initialParams,
    setInitialParam,
    loadSampleData,
    runFit,
    isFitting,
    xData,
    reset,
  } = useFitStore();

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-300">样例数据</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {sampleDatasets.map((ds) => (
            <button
              key={ds.id}
              onClick={() => loadSampleData(ds.id)}
              className="px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
            >
              {ds.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">
          数据输入
          <span className="text-zinc-500 font-normal ml-2">
            (每行: x, y — 支持逗号/空格/分号分隔)
          </span>
        </h3>
        <textarea
          value={rawData}
          onChange={(e) => setRawData(e.target.value)}
          placeholder={"0, 100.2\n1, 60.5\n2, 36.8\n..."}
          className="w-full h-40 bg-zinc-900/80 border border-zinc-700 rounded-lg p-3 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
        />
        {xData.length > 0 && (
          <p className="text-xs text-zinc-500 mt-1">
            已解析 {xData.length} 个数据点
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">拟合模型</h3>
        <div className="grid grid-cols-2 gap-2">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedModelId === m.id
                  ? 'border-amber-500/70 bg-amber-500/10'
                  : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
              }`}
            >
              <div className="text-sm font-medium text-zinc-200 mb-1">
                {m.name}
              </div>
              <div className="text-xs text-zinc-500 mb-2 overflow-hidden">
                <Latex formula={m.latexFormula} displayMode={false} />
              </div>
              <div className="text-[10px] text-zinc-600 leading-tight">
                {m.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedModel && (
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-2">参数初值</h3>
          <div className="grid grid-cols-3 gap-3">
            {selectedModel.paramNames.map((name, i) => (
              <div key={name}>
                <label className="block text-xs text-zinc-500 mb-1">
                  {name}
                </label>
                <input
                  type="number"
                  step="any"
                  value={initialParams[i]}
                  onChange={(e) =>
                    setInitialParam(i, parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-md px-2 py-1.5 text-sm font-mono text-zinc-200 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={runFit}
          disabled={isFitting || xData.length < 3}
          className="flex-1 py-2.5 rounded-lg bg-amber-500 text-zinc-900 font-medium text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isFitting ? '拟合中...' : '执行拟合'}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-600 hover:text-zinc-300 transition-colors"
        >
          重置
        </button>
      </div>
    </div>
  );
}
