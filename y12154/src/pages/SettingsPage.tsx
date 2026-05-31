import React, { useState } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle, Database, Trash2, Info } from 'lucide-react';
import { useThresholdStore } from '../stores/thresholdStore';
import { useDataStore } from '../stores/dataStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DEFAULT_THRESHOLD_CONFIG } from '../utils/constants';
import type { ThresholdConfig } from '../types';
import { formatPercent } from '../utils/helpers';

export const SettingsPage: React.FC = () => {
  const { config, updateConfig, resetConfig } = useThresholdStore();
  const { clearAllData, inspectionRecords, brakeCalculations, abnormalDetections, badRows, dataTraces, elevatorProfiles } = useDataStore();

  const [localConfig, setLocalConfig] = useState<ThresholdConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (key: keyof ThresholdConfig, value: number) => {
    setLocalConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(newConfig) !== JSON.stringify(config));
      return newConfig;
    });
    setSaveSuccess(false);
  };

  const handleSave = () => {
    updateConfig(localConfig);
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    resetConfig();
    setLocalConfig(DEFAULT_THRESHOLD_CONFIG);
    setHasChanges(false);
    setShowResetConfirm(false);
  };

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
  };

  const dataStats = {
    profiles: elevatorProfiles.length,
    records: inspectionRecords.length,
    calculations: brakeCalculations.length,
    detections: abnormalDetections.length,
    badRows: badRows.length,
    traces: dataTraces.length,
    total: elevatorProfiles.length + inspectionRecords.length + brakeCalculations.length + abnormalDetections.length + badRows.length + dataTraces.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-900" />
            系统设置
          </h1>
          <p className="text-slate-500 mt-1">配置阈值参数和系统选项</p>
        </div>
        <div className="flex gap-3">
          {hasChanges && (
            <>
              <Button
                variant="outline"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => setShowResetConfirm(true)}
              >
                恢复默认
              </Button>
              <Button
                variant="primary"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSave}
              >
                保存配置
              </Button>
            </>
          )}
        </div>
      </div>

      {saveSuccess && (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Save className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-emerald-900">配置已保存</h3>
              <p className="text-sm text-emerald-700">阈值配置已成功保存并生效</p>
            </div>
          </div>
        </Card>
      )}

      {showResetConfirm && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900">确认恢复默认配置？</h3>
              <p className="text-sm text-amber-700 mt-1">
                此操作将重置所有阈值参数为默认值，已有的计算结果不会受到影响。
              </p>
              <div className="flex gap-3 mt-4">
                <Button variant="primary" onClick={handleReset}>
                  确认恢复
                </Button>
                <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                  取消
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">阈值配置</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Badge variant="info">制动距离</Badge>
                与理论值偏差百分比阈值
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    警告阈值 <span className="text-slate-400">(±%)</span>
                  </label>
                  <input
                    type="number"
                    value={localConfig.brakeDistanceWarning * 100}
                    onChange={e => handleChange('brakeDistanceWarning', Number(e.target.value) / 100)}
                    min="1"
                    max="100"
                    step="1"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {formatPercent(localConfig.brakeDistanceWarning * 100)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    严重阈值 <span className="text-slate-400">(±%)</span>
                  </label>
                  <input
                    type="number"
                    value={localConfig.brakeDistanceSerious * 100}
                    onChange={e => handleChange('brakeDistanceSerious', Number(e.target.value) / 100)}
                    min="1"
                    max="100"
                    step="1"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {formatPercent(localConfig.brakeDistanceSerious * 100)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Badge variant="warning">速度缺口</Badge>
                理论与实际速度最大差值阈值
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    警告阈值 <span className="text-slate-400">(m/s)</span>
                  </label>
                  <input
                    type="number"
                    value={localConfig.speedGapWarning}
                    onChange={e => handleChange('speedGapWarning', Number(e.target.value))}
                    min="0.01"
                    max="5"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {localConfig.speedGapWarning} m/s
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    严重阈值 <span className="text-slate-400">(m/s)</span>
                  </label>
                  <input
                    type="number"
                    value={localConfig.speedGapSerious}
                    onChange={e => handleChange('speedGapSerious', Number(e.target.value))}
                    min="0.01"
                    max="5"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {localConfig.speedGapSerious} m/s
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Badge variant="info">制动延迟</Badge>
                制动指令发出到速度下降的时间差阈值
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    警告阈值 <span className="text-slate-400">(s)</span>
                  </label>
                  <input
                    type="number"
                    value={localConfig.brakeDelayWarning}
                    onChange={e => handleChange('brakeDelayWarning', Number(e.target.value))}
                    min="0.01"
                    max="5"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {localConfig.brakeDelayWarning} s
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    严重阈值 <span className="text-slate-400">(s)</span>
                  </label>
                  <input
                    type="number"
                    value={localConfig.brakeDelaySerious}
                    onChange={e => handleChange('brakeDelaySerious', Number(e.target.value))}
                    min="0.01"
                    max="5"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {localConfig.brakeDelaySerious} s
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Badge variant="danger">载荷超限</Badge>
                实际载荷与额定载荷比值阈值
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    超限阈值 <span className="text-slate-400">(%)</span>
                  </label>
                  <input
                    type="number"
                    value={localConfig.overloadThreshold * 100}
                    onChange={e => handleChange('overloadThreshold', Number(e.target.value) / 100)}
                    min="100"
                    max="200"
                    step="1"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {formatPercent(localConfig.overloadThreshold * 100)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Badge variant="info">计算参数</Badge>
                制动距离计算公式参数
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    基准摩擦系数
                  </label>
                  <input
                    type="number"
                    value={localConfig.baseFrictionCoefficient}
                    onChange={e => handleChange('baseFrictionCoefficient', Number(e.target.value))}
                    min="0.01"
                    max="1"
                    step="0.001"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {localConfig.baseFrictionCoefficient}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    载荷影响系数
                  </label>
                  <input
                    type="number"
                    value={localConfig.loadInfluenceFactor}
                    onChange={e => handleChange('loadInfluenceFactor', Number(e.target.value))}
                    min="0"
                    max="1"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    当前: {localConfig.loadInfluenceFactor}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              配置说明
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                <strong>制动距离公式:</strong><br />
                <code className="bg-slate-100 px-1 rounded">S = v² / (2 × g × f)</code>
              </p>
              <p>
                <strong>摩擦系数修正:</strong><br />
                <code className="bg-slate-100 px-1 rounded">f = f₀ × (1 + α × (L/Lₙ - 0.5))</code>
              </p>
              <p>
                其中:<br />
                • f₀ = 基准摩擦系数<br />
                • α = 载荷影响系数<br />
                • L = 实际载荷<br />
                • Lₙ = 额定载荷
              </p>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-slate-500">
                  重力加速度 g = 9.8 m/s²
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              数据存储
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">电梯档案</span>
                <span className="font-medium text-slate-900">{dataStats.profiles}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">检验记录</span>
                <span className="font-medium text-slate-900">{dataStats.records}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">制动计算</span>
                <span className="font-medium text-slate-900">{dataStats.calculations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">异常检测</span>
                <span className="font-medium text-slate-900">{dataStats.detections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">坏行记录</span>
                <span className="font-medium text-slate-900">{dataStats.badRows}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">追溯记录</span>
                <span className="font-medium text-slate-900">{dataStats.traces}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-600 font-medium">总计</span>
                <span className="font-bold text-slate-900">{dataStats.total}</span>
              </div>
            </div>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <h3 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              危险操作
            </h3>
            <p className="text-xs text-red-700 mb-4">
              清空所有数据将删除所有导入的检验记录、计算结果和坏行记录。此操作不可恢复。
            </p>
            {showClearConfirm ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-800">
                  确定要清空所有数据吗？
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" onClick={handleClearData}>
                    确认清空
                  </Button>
                  <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="danger"
                className="w-full"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowClearConfirm(true)}
                disabled={dataStats.total === 0}
              >
                清空所有数据
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
