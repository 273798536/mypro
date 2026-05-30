import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CloudRain, Wind, AlertTriangle, Play, Info, BookOpen } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

const Home = () => {
  const navigate = useNavigate();
  const startGame = useGameStore((state) => state.startGame);

  const handleStartGame = () => {
    startGame();
    navigate('/game');
  };

  const features = [
    {
      icon: CloudRain,
      title: '云团拼图',
      description: '拖拽雷达块到正确位置，识别不同类型云团',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Wind,
      title: '风向判断',
      description: '调整风向箭头，理解气流对天气的影响',
      color: 'from-cyan-500 to-teal-500',
    },
    {
      icon: AlertTriangle,
      title: '预警设置',
      description: '选择正确的预警级别和发布时机',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-radar-blue/10 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-radar-orange/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-cyan-500/10 blur-2xl animate-float" style={{ animationDelay: '4s' }} />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-radar-blue/30 blur-2xl rounded-full scale-150" />
            <h1 className="relative font-orbitron text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-radar-blue via-cyan-300 to-radar-blue text-shadow-glow">
              气象雷达拼图赛
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            将云团、风向与降雨预警拼成可解释的天气结果
            <br />
            <span className="text-radar-blue">在游戏中理解气象科学</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity rounded-2xl blur-xl" style={{ background: `linear-gradient(135deg, ${feature.color.includes('blue') ? '#3b82f6' : feature.color.includes('orange') ? '#f97316' : '#06b6d4'}, transparent)` }} />
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-radar-blue/50 transition-all duration-300">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={handleStartGame}
            className="group relative px-10 py-4 bg-gradient-to-r from-radar-blue to-cyan-500 rounded-xl font-orbitron font-bold text-lg text-white shadow-lg hover:shadow-radar-blue/50 transition-all duration-300 hover:scale-105 animate-pulse-glow"
          >
            <span className="flex items-center gap-3">
              <Play className="w-6 h-6" />
              开始游戏
            </span>
          </button>
          
          <button className="px-8 py-4 bg-white/5 border border-white/20 rounded-xl font-medium text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            游戏规则
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-radar-blue" />
              <h3 className="font-orbitron font-bold text-white">游戏说明</h3>
            </div>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-radar-blue">•</span>
                <span>将左侧的云团雷达块拖拽到右侧网格的正确位置</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-radar-blue">•</span>
                <span>旋转风向罗盘，选择正确的风向角度（±30°内算正确）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-radar-blue">•</span>
                <span>设置降雨预警级别和发布时机，越准确得分越高</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-radar-orange">•</span>
                <span>注意：雷达块和风向数据可能来自不同数据源，冲突时请仔细判断</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="relative z-10 py-6 text-center text-gray-500 text-sm"
      >
        地理科普教育工具 · 气象雷达拼图赛
      </motion.footer>
    </div>
  );
};

export default Home;
