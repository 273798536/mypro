import { motion } from 'framer-motion';
import { X, Droplets, AlertTriangle, Download, BookOpen, Play, Gauge, Leaf } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
      >
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">游戏帮助</h2>
              <p className="text-slate-400 text-sm">快速上手指南</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-xl p-5 border border-cyan-700/50">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-3">
                <Droplets size={24} className="text-cyan-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">准备雨量卡</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                每回合系统自动根据场景配置触发降雨。
                不同场景有不同的降雨模式，常规降雨适合练习，
                极端降雨场景可测试应急能力。
                关注实时雨情面板，根据降雨量提前调度应对卡牌。
              </p>
              <div className="mt-3 pt-3 border-t border-cyan-700/30">
                <p className="text-cyan-400 text-xs font-medium">💡 提示：降雨量越大，需要的处理能力越强</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl p-5 border border-orange-700/50">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-3">
                <AlertTriangle size={24} className="text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">复现泵站过载</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                选择「暴雨来袭」或「泵站过载演练」场景。
                当降雨量超过管网输送能力时，泵站负载率持续上升。
                超过85%触发过载警告，超过95%严重过载。
                故意延迟调度管网卡即可观察过载过程。
              </p>
              <div className="mt-3 pt-3 border-t border-orange-700/30">
                <p className="text-orange-400 text-xs font-medium">⚠️ 过载将扣15-30分</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-xl p-5 border border-emerald-700/50">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
                <Download size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">查看成绩导出</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                游戏结束后，结算页面将展示完整评分明细。
                点击「导出成绩」按钮可下载JSON格式的完整游戏记录，
                包含所有风险事件、操作日志和状态快照，可用于复盘分析和训练存档。
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-700/30">
                <p className="text-emerald-400 text-xs font-medium">📄 导出文件包含完整历史数据</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Play size={18} className="text-cyan-400" />
              游戏玩法
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <ol className="space-y-3 text-slate-300 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <div>
                    <span className="text-white font-medium">选择场景</span>
                    <p className="text-slate-400 mt-1">在控制栏的场景下拉框中选择适合的降雨模式，点击「开始游戏」</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <div>
                    <span className="text-white font-medium">调度卡牌</span>
                    <p className="text-slate-400 mt-1">每回合根据降雨量，从手牌中点击合适的卡牌进行调度：管网卡提升输送、处置卡处理积水、雨水花园卡增加吸纳</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <div>
                    <span className="text-white font-medium">监控状态</span>
                    <p className="text-slate-400 mt-1">关注左侧城市状态面板，当泵站负载&gt;85%、积水&gt;100mm或绿地容量&lt;15%时会触发风险扣分</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                  <div>
                    <span className="text-white font-medium">结束回合</span>
                    <p className="text-slate-400 mt-1">完成本回合调度后点击「结束回合」，系统将抽取新牌并进入下一回合</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">5</span>
                  <div>
                    <span className="text-white font-medium">查看线索</span>
                    <p className="text-slate-400 mt-1">右侧事件关联链面板会自动将雨量、管网、处置等线索归到同一事件，方便追踪因果关系</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">6</span>
                  <div>
                    <span className="text-white font-medium">结算复盘</span>
                    <p className="text-slate-400 mt-1">15回合结束后进入结算页面，查看每项扣分的详细原因，并可通过时间线复盘整个游戏过程</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={16} className="text-orange-400" />
                <span className="text-orange-400 font-medium text-sm">管网卡</span>
              </div>
              <p className="text-slate-400 text-xs">
                提升泵站输送能力，降低泵站负载率。
                是防止泵站过载的核心卡牌。
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                <span className="text-yellow-400 font-medium text-sm">处置卡</span>
              </div>
              <p className="text-slate-400 text-xs">
                应急处理低洼积水，通过移动泵车、调蓄池等方式快速排水。
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Leaf size={16} className="text-emerald-400" />
                <span className="text-emerald-400 font-medium text-sm">雨水花园卡</span>
              </div>
              <p className="text-slate-400 text-xs">
                增加海绵设施吸纳容量，从源头消纳雨水，减轻管网压力。
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
