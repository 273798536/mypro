import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Star, Clock, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { levels } from '@/data/levels';

export default function LevelSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-2xl font-bold text-white">选择关卡</h1>
        </motion.div>

        <div className="grid gap-4">
          {levels.map((level, index) => (
            <motion.div
              key={level.id}
              className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-amber-500/50 transition-all duration-300 cursor-pointer group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/play/${level.id}`)}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                      {index + 1}
                    </span>
                    <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                      {level.name}
                    </h2>
                  </div>
                  <p className="text-slate-400 text-sm ml-13">
                    {level.description}
                  </p>

                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      <span>目标 {level.targetScore} 分</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(level.timeLimit / 60)} 分钟</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      <span>{level.learningPoints.length} 个知识点</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
