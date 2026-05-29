import React, { useState } from 'react';
import type { InvoiceAnalysis, ConflictType } from '../types';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../engine/paymentStatus';
import { getMatchTypeLabel, getMatchTypeColor } from '../engine/versioning';

interface Props {
  analysis: InvoiceAnalysis[];
  selectedInvoiceId: string | null;
  onSelect: (id: string | null) => void;
}

const conflictLabels: Record<ConflictType, string> = {
  contract_switch: '合同切换',
  partial_receipt: '部分入库',
  retroactive_change: '追溯改判',
  rule_mismatch: '规则不符',
  payment_delay: '付款逾期',
  version_overlap: '版本重叠',
  no_rule_match: '无匹配规则',
  historical_rule: '历史规则',
  ambiguous_match: '模糊匹配',
};

const receiptStatusLabels = {
  matched: '已匹配',
  partial: '部分入库',
  unmatched: '未匹配',
};

export function DetailTable({ analysis, selectedInvoiceId, onSelect }: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="detail-table-wrapper">
      <table className="detail-table">
        <thead>
          <tr>
            <th style={{ width: 32 }} />
            <th>发票编号</th>
            <th>供应商</th>
            <th>开票日</th>
            <th className="num">金额</th>
            <th>规则版本</th>
            <th>匹配类型</th>
            <th>账期</th>
            <th>应付款日</th>
            <th>入库</th>
            <th>付款状态</th>
            <th>冲突</th>
            <th>改判</th>
          </tr>
        </thead>
        <tbody>
          {analysis.map((a) => {
            const isSelected = a.invoiceId === selectedInvoiceId;
            const isExpanded = expandedRows.has(a.invoiceId);
            const matchTypeColor = getMatchTypeColor(a.ruleMatchType);
            return (
              <React.Fragment key={a.invoiceId}>
                <tr
                  className={isSelected ? 'selected' : ''}
                  onClick={() => onSelect(a.invoiceId)}
                >
                  <td
                    className="toggle-cell"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(a.invoiceId);
                    }}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </td>
                  <td className="mono">{a.invoiceCode}</td>
                  <td>{a.supplierName}</td>
                  <td>{a.invoiceDate}</td>
                  <td className="num">¥{a.amount.toLocaleString()}</td>
                  <td className="mono">
                    {a.appliedRuleVersionLabel}
                    {a.isHistoricalRule && (
                      <span className="hist-badge" title="历史版本">H</span>
                    )}
                  </td>
                  <td>
                    <span
                      className="rule-match-badge"
                      style={{ background: matchTypeColor, color: '#fff' }}
                    >
                      {getMatchTypeLabel(a.ruleMatchType)}
                    </span>
                  </td>
                  <td>
                    {a.effectiveDays !== a.baseDays && (
                      <span className="strike">{a.baseDays}</span>
                    )}
                    {a.effectiveDays}天
                  </td>
                  <td>{a.dueDate}</td>
                  <td>
                    <span className={`tag tag-${a.receiptStatus}`}>
                      {receiptStatusLabels[a.receiptStatus]}
                    </span>
                  </td>
                  <td>
                    <span
                      className="status-dot"
                      style={{ background: PAYMENT_STATUS_COLORS[a.paymentStatus] }}
                    />
                    {PAYMENT_STATUS_LABELS[a.paymentStatus]}
                  </td>
                  <td>
                    {a.conflictType ? (
                      <span className="tag tag-conflict" title={a.conflictDetail ?? ''}>
                        {conflictLabels[a.conflictType]}
                      </span>
                    ) : (
                      <span className="tag tag-ok">无</span>
                    )}
                  </td>
                  <td>
                    {a.overrideApplied ? (
                      <span className="tag tag-override" title={a.overrideReason ?? ''}>
                        已改判
                      </span>
                    ) : (
                      <span className="tag tag-ok">—</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="expanded-row">
                    <td colSpan={14}>
                      <div className="expanded-content">
                        {a.warnings.length > 0 && (
                          <div className="warnings-list">
                            <strong>警告与提示:</strong>
                            <ul>
                              {a.warnings.map((w, i) => (
                                <li key={i} className={`warning-${w.level}`}>
                                  [{w.level.toUpperCase()}] {w.message}
                                  <span className="src-ref">
                                    {' '}
                                    (来源: {w.sourceRef.source}#{w.sourceRef.lineNumber})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {a.trace.length > 0 && (
                          <div className="trace-list">
                            <strong>处理痕迹:</strong>
                            <ul>
                              {a.trace.map((t, i) => (
                                <li key={i}>
                                  {t.action}: {t.detail} — {t.operator} @{' '}
                                  {t.timestamp.substring(0, 19).replace('T', ' ')}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="source-info">
                          <strong>来源:</strong> {a.sourceRef.source}#
                          {a.sourceRef.lineNumber} ({a.sourceRef.label})
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
