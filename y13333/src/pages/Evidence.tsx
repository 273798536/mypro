import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import { ArrowLeft, AlertTriangle, FileText, BookOpen, Link2, User, Clock, ChevronRight } from 'lucide-react';
import type { EvidenceChainDetail, EvidenceType } from '@shared/types';

const typeConfig: Record<EvidenceType, { icon: typeof FileText; label: string; color: string }> = {
  sample: { icon: FileText, label: '样本证据', color: 'text-blue-600 bg-blue-50' },
  rule: { icon: BookOpen, label: '规则依据', color: 'text-purple-600 bg-purple-50' },
  leak: { icon: AlertTriangle, label: '引用泄漏', color: 'text-red-600 bg-red-50' },
};

function Evidence() {
  const { playbackId } = useParams<{ playbackId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<EvidenceChainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playbackId) return;
    
    const fetchData = async () => {
      try {
        const response = await api.evidence.getChain(playbackId);
        if (response.success) {
          setData(response.data);
        } else {
          setError(response.message || '获取证据链失败');
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [playbackId]);

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (error || !data) {
    return <div className="text-center py-12 text-red-500">{error || '数据不存在'}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft size={18} />
        返回
      </button>

      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary-800">证据链追踪</h1>
            <p className="text-gray-500 mt-1">
              回放结果 <span className="font-mono">{playbackId}</span> 的完整证据链
            </p>
          </div>
          {data.sample && <StatusBadge status={data.sample.isWithdrawn ? 'withdrawn' : 'pending'} />}
        </div>

        {data.sample && (
          <div className={`p-5 rounded-xl mb-6 ${data.sample.isWithdrawn ? 'bg-red-50 border-2 border-red-200' : 'bg-primary-50 border border-primary-100'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${data.sample.isWithdrawn ? 'bg-red-100' : 'bg-primary-100'}`}>
                <FileText className={data.sample.isWithdrawn ? 'text-red-600' : 'text-primary-600'} size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className={`font-semibold text-lg ${data.sample.isWithdrawn ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {data.sample.productName}
                  </h2>
                  {data.sample.isWithdrawn && (
                    <StatusBadge status="withdrawn" />
                  )}
                </div>
                <p className={`text-sm ${data.sample.isWithdrawn ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="font-medium">{data.sample.attributeName}:</span> {data.sample.attributeValue}
                </p>
                
                {data.sample.isWithdrawn && data.sample.withdrawnReason && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-800 mb-1">撤回原因</p>
                    <p className="text-sm text-red-700">{data.sample.withdrawnReason}</p>
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                    <BookOpen size={12} />
                    样本原始说法（不可篡改）
                  </p>
                  <p className={`text-gray-800 italic ${data.sample.isWithdrawn ? 'line-through text-gray-400' : ''}`}>
                    "{data.sample.originalStatement}"
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <User size={10} />
                      {data.sample.createdBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {data.sample.createdAt}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {data.hasLeak && data.leakDetails && (
          <div className="p-5 rounded-xl bg-red-50 border-2 border-red-200 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-2">⚠ 检测到样本引用泄漏</h3>
                <p className="text-sm text-red-700 mb-3">
                  报告中引用了样本结论但未标注具体样本来源，不是含糊警告，已追到具体位置：
                </p>
                
                <div className="p-3 bg-white rounded-lg border border-red-200 mb-3">
                  <p className="text-xs font-medium text-red-600 mb-1">报告原始说法</p>
                  <p className="text-sm text-gray-800 font-mono bg-gray-50 p-2 rounded">
                    {data.leakDetails.originalStatement}
                  </p>
                </div>
                
                <p className="text-sm font-medium text-red-700 mb-2">
                  缺失的样本引用（{data.leakDetails.missingSampleIds.length} 条）：
                </p>
                <div className="space-y-2">
                  {data.leakDetails.missingSamples.map(sample => (
                    <div
                      key={sample.id}
                      onClick={() => navigate(`/evidence/${sample.id}`)}
                      className="flex items-center gap-2 p-3 bg-white rounded-lg border border-red-200 hover:border-red-400 cursor-pointer transition-colors"
                    >
                      <Link2 size={14} className="text-red-500" />
                      <span className="font-mono text-sm text-red-600">{sample.id}</span>
                      <span className="text-sm text-gray-700">{sample.productName}</span>
                      <ChevronRight size={14} className="text-gray-400 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary-600" />
            证据链时间线
          </h3>
          
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            <div className="space-y-6">
              {data.evidenceChain.map((item, index) => {
                const config = typeConfig[item.type];
                const Icon = config.icon;
                
                return (
                  <div key={item.id} className="relative pl-14">
                    <div className={`absolute left-0 w-12 h-12 rounded-xl ${config.color} flex items-center justify-center shadow-md`}>
                      <Icon size={20} />
                    </div>
                    
                    <div className={`p-4 rounded-xl border-l-4 ${
                      item.severity === 'high' ? 'severity-high' :
                      item.severity === 'medium' ? 'severity-medium' : 'severity-low'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400">步骤 {index + 1}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.color}`}>
                            {config.label}
                          </span>
                          <SeverityBadge severity={item.severity} />
                        </div>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{item.content}</p>
                      
                      {item.originalStatement && (
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            {item.type === 'leak' ? '泄漏处原始说法' : '样本原始说法'}
                          </p>
                          <p className="text-sm text-gray-800 italic">
                            "{item.originalStatement}"
                          </p>
                          {item.sampleId && (
                            <p className="text-xs text-gray-400 mt-2">
                              来源样本：<span className="font-mono">{item.sampleId}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Evidence;
