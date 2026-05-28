import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { generateReportHTML } from '@/utils/reportGenerator';
import { ArrowLeft, Download } from 'lucide-react';

export default function Report() {
  const { dataPackage, validationResult, analysisResults, reviewMarks, currentSeason, loadMockData } = useAppStore();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!dataPackage) {
      loadMockData();
    }
  }, [dataPackage, loadMockData]);

  useEffect(() => {
    if (dataPackage && validationResult && iframeRef.current) {
      const reportData = {
        dataPackage,
        validationResult,
        analysisResults,
        reviewMarks,
        currentSeason,
        generatedAt: Date.now(),
      };
      const html = generateReportHTML(reportData);
      iframeRef.current.srcdoc = html;
    }
  }, [dataPackage, validationResult, analysisResults, reviewMarks, currentSeason]);

  const handleDownload = () => {
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

  if (!dataPackage || !validationResult) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-deep-ocean text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sun-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">正在加载报告数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-deep-ocean">
      <div className="flex items-center justify-between px-6 py-4 bg-deep-ocean-light border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            <span>返回工作台</span>
          </button>
          <h1 className="text-xl font-bold text-white font-['Archivo_Black']">
            日照分析报告
          </h1>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2.5 bg-sun-orange hover:bg-sun-orange/90 text-white rounded-lg 
                     shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          <Download size={18} />
          <span className="font-medium">下载报告</span>
        </button>
      </div>

      <div className="flex-1 p-4">
        <iframe
          ref={iframeRef}
          className="w-full h-full rounded-lg bg-white shadow-2xl"
          title="日照分析报告"
        />
      </div>
    </div>
  );
}
