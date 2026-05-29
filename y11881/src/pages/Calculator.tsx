import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator as CalcIcon,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ArrowRight,
  Clock,
  User,
  Coins,
} from 'lucide-react';
import { useStore } from '../store';
import { ChangePlan } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export function Calculator() {
  const {
    denominations,
    inventory,
    currentShift,
    currentOperator,
    lastChangeResult,
    calculateChange,
    executeTransaction,
  } = useStore();

  const [receivableAmount, setReceivableAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<ChangePlan | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const changeAmount =
    parseFloat(receivedAmount || '0') - parseFloat(receivableAmount || '0');

  const handleCalculate = () => {
    const receivable = parseFloat(receivableAmount || '0');
    const received = parseFloat(receivedAmount || '0');

    if (received < receivable) {
      return;
    }

    calculateChange(receivable, received);
    setSelectedPlan(null);
  };

  const handleExecute = () => {
    if (!selectedPlan) return;

    const receivable = parseFloat(receivableAmount || '0');
    const received = parseFloat(receivedAmount || '0');

    executeTransaction(receivable, received, selectedPlan);
    setReceivableAmount('');
    setReceivedAmount('');
    setSelectedPlan(null);
  };

  const getDenomName = (id: string) => {
    return denominations.find((d) => d.id === id)?.name || id;
  };

  const getAlgorithmName = (algo: string) => {
    switch (algo) {
      case 'dynamic-programming':
        return '动态规划';
      case 'dynamic-programming-relaxed':
        return '动态规划(放松约束)';
      case 'greedy-fallback':
        return '贪心算法(备用)';
      case 'direct-zero':
        return '直接计算';
      default:
        return algo;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">找零计算</h1>
          <p className="text-gray-500 mt-1">动态规划算法 · 库存约束校验 · 多方案对比</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{currentShift?.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>{currentOperator}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <CalcIcon className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">金额输入</h2>
              </div>
            </Card.Header>
            <Card.Body className="space-y-4">
              <Input
                label="应收金额"
                type="number"
                step="0.01"
                min="0"
                value={receivableAmount}
                onChange={(e) => setReceivableAmount(e.target.value)}
                placeholder="0.00"
                prefix={<span className="text-lg">¥</span>}
              />

              <Input
                label="实收金额"
                type="number"
                step="0.01"
                min="0"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="0.00"
                prefix={<span className="text-lg">¥</span>}
              />

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">找零金额</span>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      changeAmount < 0 ? 'text-red-600' : 'text-slate-800'
                    }`}
                  >
                    ¥{Math.max(0, changeAmount).toFixed(2)}
                  </span>
                </div>
                {changeAmount < 0 && (
                  <p className="text-sm text-red-600 mt-1">实收金额不能小于应收金额</p>
                )}
              </div>

              <Button
                fullWidth
                size="lg"
                onClick={handleCalculate}
                disabled={changeAmount < 0 || !receivableAmount || !receivedAmount}
              >
                计算找零方案
              </Button>
            </Card.Body>
          </Card>

          <Card className="mt-6">
            <Card.Header>
              <h3 className="font-semibold text-slate-800">当前库存参考</h3>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2">
                {denominations.map((denom) => {
                  const inv = inventory.find((i) => i.denominationId === denom.id);
                  const isLow = inv && inv.quantity <= denom.warningThreshold;
                  const isCritical = inv && inv.quantity <= denom.criticalThreshold;
                  return (
                    <div
                      key={denom.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-gray-700">{denom.name}</span>
                      <span
                        className={`font-mono font-medium ${
                          isCritical
                            ? 'text-red-600'
                            : isLow
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {inv?.quantity || 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 space-y-4"
        >
          <AnimatePresence mode="wait">
            {!lastChangeResult ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Coins className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">等待计算</h3>
                <p className="text-gray-400">请在左侧输入金额后点击计算</p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {lastChangeResult.warnings.length > 0 && (
                  <Alert variant="warning" title="警告信息">
                    <ul className="list-disc list-inside space-y-1">
                      {lastChangeResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {lastChangeResult.errors.length > 0 && (
                  <Alert variant="danger" title="错误信息">
                    <ul className="list-disc list-inside space-y-1">
                      {lastChangeResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {lastChangeResult.nextActions.length > 0 && (
                  <Alert variant="info" title="下一步操作">
                    <ul className="space-y-2">
                      {lastChangeResult.nextActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600 font-medium">{action.priority}.</span>
                          <span>{action.description}</span>
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">
                    找零方案 ({lastChangeResult.plans.length}个可用)
                  </h3>
                  <button
                    onClick={() => setShowTrace(!showTrace)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Info className="w-4 h-4" />
                    {showTrace ? '隐藏追溯' : '显示追溯'}
                  </button>
                </div>

                <div className="space-y-3">
                  {lastChangeResult.plans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        hover
                        className={selectedPlan?.id === plan.id ? 'ring-2 ring-blue-500' : ''}
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <Card.Body className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  plan.isOptimal
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {plan.isOptimal ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <span className="font-bold">{plan.rank}</span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800">
                                    方案 {plan.rank}
                                  </span>
                                  {plan.isOptimal && (
                                    <Badge variant="success">最优解</Badge>
                                  )}
                                  {plan.algorithm.includes('relaxed') && (
                                    <Badge variant="warning">库存不足</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                                  <span>共 {plan.totalCoins} 张/枚</span>
                                  <span>·</span>
                                  <span>{getAlgorithmName(plan.algorithm)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-slate-800">
                                ¥{changeAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {plan.denominationBreakdown.map((detail) => {
                              const denom = denominations.find(
                                (d) => d.id === detail.denominationId
                              );
                              const inv = inventory.find(
                                (i) => i.denominationId === detail.denominationId
                              );
                              const hasEnough = inv && inv.quantity >= detail.quantity;
                              return (
                                <div
                                  key={detail.denominationId}
                                  className={`px-3 py-2 rounded-lg border ${
                                    hasEnough
                                      ? 'bg-gray-50 border-gray-200'
                                      : 'bg-red-50 border-red-200'
                                  }`}
                                >
                                  <div className="text-sm font-medium text-slate-800">
                                    {denom?.name}
                                  </div>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold">x{detail.quantity}</span>
                                    {!hasEnough && (
                                      <span className="text-xs text-red-600">
                                        (缺{detail.quantity - (inv?.quantity || 0)})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <AnimatePresence>
                            {showTrace && selectedPlan?.id === plan.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-4 pt-4 border-t border-gray-100"
                              >
                                <div className="text-sm text-gray-500 space-y-1">
                                  <div className="flex gap-2">
                                    <span className="text-gray-400 w-20">算法:</span>
                                    <span className="text-slate-700">{plan.algorithm}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-gray-400 w-20">面额:</span>
                                    <span className="text-slate-700">
                                      {plan.denominationBreakdown
                                        .map((d) => getDenomName(d.denominationId))
                                        .join(', ')}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {lastChangeResult.plans.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex gap-3"
                  >
                    <Button
                      fullWidth
                      size="lg"
                      variant="success"
                      onClick={handleExecute}
                      disabled={!selectedPlan || !lastChangeResult.success}
                      icon={<CheckCircle className="w-5 h-5" />}
                    >
                      确认执行
                    </Button>
                    <Button
                      fullWidth
                      size="lg"
                      variant="secondary"
                      onClick={() => {
                        setReceivableAmount('');
                        setReceivedAmount('');
                        setSelectedPlan(null);
                      }}
                    >
                      重置
                    </Button>
                  </motion.div>
                )}

                {!lastChangeResult.success && lastChangeResult.plans.length > 0 && (
                  <Alert variant="warning" title="库存约束说明">
                    以上方案已放松库存约束展示，执行时将标记为警告交易。建议先补充库存后再进行找零。
                  </Alert>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
