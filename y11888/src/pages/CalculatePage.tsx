import { useEffect, useState } from 'react';
import { Calculator, ArrowRight, ArrowLeft, Info, Lightbulb, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppStore, addAuditLog } from '@/store';
import { calculateSampleSize, generatePowerCurve, getLiftSuggestions } from '@/lib/statistics';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatNumber, formatPercent } from '@/lib/utils';

interface CalculatePageProps {
  onNext: () => void;
  onBack: () => void;
}

export default function CalculatePage({ onNext, onBack }: CalculatePageProps) {
  const { config, setConfig, sampleSizeResult, setSampleSizeResult, powerCurveData, setPowerCurveData } = useAppStore();
  const [showLiftSuggestions, setShowLiftSuggestions] = useState(false);
  const liftSuggestions = getLiftSuggestions();
  
  useEffect(() => {
    if (config.minimumLift > 0 && config.controlConversion > 0) {
      try {
        const result = calculateSampleSize(config);
        setSampleSizeResult(result);
        
        const curveData = generatePowerCurve(config);
        setPowerCurveData(curveData);
      } catch (e) {
        console.error('Calculation error:', e);
      }
    }
  }, [config, setSampleSizeResult, setPowerCurveData]);
  
  const handleConfigChange = (key: keyof typeof config, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const oldValue = config[key];
      setConfig({ [key]: numValue });
      addAuditLog('param_change', `修改参数 ${key}`, oldValue, numValue, '');
    }
  };
  
  const handleApplyLiftSuggestion = (lift: number) => {
    const oldValue = config.minimumLift;
    setConfig({ minimumLift: lift });
    addAuditLog('param_change', '应用最小提升建议', oldValue, lift, '');
    setShowLiftSuggestions(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="实验参数配置"
          subtitle="调整参数后自动重新计算"
          className="lg:col-span-1"
        >
          <div className="space-y-4">
            <Input
              label="对照组转化率"
              type="number"
              step="0.001"
              min="0.001"
              max="1"
              value={config.controlConversion}
              onChange={(e) => handleConfigChange('controlConversion', e.target.value)}
              unit="%"
              hint="历史平均转化率，如3%则输入0.03"
            />
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  最小可检测提升
                </label>
                <button
                  onClick={() => setShowLiftSuggestions(!showLiftSuggestions)}
                  className="text-xs text-tech-cyan-600 hover:text-tech-cyan-700 flex items-center gap-1"
                >
                  <Lightbulb className="w-3 h-3" />
                  获取建议
                </button>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={config.minimumLift}
                onChange={(e) => handleConfigChange('minimumLift', e.target.value)}
                unit="%"
                hint="希望检测到的最小提升幅度，如5%则输入0.05"
              />
              
              {showLiftSuggestions && (
                <div className="mt-2 p-3 bg-tech-cyan-50 rounded-md border border-tech-cyan-200">
                  <p className="text-xs font-medium text-tech-cyan-800 mb-2">建议区间：</p>
                  <div className="space-y-2">
                    {liftSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleApplyLiftSuggestion(suggestion.recommended)}
                        className="w-full text-left p-2 rounded bg-white hover:bg-tech-cyan-50 text-xs transition-colors"
                      >
                        <span className="font-medium text-tech-cyan-700">
                          {formatPercent(suggestion.min, 0)} - {formatPercent(suggestion.max, 0)}
                        </span>
                        <p className="text-gray-600 mt-0.5">{suggestion.reason}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <Input
              label="预估日均流量"
              type="number"
              step="100"
              min="100"
              value={config.dailyTraffic}
              onChange={(e) => handleConfigChange('dailyTraffic', e.target.value)}
              unit="人"
              hint="实验页面的预估日均访问量"
            />
            
            <Input
              label="流量分配比例"
              type="number"
              step="0.05"
              min="0.05"
              max="1"
              value={config.trafficAllocation}
              onChange={(e) => handleConfigChange('trafficAllocation', e.target.value)}
              unit="%"
              hint="分配给实验的流量比例，如50%则输入0.5"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="显著性水平 α"
                type="number"
                step="0.01"
                min="0.01"
                max="0.1"
                value={config.significanceLevel}
                onChange={(e) => handleConfigChange('significanceLevel', e.target.value)}
                hint="通常0.05"
              />
              
              <Input
                label="检验功效 1-β"
                type="number"
                step="0.05"
                min="0.5"
                max="0.99"
                value={config.power}
                onChange={(e) => handleConfigChange('power', e.target.value)}
                hint="通常0.8"
              />
            </div>
            
            <Input
              label="对照组/实验组比例"
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={config.trafficRatio}
              onChange={(e) => handleConfigChange('trafficRatio', e.target.value)}
              hint="1表示1:1均分"
            />
          </div>
        </Card>
        
        <Card
          title="样本量计算结果"
          subtitle="基于统计功效分析"
          className="lg:col-span-2"
          headerAction={
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => {
                const result = calculateSampleSize(config);
                setSampleSizeResult(result);
              }}
            >
              重新计算
            </Button>
          }
        >
          {sampleSizeResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-space-blue-50 rounded-md">
                  <p className="text-xs text-gray-500 mb-1">每组所需样本</p>
                  <p className="text-2xl font-mono font-bold text-space-blue-800">
                    {formatNumber(sampleSizeResult.requiredSampleSize, 0)}
                  </p>
                </div>
                <div className="p-4 bg-tech-cyan-50 rounded-md">
                  <p className="text-xs text-gray-500 mb-1">总样本量</p>
                  <p className="text-2xl font-mono font-bold text-tech-cyan-700">
                    {formatNumber(sampleSizeResult.totalSampleSize, 0)}
                  </p>
                </div>
                <div className="p-4 bg-space-blue-50 rounded-md">
                  <p className="text-xs text-gray-500 mb-1">预估实验天数</p>
                  <p className="text-2xl font-mono font-bold text-space-blue-800">
                    {sampleSizeResult.estimatedDays}
                    <span className="text-base font-normal">天</span>
                  </p>
                </div>
                <div className="p-4 bg-tech-cyan-50 rounded-md">
                  <p className="text-xs text-gray-500 mb-1">置信区间</p>
                  <p className="text-lg font-mono font-bold text-tech-cyan-700">
                    [{formatPercent(sampleSizeResult.confidenceInterval[0], 2)}, 
                    <br/>
                    {formatPercent(sampleSizeResult.confidenceInterval[1], 2)}]
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-md">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="w-4 h-4 text-gray-500 mt-0.5" />
                  <p className="text-sm font-medium text-gray-700">计算公式说明</p>
                </div>
                <div className="text-xs text-gray-600 space-y-1 font-mono">
                  <p>样本量公式：n = (Z<sub>α/2</sub>√(2p̄(1-p̄)) + Z<sub>β</sub>√(p1(1-p1)+p2(1-p2)))² / Δ²</p>
                  <p>Z<sub>α/2</sub> = {sampleSizeResult.zScore.toFixed(3)}（α={config.significanceLevel}）</p>
                  <p>标准误 SE = {sampleSizeResult.standardError.toFixed(5)}</p>
                  <p>可检测效应量 = {formatPercent(sampleSizeResult.detectableEffect, 4)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">功效分析曲线</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={powerCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="lift" 
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        tick={{ fontSize: 12 }}
                        label={{ value: '提升量', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                        label={{ value: '样本量', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'requiredSampleSize' 
                            ? `${formatNumber(value, 0)} 人` 
                            : `${(value * 100).toFixed(1)}%`,
                          name === 'requiredSampleSize' ? '所需样本量' : '统计功效'
                        ]}
                        labelFormatter={(label) => `提升量: ${(label * 100).toFixed(1)}%`}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="requiredSampleSize" 
                        stroke="#1e3a5f" 
                        strokeWidth={2}
                        name="所需样本量"
                        dot={false}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="power" 
                        stroke="#00d4aa" 
                        strokeWidth={2}
                        name="统计功效"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>请配置实验参数后查看计算结果</p>
            </div>
          )}
        </Card>
      </div>
      
      <div className="flex justify-between">
        <Button
          variant="secondary"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          上一步：数据导入
        </Button>
        <Button
          onClick={onNext}
          disabled={!sampleSizeResult}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          下一步：校验分析
        </Button>
      </div>
    </div>
  );
}
