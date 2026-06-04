import React from 'react';
import { Image, Info } from 'lucide-react';
import { useMaterials } from '@/hooks/useMaterials';
import { MaterialUploader } from '@/components/material/MaterialUploader';
import { MaterialCard } from '@/components/material/MaterialCard';

export const RightPanel: React.FC = () => {
  const { materials } = useMaterials();

  return (
    <div className="w-72 bg-white border-l border-neutral-200 flex flex-col shadow-soft">
      <div className="p-4 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2 mb-3">
          <Image size={20} className="text-primary" />
          <h3 className="font-semibold text-neutral-700">素材库</h3>
          <span className="ml-auto text-sm text-neutral-500">{materials.length} 份</span>
        </div>
        <MaterialUploader />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {materials.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Image size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">暂无素材</p>
            <p className="text-xs mt-1">点击上方区域导入截图</p>
            <div className="mt-4 p-3 bg-neutral-50 rounded-lg text-left">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-neutral-500 leading-relaxed">
                  <p className="font-medium text-neutral-600 mb-1">使用说明：</p>
                  <p>1. 导入截图素材（支持批量）</p>
                  <p>2. 点击「开始审核」进入游戏</p>
                  <p>3. 选中素材后点击地图标记</p>
                  <p>4. 系统自动去重，避免重复结论</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {materials.map(material => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        )}
      </div>

      {materials.length > 0 && (
        <div className="p-3 border-t border-neutral-200 bg-neutral-50">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-neutral-100 rounded-lg">
              <div className="font-semibold text-neutral-600">
                {materials.filter(m => m.status === 'pending').length}
              </div>
              <div className="text-neutral-400">待审核</div>
            </div>
            <div className="p-2 bg-success/10 rounded-lg">
              <div className="font-semibold text-success">
                {materials.filter(m => m.status === 'hit').length}
              </div>
              <div className="text-neutral-400">已命中</div>
            </div>
            <div className="p-2 bg-danger/10 rounded-lg">
              <div className="font-semibold text-danger">
                {materials.filter(m => m.status === 'anomaly').length}
              </div>
              <div className="text-neutral-400">异常</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
