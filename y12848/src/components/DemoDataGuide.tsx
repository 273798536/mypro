import { X, Sparkles, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { useEthicsStore } from '../store/useEthicsStore';

export default function DemoDataGuide() {
  const [isVisible, setIsVisible] = useState(true);
  const loadDemoData = useEthicsStore((s) => s.loadDemoData);
  const hasVisitedBefore = useEthicsStore((s) => s.hasVisitedBefore);

  if (hasVisitedBefore || !isVisible) return null;

  return (
    <div className="fixed top-24 right-6 z-50 max-w-sm opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <div className="bg-white rounded-xl shadow-lg border border-primary-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">欢迎使用</span>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">已加载示例数据</p>
              <p className="text-xs text-gray-500">
                为了让您快速了解系统功能，我们已预置了一批示例数据，包括：
              </p>
            </div>
          </div>
          <ul className="text-xs text-gray-600 space-y-1.5 mb-4 ml-2">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
              12 个样本记录，包含各种状态
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
              完整的培养记录时间线
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
              1 组条码重复的示例数据
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
              复核意见与结论联动示例
            </li>
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => setIsVisible(false)}
              className="flex-1 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
            >
              开始使用
            </button>
            <button
              onClick={() => {
                loadDemoData();
                setIsVisible(false);
              }}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
