import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toolbar } from '@/components/controls/Toolbar';
import { Timeline } from '@/components/controls/Timeline';
import { Scene3D } from '@/components/three/Scene3D';
import { FilterPanel } from '@/components/sidebar/FilterPanel';
import { HeatMapPanel } from '@/components/sidebar/HeatMapPanel';
import { SeatsDetail } from '@/components/sidebar/SeatsDetail';
import Empty from '@/components/Empty';
import { useDataStore } from '@/store/useDataStore';
import { useAcousticCalc } from '@/hooks/useAcousticCalc';
import { Layers, Thermometer, ListFilter, AlertTriangle, Info } from 'lucide-react';

type SidebarTab = 'filter' | 'heatmap' | 'seats';

export default function Home() {
  const { hallModel, soundSources, seats, soundRays, validationResult } = useDataStore();
  const { loadSampleData } = useAcousticCalc();
  const [activeTab, setActiveTab] = useState<SidebarTab>('heatmap');
  const [showWelcome, setShowWelcome] = useState(true);

  const hasData = hallModel && soundSources.length > 0 && seats.length > 0;
  const hasResults = soundRays.length > 0;

  useEffect(() => {
    if (hasData) {
      setShowWelcome(false);
    }
  }, [hasData]);

  const sidebarTabs = [
    { key: 'filter' as SidebarTab, label: '问题筛选', icon: ListFilter, badge: validationResult?.issues.length || 0 },
    { key: 'heatmap' as SidebarTab, label: '热力映射', icon: Thermometer },
    { key: 'seats' as SidebarTab, label: '座位明细', icon: Layers, badge: seats.length },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative">
          <Scene3D />

          <AnimatePresence>
            {showWelcome && !hasData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10"
              >
                <Empty
                  title="音乐厅声场可视化"
                  description="导入厅堂模型、声源位置和座位数据，或点击下方按钮加载样例开始体验"
                  icon={<Layers size={48} className="text-blue-400" />}
                  actionLabel="加载样例数据"
                  onAction={loadSampleData}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {hasData && !hasResults && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900/90 backdrop-blur-xl rounded-xl border border-zinc-700 shadow-xl"
              >
                <Info size={16} className="text-blue-400" />
                <span className="text-sm text-zinc-300">数据已加载，点击「开始计算」运行声线追踪</span>
              </motion.div>
            </div>
          )}

          {validationResult && !validationResult.isValid && (
            <div className="absolute top-4 left-4 z-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 backdrop-blur-xl rounded-xl border border-amber-500/30"
              >
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="text-sm text-amber-300">
                  检测到 {validationResult.issues.length} 个数据问题，计算前请确认
                </span>
              </motion.div>
            </div>
          )}
        </div>

        <div className="w-80 bg-zinc-900/50 backdrop-blur-xl border-l border-zinc-800 flex flex-col">
          <div className="flex items-center border-b border-zinc-800">
            {sidebarTabs.map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors relative ${
                  activeTab === key
                    ? 'text-blue-400 bg-zinc-800/50'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
                    {badge}
                  </span>
                )}
                {activeTab === key && (
                  <motion.div
                    layoutId="sidebarTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'filter' && <FilterPanel />}
                {activeTab === 'heatmap' && <HeatMapPanel />}
                {activeTab === 'seats' && <SeatsDetail />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Timeline />
    </div>
  );
}
