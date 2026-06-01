import { useState } from 'react';
import { useStore } from '@/store';
import { Zap, Plus, Edit2, Trash2, X, Check, PlusCircle, FileText, Eye } from 'lucide-react';
import type { TimeUnit, MagneticUnit, MagneticStatus, MagneticDataPoint } from '@/types';
import { Link } from 'react-router-dom';

interface MagneticFormData {
  coilId: string;
  name: string;
  dataPoints: MagneticDataPoint[];
  timeUnit: TimeUnit;
  magneticUnit: MagneticUnit;
  remark: string;
  status: MagneticStatus;
}

const initialFormData: MagneticFormData = {
  coilId: '',
  name: '',
  dataPoints: [],
  timeUnit: 's',
  magneticUnit: 'T',
  remark: '',
  status: 'complete',
};

export default function MagneticPage() {
  const { coils, magneticSequences, addMagneticSequence, updateMagneticSequence, deleteMagneticSequence, supplementMagneticData } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplementingId, setSupplementingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MagneticFormData>(initialFormData);
  const [newDataPoint, setNewDataPoint] = useState<MagneticDataPoint>({ time: 0, magneticFlux: 0 });
  const [supplementPoints, setSupplementPoints] = useState<MagneticDataPoint[]>([]);

  const handleOpenCreate = () => {
    setFormData({
      ...initialFormData,
      coilId: coils[0]?.id || '',
      dataPoints: generateSampleData(),
    });
    setEditingId(null);
    setShowModal(true);
  };

  const generateSampleData = (): MagneticDataPoint[] => {
    const points: MagneticDataPoint[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i * 0.01;
      points.push({
        time: t,
        magneticFlux: 0.05 * Math.sin(2 * Math.PI * 10 * t) + (Math.random() - 0.5) * 0.005,
      });
    }
    return points;
  };

  const handleOpenEdit = (sequence: typeof magneticSequences[0]) => {
    setFormData({
      coilId: sequence.coilId,
      name: sequence.name,
      dataPoints: [...sequence.dataPoints],
      timeUnit: sequence.timeUnit,
      magneticUnit: sequence.magneticUnit,
      remark: sequence.remark,
      status: sequence.status,
    });
    setEditingId(sequence.id);
    setShowModal(true);
  };

  const handleOpenSupplement = (id: string) => {
    setSupplementingId(id);
    setSupplementPoints([]);
    setShowSupplementModal(true);
  };

  const handleAddDataPoint = () => {
    setFormData({
      ...formData,
      dataPoints: [...formData.dataPoints, { ...newDataPoint }].sort((a, b) => a.time - b.time),
    });
    setNewDataPoint({ time: 0, magneticFlux: 0 });
  };

  const handleAddSupplementPoint = () => {
    setSupplementPoints([...supplementPoints, { ...newDataPoint }]);
    setNewDataPoint({ time: 0, magneticFlux: 0 });
  };

  const handleRemoveDataPoint = (index: number) => {
    setFormData({
      ...formData,
      dataPoints: formData.dataPoints.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.coilId) return;

    if (editingId) {
      updateMagneticSequence(editingId, formData);
    } else {
      addMagneticSequence({
        ...formData,
        isSupplemented: false,
      });
    }
    setShowModal(false);
  };

  const handleSupplement = () => {
    if (!supplementingId || supplementPoints.length === 0) return;
    supplementMagneticData(supplementingId, supplementPoints);
    setShowSupplementModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个磁场序列吗？相关的测算报告也会受到影响。')) {
      deleteMagneticSequence(id);
    }
  };

  const getCoilName = (coilId: string) => {
    const coil = coils.find(c => c.id === coilId);
    return coil?.name || '未知线圈';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">磁场序列</h1>
          <p className="text-primary-300 mt-1">管理实验磁场数据序列</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          新建序列
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-dark-bg/80">
              <tr>
                <th className="table-header">序列名称</th>
                <th className="table-header">关联线圈</th>
                <th className="table-header">数据点</th>
                <th className="table-header">时间单位</th>
                <th className="table-header">磁场单位</th>
                <th className="table-header">状态</th>
                <th className="table-header">补录标记</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {magneticSequences.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-primary-400">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无磁场序列</p>
                    <p className="text-sm mt-1">点击"新建序列"添加第一个磁场数据</p>
                  </td>
                </tr>
              ) : (
                magneticSequences.map((sequence, index) => (
                  <tr
                    key={sequence.id}
                    className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}
                  >
                    <td className="table-cell font-medium text-white">{sequence.name}</td>
                    <td className="table-cell">{getCoilName(sequence.coilId)}</td>
                    <td className="table-cell font-mono">{sequence.dataPoints.length}</td>
                    <td className="table-cell font-mono">{sequence.timeUnit}</td>
                    <td className="table-cell font-mono">{sequence.magneticUnit}</td>
                    <td className="table-cell">
                      <span className={
                        sequence.status === 'complete' ? 'badge-success' :
                        sequence.status === 'partial' ? 'badge-warning' : 'badge-error'
                      }>
                        {sequence.status === 'complete' ? '完整' :
                         sequence.status === 'partial' ? '部分' : '无效'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {sequence.isSupplemented ? (
                        <span className="badge-warning">已补录</span>
                      ) : (
                        <span className="badge-info">原始</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/magnetic/${sequence.id}`}
                          className="p-2 rounded-lg hover:bg-primary-600/20 text-primary-300 hover:text-primary-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(sequence)}
                          className="p-2 rounded-lg hover:bg-primary-600/20 text-primary-300 hover:text-primary-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenSupplement(sequence.id)}
                          className="p-2 rounded-lg hover:bg-accent-warning/20 text-primary-300 hover:text-accent-warning transition-colors"
                          title="补录数据"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sequence.id)}
                          className="p-2 rounded-lg hover:bg-accent-error/20 text-primary-300 hover:text-accent-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card w-full max-w-2xl mx-4 animate-slide-up max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-dark-border/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? '编辑磁场序列' : '新建磁场序列'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-dark-border/50 text-primary-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto scrollbar-thin flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">序列名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="输入序列名称"
                  />
                </div>
                <div>
                  <label className="label">关联线圈</label>
                  <select
                    value={formData.coilId}
                    onChange={e => setFormData({ ...formData, coilId: e.target.value })}
                    className="input"
                  >
                    <option value="">选择线圈</option>
                    {coils.map(coil => (
                      <option key={coil.id} value={coil.id}>{coil.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">时间单位</label>
                  <select
                    value={formData.timeUnit}
                    onChange={e => setFormData({ ...formData, timeUnit: e.target.value as TimeUnit })}
                    className="input"
                  >
                    <option value="s">秒 (s)</option>
                    <option value="ms">毫秒 (ms)</option>
                    <option value="μs">微秒 (μs)</option>
                  </select>
                </div>
                <div>
                  <label className="label">磁场单位</label>
                  <select
                    value={formData.magneticUnit}
                    onChange={e => setFormData({ ...formData, magneticUnit: e.target.value as MagneticUnit })}
                    className="input"
                  >
                    <option value="T">特斯拉 (T)</option>
                    <option value="mT">毫特斯拉 (mT)</option>
                    <option value="μT">微特斯拉 (μT)</option>
                  </select>
                </div>
                <div>
                  <label className="label">状态</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as MagneticStatus })}
                    className="input"
                  >
                    <option value="complete">完整</option>
                    <option value="partial">部分</option>
                    <option value="invalid">无效</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={e => setFormData({ ...formData, remark: e.target.value })}
                  className="input resize-none h-20"
                  placeholder="添加备注信息"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">数据点 ({formData.dataPoints.length})</label>
                  <button
                    onClick={() => setFormData({ ...formData, dataPoints: generateSampleData() })}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    生成示例数据
                  </button>
                </div>
                
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    step="0.001"
                    value={newDataPoint.time}
                    onChange={e => setNewDataPoint({ ...newDataPoint, time: Number(e.target.value) })}
                    className="input flex-1"
                    placeholder="时间"
                  />
                  <input
                    type="number"
                    step="0.001"
                    value={newDataPoint.magneticFlux}
                    onChange={e => setNewDataPoint({ ...newDataPoint, magneticFlux: Number(e.target.value) })}
                    className="input flex-1"
                    placeholder="磁通量"
                  />
                  <button
                    onClick={handleAddDataPoint}
                    className="btn-secondary flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto scrollbar-thin bg-dark-bg/50 rounded-lg">
                  {formData.dataPoints.length === 0 ? (
                    <div className="text-center py-8 text-primary-400 text-sm">
                      暂无数据点
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-dark-border/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-primary-300 text-xs">#</th>
                          <th className="px-3 py-2 text-left text-primary-300 text-xs">时间</th>
                          <th className="px-3 py-2 text-left text-primary-300 text-xs">磁通量</th>
                          <th className="px-3 py-2 text-right text-primary-300 text-xs">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.dataPoints.map((point, index) => (
                          <tr key={index} className="border-t border-dark-border/30">
                            <td className="px-3 py-1.5 text-primary-400 font-mono">{index + 1}</td>
                            <td className="px-3 py-1.5 font-mono text-white">{point.time.toFixed(3)}</td>
                            <td className="px-3 py-1.5 font-mono text-white">{point.magneticFlux.toFixed(4)}</td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                onClick={() => handleRemoveDataPoint(index)}
                                className="text-accent-error hover:text-red-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-dark-border/50 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || !formData.coilId}
                className="btn-primary flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingId ? '保存修改' : '创建序列'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSupplementModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4 animate-slide-up">
            <div className="p-6 border-b border-dark-border/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">补录磁场数据</h2>
                <button
                  onClick={() => setShowSupplementModal(false)}
                  className="p-2 rounded-lg hover:bg-dark-border/50 text-primary-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-primary-300 text-sm">
                添加需要补录的数据点。系统会自动按时间排序，并标记这些数据为补录数据。
              </p>

              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.001"
                  value={newDataPoint.time}
                  onChange={e => setNewDataPoint({ ...newDataPoint, time: Number(e.target.value) })}
                  className="input flex-1"
                  placeholder="时间"
                />
                <input
                  type="number"
                  step="0.001"
                  value={newDataPoint.magneticFlux}
                  onChange={e => setNewDataPoint({ ...newDataPoint, magneticFlux: Number(e.target.value) })}
                  className="input flex-1"
                  placeholder="磁通量"
                />
                <button
                  onClick={handleAddSupplementPoint}
                  className="btn-secondary flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto scrollbar-thin bg-dark-bg/50 rounded-lg">
                {supplementPoints.length === 0 ? (
                  <div className="text-center py-6 text-primary-400 text-sm">
                    暂无补录数据
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-dark-border/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-primary-300 text-xs">时间</th>
                        <th className="px-3 py-2 text-left text-primary-300 text-xs">磁通量</th>
                        <th className="px-3 py-2 text-right text-primary-300 text-xs">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplementPoints.map((point, index) => (
                        <tr key={index} className="border-t border-dark-border/30">
                          <td className="px-3 py-1.5 font-mono text-white">{point.time.toFixed(3)}</td>
                          <td className="px-3 py-1.5 font-mono text-white">{point.magneticFlux.toFixed(4)}</td>
                          <td className="px-3 py-1.5 text-right">
                            <button
                              onClick={() => setSupplementPoints(supplementPoints.filter((_, i) => i !== index))}
                              className="text-accent-error hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-dark-border/50 flex justify-end gap-3">
              <button
                onClick={() => setShowSupplementModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSupplement}
                disabled={supplementPoints.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                确认补录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
