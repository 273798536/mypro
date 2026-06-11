import type { PaymentSplit } from '@shared/types';
import StatusBadge from './StatusBadge';

const fmt = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  payments: PaymentSplit[];
}

export default function PaymentTable({ payments }: Props) {
  const totalAmt = payments.reduce((s, p) => s + p.amount, 0);
  const totalTax = payments.reduce((s, p) => s + p.tax, 0);
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200">
            <th className="text-left font-medium text-zinc-600 px-4 py-3">回款行ID</th>
            <th className="text-left font-medium text-zinc-600 px-4 py-3">来源行号</th>
            <th className="text-left font-medium text-zinc-600 px-4 py-3">影响范围</th>
            <th className="text-right font-medium text-zinc-600 px-4 py-3">金额 (HKD)</th>
            <th className="text-right font-medium text-zinc-600 px-4 py-3">税费 (HKD)</th>
            <th className="text-left font-medium text-zinc-600 px-4 py-3">状态</th>
            <th className="text-left font-medium text-zinc-600 px-4 py-3">备注</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={p.id} className={`border-b border-zinc-100 last:border-b-0 ${i % 2 ? 'bg-zinc-50/50' : ''} hover:bg-primary-50/40 transition-colors`}>
              <td className="px-4 py-3 font-num text-zinc-600 text-xs">{p.id}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center font-num text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-100">
                  L{p.sourceRow}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {p.affectedScope.map((s) => (
                    <span key={s} className="inline-flex text-[11px] px-2 py-0.5 rounded bg-white border border-primary-200 text-primary-700">{s}</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right font-num text-zinc-900">{fmt(p.amount)}</td>
              <td className="px-4 py-3 text-right font-num text-zinc-800">{fmt(p.tax)}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} variant="payment" /></td>
              <td className="px-4 py-3 text-zinc-500 text-xs max-w-[220px] truncate">{p.remark || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-primary-50/60 border-t border-primary-100">
            <td colSpan={3} className="px-4 py-3 text-sm font-medium text-primary-900">合计</td>
            <td className="px-4 py-3 text-right font-num text-primary-900 font-semibold">{fmt(totalAmt)}</td>
            <td className="px-4 py-3 text-right font-num text-primary-900 font-semibold">{fmt(totalTax)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
