import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  CalendarClock,
  FileBarChart,
  AlertTriangle,
  CheckCircle,
  Coins,
  ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { InventoryCard } from '../components/inventory/InventoryCard';
import { calculateDenominationImportance } from '../utils/algorithm';

export function Dashboard() {
  const navigate = useNavigate();
  const {
    denominations,
    inventory,
    currentShift,
    transactions,
    supplySuggestions,
    updateInventory,
  } = useStore();

  const todayTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.timestamp).toDateString();
    const today = new Date().toDateString();
    return txDate === today;
  });

  const totalChangeToday = todayTransactions.reduce(
    (sum, tx) => sum + tx.changeAmount,
    0
  );

  const warningCount = denominations.filter((d) => {
    const inv = inventory.find((i) => i.denominationId === d.id);
    return inv && inv.quantity <= d.warningThreshold;
  }).length;

  const criticalCount = denominations.filter((d) => {
    const inv = inventory.find((i) => i.denominationId === d.id);
    return inv && inv.quantity <= d.criticalThreshold;
  }).length;

  const importance = calculateDenominationImportance(
    transactions.slice(-20),
    denominations
  );

  const quickActions = [
    {
      icon: Calculator,
      title: '找零计算',
      description: '快速计算最优找零方案',
      path: '/calculator',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: TrendingUp,
      title: '库存分析',
      description: '查看趋势和补币建议',
      path: '/analytics',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      icon: CalendarClock,
      title: '班次管理',
      description: '管理交接班和班次记录',
      path: '/shift',
      color: 'from-amber-500 to-amber-600',
    },
    {
      icon: FileBarChart,
      title: '报告中心',
      description: '导出数据和审计报告',
      path: '/reports',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">现金找零库存优化</h1>
          <p className="text-gray-500 mt-1">
            {currentShift?.name} · {currentShift?.operator} · 实时监控中
          </p>
        </div>
        <Badge variant={criticalCount > 0 ? 'danger' : warningCount > 0 ? 'warning' : 'success'} pulse={criticalCount > 0}>
          {criticalCount > 0
            ? `${criticalCount} 个面额库存紧急`
            : warningCount > 0
            ? `${warningCount} 个面额库存偏低`
            : '库存状态良好'}
        </Badge>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <Card.Body className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">今日找零总额</p>
                  <p className="text-3xl font-bold mt-1">¥{totalChangeToday.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-xl">
                  <Coins className="w-6 h-6" />
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-3">
                {todayTransactions.length} 笔交易
              </p>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <Card.Body className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">库存紧急</p>
                  <p className="text-3xl font-bold mt-1 text-red-600">{criticalCount}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-3">
                需要立即补充
              </p>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <Card.Body className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">库存预警</p>
                  <p className="text-3xl font-bold mt-1 text-amber-600">{warningCount - criticalCount}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-3">
                建议近期补充
              </p>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <Card.Body className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">健康面额</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-600">
                    {denominations.length - warningCount}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-3">
                共 {denominations.length} 个面额
              </p>
            </Card.Body>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
          >
            <Card hover onClick={() => navigate(action.path)} className="h-full">
              <Card.Body className="p-5">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4`}
                >
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{action.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{action.description}</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card.Body>
            </Card>
          </motion.div>
        ))}
      </div>

      {supplySuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">补币建议</h2>
                <Badge variant="warning">智能推荐</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                {supplySuggestions.slice(0, 3).map((suggestion) => {
                  const denom = denominations.find((d) => d.id === suggestion.denominationId);
                  const inv = inventory.find((i) => i.denominationId === suggestion.denominationId);
                  return (
                    <div
                      key={suggestion.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={suggestion.priority === 'high' ? 'danger' : suggestion.priority === 'medium' ? 'warning' : 'info'}
                        >
                          {suggestion.priority === 'high' ? '高' : suggestion.priority === 'medium' ? '中' : '低'}
                        </Badge>
                        <div>
                          <div className="font-medium text-slate-800">
                            {denom?.name} · 当前 {inv?.quantity || 0} 张/枚
                          </div>
                          <div className="text-sm text-gray-500">{suggestion.reason}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          +{suggestion.suggestedQuantity}
                        </div>
                        <div className="text-xs text-gray-500">建议补充</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => navigate('/analytics')}
              >
                查看完整分析
              </Button>
            </Card.Body>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">库存实时监控</h2>
          <div className="text-sm text-gray-500">
            按使用重要性排序
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {denominations
            .sort((a, b) => (importance[b.id]?.importance || 0) - (importance[a.id]?.importance || 0))
            .map((denom, index) => {
              const inv = inventory.find((i) => i.denominationId === denom.id);
              if (!inv) return null;
              return (
                <div key={denom.id} style={{ animationDelay: `${0.6 + index * 0.05}s` }}>
                  <InventoryCard
                    denomination={denom}
                    inventory={inv}
                    onUpdate={(qty) => updateInventory(denom.id, qty)}
                  />
                </div>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
}
