import { useNavigate } from 'react-router-dom';
import { Volume2, Users, FileText, Moon, Layers, Calculator, Play, BookOpen } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-eco-800">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-eco-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <span className="text-2xl">🔊</span>
            <span className="text-white/80 text-sm">环保科普互动游戏</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            声音污染调度员
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            管理城市声环境，平衡发展与环保。学习夜间阈值、声源重叠、分贝叠加的专业知识
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Moon size={32} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">夜间阈值</h3>
            <p className="text-white/60 text-sm">
              理解昼夜噪声标准差异，居民区夜间要求更严格
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Layers size={32} className="text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">声源重叠</h3>
            <p className="text-white/60 text-sm">
              多个声源叠加产生复合噪声，影响远大于单个声源
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calculator size={32} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">分贝计算</h3>
            <p className="text-white/60 text-sm">
              分贝是对数单位，不能直接算术相加
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen size={24} />
            游戏玩法
          </h2>
          <div className="grid grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold mb-3">
                1
              </div>
              <h4 className="text-white font-medium mb-1">放置声源卡</h4>
              <p className="text-white/60 text-sm">拖拽声源卡到城市地图的对应区域</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold mb-3">
                2
              </div>
              <h4 className="text-white font-medium mb-1">监控风险</h4>
              <p className="text-white/60 text-sm">关注夜间阈值、声源重叠等风险提示</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold mb-3">
                3
              </div>
              <h4 className="text-white font-medium mb-1">采取治理</h4>
              <p className="text-white/60 text-sm">使用治理措施降低噪声影响</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold mb-3">
                4
              </div>
              <h4 className="text-white font-medium mb-1">复盘学习</h4>
              <p className="text-white/60 text-sm">游戏结束后查看详细分析报告</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate('/game')}
            className="flex items-center gap-3 px-8 py-4 bg-white text-primary-900 rounded-xl font-bold text-lg hover:bg-white/90 transition-all hover:scale-105 shadow-xl"
          >
            <Play size={24} />
            开始游戏
          </button>
        </div>

        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-8 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <Volume2 size={16} />
              <span>10种声源类型</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>9个城市区域</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span>完整操作记录</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
