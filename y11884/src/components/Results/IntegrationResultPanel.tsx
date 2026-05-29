import React, { useState } from 'react';
import { useAppStore, storeActions } from '../../store/appStore';
import {
  Calculator,
  Play,
  FileText,
  Download,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  computeLineIntegralTrapezoidal,
  computeLineIntegralSimpson,
  generateIntegrationExplanation,
} from '../../utils/math/integration';
import { validatePath } from '../../utils/math/geometry';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const IntegrationResultPanel: React.FC = () => {
  const paths = useAppStore((state) => state.paths);
  const activeField = storeActions.getActiveField();
  const results = useAppStore((state) => state.results);
  const settings = useAppStore((state) => state.settings);
  const [isComputing, setIsComputing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const method = settings.integrationMethod;

  const computePathIntegral = async (pathIndex: number) => {
    const path = paths[pathIndex];
    if (!activeField || path.nodes.length < 2) return;

    const validation = validatePath(
      path.nodes, activeField.bounds, path.sampleStep);
    validation.suggestions.forEach((msg) => {
      storeActions.addWarning('warning', msg);
    });

    setIsComputing(true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const compute =
      method === 'trapezoidal'
        ? computeLineIntegralTrapezoidal
        : computeLineIntegralSimpson;

    const result = compute(path, activeField);
    storeActions.addIntegrationResult(result);
    setIsComputing(false);

    return result;
  };

  const computeBoth = async () => {
    computePathIntegral(0);
    computePathIntegral(1);
  };

  const createReport = () => {
    const report = storeActions.createComparisonReport(paths[0].id, paths[1].id);
    if (report) {
      setShowComparison(true);
    }
    return report;
  };

  const getResultForPath = (pathId: string) => {
    return results.find((r) => r.pathId === pathId);
  };

  const explanation = generateIntegrationExplanation(method);
  const resultA = getResultForPath(paths[0]?.id);
  const resultB = getResultForPath(paths[1]?.id);

  const chartData = {
    labels: ['路径 A', '路径 B'],
    datasets: [
      {
        label: '积分值',
        data: [resultA?.value || 0, resultB?.value || 0],
        backgroundColor: ['rgba(22, 93, 255, 0.7)', 'rgba(123, 97, 255, 0.7)'],
        borderColor: ['#165DFF', '#7B61FF'],
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          积分计算
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={method}
            onChange={(e) =>
              storeActions.updateSettings({
                integrationMethod: e.target.value as any,
              })
            }
            className="text-xs px-2 py-1 border border-gray-200 rounded"
          >
            <option value="trapezoidal">梯形法</option>
            <option value="simpson">辛普森法</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">
        <BlockMath math={explanation.formula} />
      </div>
      <p className="text-xs text-gray-600">{explanation.description}</p>

      <div className="grid grid-cols-2 gap-3">
        {paths.map((path, idx) => {
          const result = getResultForPath(path.id);
          const label = idx === 0 ? 'A' : 'B';
          return (
            <div
              key={path.id}
              className="bg-white border border-gray-200 rounded-lg p-3"
              style={{ borderTopColor: path.color, borderTopWidth: 3 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">路径 {label}</span>
                <button
                  onClick={() => computePathIntegral(idx)}
                  disabled={path.nodes.length < 2 || isComputing}
                  className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="计算积分"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
              {result ? (
                <div className="space-y-1">
                <div className="text-2xl font-bold" style={{ color: path.color }}>
                  {result.value.toFixed(4)}
                </div>
                <div className="text-xs text-gray-500">
                  <div>误差: ±{result.numericalError.toFixed(6)}</div>
                  <div>采样数: {result.sampleCount}</div>
                  <div>耗时: {result.computationTime.toFixed(2)}ms</div>
                </div>
              </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  {path.nodes.length < 2
                    ? '需要至少2个节点'
                    : '点击计算'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={computeBoth}
        disabled={isComputing}
        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-70"
      >
        <RefreshCw className={`w-4 h-4 ${isComputing ? 'animate-spin' : ''}`} />
        计算两条路径
      </button>

      {resultA && resultB && (
        <>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              结果对比
            </h4>
            <div className="h-40 bg-white p-2 rounded border border-gray-200">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">
              差异分析
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">绝对差值:</span>
                <span className="font-mono">
                  {Math.abs(resultA.value - resultB.value).toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">相对差异:</span>
                <span className="font-mono">
                  {(
                    (Math.abs(resultA.value - resultB.value) /
                    (Math.max(Math.abs(resultA.value), Math.abs(resultB.value)) || 1)) * 100
                  ).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">方向因子 A/B:</span>
                <span className="font-mono">
                  {resultA.directionFactor.toFixed(2)} / {resultB.directionFactor.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={createReport}
            className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            生成分析报告
          </button>
        </>
      )}

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          计算步骤
        </h4>
        <ol className="text-xs text-gray-600 space-y-1">
          {explanation.steps.map((step, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-blue-500 font-bold">{idx + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default IntegrationResultPanel;

