import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { useAmortizationStore } from '@/store/amortizationStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { cn } from '@/lib/utils';

export default function AmortizationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { amortizationRecords, projects, updateAmortizationRecord, addCorrection } =
    useAmortizationStore();

  const record = amortizationRecords.find((r) => r.id === id);
  const project = projects.find((p) => p.id === record?.projectId);

  const [reservedDeduction, setReservedDeduction] = useState(record?.reservedDeduction || 0);
  const [sharedAllocation, setSharedAllocation] = useState(record?.sharedAllocation || 0);
  const [anomalyHandling, setAnomalyHandling] = useState<'none' | 'resolve' | 'escalate'>('none');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!record || !project) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-500">未找到该摊销记录</p>
        </div>
      </PageContainer>
    );
  }

  const newTotalAmount = reservedDeduction + sharedAllocation + record.directCost;
  const originalTotalAmount = record.totalAmount;
  const diffAmount = newTotalAmount - originalTotalAmount;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (reservedDeduction < 0) {
      newErrors.reservedDeduction = '预留抵扣金额不能为负数';
    }

    if (sharedAllocation < 0) {
      newErrors.sharedAllocation = '共享分摊金额不能为负数';
    }

    if (!reason.trim()) {
      newErrors.reason = '请填写修改原因';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    setSaving(true);

    const changes: string[] = [];
    if (reservedDeduction !== record.reservedDeduction) {
      changes.push(
        `预留抵扣从 ${formatMoney(record.reservedDeduction)} 调整为 ${formatMoney(reservedDeduction)}`
      );
    }
    if (sharedAllocation !== record.sharedAllocation) {
      changes.push(
        `共享分摊从 ${formatMoney(record.sharedAllocation)} 调整为 ${formatMoney(sharedAllocation)}`
      );
    }
    if (anomalyHandling !== 'none') {
      changes.push(
        `异常处理：${anomalyHandling === 'resolve' ? '标记为已解决' : '上报处理'}`
      );
    }
    if (diffAmount !== 0) {
      changes.push(`总金额${diffAmount > 0 ? '增加' : '减少'} ${formatMoney(Math.abs(diffAmount))}`);
    }

    updateAmortizationRecord(id, {
      reservedDeduction,
      sharedAllocation,
      totalAmount: newTotalAmount,
    });

    addCorrection({
      targetType: 'amortization',
      targetId: id,
      operator: '当前用户',
      reason: reason.trim(),
      changeSummary: changes.join('；'),
    });

    setTimeout(() => {
      setSaving(false);
      navigate(`/amortization/${id}`);
    }, 500);
  };

  const DiffValue = ({ original, modified }: { original: number; modified: number }) => {
    const diff = modified - original;
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-neutral-900">{formatMoney(modified)}</span>
        {diff !== 0 && (
          <span
            className={cn(
              'text-sm font-medium',
              diff > 0 ? 'text-rose-600' : 'text-emerald-600'
            )}
          >
            {diff > 0 ? '+' : ''}
            {formatMoney(diff)}
          </span>
        )}
      </div>
    );
  };

  return (
    <PageContainer
      breadcrumbs={[
        { label: '摊销管理', href: '/' },
        { label: `${project.name} - ${record.period}`, href: `/amortization/${id}` },
        { label: '编辑' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/amortization/${id}`)}>
            <ArrowLeft size={16} />
            返回详情
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">编辑摊销记录</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {project.name} - {record.period}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="修改表单">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  预留抵扣金额
                </label>
                <input
                  type="number"
                  value={reservedDeduction}
                  onChange={(e) => {
                    setReservedDeduction(Number(e.target.value));
                    if (errors.reservedDeduction) {
                      setErrors((prev) => ({ ...prev, reservedDeduction: '' }));
                    }
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border text-sm transition-colors',
                    errors.reservedDeduction
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
                    'focus:outline-none focus:ring-2 focus:ring-opacity-20'
                  )}
                  min="0"
                  step="100"
                />
                {errors.reservedDeduction && (
                  <p className="mt-1.5 text-sm text-rose-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.reservedDeduction}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-neutral-500">
                  原始值：{formatMoney(record.reservedDeduction)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  共享分摊金额
                </label>
                <input
                  type="number"
                  value={sharedAllocation}
                  onChange={(e) => {
                    setSharedAllocation(Number(e.target.value));
                    if (errors.sharedAllocation) {
                      setErrors((prev) => ({ ...prev, sharedAllocation: '' }));
                    }
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border text-sm transition-colors',
                    errors.sharedAllocation
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
                    'focus:outline-none focus:ring-2 focus:ring-opacity-20'
                  )}
                  min="0"
                  step="100"
                />
                {errors.sharedAllocation && (
                  <p className="mt-1.5 text-sm text-rose-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.sharedAllocation}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-neutral-500">
                  原始值：{formatMoney(record.sharedAllocation)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  异常处理
                </label>
                <select
                  value={anomalyHandling}
                  onChange={(e) =>
                    setAnomalyHandling(e.target.value as 'none' | 'resolve' | 'escalate')
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 focus:border-primary-500 transition-colors"
                >
                  <option value="none">不处理</option>
                  <option value="resolve">标记为已解决</option>
                  <option value="escalate">上报处理</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  修改原因 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (errors.reason) {
                      setErrors((prev) => ({ ...prev, reason: '' }));
                    }
                  }}
                  rows={4}
                  placeholder="请详细说明修改原因..."
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border text-sm resize-none transition-colors',
                    errors.reason
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
                    'focus:outline-none focus:ring-2 focus:ring-opacity-20'
                  )}
                />
                {errors.reason && (
                  <p className="mt-1.5 text-sm text-rose-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {errors.reason}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card title="实时预览">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-neutral-50">
                  <p className="text-xs font-medium text-neutral-500 mb-2">原始值</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-neutral-500">预留抵扣</p>
                      <p className="text-sm font-medium text-neutral-700 mt-0.5">
                        {formatMoney(record.reservedDeduction)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">共享分摊</p>
                      <p className="text-sm font-medium text-neutral-700 mt-0.5">
                        {formatMoney(record.sharedAllocation)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">直接成本</p>
                      <p className="text-sm font-medium text-neutral-700 mt-0.5">
                        {formatMoney(record.directCost)}
                      </p>
                    </div>
                    <div className="border-t border-neutral-200 pt-3">
                      <p className="text-xs text-neutral-500">总计</p>
                      <p className="text-lg font-bold text-neutral-900 mt-0.5">
                        {formatMoney(originalTotalAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'p-4 rounded-lg',
                    diffAmount !== 0 ? 'bg-primary-50' : 'bg-neutral-50'
                  )}
                >
                  <p
                    className={cn(
                      'text-xs font-medium mb-2',
                      diffAmount !== 0 ? 'text-primary-600' : 'text-neutral-500'
                    )}
                  >
                    修改后
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-neutral-500">预留抵扣</p>
                      <DiffValue
                        original={record.reservedDeduction}
                        modified={reservedDeduction}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">共享分摊</p>
                      <DiffValue
                        original={record.sharedAllocation}
                        modified={sharedAllocation}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">直接成本</p>
                      <p className="text-sm font-medium text-neutral-700 mt-0.5">
                        {formatMoney(record.directCost)}
                      </p>
                    </div>
                    <div className="border-t border-neutral-200 pt-3">
                      <p className="text-xs text-neutral-500">总计</p>
                      <DiffValue original={originalTotalAmount} modified={newTotalAmount} />
                    </div>
                  </div>
                </div>
              </div>

              {diffAmount !== 0 && (
                <div
                  className={cn(
                    'p-4 rounded-lg border',
                    diffAmount > 0
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-emerald-50 border-emerald-200'
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-medium',
                      diffAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                    )}
                  >
                    总金额{diffAmount > 0 ? '增加' : '减少'} {formatMoney(Math.abs(diffAmount))}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-1',
                      diffAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
                    )}
                  >
                    请确认金额变动是否合理
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-neutral-200">
                <p className="text-sm font-medium text-neutral-700 mb-2">变更摘要</p>
                <div className="space-y-1.5">
                  {reservedDeduction !== record.reservedDeduction && (
                    <p className="text-sm text-neutral-600">
                      • 预留抵扣：{formatMoney(record.reservedDeduction)} →{' '}
                      {formatMoney(reservedDeduction)}
                    </p>
                  )}
                  {sharedAllocation !== record.sharedAllocation && (
                    <p className="text-sm text-neutral-600">
                      • 共享分摊：{formatMoney(record.sharedAllocation)} →{' '}
                      {formatMoney(sharedAllocation)}
                    </p>
                  )}
                  {anomalyHandling !== 'none' && (
                    <p className="text-sm text-neutral-600">
                      • 异常处理：
                      {anomalyHandling === 'resolve' ? '标记为已解决' : '上报处理'}
                    </p>
                  )}
                  {reservedDeduction === record.reservedDeduction &&
                    sharedAllocation === record.sharedAllocation &&
                    anomalyHandling === 'none' && (
                      <p className="text-sm text-neutral-500 italic">暂无变更</p>
                    )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button
            variant="secondary"
            onClick={() => navigate(`/amortization/${id}`)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSave} loading={saving}>
            <Save size={16} />
            保存修改
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
