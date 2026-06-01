import { useEffect } from 'react'
import { Plus, Upload } from 'lucide-react'
import { useScoreStore } from '../store/scoreStore'
import { initMockData } from '../data/mockData'
import StatsCard from '../components/StatsCard'
import FilterPanel from '../components/FilterPanel'
import ScoreCard from '../components/ScoreCard'

export default function Home() {
  const {
    scores,
    setScores,
    setVersions,
    setAnnotations,
    setParts,
    setAnomalies,
    setTasks,
    getFilteredScores,
    getVersionsByScoreId,
    getAnnotationsByScoreId,
    getPartsByScoreId,
    getAnomaliesByScoreId,
    getStats,
  } = useScoreStore()

  useEffect(() => {
    if (scores.length === 0) {
      const data = initMockData()
      setScores(data.scores)
      setVersions(data.versions)
      setAnnotations(data.annotations)
      setParts(data.parts)
      setAnomalies(data.anomalies)
      setTasks(data.tasks)
    }
  }, [scores.length, setScores, setVersions, setAnnotations, setParts, setAnomalies, setTasks])

  const filteredScores = getFilteredScores()
  const stats = getStats()

  return (
    <div className="min-h-screen pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">曲谱管理</h1>
            <p className="text-navy-400 mt-1">管理曲谱版本、批注和声部信息</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white hover:bg-navy-700 transition-colors">
              <Upload className="w-4 h-4" />
              导入曲谱
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 rounded-lg text-navy-900 font-medium hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20">
              <Plus className="w-4 h-4" />
              新建曲谱
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <StatsCard
          total={stats.total}
          normal={stats.normal}
          pending={stats.pending}
          anomaly={stats.anomaly}
        />

        {/* 筛选面板 */}
        <div className="mt-6">
          <FilterPanel />
        </div>

        {/* 曲谱列表 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              曲谱列表
              <span className="text-navy-400 font-normal ml-2">
                共 {filteredScores.length} 条
              </span>
            </h2>
          </div>

          {filteredScores.length === 0 ? (
            <div className="bg-navy-800/50 rounded-xl p-12 text-center border border-navy-700/50">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-navy-700/50 flex items-center justify-center">
                <Upload className="w-8 h-8 text-navy-500" />
              </div>
              <p className="text-navy-400">暂无匹配的曲谱</p>
              <p className="text-sm text-navy-500 mt-1">调整筛选条件或上传新曲谱</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {filteredScores.map((score) => (
                <ScoreCard
                  key={score.id}
                  score={score}
                  versionCount={getVersionsByScoreId(score.id).length}
                  annotationCount={getAnnotationsByScoreId(score.id).length}
                  partCount={getPartsByScoreId(score.id).length}
                  anomalyCount={getAnomaliesByScoreId(score.id).length}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
