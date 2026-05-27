import {
  MousePointer2,
  RotateCw,
  Scissors,
  MapPin,
  Move,
  Box,
  Pyramid,
  Cylinder,
  Cone,
  Circle,
  Hexagon,
  Triangle,
} from 'lucide-react';
import type { ToolMode, GeometryType } from '@/types';
import { useStore } from '@/store';
import { createDefaultGeometry, createDefaultAxis, createDefaultSectionPlane } from '@/utils/geometry';

const tools: { mode: ToolMode; icon: React.ElementType; label: string }[] = [
  { mode: 'select', icon: MousePointer2, label: '选择' },
  { mode: 'move', icon: Move, label: '移动' },
  { mode: 'rotate', icon: RotateCw, label: '旋转' },
  { mode: 'section', icon: Scissors, label: '截面' },
  { mode: 'annotate', icon: MapPin, label: '标注' },
];

const geometries: { type: GeometryType; icon: React.ElementType; label: string }[] = [
  { type: 'cube', icon: Box, label: '正方体' },
  { type: 'pyramid', icon: Pyramid, label: '四棱锥' },
  { type: 'cylinder', icon: Cylinder, label: '圆柱' },
  { type: 'cone', icon: Cone, label: '圆锥' },
  { type: 'sphere', icon: Circle, label: '球体' },
  { type: 'prism', icon: Hexagon, label: '三棱柱' },
  { type: 'tetrahedron', icon: Triangle, label: '四面体' },
];

export function Toolbar() {
  const { toolMode, setToolMode, addGeometry, addRotationAxis, addSectionPlane } = useStore();

  const handleAddGeometry = (type: GeometryType) => {
    addGeometry(createDefaultGeometry(type));
  };

  const handleAddAxis = (type: 'x' | 'y' | 'z') => {
    addRotationAxis(createDefaultAxis(type));
  };

  const handleAddSectionPlane = () => {
    addSectionPlane(createDefaultSectionPlane());
  };

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
      <div className="panel p-2 flex flex-col gap-1 w-16">
        <div className="text-xs text-white/50 text-center py-1 border-b border-white/10 mb-1">
          工具
        </div>
        {tools.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            className={`tool-btn flex flex-col items-center gap-1 ${
              toolMode === mode ? 'active' : ''
            }`}
            onClick={() => setToolMode(mode)}
            title={label}
          >
            <Icon size={20} />
            <span className="text-[10px]">{label}</span>
          </button>
        ))}

        <div className="border-t border-white/10 my-1" />

        <div className="text-xs text-white/50 text-center py-1 border-b border-white/10 mb-1">
          几何体
        </div>
        {geometries.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            className="tool-btn flex flex-col items-center gap-1 hover:bg-primary-600/50"
            onClick={() => handleAddGeometry(type)}
            title={`添加${label}`}
          >
            <Icon size={18} />
            <span className="text-[9px]">{label}</span>
          </button>
        ))}

        <div className="border-t border-white/10 my-1" />

        <div className="text-xs text-white/50 text-center py-1 border-b border-white/10 mb-1">
          辅助
        </div>
        <button
          className="tool-btn flex flex-col items-center gap-1 hover:bg-red-500/30"
          onClick={() => handleAddAxis('x')}
          title="添加X轴"
        >
          <div className="w-4 h-0.5 bg-red-500 rounded" />
          <span className="text-[9px] text-red-400">X轴</span>
        </button>
        <button
          className="tool-btn flex flex-col items-center gap-1 hover:bg-green-500/30"
          onClick={() => handleAddAxis('y')}
          title="添加Y轴"
        >
          <div className="w-0.5 h-4 bg-green-500 rounded" />
          <span className="text-[9px] text-green-400">Y轴</span>
        </button>
        <button
          className="tool-btn flex flex-col items-center gap-1 hover:bg-blue-500/30"
          onClick={() => handleAddAxis('z')}
          title="添加Z轴"
        >
          <div className="w-3 h-3 border-r-2 border-b-2 border-blue-500 transform rotate-45" />
          <span className="text-[9px] text-blue-400">Z轴</span>
        </button>
        <button
          className="tool-btn flex flex-col items-center gap-1 hover:bg-orange-500/30"
          onClick={handleAddSectionPlane}
          title="添加截面平面"
        >
          <Scissors size={16} className="text-orange-400" />
          <span className="text-[9px] text-orange-400">截面</span>
        </button>
      </div>
    </div>
  );
}
