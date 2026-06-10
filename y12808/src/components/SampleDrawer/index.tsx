import { useState } from 'react';
import {
  X,
  Clock,
  User,
  Image,
  FileText,
  Edit3,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import StatusTag from '@/components/StatusTag';
import TraceInfo from '@/components/TraceInfo';
import { UserRole, SampleStatus } from '@/types';
import { cn } from '@/lib/utils';

interface SampleDrawerProps {
  sampleId: string;
  onClose: () => void;
}

export default function SampleDrawer({ sampleId, onClose }: SampleDrawerProps) {
  const {
    getSampleById,
    getCultureRecordsBySampleId,
    getConclusionBySampleId,
    getSourceTracesBySampleId,
    userRole,
    updateSample,
    setConclusion,
    addCorrectionRecord,
    addCultureRecord
  } = useSampleStore();

  const [activeTab, setActiveTab] = useState<'culture' | 'conclusion' | 'trace'>('culture');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newRecord, setNewRecord] = useState('');
  const [newConclusion, setNewConclusion] = useState('');
  const [showConclusionForm, setShowConclusionForm] = useState(false);

  const sample = getSampleById(sampleId);
  const cultureRecords = getCultureRecordsBySampleId(sampleId);
  const conclusion = getConclusionBySampleId(sampleId);
  const sourceTraces = getSourceTracesBySampleId(sampleId);
  const isTeacher = userRole === UserRole.TEACHER;

  if (!sample) return null;

  const handleFieldEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleFieldSave = (field: string) => {
    const oldValue = String(sample[field as keyof typeof sample] || '');
    
    let updates: Record<string, string | number | undefined> = {};
    
    if (field === 'status') {
      updates[field] = editValue as SampleStatus;
    } else if (field === 'concentration' || field === 'cellCount') {
      const num = parseFloat(editValue);
      updates[field] = isNaN(num) ? undefined : num;
    } else {
      updates[field] = editValue;
    }

    updateSample(sample.id, updates);

    if (isTeacher && oldValue !== editValue) {
      addCorrectionRecord({
        id: `corr_${Date.now()}`,
        sampleId: sample.id,
        fieldName: getFieldLabel(field),
        oldValue: oldValue || '（空）',
        newValue: editValue || '（空）',
        operator: '当前用户',
        operateTime: new Date().toISOString(),
        reason: '人工修正'
      });
    }

    setEditingField(null);
  };

  const handleAddRecord = () => {
    if (!newRecord.trim()) return;

    addCultureRecord({
      id: `cr_${Date.now()}`,
      sampleId: sample.id,
      content: newRecord,
      operator: '当前用户',
      recordTime: new Date().toISOString()
    });

    setNewRecord('');
  };

  const handleSaveConclusion = () => {
    if (!newConclusion.trim()) return;

    const isCorrected = conclusion && conclusion.result !== newConclusion;

    setConclusion({
      id: `conc_${Date.now()}`,
      sampleId: sample.id,
      result: newConclusion,
      conclusionType: '人工判定',
      reviewer: '当前用户',
      reviewedAt: new Date().toISOString(),
      isManualCorrected: isCorrected || (conclusion?.isManualCorrected || false),
      correctionReason: isCorrected ? '人工修正结论' : undefined
    });

    if (isCorrected && isTeacher) {
      addCorrectionRecord({
        id: `corr_${Date.now()}_conc`,
        sampleId: sample.id,
        fieldName: '结论',
        oldValue: conclusion?.result || '（无）',
        newValue: newConclusion,
        operator: '当前用户',
        operateTime: new Date().toISOString(),
        reason: '结论人工修正'
      });
    }

    setShowConclusionForm(false);
    setNewConclusion('');
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: '样本名称',
      sampleType: '样本类型',
      status: '状态',
      concentration: '浓度',
      cellCount: '细胞数',
      remark: '备注'
    };
    return labels[field] || field;
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tabs = [
    { key: 'culture', label: '培养记录', icon: Clock, count: cultureRecords.length },
    { key: 'conclusion', label: '最终结论', icon: Check, count: conclusion ? 1 : 0 },
    { key: 'trace', label: '数据溯源', icon: FileText, count: sourceTraces.length }
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <StatusTag status={sample.status} />
              <span className="text-xs text-slate-400">{sample.batchNo}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mt-2">{sample.barcode}</h3>
            <p className="text-sm text-slate-500">{sample.sampleType}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">样本名称</p>
              {editingField === 'name' && isTeacher ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-cyan-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-200"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleFieldSave('name')}
                  />
                  <button
                    onClick={() => handleFieldSave('name')}
                    className="px-2 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600"
                  >
                    保存
                  </button>
                </div>
              ) : (
                <p
                  className={cn(
                    'text-sm font-medium text-slate-700',
                    isTeacher && 'cursor-pointer hover:text-cyan-600'
                  )}
                  onClick={() => isTeacher && handleFieldEdit('name', sample.name || '')}
                >
                  {sample.name || '（未命名）'}
                  {isTeacher && <Edit3 size={12} className="inline ml-1 opacity-50" />}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">状态</p>
              {editingField === 'status' && isTeacher ? (
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-cyan-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-200"
                  autoFocus
                  onBlur={() => handleFieldSave('status')}
                >
                  <option value={SampleStatus.PENDING}>待检测</option>
                  <option value={SampleStatus.TESTING}>检测中</option>
                  <option value={SampleStatus.COMPLETED}>已完成</option>
                  <option value={SampleStatus.ABNORMAL}>异常</option>
                </select>
              ) : (
                <p
                  className={cn(
                    'text-sm font-medium text-slate-700 cursor-pointer',
                    isTeacher && 'hover:text-cyan-600'
                  )}
                  onClick={() => isTeacher && handleFieldEdit('status', sample.status)}
                >
                  <StatusTag status={sample.status} size="sm" />
                  {isTeacher && <Edit3 size={12} className="inline ml-1 opacity-50" />}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">浓度</p>
              <p className="text-sm font-medium text-slate-700">
                {sample.concentration !== undefined ? `${sample.concentration} mg/mL` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">细胞数</p>
              <p className="text-sm font-medium text-slate-700">
                {sample.cellCount !== undefined
                  ? sample.cellCount.toLocaleString() + ' 个/mL'
                  : '—'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">备注</p>
            <p className="text-sm text-slate-600">{sample.remark || '无'}</p>
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-cyan-500 text-cyan-600 bg-cyan-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon size={16} />
                {tab.label}
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    activeTab === tab.key ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {activeTab === 'culture' && (
            <div className="space-y-4">
              {isTeacher && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <textarea
                    value={newRecord}
                    onChange={(e) => setNewRecord(e.target.value)}
                    placeholder="添加培养记录..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 resize-none"
                    rows={2}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddRecord}
                      disabled={!newRecord.trim()}
                      className="px-4 py-1.5 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      添加记录
                    </button>
                  </div>
                </div>
              )}

              {cultureRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无培养记录</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {cultureRecords.map((record, index) => (
                      <div key={record.id} className="relative pl-8">
                        <div
                          className={cn(
                            'absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center',
                            index === 0
                              ? 'bg-cyan-500 text-white'
                              : 'bg-slate-200 text-slate-500'
                          )}
                        >
                          {index === 0 && <Check size={12} />}
                        </div>
                        <div
                          className={cn(
                            'rounded-lg p-3 border transition-all',
                            index === 0
                              ? 'bg-cyan-50/50 border-cyan-200'
                              : 'bg-white border-slate-200'
                          )}
                        >
                          <p className="text-sm text-slate-700">{record.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {record.operator}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatTime(record.recordTime)}
                            </span>
                            {record.imageName && (
                              <span className="flex items-center gap-1 text-cyan-500">
                                <Image size={12} />
                                {record.imageName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'conclusion' && (
            <div className="space-y-4">
              {!conclusion && !showConclusionForm && isTeacher && (
                <button
                  onClick={() => {
                    setShowConclusionForm(true);
                    setNewConclusion('');
                  }}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-cyan-400 hover:text-cyan-600 transition-colors"
                >
                  + 添加最终结论
                </button>
              )}

              {showConclusionForm && isTeacher && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">编辑结论</p>
                  <textarea
                    value={newConclusion}
                    onChange={(e) => setNewConclusion(e.target.value)}
                    placeholder="输入最终结论..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setShowConclusionForm(false)}
                      className="px-4 py-1.5 text-sm text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveConclusion}
                      disabled={!newConclusion.trim()}
                      className="px-4 py-1.5 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      保存结论
                    </button>
                  </div>
                </div>
              )}

              {conclusion && (
                <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-800">
                          {conclusion.conclusionType}
                        </p>
                        {conclusion.isManualCorrected && (
                          <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                            人工修正
                          </span>
                        )}
                      </div>
                    </div>
                    {isTeacher && (
                      <button
                        onClick={() => {
                          setShowConclusionForm(true);
                          setNewConclusion(conclusion.result);
                        }}
                        className="text-sm text-slate-500 hover:text-cyan-600"
                      >
                        <Edit3 size={14} className="inline mr-1" />
                        编辑
                      </button>
                    )}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {conclusion.result}
                  </p>
                  {conclusion.correctionReason && (
                    <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                      <p className="text-xs text-amber-700 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        修正原因：{conclusion.correctionReason}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {conclusion.reviewer || '未指定'}
                    </span>
                    {conclusion.reviewedAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(conclusion.reviewedAt)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {!conclusion && !isTeacher && (
                <div className="text-center py-12 text-slate-400">
                  <Check size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无最终结论</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trace' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                保留原始行号和来源，真要追问时能回到那张表
              </p>
              <TraceInfo traces={sourceTraces} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
