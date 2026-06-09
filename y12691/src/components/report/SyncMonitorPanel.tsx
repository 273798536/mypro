import { AlertTriangle, AlertCircle, Info, FileQuestion, Clock, Lightbulb } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { formatDate } from '../../utils/helpers';

export function SyncMonitorPanel() {
  const { syncIssues, measurements, models, slices, conclusions } = useAppStore();

  const severityIcons: Record<string, React.ReactNode> = {
    error: <AlertTriangle size={18} className="text-danger" />,
    warning: <AlertCircle size={18} className="text-warning" />,
    info: <Info size={18} className="text-info" />,
  };

  const severityBg: Record<string, string> = {
    error: 'bg-danger/10 border-danger/30',
    warning: 'bg-warning/10 border-warning/30',
    info: 'bg-info/10 border-info/30',
  };

  const materials = [
    { type: '三维模型', items: models, color: 'text-ice-blue' },
    { type: '点云切片', items: slices, color: 'text-info' },
    { type: '测量记录', items: measurements, color: 'text-success' },
    { type: '结论报告', items: conclusions, color: 'text-modified' },
  ];

  return (
    <div className="glass-card rounded-xl p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileQuestion size={18} className="text-ice-blue" />
          <h3 className="font-display text-lg text-gradient">材料同步检测</h3>
        </div>
        {syncIssues.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs border bg-danger/20 text-danger border-danger/30">
            {syncIssues.length} 个问题
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {materials.map(m => (
          <div key={m.type} className="bg-bg-tertiary/40 rounded-lg p-2 text-center">
            <div className={`text-lg font-bold ${m.color}`}>{m.items.length}</div>
            <div className="text-xs text-text-muted">{m.type}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
        {syncIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info size={32} className="text-success/40 mb-2" />
            <p className="text-text-secondary text-sm">所有材料时间轴同步正常</p>
          </div>
        ) : (
          syncIssues.map(issue => (
            <div
              key={issue.id}
              className={`rounded-lg p-3 border ${severityBg[issue.severity]}`}
            >
              <div className="flex items-start gap-2 mb-2">
                {severityIcons[issue.severity]}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    {issue.description}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 uppercase tracking-wide">
                    {issue.type.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="bg-bg-primary/40 rounded p-2 space-y-1 mb-2">
                <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
                  <Clock size={12} />
                  涉及材料时间戳:
                </div>
                {issue.affectedMaterials.map(mat => (
                  <div key={mat.id} className="text-xs flex items-center gap-2">
                    <span className="text-text-secondary font-medium">{mat.name}</span>
                    <span className="text-text-muted">→</span>
                    <span className="text-text-primary font-mono">{formatDate(mat.timestamp)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-1.5 text-xs">
                <Lightbulb size={12} className="text-modified mt-0.5 shrink-0" />
                <span className="text-text-secondary">{issue.recommendation}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-ice-blue/20">
        <p className="text-xs text-text-muted">
          * 报告中已自动标注时间轴不同步所卡住的材料，便于甲方在只看最后报告时也能定位问题。
        </p>
      </div>
    </div>
  );
}
