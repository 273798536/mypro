import { motion } from 'framer-motion';
import { Download, Snowflake, Info } from 'lucide-react';
import { ColdStore } from '../components/Scene3D/ColdStore';
import { EventPanel } from '../components/Panels/EventPanel';
import { DetailPanel } from '../components/Panels/DetailPanel';
import { Timeline } from '../components/Panels/Timeline';
import { exportReport } from '../utils/exportReport';
import { useStore } from '../store/useStore';

export default function Home() {
  const { events, probes, fans } = useStore();

  const offlineProbes = probes.filter((p) => p.status === 'offline').length;
  const warningProbes = probes.filter((p) => p.status === 'warning').length;
  const stoppedFans = fans.filter((f) => f.status !== 'running').length;

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 bg-slate-900/90 border-b border-slate-700/50 flex items-center justify-between px-6 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Snowflake size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-100">冷库温场巡检舱</h1>
            <p className="text-[10px] text-slate-500">Cold Chain Temperature Monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${offlineProbes > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-xs text-slate-400">
                探头离线 <span className="text-red-400 font-mono">{offlineProbes}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${warningProbes > 0 ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-xs text-slate-400">
                温度告警 <span className="text-amber-400 font-mono">{warningProbes}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${stoppedFans > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-xs text-slate-400">
                风机异常 <span className="text-red-400 font-mono">{stoppedFans}</span>
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportReport()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Download size={14} />
              导出报告
            </button>
          </div>
        </div>
      </motion.header>

      <div className="flex-1 flex relative overflow-hidden">
        <EventPanel />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex-1 relative"
        >
          <ColdStore />

          <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Info size={12} />
              <span>操作提示</span>
            </div>
            <ul className="text-[10px] text-slate-500 space-y-1">
              <li>• 左键拖拽旋转视角</li>
              <li>• 滚轮缩放场景</li>
              <li>• 右键平移视角</li>
              <li>• 点击对象查看详情</li>
            </ul>
          </div>

          <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400 mb-2">温度图例</div>
            <div className="flex items-center gap-1">
              {[-25, -22, -19, -16, -13, -10].map((temp) => (
                <div key={temp} className="flex flex-col items-center">
                  <div
                    className="w-6 h-4 rounded-sm"
                    style={{
                      backgroundColor:
                        temp <= -22
                          ? 'rgb(0, 50, 150)'
                          : temp <= -19
                          ? 'rgb(0, 150, 200)'
                          : temp <= -16
                          ? 'rgb(50, 200, 150)'
                          : temp <= -13
                          ? 'rgb(255, 200, 50)'
                          : 'rgb(255, 80, 50)',
                    }}
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 font-mono">{temp}°</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <DetailPanel />
      </div>

      <Timeline />
    </div>
  );
}
