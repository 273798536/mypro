import { useState } from 'react';
import { Plus, Check, Clock, RefreshCw, Trash2, Edit2, Save, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ThresholdVersion } from '@/types';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';

export default function ThresholdPage() {
  const {
    thresholdVersions,
    currentThresholdId,
    setCurrentThreshold,
    addThresholdVersion,
    recalculateWithThreshold,
    isLoading,
    gapSensorData,
    speedRecords,
    carMappings,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ThresholdVersion | null>(null);
  const [formData, setFormData] = useState<Omit<ThresholdVersion, 'id'>>({
    version: '',
    name: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    applicableLines: ['L1', 'L2'],
    normalGap: { min: 8, max: 12 },
    warningGap: { min: 6, max: 14 },
    speedSuddenChange: 50,
    sensorDriftThreshold: 15,
    missingSectionThreshold: 10,
    dynamicThresholdAdjustment: 0.2,
  });

  const handleEdit = (version: ThresholdVersion) => {
    setEditingVersion(version);
    setFormData(version);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editingVersion) {
      const versions = thresholdVersions.map((v) =>
        v.id === editingVersion.id ? { ...v, ...formData } : v
      );
      useStore.getState().thresholdVersions = versions;
      localStorage.setItem('threshold_versions', JSON.stringify(versions));
    } else {
      addThresholdVersion(formData);
    }
    setShowForm(false);
    setEditingVersion(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      version: '',
      name: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      applicableLines: ['L1', 'L2'],
      normalGap: { min: 8, max: 12 },
      warningGap: { min: 6, max: 14 },
      speedSuddenChange: 50,
      sensorDriftThreshold: 15,
      missingSectionThreshold: 10,
      dynamicThresholdAdjustment: 0.2,
    });
  };

  const canRecalculate = gapSensorData.length > 0 && carMappings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">阈值管理</h1>
          <p className="text-sm text-industrial-muted mt-1">
            管理间隙判定阈值版本，支持多版本切换和历史追溯
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="industrial-btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          新建阈值版本
        </button>
      </div>

      {showForm && (
        <div className="industrial-card p-6 border-l-4 border-primary">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">
              {editingVersion ? '编辑阈值版本' : '新建阈值版本'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingVersion(null);
                resetForm();
              }}
              className="p-1 hover:bg-industrial-border/10 rounded-sm"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-industrial-muted mb-1">版本号</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="industrial-input"
                placeholder="如: V3.0"
              />
            </div>
            <div>
              <label className="block text-xs text-industrial-muted mb-1">版本名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="industrial-input"
                placeholder="如: 2026版新标准"
              />
            </div>
            <div>
              <label className="block text-xs text-industrial-muted mb-1">生效日期</label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                className="industrial-input"
              />
            </div>
          </div>

          <div className="section-divider" />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3">间隙阈值 (mm)</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-industrial-muted mb-1">正常范围 - 最小值</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.normalGap.min}
                      onChange={(e) => setFormData({
                        ...formData,
                        normalGap: { ...formData.normalGap, min: parseFloat(e.target.value) }
                      })}
                      className="industrial-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-industrial-muted mb-1">正常范围 - 最大值</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.normalGap.max}
                      onChange={(e) => setFormData({
                        ...formData,
                        normalGap: { ...formData.normalGap, max: parseFloat(e.target.value) }
                      })}
                      className="industrial-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-industrial-muted mb-1">警告范围 - 最小值</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.warningGap.min}
                      onChange={(e) => setFormData({
                        ...formData,
                        warningGap: { ...formData.warningGap, min: parseFloat(e.target.value) }
                      })}
                      className="industrial-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-industrial-muted mb-1">警告范围 - 最大值</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.warningGap.max}
                      onChange={(e) => setFormData({
                        ...formData,
                        warningGap: { ...formData.warningGap, max: parseFloat(e.target.value) }
                      })}
                      className="industrial-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">异常检测参数</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-industrial-muted mb-1">
                    速度突变阈值 (km/h/s)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.speedSuddenChange}
                    onChange={(e) => setFormData({
                      ...formData,
                      speedSuddenChange: parseFloat(e.target.value)
                    })}
                    className="industrial-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-industrial-muted mb-1">
                    传感器漂移阈值 (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.sensorDriftThreshold}
                    onChange={(e) => setFormData({
                      ...formData,
                      sensorDriftThreshold: parseFloat(e.target.value)
                    })}
                    className="industrial-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-industrial-muted mb-1">
                    区段缺失阈值 (采样点数)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.missingSectionThreshold}
                    onChange={(e) => setFormData({
                      ...formData,
                      missingSectionThreshold: parseInt(e.target.value)
                    })}
                    className="industrial-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-industrial-muted mb-1">
                    速度突变阈值放宽比例
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.dynamicThresholdAdjustment}
                    onChange={(e) => setFormData({
                      ...formData,
                      dynamicThresholdAdjustment: parseFloat(e.target.value)
                    })}
                    className="industrial-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingVersion(null);
                resetForm();
              }}
              className="industrial-btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="industrial-btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {editingVersion ? '保存修改' : '创建版本'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-medium">版本历史</h3>
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-industrial-border/20" />
          {[...thresholdVersions].reverse().map((version) => (
            <div key={version.id} className="relative pl-16 pb-6">
              <div className={cn(
                'absolute left-4 w-4 h-4 rounded-full border-2 border-industrial-panel',
                version.id === currentThresholdId ? 'bg-primary' : 'bg-industrial-muted'
              )} />
              <div className={cn(
                'industrial-card p-4',
                version.id === currentThresholdId && 'ring-2 ring-primary'
              )}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-mono font-bold text-lg">{version.version}</h4>
                      {version.id === currentThresholdId && (
                        <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-sm">
                          当前生效
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-industrial-muted">{version.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {version.id !== currentThresholdId && (
                      <>
                        <button
                          onClick={() => setCurrentThreshold(version.id)}
                          className="p-1.5 hover:bg-primary/10 text-primary rounded-sm transition-colors"
                          title="设为当前版本"
                        >
                          <Check size={14} />
                        </button>
                        {canRecalculate && (
                          <button
                            onClick={() => recalculateWithThreshold(version.id)}
                            disabled={isLoading}
                            className="p-1.5 hover:bg-warning/10 text-warning rounded-sm transition-colors"
                            title="按此版本重新计算"
                          >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(version)}
                          className="p-1.5 hover:bg-industrial-border/10 rounded-sm transition-colors"
                          title="编辑"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-industrial-muted">正常间隙范围</p>
                    <p className="font-mono text-success">
                      {version.normalGap.min} - {version.normalGap.max} mm
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-industrial-muted">警告间隙范围</p>
                    <p className="font-mono text-warning">
                      {version.warningGap.min} - {version.warningGap.max} mm
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-industrial-muted">速度突变阈值</p>
                    <p className="font-mono text-danger">
                      {version.speedSuddenChange} km/h/s
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-industrial-muted">漂移阈值</p>
                    <p className="font-mono">
                      ±{version.sensorDriftThreshold}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-industrial-muted">适用线路</p>
                    <p className="font-mono">
                      {version.applicableLines.join('、')}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-industrial-muted">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    生效日期: {version.effectiveDate}
                  </div>
                  <div>
                    动态阈值调整: +{version.dynamicThresholdAdjustment * 100}%
                  </div>
                  <div>
                    缺失判定: 少于 {version.missingSectionThreshold} 个采样点
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {canRecalculate && (
        <div className="industrial-card p-4 border-l-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">阈值变更影响</h3>
              <p className="text-sm text-industrial-muted mt-1">
                当前已有 {gapSensorData.length} 条间隙数据，切换阈值版本后可选择重新计算历史判定结果
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={speedRecords.length > 0 ? 'PASS' : 'WARNING'} />
              <span className="text-sm text-industrial-muted">
                {speedRecords.length > 0 ? '含速度数据，支持动态阈值' : '仅间隙数据'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
