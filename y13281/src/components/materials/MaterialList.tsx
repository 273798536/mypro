import { Inbox, FileText } from 'lucide-react';
import { useFilteredMaterials } from '../../store/useAppStore';
import { MaterialCard } from './MaterialCard';

export function MaterialList() {
  const materials = useFilteredMaterials();

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-6">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-slate-700/50 flex items-center justify-center border border-slate-600">
            <Inbox className="w-10 h-10 text-slate-500" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-600">
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">暂无检查材料</h3>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          当前监测点暂无提交的检查材料，等待现场人员上传照片、边界记录或说明文档
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="text-sm text-slate-400">
          共 <span className="text-slate-200 font-semibold">{materials.length}</span> 条材料
        </div>
      </div>
      <div className="space-y-4 pb-4">
        {materials.map((material) => (
          <MaterialCard key={material.id} material={material} />
        ))}
      </div>
    </div>
  );
}
