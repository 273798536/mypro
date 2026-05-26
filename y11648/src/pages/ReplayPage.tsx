import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

const ReplayPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="mb-8">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="inline-block p-8 bg-slate-800/70 rounded-full border border-slate-700 mb-6"
          >
            <span className="text-6xl">🎬</span>
          </motion.div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">回放功能</h1>
        <p className="text-slate-400 mb-8 max-w-md">
          游戏回放功能即将上线，敬请期待！
          <br />
          您将可以回顾完整的调度过程，分析每一个决策。
        </p>

        <div className="flex justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            返回
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors"
          >
            <Home size={20} />
            返回首页
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReplayPage;
