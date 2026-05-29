import { useState } from 'react';
import { Camera, GitCompare, Download, Info, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { captureScreenshot, downloadJSON } from '@/utils/export';
import { COLORS, formatAmount } from '@/utils/colors';
import { useStatistics } from '@/store/useAppStore';

export function Toolbar() {
  const navigate = useNavigate();
  const { nodes, edges, isCompareMode, enterCompareMode, exitCompareMode, takeSnapshot, corrections } = useAppStore();
  const stats = useStatistics();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleScreenshot = async () => {
    setIsExporting(true);
    try {
      await captureScreenshot('main-canvas', {
        filename: 'fund-flow-3d',
        scale: 2,
        backgroundColor: COLORS.background,
      });
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const handleExportJSON = () => {
    downloadJSON({ nodes, edges, corrections }, `fund-flow-data-${Date.now()}.json`);
  };

  const toggleCompareMode = () => {
    if (isCompareMode) {
      exitCompareMode();
      navigate('/');
    } else {
      takeSnapshot();
      enterCompareMode();
      navigate('/compare');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{
            backgroundColor: COLORS.panelBg,
            border: `1px solid ${COLORS.panelBorder}`,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex items-center gap-3 pr-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{
                     background: `linear-gradient(135deg, ${COLORS.node.selected}, ${COLORS.node.high})`,
                   }}>
                <GitCompare size={16} style={{ color: COLORS.background }} />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-wider"
                    style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
                  链上资金流 3D
                </h1>
                <p className="text-[10px]" style={{ color: COLORS.text.muted }}>
                  On-chain Fund Flow Visualization
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: COLORS.node.selected }}>{stats.nodeCount}</div>
              <div className="text-[10px]" style={{ color: COLORS.text.muted }}>地址</div>
            </div>
            <div className="w-px h-6" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: COLORS.node.relay }}>{stats.edgeCount}</div>
              <div className="text-[10px]" style={{ color: COLORS.text.muted }}>交易</div>
            </div>
            <div className="w-px h-6" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: COLORS.node.medium }}>{formatAmount(stats.totalAmount)}</div>
              <div className="text-[10px]" style={{ color: COLORS.text.muted }}>总金额</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleScreenshot}
              disabled={isExporting}
              className="p-2 rounded-lg transition-all hover:bg-white/10 disabled:opacity-50"
              style={{ color: isExporting ? COLORS.node.selected : COLORS.text.secondary }}
              title="导出截图"
            >
              <Camera size={18} className={isExporting ? 'animate-pulse' : ''} />
            </button>
            <button
              onClick={handleExportJSON}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: COLORS.text.secondary }}
              title="导出数据JSON"
            >
              <Download size={18} />
            </button>
            <button
              onClick={toggleCompareMode}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: isCompareMode ? COLORS.node.selected : COLORS.text.secondary }}
              title={isCompareMode ? '退出对比模式' : '对比视图'}
            >
              <GitCompare size={18} />
            </button>
            <div className="w-px h-6 mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: COLORS.text.secondary }}
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: showInfo ? COLORS.node.selected : COLORS.text.secondary }}
              title="使用说明"
            >
              <Info size={18} />
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-lg p-6 rounded-2xl"
              style={{
                backgroundColor: COLORS.backgroundLight,
                border: `1px solid ${COLORS.panelBorder}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"
                  style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
                <Info size={20} style={{ color: COLORS.node.selected }} />
                使用说明
              </h2>
              <div className="space-y-3 text-sm" style={{ color: COLORS.text.secondary }}>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: `${COLORS.node.selected}20`, color: COLORS.node.selected }}>1</span>
                  <p><strong style={{ color: COLORS.text.primary }}>3D视图操作：</strong>鼠标左键拖拽旋转，滚轮缩放，右键平移</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: `${COLORS.node.selected}20`, color: COLORS.node.selected }}>2</span>
                  <p><strong style={{ color: COLORS.text.primary }}>节点交互：</strong>点击节点/连线查看详情，拖拽节点可重新定位</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: `${COLORS.node.selected}20`, color: COLORS.node.selected }}>3</span>
                  <p><strong style={{ color: COLORS.text.primary }}>筛选条件：</strong>左侧面板可按风险等级、链类型、金额范围等筛选</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: `${COLORS.node.selected}20`, color: COLORS.node.selected }}>4</span>
                  <p><strong style={{ color: COLORS.text.primary }}>待确认异常：</strong>底部面板展示系统检测到的三类异常，点击可定位</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: `${COLORS.node.selected}20`, color: COLORS.node.selected }}>5</span>
                  <p><strong style={{ color: COLORS.text.primary }}>手动修正：</strong>详情面板可修改风险等级，修正后可在对比视图并排查看</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: `${COLORS.node.selected}20`, color: COLORS.node.selected }}>6</span>
                  <p><strong style={{ color: COLORS.text.primary }}>时间轴：</strong>底部时间轴可按交易时间顺序播放资金流动</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowInfo(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: COLORS.node.selected,
                    color: COLORS.background,
                  }}
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Toolbar;
