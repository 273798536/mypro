import { useState, useEffect } from 'react';
import { Download, Loader2, Eye } from 'lucide-react';
import { useComplaintStore } from '@/stores/complaintStore';
import type { ComplaintStatus, ExportFormat } from '../../shared/types';

export default function ExportPage() {
  const { complaints, loading, fetchComplaints, exportData, filters, setFilters } = useComplaintStore();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [previewData, setPreviewData] = useState<typeof complaints>([]);

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    setPreviewData(complaints.slice(0, 20));
  }, [complaints]);

  const handlePreview = () => {
    fetchComplaints();
  };

  const handleExport = () => {
    exportData(filters, format);
  };

  const statusOptions: { value: ComplaintStatus | ''; label: string }[] = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待归并' },
    { value: 'merged', label: '已归并' },
    { value: 'confirmed', label: '已确认' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
        数据导出
      </h2>

      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <h3 className="text-base font-semibold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          筛选条件
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>状态</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value as ComplaintStatus | '' })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>位置</label>
            <input
              type="text"
              placeholder="输入位置关键词..."
              value={filters.keyword}
              onChange={(e) => setFilters({ keyword: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>开始日期</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ date_from: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>结束日期</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ date_to: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>导出格式</label>
          <div className="flex gap-4">
            {(['csv', 'json'] as ExportFormat[]).map((f) => (
              <label key={f} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value={f}
                  checked={format === f}
                  onChange={() => setFormat(f)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="text-sm font-medium uppercase">{f}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Eye size={14} />
            预览数据
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Download size={14} />
            导出 {format.toUpperCase()}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          <span className="ml-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中...</span>
        </div>
      ) : previewData.length > 0 ? (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>位置</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>状态</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>来源</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>上报时间</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-accent)' }}>备注</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-2.5 max-w-[200px] truncate">{c.location_raw}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : c.status === 'merged'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {c.status === 'pending' ? '待归并' : c.status === 'merged' ? '已归并' : '已确认'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{c.source}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {new Date(c.reported_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-2.5 max-w-[250px] truncate font-medium" style={{ color: 'var(--color-accent)' }}>
                      {c.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-2.5 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            显示前 {Math.min(20, previewData.length)} 条（共 {complaints.length} 条匹配）
          </div>
        </div>
      ) : null}
    </div>
  );
}
