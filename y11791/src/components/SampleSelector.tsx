import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, FolderOpen } from 'lucide-react';
import { sampleData } from '../data/sampleData';
import { useSimulationStore } from '../store/simulationStore';

const sampleIcons: Record<string, React.ReactNode> = {
  normal: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  boundary: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  badData: <XCircle className="w-5 h-5 text-red-500" />,
};

const sampleStyles: Record<string, string> = {
  normal: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
  boundary: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50',
  badData: 'border-red-200 hover:border-red-400 hover:bg-red-50',
};

export const SampleSelector: React.FC = () => {
  const { setParams, clearResult } = useSimulationStore();

  const handleLoadSample = (key: string) => {
    const sample = sampleData[key];
    if (sample) {
      setParams(sample.params, `加载样例: ${sample.name}`);
      clearResult();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cyan-100 rounded-xl">
          <FolderOpen className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">样例数据</h2>
          <p className="text-xs text-slate-500">一键加载预设参数组合</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(sampleData).map(([key, sample]) => (
          <button
            key={key}
            onClick={() => handleLoadSample(key)}
            className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${sampleStyles[key]}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {sampleIcons[key]}
              <span className="font-semibold text-slate-800">{sample.name}</span>
            </div>
            <p className="text-xs text-slate-500">{sample.description}</p>
            <div className="mt-2 text-xs text-slate-400">
              r={sample.params.radius}mm · h={sample.params.height}m
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
