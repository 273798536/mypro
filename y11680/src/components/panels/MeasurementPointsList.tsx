import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { MeasurementPoint } from '../../types';

export default function MeasurementPointsList() {
  const points = useStore((state) => state.measurementPoints);
  const selectedId = useStore((state) => state.selectedPointId);
  const addMeasurementPoint = useStore((state) => state.addMeasurementPoint);
  const deleteMeasurementPoint = useStore((state) => state.deleteMeasurementPoint);
  const setSelectedPointId = useStore((state) => state.setSelectedPointId);
  const room = useStore((state) => state.room);

  const handleAddPoint = () => {
    const newPoint: Omit<MeasurementPoint, 'id'> = {
      name: `测点 ${points.length + 1}`,
      x: room.width / 2,
      y: room.height / 2,
      z: room.depth / 2,
    };
    addMeasurementPoint(newPoint);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleAddPoint}
        className="w-full flex items-center justify-center gap-1 px-3 py-2 
          bg-primary-600 hover:bg-primary-500 rounded text-sm transition-colors"
      >
        <Plus size={14} />
        添加测点
      </button>

      <div className="space-y-2 max-h-32 overflow-y-auto">
        {points.map((point) => (
          <div
            key={point.id}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
              selectedId === point.id
                ? 'bg-primary-900 border border-primary-500'
                : 'bg-dark-900 hover:bg-dark-950'
            }`}
            onClick={() => setSelectedPointId(point.id === selectedId ? null : point.id)}
          >
            <div
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                selectedId === point.id ? 'bg-green-400' : 'bg-primary-500'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{point.name}</div>
              <div className="text-xs text-gray-500 font-mono">
                ({point.x.toFixed(1)}, {point.y.toFixed(1)}, {point.z.toFixed(1)})
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteMeasurementPoint(point.id);
              }}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
