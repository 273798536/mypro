import { useState, useEffect } from 'react';
import { useFractalStore } from '@/store/fractalStore';
import { fractalEngine } from '@/utils/fractalEngine';
import { exportExperiment } from '@/utils/export';
import Card from '@/components/Card';
import Button from '@/components/Button';
import FractalCanvas from '@/components/FractalCanvas';
import ErrorDisplay from '@/components/ErrorDisplay';
import { InitialShape, ExportFormat } from '@/types';
import { 
  Play, 
  RotateCcw, 
  Save, 
  Download,
  Plus,
  Link,
  Info
} from 'lucide-react';

const initialShapes: { value: InitialShape; label: string }[] = [
  { value: 'koch', label: '科赫线段' },
  { value: 'sierpinski', label: '三角形' },
  { value: 'cantor', label: '康托尔线段' },
  { value: 'triangle', label: '等边三角形' },
  { value: 'square', label: '正方形' },
  { value: 'line', label: '直线' },
];

export default function Workspace() {
  const {
    currentExperiment,
    createExperiment,
    updateCurrentConfig,
    startExperiment,
    completeExperiment,
    addIterationResult,
    setCurrentStep,
    setCurrentPoints,
    saveToHistory,
    currentStep,
    currentPoints,
  } = useFractalStore();

  const [isRunning, setIsRunning] = useState(false);
  const [showRuleError, setShowRuleError] = useState(false);

  useEffect(() => {
    if (!currentExperiment) {
      createExperiment({}, '新实验');
    }
  }, [currentExperiment, createExperiment]);

  const handleRuleChange = (rule: string) => {
    updateCurrentConfig({ iterationRule: rule });
    const validation = fractalEngine.validateRule(rule);
    setShowRuleError(!validation.valid);
  };

  const runExperiment = async () => {
    if (!currentExperiment || isRunning) return;

    setIsRunning(true);
    startExperiment();

    const collectedResults: import('@/types').IterationResult[] = [];

    const result = await fractalEngine.iterate(
      currentExperiment.config,
      600,
      500,
      (stepResult) => {
        collectedResults.push(stepResult);
        addIterationResult(stepResult);
        setCurrentStep(stepResult.step);
        setCurrentPoints(stepResult);
      }
    );

    const finalDimension = collectedResults.length > 0
      ? collectedResults[collectedResults.length - 1].dimension
      : 0;
    completeExperiment(result.success, result.errorType, result.errorMessage, finalDimension);
    
    if (currentExperiment) {
      saveToHistory({
        ...currentExperiment,
        status: result.success ? 'success' : 'failed',
        errorType: result.errorType as any,
        errorMessage: result.errorMessage,
        fractalDimension: finalDimension,
        results: collectedResults,
      });
    }

    setIsRunning(false);
  };

  const resetExperiment = () => {
    if (currentExperiment) {
      createExperiment({ ...currentExperiment.config }, currentExperiment.name);
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (!currentExperiment) return;
    const canvas = (window as any).getFractalCanvas?.();
    exportExperiment(format, currentExperiment, canvas);
  };

  if (!currentExperiment) {
    return <div className="flex items-center justify-center h-96">加载中...</div>;
  }

  const ruleValidation = fractalEngine.validateRule(currentExperiment.config.iterationRule);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4 space-y-6">
        <Card title="参数配置" subtitle="设置分形迭代的各项参数">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                实验名称
              </label>
              <input
                type="text"
                value={currentExperiment.name}
                onChange={(e) => {
                  const updated = { ...currentExperiment, name: e.target.value };
                  useFractalStore.getState().setCurrentExperiment(updated);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                迭代规则
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentExperiment.config.iterationRule}
                  onChange={(e) => handleRuleChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm ${
                    showRuleError || !ruleValidation.valid
                      ? 'border-accent-danger bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="输入迭代规则，如 koch, sierpinski, cantor"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {ruleValidation.valid ? (
                    <span className="text-accent-success text-xs">✓ 语法正确</span>
                  ) : (
                    <span className="text-accent-danger text-xs">✗ 语法错误</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                可用规则: koch | sierpinski | cantor | scale: 因子
              </p>
              {!ruleValidation.valid && ruleValidation.message && (
                <p className="text-xs text-accent-danger mt-1">{ruleValidation.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                初始图形
              </label>
              <select
                value={currentExperiment.config.initialShape}
                onChange={(e) =>
                  updateCurrentConfig({ initialShape: e.target.value as InitialShape })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {initialShapes.map((shape) => (
                  <option key={shape.value} value={shape.value}>
                    {shape.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大迭代次数
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={currentExperiment.config.maxIterations}
                  onChange={(e) =>
                    updateCurrentConfig({ maxIterations: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  缩放级别
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={currentExperiment.config.zoomLevel}
                  onChange={(e) =>
                    updateCurrentConfig({ zoomLevel: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描边色
                </label>
                <input
                  type="color"
                  value={currentExperiment.config.colorScheme.stroke}
                  onChange={(e) =>
                    updateCurrentConfig({
                      colorScheme: {
                        ...currentExperiment.config.colorScheme,
                        stroke: e.target.value,
                      },
                    })
                  }
                  className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  填充色
                </label>
                <input
                  type="color"
                  value={
                    currentExperiment.config.colorScheme.fill.startsWith('#')
                      ? currentExperiment.config.colorScheme.fill
                      : '#000000'
                  }
                  onChange={(e) =>
                    updateCurrentConfig({
                      colorScheme: {
                        ...currentExperiment.config.colorScheme,
                        fill: e.target.value,
                      },
                    })
                  }
                  className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  背景色
                </label>
                <input
                  type="color"
                  value={currentExperiment.config.colorScheme.background}
                  onChange={(e) =>
                    updateCurrentConfig({
                      colorScheme: {
                        ...currentExperiment.config.colorScheme,
                        background: e.target.value,
                      },
                    })
                  }
                  className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                课堂备注
              </label>
              <textarea
                value={currentExperiment.config.note}
                onChange={(e) => updateCurrentConfig({ note: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                placeholder="记录课堂笔记、观察结果等..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={runExperiment}
                loading={isRunning}
                disabled={!ruleValidation.valid}
                icon={<Play className="w-4 h-4" />}
                className="flex-1"
              >
                {isRunning ? '迭代中...' : '开始迭代'}
              </Button>
              <Button
                variant="secondary"
                onClick={resetExperiment}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                重置
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-span-5 space-y-6">
        <Card
          title="实时预览"
          subtitle={`当前步数: ${currentStep} / ${currentExperiment.config.maxIterations}`}
        >
          <div className="flex justify-center">
            <FractalCanvas
              points={currentPoints?.points || []}
              colorScheme={currentExperiment.config.colorScheme}
              showError={currentExperiment.status === 'failed'}
              errorType={currentExperiment.errorType}
            />
          </div>

          {currentExperiment.status === 'failed' && currentExperiment.errorType && (
            <div className="mt-4">
              <ErrorDisplay
                errorType={currentExperiment.errorType}
                errorMessage={currentExperiment.errorMessage || '未知错误'}
                flashing={currentExperiment.errorType === 'explosion'}
              />
            </div>
          )}

          {currentExperiment.status === 'success' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <span className="font-semibold">✓ 迭代完成</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                共执行 {currentExperiment.results.length} 次迭代
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm text-gray-600">迭代进度:</label>
            <input
              type="range"
              min="0"
              max={Math.max(currentExperiment.results.length - 1, 0)}
              value={currentStep}
              onChange={(e) => {
                const step = parseInt(e.target.value);
                setCurrentStep(step);
                setCurrentPoints(currentExperiment.results[step] || null);
              }}
              className="flex-1"
              disabled={currentExperiment.results.length === 0}
            />
            <span className="text-sm font-mono text-gray-600 w-12">
              {currentStep}
            </span>
          </div>
        </Card>

        <Card title="导出选项">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => handleExport('png')}
              disabled={currentExperiment.status === 'idle' || currentExperiment.status === 'running'}
              icon={<Download className="w-4 h-4" />}
            >
              导出 PNG
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('pdf')}
              disabled={currentExperiment.status === 'idle' || currentExperiment.status === 'running'}
              icon={<Download className="w-4 h-4" />}
            >
              导出 PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('json')}
              disabled={currentExperiment.status === 'idle' || currentExperiment.status === 'running'}
              icon={<Download className="w-4 h-4" />}
            >
              导出 JSON
            </Button>
          </div>
        </Card>
      </div>

      <div className="col-span-3 space-y-6">
        <Card title="维度信息">
          <div className="space-y-4">
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">当前分形维度</p>
              <p className="text-3xl font-mono font-bold text-primary">
                {currentPoints?.dimension.toFixed(4) || '—'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">点数</p>
                <p className="text-lg font-mono font-semibold text-gray-700">
                  {currentPoints?.points.length || 0}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">步数</p>
                <p className="text-lg font-mono font-semibold text-gray-700">
                  {currentStep}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="溯源信息">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Link className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">迭代规则:</span>
              <span className="font-mono text-primary">
                {currentExperiment.config.iterationRule || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">初始图形:</span>
              <span className="font-medium">
                {initialShapes.find(s => s.value === currentExperiment.config.initialShape)?.label || '—'}
              </span>
            </div>
            {currentExperiment.sourceId && (
              <div className="flex items-center gap-2 text-sm">
                <Link className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">来源实验:</span>
                <button className="text-primary hover:underline text-xs">
                  {currentExperiment.sourceId.slice(0, 8)}...
                </button>
              </div>
            )}
          </div>
        </Card>

        <Card title="快速操作">
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => createExperiment({}, '新实验')}
            >
              新建实验
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              icon={<Save className="w-4 h-4" />}
              onClick={() => saveToHistory(currentExperiment)}
              disabled={currentExperiment.status === 'running'}
            >
              保存到历史
            </Button>
          </div>
        </Card>

        <Card title="规则说明" subtitle="支持的迭代规则格式">
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-primary" />
              <span><code className="bg-gray-100 px-1 rounded">koch</code> - 科赫雪花</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-primary" />
              <span><code className="bg-gray-100 px-1 rounded">sierpinski</code> - 谢尔宾斯基</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-primary" />
              <span><code className="bg-gray-100 px-1 rounded">cantor</code> - 康托尔集</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-accent-warning" />
              <span><code className="bg-gray-100 px-1 rounded">scale: N</code> - 缩放（可能爆炸）</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
