import { Upload, FileText, AlertCircle, Zap, TrendingUp, Lock, Shuffle, CheckCircle } from 'lucide-react';
import type { ImportSample } from '../types';

interface ImportPageProps {
  samples: ImportSample[];
  selectedSample: ImportSample | null;
  onLoadSample: (sample: ImportSample) => void;
  isLoading: boolean;
}

const scenarioIcons = {
  normal: CheckCircle,
  night_jump: Zap,
  margin_change: TrendingUp,
  fund_freeze: Lock,
  mixed: Shuffle,
};

const scenarioColors = {
  normal: 'bg-green-100 text-green-700 border-green-200',
  night_jump: 'bg-amber-100 text-amber-700 border-amber-200',
  margin_change: 'bg-blue-100 text-blue-700 border-blue-200',
  fund_freeze: 'bg-red-100 text-red-700 border-red-200',
  mixed: 'bg-purple-100 text-purple-700 border-purple-200',
};

const scenarioLabels = {
  normal: '正常场景',
  night_jump: '夜盘跳价',
  margin_change: '保证金率切换',
  fund_freeze: '出金冻结',
  mixed: '综合场景',
};

export function ImportPage({ samples, selectedSample, onLoadSample, isLoading }: ImportPageProps) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">导入样例数据</h2>
        <p className="text-gray-600">
          选择一个业务场景样例，系统将自动加载客户持仓、成交流水、出入金记录和夜盘行情数据，
          并执行保证金重算。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {samples.map((sample) => {
          const Icon = scenarioIcons[sample.scenario];
          const isSelected = selectedSample?.id === sample.id;
          
          return (
            <div
              key={sample.id}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary-500 border-primary-500' : ''
              } ${sample.scenario === 'night_jump' ? 'border-amber-300' : ''}`}
              onClick={() => !isLoading && onLoadSample(sample)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg border ${scenarioColors[sample.scenario]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{sample.name}</h3>
                    <span className={`badge ${scenarioColors[sample.scenario]}`}>
                      {scenarioLabels[sample.scenario]}
                    </span>
                    {sample.scenario === 'night_jump' && (
                      <span className="badge bg-red-100 text-red-700">
                        <Zap className="w-3 h-3 mr-1" />
                        失败路径验证
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{sample.description}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  className={`w-full btn-primary flex items-center justify-center gap-2 py-3 text-base font-medium ${
                    isLoading ? 'opacity-70' : ''
                  }`}
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadSample(sample);
                  }}
                >
                  {isLoading && isSelected ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      加载中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      导入样例
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            关键场景说明
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="evidence-highlight">
            <h4 className="font-medium text-amber-800 mb-2">🔍 夜盘跳价场景</h4>
            <p className="text-sm text-amber-700">
              IF2606合约夜盘跳空高开1.82%，导致客户保证金需求激增。
              系统会高亮显示跳价前后的保证金差异，并标记为关键证据。
            </p>
          </div>
          
          <div className="evidence-highlight">
            <h4 className="font-medium text-amber-800 mb-2">🔄 保证金率切换场景</h4>
            <p className="text-sm text-amber-700">
              IC2606合约保证金率从12%上调至15%，系统会记录每次调整的时间、
              调整前后的比率，并关联到受影响的客户持仓。
            </p>
          </div>
          
          <div className="evidence-highlight">
            <h4 className="font-medium text-amber-800 mb-2">❄️ 出金冻结场景</h4>
            <p className="text-sm text-amber-700">
              客户日终申请出金50万，但夜盘行情导致保证金不足，
              出金申请被系统自动冻结。系统保留原申请记录和冻结记录作为证据链。
            </p>
          </div>
          
          <div className="evidence-highlight">
            <h4 className="font-medium text-amber-800 mb-2">⚖️ 证据链机制</h4>
            <p className="text-sm text-amber-700">
              当客户持仓保证金与成交流水计算结果不一致时，
              系统会自动关联出入金记录作为补充证据，确保核对过程可追溯。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <FileText className="w-4 h-4" />
          <span>也可以上传自定义数据文件（Excel/CSV格式）</span>
        </div>
        <div className="mt-4">
          <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            上传文件
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" />
          </label>
        </div>
      </div>
    </div>
  );
}
