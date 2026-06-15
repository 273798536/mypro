import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Download, 
  Trash2,
  Clock,
  History,
  FileText,
  AlertCircle,
  Tag
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConflictStore } from '@/stores/conflictStore';
import { StatusBadge } from '@/components/StatusBadge';
import { TimecodeBadge } from '@/components/TimecodeBadge';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { ContractScanList } from '@/components/ContractScanList';
import { NoteEditor } from '@/components/NoteEditor';
import { recordsToCSV, downloadCSV } from '@/utils/csv';
import { STATUS_LABELS } from '@/types';
import type { ConflictStatus } from '@/types';

function ConflictDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  
  const {
    getRecordById,
    updateNote,
    addContractScan,
    updateStatus,
    toggleTimecodeOffset,
    exportCSV,
    deleteRecord,
    records,
  } = useConflictStore();

  const record = id ? getRecordById(id) : undefined;

  useEffect(() => {
    if (id && !record && records.length > 0) {
      navigate('/');
    }
  }, [id, record, records.length, navigate]);

  const handleAddScan = async (file: File, remark: string) => {
    if (!id) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = reader.result as string;
      await addContractScan(id, {
        conflictId: id,
        fileName: file.name,
        fileData,
        remark,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleExportSingle = () => {
    if (!record) return;
    const csvContent = recordsToCSV([record]);
    const filename = `采样包素材排期冲突_${record.trackName}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
  };

  const handleDelete = () => {
    if (!id) return;
    if (confirm('确定要删除这条记录吗？此操作不可恢复。')) {
      deleteRecord(id);
      navigate('/');
    }
  };

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <AlertCircle className="w-12 h-12 text-primary-400 mx-auto mb-4" />
          <p className="text-primary-600 font-display text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: '概览', icon: FileText },
    { key: 'history', label: '历史版本', icon: History },
  ] as const;

  return (
    <div className="min-h-screen p-6">
      <header className="mb-6 animate-fade-in">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
          
          <div className="ml-auto flex gap-2">
            <button onClick={handleExportSingle} className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出本条
            </button>
            <button onClick={exportCSV} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出全部
            </button>
            <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </div>

        <div className="card p-6 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-primary-900 mb-2">
                {record.trackName}
              </h1>
              <code className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
                {record.fileName}
              </code>
              <div className="text-xs text-primary-400 font-mono mt-1">
                {record.id}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={record.status} />
              <TimecodeBadge 
                isOffset={record.isTimecodeOffset} 
                onToggle={() => toggleTimecodeOffset(record.id)}
                showLabel
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-primary-100">
            <div>
              <p className="text-xs text-primary-500 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                处理状态
              </p>
              <select
                value={record.status}
                onChange={(e) => updateStatus(record.id, e.target.value as ConflictStatus)}
                className="input-field text-sm py-1"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <p className="text-xs text-primary-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                时码标记
              </p>
              <button
                onClick={() => toggleTimecodeOffset(record.id)}
                className={`w-full px-3 py-1 text-sm rounded border transition-colors ${
                  record.isTimecodeOffset
                    ? 'bg-accent-100 text-accent-800 border-accent-300'
                    : 'bg-white text-primary-700 border-primary-300'
                }`}
              >
                {record.isTimecodeOffset ? '时码偏半拍' : '无时码偏移'}
              </button>
            </div>
            
            <div>
              <p className="text-xs text-primary-500 mb-1">创建时间</p>
              <p className="text-sm text-primary-800">
                {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </p>
            </div>
            
            <div>
              <p className="text-xs text-primary-500 mb-1">最后更新</p>
              <p className="text-sm text-primary-800">
                {format(new Date(record.updatedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-6 border-b border-primary-100">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 -mb-px transition-colors ${
                    isActive
                      ? 'border-primary-800 text-primary-900 font-semibold'
                      : 'border-transparent text-primary-500 hover:text-primary-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key === 'history' && (
                    <span className="badge bg-primary-100 text-primary-700 border-primary-200 text-xs">
                      {record.historyVersions.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6 animate-fade-in">
            <NoteEditor
              currentNote={record.currentNote}
              noteChanges={record.noteChanges}
              onSave={(newNote) => updateNote(record.id, newNote)}
            />
          </div>
          
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <ContractScanList
              scans={record.contractScans}
              onAddScan={handleAddScan}
            />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card p-6 animate-fade-in">
          <h2 className="font-display text-xl font-semibold text-primary-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-600" />
            完整历史记录
            <span className="text-sm font-normal text-primary-500">
              共 {record.historyVersions.length} 个版本
            </span>
          </h2>
          <HistoryTimeline versions={record.historyVersions} />
        </div>
      )}
    </div>
  );
}

export default ConflictDetailPage;
