import {
  Car,
  Route,
  ArrowRight,
  MapPin,
  Type,
  Square,
  Minus,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { ElementType, ELEMENT_PRESETS } from '@/types';
import { useStore } from '@/store';

interface ElementItemProps {
  type: ElementType;
  icon: React.ReactNode;
  label: string;
  onDragStart: (e: React.DragEvent, type: ElementType) => void;
}

function ElementItem({ type, icon, label, onDragStart }: ElementItemProps) {
  const preset = ELEMENT_PRESETS[type];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
        style={{ backgroundColor: preset.color }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
          {label}
        </div>
        <div className="text-xs text-slate-400">拖拽到画布添加</div>
      </div>
    </div>
  );
}

export default function ElementPanel() {
  const addElement = useStore((state) => state.addElement);
  const saveHistory = useStore((state) => state.saveHistory);
  const currentRecord = useStore((state) => state.getCurrentRecord());

  const handleDragStart = (e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData('elementType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuickAdd = (type: ElementType) => {
    saveHistory();
    addElement(type, 300, 300);
  };

  const elements: { type: ElementType; icon: React.ReactNode; label: string }[] = [
    { type: 'car', icon: <Car className="w-5 h-5" />, label: '车辆' },
    { type: 'road', icon: <Route className="w-5 h-5" />, label: '道路' },
    { type: 'arrow', icon: <ArrowRight className="w-5 h-5" />, label: '方向箭头' },
    { type: 'marker', icon: <MapPin className="w-5 h-5" />, label: '标记点' },
    { type: 'text', icon: <Type className="w-5 h-5" />, label: '文本标注' },
    { type: 'shape', icon: <Square className="w-5 h-5" />, label: '几何形状' },
    { type: 'line', icon: <Minus className="w-5 h-5" />, label: '线段' },
  ];

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          元素库
        </h3>
        <p className="text-xs text-slate-400 mt-1">拖拽或点击添加元素</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {elements.map((element) => (
            <div key={element.type} onClick={() => handleQuickAdd(element.type)}>
              <ElementItem
                type={element.type}
                icon={element.icon}
                label={element.label}
                onDragStart={handleDragStart}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-700">
              <p className="font-medium mb-1">操作提示</p>
              <ul className="space-y-1 text-amber-600">
                <li>• 滚轮缩放画布</li>
                <li>• 拖拽移动元素</li>
                <li>• Delete 删除选中</li>
                <li>• Ctrl+Z 撤销操作</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
