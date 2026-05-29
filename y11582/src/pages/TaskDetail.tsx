
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { StatusBadge, SourceTypeBadge } from '../components/StatusBadge';
import { 
  ArrowLeft, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  FileX,
  Play,
  FileText
} from 'lucide-react';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { task, history, evidence, fetchTask, fetchHistory, fetchEvidence, loading, error } = useTaskStore();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideData, setOverrideData] = useState('');
  const [remark, setRemark] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'evidence'>('overview');

  useEffect(() => {
    if (id) {
      fetchTask(id);
      fetchHistory(id);
      fetchEvidence(id);
    }
  }, [id, fetchTask, fetchHistory, fetchEvidence]);

  const handleRetry = async () => {
    if (id && confirm('确定要重试此任务吗？')) {
      await useTaskStore.getState().retryTask(id);
    }
  };

  const handleCompensate = async () => {
    if (id && confirm('确定要手动标记为补偿成功吗？')) {
      await useTaskStore.getState().compensate(id, remark);
    }
  };

  const handleClose = async () => {
    if (id && confirm('确定要关闭此任务吗？')) {
      await useTaskStore.getState().closeTask(id, remark);
    }
  };

  const handleMarkFailed = async () => {
    if (id && confirm('确定要标记为永久失败吗？')) {
      await useTaskStore.getState().markPermanentFailed(id, remark);
    }
  };

  const handleOverride = async () => {
    if (id) {
      try {
        const standardData = JSON.parse(overrideData);
        await useTaskStore.getState().manualOverride(id, standardData, remark);
        setShowOverrideModal(false);
      } catch {
        alert('JSON 格式错误');
      }
    }
  };

  if (!task && !loading) {
    return <div className="text-center py-12 text-slate-400">任务不存在</div>;
  }

  if (loading && !task) {
    return <div className="text-center py-12 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/queue')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="text-xl font-semibold text-slate-800">任务详情</h3>
          <p className="text-sm text-slate-500 font-mono">{id}</p>
        </div>
        {task && <StatusBadge status={task.status} />}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          概览
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          操作历史 ({history.length})
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'evidence' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          原始证据
        </button>
      </div>

      {activeTab === 'overview' && task && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h4 className="font-medium text-slate-800">基本信息</h4>
            <div className="space-y-3">
              <InfoRow label="来源类型" value={<SourceTypeBadge type={task.sourceType} />} />
              <InfoRow label="来源文件" value={task.sourceFile} />
              <InfoRow label="原始行号" value={task.sourceLine.toString()} />
              <InfoRow label="创建时间" value={new Date(task.createdAt).toLocaleString('zh-CN')} />
              <InfoRow label="更新时间" value={new Date(task.updatedAt).toLocaleString('zh-CN')} />
              {task.processedAt && (
                <InfoRow label="处理时间" value={new Date(task.processedAt).toLocaleString('zh-CN')} />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h4 className="font-medium text-slate-800">处理状态</h4>
            <div className="space-y-3">
              <InfoRow label="当前状态" value={<StatusBadge status={task.status} />} />
              <InfoRow label="重试次数" value={`${task.retryCount} / ${task.maxRetries}`} />
              {task.lastError && (
                <div className="pt-2">
                  <p className="text-xs text-slate-500 mb-1">最后错误</p>
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{task.lastError}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 col-span-2">
            <h4 className="font-medium text-slate-800">数据详情</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 mb-2">原始数据</p>
                <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(task.rawData, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">标准数据</p>
                <pre className="bg-blue-50 p-4 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(task.standardData, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 col-span-2">
            <h4 className="font-medium text-slate-800">操作</h4>
            <div className="flex flex-wrap gap-3">
              {['waiting_retry', 'waiting_manual', 'pending'].includes(task.status) && (
                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play size={18} />
                  立即重试
                </button>
              )}
              {task.status === 'waiting_manual' && (
                <button
                  onClick={() => {
                    setOverrideData(JSON.stringify(task.standardData, null, 2));
                    setShowOverrideModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  <Edit3 size={18} />
                  人工改判
                </button>
              )}
              {['waiting_manual', 'permanent_failed'].includes(task.status) && (
                <button
                  onClick={handleCompensate}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  补偿入账
                </button>
              )}
              {task.status !== 'closed' && (
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                >
                  <XCircle size={18} />
                  关闭任务
                </button>
              )}
              {task.status === 'waiting_manual' && (
                <button
                  onClick={handleMarkFailed}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <FileX size={18} />
                  标记永久失败
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="space-y-6">
            {history.length === 0 ? (
              <p className="text-center text-slate-400 py-8">暂无操作历史</p>
            ) : (
              history.map((item, index) => (
                <div key={item.id} className="relative pl-8 pb-6">
                  {index < history.length - 1 && (
                    <div className="absolute left-3 top-3 bottom-0 w-px bg-slate-200" />
                  )}
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-500" />
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-800">{item.operation}</span>
                      <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">操作人: {item.operator}</p>
                    {item.remark && (
                      <p className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded mb-2">备注: {item.remark}</p>
                    )}
                    {item.diff && Object.keys(item.diff).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-500 mb-2">变更差异:</p>
                        <pre className="bg-white p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(item.diff, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'evidence' && evidence.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-slate-500" />
            <h4 className="font-medium text-slate-800">原始证据</h4>
          </div>
          {evidence.map((item, index) => (
            <div key={item.id} className={`space-y-3 ${index > 0 ? 'pt-4 border-t border-slate-100' : ''}`}>
              <InfoRow label="文件名" value={item.fileName} />
              <InfoRow label="行号" value={item.lineNumber.toString()} />
              <InfoRow label="文件哈希" value={<code className="text-xs bg-slate-100 px-2 py-1 rounded">{item.fileHash}</code>} />
              <div>
                <p className="text-xs text-slate-500 mb-2">原始内容</p>
                <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-auto">
                  {item.originalContent}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">人工改判</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">标准数据 (JSON)</label>
                <textarea
                  value={overrideData}
                  onChange={(e) => setOverrideData(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleOverride}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                确认改判
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}
