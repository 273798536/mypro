import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Upload,
  History,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';

export default function Home() {
  const navigate = useNavigate();
  const {
    projects,
    defectRecords,
    abnormalities,
    results,
    currentProjectId,
    createProject
  } = useAppStore();

  const totalRecords = Array.from(defectRecords.values()).reduce((sum, records) => sum + records.length, 0);
  const totalAbnormalities = Array.from(abnormalities.values()).reduce((sum, abs) => sum + abs.filter(a => a.status === 'pending').length, 0);
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  const quickActions = [
    {
      icon: PlusCircle,
      title: '新建分析',
      description: '创建新的质检项目',
      color: 'from-blue-500 to-blue-600',
      onClick: () => {
        createProject('新质检项目', '', {
          teamName: '质检一组',
          shift: '早班',
          supervisor: '张主管',
          members: ['李工', '王工', '赵工']
        });
        navigate('/workbench');
      }
    },
    {
      icon: Upload,
      title: '导入数据',
      description: '上传缺陷记录文件',
      color: 'from-emerald-500 to-emerald-600',
      onClick: () => navigate('/workbench')
    },
    {
      icon: History,
      title: '历史记录',
      description: '查看过往分析结果',
      color: 'from-violet-500 to-violet-600',
      onClick: () => navigate('/report')
    },
    {
      icon: FileText,
      title: '导出报告',
      description: '生成质检报告文档',
      color: 'from-amber-500 to-amber-600',
      onClick: () => navigate('/report')
    }
  ];

  const stats = [
    {
      label: '项目总数',
      value: projects.length,
      icon: FileText,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: '已完成分析',
      value: completedProjects,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      label: '缺陷记录',
      value: totalRecords,
      icon: TrendingUp,
      color: 'bg-violet-50 text-violet-600'
    },
    {
      label: '待处理异常',
      value: totalAbnormalities,
      icon: AlertCircle,
      color: 'bg-amber-50 text-amber-600'
    }
  ];

  const recentProjects = projects.slice(0, 5).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">质检面板</h1>
          <p className="text-slate-500 mt-1">欢迎使用卡方分布质检系统</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.color)}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="group bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all text-left"
            >
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform', action.color)}>
                <Icon size={24} className="text-white" />
              </div>
              <h3 className="font-semibold text-slate-800">{action.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{action.description}</p>
              <div className="flex items-center gap-1 mt-3 text-slate-400 group-hover:text-blue-600">
                <span className="text-xs font-medium">立即前往</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">最近项目</h2>
            <button
              onClick={() => navigate('/report')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              查看全部
            </button>
          </div>
          
          {recentProjects.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText size={48} className="mx-auto mb-3 text-slate-300" />
              <p>暂无项目</p>
              <p className="text-sm mt-1">点击"新建分析"开始您的第一个质检项目</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => {
                const projectRecords = defectRecords.get(project.id) || [];
                const projectResult = results.get(project.id);
                const projectAbnormalities = abnormalities.get(project.id) || [];
                
                return (
                  <div
                    key={project.id}
                    onClick={() => navigate('/workbench')}
                    className={cn(
                      'p-4 rounded-lg border cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50/30',
                      currentProjectId === project.id ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          project.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                        )} />
                        <span className="font-medium text-slate-800">{project.name}</span>
                      </div>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        project.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      )}>
                        {project.status === 'completed' ? '已完成' : '进行中'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{projectRecords.length} 条记录</span>
                      {projectResult && (
                        <span>χ² = {projectResult.chiSquareValue.toFixed(2)}</span>
                      )}
                      {projectAbnormalities.length > 0 && (
                        <span className="text-amber-600">{projectAbnormalities.length} 个异常</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      更新于 {new Date(project.updatedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">系统提示</h2>
          
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">幂等性保证</h4>
                  <p className="text-xs text-blue-600 mt-1">同一批数据多次运行结果一致，不会越跑越乱</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-emerald-800">智能归类</h4>
                  <p className="text-xs text-emerald-600 mt-1">基于缺陷记录、产品批次、抽检数量自动关联项目</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={16} className="text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-amber-800">异常追溯</h4>
                  <p className="text-xs text-amber-600 mt-1">样本过少、类别合并、批次混入都能追溯到具体材料</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
