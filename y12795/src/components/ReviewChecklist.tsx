import { useState } from 'react';
import { CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { ReviewItem, ReviewItemStatus } from '@/types';
import { getFailureReason } from '@/utils/failureReasons';

interface ReviewChecklistProps {
  items: ReviewItem[];
  onUpdate: (id: string, updates: Partial<ReviewItem>) => void;
}

const statusConfig: Record<ReviewItemStatus, { icon: typeof HelpCircle; label: string; cls: string }> = {
  '待复核': { icon: HelpCircle, label: '待复核', cls: 'bg-lab-amber/10 text-lab-amber border-lab-amber/40' },
  '已通过': { icon: CheckCircle, label: '已通过', cls: 'bg-lab-green/10 text-lab-green border-lab-green/40' },
  '需复测': { icon: XCircle, label: '需复测', cls: 'bg-lab-red/10 text-lab-red border-lab-red/40' },
};

export function ReviewChecklist({ items, onUpdate }: ReviewChecklistProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grouped = {
    '称量单': items.filter((i) => i.category === '称量单'),
    '实验记录': items.filter((i) => i.category === '实验记录'),
    '反应时间': items.filter((i) => i.category === '反应时间'),
  };

  const categories: Array<keyof typeof grouped> = ['称量单', '实验记录', '反应时间'];

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat} className="lab-card overflow-hidden">
          <div className="p-4 border-b border-lab-line bg-lab-navy text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">{cat} - 复核检查项</h3>
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded-sm">
                {grouped[cat].filter((i) => i.status === '待复核').length} / {grouped[cat].length} 待处理
              </span>
            </div>
          </div>

          {grouped[cat].length === 0 ? (
            <div className="p-6 text-center text-gray-400">该分类暂无检查项</div>
          ) : (
            <div className="divide-y divide-lab-line">
              {grouped[cat].map((item) => {
                const cfg = statusConfig[item.status];
                const Icon = cfg.icon;
                const isExpanded = expandedId === item.id;
                const failure = item.errorCode ? getFailureReason(item.errorCode) : undefined;

                return (
                  <div key={item.id} className={`${item.status === '待复核' ? 'bg-amber-50/30' : ''}`}>
                    <div className="p-4 flex items-start gap-4">
                      <div className={`p-2 rounded-sm border ${cfg.cls}`}>
                        <Icon size={20} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-medium text-lab-ink">{item.itemName}</h4>
                            <p className="text-sm text-gray-600 mt-0.5">{item.reason}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="source-badge">📌 {item.sourceRef}</span>
                              {item.errorCode && (
                                <span className="source-badge bg-red-50 border-lab-red/30 text-lab-red">
                                  {item.errorCode}
                                </span>
                              )}
                              {item.reviewer && (
                                <span className="source-badge bg-green-50 border-lab-green/30 text-lab-green">
                                  复核人：{item.reviewer}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => onUpdate(item.id, { status: '已通过', reviewer: '当前用户', reviewedAt: new Date().toLocaleString('zh-CN') })}
                              className={`lab-btn text-sm ${item.status === '已通过' ? 'bg-lab-green text-white' : 'bg-white border border-lab-green text-lab-green hover:bg-lab-green/5'}`}
                            >
                              通过
                            </button>
                            <button
                              onClick={() => onUpdate(item.id, { status: '需复测', reviewer: '当前用户', reviewedAt: new Date().toLocaleString('zh-CN') })}
                              className={`lab-btn text-sm ${item.status === '需复测' ? 'bg-lab-red text-white' : 'bg-white border border-lab-red text-lab-red hover:bg-lab-red/5'}`}
                            >
                              需复测
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="p-2 hover:bg-gray-100 rounded-sm"
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>

                        {isExpanded && failure && (
                          <div className="mt-4 p-4 bg-lab-cream rounded-sm border border-lab-amber/30">
                            <div className="flex items-start gap-2 mb-2">
                              <AlertTriangle size={18} className="text-lab-amber shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-lab-ink">为什么需要复核？</p>
                                <p className="text-sm text-gray-700 mt-1 leading-relaxed">{failure.explanation}</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-lab-amber/20">
                              <p className="text-sm">
                                <span className="font-medium">处理建议：</span>
                                <span className="text-gray-700">{failure.suggestion}</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
