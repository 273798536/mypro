import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { schemeA, schemeB, powerRecords, windConditions, maintenancePlans } from '../../data/mockData';
import { generateSummary, exportPowerCSV, exportWindCSV, exportJSON } from '../../utils/dataExport';
import { FileDown, FileText, ClipboardCopy, Check } from 'lucide-react';

export default function SummaryPanel() {
  const activeSchemeId = useStore((s) => s.activeSchemeId);
  const windDirection = useStore((s) => s.windDirection);
  const windSpeed = useStore((s) => s.windSpeed);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  const scheme = activeSchemeId === 'scheme-b' ? schemeB : schemeA;

  const summary = useMemo(
    () => generateSummary(scheme, windDirection, windSpeed, powerRecords, maintenancePlans),
    [scheme, windDirection, windSpeed]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-4 right-72 z-20 flex items-center gap-2">
      <button
        onClick={() => setShowSummary(!showSummary)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3A5F]/50 text-[#8BA4BC] hover:text-[#00D4AA] hover:bg-[#1E3A5F]/80 text-xs transition-all border border-[#1E3A5F]/40"
      >
        <FileText size={14} />
        摘要
      </button>

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D4AA]/20 text-[#00D4AA] hover:bg-[#00D4AA]/30 text-xs transition-all border border-[#00D4AA]/30"
        >
          <FileDown size={14} />
          下载
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-[#0A1628]/95 backdrop-blur-xl border border-[#1E3A5F]/60 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => { exportPowerCSV(powerRecords); setShowDropdown(false); }}
              className="w-full px-3 py-2 text-xs text-left text-[#E8ECF1] hover:bg-[#1E3A5F]/50 transition-colors"
            >
              发电记录 CSV
            </button>
            <button
              onClick={() => { exportWindCSV(windConditions); setShowDropdown(false); }}
              className="w-full px-3 py-2 text-xs text-left text-[#E8ECF1] hover:bg-[#1E3A5F]/50 transition-colors border-t border-[#1E3A5F]/30"
            >
              风况数据 CSV
            </button>
            <button
              onClick={() => { exportJSON({ scheme, windConditions, powerRecords, maintenancePlans, summary }, 'wind-farm-data.json'); setShowDropdown(false); }}
              className="w-full px-3 py-2 text-xs text-left text-[#E8ECF1] hover:bg-[#1E3A5F]/50 transition-colors border-t border-[#1E3A5F]/30"
            >
              全部数据 JSON
            </button>
          </div>
        )}
      </div>

      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSummary(false)}>
          <div
            className="w-[560px] max-h-[80vh] bg-[#0A1628] border border-[#1E3A5F]/60 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]/40">
              <h2 className="text-[#00D4AA] text-sm font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                数据摘要
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#1E3A5F]/50 text-[#8BA4BC] hover:text-[#00D4AA] transition-colors"
                >
                  {copied ? <Check size={12} /> : <ClipboardCopy size={12} />}
                  {copied ? '已复制' : '复制'}
                </button>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-[#4A6B8A] hover:text-[#E8ECF1] text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs text-[#8BA4BC] overflow-y-auto max-h-[60vh] whitespace-pre-wrap" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {summary}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
