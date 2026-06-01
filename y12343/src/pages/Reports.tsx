import { useState } from 'react';
import { useStore } from '@/store';
import { FileBarChart, Plus, Eye, Trash2, X, Check, Play, AlertTriangle, Zap, ArrowRight } from 'lucide-react';
import { performFullCalculation } from '@/utils/calculator';
import { Link } from 'react-router-dom';
import type { EmfUnit } from '@/types';

export default function ReportsPage() {
  const { coils, magneticSequences, reports, addReport, deleteReport } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCoilId, setSelectedCoilId] = useState('');
  const [selectedMagneticId, setSelectedMagneticId] = useState('');
  const [reportName, setReportName] = useState('');
  const [emfUnit, setEmfUnit] = useState<EmfUnit>('mV');

  const handleCreateReport = () => {
    if (!selectedCoilId || !selectedMagneticId) return;

    const coil = coils.find(c => c.id === selectedCoilId);
    const sequence = magneticSequences.find(s => s.id === selectedMagneticId);
    
    if (!coil || !sequence) return;

    const calcResult = performFullCalculation(coil, sequence, emfUnit);
    
    addReport({
      coilId: selectedCoilId,
      magneticId: selectedMagneticId,
      name: reportName || `报告 ${new Date().toLocaleDateString('zh-CN')}`,
      ...calcResult,
      emfUnit,
      remark: calcResult.anomalies.length > 0 ? '检测到数据异常，请仔细检查' : '数据正常',
    });

    setShowCreateModal(false);
    setSelectedCoilId('');
    setSelectedMagneticId('');
    setReportName('');
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个测算报告吗？')) {
      deleteReport(id);
    }
  };

  const getCoilName = (coilId: string) => {
    const coil = coils.find(c => c.id === coilId);
    return coil?.name || '未知线圈';
  };

  const getSequenceName = (magneticId: string) => {
    const sequence = magneticSequences.find(s => s.id === magneticId);
    return sequence?.name || '未知序列';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">测算报告</h1>
          <p className="text-primary-300 mt-1">电动势计算与异常检测报告</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={coils.length === 0 || magneticSequences.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          生成报告
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="card p-12 text-center">
          <FileBarChart className="w-16 h-16 mx-auto mb-4 text-primary-400 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">暂无测算报告</h3>
          <p className="text-primary-400 mb-6">
            {coils.length === 0 || magneticSequences.length === 0
              ? '请先创建线圈参数和磁场序列'
              : '点击"生成报告"创建第一个测算报告'}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/coils" className="btn-secondary flex items-center gap-2">
              <Zap className="w-4 h-4" />
              管理线圈
            </Link>
            <Link to="/magnetic" className="btn-secondary flex items-center gap-2">
              <FileBarChart className="w-4 h-4" />
              管理磁场
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reports.map(report => (
            <div key={report.id} className="card card-hover overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{report.name}</h3>
                    <p className="text-sm text-primary-400 mt-1">
                      {new Date(report.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/reports/${report.id}`}
                      className="p-2 rounded-lg hover:bg-primary-600/20 text-primary-300 hover:text-primary-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 rounded-lg hover:bg-accent-error/20 text-primary-300 hover:text-accent-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-primary-400">线圈</span>
                    <span className="text-white">{getCoilName(report.coilId)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-400">磁场序列</span>
                    <span className="text-white">{getSequenceName(report.magneticId)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-400">数据点</span>
                    <span className="text-white font-mono">{report.calculationResults.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-400">电动势单位</span>
                    <span className="text-white font-mono">{report.emfUnit}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dark-border/50">
                  <div className="flex items-center gap-4 mb-3">
                    {report.hasMissingTurns ? (
                      <div className="flex items-center gap-2 text-accent-error">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">匝数缺失</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-accent-success">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">匝数正常</span>
                      </div>
                    )}
                    {report.hasFluxReversal && (
                      <div className="flex items-center gap-2 text-accent-warning">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">磁通反向</span>
                      </div>
                    )}
                    {report.hasTimeUnitError && (
                      <div className="flex items-center gap-2 text-accent-warning">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">时间异常</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-primary-400">平均电动势: </span>
                      <span className="text-white font-mono">{report.boundaryCheck.avgEmf.toFixed(4)} {report.emfUnit}</span>
                    </div>
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      查看详情 <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4 animate-slide-up">
            <div className="p-6 border-b border-dark-border/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary-400" />
                  生成测算报告
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-dark-border/50 text-primary-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">报告名称</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  className="input"
                  placeholder="输入报告名称（可选）"
                />
              </div>

              <div>
                <label className="label">选择线圈</label>
                <select
                  value={selectedCoilId}
                  onChange={e => setSelectedCoilId(e.target.value)}
                  className="input"
                >
                  <option value="">请选择线圈</option>
                  {coils.map(coil => (
                    <option key={coil.id} value={coil.id}>{coil.name} ({coil.turns} 匝)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">选择磁场序列</label>
                <select
                  value={selectedMagneticId}
                  onChange={e => setSelectedMagneticId(e.target.value)}
                  className="input"
                >
                  <option value="">请选择磁场序列</option>
                  {magneticSequences.map(seq => (
                    <option key={seq.id} value={seq.id}>{seq.name} ({seq.dataPoints.length} 点)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">电动势单位</label>
                <select
                  value={emfUnit}
                  onChange={e => setEmfUnit(e.target.value as EmfUnit)}
                  className="input"
                >
                  <option value="V">伏特 (V)</option>
                  <option value="mV">毫伏 (mV)</option>
                  <option value="μV">微伏 (μV)</option>
                </select>
              </div>

              <div className="bg-dark-bg/50 rounded-lg p-4">
                <p className="text-sm text-primary-300">
                  <strong className="text-primary-200">计算说明：</strong>
                  系统将根据法拉第电磁感应定律 ε = -N · dΦ/dt 计算感应电动势，
                  并自动检测匝数缺失、时间单位错误和磁通反向等异常情况。
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-dark-border/50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleCreateReport}
                disabled={!selectedCoilId || !selectedMagneticId}
                className="btn-primary flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                开始计算
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
