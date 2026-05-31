import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { GameSession, Evidence } from '@/types';
import { exportToPDF, exportToCSV, downloadFile, generateSummary, verifyConsistency } from '@/utils/export';

interface ExportButtonProps {
  session: GameSession | null;
  evidences: Evidence[];
}

export default function ExportButton({ session, evidences }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    if (!session) return;
    setIsExporting(true);
    
    try {
      const summary = generateSummary(session);
      console.log('[导出PDF]', summary);
      
      verifyConsistency(session.decisions, session.decisions);
      
      const blob = exportToPDF(session, evidences);
      const filename = `港口集卡排队棋_${session.levelName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadFile(blob, filename);
    } catch (error) {
      console.error('[导出PDF失败]', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportCSV = () => {
    if (!session) return;
    setIsExporting(true);
    
    try {
      const summary = generateSummary(session);
      console.log('[导出CSV]', summary);
      
      verifyConsistency(session.decisions, session.decisions);
      
      const blob = exportToCSV(session, evidences);
      const filename = `港口集卡排队棋_${session.levelName}_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadFile(blob, filename);
    } catch (error) {
      console.error('[导出CSV失败]', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  if (!session) return null;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-port-blue text-white rounded-lg font-medium hover:bg-port-blue/90 transition-colors disabled:opacity-50"
      >
        <Download size={18} />
        <span>导出报告</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border z-50 overflow-hidden"
            >
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
              >
                <FileText size={18} className="text-red-500" />
                <div>
                  <p className="font-medium">导出 PDF</p>
                  <p className="text-xs text-gray-500">完整报告格式</p>
                </div>
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50 border-t"
              >
                <FileSpreadsheet size={18} className="text-green-500" />
                <div>
                  <p className="font-medium">导出 CSV</p>
                  <p className="text-xs text-gray-500">数据表格格式</p>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
