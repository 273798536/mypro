import type { PaymentStatus, ConflictType, SupplierId } from '../types';

interface Props {
  suppliers: { id: SupplierId; name: string }[];
  filters: {
    supplierId: SupplierId | null;
    status: PaymentStatus | null;
    conflictType: ConflictType | null;
    dateRange: [string, string] | null;
  };
  onFilterChange: <K extends keyof Props['filters']>(
    key: K,
    value: Props['filters'][K],
  ) => void;
}

export function FilterBar({ suppliers, filters, onFilterChange }: Props) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>供应商</label>
        <select
          value={filters.supplierId ?? ''}
          onChange={(e) =>
            onFilterChange('supplierId', e.target.value || null)
          }
        >
          <option value="">全部</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label>付款状态</label>
        <select
          value={filters.status ?? ''}
          onChange={(e) => onFilterChange('status', (e.target.value || null) as PaymentStatus | null)}
        >
          <option value="">全部</option>
          <option value="not_due">未到期</option>
          <option value="due_soon">即将到期</option>
          <option value="overdue">已逾期</option>
          <option value="partially_paid">部分付款</option>
          <option value="paid">已结清</option>
          <option value="disputed">争议中</option>
          <option value="void">已作废</option>
        </select>
      </div>
      <div className="filter-group">
        <label>冲突类型</label>
        <select
          value={filters.conflictType ?? ''}
          onChange={(e) =>
            onFilterChange('conflictType', (e.target.value || null) as ConflictType | null)
          }
        >
          <option value="">全部</option>
          <option value="contract_switch">合同切换</option>
          <option value="partial_receipt">部分入库</option>
          <option value="retroactive_change">追溯改判</option>
          <option value="rule_mismatch">规则不符</option>
          <option value="payment_delay">付款逾期</option>
          <option value="version_overlap">版本重叠</option>
        </select>
      </div>
      <button
        className="btn btn-clear"
        onClick={() => {
          onFilterChange('supplierId', null);
          onFilterChange('status', null);
          onFilterChange('conflictType', null);
          onFilterChange('dateRange', null);
        }}
      >
        清除筛选
      </button>
    </div>
  );
}
