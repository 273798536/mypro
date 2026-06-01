import { Viewer3D } from '../components/workspace/Viewer3D';
import { OrganList } from '../components/workspace/OrganList';
import { DoseControls } from '../components/workspace/DoseControls';
import { ViewPresets } from '../components/workspace/ViewPresets';
import { SelectionPanel } from '../components/workspace/SelectionPanel';
import { Camera, Camera as CameraIcon, Split } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function Workspace() {
  const { addScreenshot, organs, doses, selectedOrganId, selectedDoseId } = useAppStore();

  const handleScreenshot = () => {
    const selectedOrgans = organs.filter((o) => o.visible);
    const selectedDoses = doses.filter((d) => d.visible);
    
    addScreenshot({
      name: `截图 ${new Date().toLocaleString('zh-CN')}`,
      organIds: selectedOrgans.map((o) => o.id),
      doseIds: selectedDoses.map((d) => d.id),
      noteIds: [],
      imageUrl: '',
      thumbnailUrl: '',
      createTime: new Date(),
      cameraState: {
        position: [150, 100, 150],
        target: [0, 0, 0],
      },
    });
  };

  return (
    <div className="flex h-full">
      <div className="w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <OrganList />
          <DoseControls />
        </div>
        
        <div className="p-4 border-t border-slate-800">
          <ViewPresets />
        </div>
      </div>

      <div className="flex-1 relative">
        <Viewer3D />
        
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={handleScreenshot}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors border border-slate-700"
          >
            <CameraIcon size={16} />
            截图
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors border border-slate-700">
            <Split size={16} />
            版本对比
          </button>
        </div>

        <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-slate-300">X轴</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-slate-300">Y轴</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-slate-300">Z轴</span>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 bg-slate-800/90 rounded-lg p-3 text-xs text-slate-400">
          <div>鼠标左键: 旋转</div>
          <div>鼠标右键: 平移</div>
          <div>滚轮: 缩放</div>
        </div>
      </div>

      <div className="w-80 bg-slate-900/50 border-l border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">详情面板</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SelectionPanel />
        </div>
      </div>
    </div>
  );
}
