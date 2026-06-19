import { useEffect, useState } from 'react';
import { Play, Database, GitCompare, ShieldCheck, Download, AlertOctagon, RefreshCcw } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import { getQueryTypeStats } from '../lib/analysis';
import { slowQueries } from '../data/slowQueries';
import OverviewCards from '../components/OverviewCards';
import TimeDistributionChart from '../components/TimeDistributionChart';
import QueryTypeChart from '../components/QueryTypeChart';
import TopSlowQueriesTable from '../components/TopSlowQueriesTable';
import IndexFailureList from '../components/IndexFailureList';
import SchemaCompare from '../components/SchemaCompare';
import BackupVerifyPanel from '../components/BackupVerifyPanel';
import UnusableRecordsPanel from '../components/UnusableRecordsPanel';
import ExportPanel from '../components/ExportPanel';

type TabType = 'analysis' | 'schema' | 'backup' | 'unusable' | 'export';

export default function Home() {
  const {
    currentReport,
    selectedBackupVerify,
    schemaCompareResult,
    runAnalysis
  } = useDashboardStore();

  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  useEffect(() => {
    if (!currentReport) {
      runAnalysis();
    }
  }, []);

  const queryTypeStats = getQueryTypeStats(slowQueries);

  const tabs: Array<{ id: TabType; label: string; icon: typeof Database }> = [
    { id: 'analysis', label: '慢查询分析', icon: Database },
    { id: 'schema', label: 'Schema 对比', icon: GitCompare },
    { id: 'backup', label: '备份校验', icon: ShieldCheck },
    { id: 'unusable', label: '不可用记录', icon: AlertOctagon },
    { id: 'export', label: '导出报告', icon: Download }
  ];

  if (!currentReport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">主从切换记录台</h2>
          <p className="text-gray-500 mb-6">点击下方按钮开始慢查询分析</p>
          <button
            onClick={runAnalysis}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-5 h-5" />
            运行分析
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">主从切换记录台</h1>
                <p className="text-sm text-gray-500">仓储系统慢查询分析与索引失效检测</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={runAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <RefreshCcw className="w-4 h-4" />
                重新运行分析
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <OverviewCards report={currentReport} />

        <div className="mt-6 border-b border-gray-200">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'unusable' && currentReport.unusableRecords.length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                      {currentReport.unusableRecords.length}
                    </span>
                  )}
                  {tab.id === 'backup' && selectedBackupVerify && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      selectedBackupVerify.status === 'passed' ? 'bg-green-100 text-green-700' :
                      selectedBackupVerify.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedBackupVerify.status === 'passed' ? '通过' :
                       selectedBackupVerify.status === 'warning' ? '警告' : '未通过'}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TimeDistributionChart data={currentReport.timeDistribution} />
                <QueryTypeChart data={queryTypeStats} />
              </div>
              <TopSlowQueriesTable queries={currentReport.topSlowQueries} />
              <IndexFailureList queries={currentReport.indexFailureList} />
            </div>
          )}

          {activeTab === 'schema' && (
            <SchemaCompare result={schemaCompareResult} />
          )}

          {activeTab === 'backup' && selectedBackupVerify && (
            <BackupVerifyPanel result={selectedBackupVerify} />
          )}

          {activeTab === 'unusable' && (
            <UnusableRecordsPanel records={currentReport.unusableRecords} />
          )}

          {activeTab === 'export' && (
            <ExportPanel report={currentReport} />
          )}
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>主从切换记录台 · 仓储系统工程师专用 · 索引失效不再藏在汇总里</p>
          <p className="mt-1 text-xs text-gray-400">
            当前 Schema 版本: {currentReport.schemaVersion} · 运行批次: {currentReport.runId}
          </p>
        </footer>
      </div>
    </div>
  );
}
