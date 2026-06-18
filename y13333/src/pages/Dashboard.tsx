import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, ArrowRight, FileText, Play, TrendingDown } from 'lucide-react';
import type { PlaybackResult, PlaybackStatus } from '@shared/types';

function Dashboard() {
  const {
    playbackResults,
    samples,
    loading,
    error,
    fetchPlaybackResults,
    fetchSamples,
    updatePlaybackStatus,
    getNeedEvidenceCount,
    getApprovedCount,
    getPendingCount,
    getWithdrawnCount,
  } = useStore();
  
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<PlaybackStatus | 'all'>('all');
  const [showRemarkInput, setShowRemarkInput] = useState<string | null>(null);
  const [remark, setRemark] = useState('');

  useEffect(() => {
    fetchPlaybackResults();
    fetchSamples();
  }, [fetchPlaybackResults, fetchSamples]);

  const getResultsByStatus = (status: PlaybackStatus) => 
    playbackResults.filter(p => p.status === status);

  const needEvidence = getResultsByStatus('need_evidence');
  const approved = getResultsByStatus('approved');
  const pending = getResultsByStatus('pending');
  const processing = getResultsByStatus('processing');

  const handleStatusUpdate = (id: string, status: PlaybackStatus, operator: string, remarkText?: string) => {
    updatePlaybackStatus(id, status, operator, remarkText);
    setShowRemarkInput(null);
    setRemark('');
  };

  const statusColumns: { status: PlaybackStatus | 'pending' | 'approved' | 'need_evidence' | 'processing'; title: string; icon: typeof AlertTriangle; color: string; items: PlaybackResult[] }[] = [
    { status: 'need_evidence', title: '待补证', icon: AlertTriangle, color: 'from-amber-500 to-orange-500', items: needEvidence },
    { status: 'pending', title: '待处理', icon: Clock, color: 'from-blue-500 to-indigo-500', items: pending },
    { status: 'approved', title: '可放行', icon: CheckCircle, color: 'from-emerald-500 to-green-500', items: approved },
  ];

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-800">处理状态看板</h1>
          <p className="text-gray-500 mt-1">周姐视角：一目了然哪些该补、哪些可以放行</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/samples')} className="btn-secondary flex items-center gap-2">
            <FileText size={16} />
            样本表
          </button>
          <button onClick={() => navigate('/playback')} className="btn-primary flex items-center gap-2">
            <Play size={16} />
            执行回放
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待补证</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{getNeedEvidenceCount()}</p>
            </div>
            <AlertTriangle className="text-amber-500" size={28} />
          </div>
          <p className="text-xs text-gray-400 mt-2">需要补充证据材料</p>
        </div>
        
        <div className="card p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{getPendingCount()}</p>
            </div>
            <Clock className="text-blue-500" size={28} />
          </div>
          <p className="text-xs text-gray-400 mt-2">等待排班同事处理</p>
        </div>
        
        <div className="card p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已放行</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{getApprovedCount()}</p>
            </div>
            <CheckCircle className="text-emerald-500" size={28} />
          </div>
          <p className="text-xs text-gray-400 mt-2">证据充分，同意放行</p>
        </div>
        
        <div className="card p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">撤回记录</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{getWithdrawnCount()}</p>
            </div>
            <TrendingDown className="text-red-500" size={28} />
          </div>
          <p className="text-xs text-gray-400 mt-2">已撤回的样本记录</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {statusColumns.map(column => {
          const Icon = column.icon;
          return (
            <div key={column.status} className="card">
              <div className={`bg-gradient-to-r ${column.color} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={24} />
                    <h2 className="font-serif text-lg font-semibold">{column.title}</h2>
                  </div>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                    {column.items.length}
                  </span>
                </div>
              </div>
              
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {column.items.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">暂无记录</p>
                ) : (
                  column.items.map(item => (
                    <div key={item.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-primary-200 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{item.sample?.productName}</p>
                          <p className="text-xs text-gray-500">{item.sample?.attributeName}: {item.sample?.attributeValue}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{item.judgmentReason}</p>
                      
                      {item.missingReference && (
                        <div className="mb-3 p-2 bg-amber-50 rounded border border-amber-200">
                          <p className="text-xs text-amber-700 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            缺样本引用，缺失 {item.missingSampleIds.length} 条样本
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/evidence/${item.id}`)}
                          className="flex-1 text-xs py-1.5 px-3 bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors flex items-center justify-center gap-1"
                        >
                          查看证据链
                          <ArrowRight size={12} />
                        </button>
                        
                        {column.status === 'need_evidence' && (
                          <button
                            onClick={() => {
                              setShowRemarkInput(item.id);
                              setRemark(item.remark || '');
                            }}
                            className="text-xs py-1.5 px-3 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors"
                          >
                            标记已补
                          </button>
                        )}
                        
                        {column.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(item.id, 'approved', '周姐', '证据充分，同意放行')}
                            className="text-xs py-1.5 px-3 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 transition-colors"
                          >
                            放行
                          </button>
                        )}
                      </div>
                      
                      {showRemarkInput === item.id && (
                        <div className="mt-3 space-y-2">
                          <input
                            type="text"
                            placeholder="补充说明（可选）"
                            value={remark}
                            onChange={e => setRemark(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusUpdate(item.id, 'pending', '周姐', remark || undefined)}
                              className="flex-1 text-xs py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                            >
                              确认已补证
                            </button>
                            <button
                              onClick={() => setShowRemarkInput(null)}
                              className="flex-1 text-xs py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {item.remark && (
                        <p className="text-xs text-gray-400 mt-2 italic">备注：{item.remark}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
