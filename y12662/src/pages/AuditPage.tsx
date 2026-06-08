import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Check,
  X,
  Edit3,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { REVIEW_ACTION_LABEL } from '@/types';
import type { ReviewAction, ReviewActionType } from '@/types';
import { cn } from '@/lib/utils';

function ActionIcon({ action }: { action: ReviewActionType }) {
  const map = {
    APPROVE: { Icon: Check, color: 'text-green-400 bg-green-500/15' },
    REJECT: { Icon: X, color: 'text-red-400 bg-red-500/15' },
    MODIFY: { Icon: Edit3, color: 'text-blue-400 bg-blue-500/15' },
  };
  const { Icon, color } = map[action];
  return (
    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', color)}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

export function AuditPage() {
  const navigate = useNavigate();
  const { reviewActions, anomalies, records, batches } = useAppStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...reviewActions].sort(
        (a, b) =>
          new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime()
      ),
    [reviewActions]
  );

  const getRelatedInfo = (ra: ReviewAction) => {
    const anomaly = anomalies.find((a) => a.id === ra.anomalyId);
    const record = records.find((r) => r.id === anomaly?.recordId);
    const batch = batches.find((b) => b.id === record?.batchId);
    return { anomaly, record, batch };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">历史审计</h1>
          <p className="mt-1 text-sm text-marine-300">
            所有复核与修改操作的完整记录，包含操作人、操作时间、修改原因与前后对比
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="border border-marine-700/50 bg-marine-800/50 rounded-lg py-16 text-center">
          <History className="w-10 h-10 text-marine-600 mx-auto mb-3" />
          <div className="text-sm text-marine-400">暂无审计记录</div>
          <div className="text-xs text-marine-500 mt-1">
            对异常进行复核或修改后，操作记录将在此处显示
          </div>
        </div>
      ) : (
        <div className="border border-marine-700/50 bg-marine-800/30 rounded-lg overflow-hidden divide-y divide-marine-700/40">
          {sorted.map((ra) => {
            const info = getRelatedInfo(ra);
            const isOpen = expanded === ra.id;
            return (
              <div key={ra.id} className="bg-marine-800/20">
                <button
                  onClick={() => setExpanded(isOpen ? null : ra.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-marine-700/20 transition-colors text-left"
                >
                  <ActionIcon action={ra.action} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {ra.operator}
                      </span>
                      <span className="text-xs text-marine-400 bg-marine-700/50 px-2 py-0.5 rounded">
                        {REVIEW_ACTION_LABEL[ra.action]}
                      </span>
                      {info.record && (
                        <span className="text-xs font-mono text-marine-300 bg-marine-900/50 px-2 py-0.5 rounded">
                          {info.record.cargoNo}
                        </span>
                      )}
                      {info.batch && (
                        <span className="text-xs text-marine-400">
                          · {info.batch.name}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-marine-300 mt-1 truncate">
                      {ra.reason}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-marine-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ra.operatedAt).toLocaleString('zh-CN', {
                          hour12: false,
                        })}
                      </div>
                      {info.record && (
                        <div className="text-xs text-marine-500 mt-0.5">
                          {info.record.cabinNo}
                        </div>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-marine-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-marine-500" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pl-16">
                    <div className="border border-marine-700/40 rounded bg-marine-900/50 p-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-marine-400 mb-1 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            操作人
                          </div>
                          <div className="text-sm text-marine-100">
                            {ra.operator}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-marine-400 mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            操作时间
                          </div>
                          <div className="text-sm text-marine-100 font-mono">
                            {new Date(ra.operatedAt).toLocaleString('zh-CN', {
                              hour12: false,
                            })}
                          </div>
                        </div>
                        {ra.beforeData !== undefined && (
                          <div>
                            <div className="text-xs text-marine-400 mb-1">
                              变更前
                            </div>
                            <div className="text-sm text-red-300 font-mono bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                              {ra.beforeData}
                            </div>
                          </div>
                        )}
                        {ra.afterData !== undefined && (
                          <div>
                            <div className="text-xs text-marine-400 mb-1">
                              变更后
                            </div>
                            <div className="text-sm text-green-300 font-mono bg-green-500/10 border border-green-500/20 rounded px-2 py-1">
                              {ra.afterData}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mb-4">
                        <div className="text-xs text-marine-400 mb-1">
                          修改原因
                        </div>
                        <div className="text-sm text-marine-100 bg-marine-800/60 border border-marine-700/40 rounded p-3">
                          {ra.reason}
                        </div>
                      </div>
                      {info.record && (
                        <div className="flex items-center justify-between pt-3 border-t border-marine-700/40">
                          <div className="text-xs text-marine-400">
                            关联货物：
                            <span className="text-marine-200 font-mono ml-1">
                              {info.record.cargoNo}
                            </span>
                            <span className="mx-2 text-marine-600">|</span>
                            船舱：
                            <span className="text-marine-200 ml-1">
                              {info.record.cabinNo}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              navigate(`/records/${info.record!.id}`)
                            }
                            className="flex items-center gap-1 text-xs text-marine-300 hover:text-white transition-colors"
                          >
                            查看测量记录
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
