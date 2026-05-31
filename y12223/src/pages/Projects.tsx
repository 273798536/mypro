import { useMemo } from 'react';
import { Film, Calendar, DollarSign, TrendingUp, CircleDot } from 'lucide-react';
import { useStore } from '../store/useStore';

const statusConfig = {
  active: { label: '进行中', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: '已完成', color: 'bg-slate-100 text-slate-700' },
  paused: { label: '暂停', color: 'bg-amber-100 text-amber-700' },
};

export default function Projects() {
  const { projects, bills } = useStore();

  const projectStats = useMemo(() => {
    return projects.map((project) => {
      const projectBills = bills.filter((b) => b.projectId === project.id);
      const usedAmount = projectBills.reduce((sum, b) => sum + b.amount, 0);
      const usageRate = (usedAmount / project.budgetTotal) * 100;
      
      return {
        ...project,
        usedAmount,
        usageRate,
        billCount: projectBills.length,
      };
    });
  }, [projects, bills]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">影片项目</h1>
        <p className="text-slate-500 mt-1">管理宣发项目预算及费用追踪</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {projectStats.map((project, index) => (
          <div
            key={project.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-900 p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Film className="w-6 h-6 text-white" />
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[project.status].color}`}
                >
                  {statusConfig[project.status].label}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{project.name}</h3>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    开始日期
                  </div>
                  <p className="font-semibold text-slate-800">{project.startDate}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-1">
                    <CircleDot className="w-4 h-4" />
                    账单数量
                  </div>
                  <p className="font-semibold text-slate-800">{project.billCount} 条</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                    <DollarSign className="w-4 h-4" />
                    预算使用
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-700">
                      {project.usageRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      project.usageRate >= 90
                        ? 'bg-rose-500'
                        : project.usageRate >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(project.usageRate, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-slate-500">
                    已用 ¥{project.usedAmount.toLocaleString()}
                  </span>
                  <span className="text-slate-500">
                    总预算 ¥{project.budgetTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-500">剩余预算</p>
                    <p
                      className={`text-lg font-bold ${
                        project.budgetTotal - project.usedAmount < 0
                          ? 'text-rose-600'
                          : 'text-slate-800'
                      }`}
                    >
                      ¥{(project.budgetTotal - project.usedAmount).toLocaleString()}
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-900 transition-colors">
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
