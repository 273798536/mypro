import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Download, Check } from 'lucide-react';
import { useLensStore } from '../store/useLensStore';
import { exportScreenshot } from '../utils/export';

export const ExportButton: React.FC = () => {
  const { lensState } = useLensStore();
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportScreenshot('scene-container', lensState);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      className="fixed top-4 right-4 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
          showSuccess
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : isExporting
            ? 'bg-slate-700/50 text-slate-400 cursor-wait'
            : 'glass-panel hover:bg-slate-700/50 text-white border border-slate-600/50'
        }`}
      >
        {showSuccess ? (
          <>
            <Check className="w-5 h-5" />
            <span>已保存</span>
          </>
        ) : isExporting ? (
          <>
            <Download className="w-5 h-5 animate-bounce" />
            <span>导出中...</span>
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            <span>导出截图</span>
          </>
        )}
      </button>
    </motion.div>
  );
};
