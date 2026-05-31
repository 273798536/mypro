import { useGameStore } from '../../store/gameStore';
import { DollarSign } from 'lucide-react';

export function GovernancePanel() {
  const { governanceMeasures, budget, applyGovernance } = useGameStore();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">🛠️ 治理措施</h3>
        <div className="flex items-center gap-1 text-sm font-medium text-eco-600">
          <DollarSign size={18} />
          <span>¥{budget}</span>
        </div>
      </div>

      <div className="space-y-2">
        {governanceMeasures.map((measure) => (
          <button
            key={measure.id}
            onClick={() => applyGovernance(measure.id)}
            disabled={budget < measure.cost}
            className={`w-full p-3 rounded-xl border text-left transition-all ${
              budget >= measure.cost
                ? 'border-eco-200 bg-eco-50 hover:bg-eco-100 hover:border-eco-300'
                : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{measure.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-800 text-sm">{measure.name}</h4>
                  <p className="text-xs text-gray-500">{measure.effect}</p>
                </div>
              </div>
              <span className={`text-sm font-medium ${
                budget >= measure.cost ? 'text-eco-600' : 'text-gray-400'
              }`}>
                ¥{measure.cost}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
