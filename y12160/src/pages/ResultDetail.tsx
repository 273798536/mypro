import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  ArrowLeft,
  Settings,
  Gauge,
  Droplets,
  Ruler,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Check,
  Edit3,
  Save,
  History,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getSprayQualityLabel, getSprayQualityColor } from '../services/calculation';

export function ResultDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getResultById, 
    getNozzleById, 
    getPressureRecordById,
    updateResultViscosity,
    confirmPendingResult,
    deleteCalculationResult
  } = useAppStore();

  const result = getResultById(id || '');
  const nozzle = result ? getNozzleById(result.nozzleId) : undefined;
  const pressureRecord = result ? getPressureRecordById(result.pressureRecordId) : undefined;

  const [isEditingViscosity, setIsEditingViscosity] = useState(false);
  const [newViscosity, setNewViscosity] = useState(result?.viscosity ?? 1);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500 mb-4">未找到该试算结果</p>
        <Link to="/results" className="text-blue-600 hover:text-blue-700 font-medium">
          返回结果列表
        </Link>
      </div>
    );
  }

  const getBadgeType = () => {
    if (result.status === 'pending') return 'pending';
    if (result.status === 'blocked') return 'error';
    if (result.validationResult.viscosityMissing) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (result.status === 'pending') return '待确认';
    if (result.status === 'blocked') return '堵塞预警';
    if (result.validationResult.viscosityMissing) return '黏度待补';
    return '正常';
  };

  const handleUpdateViscosity = () => {
    if (result) {
      updateResultViscosity(result.id, newViscosity);
      setIsEditingViscosity(false);
    }
  };

  const handleConfirm = () => {
    if (result) {
      confirmPendingResult(result.id);
    }
  };

  const handleDelete = () => {
    if (confirm('确定要删除这条试算结果吗？')) {
      deleteCalculationResult(result.id);
      navigate('/results');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/results"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">试算结果详情</h1>
            <p className="text-slate-500 mt-1">{nozzle?.model || '未知喷嘴'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge type={getBadgeType()}>
            {getStatusText()}
          </StatusBadge>
          <button
            onClick={handleDelete}
            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">雾化计算结果</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-center">
                <Droplets className="mx-auto text-blue-500 mb-2" size={28} />
                <p className="text-sm text-blue-600 mb-1">雾滴直径 (VMD)</p>
                <p className="text-3xl font-bold text-blue-700">{result.dropletSize}</p>
                <p className="text-xs text-blue-500 mt-1">μm</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl text-center">
                <Ruler className="mx-auto text-green-500 mb-2" size={28} />
                <p className="text-sm text-green-600 mb-1">覆盖宽度</p>
                <p className="text-3xl font-bold text-green-700">{result.coverageWidth}</p>
                <p className="text-xs text-green-500 mt-1">m</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl text-center">
                <CheckCircle className="mx-auto text-purple-500 mb-2" size={28} />
                <p className="text-sm text-purple-600 mb-1">喷雾质量</p>
                <p 
                  className="text-3xl font-bold"
                  style={{ color: getSprayQualityColor(result.sprayQuality) }}
                >
                  {getSprayQualityLabel(result.sprayQuality)}
                </p>
                <p className="text-xs text-purple-500 mt-1">等级</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">参数校验结论</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50">
                {result.validationResult.pressureOutOfRange ? (
                  <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <p className="font-medium text-slate-900">压力校验</p>
                  <p className={result.validationResult.pressureOutOfRange ? 'text-orange-600' : 'text-green-600'}>
                    {result.validationResult.pressureOutOfRange ? '不通过' : '通过'}
                  </p>
                  {result.validationResult.pressureWarning && (
                    <p className="text-sm text-slate-500 mt-1">{result.validationResult.pressureWarning}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50">
                {result.validationResult.viscosityMissing ? (
                  <Clock className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">黏度数据</p>
                    {!isEditingViscosity && (
                      <button
                        onClick={() => {
                          setNewViscosity(result.viscosity ?? 1);
                          setIsEditingViscosity(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Edit3 size={14} />
                        {result.validationResult.viscosityMissing ? '补录' : '修改'}
                      </button>
                    )}
                  </div>
                  {isEditingViscosity ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        step="0.1"
                        value={newViscosity}
                        onChange={(e) => setNewViscosity(parseFloat(e.target.value) || 1)}
                        className="w-24 px-2 py-1 border border-slate-200 rounded"
                      />
                      <span className="text-slate-500 text-sm">mPa·s</span>
                      <button
                        onClick={handleUpdateViscosity}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        <Save size={12} />
                        保存
                      </button>
                    </div>
                  ) : (
                    <p className={result.validationResult.viscosityMissing ? 'text-amber-600' : 'text-green-600'}>
                      {result.validationResult.viscosityMissing ? '待补录' : `${result.viscosity} mPa·s`}
                      {result.viscosityAddedLater && (
                        <span className="ml-2 text-xs text-slate-400">（后补）</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50">
                {result.validationResult.nozzleBlocked ? (
                  <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <p className="font-medium text-slate-900">喷嘴状态</p>
                  <p className={result.validationResult.nozzleBlocked ? 'text-red-600' : 'text-green-600'}>
                    {result.validationResult.nozzleBlocked ? '疑似堵塞' : '正常'}
                  </p>
                  {result.validationResult.nozzleBlocked && (
                    <p className="text-sm text-slate-500 mt-1">
                      实际流量低于标称值70%，建议检查喷嘴
                    </p>
                  )}
                </div>
              </div>

              {result.validationResult.nextStepContact && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <span className="font-semibold">下一步建议：</span>
                    {result.validationResult.nextStepContact}
                  </p>
                </div>
              )}

              {result.status === 'pending' && (
                <button
                  onClick={handleConfirm}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Check size={18} />
                  确认通过
                </button>
              )}
            </div>
          </div>

          {result.conclusionChanges.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-900">结论变更记录</h2>
              </div>
              <div className="space-y-3">
                {result.conclusionChanges.map((change, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{change.reason}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {change.field}: {change.oldValue || '空'} → {change.newValue}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {change.changedBy} · {new Date(change.changedAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="text-blue-500" size={18} />
              <h3 className="font-semibold text-slate-900">喷嘴参数</h3>
            </div>
            {nozzle ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">型号</span>
                  <span className="font-medium text-slate-900">{nozzle.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">制造商</span>
                  <span className="font-medium text-slate-900">{nozzle.manufacturer}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">孔径</span>
                  <span className="font-medium text-slate-900">{nozzle.orificeDiameter} mm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">喷雾角度</span>
                  <span className="font-medium text-slate-900">{nozzle.sprayAngle}°</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">标称流量</span>
                  <span className="font-medium text-slate-900">{nozzle.nominalFlowRate} L/min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">工作压力</span>
                  <span className="font-medium text-slate-900">{nozzle.minPressure} - {nozzle.maxPressure} bar</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">喷嘴参数已删除</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="text-purple-500" size={18} />
              <h3 className="font-semibold text-slate-900">工作参数</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">工作压力</span>
                <span className={`font-medium ${pressureRecord?.isOutOfRange ? 'text-orange-600' : 'text-slate-900'}`}>
                  {pressureRecord?.pressure.toFixed(1) || '-'} bar
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">实际流量</span>
                <span className="font-medium text-slate-900">{result.flowRate} L/min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">计算时间</span>
                <span className="font-medium text-slate-900 text-sm">
                  {new Date(result.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="text-cyan-500" size={18} />
              <h3 className="font-semibold text-slate-900">数据追溯链路</h3>
            </div>
            <div className="space-y-3">
              <Link
                to="/nozzles"
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="text-sm text-slate-600">喷嘴参数来源</span>
                <span className="text-sm text-blue-600">查看 →</span>
              </Link>
              <Link
                to="/pressure"
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="text-sm text-slate-600">压力记录来源</span>
                <span className="text-sm text-blue-600">查看 →</span>
              </Link>
            </div>
            {pressureRecord && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                  <User size={14} />
                  <span>{pressureRecord.operator}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-sm mb-2">
                  <MapPin size={14} />
                  <span>{pressureRecord.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <Clock size={14} />
                  <span>{new Date(pressureRecord.recordTime).toLocaleString('zh-CN')}</span>
                </div>
                {pressureRecord.remarks && (
                  <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    备注: {pressureRecord.remarks}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
