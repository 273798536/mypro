import { useEffect } from 'react';
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { Scene } from '@/components/three/Scene';
import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import { generateReportHTML } from '@/utils/reportGenerator';

export default function Workspace() {
  const { loadMockData, dataPackage, validationResult, analysisResults, reviewMarks, currentSeason } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!dataPackage) {
      loadMockData();
    }
  }, [dataPackage, loadMockData]);

  const handleExportReport = () => {
    if (!dataPackage || !validationResult) return;

    const reportData = {
      dataPackage,
      validationResult,
      analysisResults,
      reviewMarks,
      currentSeason,
      generatedAt: Date.now(),
    };

    const html = generateReportHTML(reportData);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `日照分析报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewReport = () => {
    navigate('/report');
  };

  return (
    <WorkspaceLayout>
      <Scene />
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        <button
          onClick={handlePreviewReport}
          className="flex items-center gap-2 px-5 py-2.5 bg-mint-green/90 hover:bg-mint-green text-white rounded-lg 
                     shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
        >
          <FileText size={18} />
          <span className="font-medium">预览报告</span>
        </button>
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-5 py-2.5 bg-sun-orange/90 hover:bg-sun-orange text-white rounded-lg 
                     shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
        >
          <Download size={18} />
          <span className="font-medium">导出报告</span>
        </button>
      </div>
    </WorkspaceLayout>
  );
}
