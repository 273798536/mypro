import { useChartStore } from '../../store/useChartStore';
import { Trash2, FileMusic, CheckCircle, AlertCircle } from 'lucide-react';
import { cn, formatTimestamp } from '../../utils';

export const ProjectSidebar = () => {
  const { projects, currentProjectId, setCurrentProject, deleteProject } = useChartStore();

  const getProjectStatus = (project: typeof projects[0]) => {
    if (project.issues.some(i => i.severity === 'critical')) {
      return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' };
    }
    if (project.issues.some(i => i.severity === 'warning')) {
      return { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/20' };
    }
    return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  };

  return (
    <div className="w-72 bg-slate-900/50 border-r border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200">项目列表</h2>
        <p className="text-xs text-slate-500 mt-1">共 {projects.length} 个谱面项目</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileMusic className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无项目</p>
            <p className="text-xs mt-1">请先导入谱面文件</p>
          </div>
        ) : (
          projects.map(project => {
            const status = getProjectStatus(project);
            const StatusIcon = status.icon;
            const isSelected = currentProjectId === project.id;

            return (
              <div
                key={project.id}
                className={cn(
                  'p-3 rounded-lg cursor-pointer transition-all duration-200 group',
                  isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/50'
                    : 'hover:bg-slate-800 border border-transparent'
                )}
                onClick={() => setCurrentProject(project.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', status.bg)}>
                        <StatusIcon className={cn('w-3 h-3', status.color)} />
                      </div>
                      <h3 className="text-sm font-medium text-slate-200 truncate">{project.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">{project.fileName}</p>
                    <p className="text-xs text-slate-600 mt-1">{formatTimestamp(project.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-slate-500">
                    Note: <span className="text-slate-300">{project.notes.length}</span>
                  </span>
                  <span className="text-slate-500">
                    问题: <span className="text-slate-300">{project.issues.length}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
