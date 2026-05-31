import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, BookOpen, Star, Truck } from 'lucide-react';
import { LEVELS } from '@/data/levels';

export default function LevelSelect() {
  const navigate = useNavigate();

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < difficulty ? 'text-port-yellow fill-port-yellow' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-port-dark via-port-blue to-port-dark">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Truck size={48} className="text-port-yellow" />
            <h1 className="text-4xl font-bold text-white">港口集卡排队棋</h1>
          </div>
          <p className="text-gray-300 text-lg">
            训练闸口调度人员的排队规则实操能力
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {LEVELS.map((level, index) => (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -5 }}
              onClick={() => navigate(`/game/${level.id}`)}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 cursor-pointer border border-white/20 hover:border-port-yellow/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-5xl font-bold text-white/20">
                  {index + 1}
                </span>
                <div className="flex gap-1">
                  {getDifficultyStars(level.difficulty)}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-port-yellow transition-colors">
                {level.name}
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                {level.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {level.initialTrucks.length} 辆集卡
                </div>
                <motion.div
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-2 text-port-yellow font-medium"
                >
                  <Play size={18} />
                  开始挑战
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4"
        >
          <button
            onClick={() => navigate('/rules')}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            <BookOpen size={20} />
            查看规则手册
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-center text-gray-400 text-sm"
        >
          <p>提示：处理集卡时请注意备注版本变更、堆场更新和班次超时</p>
          <p className="mt-1">所有操作将作为证据记录，可在复盘时查看</p>
        </motion.div>
      </div>
    </div>
  );
}
