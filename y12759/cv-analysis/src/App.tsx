import React, { useState } from 'react';
import { useCVStore } from './hooks/useCVStore';
import { FileImporter } from './components/FileImporter';
import { StatCard } from './components/StatCard';
import { BatchStatusChart } from './components/BatchStatusChart';
import { IssueTypePie } from './components/IssueTypePie';
import { IssueList } from './components/IssueList';
import { BatchTracker } from './components/BatchTracker';
import { ReagentLedger } from './components/ReagentLedger';
import { ReportExporter } from './components/ReportExporter';
import { ExperimentTable } from './components/ExperimentTable';

type TabKey = 'dashboard' | 'batches' | 'reagents' | 'experiments' | 'export';

function App() {
  const store = useCVStore();
  const [tab, setTab] = useState<TabKey>('dashboard');

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: '总览看板', icon: '📊' },
    { key: 'batches', label: '批次追踪', icon: '🔍' },
    { key: 'reagents', label: '试剂台账', icon: '🧪' },
    { key: 'experiments', label: '实验明细', icon: '📋' },
    { key: 'export', label: '导出报告', icon: '📤' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚡</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">电化学循环伏安分析系统</h1>
              <p className="text-xs text-slate-500">CV Analysis Dashboard · 空白对照缺失预警 · 批次追踪 · 月底转交</p>
            </div>
          </div>
          <FileImporter
            onImport={store.importFile}
            onLoadDemo={store.loadDemoData}
            sourceFileName={store.dataSource.sourceFileName}
          />
        </div>
        <div className="mx-auto max-w-[1600px] px-6 pb-0">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6 space-y-6">
        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard label="实验总数" value={store.stats.totalExperiments} tone="primary" icon="🧪" />
              <StatCard label="批次总数" value={store.stats.totalBatches} tone="default" icon="📦" />
              <StatCard label="严重问题" value={store.stats.criticalIssues} tone="danger" icon="🚨" subtitle="未解决" />
              <StatCard label="警告问题" value={store.stats.warningIssues} tone="warning" icon="⚠" subtitle="未解决" />
              <StatCard label="被拦截批次" value={store.stats.blockedBatches} tone="danger" icon="🛑" subtitle="不得进入复盘" />
              <StatCard label="异常试剂" value={store.stats.invalidReagents} tone="warning" icon="⚠" subtitle="月底转交重点" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-2">批次样品分布与问题数</h3>
                <BatchStatusChart dataSource={store.dataSource} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-2">未解决问题类型分布</h3>
                <IssueTypePie issues={store.dataSource.issues} />
              </div>
            </div>
            <IssueList
              issues={store.dataSource.issues}
              onResolve={store.resolveIssue}
              title="问题明细（展开可查看给学生的拦截说明）"
            />
          </>
        )}

        {tab === 'batches' && (
          <BatchTracker
            batches={store.dataSource.batches}
            experiments={store.dataSource.experiments}
            onAppendTemperature={store.appendTemperaturePoint}
          />
        )}

        {tab === 'reagents' && (
          <ReagentLedger reagents={store.dataSource.reagents} />
        )}

        {tab === 'experiments' && (
          <ExperimentTable experiments={store.dataSource.experiments} />
        )}

        {tab === 'export' && (
          <ReportExporter dataSource={store.dataSource} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="mx-auto max-w-[1600px] px-6 py-4 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <div>
            电化学循环伏安分析系统 · 所有图表、明细、导出结果均来自同一批数据，确保一致性。
          </div>
          <div>
            数据导入时间：{new Date(store.dataSource.importedAt).toLocaleString('zh-CN')}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
