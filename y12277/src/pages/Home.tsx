import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FilterBar } from '../components/ui/FilterBar';
import { SidePanel } from '../components/ui/SidePanel';
import { Timeline } from '../components/ui/Timeline';
import { AnomalyCenter } from '../components/ui/AnomalyCenter';
import { RiskMountainScene } from '../components/three/RiskMountainScene';
import { useAppStore } from '../store/useAppStore';
import { AlertTriangle, FileText } from 'lucide-react';

export default function Home() {
  const [showAnomalyCenter, setShowAnomalyCenter] = useState(false);
  const getCurrentMonthAnomalies = useAppStore(state => state.getCurrentMonthAnomalies);

  const currentAnomalies = getCurrentMonthAnomalies();

  return (
    <div className="h-screen flex flex-col bg-[#0a1628] overflow-hidden">
      <FilterBar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <RiskMountainScene />

          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <Link
              to="/anomalies"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1628]/90 backdrop-blur-md border border-[#1e3a5f] rounded-lg text-sm text-white hover:bg-[#1e3a5f]/50 transition-all"
            >
              <AlertTriangle size={16} className="text-[#ff0040]" />
              异常中心
              {currentAnomalies.length > 0 && (
                <span className="bg-[#ff0040] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {currentAnomalies.length}
                </span>
              )}
            </Link>
            <button
              onClick={() => setShowAnomalyCenter(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1628]/90 backdrop-blur-md border border-[#1e3a5f] rounded-lg text-sm text-white hover:bg-[#1e3a5f]/50 transition-all"
            >
              <FileText size={16} className="text-[#3a6ea5]" />
              快速查看
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-[#0a1628]/90 backdrop-blur-md border border-[#1e3a5f] rounded-lg p-3">
              <div className="text-[10px] text-[#6b8bb0] uppercase tracking-wider mb-2">风险图例</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#00d4aa' }} />
                  <span className="text-[11px] text-[#8ba3c7]">低风险</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ffb300' }} />
                  <span className="text-[11px] text-[#8ba3c7]">中风险</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff3b30' }} />
                  <span className="text-[11px] text-[#8ba3c7]">高风险</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#1e3a5f]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded animate-pulse" style={{ backgroundColor: '#ff0040' }} />
                    <span className="text-[11px] text-[#8ba3c7]">指标缺月</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff8c00' }} />
                    <span className="text-[11px] text-[#8ba3c7]">区域重叠</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#9c27b0' }} />
                    <span className="text-[11px] text-[#8ba3c7]">得分异常</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-4 left-4 z-10">
            <div className="bg-[#0a1628]/90 backdrop-blur-md border border-[#1e3a5f] rounded-lg p-3">
              <div className="text-[10px] text-[#6b8bb0] uppercase tracking-wider mb-2">操作提示</div>
              <div className="text-[11px] text-[#8ba3c7] space-y-1">
                <p>• 鼠标拖动旋转视角</p>
                <p>• 滚轮缩放场景</p>
                <p>• 点击机构查看详情</p>
              </div>
            </div>
          </div>
        </div>

        <SidePanel />
      </div>

      <Timeline />

      {showAnomalyCenter && (
        <AnomalyCenter onClose={() => setShowAnomalyCenter(false)} />
      )}
    </div>
  );
}
