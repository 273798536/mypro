import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, History, Play, Star, Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { getAllCases } from '@/data/cases';
import { useGameStore } from '@/store/gameStore';
import { getDifficultyName } from '@/utils/gameEngine';
import { useEffect } from 'react';

export const HomePage = () => {
  const navigate = useNavigate();
  const cases = getAllCases();
  const { records, loadSavedRecords } = useGameStore();

  useEffect(() => {
    loadSavedRecords();
  }, [loadSavedRecords]);

  const bestScore = records.length > 0 
    ? Math.max(...records.map(r => (r.score / r.maxScore) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
        
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-12">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center gap-3 mb-6"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white tracking-tight">
                保险理赔侦探局
              </h1>
            </motion.div>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              化身理赔侦探，在案件中寻找线索、识别风险。
              <br />
              考验你的专业能力，守护公平与正义！
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-0 text-white">
              <CardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-amber-400" />
                <p className="text-3xl font-bold mb-1">{records.length}</p>
                <p className="text-slate-400">已完成案件</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-0 text-white">
              <CardContent className="p-6 text-center">
                <Star className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                <p className="text-3xl font-bold mb-1">{bestScore.toFixed(0)}%</p>
                <p className="text-slate-400">最高正确率</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-0 text-white">
              <CardContent className="p-6 text-center">
                <Target className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                <p className="text-3xl font-bold mb-1">{cases.length}</p>
                <p className="text-slate-400">待侦破案件</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Play className="w-6 h-6 text-amber-400" />
              选择案件开始调查
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cases.map((caseItem, index) => (
                <motion.div
                  key={caseItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                >
                  <Card hoverable className="h-full" onClick={() => navigate(`/game/${caseItem.id}`)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{caseItem.customer.avatar}</span>
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{caseItem.title}</h3>
                            <p className="text-sm text-slate-500">{caseItem.customer.name}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          caseItem.difficulty === 'easy' 
                            ? 'bg-green-100 text-green-700'
                            : caseItem.difficulty === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {getDifficultyName(caseItem.difficulty)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                        {caseItem.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          ⏱️ {Math.floor(caseItem.timeLimit / 60)}分钟限时
                        </span>
                        <span className="text-sm text-slate-500">
                          📄 {caseItem.materials.length}份材料
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="flex justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/history')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              <History className="w-5 h-5 mr-2" />
              查看历史记录
            </Button>
          </motion.div>

          <motion.div
            className="mt-16 text-center text-slate-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <p>💡 提示：仔细阅读每份材料，标记存在的风险点</p>
            <p className="mt-1">⚠️ 注意票据重复、保单免责、补料超时等特殊情况</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
