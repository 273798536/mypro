import { useNavigate } from 'react-router-dom';
import { Calculator, ArrowRight, Play, RefreshCw, AlertCircle, CheckCircle, Flame, DollarSign, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useCalculationStore } from '../store/useCalculationStore';
import CalculationResult from '../components/calculation/CalculationResult';
import { formatDate, formatWithUnit } from '../utils/formatters';
import { UNITS, STATUS_LABELS } from '../utils/constants';
import { hasBlockingIssues } from '../utils/dataValidator';

export default function CalculationCenter() {
  const navigate = useNavigate();
  const {
    currentCalculation,
    performCalculation,
    isCalculating,
    calculationProgress,
    calculationMessage,
    detectAndSetConflicts,
    validateAndSetIssues,
  } = useCalculationStore();

  if (!currentCalculation) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">当前没有选中的项目</h3>
            <p className="text-slate-500">请先选择或创建一个分析项目</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unresolvedConflicts = currentCalculation.conflicts.filter(c => !c.resolved).length;
  const hasBlocking = hasBlockingIssues(currentCalculation.validationIssues);
  const canCalculate = unresolvedConflicts === 0 && !hasBlocking && !isCalculating;

  const handleCalculate = async () => {
    await performCalculation();
  };

  const handleRecheck = () => {
    detectAndSetConflicts();
    validateAndSetIssues();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">计算中心</h1>
          <p className="text-slate-500 mt-1">
            项目：{currentCalculation.name} · 更新于 {formatDate(currentCalculation.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`
            ${currentCalculation.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}
            ${currentCalculation.status === 'ready' ? 'bg-blue-100 text-blue-700' : ''}
            ${currentCalculation.status === 'conflict_pending' ? 'bg-amber-100 text-amber-700' : ''}
            ${currentCalculation.status === 'validation_failed' ? 'bg-red-100 text-red-700' : ''}
            ${currentCalculation.status === 'calculating' ? 'bg-indigo-100 text-indigo-700' : ''}
          `}>
            {STATUS_LABELS[currentCalculation.status]}
          </Badge>
          <Button variant="secondary" onClick={handleRecheck}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重新检查
          </Button>
          <Button
            onClick={() => navigate('/reports')}
            disabled={!currentCalculation.result}
          >
            下一步：报告导出
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700">构造节点</p>
              <p className="text-3xl font-bold text-blue-800">
                {currentCalculation.wallConstruction.nodes.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Flame className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700">温差</p>
              <p className="text-3xl font-bold text-emerald-800">
                {(currentCalculation.environmentParams.indoorTemperature - currentCalculation.environmentParams.outdoorTemperature).toFixed(1)} °C
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700">计算周期</p>
              <p className="text-3xl font-bold text-amber-800">
                {currentCalculation.environmentParams.calculationPeriod} 天
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-700">电价</p>
              <p className="text-3xl font-bold text-purple-800">
                ¥0.58 /kWh
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!canCalculate && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 mb-1">计算前置条件未满足</h4>
              <div className="text-sm text-amber-700 space-y-1">
                {unresolvedConflicts > 0 && (
                  <p>• 存在 {unresolvedConflicts} 个未解决的数据冲突，请先前往冲突检测页面处理</p>
                )}
                {hasBlocking && (
                  <p>• 存在数据校验错误，请先前往数据校验页面修复</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {unresolvedConflicts > 0 && (
                <Button size="sm" variant="warning" onClick={() => navigate('/conflicts')}>
                  处理冲突
                </Button>
              )}
              {hasBlocking && (
                <Button size="sm" variant="danger" onClick={() => navigate('/validation')}>
                  修复错误
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isCalculating && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-blue-600 animate-pulse" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">正在执行计算</p>
                  <p className="text-sm text-slate-500">{calculationMessage}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">{calculationProgress}%</span>
            </div>
            <ProgressBar value={calculationProgress} />
          </CardContent>
        </Card>
      )}

      {!isCalculating && !currentCalculation.result && (
        <Card>
          <CardContent className="text-center py-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">准备就绪，可以开始计算</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              系统将对 {currentCalculation.wallConstruction.nodes.length} 个构造节点进行热桥损耗计算，
              计算周期为 {currentCalculation.environmentParams.calculationPeriod} 天。
            </p>
            <Button size="lg" onClick={handleCalculate} disabled={!canCalculate}>
              <Play className="w-5 h-5 mr-2" />
              开始计算
            </Button>
          </CardContent>
        </Card>
      )}

      {currentCalculation.result && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-blue-100">计算完成</p>
                    <div className="flex items-center gap-8 mt-2">
                      <div>
                        <p className="text-blue-200 text-xs">总热桥损耗</p>
                        <p className="text-3xl font-bold">
                          {formatWithUnit(currentCalculation.result.totalHeatLoss, UNITS.heatFlowRate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-200 text-xs">月度能耗</p>
                        <p className="text-2xl font-bold">
                          {formatWithUnit(currentCalculation.result.monthlyEnergyConsumption.kwh, UNITS.energy)}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-200 text-xs">月度费用</p>
                        <p className="text-2xl font-bold">
                          ¥{currentCalculation.result.monthlyEnergyConsumption.cost?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleCalculate}
                    disabled={isCalculating}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新计算
                  </Button>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={() => navigate('/reports')}
                  >
                    查看报告
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <CalculationResult result={currentCalculation.result} />

          <Card className="bg-slate-50">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-900">计算已完成</p>
                  <p className="text-sm text-emerald-700">可以前往报告导出页面生成详细分析报告</p>
                </div>
              </div>
              <Button
                variant="success"
                onClick={() => navigate('/reports')}
              >
                下一步：报告导出
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
