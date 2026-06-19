import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import {
  BookOpen, Edit, History, ArrowRight, Check, X,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';

const Dictionary: React.FC = () => {
  const {
    dictionary,
    dictionaryComparison,
    loading,
    fetchDictionary,
    updateDictionary,
    fetchDictionaryComparison
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [comparingId, setComparingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDictionary();
  }, []);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditValue(item.value);
    setEditReason('');
  };

  const handleSave = async () => {
    if (editingId && editValue && editReason) {
      await updateDictionary(editingId, editValue, editReason);
      setEditingId(null);
      setEditValue('');
      setEditReason('');
    }
  };

  const handleCompare = async (id: string) => {
    setComparingId(id);
    await fetchDictionaryComparison(id);
    setShowCompareModal(true);
  };

  const getKeyLabel = (key: string) => {
    const labels: Record<string, string> = {
      'pool.max_connections_warning': '连接池使用率告警阈值',
      'pool.max_connections_critical': '连接池使用率危险阈值',
      'pool.waiting_warning': '等待队列告警阈值',
      'pool.timeout_warning': '超时次数告警阈值',
      'pool.error_rate_warning': '错误率告警阈值',
    };
    return labels[key] || key;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">数据字典</h1>
          <p className="text-navy-400 mt-1 text-sm">诊断规则阈值配置，修改后自动对比影响范围</p>
        </div>
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="p-4 border-b border-navy-700">
          <h3 className="text-lg font-semibold text-white">诊断阈值配置</h3>
        </div>

        <table className="w-full">
          <thead className="bg-navy-700/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-navy-300">配置项</th>
              <th className="text-left p-4 text-sm font-medium text-navy-300">Key</th>
              <th className="text-left p-4 text-sm font-medium text-navy-300">当前值</th>
              <th className="text-left p-4 text-sm font-medium text-navy-300">版本</th>
              <th className="text-left p-4 text-sm font-medium text-navy-300">描述</th>
              <th className="text-right p-4 text-sm font-medium text-navy-300">操作</th>
            </tr>
          </thead>
          <tbody>
            {dictionary.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-t border-navy-700 hover:bg-navy-700/30 transition-colors ${
                  idx % 2 === 0 ? 'bg-navy-800/50' : ''
                }`}
              >
                <td className="p-4 text-sm font-medium text-white">{getKeyLabel(item.key)}</td>
                <td className="p-4 text-sm font-mono text-navy-400">{item.key}</td>
                <td className="p-4">
                  {editingId === item.id ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-24 bg-navy-700 border border-blue-500 rounded px-2 py-1 text-white text-sm focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="text-lg font-bold text-white font-mono">{item.value}</span>
                  )}
                </td>
                <td className="p-4">
                  <StatusBadge status="normal">v{item.version}</StatusBadge>
                </td>
                <td className="p-4 text-sm text-navy-300">{item.description}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    {editingId === item.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<X size={14} />}
                          onClick={() => setEditingId(null)}
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          icon={<Check size={14} />}
                          onClick={handleSave}
                          disabled={!editValue || !editReason}
                        >
                          保存
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<History size={14} />}
                          onClick={() => handleCompare(item.id)}
                        >
                          对比
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Edit size={14} />}
                          onClick={() => handleEdit(item)}
                        >
                          编辑
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Edit size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-400 font-medium mb-2">修改说明</p>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="请详细说明修改原因，便于后续追溯和审计..."
                rows={3}
                className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 resize-none"
              />
              <p className="text-xs text-navy-400 mt-2">
                修改将创建新版本，并自动分析对历史诊断结论的影响
              </p>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="字典版本对比 - 影响分析"
        size="xl"
      >
        {dictionaryComparison && (
          <div className="space-y-6">
            <div className="bg-navy-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-white">
                  {getKeyLabel(dictionaryComparison.key)}
                </h4>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-400 font-mono">{dictionaryComparison.oldValue}</p>
                    <p className="text-xs text-navy-400">版本 v{dictionaryComparison.version1}</p>
                  </div>
                  <ArrowRight size={24} className="text-navy-500" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-400 font-mono">{dictionaryComparison.newValue}</p>
                    <p className="text-xs text-navy-400">版本 v{dictionaryComparison.version2}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-navy-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-navy-700 bg-navy-700/30">
                <h4 className="font-medium text-white">历史诊断影响分析</h4>
                <p className="text-xs text-navy-400 mt-1">
                  显示阈值变更后，历史诊断结论是否发生变化
                </p>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full">
                  <thead className="bg-navy-700 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">批次 ID</th>
                      <th className="text-center p-3 text-sm font-medium text-navy-300">旧结论</th>
                      <th className="text-center p-3 text-sm font-medium text-navy-300"></th>
                      <th className="text-center p-3 text-sm font-medium text-navy-300">新结论</th>
                      <th className="text-center p-3 text-sm font-medium text-navy-300">变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dictionaryComparison.affectedDiagnoses.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`border-t border-navy-700 ${
                          item.changed ? 'bg-yellow-500/5' : ''
                        }`}
                      >
                        <td className="p-3 text-sm font-mono text-white">
                          {item.batchId.slice(0, 20)}...
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge status={item.oldConclusion as any}>
                            {item.oldConclusion === 'warning' ? '警告' : '正常'}
                          </StatusBadge>
                        </td>
                        <td className="p-3 text-center">
                          <ArrowRight size={16} className={`mx-auto ${
                            item.changed ? 'text-yellow-400' : 'text-navy-600'
                          }`} />
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge status={item.newConclusion as any}>
                            {item.newConclusion === 'warning' ? '警告' : '正常'}
                          </StatusBadge>
                        </td>
                        <td className="p-3 text-center">
                          {item.changed ? (
                            <span className="inline-flex items-center gap-1 text-yellow-400 text-sm">
                              {parseFloat(dictionaryComparison.newValue) < parseFloat(dictionaryComparison.oldValue)
                                ? <TrendingDown size={14} />
                                : <TrendingUp size={14} />
                              }
                              有变化
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-navy-500 text-sm">
                              <Minus size={14} />
                              无变化
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowCompareModal(false)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dictionary;
