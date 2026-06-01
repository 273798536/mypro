import { Eye, EyeOff, Tag, Camera, GitCompare, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export function ViewControls() {
  const { showRiskLabels, showLegend, toggleRiskLabels, toggleLegend, viewMode, setViewMode, currentWindParams, setCompareWindParams, compareWindParams } = useAppStore();
  const navigate = useNavigate();

  const handleSaveCompare = () => {
    setCompareWindParams({ ...currentWindParams });
  };

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
      <h3 className="text-white font-semibold mb-4">视图控制</h3>

      <div className="space-y-3">
        <button
          onClick={toggleRiskLabels}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            showRiskLabels
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {showRiskLabels ? <Tag className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span className="text-sm">风险标签</span>
        </button>

        <button
          onClick={toggleLegend}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            showLegend
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {showLegend ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span className="text-sm">显示图例</span>
        </button>

        <div className="border-t border-slate-600 pt-3 mt-3">
          <button
            onClick={handleSaveCompare}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm">保存为对比组</span>
          </button>

          {compareWindParams && (
            <button
              onClick={() => navigate('/compare')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg mt-2 bg-purple-600 text-white hover:bg-purple-500 transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              <span className="text-sm">查看对比视图</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
