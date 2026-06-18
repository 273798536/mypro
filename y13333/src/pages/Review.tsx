import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { BarChart3, TrendingUp, TrendingDown, Target, AlertTriangle, ArrowRight, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { MetricDetail, ReviewMetrics } from '@shared/types';

function Review() {
  const { reviewMetrics, loading, error, fetchReviewMetrics, samples } = useStore();
  const navigate = useNavigate();
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [metricDetails, setMetricDetails] = useState<Record<string, MetricDetail>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  useEffect(() => {
    fetchReviewMetrics();
  }, [fetchReviewMetrics]);

  const fetchMetricDetails = async (metricName: string) => {
    if (metricDetails[metricName]) {
      setExpandedMetric(expandedMetric === metricName ? null : metricName);
      return;
    }
    
    setLoadingDetails(metricName);
    try {
      const response = await api.review.getMetricDetails(metricName);
      if (response.success && response.data) {
        setMetricDetails(prev => ({ ...prev, [metricName]: response.data! }));
        setExpandedMetric(metricName);
      }
    } catch (e) {
      console.error('获取指标详情失败', e);
    } finally {
      setLoadingDetails(null);
    }
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getMetricCard = (
    key: keyof Omit<ReviewMetrics, 'totalSamples' | 'withdrawnCount' | 'topBiasingSamples'>,
    label: string,
    isHigherBetter: boolean
  ) => {
    if (!reviewMetrics) return null;
    
    const value = reviewMetrics[key];
    const targets: Record<string, number> = {
      accuracy: 0.9,
      precision: 0.85,
      recall: 0.88,
      misjudgmentRate: 0.1,
    };
    const target = targets[key];
    const isGood = isHigherBetter ? value >= target : value <= target;
    const delta = value - target;

    return (
      <div
        key={key}
        onClick={() => fetchMetricDetails(key)}
        className={`card p-5 cursor-pointer transition-all duration-200 hover:shadow-lg ${
          expandedMetric === key ? 'ring-2 ring-primary-500' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">{label}</span>
          {isHigherBetter ? (
            isGood ? <TrendingUp className="text-emerald-500" size={18} /> : <TrendingDown className="text-red-500" size={18} />
          ) : (
            isGood ? <TrendingDown className="text-emerald-500" size={18} /> : <TrendingUp className="text-red-500" size={18} />
          )}
        </div>
        
        <div className="flex items-end gap-2 mb-2">
          <span className={`text-3xl font-bold ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
            {formatPercent(value)}
          </span>
          <span className={`text-sm ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {delta >= 0 ? '+' : ''}{formatPercent(delta)}
          </span>
        </div>
        
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full ${isGood ? 'bg-emerald-500' : 'bg-amber-500'} transition-all duration-500`}
            style={{ width: `${Math.min(value * 100 / target * 100, 100)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">目标: {formatPercent(target)}</span>
          {loadingDetails === key ? (
            <span className="text-primary-500">加载中...</span>
          ) : (
            <span className="flex items-center gap-1 text-primary-600">
              查看明细
              {expandedMetric === key ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (error || !reviewMetrics) {
    return <div className="text-center py-12 text-red-500">{error || '数据不存在'}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-800">评审分析</h1>
          <p className="text-gray-500 mt-1">不只看总指标，点击钻取查看哪几条样本拉偏了结论</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FileText size={16} />
          总样本数：{reviewMetrics.totalSamples} 条
          <span className="text-red-500 ml-2">（含 {reviewMetrics.withdrawnCount} 条撤回）</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {getMetricCard('accuracy', '准确率', true)}
        {getMetricCard('precision', '精确率', true)}
        {getMetricCard('recall', '召回率', true)}
        {getMetricCard('misjudgmentRate', '误判率', false)}
      </div>

      {expandedMetric && metricDetails[expandedMetric] && (
        <div className="card p-6 animate-slide-down">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-primary-800">
                {expandedMetric === 'accuracy' && '准确率'}
                {expandedMetric === 'precision' && '精确率'}
                {expandedMetric === 'recall' && '召回率'}
                {expandedMetric === 'misjudgmentRate' && '误判率'}
                {' '}明细分析
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                当前值 {formatPercent(metricDetails[expandedMetric].currentValue)}，
                目标值 {formatPercent(metricDetails[expandedMetric].targetValue)}，
                差值 <span className={metricDetails[expandedMetric].delta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {formatPercent(metricDetails[expandedMetric].delta)}
                </span>
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              拉偏结论的样本（按影响程度排序）
            </h3>
            
            <div className="space-y-3">
              {metricDetails[expandedMetric].biasingSamples.map((item, index) => (
                <div
                  key={item.sampleId}
                  className={`p-4 rounded-xl border transition-colors hover:border-primary-300 ${
                    index === 0 ? 'border-2 border-red-300 bg-red-50/50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      #{index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-gray-900">
                          {item.sample?.productName}
                        </span>
                        <span className="font-mono text-xs text-gray-400">{item.sampleId}</span>
                        {item.sample?.isWithdrawn && <StatusBadge status="withdrawn" />}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {item.sample?.attributeName}: {item.sample?.attributeValue}
                      </p>
                      
                      <div className="flex items-center gap-4 mb-2">
                        <div>
                          <span className="text-xs text-gray-400">影响程度</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${item.impactScore * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-red-600">
                              {(item.impactScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-400">影响指标</span>
                          <div className="flex gap-1 mt-1">
                            {item.affectedMetrics.map(m => (
                              <span key={m} className="text-xs px-2 py-0.5 bg-primary-50 text-primary-700 rounded">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="font-medium">原因：</span>{item.reason}
                      </p>
                      
                      {item.sample?.isWithdrawn && item.sample.withdrawnReason && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs text-red-700">
                            <span className="font-medium">撤回原因：</span>{item.sample.withdrawnReason}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => navigate(`/evidence/${metricDetails[expandedMetric].relatedPlaybacks.find(p => p.sampleId === item.sampleId)?.id || ''}`)}
                      className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium px-4 py-2 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      查看证据
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">相关回放记录</h3>
            <div className="grid grid-cols-2 gap-3">
              {metricDetails[expandedMetric].relatedPlaybacks.map(pb => (
                <div
                  key={pb.id}
                  onClick={() => navigate(`/evidence/${pb.id}`)}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{pb.sample?.productName}</p>
                    <p className="text-xs text-gray-500">置信度 {(pb.confidenceScore * 100).toFixed(0)}%</p>
                  </div>
                  <StatusBadge status={pb.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Target className="text-primary-600" size={20} />
          <h2 className="font-serif text-xl font-bold text-primary-800">拉偏样本红榜</h2>
        </div>
        
        <div className="space-y-4">
          {reviewMetrics.topBiasingSamples.map((item, index) => (
            <div
              key={item.sampleId}
              className={`p-4 rounded-xl border-2 transition-colors hover:border-primary-300 ${
                index === 0 ? 'border-red-300 bg-gradient-to-r from-red-50 to-white' :
                index === 1 ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-white' :
                index === 2 ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-white' :
                'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                  index === 0 ? 'bg-red-500 text-white' :
                  index === 1 ? 'bg-orange-500 text-white' :
                  index === 2 ? 'bg-amber-500 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900">
                      {item.sample?.productName}
                    </span>
                    {item.sample?.isWithdrawn && <StatusBadge status="withdrawn" />}
                  </div>
                  <p className="text-sm text-gray-600">{item.reason}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">
                    {(item.impactScore * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-400">影响占比</p>
                </div>
                
                <button
                  onClick={() => navigate('/samples')}
                  className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  去样本表
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Review;
