import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Zap,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Globe,
  Users,
  Calendar,
} from 'lucide-react';
import { CalculationResult as CalculationResultType } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import {
  formatHeatFlowRate,
  formatEnergyMonthly,
  formatUValue,
  formatPercentage,
  formatThermalResistance,
  formatTemperature,
  formatDate,
  formatCurrency,
} from '../../utils/formatters';
import { getMonthlyEnergyCost } from '../../utils/reportGenerator';
import { ENERGY_PRICE_PER_KWH } from '../../utils/constants';

interface CalculationResultProps {
  result: CalculationResultType;
  indoorTemp?: number;
  outdoorTemp?: number;
}

export default function CalculationResult({ result, indoorTemp, outdoorTemp }: CalculationResultProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [showScope, setShowScope] = useState(false);
  const [showFailures, setShowFailures] = useState(false);
  const [animatedValues, setAnimatedValues] = useState({
    totalHeatLoss: 0,
    monthlyLoss: 0,
    uValue: 0,
    bridgeLoss: 0,
    bridgeRatio: 0,
  });

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setAnimatedValues({
        totalHeatLoss: result.totalHeatLoss * easeOut,
        monthlyLoss: result.totalHeatLossMonthly * easeOut,
        uValue: result.averageUValue * easeOut,
        bridgeLoss: result.thermalBridgeLoss * easeOut,
        bridgeRatio: result.thermalBridgeLossRatio * easeOut,
      });

      if (step >= steps) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [result]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">计算成功</Badge>;
      case 'partial':
        return <Badge variant="warning">部分成功</Badge>;
      case 'failed':
        return <Badge variant="danger">计算失败</Badge>;
      default:
        return <Badge>未知</Badge>;
    }
  };

  const monthlyCost = getMonthlyEnergyCost(result.totalHeatLossMonthly);
  const tempDiff = Math.abs(indoorTemp - outdoorTemp);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            计算结果
            {getStatusBadge(result.status)}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            计算时间: {formatDate(result.calculatedAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">
            室内: {formatTemperature(indoorTemp)} / 室外: {formatTemperature(outdoorTemp)}
          </p>
          <p className="text-sm font-medium text-slate-700">
            温差: {formatTemperature(tempDiff)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">总热损耗</span>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800 font-mono">
              {formatHeatFlowRate(animatedValues.totalHeatLoss)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              单位: {result.units.totalHeatLoss}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">月度能耗</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800 font-mono">
              {formatEnergyMonthly(animatedValues.monthlyLoss)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              ≈ {formatCurrency(monthlyCost)} / 月
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">平均传热系数</span>
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-slate-800 font-mono">
              {formatUValue(animatedValues.uValue)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              单位: {result.units.averageUValue}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">热桥损耗</span>
              <Thermometer className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-slate-800 font-mono">
              {formatHeatFlowRate(animatedValues.bridgeLoss)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              单位: {result.units.thermalBridgeLoss}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">热桥占比</span>
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-600">%</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 font-mono">
              {formatPercentage(animatedValues.bridgeRatio)}
            </p>
            <div className="mt-3">
              <ProgressBar
                progress={animatedValues.bridgeRatio}
                color={animatedValues.bridgeRatio > 20 ? 'red' : animatedValues.bridgeRatio > 10 ? 'amber' : 'green'}
                height="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">预估年电费</span>
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-600">¥</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 font-mono">
              {formatCurrency(monthlyCost * 12)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              按 {ENERGY_PRICE_PER_KWH} 元/kWh 计算
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>各节点热流详情</CardTitle>
              <CardDescription>
                共 {result.heatFlowNodes.length} 个构造节点
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">节点编码</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">节点名称</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">热流量</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">热阻</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">温降</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">热桥</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">详情</th>
                </tr>
              </thead>
              <tbody>
                {result.heatFlowNodes.map(node => (
                  <React.Fragment key={node.nodeId}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600">{node.nodeCode}</td>
                      <td className="py-3 px-4 text-slate-800">{node.nodeName}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatHeatFlowRate(node.heatFlowRate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatThermalResistance(node.thermalResistance)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatTemperature(node.temperatureDrop)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {node.isThermalBridge ? (
                          <Badge variant="danger">是</Badge>
                        ) : (
                          <Badge variant="default">否</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleNode(node.nodeId)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          {expandedNodes[node.nodeId] ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedNodes[node.nodeId] && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="py-4 px-8">
                          <div className="bg-white rounded-lg p-4 border border-slate-200">
                            <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                              计算公式
                            </h5>
                            <p className="text-sm font-mono text-slate-700 bg-slate-50 p-2 rounded mb-4">
                              {node.calculationDetails.formula}
                            </p>
                            <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                              输入参数
                            </h5>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              {Object.entries(node.calculationDetails.inputs).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-slate-500">{key}:</span>
                                  <span className="ml-2 font-mono text-slate-700">{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setShowScope(!showScope)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">适用范围</CardTitle>
              </div>
              {showScope ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </CardHeader>
          {showScope && (
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Info className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-blue-800 leading-relaxed">
                  {result.applicableScope || '未指定适用范围'}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {result.failureReasons.length > 0 && (
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setShowFailures(!showFailures)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-base">
                    计算警告 ({result.failureReasons.length})
                  </CardTitle>
                </div>
                {showFailures ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </CardHeader>
            {showFailures && (
              <CardContent>
                <ul className="space-y-2">
                  {result.failureReasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-amber-700">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-600" />
            <CardTitle className="text-base">数据来源链</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {result.dataSourceChain.map((source, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200"
              >
                <div className={`w-8 h-8 rounded flex items-center justify-center ${
                  source.type === 'construction' ? 'bg-blue-100 text-blue-600' :
                  source.type === 'material' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {source.type === 'construction' ? <Globe className="w-4 h-4" /> :
                   source.type === 'material' ? <CheckCircle className="w-4 h-4" /> :
                   <Calendar className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    {source.type === 'construction' ? '墙体构造' :
                     source.type === 'material' ? '材料数据' : '环境参数'}
                  </p>
                  <p className="text-sm font-medium text-slate-800">{source.name}</p>
                  <p className="text-xs text-slate-500">负责人: {source.maintainer}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
