import { X, DoorOpen, Wind, User, Route } from 'lucide-react';
import { useMineStore } from '@/store/useMineStore';
import { cn } from '@/lib/utils';

const typeConfig = {
  door: { icon: DoorOpen, label: '风门', color: 'text-blue-400' },
  smoke: { icon: Wind, label: '烟雾源', color: 'text-orange-400' },
  person: { icon: User, label: '人员', color: 'text-green-400' },
  route: { icon: Route, label: '逃生路线', color: 'text-purple-400' },
};

export function ObjectTooltip() {
  const selectedObject = useMineStore((state) => state.selectedObject);
  const setSelectedObject = useMineStore((state) => state.setSelectedObject);
  const selectedRecord = useMineStore((state) => state.getSelectedRecord());

  if (!selectedObject || !selectedRecord) return null;

  const config = typeConfig[selectedObject.type];
  const Icon = config.icon;

  let details: { label: string; value: string }[] = [];
  let name = '';

  switch (selectedObject.type) {
    case 'door': {
      const door = selectedRecord.airDoors.find((d) => d.id === selectedObject.id);
      if (door) {
        name = door.name;
        details = [
          { label: '当前状态', value: door.status === 'open' ? '开启' : '关闭' },
          { label: '预期状态', value: door.expectedStatus === 'open' ? '开启' : '关闭' },
          { label: '状态正确', value: door.status === door.expectedStatus ? '是' : '否' },
        ];
      }
      break;
    }
    case 'smoke': {
      const smoke = selectedRecord.smokeSources.find((s) => s.id === selectedObject.id);
      if (smoke) {
        name = smoke.name;
        details = [
          { label: '强度', value: `${smoke.intensity.toFixed(1)}` },
          { label: '倒流', value: smoke.reverseFlow ? '是' : '否' },
        ];
      }
      break;
    }
    case 'person': {
      const person = selectedRecord.persons.find((p) => p.id === selectedObject.id);
      if (person) {
        name = person.name;
        details = [
          { label: '位置', value: `(${selectedObject.position[0].toFixed(1)}, ${selectedObject.position[2].toFixed(1)})` },
        ];
      }
      break;
    }
    case 'route': {
      const route = selectedRecord.escapeRoutes.find((r) => r.id === selectedObject.id);
      if (route) {
        name = '逃生路线';
        details = [
          { label: '路径点数', value: `${route.points.length}` },
          { label: '有效性', value: route.isValid ? '有效' : '无效' },
          { label: '穿墙次数', value: `${route.wallCrossings.length}` },
        ];
      }
      break;
    }
  }

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-2xl w-64 overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={cn('w-5 h-5', config.color)} />
              <span className="text-sm font-medium text-white">{name}</span>
            </div>
            <button
              onClick={() => setSelectedObject(null)}
              className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className={cn('text-xs mt-1', config.color)}>{config.label}</p>
        </div>

        <div className="p-4 space-y-2">
          {details.map((detail, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{detail.label}</span>
              <span className="text-white font-mono">{detail.value}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 bg-gray-800/30 border-t border-gray-700/50">
          <p className="text-xs text-gray-500">
            位置: ({selectedObject.position[0].toFixed(1)}, {selectedObject.position[1].toFixed(1)}, {selectedObject.position[2].toFixed(1)})
          </p>
        </div>
      </div>
    </div>
  );
}
