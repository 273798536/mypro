import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSearch,
  RefreshCw,
  Download,
  Upload,
  BarChart3,
  FilterX,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  PROCESSING_STATUS_LABEL,
  PROCESSING_STATUS_COLOR,
  COMMENT_SOURCE_LABEL,
  type ProcessingStatus,
} from '../types';

export default function ReviewDashboard() {
  const comments = useAppStore((s) => s.comments);
  const statusStats = useAppStore((s) => s.getStatusStats());
  const options = useAppStore((s) => s.stationOptions);
  const segments = useAppStore((s) => s.timelineSegments);
  const pendingFloorCheck = useAppStore((s) => s.pendingFloorCheck);
  const normalizeAndAddComment = useAppStore((s) => s.normalizeAndAddComment);
  const setStatusFilter = useAppStore((s) => s.setStatusFilter);
  const setSourceFilter = useAppStore((s) => s.setSourceFilter);
  const setSearchKeyword = useAppStore((s) => s.setSearchKeyword);
  const setSelectedOption = useAppStore((s) => s.setSelectedOption);
  const setSelectedTimeline = useAppStore((s) => s.setSelectedTimeline);

  const total = comments.length;
  const processedCount = statusStats.completed + statusStats.confirmed;
  const pendingCount = statusStats.evidence_needed + statusStats.pending + statusStats.processing;
  const evidenceNeededCount = statusStats.evidence_needed;

  const optMap = Object.fromEntries(options.map((o) => [o.id, o]));
  const segMap = Object.fromEntries(segments.map((s) => [s.id, s]));

  const evidenceList = comments.filter((c) => c.status === 'evidence_needed');
  const processedList = comments.filter(
    (c) => c.status === 'completed' || c.status === 'confirmed'
  );

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      alert('CSV至少需要包含表头和一行数据');
      return;
    }
    const headers = parseCSVLine(lines[0]);
    let added = 0;
    const checks: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const raw: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (h && values[idx] !== undefined) raw[h.trim()] = values[idx];
      });
      if (Object.keys(raw).length === 0) continue;
      const result = normalizeAndAddComment(raw);
      if (result.added) added++;
      if (result.check?.needsManualConfirm) {
        checks.push(`第 ${i + 1} 行：${result.check.reason}`);
      }
    }
    let msg = `成功导入 ${added} 条评审批注`;
    if (checks.length > 0) {
      msg += `\n\n其中 ${checks.length} 条存在楼层/单位混写，需要人工确认：\n` + checks.join('\n');
    }
    alert(msg);
    e.target.value = '';
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      '方案',
      '阶段',
      '备注内容',
      '处理状态',
      '来源',
      '原始字段名',
      '原始内容',
      '处理人',
      '处理时间',
      '证据引用',
      '楼层单位校验',
      '录入人',
      '录入时间',
    ];
    const rows = comments.map((c) => {
      const opt = optMap[c.optionId];
      const seg = c.timelineSegmentId ? segMap[c.timelineSegmentId] : null;
      const rawKey = c.originalFieldName || '';
      const rawVal = rawKey && c.rawFields ? c.rawFields[rawKey] || '' : '';
      return [
        c.id,
        opt?.code + '方案 ' + opt?.name || c.optionId,
        seg?.name || '',
        c.content,
        PROCESSING_STATUS_LABEL[c.status],
        COMMENT_SOURCE_LABEL[c.source],
        rawKey,
        rawVal,
        c.handler || '',
        c.handledAt || '',
        (c.evidenceRefs || []).join('; '),
        c.floorUnitCheckNote || (c.floorUnitMixed ? '待确认' : '通过'),
        c.createdBy,
        c.createdAt,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((cell) => {
          const s = String(cell ?? '');
          if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        }).join(',')
      )
      .join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `山地索道站方案比选_评审批注明细_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setSourceFilter('all');
    setSearchKeyword('');
    setSelectedOption(null);
    setSelectedTimeline(null);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">复核视图 · 处理总览</h3>
        <button
          onClick={resetFilters}
          className="ml-auto text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <FilterX size={12} />
          清空筛选
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard
          label="批注总数"
          value={total}
          icon={<FileSearch size={16} />}
          tone="slate"
          onClick={() => {
            setStatusFilter('all');
          }}
        />
        <StatCard
          label="已处理"
          value={processedCount}
          sub={`${total ? Math.round((processedCount / total) * 100) : 0}%`}
          icon={<CheckCircle2 size={16} />}
          tone="green"
          onClick={() => {
            setStatusFilter('all');
          }}
        />
        <StatCard
          label="待补证据"
          value={evidenceNeededCount}
          icon={<AlertTriangle size={16} />}
          tone="amber"
          onClick={() => {
            setStatusFilter('evidence_needed');
          }}
        />
        <StatCard
          label="待处理"
          value={pendingCount}
          icon={<Clock size={16} />}
          tone="blue"
          onClick={() => {
            setStatusFilter('pending');
          }}
        />
      </div>

      <div className="mb-3">
        <div className="text-xs font-medium text-slate-600 mb-2">按状态分布</div>
        <div className="flex h-6 rounded overflow-hidden bg-slate-100">
          {(Object.keys(PROCESSING_STATUS_LABEL) as ProcessingStatus[]).map((k) => {
            const n = statusStats[k];
            if (n === 0) return null;
            const pct = total ? (n / total) * 100 : 0;
            const map: Record<ProcessingStatus, string> = {
              pending: 'bg-slate-400',
              processing: 'bg-blue-400',
              completed: 'bg-green-500',
              evidence_needed: 'bg-amber-500',
              confirmed: 'bg-emerald-500',
            };
            return (
              <div
                key={k}
                className={`${map[k]} flex items-center justify-center text-[10px] text-white font-medium cursor-pointer hover:brightness-110`}
                style={{ width: `${pct}%` }}
                title={`${PROCESSING_STATUS_LABEL[k]}: ${n}`}
                onClick={() => setStatusFilter(k)}
              >
                {pct > 12 ? `${PROCESSING_STATUS_LABEL[k]} ${n}` : n}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <label className="flex-1 px-3 py-2 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 cursor-pointer flex items-center justify-center gap-1">
          <Upload size={12} />
          导入CSV（复核人批量）
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />
        </label>
        <button
          onClick={handleExportCSV}
          className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 flex items-center justify-center gap-1"
        >
          <Download size={12} />
          导出CSV明细
        </button>
      </div>

      {Object.keys(pendingFloorCheck).length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
          <div className="flex items-center gap-1 text-amber-800 text-xs font-medium mb-1">
            <AlertTriangle size={12} />
            有 {Object.keys(pendingFloorCheck).length} 条存在楼层/单位混写，需人工确认
          </div>
          <div className="text-xs text-amber-700">
            请在左侧「评审批注」中查看标注为「楼层单位待确认」的条目
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500" />
            待补证据清单（{evidenceList.length}）
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {evidenceList.length === 0 && (
              <div className="text-xs text-slate-400 py-4 text-center">
                🎉 所有证据都齐全啦
              </div>
            )}
            {evidenceList.map((c) => {
              const opt = optMap[c.optionId];
              return (
                <div
                  key={c.id}
                  className="p-2 rounded border border-amber-100 bg-amber-50/50 text-xs"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span
                      className="font-medium"
                      style={{ color: opt?.color }}
                    >
                      {opt?.code}方案
                    </span>
                    <span className="text-slate-500 truncate flex-1">
                      {c.timelineSegmentId
                        ? segMap[c.timelineSegmentId]?.name
                        : ''}
                    </span>
                    <RefreshCw size={10} className="text-amber-500" />
                  </div>
                  <div className="text-slate-700 line-clamp-2">{c.content}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-green-500" />
            已处理清单（{processedList.length}）
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {processedList.length === 0 && (
              <div className="text-xs text-slate-400 py-4 text-center">
                暂无已处理批注
              </div>
            )}
            {processedList.map((c) => {
              const opt = optMap[c.optionId];
              return (
                <div
                  key={c.id}
                  className="p-2 rounded border border-green-100 bg-green-50/50 text-xs"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span
                      className="font-medium"
                      style={{ color: opt?.color }}
                    >
                      {opt?.code}方案
                    </span>
                    <span className="text-slate-500 truncate flex-1">
                      {c.handler ? `${c.handler} · ${c.handledAt}` : '已处理'}
                    </span>
                    <CheckCircle2 size={10} className="text-green-500" />
                  </div>
                  <div className="text-slate-700 line-clamp-2">{c.content}</div>
                  {c.evidenceRefs && c.evidenceRefs.length > 0 && (
                    <div className="mt-1 text-[10px] text-slate-500">
                      证据：{c.evidenceRefs.join('；')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  tone: 'slate' | 'green' | 'amber' | 'blue';
  onClick?: () => void;
}) {
  const toneMap = {
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border ${toneMap[tone]} ${onClick ? 'cursor-pointer hover:brightness-95' : ''}`}
    >
      <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs opacity-70">{sub}</div>}
      </div>
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        result.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  result.push(cur);
  return result;
}
