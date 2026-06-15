import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, Download, FileText, MapPin, ArrowRight } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';

export default function HandoverBoard() {
  const navigate = useNavigate();
  const reviews = useReviewStore((state) => state.reviews);
  const getAnomalyReviews = useReviewStore((state) => state.getAnomalyReviews);
  const getSampleReview = useReviewStore((state) => state.getSampleReview);
  const sceneMetas = useReviewStore((state) => state.sceneMetas);

  const anomalyReviews = getAnomalyReviews();
  const sampleReview = getSampleReview();
  const completedReviews = reviews.filter((r) => r.status === 'completed');
  const processingReviews = reviews.filter((r) => r.status === 'processing' || r.status === 'anomaly');

  const exportOptions = [
    { label: '审批台账视角', desc: '含材料清单、聊天记录' },
    { label: '现场复核视角', desc: '含点位地图、照片说明' },
    { label: '判断过程视角', desc: '含历史版本、修改原因' },
    { label: '综合报告视角', desc: '全部内容汇总导出' },
  ];

  return (
    <div className="min-h-screen bg-steel-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-steel-700 mb-1">接班看板</h2>
          <p className="text-sm text-steel-400">
            快速了解：样例在哪、异常在哪、结果怎么导出
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-steel-100 shadow-card overflow-hidden">
            <div className="p-4 border-b border-steel-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <BookOpen size={20} className="text-primary-500" />
              </div>
              <div>
                <h3 className="font-medium text-steel-700">标准样例</h3>
                <p className="text-xs text-steel-400">已完成的典型案例</p>
              </div>
            </div>

            <div className="p-4">
              {sampleReview ? (
                <div
                  onClick={() => navigate(`/review/${sampleReview.id}`)}
                  className="cursor-pointer hover:bg-steel-50 -mx-2 px-2 py-3 rounded-md transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-success-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-success-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-steel-700 line-clamp-2">
                        {sampleReview.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-steel-400">
                        <MapPin size={10} />
                        <span className="truncate">{sampleReview.location}</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-steel-300 flex-shrink-0 mt-1" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-steel-400 text-center py-4">暂无样例</p>
              )}

              <div className="mt-3 pt-3 border-t border-steel-50">
                <p className="text-xs text-steel-400">
                  共 <span className="text-steel-600 font-medium">{completedReviews.length}</span> 个已完成复核可参考
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-warning-100 shadow-card overflow-hidden">
            <div className="p-4 border-b border-warning-50 bg-warning-50/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-warning-500" />
              </div>
              <div>
                <h3 className="font-medium text-steel-700">待处理异常</h3>
                <p className="text-xs text-warning-500">
                  {anomalyReviews.length} 个异常待处理
                </p>
              </div>
            </div>

            <div className="p-4 max-h-[200px] overflow-y-auto">
              {anomalyReviews.length > 0 ? (
                <div className="space-y-2">
                  {anomalyReviews.map((review) => (
                    <div
                      key={review.id}
                      onClick={() => navigate(`/review/${review.id}`)}
                      className="cursor-pointer hover:bg-warning-50 -mx-2 px-2 py-2.5 rounded-md transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-steel-700 truncate flex-1 pr-2">
                          {review.title}
                        </p>
                        <ArrowRight size={14} className="text-warning-400 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-steel-400 mt-0.5 truncate">
                        {sceneMetas[review.id]?.pageSummary?.slice(0, 30)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-steel-400 text-center py-4">暂无异常</p>
              )}
            </div>

            <div className="px-4 pb-4">
              <div className="pt-3 border-t border-steel-50">
                <p className="text-xs text-steel-400">
                  进行中 <span className="text-primary-600 font-medium">{processingReviews.length}</span> 项，
                  待开始 <span className="text-steel-600 font-medium">{reviews.filter(r => r.status === 'pending').length}</span> 项
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-steel-100 shadow-card overflow-hidden">
            <div className="p-4 border-b border-steel-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center">
                <Download size={20} className="text-success-500" />
              </div>
              <div>
                <h3 className="font-medium text-steel-700">导出入口</h3>
                <p className="text-xs text-steel-400">按视角快速导出</p>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-2">
                {exportOptions.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 bg-steel-50 hover:bg-primary-50 rounded-md cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-sm text-steel-700">{option.label}</p>
                      <p className="text-xs text-steel-400">{option.desc}</p>
                    </div>
                    <Download size={14} className="text-steel-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="pt-3 border-t border-steel-50">
                <p className="text-xs text-steel-400">
                  导出时统一使用场景标注数据源，三套话一致
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg border border-steel-100 p-5 shadow-card">
          <h3 className="font-medium text-steel-700 mb-4">今日概览</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary-50/50 rounded-lg">
              <div className="text-2xl font-semibold text-primary-600">{reviews.length}</div>
              <div className="text-xs text-steel-500 mt-1">总复核数</div>
            </div>
            <div className="text-center p-4 bg-success-50/50 rounded-lg">
              <div className="text-2xl font-semibold text-success-600">{completedReviews.length}</div>
              <div className="text-xs text-steel-500 mt-1">已完成</div>
            </div>
            <div className="text-center p-4 bg-warning-50/50 rounded-lg">
              <div className="text-2xl font-semibold text-warning-600">{anomalyReviews.length}</div>
              <div className="text-xs text-steel-500 mt-1">异常待处理</div>
            </div>
            <div className="text-center p-4 bg-steel-50 rounded-lg">
              <div className="text-2xl font-semibold text-steel-600">{reviews.filter(r => r.status === 'pending').length}</div>
              <div className="text-xs text-steel-500 mt-1">待开始</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-primary-500 hover:text-primary-600 inline-flex items-center gap-1"
          >
            <ArrowRight size={14} className="rotate-180" />
            返回复核列表
          </button>
        </div>
      </div>
    </div>
  );
}
