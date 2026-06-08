import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileJson, FileSpreadsheet, CheckCircle2, type LucideIcon } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function DownloadPage() {
  const { records, loading, fetchRecords } = useAppStore();
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  function handleDownload(format: 'json' | 'csv', id?: string) {
    const key = id ? `${format}-${id}` : `all-${format}`;
    setDownloadedId(key);
    setTimeout(() => setDownloadedId(null), 2000);
    window.open(api.getExportUrl(format, id), '_blank');
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800 flex items-center gap-3">
          <span className="w-1.5 h-8 bg-gradient-to-b from-orange-500 to-red-600 rounded-full" />
          数据下载
        </h1>
        <p className="text-stone-500 mt-2 ml-4.5">
          导出火山地貌剖切讲解数据，支持 JSON 和 CSV 格式
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-red-50 border-b border-stone-200">
          <h2 className="font-semibold text-stone-800">批量导出全部记录</h2>
        </div>
        <div className="p-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-stone-600">
              共 <span className="font-semibold text-orange-600">{records.length}</span> 条讲解记录
            </div>
            <div className="text-sm text-stone-400 mt-0.5">
              包含所有记录的截图清单、结论数据和历史版本信息
            </div>
          </div>
          <DownloadButton
            onClick={() => handleDownload('json')}
            label="导出 JSON"
            icon={FileJson}
            active={downloadedId === 'all-json'}
            variant="primary"
          />
          <DownloadButton
            onClick={() => handleDownload('csv')}
            label="导出 CSV"
            icon={FileSpreadsheet}
            active={downloadedId === 'all-csv'}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">单独导出</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-stone-400">加载中...</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-stone-400">暂无记录</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {records.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="px-6 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800 truncate">{r.title}</div>
                  <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-3">
                    <span>{formatDate(r.timestamp)}</span>
                    <span className="font-mono">{r.batchId}</span>
                    <span>{r.history.length} 版本</span>
                  </div>
                </div>
                <DownloadButton
                  onClick={() => handleDownload('json', r.id)}
                  label="JSON"
                  icon={FileJson}
                  active={downloadedId === `json-${r.id}`}
                  small
                />
                <DownloadButton
                  onClick={() => handleDownload('csv', r.id)}
                  label="CSV"
                  icon={FileSpreadsheet}
                  active={downloadedId === `csv-${r.id}`}
                  small
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadButton({
  onClick,
  label,
  icon: Icon,
  active,
  variant = 'default',
  small = false,
}: {
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  active: boolean;
  variant?: 'primary' | 'default';
  small?: boolean;
}) {
  const base =
    variant === 'primary'
      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20 hover:shadow-orange-500/35'
      : 'bg-white border border-stone-200 text-stone-700 hover:border-orange-300 hover:text-orange-600';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} rounded-lg font-medium transition-all ${base}`}
    >
      {active ? (
        <CheckCircle2 className={`${small ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      ) : (
        <Icon className={`${small ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      )}
      {active ? '已下载' : label}
    </button>
  );
}
