import { useState, useEffect } from 'react';
import { api, LABELS } from './api';
import type { AppropriatenessCaliber, ReconciliationStatus, ManagerSummary } from './types';
import ReconciliationWorkbench from './components/ReconciliationWorkbench';
import DetailModal from './components/DetailModal';
import ManagerDashboard from './components/ManagerDashboard';
import ExceptionQueueView from './components/ExceptionQueueView';

type TabKey = 'workbench' | 'exception' | 'dashboard';

export default function App() {
  const [tab, setTab] = useState<TabKey>('workbench');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ManagerSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.getManagerSummary().then(setSummary).catch(() => {});
  }, [refreshKey, tab]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="app">
      <div className="app-header">
        <h1>券商适当性口径对账系统</h1>
        <div className="user-info">
          <span className="badge">资金主管</span>
          <span>阿敏</span>
        </div>
      </div>

      <div className="tabs">
        <div
          className={`tab ${tab === 'workbench' ? 'active' : ''}`}
          onClick={() => setTab('workbench')}
        >
          对账工作台
          {summary && <span className="count">{summary.total}</span>}
        </div>
        <div
          className={`tab ${tab === 'exception' ? 'active' : ''}`}
          onClick={() => setTab('exception')}
        >
          异常队列
          {summary && (summary.inConflictCount + summary.needSupplementCount) > 0 && (
            <span className="count">{summary.inConflictCount + summary.needSupplementCount}</span>
          )}
        </div>
        <div
          className={`tab ${tab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setTab('dashboard')}
        >
          收尾复核清单
          {summary && summary.needSupplementCount > 0 && (
            <span className="count">{summary.needSupplementCount}</span>
          )}
        </div>
      </div>

      <div className="content">
        {tab === 'workbench' && (
          <ReconciliationWorkbench
            refreshKey={refreshKey}
            onSelect={setSelectedId}
            onExport={async (filters) => {
              const data = await api.exportData(filters);
              const header = [
                '业务编号', '业务日期', '客户名称', '产品名称', '金额(元)',
                '主口径', '次口径', '状态', '结论', '双口径冲突', '回款拆分', '备注',
              ].join(',');
              const rows = data.data.map((r) => [
                r.businessNo, r.businessDate, r.clientName, r.productName, r.amount,
                r.primaryCaliber, r.secondaryCaliber, r.status, r.conclusion,
                r.isConflict ? '是' : '否', r.isSplit ? '是' : '否',
                `"${(r.remark || '').replace(/"/g, '""')}"`,
              ].join(','));
              const csv = '\uFEFF' + [header, ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `券商适当性口径对账_${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        )}
        {tab === 'exception' && (
          <ExceptionQueueView refreshKey={refreshKey} onSelect={setSelectedId} />
        )}
        {tab === 'dashboard' && (
          <ManagerDashboard summary={summary} onSelect={setSelectedId} />
        )}
      </div>

      {selectedId && (
        <DetailModal
          recordId={selectedId}
          onClose={() => setSelectedId(null)}
          onReviewed={refresh}
        />
      )}
    </div>
  );
}
