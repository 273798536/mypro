import { useViewStore } from '@/stores/useViewStore';
import { useAnomalyStore } from '@/stores/useAnomalyStore';
import { useHallStore } from '@/stores/useHallStore';
import {
  Grid3X3,
  Box,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Maximize2,
} from 'lucide-react';
import type { FrequencyBand } from '@/types';

const bands: FrequencyBand[] = ['63', '125', '250', '500', '1000', '2000', '4000', '8000'];

export default function Toolbar() {
  const viewMode = useViewStore((s) => s.viewMode);
  const setViewMode = useViewStore((s) => s.setViewMode);
  const activeBand = useViewStore((s) => s.activeBand);
  const setActiveBand = useViewStore((s) => s.setActiveBand);
  const anomalyPanelOpen = useViewStore((s) => s.anomalyPanelOpen);
  const correctionPanelOpen = useViewStore((s) => s.correctionPanelOpen);
  const toggleAnomalyPanel = useViewStore((s) => s.toggleAnomalyPanel);
  const toggleCorrectionPanel = useViewStore((s) => s.toggleCorrectionPanel);
  const integrity = useAnomalyStore((s) => s.getDataIntegrityLevel());
  const hall = useHallStore((s) => s.hall);

  const integrityConfig = {
    good: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', text: '数据完整' },
    warning: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10', text: '数据缺口' },
    critical: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', text: '数据严重缺失' },
  };
  const ic = integrityConfig[integrity];
  const IntegrityIcon = ic.icon;

  return (
    <div className="h-10 bg-[#0d1b2a] border-b border-gray-800 flex items-center px-3 gap-2 shrink-0">
      <div className="flex items-center gap-2 mr-3">
        <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
          <span className="text-amber-400 text-xs font-bold">R</span>
        </div>
        <span className="text-xs font-medium text-gray-300 truncate max-w-[160px]">{hall.name}</span>
      </div>

      <div className="h-5 w-px bg-gray-800" />

      <button
        onClick={() => setViewMode('2d')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
          viewMode === '2d'
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
        }`}
      >
        <Grid3X3 size={12} />
        2D座位图
      </button>
      <button
        onClick={() => setViewMode('3d')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
          viewMode === '3d'
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
        }`}
      >
        <Box size={12} />
        3D声场
      </button>

      <div className="h-5 w-px bg-gray-800" />

      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-gray-500 mr-1">频段</span>
        {bands.map((band) => (
          <button
            key={band}
            onClick={() => setActiveBand(band)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
              activeBand === band
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {band}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${ic.bg} ${ic.color}`}>
        <IntegrityIcon size={12} />
        {ic.text}
      </div>

      <div className="h-5 w-px bg-gray-800" />

      <button
        onClick={toggleAnomalyPanel}
        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        title={anomalyPanelOpen ? '收起异常清单' : '展开异常清单'}
      >
        {anomalyPanelOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>
      <button
        onClick={toggleCorrectionPanel}
        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        title={correctionPanelOpen ? '收起修正面板' : '展开修正面板'}
      >
        {correctionPanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
      </button>
    </div>
  );
}
