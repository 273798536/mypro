import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { DataLoader } from './DataLoader';
import { AttitudeSliders } from './AttitudeSliders';
import { DataQualityIndicator } from './DataQualityIndicator';

export const ControlPanel = () => {
  const { isPanelCollapsed, togglePanel } = useAttitudeStore();

  if (isPanelCollapsed) {
    return (
      <button
        onClick={togglePanel}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 p-2 rounded-l-lg border border-r-0 transition-all hover:bg-blue-500/10"
        style={{
          backgroundColor: 'rgba(10, 22, 40, 0.95)',
          borderColor: '#1e3a5f',
          color: '#1890ff',
        }}
      >
        <ChevronLeft size={20} />
      </button>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 bottom-24 w-80 z-30 overflow-y-auto"
      style={{
        backgroundColor: 'rgba(10, 22, 40, 0.97)',
        borderLeft: '1px solid #1e3a5f',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: 'rgba(10, 22, 40, 0.98)', borderColor: '#1e3a5f' }}>
        <h2 className="text-sm font-bold" style={{ color: '#e8f4ff', fontFamily: 'Orbitron, sans-serif' }}>
          控制面板
        </h2>
        <button
          onClick={togglePanel}
          className="p-1 rounded hover:bg-slate-700/50 transition-colors"
          style={{ color: '#64748b' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <DataLoader />

        <div className="border-t pt-4" style={{ borderColor: '#1e3a5f' }}>
          <DataQualityIndicator />
        </div>

        <div className="border-t pt-4" style={{ borderColor: '#1e3a5f' }}>
          <AttitudeSliders />
        </div>

        <div
          className="p-3 rounded-lg text-xs"
          style={{
            backgroundColor: 'rgba(30, 58, 95, 0.3)',
            border: '1px solid #1e3a5f',
            color: '#94a3b8',
          }}
        >
          <div className="font-medium mb-1" style={{ color: '#e8f4ff' }}>操作提示</div>
          <ul className="space-y-1 opacity-80">
            <li>• 鼠标左键拖动：旋转视角</li>
            <li>• 鼠标滚轮：缩放</li>
            <li>• 鼠标右键拖动：平移</li>
            <li>• 双击场景：重置视角</li>
            <li>• 点击时间轴关键帧：跳转到对应时刻</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
