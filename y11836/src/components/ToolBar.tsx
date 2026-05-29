import { CellType, CELL_CONFIG } from '@/types';
import { useGameStore } from '@/store/useGameStore';

const tools: CellType[] = [
  CellType.COMMERCIAL,
  CellType.RESIDENTIAL,
  CellType.ROAD,
  CellType.GREEN,
  CellType.FIRE_STATION,
  CellType.EMPTY
];

export default function ToolBar() {
  const { selectedTool, setSelectedTool, phase } = useGameStore();
  const isDisabled = phase !== 'planning';

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 w-full">
      <h3 className="text-lg font-bold text-slate-700 mb-4 text-center">🧱 建筑工具</h3>
      <div className="grid grid-cols-3 gap-3">
        {tools.map((tool) => {
          const config = CELL_CONFIG[tool];
          const isSelected = selectedTool === tool;
          
          return (
            <button
              key={tool}
              onClick={() => !isDisabled && setSelectedTool(isSelected ? null : tool)}
              disabled={isDisabled}
              className={`
                flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200
                ${isSelected 
                  ? 'ring-4 ring-blue-400 scale-105 shadow-lg' 
                  : 'hover:bg-gray-50 hover:scale-102'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${config.bgColor} bg-opacity-20
              `}
              style={{ borderLeft: `4px solid ${config.color}` }}
            >
              <span className="text-2xl mb-1">{config.emoji}</span>
              <span className="text-xs font-medium text-slate-600">{config.name}</span>
            </button>
          );
        })}
      </div>
      
      {isDisabled && (
        <p className="text-xs text-slate-400 text-center mt-3">
          游戏进行中，无法选择工具
        </p>
      )}
    </div>
  );
}
