import { useState, useEffect, useCallback } from 'react';
import {
  X, User, MapPin, Droplets, AlertTriangle, CheckCircle,
  XCircle, Flag, Clock, Loader2, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBillStore } from '@/stores/billStore';
import StatusBadge from '@/components/StatusBadge';
import ExceptionBadge from '@/components/ExceptionBadge';
import type {
  Bill, BillDetail as BillTierDetail, BillException, UserProfile,
} from '../../shared/types';
import {
  USER_TYPE_LABELS, USER_CATEGORY_LABELS, ALLOCATION_METHOD_LABELS,
} from '../../shared/types';
import { apiGet } from '@/utils/api';

interface BillDetailPanelProps {
  open: boolean;
  onClose: () => void;
  reviewMode?: boolean;
}

interface AllocationData {
  total_group_usage: number;
  share_ratio: number;
  allocated_usage: number;
  allocated_amount: number;
  validated: boolean;
}

const TIER_COLORS = ['#93c5fd', '#3b82f6', '#1e3a5f', '#1e40af'];

const SEVERITY_STYLES = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export default function BillDetailPanel({ open, onClose, reviewMode }: BillDetailPanelProps) {
  const { currentBill, reviewBill, updateStatus } = useBillStore();
  const [tierDetails, setTierDetails] = useState<BillTierDetail[]>([]);
  const [exceptions, setExceptions] = useState<BillException[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | 'exception' | null>(
    reviewMode ? 'approve' : null
  );
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetailData = useCallback(async () => {
    if (!currentBill) return;
    try {
      const [details, excs, profile] = await Promise.all([
        apiGet<BillTierDetail[]>(`/bills/${currentBill.id}/details`).catch(() => []),
        apiGet<BillException[]>(`/bills/${currentBill.id}/exceptions`).catch(() => []),
        apiGet<UserProfile>(`/users/${currentBill.user_no}`).catch(() => null),
      ]);
      setTierDetails(details);
      setExceptions(excs);
      setUserProfile(profile);

      if (currentBill.user_category === 'combined') {
        const alloc = await apiGet<AllocationData>(
          `/bills/${currentBill.id}/allocation`
        ).catch(() => null);
        setAllocation(alloc);
      }
    } catch {
      // silently handle
    }
  }, [currentBill]);

  useEffect(() => {
    if (open && currentBill) {
      fetchDetailData();
      setActiveAction(reviewMode ? 'approve' : null);
      setComment('');
    }
  }, [open, currentBill, reviewMode, fetchDetailData]);

  const handleAction = async () => {
    if (!currentBill || !activeAction) return;
    setSubmitting(true);
    try {
      if (activeAction === 'approve') {
        await reviewBill(currentBill.id, 'approve', comment);
      } else if (activeAction === 'reject') {
        await reviewBill(currentBill.id, 'reject', comment);
      } else {
        await updateStatus(currentBill.id, 'exception', comment);
      }
      setActiveAction(null);
      setComment('');
    } finally {
      setSubmitting(false);
    }
  };

  const totalTierUsage = tierDetails.reduce((sum, t) => sum + t.usage, 0);

  if (!open || !currentBill) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[600px] transform bg-white shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">账单详情</h2>
              <StatusBadge status={currentBill.status} />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <UserInfoSection bill={currentBill} profile={userProfile} />

            <TierBreakdownSection tierDetails={tierDetails} totalTierUsage={totalTierUsage} bill={currentBill} />

            {currentBill.user_category === 'combined' && (
              <AllocationSection bill={currentBill} allocation={allocation} />
            )}

            {exceptions.length > 0 && <ExceptionsSection exceptions={exceptions} />}

            <ReviewHistorySection bill={currentBill} />
          </div>

          <ActionSection
            activeAction={activeAction}
            setActiveAction={setActiveAction}
            comment={comment}
            setComment={setComment}
            submitting={submitting}
            onConfirm={handleAction}
            status={currentBill.status}
          />
        </div>
      </div>
    </>
  );
}

function UserInfoSection({ bill, profile }: { bill: Bill; profile: UserProfile | null }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
        <User className="h-4 w-4" /> 用户信息
      </h3>
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">户号</span>
            <p className="font-medium text-gray-900">{bill.user_no}</p>
          </div>
          <div>
            <span className="text-gray-500">户名</span>
            <p className="font-medium text-gray-900">{profile?.name ?? '—'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">地址</span>
            <p className="flex items-center gap-1 font-medium text-gray-900">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {profile?.address ?? '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">用户类型</span>
            <p>
              <span className="inline-flex rounded bg-[#1e3a5f]/10 px-2 py-0.5 text-xs font-medium text-[#1e3a5f]">
                {USER_TYPE_LABELS[bill.user_type]}
              </span>
            </p>
          </div>
          <div>
            <span className="text-gray-500">用水类别</span>
            <p>
              <span className="inline-flex rounded bg-[#3b82f6]/10 px-2 py-0.5 text-xs font-medium text-[#3b82f6]">
                {USER_CATEGORY_LABELS[bill.user_category]}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TierBreakdownSection({
  tierDetails, totalTierUsage, bill,
}: {
  tierDetails: BillTierDetail[];
  totalTierUsage: number;
  bill: Bill;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
        <Droplets className="h-4 w-4" /> 阶梯用量明细
      </h3>
      {tierDetails.length > 0 ? (
        <>
          <div className="mb-3 flex h-6 overflow-hidden rounded-full">
            {tierDetails.map((tier, idx) => {
              const pct = totalTierUsage > 0 ? (tier.usage / totalTierUsage) * 100 : 0;
              return (
                <div
                  key={tier.id}
                  style={{ width: `${pct}%`, backgroundColor: TIER_COLORS[idx % TIER_COLORS.length] }}
                  className="flex items-center justify-center text-xs font-medium text-white transition-all"
                  title={`第${tier.tier}阶: ${tier.usage}t (${pct.toFixed(1)}%)`}
                >
                  {pct > 10 && `${pct.toFixed(0)}%`}
                </div>
              );
            })}
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-left font-medium">阶梯</th>
                  <th className="px-3 py-2 text-right font-medium">用量(t)</th>
                  <th className="px-3 py-2 text-right font-medium">单价(¥/t)</th>
                  <th className="px-3 py-2 text-right font-medium">小计(¥)</th>
                </tr>
              </thead>
              <tbody>
                {tierDetails.map((tier, idx) => (
                  <tr key={tier.id} className="border-t border-gray-50">
                    <td className="px-3 py-2">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: TIER_COLORS[idx % TIER_COLORS.length] }}
                      />
                      第{tier.tier}阶
                    </td>
                    <td className="px-3 py-2 text-right">{tier.usage.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{tier.price_per_ton.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">{tier.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                  <td className="px-3 py-2">合计</td>
                  <td className="px-3 py-2 text-right">{totalTierUsage.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">—</td>
                  <td className="px-3 py-2 text-right text-[#1e3a5f]">
                    ¥{bill.calculated_amount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400">暂无阶梯明细</p>
      )}
    </section>
  );
}

function AllocationSection({
  bill, allocation,
}: {
  bill: Bill;
  allocation: AllocationData | null;
}) {
  if (!allocation) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
        <ShieldCheck className="h-4 w-4" /> 合表分摊
      </h3>
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">分摊方式</span>
            <p className="font-medium text-gray-900">
              {bill.allocation_method ? ALLOCATION_METHOD_LABELS[bill.allocation_method] : '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">总组用量</span>
            <p className="font-medium text-gray-900">{allocation.total_group_usage.toFixed(2)} t</p>
          </div>
          <div>
            <span className="text-gray-500">分摊比例</span>
            <p className="font-medium text-gray-900">{(allocation.share_ratio * 100).toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-gray-500">分摊用量</span>
            <p className="font-medium text-gray-900">{allocation.allocated_usage.toFixed(2)} t</p>
          </div>
          <div>
            <span className="text-gray-500">分摊金额</span>
            <p className="font-medium text-[#1e3a5f]">¥{allocation.allocated_amount.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-gray-500">验证状态</span>
            <p>
              {allocation.validated ? (
                <span className="inline-flex items-center gap-1 text-[#10b981]">
                  <CheckCircle className="h-4 w-4" /> 验证通过
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#ef4444]">
                  <XCircle className="h-4 w-4" /> 验证失败
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExceptionsSection({ exceptions }: { exceptions: BillException[] }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
        <AlertTriangle className="h-4 w-4" /> 异常信息
      </h3>
      <div className="space-y-3">
        {exceptions.map((exc) => (
          <div
            key={exc.id}
            className="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <ExceptionBadge type={exc.type} />
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  SEVERITY_STYLES[exc.severity]
                )}
                title={`${exc.severity} severity`}
              />
              <span className="text-xs text-gray-500">
                {exc.severity === 'low' ? '低' : exc.severity === 'medium' ? '中' : '高'}
              </span>
            </div>
            <p className="mb-1 text-sm text-gray-700">{exc.description}</p>
            <p className="rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-800">
              {exc.human_readable}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewHistorySection({ bill }: { bill: Bill }) {
  const items = [
    { time: bill.created_at, label: '账单创建', icon: Clock, color: 'bg-gray-400' },
  ];
  if (bill.reviewed_at && bill.reviewed_by) {
    items.push({
      time: bill.reviewed_at,
      label: `复核处理 - ${bill.reviewed_by}`,
      icon: bill.status === 'approved' ? CheckCircle : bill.status === 'rejected' ? XCircle : AlertTriangle,
      color: bill.status === 'approved' ? 'bg-[#10b981]' : bill.status === 'rejected' ? 'bg-[#ef4444]' : 'bg-orange-500',
    });
  }

  return (
    <section className="mb-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
        <Flag className="h-4 w-4" /> 复核记录
      </h3>
      <div className="space-y-0">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-full', item.color)}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                {idx < items.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.time}</p>
                {bill.review_comments && idx === items.length - 1 && items.length > 1 && (
                  <p className="mt-1 text-sm text-gray-600">备注: {bill.review_comments}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionSection({
  activeAction, setActiveAction, comment, setComment, submitting, onConfirm, status,
}: {
  activeAction: 'approve' | 'reject' | 'exception' | null;
  setActiveAction: (a: 'approve' | 'reject' | 'exception' | null) => void;
  comment: string;
  setComment: (c: string) => void;
  submitting: boolean;
  onConfirm: () => void;
  status: string;
}) {
  const isActionable = status === 'pending' || status === 'reviewing' || status === 'exception';
  if (!isActionable) return null;

  const actions = [
    { key: 'approve' as const, label: '通过', color: 'bg-[#10b981] hover:bg-[#059669]', icon: CheckCircle },
    { key: 'reject' as const, label: '驳回', color: 'bg-[#ef4444] hover:bg-[#dc2626]', icon: XCircle },
    { key: 'exception' as const, label: '标记异常', color: 'bg-orange-500 hover:bg-orange-600', icon: AlertTriangle },
  ];

  return (
    <div className="border-t bg-gray-50 px-6 py-4">
      {activeAction && (
        <div className="mb-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="请输入复核意见..."
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => setActiveAction(activeAction === action.key ? null : action.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
              action.color,
              activeAction === action.key && 'ring-2 ring-offset-2'
            )}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </button>
        ))}
        {activeAction && (
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d7a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            确认
          </button>
        )}
      </div>
    </div>
  );
}
