interface Props {
  totalInvoices: number;
  totalAmount: number;
  conflictCount: number;
  overriddenCount: number;
  overdueCount: number;
  processingErrors: number;
}

export function SummaryBar({
  totalInvoices,
  totalAmount,
  conflictCount,
  overriddenCount,
  overdueCount,
  processingErrors,
}: Props) {
  const stats = [
    { label: '发票总数', value: totalInvoices, color: '#3b82f6' },
    { label: '总金额', value: `¥${(totalAmount / 1000).toFixed(0)}k`, color: '#6b7280' },
    { label: '冲突项', value: conflictCount, color: '#ef4444' },
    { label: '改判项', value: overriddenCount, color: '#f59e0b' },
    { label: '逾期项', value: overdueCount, color: '#dc2626' },
    { label: '处理错误', value: processingErrors, color: '#a855f7' },
  ];

  return (
    <div className="summary-bar">
      {stats.map((s) => (
        <div key={s.label} className="summary-item">
          <div className="summary-value" style={{ color: s.color }}>
            {s.value}
          </div>
          <div className="summary-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
