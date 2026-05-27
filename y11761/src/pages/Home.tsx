import { useEffect } from 'react';
import { WaveScene } from '@/components/WaveScene';
import { ControlPanel } from '@/components/ControlPanel';
import { DetailPanel } from '@/components/DetailPanel';
import { TopBar } from '@/components/TopBar';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const { runAnomalyDetection, fps, setGridResolution, calculateAndAddScore } = useAppStore();

  useEffect(() => {
    const timer = setInterval(() => {
      runAnomalyDetection();
    }, 2000);

    return () => clearInterval(timer);
  }, [runAnomalyDetection]);

  useEffect(() => {
    if (fps < 25) {
      setGridResolution(64);
    } else if (fps > 50) {
      setGridResolution(96);
    }
  }, [fps, setGridResolution]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateAndAddScore();
    }, 1000);

    return () => clearTimeout(timer);
  }, [calculateAndAddScore]);

  return (
    <div
      id="app-container"
      className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden"
    >
      <TopBar />
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative">
          <WaveScene />
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 border border-slate-700 text-xs text-slate-400 max-w-xs">
            <div className="font-medium text-slate-300 mb-1">💡 使用提示</div>
            <ul className="space-y-1">
              <li>• 鼠标左键拖拽：旋转视角</li>
              <li>• 鼠标滚轮：缩放场景</li>
              <li>• 点击水面：添加采样点</li>
              <li>• 拖拽波源/障碍物：移动位置</li>
              <li>• 双击采样点/障碍物：删除</li>
            </ul>
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700">
              <div className="text-xs text-slate-500">色阶</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1D3557' }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3E92CC' }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#A8DADC' }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F4A261' }} />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E63946' }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>波谷</span>
                <span>波峰</span>
              </div>
            </div>
          </div>
        </div>
        <ControlPanel />
        <DetailPanel />
      </div>
    </div>
  );
}
