import { useState } from 'react';
import { Download, FileText, Sheet, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { useDataStore } from '../../store/useDataStore';
import { formatCurrency } from '../../utils/colorUtils';
import { RISK_TYPE_LABELS } from '../../services/riskDetection';
import dayjs from 'dayjs';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { holdings, redemptions, cashPositions, riskAlerts, correctionTraces, currentDate } = useDataStore();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [options, setOptions] = useState({
    holdings: true,
    redemptions: true,
    cashPositions: true,
    riskAlerts: true,
    correctionTraces: true,
    includeSource: true,
  });

  const generatePDF = () => {
    setExporting(true);
    setTimeout(() => {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(0, 122, 255);
      doc.text('基金赎回流动性池报告', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`生成时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 105, 30, { align: 'center' });
      doc.text(`数据日期: ${currentDate}`, 105, 36, { align: 'center' });

      let yPos = 50;

      if (options.riskAlerts && riskAlerts.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(255, 59, 48);
        doc.text('风险警报', 20, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setTextColor(60);
        riskAlerts.slice(0, 5).forEach((alert, i) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${i + 1}. [${RISK_TYPE_LABELS[alert.riskType]}] ${alert.description}`, 25, yPos);
          yPos += 6;
          if (options.includeSource) {
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`   来源: ${alert.sourceRef}`, 25, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setTextColor(60);
          }
        });
        yPos += 10;
      }

      if (options.holdings) {
        doc.setFontSize(14);
        doc.setTextColor(0, 212, 170);
        doc.text('持仓明细', 20, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setTextColor(60);
        holdings.slice(0, 8).forEach((h, i) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${i + 1}. ${h.assetName}: ¥${formatCurrency(h.amount)}`, 25, yPos);
          yPos += 6;
          if (options.includeSource) {
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`   来源: ${h.sourceFile}#L${h.sourceLine}`, 25, yPos);
            yPos += 5;
          }
        });
        yPos += 10;
      }

      if (options.redemptions) {
        doc.setFontSize(14);
        doc.setTextColor(255, 149, 0);
        doc.text('赎回明细', 20, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setTextColor(60);
        redemptions.slice(0, 5).forEach((r, i) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${i + 1}. ${r.clientName}: ¥${formatCurrency(r.amount)}`, 25, yPos);
          yPos += 6;
          if (options.includeSource) {
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`   来源: ${r.sourceFile}#L${r.sourceLine}`, 25, yPos);
            yPos += 5;
          }
        });
        yPos += 10;
      }

      if (options.correctionTraces && correctionTraces.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(255, 184, 0);
        doc.text('修正痕迹', 20, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setTextColor(60);
        correctionTraces.slice(0, 5).forEach((t, i) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${i + 1}. ${t.fieldName}: ${t.originalValue} → ${t.correctedValue}`, 25, yPos);
          yPos += 6;
          doc.text(`   原因: ${t.reason}`, 25, yPos);
          yPos += 6;
        });
      }

      doc.save(`流动性池报告_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    }, 1000);
  };

  const generateExcel = () => {
    setExporting(true);
    setTimeout(() => {
      const wb = XLSX.utils.book_new();

      if (options.holdings) {
        const holdingData = holdings.map(h => ({
          ID: h.id,
          资产名称: h.assetName,
          基金代码: h.fundCode,
          金额: h.amount,
          流动性等级: h.liquidityLevel,
          到期天数: h.maturityDays,
          ...(options.includeSource ? {
            来源文件: h.sourceFile,
            来源行号: h.sourceLine,
          } : {}),
        }));
        const ws1 = XLSX.utils.json_to_sheet(holdingData);
        XLSX.utils.book_append_sheet(wb, ws1, '持仓明细');
      }

      if (options.redemptions) {
        const redemptionData = redemptions.map(r => ({
          ID: r.id,
          客户名称: r.clientName,
          客户ID: r.clientId,
          金额: r.amount,
          申请日期: r.requestDate,
          清算日期: r.valueDate,
          状态: r.status,
          ...(options.includeSource ? {
            来源文件: r.sourceFile,
            来源行号: r.sourceLine,
          } : {}),
        }));
        const ws2 = XLSX.utils.json_to_sheet(redemptionData);
        XLSX.utils.book_append_sheet(wb, ws2, '赎回明细');
      }

      if (options.cashPositions) {
        const cashData = cashPositions.map(c => ({
          ID: c.id,
          交易日期: c.tradeDate,
          可用现金: c.availableCash,
          预留现金: c.reservedCash,
          预留给: c.reservedBy,
          ...(options.includeSource ? {
            来源文件: c.sourceFile,
            来源行号: c.sourceLine,
          } : {}),
        }));
        const ws3 = XLSX.utils.json_to_sheet(cashData);
        XLSX.utils.book_append_sheet(wb, ws3, '现金头寸');
      }

      if (options.riskAlerts) {
        const riskData = riskAlerts.map(r => ({
          ID: r.id,
          风险类型: RISK_TYPE_LABELS[r.riskType],
          描述: r.description,
          严重度: `${(r.severity * 100).toFixed(0)}%`,
          检测时间: r.detectedAt,
          状态: r.isResolved ? '已处理' : '未处理',
          ...(options.includeSource ? {
            来源引用: r.sourceRef,
          } : {}),
        }));
        const ws4 = XLSX.utils.json_to_sheet(riskData);
        XLSX.utils.book_append_sheet(wb, ws4, '风险警报');
      }

      if (options.correctionTraces && correctionTraces.length > 0) {
        const traceData = correctionTraces.map(t => ({
          ID: t.id,
          记录类型: t.recordType,
          记录ID: t.recordId,
          字段名: t.fieldName,
          原值: t.originalValue,
          修正值: t.correctedValue,
          操作人: t.operator,
          修正原因: t.reason,
          修正时间: t.correctedAt,
        }));
        const ws5 = XLSX.utils.json_to_sheet(traceData);
        XLSX.utils.book_append_sheet(wb, ws5, '修正痕迹');
      }

      XLSX.writeFile(wb, `流动性池数据_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    }, 1000);
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 rounded-2xl p-6 w-[450px] border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Download size={24} className="text-cyan-400" />
                导出报告
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-400 mb-4">选择要导出的内容:</p>
              
              {[
                { key: 'holdings' as const, label: '持仓明细', icon: <FileText size={16} /> },
                { key: 'redemptions' as const, label: '赎回明细', icon: <FileText size={16} /> },
                { key: 'cashPositions' as const, label: '现金头寸', icon: <FileText size={16} /> },
                { key: 'riskAlerts' as const, label: '风险警报', icon: <FileText size={16} /> },
                { key: 'correctionTraces' as const, label: '修正痕迹', icon: <FileText size={16} /> },
                { key: 'includeSource' as const, label: '包含来源引用 (行号)', icon: <FileText size={16} /> },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => toggleOption(key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    options[key]
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {icon}
                  <span className="flex-1 text-left">{label}</span>
                  {options[key] && <Check size={18} />}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={generatePDF}
                disabled={exporting}
                className="flex items-center justify-center gap-2 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-all"
              >
                {exported ? <Check size={18} /> : <FileText size={18} />}
                {exporting ? '导出中...' : '导出 PDF'}
              </button>
              <button
                onClick={generateExcel}
                disabled={exporting}
                className="flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-xl transition-all"
              >
                {exported ? <Check size={18} /> : <Sheet size={18} />}
                {exporting ? '导出中...' : '导出 Excel'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
