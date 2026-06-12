import TopNav from '@/components/layout/TopNav';
import ReportCanvas from '@/components/report/ReportCanvas';
import ExportButton, { PrintButton } from '@/components/report/ExportButton';
import { useEffect } from 'react';
import { useCalcStore } from '@/store/useCalcStore';

export default function ReportPreview() {
  const results = useCalcStore(s => s.results);
  const loadMock = useCalcStore(s => s.loadMockData);
  useEffect(() => { if (results.length === 0) setTimeout(loadMock, 200); }, []);
  return (
    <div className="min-h-screen flex flex-col bg-ocean-50">
      <TopNav />
      <div className="px-6 py-3 border-b border-ocean-200 bg-white flex items-center justify-between shadow-sm print:hidden">
        <div>
          <h1 className="font-serif text-xl text-ocean-900 font-semibold">海事处报告预览</h1>
          <p className="text-xs text-ocean-500 mt-0.5">A4 纵向排版 · 状态色：绿=直接用 / 黄=复核 / 红=退回补采</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <ExportButton />
        </div>
      </div>
      <div className="flex-1">
        <ReportCanvas />
      </div>
    </div>
  );
}
