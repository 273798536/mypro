import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  FileText,
  ChevronRight,
  Search,
  Images,
  History,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { formatDate, truncateText } from '@/lib/format';

export default function TimelinePage() {
  const { records, loading, error, fetchRecords } = useAppStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filtered = records.filter(
    r =>
      r.title.includes(search) ||
      r.location.includes(search) ||
      r.batchId.includes(search)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-orange-500 to-red-600 rounded-full" />
          时间回放
        </h1>
        <p className="text-stone-500 mt-2 ml-4.5">
          日常入口 · 按时间倒序查看所有火山地貌剖切讲解记录
        </p>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="搜索标题、地点或批次号..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="ml-3 text-stone-500">加载中...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-center">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white border border-dashed border-stone-300 rounded-xl p-16 text-center text-stone-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>暂无讲解记录</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((record, idx) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <Link
              to={`/record/${record.id}`}
              className="block bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-lg hover:border-orange-300 transition-all group"
            >
              <div className="p-5 flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center flex-shrink-0 group-hover:from-orange-200 group-hover:to-red-200 transition-colors">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-stone-800 group-hover:text-orange-600 transition-colors">
                        {record.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-stone-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {record.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(record.timestamp)}
                        </span>
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-mono">
                          {record.batchId}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                  </div>

                  <p className="mt-3 text-stone-600 text-sm leading-relaxed">
                    {truncateText(record.currentConclusion.content, 120)}
                  </p>

                  <div className="mt-3 flex items-center gap-5 text-xs">
                    <span className="flex items-center gap-1 text-stone-500">
                      <Images className="w-3.5 h-3.5" />
                      {record.screenshots.length} 张截图
                    </span>
                    <span className="flex items-center gap-1 text-stone-500">
                      <History className="w-3.5 h-3.5" />
                      {record.history.length} 个历史版本
                    </span>
                    <span className="text-orange-600 font-medium">
                      v{record.history.length} · {record.currentConclusion.author}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
