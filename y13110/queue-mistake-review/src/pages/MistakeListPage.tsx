import { Link } from 'react-router-dom'
import { useMistakeData } from '../hooks/useMistakeData'
import StatsOverview from '../components/StatsOverview'
import FilterBar from '../components/FilterBar'
import MistakeCard from '../components/MistakeCard'

export default function MistakeListPage() {
  const { filteredMistakes, stats, resetData } = useMistakeData()

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">错题排队列表</h2>
          <p className="text-sm text-gray-500">
            共 {stats.total} 道题，当前筛选出 {filteredMistakes.length} 道
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/import"
            className="px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 transition-colors"
          >
            导入数据
          </Link>
          <button
            onClick={resetData}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            重置演示数据
          </button>
        </div>
      </div>

      <StatsOverview />
      <FilterBar />

      {filteredMistakes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMistakes.map(mistake => (
            <MistakeCard key={mistake.id} mistake={mistake} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500">没有找到符合条件的错题</p>
          <p className="text-sm text-gray-400 mt-1">试试调整筛选条件</p>
        </div>
      )}
    </div>
  )
}
