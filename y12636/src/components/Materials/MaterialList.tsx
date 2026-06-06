import { useStore } from '../../store/useStore';
import { Material } from '../../types';
import {
  Camera, FileEdit, MessageSquare, AlertTriangle, Calendar, Tag,
  Search, Filter, Plus, Clock,
} from 'lucide-react';
import { useState } from 'react';

const typeIcons: Record<string, any> = {
  screenshot: Camera,
  draft: FileEdit,
  opinion: MessageSquare,
};

const typeLabels: Record<string, string> = {
  screenshot: '截图',
  draft: '草稿',
  opinion: '意见',
};

const typeColors: Record<string, string> = {
  screenshot: 'bg-port-deep/30 text-blue-300 border-port-deep/50',
  draft: 'bg-port-warning/20 text-port-warning border-port-warning/50',
  opinion: 'bg-port-success/20 text-port-success border-port-success/50',
};

export default function MaterialList({ onSelect }: { onSelect: (m: Material) => void }) {
  const { materials, selectedMaterialId, selectMaterial } = useStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = Array.from(new Set(materials.flatMap((m) => m.tags)));

  const filtered = materials.filter((m) => {
    if (search && !m.title.includes(search) && !m.tags.some((t) => t.includes(search))) return false;
    if (typeFilter && m.type !== typeFilter) return false;
    if (tagFilter && !m.tags.includes(tagFilter)) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-port-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索材料标题、标签..."
              className="input-field pl-10 w-full text-sm"
            />
          </div>
          <button className="btn-secondary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> 上传
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">类型:</span>
          </div>
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              !typeFilter ? 'bg-port-deep text-white' : 'bg-port-bg text-slate-400 hover:text-white'
            }`}
          >
            全部
          </button>
          {Object.entries(typeLabels).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setTypeFilter(typeFilter === k ? null : k)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                typeFilter === k ? 'bg-port-deep text-white' : 'bg-port-bg text-slate-400 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}

          <div className="h-4 w-px bg-port-border mx-1" />
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">标签:</span>
          </div>
          <button
            onClick={() => setTagFilter(null)}
            className={`px-2 py-0.5 rounded-full text-[11px] transition-all ${
              !tagFilter ? 'bg-port-warning/30 text-port-warning' : 'bg-port-bg text-slate-400 hover:text-white'
            }`}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`px-2 py-0.5 rounded-full text-[11px] transition-all ${
                tagFilter === tag
                  ? 'bg-port-warning/30 text-port-warning'
                  : 'bg-port-bg text-slate-400 hover:text-white'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const Icon = typeIcons[m.type] || Camera;
            const hasError = m.annotations.some((a) => a.color === '#E74C3C') || m.comments.some((c) => c.content.includes('错') || c.content.includes('误'));
            return (
              <div
                key={m.id}
                onClick={() => { selectMaterial(m.id); onSelect(m); }}
                className={`panel overflow-hidden cursor-pointer transition-all hover:border-port-deep ${
                  selectedMaterialId === m.id ? 'ring-2 ring-port-deep border-port-deep' : ''
                }`}
              >
                <div className="relative aspect-video bg-port-bg overflow-hidden group">
                  <img
                    src={m.imageUrl}
                    alt={m.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-port-bg/80 via-transparent to-transparent" />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${typeColors[m.type]}`}>
                      {typeLabels[m.type]}
                    </span>
                    {hasError && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-port-danger/30 text-port-danger border border-port-danger/50 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> 含错误
                      </span>
                    )}
                    {m.isSupplementary !== undefined || m.comments.some((c) => c.isSupplementary) ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-port-warning/30 text-port-warning border border-port-warning/50">
                        补录
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-slate-300 bg-port-bg/80 px-1.5 py-0.5 rounded">
                    <span>{m.annotations.length}标注</span>
                    <span>·</span>
                    <span>{m.comments.length}意见</span>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <h4 className="text-sm font-medium text-white truncate">{m.title}</h4>
                  <div className="flex items-center gap-1 flex-wrap">
                    {m.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] text-slate-400">#{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(m.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    {m.source && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-slate-400">没有匹配的材料</p>
            <p className="text-xs text-slate-600 mt-1">试试调整筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
}
