import { useState } from 'react';
import { Sparkles, Database, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function SampleDataModal() {
  const { loadSampleData, resetAllData } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadSample = () => {
    setIsLoading(true);
    setTimeout(() => {
      loadSampleData();
      setIsLoading(false);
    }, 500);
  };

  const handleSkip = () => {
    resetAllData();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-deep-900/90 backdrop-blur-sm" />
      
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-ocean-500/30 bg-gradient-to-br from-deep-600 to-deep-700 shadow-2xl shadow-ocean-500/10 overflow-hidden animate-fade-in-up">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ocean-400 via-ocean-500 to-ocean-400" />
        
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center shadow-lg shadow-ocean-500/30">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-display">欢迎使用风浪窗口系统</h2>
              <p className="text-sm text-gray-400">船员换班辅助决策工具</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-gray-300 text-sm leading-relaxed">
              这是您第一次使用本系统。我们为您准备了示例数据，您可以立即体验所有功能：
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Database size={16} className="text-ocean-400" />
                  <span className="text-sm font-medium text-white">20条浮标数据</span>
                </div>
                <p className="text-xs text-gray-500">4个站点的实时模拟数据</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Database size={16} className="text-ocean-400" />
                  <span className="text-sm font-medium text-white">3条修正记录</span>
                </div>
                <p className="text-xs text-gray-500">人工修正留痕示例</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Database size={16} className="text-ocean-400" />
                  <span className="text-sm font-medium text-white">12张巡检照片</span>
                </div>
                <p className="text-xs text-gray-500">包含问题标记的照片</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Database size={16} className="text-ocean-400" />
                  <span className="text-sm font-medium text-white">计算示例</span>
                </div>
                <p className="text-xs text-gray-500">风浪窗口计算结果</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleLoadSample}
              disabled={isLoading}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-ocean-500 to-ocean-600 text-white font-medium
                       hover:from-ocean-400 hover:to-ocean-500 transition-all duration-200
                       shadow-lg shadow-ocean-500/30 hover:shadow-ocean-500/50
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '加载中...' : '加载示例数据'}
            </button>
            <button
              onClick={handleSkip}
              className="py-3 px-6 rounded-xl border border-white/10 text-gray-400 font-medium
                       hover:bg-white/5 hover:text-white transition-all duration-200"
            >
              跳过
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            您可以随时在设置中重置数据并重新加载示例
          </p>
        </div>
      </div>
    </div>
  );
}
