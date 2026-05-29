import { useAppStore } from '../../store/useAppStore';
import { Toolbar } from '../ui/Toolbar';
import { FilterPanel } from '../ui/FilterPanel';
import { DetailPanel } from '../ui/DetailPanel';
import { ValidationModal } from '../ui/ValidationModal';
import { Scene3D } from '../three/Scene3D';
import { Plane } from 'lucide-react';

export function WorkspaceLayout() {
  const currentScene = useAppStore(state => state.currentScene);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-900">
      <Toolbar />
      
      <div className="flex-1 flex overflow-hidden">
        {currentScene && <FilterPanel />}
        
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentScene ? (
            <>
              <div className="flex-1 overflow-hidden">
                <Scene3D scene={currentScene} />
              </div>
              <DetailPanel />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 mb-6 rounded-full bg-blue-900/30 border border-blue-700 flex items-center justify-center">
                <Plane size={40} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                机场跑道净空模型可视化工具
              </h2>
              <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
                帮助机场规划员在扩建评审会中直观展示跑道周边建筑高度限制。
                支持数据校验、碰撞检测、筛选定位和多方案比较。
              </p>
              
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-left">
                  <div className="w-8 h-8 rounded bg-blue-900/50 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-sm font-medium mb-1">顺利样例</h3>
                  <p className="text-slate-500 text-xs">标准坐标系，数据完整，无错误</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-left">
                  <div className="w-8 h-8 rounded bg-orange-900/50 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-sm font-medium mb-1">坐标系错误样例</h3>
                  <p className="text-slate-500 text-xs">包含坐标系混用、缺字段、重复建筑等常见问题</p>
                </div>
              </div>
              
              <p className="text-slate-600 text-xs mt-8">
                点击顶部「加载数据」按钮开始使用
              </p>
            </div>
          )}
        </main>
      </div>
      
      <ValidationModal />
    </div>
  );
}
