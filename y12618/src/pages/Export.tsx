import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '@/store';

const formats = [
  { value: 'json' as const, label: 'JSON', icon: FileJson, desc: '结构化数据格式' },
  { value: 'csv' as const, label: 'CSV', icon: FileSpreadsheet, desc: '表格数据格式' },
];

export default function Export() {
  const navigate = useNavigate();
  const {
    levels,
    fetchLevels,
    consistencyReport,
    checkConsistency,
    exportData,
    clearConsistencyReport,
    loading,
  } = useStore();

  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchLevels();
    return () => clearConsistencyReport();
  }, [fetchLevels, clearConsistencyReport]);

  const handleCheck = async () => {
    if (selectedIds.length === 0) return;
    await checkConsistency(selectedIds);
    setChecked(true);
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) return;
    if (!checked) {
      await handleCheck();
    }
    const result = await exportData({
      levelIds: selectedIds,
      format,
    });
    if (result) {
      if (format === 'csv' && typeof result === 'string') {
        const blob = new Blob([result], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const toggleLevel = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(levels.map((l) => l.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const isConsistent = consistencyReport?.isConsistent ?? true;
  const differences = consistencyReport?.differences ?? [];

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl font-semibold text-ink">导出下载</h2>

      <div className="card">
        <h3 className="font-serif text-lg font-semibold mb-4">导出格式</h3>
        <div className="grid grid-cols-2 gap-3">
          {formats.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  format === f.value
                    ? 'border-amber bg-amber/5'
                    : 'border-ink/8 hover:border-ink/20'
                }`}
              >
                <Icon
                  className={`mx-auto mb-2 h-8 w-8 ${
                    format === f.value ? 'text-amber-dark' : 'text-slate-custom/50'
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    format === f.value ? 'text-ink' : 'text-slate-custom'
                  }`}
                >
                  {f.label}
                </p>
                <p className="text-xs text-slate-custom/60 mt-0.5">{f.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold">选择关卡</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="btn-emboss-ghost text-xs">全选</button>
            <button onClick={deselectAll} className="btn-emboss-ghost text-xs">清除</button>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {levels.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-3 rounded-lg border border-ink/8 px-3 py-2 cursor-pointer hover:bg-ink/3"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(l.id)}
                onChange={() => toggleLevel(l.id)}
                className="rounded border-ink/30 text-amber focus:ring-amber/30"
              />
              <span className="text-sm flex-1">{l.name}</span>
              <span className={`badge ${
                l.status === 'confirmed'
                  ? 'badge-success'
                  : l.status === 'review'
                  ? 'badge-warning'
                  : 'bg-ink/10 text-slate-custom'
              }`}>
                {l.status === 'confirmed' ? '已确认' : l.status === 'review' ? '审核中' : '待检'}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold">一致性校验</h3>
          <button
            onClick={handleCheck}
            disabled={loading || selectedIds.length === 0}
            className="btn-emboss-ghost flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            重新校验
          </button>
        </div>

        {!checked && differences.length === 0 && (
          <div className="text-center py-6 text-slate-custom text-sm">
            选择关卡后点击"重新校验"按钮检查数据一致性
          </div>
        )}

        {checked && isConsistent && (
          <div className="card-success flex items-center gap-2 py-3">
            <CheckCircle2 className="h-5 w-5 text-moss" />
            <span className="text-sm font-medium text-moss">数据一致，可以安全导出</span>
          </div>
        )}

        {differences.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-terracotta">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">
                发现 {differences.length} 处不一致
              </span>
            </div>
            <div className="space-y-2">
              {differences.map((diff, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-terracotta/20 bg-terracotta/5 px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink mb-1">
                      结论 {diff.conclusionId.slice(0, 8)}... - {diff.field}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-custom">
                        UI 值: <span className="text-ink font-medium">{diff.uiValue}</span>
                      </span>
                      <ArrowRight className="h-3 w-3 text-slate-custom/40" />
                      <span className="text-slate-custom">
                        导出值: <span className="text-terracotta font-medium">{diff.exportValue}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/level/${diff.conclusionId}/edit`)}
                    className="btn-emboss-danger text-xs ml-3"
                  >
                    前往修正
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleCheck}
          className="btn-emboss-ghost text-sm"
          disabled={loading || selectedIds.length === 0}
        >
          校验
        </button>
        <button
          onClick={handleExport}
          className="btn-emboss-primary flex items-center gap-1.5 text-sm"
          disabled={loading || selectedIds.length === 0}
        >
          <Download className="h-4 w-4" />
          导出
        </button>
      </div>
    </div>
  );
}
