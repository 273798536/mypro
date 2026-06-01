import { useApp } from '../store';
import { convertLengthToMeters, convertAngleToRadians } from '../physics';
import { getAnomalyLabel, getAnomalyIcon } from '../anomalyDetector';
import { ArrowRight, ArrowLeft, X, AlertTriangle, Calculator, Ruler, Activity, FileText, Link } from 'lucide-react';

interface RecordDetailProps {
  recordId: string;
  onClose: () => void;
  onNavigateToAnomaly?: () => void;
}

export const RecordDetail = ({ recordId, onClose }: RecordDetailProps) => {
  const { 
    state, 
    getRecordCalculation, 
    getRecordErrorEstimate, 
    getRecordAnomalies,
    setTracePath
  } = useApp();

  const record = state.records.find(r => r.id === recordId);
  const calculation = getRecordCalculation(recordId);
  const errorEstimate = getRecordErrorEstimate(recordId);
  const anomalies = getRecordAnomalies(recordId);
  const batch = state.batches.find(b => b.id === record?.batchId);
  const tracePath = state.tracePath;

  if (!record || !calculation || !errorEstimate) {
    return (
      <div className="card">
        <div className="card-body text-center py-8 text-slate-400">
          <p>记录不存在或正在加载...</p>
        </div>
      </div>
    );
  }

  const lengthMeters = convertLengthToMeters(record.length, record.lengthUnit);
  const angleRadians = convertAngleToRadians(record.angle, record.angleUnit);

  const TraceStep = ({ 
    step, 
    label, 
    icon: Icon, 
    active 
  }: { 
    step: 'record' | 'calculation' | 'error' | 'anomaly';
    label: string;
    icon: React.ElementType;
    active: boolean;
  }) => (
    <button
      onClick={() => setTracePath({
        from: tracePath?.from || 'record',
        recordId,
        step
      })}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-primary-100 text-primary-700 shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  const showRecord = !tracePath || tracePath.step === 'record';
  const showCalculation = tracePath?.step === 'calculation';
  const showError = tracePath?.step === 'error';
  const showAnomaly = tracePath?.step === 'anomaly';

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X size={20} />
          </button>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              记录详情
              {record.sourceRef && (
                <span className="ml-2 text-sm font-normal text-slate-500 flex items-center gap-1">
                  <Link size={14} />
                  来源: {record.sourceRef}
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-500">
              {batch?.name || '未知批次'} · {new Date(record.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        {anomalies.length > 0 && (
          <span className="badge badge-warning flex items-center gap-1">
            <AlertTriangle size={12} />
            {anomalies.length} 项异常
          </span>
        )}
      </div>

      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 mr-2">溯源路径:</span>
          <TraceStep step="record" label="原始记录" icon={Ruler} active={showRecord} />
          <ArrowRight size={16} className="text-slate-300" />
          <TraceStep step="calculation" label="周期计算" icon={Calculator} active={showCalculation} />
          <ArrowRight size={16} className="text-slate-300" />
          <TraceStep step="error" label="误差分析" icon={Activity} active={showError} />
          <ArrowRight size={16} className="text-slate-300" />
          <TraceStep step="anomaly" label="异常说明" icon={AlertTriangle} active={showAnomaly} />
        </div>
      </div>

      <div className="card-body space-y-6">
        {showRecord && (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <Ruler size={18} className="text-primary-600" />
              原始测量数据
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">摆长</p>
                <p className="text-lg font-semibold text-slate-800">
                  {record.length} {record.lengthUnit}
                </p>
                <p className="text-xs text-slate-400">= {lengthMeters.toFixed(4)} m</p>
                {!record.lengthUnitConfirmed && (
                  <p className="text-xs text-amber-500 mt-1">单位未确认</p>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">摆角</p>
                <p className={`text-lg font-semibold ${
                  calculation.usesLargeAngle ? 'text-amber-600' : 'text-slate-800'
                }`}>
                  {record.angle} {record.angleUnit === 'deg' ? '°' : 'rad'}
                </p>
                <p className="text-xs text-slate-400">= {angleRadians.toFixed(4)} rad</p>
                {calculation.usesLargeAngle && (
                  <p className="text-xs text-amber-500 mt-1">大角度</p>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">总计时</p>
                <p className="text-lg font-semibold text-slate-800">
                  {record.totalTiming} s
                </p>
                <p className="text-xs text-slate-400">{record.measuredCount} 个周期</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">测量周期</p>
                <p className="text-lg font-semibold text-slate-800">
                  {record.measuredPeriod.toFixed(4)} s
                </p>
                <p className="text-xs text-slate-400">
                  计算值: {(record.totalTiming / record.measuredCount).toFixed(4)} s
                </p>
              </div>
            </div>
            {record.notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 flex items-center gap-2 mb-1">
                  <FileText size={16} />
                  课堂备注
                </p>
                <p className="text-sm text-blue-700">{record.notes}</p>
              </div>
            )}
          </div>
        )}

        {showCalculation && (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <Calculator size={18} className="text-primary-600" />
              周期计算结果
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`rounded-lg p-4 border-2 ${
                calculation.usesLargeAngle 
                  ? 'border-slate-200 bg-slate-50' 
                  : 'border-primary-300 bg-primary-50'
              }`}>
                <p className="text-sm text-slate-500 mb-1">小角度近似 T₀</p>
                <p className="text-2xl font-bold text-slate-800">
                  {calculation.smallAnglePeriod.toFixed(4)} s
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  T = 2π√(L/g)
                </p>
                {!calculation.usesLargeAngle && (
                  <span className="badge badge-success mt-2">采用此值</span>
                )}
              </div>
              <div className={`rounded-lg p-4 border-2 ${
                calculation.usesLargeAngle 
                  ? 'border-amber-300 bg-amber-50' 
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <p className="text-sm text-slate-500 mb-1">大角度修正 T</p>
                <p className="text-2xl font-bold text-slate-800">
                  {calculation.largeAnglePeriod.toFixed(4)} s
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  修正量: +{calculation.largeAngleCorrection.toFixed(2)}%
                </p>
                {calculation.usesLargeAngle && (
                  <span className="badge badge-warning mt-2">采用此值</span>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                <p className="text-sm text-slate-500 mb-1">小角度近似误差</p>
                <p className={`text-2xl font-bold ${
                  calculation.smallAngleApproxError > 2 ? 'text-red-600' :
                  calculation.smallAngleApproxError > 0.5 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {calculation.smallAngleApproxError.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  相对于大角度公式
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-slate-600 mb-3">计算过程</h5>
              <div className="font-mono text-sm text-slate-700 space-y-2">
                <p>1. 摆长 L = {record.length} {record.lengthUnit} = {lengthMeters.toFixed(4)} m</p>
                <p>2. 摆角 θ = {record.angle}° = {angleRadians.toFixed(4)} rad</p>
                <p>3. 小角度周期 T₀ = 2π√(L/g) = 2π√({lengthMeters.toFixed(4)}/9.80665) = {calculation.smallAnglePeriod.toFixed(4)} s</p>
                <p>4. 大角度修正项 Σ = 1 + (1/2)²sin²(θ/2) + (1·3/2·4)²sin⁴(θ/2) + ...</p>
                <p>5. 大角度周期 T = T₀ × Σ = {calculation.largeAnglePeriod.toFixed(4)} s</p>
                <p>6. 测量误差 = |{record.measuredPeriod.toFixed(4)} - {calculation.usesLargeAngle ? calculation.largeAnglePeriod.toFixed(4) : calculation.smallAnglePeriod.toFixed(4)}| / 理论值 × 100% = <span className="font-bold">{calculation.measuredError.toFixed(2)}%</span></p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setTracePath({ from: 'calculation', recordId, step: 'error' })}
                className="btn btn-primary text-sm"
              >
                查看误差分析 <ArrowRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        )}

        {showError && (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <Activity size={18} className="text-primary-600" />
              误差分析报告
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 mb-1">系统误差</p>
                <p className="text-2xl font-bold text-blue-800">
                  {errorEstimate.systematicError.toFixed(3)}%
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  摆长 + 角度测量误差
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 mb-1">随机误差</p>
                <p className="text-2xl font-bold text-green-800">
                  {errorEstimate.randomError.toFixed(3)}%
                </p>
                <p className="text-xs text-green-600 mt-2">
                  计时 + 计数误差
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">总合成误差</p>
                <p className={`text-2xl font-bold ${
                  errorEstimate.totalError > 5 ? 'text-red-600' :
                  errorEstimate.totalError > 2 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {errorEstimate.totalError.toFixed(3)}%
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  方和根合成
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-slate-600 mb-3">误差来源明细</h5>
              <div className="space-y-2">
                {errorEstimate.errorSources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-700">{source.description}</p>
                    </div>
                    <span className={`font-mono font-bold ${
                      source.value > 1 ? 'text-red-600' :
                      source.value > 0.1 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {source.value.toFixed(3)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-slate-600 mb-3">误差合成公式</h5>
              <div className="font-mono text-sm text-slate-700">
                <p>σ_total = √(σ_systematic² + σ_random² + σ_approx²)</p>
                <p className="mt-2">其中：</p>
                <p className="ml-4">• σ_systematic = √(σ_length² + σ_angle²) = √({errorEstimate.lengthError.toFixed(3)}² + {errorEstimate.angleError.toFixed(3)}²) = {errorEstimate.systematicError.toFixed(3)}%</p>
                <p className="ml-4">• σ_random = √(σ_timing² + σ_count²) = √({errorEstimate.timingError.toFixed(3)}² + {errorEstimate.lengthError.toFixed(3)}²) = {errorEstimate.randomError.toFixed(3)}%</p>
                <p className="ml-4">• σ_approx = 近似误差 = {calculation.smallAngleApproxError.toFixed(3)}%</p>
                <p className="mt-2 font-bold">
                  σ_total = √({errorEstimate.systematicError.toFixed(3)}² + {errorEstimate.randomError.toFixed(3)}² + {calculation.smallAngleApproxError.toFixed(3)}²) = {errorEstimate.totalError.toFixed(3)}%
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setTracePath({ from: 'error', recordId, step: 'calculation' })}
                className="btn btn-secondary text-sm"
              >
                <ArrowLeft size={16} className="mr-1" /> 返回周期计算
              </button>
              <button
                onClick={() => setTracePath({ from: 'error', recordId, step: 'anomaly' })}
                className="btn btn-primary text-sm"
              >
                查看异常说明 <ArrowRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        )}

        {showAnomaly && (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              异常检测说明
              <span className="badge badge-warning ml-2">
                共 {anomalies.length} 项
              </span>
            </h4>

            {anomalies.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <span className="text-4xl mb-2 block">✅</span>
                <p className="text-green-800 font-medium">未检测到异常</p>
                <p className="text-sm text-green-600 mt-1">所有数据项均在正常范围内</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.map((anomaly, index) => (
                  <div 
                    key={index}
                    className={`rounded-lg p-4 border-2 ${
                      anomaly.severity === 'high' ? 'border-red-300 bg-red-50' :
                      anomaly.severity === 'medium' ? 'border-amber-300 bg-amber-50' :
                      'border-blue-300 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getAnomalyIcon(anomaly.type)}</span>
                        <div>
                          <span className={`badge ${
                            anomaly.severity === 'high' ? 'badge-error' :
                            anomaly.severity === 'medium' ? 'badge-warning' :
                            'badge-info'
                          }`}>
                            {getAnomalyLabel(anomaly.type)}
                          </span>
                          <span className={`ml-2 text-xs font-medium ${
                            anomaly.severity === 'high' ? 'text-red-700' :
                            anomaly.severity === 'medium' ? 'text-amber-700' :
                            'text-blue-700'
                          }`}>
                            {anomaly.severity === 'high' ? '高风险' :
                             anomaly.severity === 'medium' ? '中风险' : '低风险'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className={`text-sm ${
                      anomaly.severity === 'high' ? 'text-red-800' :
                      anomaly.severity === 'medium' ? 'text-amber-800' :
                      'text-blue-800'
                    }`}>
                      {anomaly.description}
                    </p>
                    <div className={`mt-3 p-3 rounded-lg ${
                      anomaly.severity === 'high' ? 'bg-red-100' :
                      anomaly.severity === 'medium' ? 'bg-amber-100' :
                      'bg-blue-100'
                    }`}>
                      <p className={`text-sm font-medium ${
                        anomaly.severity === 'high' ? 'text-red-800' :
                        anomaly.severity === 'medium' ? 'text-amber-800' :
                        'text-blue-800'
                      }`}>
                        💡 建议: {anomaly.suggestion}
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className={`text-xs ${
                        anomaly.severity === 'high' ? 'text-red-600' :
                        anomaly.severity === 'medium' ? 'text-amber-600' :
                        'text-blue-600'
                      }`}>
                        影响字段: {anomaly.affectedFields.join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setTracePath({ from: 'anomaly', recordId, step: 'error' })}
                className="btn btn-secondary text-sm"
              >
                <ArrowLeft size={16} className="mr-1" /> 返回误差分析
              </button>
              <button
                onClick={() => setTracePath({ from: 'anomaly', recordId, step: 'record' })}
                className="btn btn-primary text-sm"
              >
                返回原始记录 <ArrowRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
