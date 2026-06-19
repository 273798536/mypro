import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertCircle, 
  MessageSquare,
  Save,
  GitCompare,
  FileCode,
  FileText,
  Clock
} from 'lucide-react';
import { useLedgerStore } from '../stores/ledgerStore.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { AnomalyBadge } from '../components/AnomalyBadge.js';
import { SourceInfo } from '../components/SourceInfo.js';
import type { RecordStatus } from '../../shared/types.js';
import { STATUS_LABELS } from '../../shared/types.js';

export default function LedgerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedRecord, loading, error, fetchRecordById, updateRecord } = useLedgerStore();
  
  const [handlingOpinion, setHandlingOpinion] = useState('');
  const [businessNotes, setBusinessNotes] = useState('');
  const [newStatus, setNewStatus] = useState<RecordStatus | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRecordById(id);
    }
  }, [id, fetchRecordById]);

  useEffect(() => {
    if (selectedRecord) {
      setHandlingOpinion(selectedRecord.handlingOpinion || '');
      setBusinessNotes(selectedRecord.businessNotes || '');
      setNewStatus(selectedRecord.status);
    }
  }, [selectedRecord]);

  const handleSave = async () => {
    if (!id || !newStatus) return;
    setIsSaving(true);
    try {
      await updateRecord(id, {
        status: newStatus,
        handlingOpinion,
        businessNotes,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !selectedRecord) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !selectedRecord) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          返回列表
        </button>
      </div>
    );
  }

  if (!selectedRecord) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回列表
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            记录详情
            <span className="text-lg font-mono text-slate-400">{selectedRecord.recordNo}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={selectedRecord.status} />
          <AnomalyBadge type={selectedRecord.anomalyType} />
        </div>
      </div>

      <SourceInfo
        sourceFile={selectedRecord.sourceFile}
        originalLineNo={selectedRecord.originalLineNo}
        sourceType={selectedRecord.sourceType}
        importBatchId={selectedRecord.importBatchId}
        sourceRemark={selectedRecord.sourceRemark}
        imageName={selectedRecord.imageName}
        createdAt={selectedRecord.createdAt}
        handledBy={selectedRecord.handledBy}
        handledAt={selectedRecord.handledAt}
      />

      {selectedRecord.conflictDetails && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            冲突详情
          </h3>
          <p className="text-slate-300">{selectedRecord.conflictDetails}</p>
        </div>
      )}

      {(selectedRecord.slowQuerySql || selectedRecord.schemaSnapshot) && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-400" />
            数据对比
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedRecord.slowQuerySql && (
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  慢查询 SQL
                </h4>
                <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300 border border-slate-700">
                  {selectedRecord.slowQuerySql}
                </pre>
              </div>
            )}
            
            {selectedRecord.schemaSnapshot && (
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  表结构快照
                </h4>
                <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300 border border-slate-700">
                  {selectedRecord.schemaSnapshot}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          处理意见与备注
        </h3>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              更新状态
            </label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setNewStatus(value as RecordStatus)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    newStatus === value
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              DBA 处理意见
            </label>
            <textarea
              value={handlingOpinion}
              onChange={(e) => setHandlingOpinion(e.target.value)}
              placeholder="请输入DBA处理意见..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              业务备注
            </label>
            <textarea
              value={businessNotes}
              onChange={(e) => setBusinessNotes(e.target.value)}
              placeholder="业务同事可在此添加备注..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !newStatus}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              保存更改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
