import { X } from 'lucide-react';

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstructionModal({ isOpen, onClose }: InstructionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-600 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <h2 className="text-xl font-bold text-white">📖 游戏说明</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          <section>
            <h3 className="text-lg font-bold text-white mb-3">🎯 游戏目标</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              模拟风暴后的电力抢修场景，玩家需要合理调度抢修队伍，在有限的回合内恢复尽可能多的区域供电。
              优先保障医院等重要区域，避免超时扣分。
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">🎮 操作方式</h3>
            <ul className="text-slate-300 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-mono">1.</span>
                <span>点击<strong className="text-white">待命状态</strong>的抢修队卡片，选中队伍</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-mono">2.</span>
                <span>点击目标<strong className="text-white">区域卡片</strong>完成派遣</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-mono">3.</span>
                <span>点击<strong className="text-white">"结束回合"</strong>按钮进入下一回合</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-mono">4.</span>
                <span>执行中的队伍可以<strong className="text-white">撤回</strong>，但会浪费已投入的资源</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">📊 优先级规则</h3>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-600">
                    <th className="text-left py-2">优先级</th>
                    <th className="text-left py-2">区域类型</th>
                    <th className="text-left py-2">说明</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-600/50">
                    <td className="py-2 text-red-400 font-bold">P1</td>
                    <td>医院</td>
                    <td>最高优先级，必须优先保障</td>
                  </tr>
                  <tr className="border-b border-slate-600/50">
                    <td className="py-2 text-orange-400 font-bold">P2</td>
                    <td>重要医院</td>
                    <td>高优先级</td>
                  </tr>
                  <tr className="border-b border-slate-600/50">
                    <td className="py-2 text-yellow-400 font-bold">P3</td>
                    <td>重要居民区</td>
                    <td>中优先级</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-blue-400 font-bold">P4+</td>
                    <td>普通区域</td>
                    <td>较低/低优先级</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">⚠️ 注意事项</h3>
            <ul className="text-slate-300 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span><strong className="text-white">重复派遣</strong>：执行中的队伍无法再次派遣，会显示错误</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span><strong className="text-white">技能不匹配</strong>：队伍必须具备区域所需的抢修技能</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span><strong className="text-white">备件不足</strong>：每次抢修消耗备件，备件不足无法派遣</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span><strong className="text-white">冷却时间</strong>：队伍完成任务后需要冷却才能再次派遣</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span><strong className="text-white">超时扣分</strong>：区域在超时时间内未修复会扣除大量分数</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-3">📝 错误提示说明</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              所有错误都会在<strong className="text-white">操作日志</strong>中显示，并附带：
            </p>
            <ul className="text-slate-300 text-sm space-y-1 mt-2">
              <li>• <strong className="text-white">R数字</strong>：发生错误的回合号</li>
              <li>• <strong className="text-white">L数字</strong>：关联的行号（如果有）</li>
              <li>• <strong className="text-white">源位置</strong>：错误对应的代码位置（如 <code className="text-orange-400 bg-slate-700 px-1 rounded">teams[team-1].status</code>）</li>
            </ul>
          </section>
        </div>

        <div className="p-6 border-t border-slate-600 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            开始游戏
          </button>
        </div>
      </div>
    </div>
  );
}