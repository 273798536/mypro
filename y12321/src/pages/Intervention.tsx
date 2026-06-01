import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Settings2, 
  Clock, 
  Save, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  History,
  User,
  Monitor,
  FileText
} from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { cn } from '../lib/utils';
import { recalculateWithLagOverride } from '../utils/analysisEngine';
import RecordCard from '../components/RecordCard';

export default function Intervention() {
  const location = useLocation();
  const navigate = useNavigate();
  const { records, auditLogs, modifyLagValue } = useAnalysisStore();
  
  const state = location.state as { recordId?: string } | null;
  const initialRecordId = state?.recordId || '';
  
  const [selectedRecordId, setSelectedRecordId] = useState(initialRecordId);
  const [newLagValue, setNewLagValue] = useState(0);
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecordId) {
      setSelectedRecordId(initialRecordId);
    }
  }, [initialRecordId]);

  const selectedRecord = records.find(r => r.id === selectedRecordId);

  useEffect(() => {
    if (selectedRecord) {
      setNewLagValue(selectedRecord.lagValue);
      setPreviewResult(null);
    } else {
      setNewLagValue(0);
      setPreviewResult(null);
    }
  }, [selectedRecordId]);

  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccessMessage(message);
      setErrorMessage(null);
    } else {
      setErrorMessage(message);
      setSuccessMessage(null);
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 4000);
  };

  const handlePreview = () => {
    if (!selectedRecord) {
      showMessage('error', '请先选择一条记录');
      return;
    }
    
    if (newLagValue === selectedRecord.lagValue) {
      showMessage('error', '新的滞后天数与当前值相同');
      return;
    }
    
    const result = recalculateWithLagOverride(selectedRecord, newLagValue);
    setPreviewResult(result);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRecord) {
      showMessage('error', '请先选择一条记录');
      return;
    }
    
    if (!reason.trim()) {
      showMessage('error', '请填写修改原因');
      return;
    }
    
    if (!operator.trim()) {
      showMessage('error', '请填写操作人');
      return;
    }
    
    if (newLagValue === selectedRecord.lagValue) {
      showMessage('error', '新的滞后天数与当前值相同');
      return;
    }
    
    modifyLagValue(selectedRecordId, newLagValue, reason.trim(), operator.trim());
    showMessage('success', '滞后检查已修改，改动痕迹已记录，分组对比和导出报告中会显示 * 标记');
    
    setReason('');
    setOperator('');
    setPreviewResult(null);
  };

  const modifiedRecords = records.filter(r => r.lagModified);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings2 className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">人工干预</h1>
        </div>
        <p className="text-slate-400">修改滞后检查参数，所有改动都会被记录并可追溯</p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            修改滞后检查
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                选择待处理记录
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {records.filter(r => r.status === 'pending' || r.status === 'normal').length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">
                    暂无可干预的记录（待确认或正常状态）
                  </p>
                ) : (
                  records
                    .filter(r => r.status === 'pending' || r.status === 'normal')
                    .map((record) => (
                    <div
                      key={record.id}
                      onClick={() => setSelectedRecordId(record.id)}
                      className={cn(
                        'p-3 border rounded-lg cursor-pointer transition-all',
                        selectedRecordId === record.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm text-slate-300">
                            {record.id}
                            {record.lagModified && (
                              <span className="ml-1 text-purple-400 text-xs">*</span>
                            )}
                          </span>
                          <p className="text-white">
                            <span className="text-blue-400">{record.metricA}</span>
                            <span className="text-slate-500 mx-1">→</span>
                            <span className="text-cyan-400">{record.metricB}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">当前滞后</p>
                          <p className="text-sm font-mono text-slate-300">{record.lagValue}天</p>
                        </div>
                      </div>
                      {record.pendingReason && (
                        <p className="text-xs text-amber-400 mt-1">
                          待确认原因：{record.pendingReason === 'lag_relation' ? '存在滞后关系' : '存在共同趋势'}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedRecord && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      当前滞后天数
                    </label>
                    <div className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-400 font-mono">
                      {selectedRecord.lagValue} 天
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      新的滞后天数
                    </label>
                    <input
                      type="number"
                      value={newLagValue}
                      onChange={(e) => setNewLagValue(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      placeholder="例如：7"
                      min="-30"
                      max="30"
                    />
                  </div>
                </div>

                {previewResult && (
                  <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      预览修改效果
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">原始相关系数</span>
                        <span className="text-slate-300 font-mono">r = {selectedRecord.correlationCoeff.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">修改后相关系数</span>
                        <span className="text-purple-400 font-mono">r = {previewResult.correlationResult.coefficient.toFixed(4)}</span>
                      </div>
                      <div className="border-t border-slate-700 pt-3">
                        <p className="text-xs text-slate-500 mb-1">原始判断</p>
                        <p className="text-sm text-slate-300">{selectedRecord.judgment}</p>
                      </div>
                      <div className="border-t border-slate-700 pt-3">
                        <p className="text-xs text-purple-400 mb-1">修改后判断</p>
                        <p className="text-sm text-purple-300">{previewResult.detectionResult.judgment}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      操作人
                    </label>
                    <input
                      type="text"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="例如：张导师"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      修改原因
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="例如：业务逻辑确认滞后7天"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
                  >
                    预览效果
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors inline-flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    确认修改
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <div className="space-y-6">
          {selectedRecord && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">当前记录详情</h2>
              <RecordCard 
                record={selectedRecord} 
                showEvidence={true}
              />
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              改动审计日志
              {auditLogs.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 rounded">
                  {auditLogs.length}
                </span>
              )}
            </h2>

            {auditLogs.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">
                暂无改动记录
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {auditLogs.slice().reverse().map((log) => {
                  const record = records.find(r => r.id === log.recordId);
                  return (
                    <div 
                      key={log.id}
                      className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-purple-400">{log.id}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(log.modifiedAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-slate-400">关联记录：</span>
                          <span className="text-white font-mono">{log.recordId}</span>
                          {record && (
                            <span className="text-slate-400 ml-2">
                              ({record.metricA} → {record.metricB})
                            </span>
                          )}
                        </p>
                        <p>
                          <span className="text-slate-400">修改字段：</span>
                          <span className="text-white">{log.fieldName}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-slate-400">值变更：</span>
                          <span className="text-red-400 font-mono">{log.oldValue}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-emerald-400 font-mono">{log.newValue}</span>
                        </p>
                        <p>
                          <span className="text-slate-400">原因：</span>
                          <span className="text-white">{log.reason}</span>
                        </p>
                        <p>
                          <span className="text-slate-400">操作人：</span>
                          <span className="text-white">{log.operator}</span>
                        </p>
                        <p>
                          <span className="text-slate-400">影响范围：</span>
                          <span className="text-amber-400">{log.impactScope.join(', ')}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {modifiedRecords.length > 0 && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                分组对比改动影响
              </h2>
              <p className="text-sm text-slate-300 mb-4">
                以下记录的滞后检查已被人工修改，在分组对比和导出报告中会标注 <span className="text-purple-400 font-mono">*</span> 号
              </p>
              <div className="space-y-2">
                {modifiedRecords.map((record) => (
                  <div 
                    key={record.id}
                    className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm text-white">
                          {record.id} <span className="text-purple-400">*</span>
                        </span>
                        <p className="text-sm text-slate-300">
                          <span className="text-blue-400">{record.metricA}</span>
                          <span className="text-slate-500 mx-1">→</span>
                          <span className="text-cyan-400">{record.metricB}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/export')}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        查看导出 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
