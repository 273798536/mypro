import { useNavigate } from 'react-router-dom';
import { PRESET_LEVELS } from '../data/presetLevels';
import { useBridgeStore, useVersionStore } from '../store';

export function LevelSelectPage() {
  const navigate = useNavigate();
  const setCurrentLevelId = useBridgeStore((state) => state.setCurrentLevelId);
  const loadFromPreset = useBridgeStore((state) => state.loadFromPreset);
  const loadVersionsByLevel = useVersionStore((state) => state.loadVersionsByLevel);

  const handleSelectLevel = (levelId: string) => {
    const level = PRESET_LEVELS.find((l) => l.id === levelId);
    if (!level) return;

    setCurrentLevelId(levelId);
    loadFromPreset(level.presetNodes, level.presetMembers, level.budgetLimit);
    loadVersionsByLevel(levelId);
    navigate('/builder');
  };

  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    hard: 'bg-red-100 text-red-700',
  };

  const difficultyLabels: Record<string, string> = {
    easy: '基础',
    medium: '进阶',
    hard: '挑战',
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">选择关卡</h2>
        <p className="text-slate-600">关卡少但精，每个都包含杆件过载、支点错位、预算超支三个边界样例</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRESET_LEVELS.map((level) => (
          <div
            key={level.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleSelectLevel(level.id)}
          >
            <div className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 relative">
              <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">
                🌉
              </div>
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[level.difficulty]}`}>
                  {difficultyLabels[level.difficulty]}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 text-white">
                <div className="text-xs opacity-80">关卡 {level.order}</div>
                <div className="text-xl font-bold">{level.name}</div>
              </div>
            </div>
            
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4">{level.description}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">预算上限</span>
                  <span className="font-medium text-slate-800">¥{level.budgetLimit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">最大载荷</span>
                  <span className="font-medium text-slate-800">{level.maxLoad.toLocaleString()} N</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">节点数</span>
                  <span className="font-medium text-slate-800">{level.presetNodes.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">杆件数</span>
                  <span className="font-medium text-slate-800">{level.presetMembers.length}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-2">边界样例</div>
                <div className="flex gap-2">
                  {level.boundaryCases.map((bc) => (
                    <span
                      key={bc.id}
                      className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs"
                    >
                      {bc.type === 'overload' ? '⚡ 过载' : bc.type === 'misalignment' ? '🔧 错位' : '💰 超支'}
                    </span>
                  ))}
                </div>
              </div>

              <button
                className="w-full mt-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectLevel(level.id);
                }}
              >
                开始设计 →
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-800 mb-3">💡 系统特性</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <span className="text-lg">🔢</span>
            <div>
              <div className="font-medium">矩阵位移法求解器</div>
              <div className="text-blue-600 text-xs">手写实现，结果可复现，无随机算法</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">🎨</span>
            <div>
              <div className="font-medium">真实受力可视化</div>
              <div className="text-blue-600 text-xs">应力颜色映射，变形放大显示</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">📝</span>
            <div>
              <div className="font-medium">版本追溯机制</div>
              <div className="text-blue-600 text-xs">每次保存生成新版本，旧结论不被覆盖</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
