import { useState, useRef } from 'react';
import { Upload, Plus, Trash2, Edit2, Check, X, FileText } from 'lucide-react';
import { useExperimentStore } from '../../store/useExperimentStore';
import { ExperimentData, Measurement } from '../../types';
import { parseCSV } from '../../utils/csvParser';
import { generateId } from '../../data/mockExperiments';

export default function DataImportPanel() {
  const {
    experiments,
    currentExperimentId,
    setCurrentExperiment,
    addExperiment,
    updateExperiment,
    deleteExperiment,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    addHistoryRecord,
  } = useExperimentStore();

  const [isDragging, setIsDragging] = useState(false);
  const [editingField, setEditingField] = useState<keyof ExperimentData | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [newMeasurement, setNewMeasurement] = useState({ nodeNumber: '', tubeLength: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentExperiment = experiments.find((e) => e.id === currentExperimentId);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      parsed.forEach((exp) => {
        if (exp.studentName && exp.measurements && exp.measurements.length > 0) {
          const newExp: ExperimentData = {
            id: generateId(),
            studentName: exp.studentName || '未知学生',
            experimentDate: exp.experimentDate || new Date().toISOString().split('T')[0],
            temperature: exp.temperature || 25,
            frequency: exp.frequency || 1000,
            measurements: exp.measurements.map((m) => ({
              ...m,
              id: generateId(),
            })),
            notes: exp.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          addExperiment(newExp);
          addHistoryRecord({
            id: generateId(),
            timestamp: new Date().toISOString(),
            operator: '实验员',
            changeType: 'create',
            before: {},
            after: newExp,
            reason: '通过CSV文件导入',
          });
        }
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const createNewExperiment = () => {
    const newExp: ExperimentData = {
      id: generateId(),
      studentName: '新实验',
      experimentDate: new Date().toISOString().split('T')[0],
      temperature: 25,
      frequency: 1000,
      measurements: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addExperiment(newExp);
    addHistoryRecord({
      id: generateId(),
      timestamp: new Date().toISOString(),
      operator: '实验员',
      changeType: 'create',
      before: {},
      after: newExp,
      reason: '手动创建新实验',
    });
  };

  const handleUpdateField = (field: keyof ExperimentData, value: string) => {
    if (!currentExperimentId) return;
    const before = { ...currentExperiment };
    const updates: Partial<ExperimentData> = {};

    if (field === 'temperature' || field === 'frequency') {
      (updates as any)[field] = parseFloat(value) || 0;
    } else {
      (updates as any)[field] = value;
    }

    updateExperiment(currentExperimentId, updates);
    addHistoryRecord({
      id: generateId(),
      timestamp: new Date().toISOString(),
      operator: '实验员',
      changeType: 'update',
      before,
      after: updates,
      reason: `修改${field === 'studentName' ? '学生姓名' : field === 'temperature' ? '温度' : field === 'frequency' ? '频率' : field === 'notes' ? '备注' : field}`,
    });
    setEditingField(null);
  };

  const handleAddMeasurement = () => {
    if (!currentExperimentId || !newMeasurement.nodeNumber || !newMeasurement.tubeLength) return;

    const measurement: Measurement = {
      id: generateId(),
      nodeNumber: parseInt(newMeasurement.nodeNumber),
      tubeLength: parseFloat(newMeasurement.tubeLength),
      isOutlier: false,
      isTemperatureCorrected: true,
      createdAt: new Date().toISOString(),
    };

    addMeasurement(currentExperimentId, measurement);
    addHistoryRecord({
      id: generateId(),
      timestamp: new Date().toISOString(),
      operator: '实验员',
      changeType: 'create',
      before: {},
      after: measurement,
      reason: '添加测量数据',
    });
    setNewMeasurement({ nodeNumber: '', tubeLength: '' });
  };

  const handleToggleOutlier = (measurementId: string, currentValue: boolean) => {
    if (!currentExperimentId) return;
    updateMeasurement(currentExperimentId, measurementId, { isOutlier: !currentValue });
    addHistoryRecord({
      id: generateId(),
      timestamp: new Date().toISOString(),
      operator: '实验员',
      changeType: 'correct',
      before: { isOutlier: currentValue },
      after: { isOutlier: !currentValue },
      reason: currentValue ? '取消离群值标记' : '标记为离群值',
    });
  };

  const handleDeleteMeasurement = (measurementId: string) => {
    if (!currentExperimentId) return;
    const measurement = currentExperiment?.measurements.find((m) => m.id === measurementId);
    deleteMeasurement(currentExperimentId, measurementId);
    if (measurement) {
      addHistoryRecord({
        id: generateId(),
        timestamp: new Date().toISOString(),
        operator: '实验员',
        changeType: 'delete',
        before: measurement,
        after: {},
        reason: '删除测量数据',
      });
    }
  };

  const handleDeleteExperiment = () => {
    if (!currentExperimentId) return;
    const exp = currentExperiment;
    deleteExperiment(currentExperimentId);
    if (exp) {
      addHistoryRecord({
        id: generateId(),
        timestamp: new Date().toISOString(),
        operator: '实验员',
        changeType: 'delete',
        before: exp,
        after: {},
        reason: '删除实验',
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          实验数据管理
        </h2>

        <div className="flex gap-2 mb-3">
          <button
            onClick={createNewExperiment}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建实验
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            导入CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragging ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-600'
          }`}
        >
          <p className="text-slate-400 text-xs">拖拽CSV文件到此处上传</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-2">实验列表</h3>
          <div className="space-y-1">
            {experiments.map((exp) => (
              <button
                key={exp.id}
                onClick={() => setCurrentExperiment(exp.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  exp.id === currentExperimentId
                    ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <div className="font-medium">{exp.studentName}</div>
                <div className="text-xs text-slate-400">
                  {exp.experimentDate} · {exp.measurements.length}组数据
                </div>
              </button>
            ))}
          </div>
        </div>

        {currentExperiment && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-slate-300">实验详情</h3>
              <button
                onClick={handleDeleteExperiment}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {(['studentName', 'experimentDate', 'temperature', 'frequency', 'notes'] as const).map((field) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-16 shrink-0">
                    {field === 'studentName' ? '学生姓名' : field === 'experimentDate' ? '实验日期' : field === 'temperature' ? '温度(°C)' : field === 'frequency' ? '频率(Hz)' : '备注'}
                  </span>
                  {editingField === field ? (
                    <div className="flex-1 flex gap-1">
                      <input
                        type={field === 'temperature' || field === 'frequency' ? 'number' : 'text'}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateField(field, editingValue)}
                        className="p-1 text-green-400 hover:bg-green-400/10 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingField(field);
                        setEditingValue(String(currentExperiment[field]));
                      }}
                      className="flex-1 flex items-center gap-2 px-2 py-1 bg-slate-700/50 rounded text-sm text-slate-200 cursor-pointer hover:bg-slate-700 transition-colors"
                    >
                      <span className="flex-1">{currentExperiment[field]}</span>
                      <Edit2 className="w-3 h-3 text-slate-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-medium text-slate-400 mb-2">测量数据</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {currentExperiment.measurements
                  .sort((a, b) => a.nodeNumber - b.nodeNumber)
                  .map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                        m.isOutlier ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-slate-700/30'
                      }`}
                    >
                      <span className="text-slate-400 w-8">n={m.nodeNumber}</span>
                      <span className={`flex-1 ${m.isOutlier ? 'text-orange-300' : 'text-slate-200'}`}>
                        {m.tubeLength} cm
                      </span>
                      <button
                        onClick={() => handleToggleOutlier(m.id, m.isOutlier)}
                        className={`text-xs px-2 py-0.5 rounded ${
                          m.isOutlier
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-slate-600 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m.isOutlier ? '离群' : '正常'}
                      </button>
                      <button
                        onClick={() => handleDeleteMeasurement(m.id)}
                        className="p-1 text-red-400 hover:text-red-300 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="节点号"
                  value={newMeasurement.nodeNumber}
                  onChange={(e) => setNewMeasurement((prev) => ({ ...prev, nodeNumber: e.target.value }))}
                  className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-cyan-400 placeholder-slate-500"
                />
                <input
                  type="number"
                  placeholder="管长(cm)"
                  value={newMeasurement.tubeLength}
                  onChange={(e) => setNewMeasurement((prev) => ({ ...prev, tubeLength: e.target.value }))}
                  className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-cyan-400 placeholder-slate-500"
                />
                <button
                  onClick={handleAddMeasurement}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
