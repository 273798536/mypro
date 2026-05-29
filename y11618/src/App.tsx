import { useState } from 'react';
import { useAppStore } from './store/store';
import { Chart } from './components/Chart';
import { DetailTable } from './components/DetailTable';
import { ExportPanel } from './components/ExportPanel';
import { FilterBar } from './components/FilterBar';
import { SummaryBar } from './components/SummaryBar';
import { InvoiceDetail } from './components/InvoiceDetail';
import { OverrideDialog } from './components/OverrideDialog';
import { DataImportDialog } from './components/DataImportDialog';
import './App.css';

function App() {
  const {
    state,
    filteredAnalysis,
    selectedInvoice,
    summary,
    addOverride,
    loadData,
    resetToMockData,
    setFilter,
    selectInvoice,
  } = useAppStore();

  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const suppliers = state.aggregated.map((a) => ({
    id: a.supplierId,
    name: a.supplierName,
  }));

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-row">
          <div className="header-title">
            <h1>供应商账期改判分析</h1>
            <p className="subtitle">
              围绕同一批数据刷新图表、明细与导出，保留来源与改判痕迹
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowImportDialog(true)}
            >
              📁 导入数据
            </button>
            <button
              className="btn btn-sm"
              onClick={resetToMockData}
              title="重置为示例数据"
            >
              🔄 重置
            </button>
          </div>
        </div>
      </header>

      <SummaryBar {...summary} />

      <div className="main-layout">
        <section className="section chart-section">
          <div className="section-header">
            <h2>账期状态分布</h2>
            <ExportPanel analysis={filteredAnalysis} />
          </div>
          <Chart data={state.chartData} />
        </section>

        <section className="section filter-section">
          <FilterBar
            suppliers={suppliers}
            filters={state.filters}
            onFilterChange={setFilter}
          />
        </section>

        <section className="section table-section">
          <div className="section-header">
            <h2>发票明细</h2>
            <div className="section-actions">
              <span className="filter-count">
                已筛选: {filteredAnalysis.length}/{state.analysis.length}
              </span>
              {selectedInvoice && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowOverrideDialog(true)}
                >
                  改判
                </button>
              )}
            </div>
          </div>
          <DetailTable
            analysis={filteredAnalysis}
            selectedInvoiceId={state.selectedInvoiceId}
            onSelect={selectInvoice}
          />
        </section>

        {state.processingErrors.length > 0 && (
          <section className="section errors-section">
            <h3>处理错误</h3>
            <ul className="error-list">
              {state.processingErrors.map((e, i) => (
                <li key={i}>
                  <span className="error-src">
                    [{e.sourceRef.source}#{e.sourceRef.lineNumber}]
                  </span>{' '}
                  {e.message}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {selectedInvoice && !showOverrideDialog && (
        <div className="detail-overlay" onClick={() => selectInvoice(null)}>
          <InvoiceDetail
            analysis={selectedInvoice}
            ruleVersions={state.ruleVersions}
            onClose={() => selectInvoice(null)}
          />
        </div>
      )}

      {showOverrideDialog && selectedInvoice && (
        <OverrideDialog
          analysis={selectedInvoice}
          onSubmit={(data) => {
            addOverride({
              targetType: 'invoice',
              targetId: data.targetId,
              reason: data.reason,
              newDays: data.newDays,
              operator: data.operator,
              timestamp: new Date().toISOString(),
              scope: data.scope,
            });
            setShowOverrideDialog(false);
          }}
          onClose={() => setShowOverrideDialog(false)}
        />
      )}

      {showImportDialog && (
        <DataImportDialog
          onDataLoaded={(data) => {
            loadData(data);
            setShowImportDialog(false);
          }}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </div>
  );
}

export default App;
