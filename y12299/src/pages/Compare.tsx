import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Scene3D } from '../components/Scene3D';
import { useAppStore } from '../store/useAppStore';

export function Compare() {
  const navigate = useNavigate();
  const { compareWindParams, currentWindParams } = useAppStore();

  if (!compareWindParams) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="bg-slate-800/50 border-b border-slate-700 px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
            <h1 className="text-white font-bold text-lg">参数对比</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400">请先在主页面保存对比参数</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
            >
              返回主页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800/50 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
            <h1 className="text-white font-bold text-lg">参数对比视图</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-4 p-4">
        <div className="flex-1 flex flex-col">
          <div className="bg-purple-900/30 border border-purple-700/50 rounded-t-lg px-4 py-2">
            <h3 className="text-purple-300 font-semibold text-sm">对比组 (已保存)</h3>
            <p className="text-purple-400/70 text-xs">
              风速: {compareWindParams.speed}m/s | 偏航: {compareWindParams.yawAngle}° | 俯仰: {compareWindParams.pitchAngle}°
            </p>
          </div>
          <div className="flex-1 rounded-b-lg overflow-hidden border border-slate-700 border-t-0">
            <Scene3D windParams={compareWindParams} className="w-full h-full" />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="bg-cyan-900/30 border border-cyan-700/50 rounded-t-lg px-4 py-2">
            <h3 className="text-cyan-300 font-semibold text-sm">当前组</h3>
            <p className="text-cyan-400/70 text-xs">
              风速: {currentWindParams.speed}m/s | 偏航: {currentWindParams.yawAngle}° | 俯仰: {currentWindParams.pitchAngle}°
            </p>
          </div>
          <div className="flex-1 rounded-b-lg overflow-hidden border border-slate-700 border-t-0">
            <Scene3D windParams={currentWindParams} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
