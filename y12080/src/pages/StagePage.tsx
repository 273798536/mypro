import { Toolbar } from '../components/panels/Toolbar';
import { LightPanel } from '../components/panels/LightPanel';
import { ResultPanel } from '../components/panels/ResultPanel';
import { Stage3D } from '../components/stage/Stage3D';

export function StagePage() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-950">
      <div className="w-64 h-full flex-shrink-0">
        <LightPanel />
      </div>
      
      <div className="flex-1 relative">
        <div id="stage-container" className="w-full h-full">
          <Stage3D />
        </div>
        <Toolbar />
        
        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg max-w-md">
          <div className="font-bold mb-1">💡 使用提示</div>
          <ul className="space-y-0.5 text-gray-300">
            <li>• 点击灯具查看并调整参数</li>
            <li>• 点击冲突标注查看详细信息</li>
            <li>• 使用工具栏控制播放和视图</li>
            <li>• 导出截图用于会议沟通</li>
          </ul>
        </div>
      </div>
      
      <div className="w-72 h-full flex-shrink-0">
        <ResultPanel />
      </div>
    </div>
  );
}
