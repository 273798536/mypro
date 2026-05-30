import { useAppStore } from '@/store/appStore';
import { Settings, Calendar, Gauge, TrendingUp, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ParamConfig() {
  const { uploadedFiles, analysisParams, setParams, runAnalysis, isAnalyzing } = useAppStore();
  
  const allFields = uploadedFiles.flatMap(f => f.fields);
  const uniqueFieldNames = [...new Set(allFields.map(f => f.name))];
  
  const timeFields = uniqueFieldNames.filter(name => 
    allFields.find(f => f.name === name)?.type === 'time'
  );
  const metricFields = uniqueFieldNames.filter(name => 
    allFields.find(f => f.name === name)?.type === 'metric'
  );
  const groupFields = uniqueFieldNames.filter(name => 
    allFields.find(f => f.name === name)?.type === 'group'
  );

  const canRunAnalysis = analysisParams.timeField && analysisParams.metricFields.length >= 2;

  const toggleMetricField = (field: string) => {
    const current = analysisParams.metricFields;
    if (current.includes(field)) {
      setParams({ metricFields: current.filter(f => f !== field) });
    } else {
      setParams({ metricFields: [...current, field] });
    }
  };

  const toggleGroupField = (field: string) => {
    const current = analysisParams.groupFields;
    if (current.includes(field)) {
      setParams({ groupFields: current.filter(f => f !== field) });
    } else {
      setParams({ groupFields: [...current, field] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-300">
        <Settings className="h-5 w-5" />
        <h3 className="font-medium">分析参数配置</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-800 rounded p-3">
          <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Calendar className="h-4 w-4" />
            时间字段
          </label>
          <select
            value={analysisParams.timeField}
            onChange={(e) => setParams({ timeField: e.target.value })}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">请选择时间字段</option>
            {timeFields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800 rounded p-3">
          <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Target className="h-4 w-4" />
            指标字段（至少选择2个）
          </label>
          <div className="flex flex-wrap gap-2">
            {metricFields.map(field => (
              <button
                key={field}
                onClick={() => toggleMetricField(field)}
                className={cn(
                  "px-3 py-1.5 rounded text-sm transition-colors",
                  analysisParams.metricFields.includes(field)
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
              >
                {field}
              </button>
            ))}
          </div>
          {analysisParams.metricFields.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              已选择 {analysisParams.metricFields.length} 个指标
            </p>
          )}
        </div>

        <div className="bg-slate-800 rounded p-3">
          <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Gauge className="h-4 w-4" />
            分组字段（可选）
          </label>
          <div className="flex flex-wrap gap-2">
            {groupFields.map(field => (
              <button
                key={field}
                onClick={() => toggleGroupField(field)}
                className={cn(
                  "px-3 py-1.5 rounded text-sm transition-colors",
                  analysisParams.groupFields.includes(field)
                    ? "bg-amber-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
              >
                {field}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 rounded p-3">
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Clock className="h-4 w-4" />
              最大滞后阶数
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={analysisParams.maxLag}
              onChange={(e) => setParams({ maxLag: parseInt(e.target.value) || 6 })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-800 rounded p-3">
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              相关系数阈值
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={analysisParams.correlationThreshold}
              onChange={(e) => setParams({ correlationThreshold: parseFloat(e.target.value) || 0.7 })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-slate-800 rounded p-3">
          <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Gauge className="h-4 w-4" />
            趋势检测阈值
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={analysisParams.trendThreshold}
            onChange={(e) => setParams({ trendThreshold: parseFloat(e.target.value) || 0.6 })}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={runAnalysis}
        disabled={!canRunAnalysis || isAnalyzing}
        className={cn(
          "w-full py-3 rounded font-medium transition-all flex items-center justify-center gap-2",
          canRunAnalysis && !isAnalyzing
            ? "bg-cyan-600 hover:bg-cyan-500 text-white"
            : "bg-slate-700 text-slate-500 cursor-not-allowed"
        )}
      >
        {isAnalyzing ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-400 border-t-cyan-400 rounded-full animate-spin" />
            分析中...
          </>
        ) : (
          <>
            <TrendingUp className="h-5 w-5" />
            开始分析
          </>
        )}
      </button>

      {!canRunAnalysis && uploadedFiles.length > 0 && (
        <p className="text-xs text-amber-400 text-center">
          请先选择时间字段和至少2个指标字段
        </p>
      )}
    </div>
  );
}
