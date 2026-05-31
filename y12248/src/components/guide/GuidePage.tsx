import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, Zap, Trophy, Clock, Target } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { SCORE_RULES } from '../../utils/scoring';
import { STRATEGY_CONFIG } from '../../utils/cacheAlgorithms';
import { SCHEDULER_CONFIG } from '../../types/queue';

export function GuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#2D2A26] p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            📖 游戏说明
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            掌握缓存算法的核心概念，学会识别和避免常见的缓存问题
          </p>
        </motion.div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="default" className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Target className="w-7 h-7 text-[#FF7A18]" />
                一、游戏目标
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#1D1A17] rounded-xl text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="font-bold text-white mb-2">正确出餐</h3>
                  <p className="text-sm text-gray-400">尽快处理顾客订单，使用新鲜的缓存数据</p>
                </div>
                <div className="p-4 bg-[#1D1A17] rounded-xl text-center">
                  <div className="text-4xl mb-3">🔥</div>
                  <h3 className="font-bold text-white mb-2">提高缓存命中率</h3>
                  <p className="text-sm text-gray-400">合理利用缓存，减少回源压力</p>
                </div>
                <div className="p-4 bg-[#1D1A17] rounded-xl text-center">
                  <div className="text-4xl mb-3">⚠️</div>
                  <h3 className="font-bold text-white mb-2">避免问题</h3>
                  <p className="text-sm text-gray-400">防止缓存击穿、脏数据扩散等问题</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="default" className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-[#64B5F6]" />
                二、怎样准备订单卡
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-[#1D1A17] rounded-xl">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <span className="bg-[#FF7A18] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                    理解订单卡片
                  </h3>
                  <p className="text-gray-400 mb-3">每个订单卡片包含以下信息：</p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF7A18]">•</span>
                      <span><strong className="text-white">菜品名称</strong> - 顾客点的菜品</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF7A18]">•</span>
                      <span><strong className="text-white">优先级标签</strong> - 闲时(灰)/普通(绿)/加急(橙)/特急(红)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF7A18]">•</span>
                      <span><strong className="text-white">倒计时</strong> - 剩余处理时间，归零则顾客投诉</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF7A18]">•</span>
                      <span><strong className="text-white">耐心条</strong> - 从绿色到红色，实时显示耐心值</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF7A18]">•</span>
                      <span><strong className="text-white">缓存状态</strong> - 命中(绿)/过期(黄)/回源中(红)</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-[#1D1A17] rounded-xl">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <span className="bg-[#FF7A18] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                    订单生成规则
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#81C784]">✓</span>
                      <span>游戏开始后，订单会自动生成，间隔随时间逐渐缩短</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#81C784]">✓</span>
                      <span>菜品从8种固定菜单中随机选择，热门菜品会重复出现</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#81C784]">✓</span>
                      <span>优先级按概率分配：普通50%、加急20%、闲时20%、特急10%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#81C784]">✓</span>
                      <span>优先级越高，初始耐心值越低，需要更快处理</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="danger" className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <AlertTriangle className="w-7 h-7 text-[#D32F2F]" />
                三、怎样复现缓存击穿
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-[#D32F2F]/10 rounded-xl border border-[#D32F2F]/30">
                  <h3 className="font-bold text-[#FF6B6B] mb-3">触发条件</h3>
                  <div className="bg-[#1D1A17] p-4 rounded-lg font-mono text-sm">
                    <p className="text-gray-300">1. 某菜品同时有 <span className="text-[#FF7A18] font-bold">≥ 5</span> 个未处理订单</p>
                    <p className="text-gray-300">2. 该菜品的缓存 <span className="text-[#FF7A18] font-bold">刚好过期或不存在</span></p>
                    <p className="text-gray-300">3. 同时触发 <span className="text-[#FF7A18] font-bold">≥ 3</span> 个回源请求</p>
                  </div>
                </div>

                <div className="p-4 bg-[#1D1A17] rounded-xl">
                  <h3 className="font-bold text-white mb-3">复现步骤</h3>
                  <ol className="space-y-3 text-sm text-gray-300">
                    <li className="flex items-start gap-3">
                      <span className="bg-[#1565C0] text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">1</span>
                      <span>选择 <strong className="text-white">TTL 策略</strong>，设置较短的过期时间</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-[#1565C0] text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">2</span>
                      <span>选择 <strong className="text-white">后进先出(LIFO)</strong> 调度，让老订单堆积</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-[#1565C0] text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">3</span>
                      <span>故意让某热门菜品（如宫保鸡丁）的缓存过期</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-[#1565C0] text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">4</span>
                      <span>等待多个订单同时请求该菜品，触发大量回源</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-[#1565C0] text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm">5</span>
                      <span>当并发回源超过3个时，系统会记录为 <strong className="text-[#D32F2F]">缓存击穿</strong></span>
                    </li>
                  </ol>
                </div>

                <div className="p-4 bg-[#81C784]/10 rounded-xl border border-[#81C784]/30">
                  <h3 className="font-bold text-[#81C784] mb-3">💡 预防方法</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-[#81C784]">•</span>
                      <span>使用互斥锁，只让一个请求回源，其他等待</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#81C784]">•</span>
                      <span>热点数据永不过期，后台异步更新</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#81C784]">•</span>
                      <span>TTL 时间增加随机偏移，避免同时过期</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="warning" className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <AlertTriangle className="w-7 h-7 text-[#FFD54F]" />
                四、脏数据扩散与过期误读
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-[#FFD54F] mb-3">脏数据扩散</h3>
                  <div className="p-4 bg-[#1D1A17] rounded-xl">
                    <p className="text-sm text-gray-400 mb-3">
                      当一个订单使用了过期缓存出餐后，后续订单如果检查同一菜品时系统未发现过期，就形成了脏数据扩散链。
                    </p>
                    <div className="text-xs text-gray-500 p-3 bg-[#0D0A07] rounded-lg">
                      <p className="mb-1">订单A → 使用过期缓存v1出餐</p>
                      <p className="mb-1">订单B → 检查同一菜品，误判v1有效</p>
                      <p className="mb-1">订单C → 继续使用脏数据v1</p>
                      <p className="text-[#FF6B6B]">结果: 多个顾客吃到过期菜</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-[#FF9800] mb-3">过期误读</h3>
                  <div className="p-4 bg-[#1D1A17] rounded-xl">
                    <p className="text-sm text-gray-400 mb-3">
                      新版本数据写入时，可能意外覆盖了旧版本的过期标记，导致已过期的数据被误判为有效。
                    </p>
                    <div className="text-xs text-gray-500 p-3 bg-[#0D0A07] rounded-lg">
                      <p className="mb-1">缓存v1 → 已过期，但标记被覆盖</p>
                      <p className="mb-1">系统检查 → 认为v1仍然有效</p>
                      <p className="mb-1">出餐 → 顾客收到过期菜</p>
                      <p className="text-[#FF9800]">原因: 并发写入时的竞态条件</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="default" className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Trophy className="w-7 h-7 text-[#FFD54F]" />
                五、怎样看分数解释
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SCORE_RULES.map((rule, index) => (
                  <div key={index} className="p-4 bg-[#1D1A17] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">{rule.event}</span>
                      <span className={`text-lg font-bold ${
                        rule.score.startsWith('+') ? 'text-[#81C784]' : 'text-[#D32F2F]'
                      }`}>
                        {rule.score}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{rule.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card variant="default" className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Zap className="w-7 h-7 text-[#81C784]" />
                六、缓存策略选择指南
              </h2>
              <div className="space-y-4">
                {(Object.keys(STRATEGY_CONFIG) as Array<keyof typeof STRATEGY_CONFIG>).map((strategy) => (
                  <div key={strategy} className="p-4 bg-[#1D1A17] rounded-xl">
                    <h3 className="font-bold text-[#FF7A18] mb-2">{STRATEGY_CONFIG[strategy].name}</h3>
                    <p className="text-sm text-gray-400">{STRATEGY_CONFIG[strategy].description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card variant="default" className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Clock className="w-7 h-7 text-[#64B5F6]" />
                七、队列调度选择指南
              </h2>
              <div className="space-y-4">
                {(Object.keys(SCHEDULER_CONFIG) as Array<keyof typeof SCHEDULER_CONFIG>).map((scheduler) => (
                  <div key={scheduler} className="p-4 bg-[#1D1A17] rounded-xl">
                    <h3 className="font-bold text-[#1565C0] mb-2">{SCHEDULER_CONFIG[scheduler].name}</h3>
                    <p className="text-sm text-gray-400">{SCHEDULER_CONFIG[scheduler].description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <Button variant="primary" size="xl" onClick={() => navigate('/')}>
            🎮 开始游戏
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
