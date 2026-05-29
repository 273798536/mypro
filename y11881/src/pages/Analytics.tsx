import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, TrendingDown, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useStore } from '../store';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { calculateDenominationImportance } from '../utils/algorithm';

export function Analytics() {
  const { denominations, inventory, transactions, supplySuggestions } = useStore();

  const importance = calculateDenominationImportance(transactions, denominations);

  const dailyData = () => {
    const days: Record<string, Record<string, number>> = {};
    transactions.forEach((tx) => {
      const day = new Date(tx.timestamp).toLocaleDateString('zh-CN');
      if (!days[day]) {
        days[day] = {};
        denominations.forEach((d) => {
          days[day][d.id] = 0;
        });
      }
      tx.changeDetails.forEach((detail) => {
        days[day][detail.denominationId] =
          (days[day][detail.denominationId] || 0) + detail.quantity;
      });
    });

    return Object.entries(days)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .slice(-7);
  };

  const chartData = dailyData();

  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#84cc16',
    '#f97316',
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">库存分析</h1>
          <p className="text-gray-500 mt-1">面额使用趋势、智能补币建议</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">近7天数据</Badge>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">面额使用趋势</h2>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {denominations.slice(0, 6).map((denom, index) => (
                    <Line
                      key={denom.id}
                      type="monotone"
                      dataKey={denom.id}
                      name={denom.name}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card.Body>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">面额重要性分析</h2>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={denominations.map((d) => ({
                      name: d.name,
                      importance: Math.round(importance[d.id]?.importance || 0),
                      usage: importance[d.id]?.usageCount || 0,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="importance" name="重要性" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-slate-800">智能补币建议</h2>
              </div>
            </Card.Header>
            <Card.Body>
              {supplySuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingDown className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                  <p>库存状态良好，暂无需补币</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supplySuggestions.map((suggestion) => {
                    const denom = denominations.find((d) => d.id === suggestion.denominationId);
                    const inv = inventory.find((i) => i.denominationId === suggestion.denominationId);
                    return (
                      <div
                        key={suggestion.id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                suggestion.priority === 'high'
                                  ? 'danger'
                                  : suggestion.priority === 'medium'
                                  ? 'warning'
                                  : 'info'
                              }
                            >
                              {suggestion.priority === 'high' ? '紧急' : suggestion.priority === 'medium' ? '建议' : '可选'}
                            </Badge>
                            <div>
                              <div className="font-semibold text-slate-800">
                                {denom?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                当前库存: {inv?.quantity || 0}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-slate-800">
                              +{suggestion.suggestedQuantity}
                            </div>
                            <div className="text-xs text-gray-500">建议补充</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 pl-0">{suggestion.reason}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-slate-800">库存健康度总览</h2>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {denominations.map((denom) => {
                const inv = inventory.find((i) => i.denominationId === denom.id);
                const qty = inv?.quantity || 0;
                const health = Math.min(100, (qty / (denom.warningThreshold * 2)) * 100);
                const isCritical = qty <= denom.criticalThreshold;
                const isWarning = qty <= denom.warningThreshold;

                return (
                  <div key={denom.id} className="text-center">
                    <div
                      className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        isCritical
                          ? 'bg-red-100 text-red-600'
                          : isWarning
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      <span className="text-lg font-bold">{qty}</span>
                    </div>
                    <div className="mt-2 font-medium text-slate-800 text-sm">{denom.name}</div>
                    <div
                      className={`text-xs ${
                        isCritical
                          ? 'text-red-600'
                          : isWarning
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {Math.round(health)}% 健康
                    </div>
                  </div>
                );
              })}
            </div>
          </Card.Body>
        </Card>
      </motion.div>
    </div>
  );
}
