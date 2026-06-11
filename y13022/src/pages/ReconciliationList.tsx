import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  ChevronRight,
  Download,
  Layers3,
  TrendingUp,
  Upload,
  FileWarning,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { applyFilter, useFilterStore } from '@/store/useFilterStore';
import { FilterDrawer } from '@/components/FilterDrawer';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_LABEL, type Reconciliation } from '@/types';
import { buildFilterLabel } from '@/utils/exporter';
import { exportToCsv } from '@/utils/exporter';
import { formatMoney, formatNumber } from '@/utils/parser';

type SortKey =
  | 'tradeDate'
  | 'contractCode'
  | 'basis'
  | 'amount'
  | 'status';

export default function ReconciliationList() {
  const records = useReconciliationStore((s) => s.records);
  const filter = useFilterStore();
  const [sortKey, setSortKey] = useState<SortKey>('tradeDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const f = applyFilter(records, {
      status: filter.status,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      contractCode: filter.contractCode,
      isPaymentSplit: filter.isPaymentSplit,
    });
    return [...f].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'tradeDate') cmp = a.tradeDate.localeCompare(b.tradeDate);
      else if (sortKey === 'contractCode') cmp = a.contractCode.localeCompare(b.contractCode);
      else if (sortKey === 'basis') cmp = a.basis - b.basis;
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [records, filter, sortKey, sortDir]);

  const stats = useMemo(() => {
    const s = { confirmed: 0, pending: 0, returned: 0, total: records.length, split: 0 };
    for (const r of records) {
      s[r.status]++;
      if (r.isPaymentSplit) s.split++;
    }
    return s;
  }, [records]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  const handleExport = () => {
    const snap = filter.snapshot();
    exportToCsv(filtered, snap);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700 bg-ink-900/50 px-8 py-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink-100">
              期货基差口径对账 · 记录列表
            </h2>
            <p className="mt-1 text-xs text-ink-400">
              当前筛选：<span className="font-mono-num text-amber-gold">{buildFilterLabel(filter.snapshot())}</span>
              <span className="mx-2 text-ink-600">|</span>
              共 <span className="text-ink-200">{filtered.length}</span> / {records.length} 条
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDrawer />
            <Link
              to="/import"
              className="flex items-center gap-2 rounded-sm border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-200 transition hover:border-amber-gold/60 hover:text-amber-gold"
            >
              <Upload size={15} />
              导入材料
            </Link>
            <Link
              to="/export"
              className="flex items-center gap-2 rounded-sm border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm text-ink-200 transition hover:border-amber-gold/60 hover:text-amber-gold"
            >
              <TrendingUp size={15} />
              导出中心
            </Link>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-sm border-2 border-amber-gold bg-amber-gold/10 px-4 py-1.5 text-sm font-medium text-amber-gold transition hover:bg-amber-gold/20 hover:shadow-glow-amber"
            >
              <Download size={15} />
              导出当前列表
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="全部记录" value={stats.total} icon={<Layers3 size={16} />} tone="ink" />
          <StatCard label="已确认" value={stats.confirmed} icon={<CheckCircle2 size={16} />} tone="confirmed" />
          <StatCard label="待补件" value={stats.pending} icon={<Clock size={16} />} tone="pending" />
          <StatCard label="退回" value={stats.returned} icon={<FileWarning size={16} />} tone="returned" />
          <StatCard label="回款拆分" value={stats.split} icon={<Layers3 size={16} />} tone="amber" />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-ink-800 text-xs uppercase tracking-wider text-ink-300">
            <tr>
              <Th label="合约" k="contractCode" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <Th label="交易日期" k="tradeDate" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <th className="border-b border-ink-700 px-4 py-3 text-left">现货价</th>
              <th className="border-b border-ink-700 px-4 py-3 text-left">期货价</th>
              <Th label="基差" k="basis" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <th className="border-b border-ink-700 px-4 py-3 text-left">税费</th>
              <th className="border-b border-ink-700 px-4 py-3 text-left">汇率</th>
              <Th label="金额" k="amount" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <Th label="状态" k="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <th className="border-b border-ink-700 px-4 py-3 text-left">回款标记</th>
              <th className="border-b border-ink-700 px-4 py-3 text-left">流水号</th>
              <th className="sticky right-0 border-b border-ink-700 bg-ink-800 px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-16 text-center text-ink-400">
                  暂无匹配记录，请调整筛选条件或前往导入新材料。
                </td>
              </tr>
            )}
            {filtered.map((r, idx) => (
              <Row key={r.id} record={r} even={idx % 2 === 0} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'ink' | 'confirmed' | 'pending' | 'returned' | 'amber';
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
  const toneMap: Record<StatCardProps['tone'], string> = {
    ink: 'text-ink-200 border-ink-700',
    confirmed: 'text-emerald-400 border-emerald-500/30',
    pending: 'text-amber-400 border-amber-500/30',
    returned: 'text-rose-400 border-rose-500/30',
    amber: 'text-amber-gold border-amber-gold/30',
  };
  return (
    <div
      className={
        'flex items-center justify-between rounded-sm border bg-ink-800/50 px-4 py-3 ' + toneMap[tone]
      }
    >
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
        <div className="mt-1 font-serif text-2xl font-semibold">{value}</div>
      </div>
      <div className="opacity-80">{icon}</div>
    </div>
  );
}

interface ThProps {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onToggle: (k: SortKey) => void;
}

function Th({ label, k, sortKey, sortDir, onToggle }: ThProps) {
  const active = sortKey === k;
  return (
    <th className="border-b border-ink-700 px-4 py-3 text-left">
      <button
        onClick={() => onToggle(k)}
        className={
          'inline-flex items-center gap-1 transition ' +
          (active ? 'text-amber-gold' : 'hover:text-ink-100')
        }
      >
        {label}
        <ArrowUpDown size={12} className={active ? 'opacity-100' : 'opacity-30'} />
        {active && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}

function Row({ record, even }: { record: Reconciliation; even: boolean }) {
  return (
    <tr
      className={
        'group transition-colors ' +
        (even ? 'bg-ink-900' : 'bg-ink-900/40') +
        ' hover:bg-ink-800'
      }
    >
      <td
        className={
          'relative border-b border-ink-800 px-4 py-3 ' +
          (record.isPaymentSplit ? 'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-amber-gold' : '')
        }
      >
        <span className="font-mono-num font-medium text-ink-100">{record.contractCode}</span>
      </td>
      <td className="border-b border-ink-800 px-4 py-3 font-mono-num text-ink-200">
        {record.tradeDate}
      </td>
      <td className="border-b border-ink-800 px-4 py-3 font-mono-num text-ink-200">
        {formatNumber(record.spotPrice, 2)}
      </td>
      <td className="border-b border-ink-800 px-4 py-3 font-mono-num text-ink-200">
        {formatNumber(record.futuresPrice, 2)}
      </td>
      <td
        className={
          'border-b border-ink-800 px-4 py-3 font-mono-num ' +
          (record.basis >= 0 ? 'text-emerald-400' : 'text-rose-400')
        }
      >
        {formatNumber(record.basis, 4)}
      </td>
      <td className="border-b border-ink-800 px-4 py-3 font-mono-num text-ink-200">
        {record.taxAmount === null ? (
          <span className="text-ink-500">—</span>
        ) : (
          formatNumber(record.taxAmount, 2)
        )}
      </td>
      <td className="border-b border-ink-800 px-4 py-3 font-mono-num text-ink-200">
        {record.exchangeRate === null ? (
          <span className="text-ink-500">—</span>
        ) : (
          formatNumber(record.exchangeRate, 4)
        )}
      </td>
      <td className="border-b border-ink-800 px-4 py-3 font-mono-num text-ink-100">
        {formatMoney(record.amount)}
      </td>
      <td className="border-b border-ink-800 px-4 py-3">
        <StatusBadge status={record.status} />
      </td>
      <td className="border-b border-ink-800 px-4 py-3">
        {record.isPaymentSplit ? (
          <span
            className="inline-flex items-center gap-1 rounded-sm border border-amber-gold/40 bg-amber-gold/10 px-2 py-0.5 text-xs text-amber-gold"
            title={`回款拆分组：${record.paymentGroupId}`}
          >
            <Layers3 size={11} />
            回款拆分
          </span>
        ) : (
          <span className="text-xs text-ink-500">—</span>
        )}
      </td>
      <td className="border-b border-ink-800 px-4 py-3 font-mono-num text-xs text-ink-300">
        {record.bankSerial || <span className="text-ink-500">—</span>}
      </td>
      <td className="sticky right-0 border-b border-ink-800 bg-inherit px-4 py-3">
        <Link
          to={`/reconciliation/${record.id}`}
          className="inline-flex items-center gap-1 rounded-sm border border-ink-600 bg-ink-800 px-2.5 py-1 text-xs text-ink-200 opacity-0 transition group-hover:opacity-100 hover:border-amber-gold/60 hover:text-amber-gold"
        >
          详情
          <ChevronRight size={12} />
        </Link>
      </td>
    </tr>
  );
}
