import { useState } from 'react';
import { useFractalStore } from '@/store/fractalStore';
import { fractalEngine } from '@/utils/fractalEngine';
import { exportBatchResults } from '@/utils/export';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Alert from '@/components/Alert';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Experiment, ExperimentConfig, InitialShape } from '@/types';
import { 
  Play, 
  Plus, 
  Trash2, 
  Upload,
  Download,
  Layers,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

const defaultConfig: ExperimentConfig = {
  iterationRule: 'koch',
  initialShape: 'koch',
  colorScheme: {
    stroke: '#0A2463',
    fill: 'transparent',
    background: '#F8F9FA',
  },
  maxIterations: 4,
  zoomLevel: 1,
  note: '',
};

export default function Batch() {
  const { createBatchJob, updateBatchJob, batchJobs, saveToHistory } = useFractalStore();
  const [experiments, setExperiments] = useState<Array<{ name: string; config: ExperimentConfig }>>([
    { name: '实验 1', config: { ...defaultConfig } },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [results, setResults] = useState<Experiment[]>([]);

  const addExperiment = () => {
    setExperiments([
      ...experiments,
      { name: `实验 ${experiments.length + 1}`, config: { ...defaultConfig } },
    ]);
  };

  const removeExperiment = (index: number) => {
    if (experiments.length > 1) {
      setExperiments(experiments.filter((_, i) => i !== index));
    }
  };

  const updateExperimentConfig = (index: number, updates: Partial<ExperimentConfig>) => {
    const newExperiments = [...experiments];
    newExperiments[index] = {
      ...newExperiments[index],
      config: { ...newExperiments[index].config, ...updates },
    };
    setExperiments(newExperiments);
  };

  const updateExperimentName = (index: number, name: string) => {
    const newExperiments = [...experiments];
    newExperiments[index] = { ...newExperiments[index], name };
    setExperiments(newExperiments);
  };

  const runBatch = async () => {
    setIsRunning(true);
    setResults([]);

    const job = createBatchJob('批量计算任务', []);
    const executedResults: Experiment[] = [];

    for (let i = 0; i < experiments.length; i++) {
      setCurrentIndex(i);
      
      const expConfig = experiments[i];
      const experiment: Experiment = {
        id: Math.random().toString(36).substring(2, 15),
        name: expConfig.name,
        config: expConfig.config,
        status: 'running',
        results: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await fractalEngine.iterate(
        expConfig.config,
        600,
        500,
        () => {}
      );

      experiment.status = result.success ? 'success' : 'failed';
      experiment.errorType = result.errorType as any;
      experiment.errorMessage = result.errorMessage;

      executedResults.push(experiment);
      saveToHistory(experiment);

      updateBatchJob(job.id, {
        experiments: executedResults,
        progress: ((i + 1) / experiments.length) * 100,
      });
    }

    updateBatchJob(job.id, { status: 'completed' });
    setResults(executedResults);
    setIsRunning(false);
    setCurrentIndex(-1);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          setExperiments(data.map((item, index) => ({
            name: item.name || `导入实验 ${index + 1}`,
            config: item.config || { ...defaultConfig },
          })));
        }
      } catch (error) {
        console.error('导入失败:', error);
      }
    };
    reader.readAsText(file);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      <Alert type="info" title="批量计算说明">
        批量运行多个分形迭代实验，统一查看成功/失败结果统计，支持导出完整报告。
      </Alert>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <Card 
            title="实验队列" 
            subtitle={`共 ${experiments.length} 个实验`}
            headerAction={
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button variant="ghost" size="sm" icon={<Upload className="w-4 h-4" />}>
                    导入JSON
                  </Button>
                </label>
                <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addExperiment}>
                  添加实验
                </Button>
              </div>
            }
          >
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {experiments.map((exp, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg transition-all ${
                    currentIndex === index 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={exp.name}
                        onChange={(e) => updateExperimentName(index, e.target.value)}
                        className="font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none"
                      />
                      {currentIndex === index && isRunning && (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4 text-gray-400" />}
                      onClick={() => removeExperiment(index)}
                      disabled={experiments.length === 1 || isRunning}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">迭代规则</label>
                      <input
                        type="text"
                        value={exp.config.iterationRule}
                        onChange={(e) => updateExperimentConfig(index, { iterationRule: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono"
                        disabled={isRunning}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">初始图形</label>
                      <select
                        value={exp.config.initialShape}
                        onChange={(e) => updateExperimentConfig(index, { initialShape: e.target.value as InitialShape })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        disabled={isRunning}
                      >
                        <option value="koch">科赫线段</option>
                        <option value="sierpinski">三角形</option>
                        <option value="cantor">康托尔线段</option>
                        <option value="triangle">等边三角形</option>
                        <option value="square">正方形</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">迭代次数</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={exp.config.maxIterations}
                        onChange={(e) => updateExperimentConfig(index, { maxIterations: parseInt(e.target.value) || 1 })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <Button
                size="lg"
                className="w-full"
                onClick={runBatch}
                loading={isRunning}
                icon={<Play className="w-5 h-5" />}
                disabled={isRunning}
              >
                {isRunning ? `正在计算... (${currentIndex + 1}/${experiments.length})` : '开始批量计算'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="col-span-4 space-y-6">
          <Card title="执行状态">
            {isRunning ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">进度</span>
                  <span className="font-mono">{Math.round(((currentIndex + 1) / experiments.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / experiments.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  正在处理第 {currentIndex + 1} 个实验...
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-accent-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-accent-success">{successCount}</p>
                    <p className="text-xs text-gray-500">成功</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <XCircle className="w-8 h-8 text-accent-danger mx-auto mb-2" />
                    <p className="text-2xl font-bold text-accent-danger">{failedCount}</p>
                    <p className="text-xs text-gray-500">失败</p>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => exportBatchResults(results, 'json')}
                >
                  导出结果JSON
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">等待执行</p>
              </div>
            )}
          </Card>

          {results.length > 0 && (
            <Card title="结果详情">
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{result.name}</span>
                      {result.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-accent-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-accent-danger" />
                      )}
                    </div>
                    {result.errorType && result.errorMessage && (
                      <ErrorDisplay
                        errorType={result.errorType}
                        errorMessage={result.errorMessage}
                      />
                    )}
                    {result.fractalDimension && (
                      <p className="text-xs text-gray-500 mt-1">
                        分形维度: <span className="font-mono">{result.fractalDimension.toFixed(4)}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {batchJobs.length > 0 && (
            <Card title="历史任务">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {batchJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="p-3 border border-gray-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{job.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        job.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {job.status === 'completed' ? '已完成' : '进行中'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {job.experiments.length} 个实验 · {Math.round(job.progress)}%
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
