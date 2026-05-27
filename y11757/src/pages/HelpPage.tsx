import { ArrowLeft, Zap, Play, Pause, RotateCcw, Home, AlertTriangle, Star, Download, Eye, MousePointer, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid-bg noise-overlay relative">
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            ← 返回
          </button>
          <h1 className="text-3xl font-display font-bold text-neon-cyan glow-text-cyan">
            ❓ 操作帮助
          </h1>
          <div className="w-32" />
        </div>

        <div className="space-y-6">
          <div className="panel-glass p-6">
            <h2 className="text-xl font-display font-bold text-neon-purple mb-4">
              🚀 快速开始
            </h2>
            <ol className="space-y-3 text-gray-300 font-mono text-sm">
              <li className="flex gap-3">
                <span className="text-neon-cyan font-bold">1.</span>
                <span>从<strong className="text-white">关卡选择</strong>页面点击一个已解锁的关卡</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neon-cyan font-bold">2.</span>
                <span>在右侧<strong className="text-neon-pink">工具栏</strong>选择电荷类型（正/负/擦除）和强度</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neon-cyan font-bold">3.</span>
                <span><MousePointer className="w-3 h-3 inline" /> <strong className="text-white">左键点击</strong>画布放置电荷</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neon-cyan font-bold">4.</span>
                <span><Eye className="w-3 h-3 inline" /> 查看<strong className="text-neon-yellow">路径预览</strong>，调整电荷位置</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neon-cyan font-bold">5.</span>
                <span><Play className="w-3 h-3 inline" /> 点击<strong className="text-success-green">开始模拟</strong>释放小球</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neon-cyan font-bold">6.</span>
                <span>引导小球从起点到达<strong className="text-neon-green">终点</strong>即可通关</span>
              </li>
            </ol>
          </div>

          <div className="panel-glass p-6">
            <h2 className="text-xl font-display font-bold text-neon-purple mb-4">
              ⌨️ 操作说明
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-bold text-neon-cyan">鼠标操作</h3>
                <div className="space-y-2 text-sm font-mono text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="bg-space-900 px-2 py-1 rounded text-xs border border-gray-600">左键</span>
                    <span>放置选中的电荷</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-space-900 px-2 py-1 rounded text-xs border border-gray-600">右键</span>
                    <span>快速删除电荷</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-space-900 px-2 py-1 rounded text-xs border border-gray-600">悬停</span>
                    <span>查看电荷信息</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-neon-cyan">按钮功能</h3>
                <div className="space-y-2 text-sm font-mono text-gray-300">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-success-green" />
                    <span>开始模拟 - 释放小球</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pause className="w-4 h-4 text-neon-yellow" />
                    <span>暂停/继续模拟</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-neon-pink" />
                    <span>重新开始</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-neon-purple" />
                    <span>返回关卡选择</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-gray-400" />
                    <span>清除所有电荷</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-glass p-6">
            <h2 className="text-xl font-display font-bold text-neon-purple mb-4">
              ⚡ 物理原理
            </h2>
            <div className="space-y-4 text-gray-300 font-mono text-sm">
              <div className="bg-space-900/50 p-4 rounded-lg">
                <h3 className="font-bold text-neon-cyan mb-2">库仑定律</h3>
                <p className="mb-2 text-lg text-center text-neon-purple">
                  F = k × q₁ × q₂ / r²
                </p>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• F: 电荷间的作用力</li>
                  <li>• k: 库仑常数 (游戏中为 5000)</li>
                  <li>• q₁, q₂: 两个电荷的电量</li>
                  <li>• r: 电荷间的距离</li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neon-pink/10 p-4 rounded-lg border border-neon-pink/30">
                  <h3 className="font-bold text-neon-pink mb-2">正电荷 (+)</h3>
                  <p className="text-xs">
                    与正电小球<strong className="text-white">排斥</strong>，<br/>
                    推开小球远离
                  </p>
                </div>
                <div className="bg-neon-cyan/10 p-4 rounded-lg border border-neon-cyan/30">
                  <h3 className="font-bold text-neon-cyan mb-2">负电荷 (−)</h3>
                  <p className="text-xs">
                    与正电小球<strong className="text-white">吸引</strong>，<br/>
                    拉近小球靠近
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-glass p-6">
            <h2 className="text-xl font-display font-bold text-neon-purple mb-4">
              ⚠️ 异常情况
            </h2>
            <div className="space-y-3">
              <div className="flex gap-4 p-3 bg-neon-pink/10 border border-neon-pink/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-neon-pink flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-neon-pink font-mono">电场过强</h3>
                  <p className="text-sm text-gray-400 font-mono">
                    当最大电场强度超过 50,000 时会触发警告。电荷叠加过强会导致小球运动失控，需要减少电荷或降低强度。
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-3 bg-neon-yellow/10 border border-neon-yellow/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-neon-yellow flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-neon-yellow font-mono">路径穿墙</h3>
                  <p className="text-sm text-gray-400 font-mono">
                    路径预览检测到小球会穿过墙壁。需要调整电荷位置，让预览路径保持在通道内。
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-3 bg-neon-purple/10 border border-neon-purple/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-neon-purple flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-neon-purple font-mono">能量耗尽</h3>
                  <p className="text-sm text-gray-400 font-mono">
                    放置电荷消耗能量，删除电荷退还 80%。能量不足时无法放置新电荷。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-glass p-6">
            <h2 className="text-xl font-display font-bold text-neon-purple mb-4">
              ⭐ 评分规则
            </h2>
            <div className="space-y-4 text-sm font-mono text-gray-300">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-space-900/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-neon-cyan">40%</div>
                  <div className="text-xs text-gray-500">时间得分</div>
                  <div className="text-xs mt-1">用时越短分数越高</div>
                </div>
                <div className="bg-space-900/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-neon-yellow">30%</div>
                  <div className="text-xs text-gray-500">能量得分</div>
                  <div className="text-xs mt-1">剩余能量越多越好</div>
                </div>
                <div className="bg-space-900/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-neon-purple">30%</div>
                  <div className="text-xs text-gray-500">效率得分</div>
                  <div className="text-xs mt-1">用电荷越少越高效</div>
                </div>
              </div>
              <div className="bg-space-900/50 p-4 rounded-lg">
                <h3 className="font-bold text-neon-yellow mb-2">星级评定</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <Star className="w-6 h-6 text-neon-yellow fill-neon-yellow mx-auto mb-1" />
                    <div className="text-xs text-gray-400">≥ 60 分</div>
                  </div>
                  <div>
                    <div className="flex justify-center gap-0.5 mb-1">
                      <Star className="w-6 h-6 text-neon-yellow fill-neon-yellow" />
                      <Star className="w-6 h-6 text-neon-yellow fill-neon-yellow" />
                    </div>
                    <div className="text-xs text-gray-400">≥ 80 分</div>
                  </div>
                  <div>
                    <div className="flex justify-center gap-0.5 mb-1">
                      <Star className="w-6 h-6 text-neon-yellow fill-neon-yellow" />
                      <Star className="w-6 h-6 text-neon-yellow fill-neon-yellow" />
                      <Star className="w-6 h-6 text-neon-yellow fill-neon-yellow" />
                    </div>
                    <div className="text-xs text-gray-400">≥ 95 分</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-glass p-6">
            <h2 className="text-xl font-display font-bold text-neon-purple mb-4">
              📊 数据导出
            </h2>
            <div className="space-y-3 text-sm font-mono text-gray-300">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white">TXT 报告</h3>
                  <p className="text-gray-500 text-xs">
                    包含关卡信息、得分明细、物理参数、电荷配置的完整文本报告
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-neon-purple flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white">JSON 数据</h3>
                  <p className="text-gray-500 text-xs">
                    包含所有游戏数据的结构化 JSON，便于程序处理和数据分析
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-neon-yellow flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white">CSV 批量导出</h3>
                  <p className="text-gray-500 text-xs">
                    在历史记录页面可导出全部记录为 CSV 表格，方便用 Excel 分析
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-glass p-6">
            <h2 className="text-xl font-display font-bold text-neon-purple mb-4">
              💡 游戏技巧
            </h2>
            <ul className="space-y-2 text-sm font-mono text-gray-300">
              <li className="flex gap-2">
                <span className="text-neon-cyan">•</span>
                <span>先观察迷宫结构，规划小球的大致路径</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon-cyan">•</span>
                <span>善用路径预览功能，实时调整电荷位置</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon-cyan">•</span>
                <span>少而精的电荷比多而乱的效果更好</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon-cyan">•</span>
                <span>在拐角处放置电荷可以有效改变方向</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon-cyan">•</span>
                <span>避免在狭窄通道放置过强电荷，容易失控</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon-cyan">•</span>
                <span>删除电荷可退还 80% 能量，大胆尝试</span>
              </li>
            </ul>
          </div>

          <div className="text-center text-gray-500 text-xs font-mono mt-12">
            <p>物理兴趣小组 · 电磁迷宫逃脱 v1.0</p>
            <p className="mt-1">基于库仑定律的真实物理模拟</p>
          </div>
        </div>
      </div>
    </div>
  );
};
