import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Filter,
  Trash2,
  History,
  Award,
  TrendingDown,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Home,
  Play
} from 'lucide-react';
import { useHistoryStore } from '../store/useHistoryStore';
import type { GameHistory } from '../engine/types';

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  'S': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  'A': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  'B': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  'C': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  'D': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
  'F': { bg: 'bg-red-700/20', text: 'text-red-500', border: 'border-red-700' }
};

export default function HistoryPage() {
  const navigate = useNavigate();
  
  const {
    histories,
    isLoading,
    error,
    searchQuery,
    filterGrade,
    sortBy,
    loadHistories,
    deleteHistory,
    setSearchQuery,
    setFilterGrade,
    setSortBy,
    checkDuplicate,
    getFilteredHistories
  } = useHistoryStore();
  
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadHistories();
  }, [loadHistories]);

  const formatDate = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatDuration = useCallback((startTime: number, endTime: number): string => {
    const duration = Math.floor((endTime - startTime) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}分${secs}秒`;
  }, []);

  const handleDelete = useCallback(async (historyId: string) => {
    await deleteHistory(historyId);
    setDeleteConfirmId(null);
  }, [deleteHistory]);

  const filteredHistories = getFilteredHistories();
  
  const duplicateCount = histories.filter(h => checkDuplicate(h)).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300 text-lg">加载历史记录...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800/90 backdrop-blur border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-xl font-bold text-emerald-400 tracking-wide">历史记录</h1>
              <p className="text-xs text-slate-400">MISSION HISTORY</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {duplicateCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">检测到 {duplicateCount} 条重复记录</span>
              </div>
            )}
            <div className="text-right">
              <div className="text-sm text-slate-400">总记录数</div>
              <div className="text-lg font-mono font-bold text-emerald-300">
                {histories.length}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="搜索地图名称或评级..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>筛选</span>
            </button>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'grade')}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="date">按时间排序</option>
              <option value="score">按分数排序</option>
              <option value="grade">按评级排序</option>
            </select>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-slate-700">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterGrade('all')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        filterGrade === 'all'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      全部
                    </button>
                    {['S', 'A', 'B', 'C', 'D', 'F'].map(grade => (
                      <button
                        key={grade}
                        onClick={() => setFilterGrade(grade)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          filterGrade === grade
                            ? gradeColors[grade].bg + ' ' + gradeColors[grade].text + ' ' + gradeColors[grade].border + ' border'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          {filteredHistories.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-12 text-center">
              <History className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-bold text-slate-400 mb-2">暂无历史记录</h3>
              <p className="text-slate-500 mb-6">完成一局游戏后，记录将显示在这里</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all hover:scale-105"
              >
                开始游戏
              </button>
            </div>
          ) : (
            filteredHistories.map((history: GameHistory, index: number) => {
              const isDuplicate = checkDuplicate(history);
              const gradeColor = gradeColors[history.grade] || gradeColors['F'];
              
              return (
                <motion.div
                  key={history.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-slate-800 rounded-xl p-6 border-2 transition-all ${
                    isDuplicate 
                      ? 'border-yellow-500/50 bg-yellow-500/5' 
                      : 'border-transparent hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`${gradeColor.bg} ${gradeColor.border} border-2 rounded-xl p-4 text-center min-w-20`}>
                        <div className={`text-4xl font-bold ${gradeColor.text}`}>
                          {history.grade}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">评级</div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white truncate">
                            {history.mapName}
                          </h3>
                          {isDuplicate && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                              <AlertTriangle className="w-3 h-3" />
                              可能重复
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(history.createdAt)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(history.startTime, history.endTime)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin className="w-4 h-4" />
                            <span>#{history.gameId.substring(0, 8)}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-6 mt-4">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">最终得分</div>
                            <div className="text-2xl font-bold text-cyan-400">
                              {history.finalScore.toFixed(1)}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-slate-500 mb-1">总扣分数</div>
                            <div className="flex items-center gap-1 text-xl font-bold text-red-400">
                              <TrendingDown className="w-5 h-5" />
                              {history.totalDeductions}
                            </div>
                          </div>
                          
                          <div className="hidden sm:block">
                            <div className="text-xs text-slate-500 mb-1">哈希校验</div>
                            <div className="text-xs font-mono text-slate-600 truncate max-w-32">
                              {history.hash.substring(0, 16)}...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => navigate(`/result/${history.gameId}`)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                      >
                        <Award className="w-4 h-4" />
                        <span>报告</span>
                      </button>
                      
                      <button
                        onClick={() => navigate(`/review/${history.gameId}`)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                      >
                        <History className="w-4 h-4" />
                        <span>复盘</span>
                      </button>
                      
                      <AnimatePresence>
                        {deleteConfirmId === history.id ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex items-center gap-2"
                          >
                            <span className="text-sm text-slate-400">确认删除？</span>
                            <button
                              onClick={() => handleDelete(history.id)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(history.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sm:hidden">删除</span>
                          </button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {histories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 pt-4 pb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all hover:scale-105"
            >
              <Play className="w-5 h-5" />
              开始新游戏
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all hover:scale-105"
            >
              <Home className="w-5 h-5" />
              返回首页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
