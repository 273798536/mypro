import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, CheckCircle2, Clock, Layers, Eye, Map } from 'lucide-react';
import { useStore } from '@/store';
import Canvas from '@/components/Canvas';
import type { Level } from '@/api';

const statusIcon = (status: Level['status']) => {
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 className="h-4 w-4 text-moss" />;
    case 'review':
      return <Eye className="h-4 w-4 text-amber" />;
    default:
      return <Clock className="h-4 w-4 text-slate-custom" />;
  }
};

const statusLabel = (status: Level['status']) => {
  switch (status) {
    case 'confirmed':
      return '已确认';
    case 'review':
      return '审核中';
    default:
      return '待检';
  }
};

const statusBadgeClass = (status: Level['status']) => {
  switch (status) {
    case 'confirmed':
      return 'badge-success';
    case 'review':
      return 'badge-warning';
    default:
      return 'bg-ink/10 text-slate-custom';
  }
};

export default function LevelList() {
  const { levels, violationCounts, fetchLevels, fetchViolationCounts, loading } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCanvas, setShowCanvas] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLevels().then(() => {
      fetchViolationCounts();
    });
  }, [fetchLevels, fetchViolationCounts]);

  const filtered = useMemo(() => {
    return levels.filter((l) => {
      const matchSearch =
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.description.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [levels, search, statusFilter]);

  const renderCanvasContent = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cols = Math.min(filtered.length, 4);
      const rows = Math.ceil(filtered.length / cols) || 1;
      const cardW = w / cols - 24;
      const cardH = 64;
      const gap = 16;
      const startY = 20;

      filtered.forEach((level, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 12 + col * (cardW + gap);
        const y = startY + row * (cardH + gap);
        const openV = violationCounts[level.id] ?? 0;

        ctx.fillStyle = openV > 0 ? '#fef2f2' : '#ffffff';
        ctx.strokeStyle = openV > 0 ? '#c4533a' : '#1a2f231a';
        ctx.lineWidth = openV > 0 ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1a2f23';
        ctx.font = 'bold 13px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(level.name, x + 12, y + 22);

        ctx.fillStyle = '#4a5568';
        ctx.font = '11px "Noto Sans SC", sans-serif';
        const statusText = level.status === 'confirmed' ? '已确认' : level.status === 'review' ? '审核中' : '待检';
        ctx.fillText(`${openV} 违例 · ${statusText} · ${level.gridWidth}×${level.gridHeight}`, x + 12, y + 44);

        if (openV > 0) {
          ctx.fillStyle = '#c4533a';
          ctx.beginPath();
          ctx.arc(x + cardW - 12, y + 12, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(openV), x + cardW - 12, y + 16);
          ctx.textAlign = 'left';
        }
      });
    },
    [filtered, violationCounts]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-ink">关卡列表</h2>
        <button
          onClick={() => setShowCanvas(!showCanvas)}
          className={`btn-emboss-ghost flex items-center gap-1.5 text-sm ${
            showCanvas ? 'text-amber-dark' : ''
          }`}
        >
          <Map className="h-4 w-4" />
          {showCanvas ? '关闭画布' : '打开画布'}
        </button>
      </div>

      {showCanvas && (
        <Canvas
          height={300}
          renderContent={renderCanvasContent}
        />
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-custom/50" />
          <input
            type="text"
            placeholder="搜索关卡名称或描述..."
            className="input-field pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select-field w-32"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="draft">待检</option>
          <option value="review">审核中</option>
          <option value="confirmed">已确认</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-custom">
          加载中...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-custom">
          <Layers className="mb-3 h-12 w-12 opacity-30" />
          <p>暂无关卡数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((level) => {
            const openViolations = violationCounts[level.id] ?? 0;
            return (
              <div
                key={level.id}
                className="card group relative cursor-pointer"
                onClick={() => navigate(`/level/${level.id}`)}
              >
                {openViolations > 0 && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white shadow-sm">
                    {openViolations}
                  </div>
                )}
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-serif text-base font-semibold text-ink group-hover:text-amber-dark transition-colors">
                    {level.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    {statusIcon(level.status)}
                    <span className={`badge ${statusBadgeClass(level.status)}`}>
                      {statusLabel(level.status)}
                    </span>
                  </div>
                </div>
                <p className="mb-3 text-sm text-slate-custom line-clamp-2">{level.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-custom/70">
                  <span className="flex items-center gap-1">
                    {openViolations > 0 ? (
                      <AlertTriangle className="h-3 w-3 text-terracotta" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-moss" />
                    )}
                    {openViolations} 违例
                  </span>
                  <span>{level.gridWidth}×{level.gridHeight}</span>
                  <span>{level.cellSize}px</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
