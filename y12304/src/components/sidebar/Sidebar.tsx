import { motion } from 'framer-motion';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { TempHeatmap } from './TempHeatmap';
import { AlarmList } from './AlarmList';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <>
      <motion.div
        initial={false}
        animate={{ width: isOpen ? 360 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-full bg-gray-900/95 backdrop-blur-sm border-l border-gray-700/50 overflow-hidden flex flex-col"
      >
        <div className="min-w-[360px] h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              数据中心监控
            </h2>
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <PanelRightClose className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <FilterPanel />
            <TempHeatmap />
            <AlarmList />
          </div>
        </div>
      </motion.div>

      {!isOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-all z-10"
        >
          <PanelRightOpen className="w-5 h-5" />
        </motion.button>
      )}
    </>
  );
}
