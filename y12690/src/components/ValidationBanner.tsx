import { useApp } from '../context/AppContext';

export default function ValidationBanner() {
  const { activeRecord, getValidationIssues } = useApp();
  if (!activeRecord) return null;

  const issues = getValidationIssues(activeRecord.id);
  if (issues.length === 0) return null;

  const critical = issues.filter((i) => i.severity === 'critical');
  const warning = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="bg-tech-gray border-b border-gray-700 px-4 py-2 flex-shrink-0">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">模型预检</span>
        {critical.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-red-900/40 text-red-300 px-2.5 py-1 rounded border border-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {critical.length} 项严重问题（不可直接使用）
          </div>
        )}
        {warning.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-amber-900/40 text-amber-300 px-2.5 py-1 rounded border border-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {warning.length} 项警告（需评审复核）
          </div>
        )}
        <div className="flex-1" />
        <div className="text-xs text-gray-400">
          {issues.map((i, idx) => (
            <span key={idx} className="ml-3">
              • {i.description}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
