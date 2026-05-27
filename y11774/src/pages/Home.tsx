import { useState, useRef } from 'react';
import NebulaCanvas from '@/components/NebulaCanvas';
import FilterPanel from '@/components/FilterPanel';
import InfoPanel from '@/components/InfoPanel';
import Toolbar from '@/components/Toolbar';
import StatusBar from '@/components/StatusBar';
import ReportModal from '@/components/ReportModal';
import { useAssetStore } from '@/store/useAssetStore';
import { captureScreenshot } from '@/utils/export';

export default function Home() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { screenshotUrl, setScreenshotUrl } = useAssetStore();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleScreenshot = () => {
    if (canvasContainerRef.current) {
      const canvas = canvasContainerRef.current.querySelector('canvas');
      if (canvas) {
        const dataUrl = captureScreenshot(canvas);
        setScreenshotUrl(dataUrl);
        setIsReportModalOpen(true);
      }
    }
  };

  const handleExportReport = () => {
    setIsReportModalOpen(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a1628] flex">
      <FilterPanel />

      <div className="flex-1 relative">
        <Toolbar onScreenshot={handleScreenshot} onExportReport={handleExportReport} />

        <div ref={canvasContainerRef} className="absolute inset-0">
          <NebulaCanvas />
        </div>

        <StatusBar />
      </div>

      <InfoPanel />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        screenshotUrl={screenshotUrl}
      />
    </div>
  );
}
