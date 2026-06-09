import { Box, Layers, FileText, Eye } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { PointCloud3D } from '../components/visualization/PointCloud3D';
import { SliceList } from '../components/visualization/SliceList';
import { MeasurementDetail } from '../components/visualization/MeasurementDetail';
import { AuditPanel } from '../components/audit/AuditPanel';
import { SyncMonitorPanel } from '../components/report/SyncMonitorPanel';
import { ConclusionComparisonPanel } from '../components/audit/ConclusionComparisonPanel';
import { ParameterLinkPanel } from '../components/audit/ParameterLinkPanel';
import { TimelineController } from '../components/core/TimelineController';
import { ControlPanel } from '../components/core/ControlPanel';
import { SettlementPanel } from '../components/report/SettlementPanel';

export function Home() {
  const { activeTab, measurements, slices, conclusions, syncIssues } = useAppStore();

  const stats = [
    { icon: Box, label: '测量点', value: measurements.length, color: 'text-ice-blue' },
    { icon: Layers, label: '点云切片', value: slices.length, color: 'text-info' },
    { icon: FileText, label: '结论报告', value: conclusions.length, color: 'text-modified' },
    { icon: Eye, label: '待复核', value: measurements.filter(m => m.isOutlier && (!m.outlierReviewStatus || m.outlierReviewStatus === 'pending')).length, color: 'text-warning' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3 glass-card-hover">
              <div className={`w-10 h-10 rounded-lg bg-bg-tertiary/60 flex items-center justify-center ${stat.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-text-muted">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <ControlPanel />
          <ParameterLinkPanel />
          {activeTab === 'slices' && <SliceList />}
        </div>

        <div className="lg:col-span-6 space-y-4">
          {activeTab === '3d' && (
            <div className="glass-card rounded-xl overflow-hidden h-[500px]">
              <PointCloud3D />
            </div>
          )}
          {activeTab === 'slices' && (
            <div className="glass-card rounded-xl overflow-hidden h-[500px]">
              <PointCloud3D />
            </div>
          )}
          {activeTab === 'audit' && (
            <div className="glass-card rounded-xl overflow-hidden h-[500px]">
              <AuditPanel />
            </div>
          )}
          {activeTab === 'sync' && (
            <div className="glass-card rounded-xl overflow-hidden h-[500px]">
              <SyncMonitorPanel />
            </div>
          )}
          {activeTab === 'conclusion' && (
            <div className="space-y-4">
              <ConclusionComparisonPanel />
              <div className="glass-card rounded-xl overflow-hidden h-[280px]">
                <AuditPanel />
              </div>
            </div>
          )}
          <TimelineController />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <MeasurementDetail />
          {activeTab !== 'conclusion' && (
            <ConclusionComparisonPanel />
          )}
          {syncIssues.length > 0 && activeTab !== 'sync' && (
            <div className="glass-card rounded-xl p-3">
              <div className="text-xs text-warning font-medium flex items-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                时间轴不同步预警
              </div>
              <p className="text-xs text-text-muted">
                检测到 {syncIssues.length} 个材料同步问题，建议查看同步检测面板了解详情。
              </p>
            </div>
          )}
        </div>
      </div>

      <SettlementPanel />
    </div>
  );
}
