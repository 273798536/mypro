import { useState, useMemo } from 'react';
import { Edit3, Check, X, ArrowRight, History, Save, AlertTriangle, Eye } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { CarMapping, JudgmentResult } from '@/types';
import ResultCard from '@/components/ResultCard';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

export default function CorrectionPage() {
  const {
    carMappings,
    judgmentResults,
    correctionRecords,
    applyCarMappingCorrection,
    gapSensorData,
    speedRecords,
    importState,
  } = useStore();

  const [editingMappings, setEditingMappings] = useState<CarMapping[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [operator, setOperator] = useState('');
  const [previewResults, setPreviewResults] = useState<JudgmentResult[] | null>(null);

  const hasData = importState.hasGapData && importState.hasCarMapping;

  const handleStartEdit = () => {
    setEditingMappings(JSON.parse(JSON.stringify(carMappings)));
    setShowComparison(false);
    setPreviewResults(null);
  };

  const handleCancelEdit = () => {
    setEditingMappings([]);
    setShowComparison(false);
    setPreviewResults(null);
  };

  const handleMappingChange = (index: number, field: keyof CarMapping, value: string) => {
    const newMappings = [...editingMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setEditingMappings(newMappings);
  };

  const handlePreview = async () => {
    const { executeJudgment } = await import('@/utils/calculationEngine');
    const results = executeJudgment(gapSensorData, speedRecords, editingMappings);
    setPreviewResults(results);
    setShowComparison(true);
  };

  const handleApply = () => {
    if (!operator.trim()) {
      alert('请输入操作人员工号');
      return;
    }
    applyCarMappingCorrection(editingMappings, operator);
    setEditingMappings([]);
    setShowComparison(false);
    setPreviewResults(null);
    setOperator('');
  };

  const differences = useMemo(() => {
    if (!previewResults) return [];
    const oldMap = new Map(judgmentResults.map(r => [r.sectionId, r]));
    const diffs: Array<{
      sectionId: string;
      oldResult: JudgmentResult;
      newResult: JudgmentResult;
      changed: boolean;
    }> = [];

    previewResults.forEach((newResult) => {
      const oldResult = oldMap.get(newResult.sectionId);
      if (oldResult) {
        diffs.push({
          sectionId: newResult.sectionId,
          oldResult,
          newResult,
          changed: oldResult.status !== newResult.status || oldResult.carNumber !== newResult.carNumber,
        });
      }
    });

    return diffs;
  }, [previewResults, judgmentResults]);

  const changedCount = differences.filter(d => d.changed).length;
  const isEditing = editingMappings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">手动修正</h1>
          <p className="text-sm text-industrial-muted mt-1">
            修正车厢编号映射关系，新旧结果并排对比确认
          </p>
        </div>
        {!isEditing && hasData && (
          <button
            onClick={handleStartEdit}
            className="industrial-btn-primary flex items-center gap-2"
          >
            <Edit3 size={16} />
            开始修正
          </button>
        )}
      </div>

      {!hasData && (
        <div className="industrial-card p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-warning/10 rounded-full flex items-center justify-center">
            <AlertTriangle size={32} className="text-warning" />
          </div>
          <h3 className="text-lg font-medium mb-2">数据不完整</h3>
          <p className="text-sm text-industrial-muted">
            请先导入间隙传感器数据和车厢编号映射表
          </p>
        </div>
      )}

      {isEditing && (
        <div className="industrial-card p-4 border-l-4 border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Edit3 size={16} className="text-primary" />
              <h3 className="font-medium">编辑车厢编号映射</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-industrial-muted">操作人员:</label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="工号"
                  className="industrial-input w-32"
                />
              </div>
              <button
                onClick={handleCancelEdit}
                className="industrial-btn-secondary flex items-center gap-1"
              >
                <X size={14} />
                取消
              </button>
              <button
                onClick={handlePreview}
                className="industrial-btn-secondary flex items-center gap-1"
              >
                <Eye size={14} />
                预览结果
              </button>
              {showComparison && (
                <button
                  onClick={handleApply}
                  className="industrial-btn-primary flex items-center gap-1"
                >
                  <Save size={14} />
                  确认应用
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>传感器ID</th>
                  <th>原车厢编号</th>
                  <th>新车厢编号</th>
                  <th>线路ID</th>
                </tr>
              </thead>
              <tbody>
                {editingMappings.map((mapping, index) => {
                  const original = carMappings[index];
                  const changed = mapping.carNumber !== original?.carNumber || mapping.lineId !== original?.lineId;
                  return (
                    <tr key={mapping.sensorId} className={cn(changed && 'bg-warning/5')}>
                      <td className="font-mono">{mapping.sensorId}</td>
                      <td className="font-mono text-industrial-muted">
                        {original?.carNumber}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={mapping.carNumber}
                          onChange={(e) => handleMappingChange(index, 'carNumber', e.target.value)}
                          className={cn(
                            'industrial-input',
                            mapping.carNumber !== original?.carNumber && 'border-warning'
                          )}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={mapping.lineId}
                          onChange={(e) => handleMappingChange(index, 'lineId', e.target.value)}
                          className="industrial-input w-24"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showComparison && previewResults && (
        <div className="industrial-card p-4 border-l-4 border-warning">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={16} className="text-warning" />
            <h3 className="font-medium">新旧结果对比</h3>
            <span className="text-xs text-industrial-muted">
              {changedCount > 0
                ? `检测到 ${changedCount} 个区段结果发生变化`
                : '无变化'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-industrial-muted" />
                <h4 className="font-medium text-industrial-muted">原始结果</h4>
              </div>
              <div className="space-y-3">
                {differences.map(({ sectionId, oldResult, changed }) => (
                  <div key={sectionId} className={cn(
                    'transition-all',
                    changed && 'opacity-60'
                  )}>
                    <ResultCard result={oldResult} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <h4 className="font-medium text-primary">修正后结果</h4>
              </div>
              <div className="space-y-3">
                {differences.map(({ sectionId, newResult, changed }) => (
                  <div key={sectionId} className={cn(
                    'transition-all',
                    changed && 'ring-2 ring-warning rounded-sm'
                  )}>
                    <ResultCard result={newResult} highlightChanges={changed} />
                    {changed && (
                      <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded-sm">
                        <div className="flex items-center gap-2 text-xs text-warning">
                          <ArrowRight size={12} />
                          <span>结果已变更</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isEditing && correctionRecords.length > 0 && (
        <div className="industrial-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-primary" />
            <h3 className="font-medium">修正历史</h3>
          </div>
          <div className="space-y-3">
            {[...correctionRecords].reverse().map((record) => (
              <div key={record.id} className="p-3 bg-industrial-bg rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{record.id}</span>
                    <span className="text-xs text-industrial-muted">
                      操作人: {record.operator}
                    </span>
                    <span className="text-xs text-industrial-muted">
                      {new Date(record.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.originalResults.map((or, idx) => {
                      const nr = record.correctedResults[idx];
                      if (or?.status !== nr?.status || or?.carNumber !== nr?.carNumber) {
                        return (
                          <div key={or?.sectionId} className="flex items-center gap-1 text-xs">
                            <span className="font-mono">{or?.sectionId}</span>
                            <StatusBadge status={or!.status} />
                            <ArrowRight size={10} className="text-industrial-muted" />
                            <StatusBadge status={nr!.status} />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-industrial-muted mb-1">原映射</p>
                    <div className="flex flex-wrap gap-1">
                      {record.originalCarMapping.map((m) => (
                        <span key={m.sensorId} className="px-1.5 py-0.5 bg-industrial-panel rounded-sm font-mono">
                          {m.sensorId} → {m.carNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-industrial-muted mb-1">新映射</p>
                    <div className="flex flex-wrap gap-1">
                      {record.correctedCarMapping.map((m) => {
                        const original = record.originalCarMapping.find(
                          (o) => o.sensorId === m.sensorId
                        );
                        const changed = original?.carNumber !== m.carNumber || original?.lineId !== m.lineId;
                        return (
                          <span
                            key={m.sensorId}
                            className={cn(
                              'px-1.5 py-0.5 rounded-sm font-mono',
                              changed ? 'bg-warning/10 text-warning' : 'bg-industrial-panel'
                            )}
                          >
                            {m.sensorId} → {m.carNumber}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isEditing && hasData && carMappings.length > 0 && (
        <div className="industrial-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Check size={16} className="text-success" />
            <h3 className="font-medium">当前映射</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {carMappings.map((mapping) => (
              <div key={mapping.sensorId} className="p-3 bg-industrial-bg rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{mapping.sensorId}</span>
                  <span className="text-xs text-industrial-muted">{mapping.lineId}</span>
                </div>
                <p className="font-mono text-lg font-bold mt-1">{mapping.carNumber}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
