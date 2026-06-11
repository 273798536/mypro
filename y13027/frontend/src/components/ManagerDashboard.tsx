import { LABELS } from '../api';
import type { ManagerSummary } from '../types';

interface Props {
  summary: ManagerSummary | null;
  onSelect: (id: string) => void;
}

export default function ManagerDashboard({ summary, onSelect }: Props) {
  if (!summary) {
    return <div className="empty-state">加载中...</div>;
  }

  return (
    <>
      <div className="summary-cards">
        <div className="summary-card">
          <div className="label">对账总笔数</div>
          <div className="value">{summary.total}</div>
        </div>
        <div className="summary-card danger">
          <div className="label">双口径冲突待裁定</div>
          <div className="value">{summary.inConflictCount}</div>
        </div>
        <div className="summary-card warn">
          <div className="label">待补材料</div>
          <div className="value">{summary.needSupplementCount}</div>
        </div>
        <div className="summary-card purple">
          <div className="label">回款拆分记录</div>
          <div className="value">{summary.splitRepaymentCount}</div>
        </div>
        <div className="summary-card success">
          <div className="label">可放行</div>
          <div className="value">{summary.canReleaseCount}</div>
        </div>
      </div>

      <div className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{ color: '#cf1322' }}>
              🔴 需阿敏处理 — 待补材料/待裁定清单
            </div>
          </div>
          {summary.needSupplementList.length === 0 ? (
            <div className="empty-state">全部处理完毕 ✓</div>
          ) : (
            summary.needSupplementList.map((item) => (
              <div
                key={item.id}
                className="list-item"
                onClick={() => onSelect(item.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="main">
                  <div className="title">
                    <span className="link-text">{item.businessNo}</span>
                    {' · '}
                    {item.clientName}
                    {' · '}
                    {item.productName}
                  </div>
                  <div className="meta">
                    金额：<b style={{ fontFamily: 'monospace', color: '#cf1322' }}>¥{item.amount.toLocaleString()}</b>
                  </div>
                  <span className="reason">{item.reason}</span>
                  {item.remark && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#595959' }}>
                      备注：{item.remark}
                    </div>
                  )}
                </div>
                <button className="btn btn-sm btn-warn" onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}>
                  去补材料
                </button>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title" style={{ color: '#389e0d' }}>
              🟢 可放行 — 资金主管复核清单
            </div>
          </div>
          {summary.canReleaseList.length === 0 ? (
            <div className="empty-state">暂无可放行记录</div>
          ) : (
            summary.canReleaseList.map((item) => (
              <div
                key={item.id}
                className="list-item"
                onClick={() => onSelect(item.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="main">
                  <div className="title">
                    <span className="link-text">{item.businessNo}</span>
                    {' · '}
                    {item.clientName}
                    {' · '}
                    {item.productName}
                  </div>
                  <div className="meta">
                    金额：<b style={{ fontFamily: 'monospace', color: '#389e0d' }}>¥{item.amount.toLocaleString()}</b>
                    {item.status === 'split_passed' || item.isSplitRepayment ? (
                      <span
                        className="status-tag"
                        style={{
                          marginLeft: 8,
                          background: '#f9f0ff',
                          color: '#722ed1',
                          borderColor: '#d3adf7',
                        }}
                      >
                        回款拆分放行
                      </span>
                    ) : item.conclusion && (
                      <span
                        className="status-tag"
                        style={{
                          marginLeft: 8,
                          background: LABELS.conclusions[item.conclusion] === '放行' ? '#f6ffed' : '#e6f7ff',
                          color: LABELS.conclusions[item.conclusion] === '放行' ? '#389e0d' : '#1890ff',
                          borderColor: LABELS.conclusions[item.conclusion] === '放行' ? '#b7eb8f' : '#91d5ff',
                        }}
                      >
                        {LABELS.conclusions[item.conclusion]}
                      </span>
                    )}
                  </div>
                  {item.remark && (
                    <div style={{ fontSize: 11, color: '#595959', marginTop: 4 }}>
                      💬 {item.remark}
                    </div>
                  )}
                </div>
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}>
                  查看详情
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <div className="panel-title">💡 阿敏复核指引（非技术说明）</div>
        </div>
        <div style={{ padding: '14px 20px', fontSize: 12, color: '#595959', lineHeight: 1.8 }}>
          <p><b style={{ color: '#cf1322' }}>🔴 待补材料清单：</b>这些记录还不能放行，需要业务端补齐材料后再复核。</p>
          <p style={{ marginLeft: 20 }}>• 双口径冲突：同一笔钱被两个口径同时认走，点击「去补材料」后在详情里裁定最终归属口径并说明原因。</p>
          <p style={{ marginLeft: 20 }}>• 材料缺失：如风险测评过期、资产证明不足等，需要求业务端重新提交。</p>
          <p style={{ marginTop: 8 }}><b style={{ color: '#389e0d' }}>🟢 可放行清单：</b>这些记录复核通过，点击「查看详情」确认历史备注和当前状态一致后即可放行。</p>
          <p style={{ marginTop: 8 }}><b style={{ color: '#722ed1' }}>🟣 回款拆分特别注意：</b>此类记录即使显示为「通过」，也会自动带上【回款拆分-特殊标注】前缀，不会被当成正常单笔通过。</p>
          <p style={{ marginTop: 8 }}><b style={{ color: '#d48806' }}>📌 边界样本：</b>带有「边界样本」标签的记录，其最终结论会作为后续同类临界值案例的参考依据。</p>
          <p style={{ marginTop: 8 }}><b style={{ color: '#1890ff' }}>📤 导出一致性：</b>工作台的筛选条件会完整同步到 CSV 导出，屏幕上看到的数字和导出文件完全一致。</p>
        </div>
      </div>
    </>
  );
}
