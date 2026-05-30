import GalleryScene from '@/components/GalleryScene';
import IssuePanel from '@/components/IssuePanel';
import WorkOrderTable from '@/components/WorkOrderTable';
import ReportDownload from '@/components/ReportDownload';
import { useGalleryStore } from '@/store/useGalleryStore';
import { Shield, Activity } from 'lucide-react';

export default function GalleryPage() {
  const duplicateIssues = useGalleryStore((s) => s.duplicateIssues);
  const crossZoneIssues = useGalleryStore((s) => s.crossZoneIssues);
  const overdueIssues = useGalleryStore((s) => s.overdueIssues);
  const totalIssues = duplicateIssues.length + crossZoneIssues.length + overdueIssues.length;

  return (
    <div className="flex h-screen w-screen bg-[#0a1420] overflow-hidden">
      <IssuePanel />

      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-[#0a1420]/90 to-transparent pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3">
            <Shield size={20} className="text-[#5a8abf]" />
            <div>
              <h1 className="text-white font-bold text-sm tracking-wide">核电站管廊巡检智能分析平台</h1>
              <p className="text-zinc-500 text-[10px]">Nuclear Power Gallery Inspection Analysis</p>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px]">
              <Activity size={12} className={totalIssues > 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'} />
              <span className="text-zinc-400">
                问题 <span className={`font-bold ${totalIssues > 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>{totalIssues}</span>
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-[#FF6B35]">重号 {duplicateIssues.length}组</span>
              <span className="text-zinc-600">|</span>
              <span className="text-[#FFD700]">穿区 {crossZoneIssues.length}处</span>
              <span className="text-zinc-600">|</span>
              <span className="text-[#E74C3C]">过期 {overdueIssues.length}单</span>
            </div>
            <ReportDownload />
          </div>
        </div>

        <div className="flex-1">
          <GalleryScene />
        </div>

        <WorkOrderTable />
      </div>
    </div>
  );
}
