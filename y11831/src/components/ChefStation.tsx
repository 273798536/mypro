import { ChefHat, Loader2, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export function ChefStation() {
  const { chefs, orders } = useGameStore();

  const getChefOrder = (chefId: string) => {
    return orders.find((o) => o.assignedChefId === chefId && o.status === 'processing');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <ChefHat className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-bold text-gray-800">厨师工作台</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {chefs.map((chef) => {
          const order = getChefOrder(chef.id);
          const isBusy = chef.status === 'busy';

          return (
            <div
              key={chef.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                isBusy
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isBusy ? 'bg-orange-500' : 'bg-gray-400'
                  }`}
                >
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{chef.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>效率: {chef.efficiency}x</span>
                    <span>•</span>
                    <span>等级: {'⭐'.repeat(chef.skillLevel)}</span>
                  </div>
                </div>
              </div>

              {isBusy && order ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {order.customerName} 的订单
                    </span>
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {order.items.map((item, i) => (
                      <span key={i} className="mr-2">
                        {item.menuName}
                      </span>
                    ))}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(chef.progress, 100)}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {Math.round(chef.progress)}%
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4 text-gray-400">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  <span>空闲中</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
