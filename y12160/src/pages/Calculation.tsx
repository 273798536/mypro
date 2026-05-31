import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  Calculator,
  Settings,
  Gauge,
  Droplets,
  Ruler,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Save,
  Info
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { performCalculation, getSprayQualityLabel, getSprayQualityColor } from '../services/calculation';
import { performValidation } from '../services/validation';
import type { CalculationInput } from '../types';

export function Calculation() {
  const navigate = useNavigate();
  const { nozzles, pressureRecords, performCalculationAndSave } = useAppStore();
  
  const [selectedNozzleId, setSelectedNozzleId] = useState('');
  const [selectedPressureId, setSelectedPressureId] = useState('');
  const [customPressure, setCustomPressure] = useState<number | ''>('');
  const [flowRate, setFlowRate] = useState<number | ''>('');
  const [viscosity, setViscosity] = useState<number | ''>('');
  const [sprayHeight, setSprayHeight] = useState(0.5);
  const [result, setResult] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);

  const selectedNozzle = nozzles.find(n => n.id === selectedNozzleId);
  const selectedPressureRecord = pressureRecords.find(p => p.id === selectedPressureId);
  
  const actualPressure = selectedPressureRecord?.pressure ?? (customPressure || 0);
  const actualFlowRate = flowRate ?? 0;
  const actualViscosity = viscosity === '' ? null : viscosity;

  const availablePressureRecords = pressureRecords.filter(p => p.nozzleId === selectedNozzleId);

  const previewResult = useMemo(() => {
    if (!selectedNozzle || !actualPressure || !actualFlowRate) return null;
    const input: CalculationInput = {
      nozzleId: selectedNozzleId,
      pressure: actualPressure,
      flowRate: actualFlowRate,
      viscosity: actualViscosity,
      sprayHeight
    };
    return performCalculation(selectedNozzle, input);
  }, [selectedNozzle, actualPressure, actualFlowRate, actualViscosity, sprayHeight, selectedNozzleId]);

  const previewValidation = useMemo(() => {
    if (!selectedNozzle || !actualPressure || !actualFlowRate) return null;
    return performValidation(actualPressure, actualFlowRate, actualViscosity, selectedNozzle);
  }, [selectedNozzle, actualPressure, actualFlowRate, actualViscosity]);

  const handleCalculate = () => {
    if (!selectedNozzleId || !actualPressure || !actualFlowRate) return;
    
    const input: CalculationInput = {
      nozzleId: selectedNozzleId,
      pressureRecordId: selectedPressureId || undefined,
      pressure: actualPressure,
      flowRate: actualFlowRate,
      viscosity: actualViscosity,
      sprayHeight
    };
    
    const calcResult = performCalculationAndSave(input);
    if (calcResult) {
      setResult(calcResult);
      setValidation(calcResult.validationResult);
      navigate(`/results/${calcResult.id}`);
    }
  };

  const getStatusBadgeType = () => {
    if (!previewValidation) return 'info';
    if (previewValidation.nozzleBlocked) return 'error';
    if (previewValidation.requiresConfirmation) return 'pending';
    if (previewValidation.viscosityMissing) return 'warning';
    return 'success';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">雾化试算</h1>
        <p className="text-slate-500 mt-1">输入喷嘴参数和工作条件，计算雾化效果</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="text-blue-600" size={20} />
              <h2 className="font-semibold text-slate-900">喷嘴选择</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">选择喷嘴型号</label>
              <select
                value={selectedNozzleId}
                onChange={(e) => {
                  setSelectedNozzleId(e.target.value);
                  setSelectedPressureId('');
                }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">请选择喷嘴</option>
                {nozzles.map((nozzle) => (
                  <option key={nozzle.id} value={nozzle.id}>
                    {nozzle.model} - {nozzle.manufacturer}
                  </option>
                ))}
              </select>
            </div>
            {selectedNozzle && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">孔径</span>
                  <span className="font-medium text-slate-900">{selectedNozzle.orificeDiameter} mm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">喷雾角度</span>
                  <span className="font-medium text-slate-900">{selectedNozzle.sprayAngle}°</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">标称流量</span>
                  <span className="font-medium text-slate-900">{selectedNozzle.nominalFlowRate} L/min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">工作压力范围</span>
                  <span className="font-medium text-slate-900">{selectedNozzle.minPressure} - {selectedNozzle.maxPressure} bar</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="text-purple-600" size={20} />
              <h2 className="font-semibold text-slate-900">工作参数</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">选择压力记录（可选）</label>
                <select
                  value={selectedPressureId}
                  onChange={(e) => {
                    setSelectedPressureId(e.target.value);
                    const record = pressureRecords.find(p => p.id === e.target.value);
                    if (record) {
                      setCustomPressure(record.pressure);
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">手动输入压力</option>
                  {availablePressureRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.pressure} bar - {record.location} ({new Date(record.recordTime).toLocaleDateString('zh-CN')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">工作压力 (bar)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customPressure}
                  onChange={(e) => {
                    setCustomPressure(e.target.value ? parseFloat(e.target.value) : '');
                    setSelectedPressureId('');
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="输入工作压力"
                />
                {selectedNozzle && customPressure && (customPressure < selectedNozzle.minPressure || customPressure > selectedNozzle.maxPressure) && (
                  <p className="mt-2 text-sm text-orange-600 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    压力超出喷嘴工作范围 ({selectedNozzle.minPressure} - {selectedNozzle.maxPressure} bar)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">实际流量 (L/min)</label>
                <input
                  type="number"
                  step="0.1"
                  value={flowRate}
                  onChange={(e) => setFlowRate(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="输入实测流量"
                />
                {selectedNozzle && flowRate && flowRate < selectedNozzle.nominalFlowRate * 0.7 && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    流量低于标称值70%，可能存在喷嘴堵塞
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  药液黏度 (mPa·s)
                  <span className="text-slate-400 font-normal ml-1">（选填，水为1）</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={viscosity}
                  onChange={(e) => setViscosity(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="输入药液黏度，留空使用默认值1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">喷雾高度 (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sprayHeight}
                  onChange={(e) => setSprayHeight(parseFloat(e.target.value) || 0.5)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!selectedNozzleId || !actualPressure || !actualFlowRate}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Calculator size={20} />
            执行雾化试算
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Droplets className="text-cyan-600" size={20} />
                <h2 className="font-semibold text-slate-900">试算预览</h2>
              </div>
              {previewValidation && (
                <StatusBadge type={getStatusBadgeType()}>
                  {previewValidation.nozzleBlocked ? '堵塞预警' : 
                   previewValidation.requiresConfirmation ? '待确认' :
                   previewValidation.viscosityMissing ? '黏度待补' : '正常'}
                </StatusBadge>
              )}
            </div>
            
            {previewResult ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <p className="text-sm text-blue-600 mb-1">雾滴直径 (VMD)</p>
                    <p className="text-3xl font-bold text-blue-700">{previewResult.dropletSize}</p>
                    <p className="text-xs text-blue-500 mt-1">μm</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <p className="text-sm text-green-600 mb-1">覆盖宽度</p>
                    <p className="text-3xl font-bold text-green-700">{previewResult.coverageWidth}</p>
                    <p className="text-xs text-green-500 mt-1">m</p>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">喷雾质量评估</span>
                    <span 
                      className="text-lg font-semibold"
                      style={{ color: getSprayQualityColor(previewResult.sprayQuality) }}
                    >
                      {getSprayQualityLabel(previewResult.sprayQuality)}
                    </span>
                  </div>
                  {previewResult.isEstimate && (
                    <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <Info size={12} />
                      基于默认黏度(水)的估算值，请补录实际药液黏度获得精确结果
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Calculator size={48} className="mx-auto mb-4 opacity-30" />
                <p>选择喷嘴并输入参数后显示预览</p>
              </div>
            )}
          </div>

          {previewValidation && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-amber-500" size={20} />
                <h2 className="font-semibold text-slate-900">参数校验结果</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {previewValidation.pressureOutOfRange ? (
                    <AlertTriangle className="text-orange-500 flex-shrink-0" size={18} />
                  ) : (
                    <CheckCircle className="text-green-500 flex-shrink-0" size={18} />
                  )}
                  <div>
                    <p className={`font-medium ${previewValidation.pressureOutOfRange ? 'text-orange-600' : 'text-green-600'}`}>
                      压力校验 {previewValidation.pressureOutOfRange ? '不通过' : '通过'}
                    </p>
                    {previewValidation.pressureWarning && (
                      <p className="text-sm text-slate-500 mt-0.5">{previewValidation.pressureWarning}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {previewValidation.viscosityMissing ? (
                    <Clock className="text-amber-500 flex-shrink-0" size={18} />
                  ) : (
                    <CheckCircle className="text-green-500 flex-shrink-0" size={18} />
                  )}
                  <div>
                    <p className={`font-medium ${previewValidation.viscosityMissing ? 'text-amber-600' : 'text-green-600'}`}>
                      黏度数据 {previewValidation.viscosityMissing ? '待补录' : '已提供'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {previewValidation.nozzleBlocked ? (
                    <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
                  ) : (
                    <CheckCircle className="text-green-500 flex-shrink-0" size={18} />
                  )}
                  <div>
                    <p className={`font-medium ${previewValidation.nozzleBlocked ? 'text-red-600' : 'text-green-600'}`}>
                      喷嘴状态 {previewValidation.nozzleBlocked ? '疑似堵塞' : '正常'}
                    </p>
                  </div>
                </div>

                {previewValidation.nextStepContact && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                      <span className="font-semibold">下一步：</span>
                      {previewValidation.nextStepContact}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPressureRecord && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-900 mb-3">关联压力记录详情</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <User size={14} />
                  <span>操作人员：{selectedPressureRecord.operator}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={14} />
                  <span>作业地点：{selectedPressureRecord.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock size={14} />
                  <span>记录时间：{new Date(selectedPressureRecord.recordTime).toLocaleString('zh-CN')}</span>
                </div>
                {selectedPressureRecord.remarks && (
                  <p className="text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    备注：{selectedPressureRecord.remarks}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
