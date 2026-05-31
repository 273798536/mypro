import { useStore } from './store/useStore';
import { Layout } from './components/Layout';
import { ImportPage } from './pages/ImportPage';
import { DashboardPage } from './pages/DashboardPage';
import { DetailPage } from './pages/DetailPage';
import { ReportPage } from './pages/ReportPage';

function App() {
  const {
    state,
    loadSampleData,
    recalculateMargins,
    selectResult,
    setActiveTab,
  } = useStore();

  const hasData = state.marginResults.length > 0;

  const navSummary = state.summary
    ? {
        mismatchCount: state.summary.mismatchCount,
        criticalCount: state.summary.riskBreakdown.critical + state.summary.riskBreakdown.high,
      }
    : null;

  return (
    <Layout
      activeTab={state.activeTab}
      onTabChange={setActiveTab}
      hasData={hasData}
      summary={navSummary}
    >
      {state.activeTab === 'import' && (
        <ImportPage
          samples={state.importSamples}
          selectedSample={state.selectedSample}
          onLoadSample={loadSampleData}
          isLoading={state.isCalculating}
        />
      )}

      {state.activeTab === 'dashboard' && (
        <DashboardPage
          results={state.marginResults}
          summary={state.summary}
          positions={state.positions}
          onSelectResult={selectResult}
          onRecalculate={recalculateMargins}
          isCalculating={state.isCalculating}
          selectedSampleName={state.selectedSample?.name}
        />
      )}

      {state.activeTab === 'detail' && (
        <DetailPage
          result={state.selectedResult}
          positions={state.positions}
          trades={state.trades}
          fundFlows={state.fundFlows}
          nightMarketData={state.nightMarketData}
          marginRateChanges={state.marginRateChanges}
          onBack={() => setActiveTab('dashboard')}
          allResults={state.marginResults}
          onSelectResult={selectResult}
        />
      )}

      {state.activeTab === 'report' && (
        <ReportPage
          results={state.marginResults}
          summary={state.summary}
          tradeDate={state.tradeDate}
        />
      )}
    </Layout>
  );
}

export default App;
