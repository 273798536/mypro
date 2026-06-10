import React from 'react';
import { Header } from '../components/Header';
import { StatsCards } from '../components/StatsCards';
import { SelectivityChart } from '../components/SelectivityChart';
import { StatusPieChart } from '../components/StatusPieChart';
import { BatchTable } from '../components/BatchTable';
import { SuggestionPanel } from '../components/SuggestionPanel';
import { TrackingTimeline } from '../components/TrackingTimeline';
import { Sparkles, Workflow } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-paper-100">
      <Header />
      <main id="report-root" className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        <section className="animate-fade-in-up">
          <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-serif text-2xl font-bold text-brand-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                批次报告概览
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                图表、明细、导出均来自同一数据源，确保质检主管审阅时信息一致
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-full">
              <Workflow className="w-3.5 h-3.5" />
              补录反应条件后，复测建议与批次追踪将自动更新
            </div>
          </div>
          <StatsCards />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="lg:col-span-2">
            <SelectivityChart />
          </div>
          <div>
            <StatusPieChart />
          </div>
        </section>

        <section className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <BatchTable />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div className="lg:col-span-3">
            <SuggestionPanel />
          </div>
          <div className="lg:col-span-2">
            <TrackingTimeline />
          </div>
        </section>

        <footer className="pt-4 pb-8 border-t border-paper-200 text-center text-xs text-gray-400 font-mono">
          催化反应选择性报告系统 · 统一数据源驱动 · 人工备注原样保留 · 空白对照缺失自动标红拦截
        </footer>
      </main>
    </div>
  );
}
