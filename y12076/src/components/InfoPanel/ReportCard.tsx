import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { IssueReport } from '../../types';
import { useConfigStore } from '../../store/useConfigStore';
import { generatePlainTextReport } from '../../utils/reportGenerator';

interface ReportCardProps {
  issue: IssueReport;
}

export function ReportCard({ issue }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { clearIssue } = useConfigStore();

  const typeConfig = {
    'pole-reverse-failed': {
      icon: '🔄',
      bg: 'bg-orange-900/30',
      border: 'border-orange-500/50',
      titleColor: 'text-orange-400',
    },
    'sample-too-dense': {
      icon: '📊',
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-500/50',
      titleColor: 'text-yellow-400',
    },
    'field-explosion': {
      icon: '💥',
      bg: 'bg-red-900/30',
      border: 'border-red-500/50',
      titleColor: 'text-red-400',
    },
  };

  const config = typeConfig[issue.type];

  const handleCopy = async () => {
    const report = generatePlainTextReport(issue);
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`${config.bg} border ${config.border} rounded-lg overflow-hidden`}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          <span className="text-xl">{config.icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${config.titleColor}`}>
              {issue.title}
            </h4>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {issue.plainTextExplanation.split('\n')[2]?.replace('简单说：', '')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-slate-700/50 rounded transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <button
              onClick={() => clearIssue(issue.id)}
              className="p-1 hover:bg-slate-700/50 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              <div className="bg-slate-900/50 rounded p-3 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {generatePlainTextReport(issue)}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 flex items-center justify-center gap-2 transition-colors"
                >
                  {copied ? (
                    <><Check className="w-3 h-3 text-green-400" /> 已复制</>
                  ) : (
                    <><Copy className="w-3 h-3" /> 复制报告</>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-700">
                <div className="text-xs font-medium text-slate-400 mb-2">🔗 相关记录</div>
                <div className="space-y-1">
                  {issue.relatedRecords.map((record, i) => (
                    <div key={i} className="text-xs text-slate-500 font-mono bg-slate-800/50 rounded px-2 py-1">
                      {record}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
