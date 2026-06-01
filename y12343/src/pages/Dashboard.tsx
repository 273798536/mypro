import { useStore } from '@/store';
import {
  CircuitBoard,
  Zap,
  FileBarChart,
  AlertTriangle,
  Clock,
  ChevronRight,
  TrendingUp,
  History,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { coils, magneticSequences, reports, history } = useStore();

  const criticalReports = reports.filter(r => r.hasMissingTurns || r.hasTimeUnitError);
  const recentReports = reports.slice(0, 5);
  const recentHistory = history.slice(0, 5);

  const stats = [
    {
      label: '线圈数量',
      value: coils.length,
      icon: CircuitBoard,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: '磁场序列',
      value: magneticSequences.length,
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: '测算报告',
      value: reports.length,
      icon: FileBarChart,
      color: 'from-green-500 to-green-600',
    },
    {
      label: '异常报告',
      value: criticalReports.length,
      icon: AlertTriangle,
      color: criticalReports.length > 0 ? 'from-red-500 to-red-600' : 'from-gray-500 to-gray-600',
      pulse: criticalReports.length > 0,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">数据概览</h1>
          <p className="text-primary-300 mt-1">电磁感应线圈测算系统仪表盘</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-300">
          <Clock className="w-4 h-4" />
          <span>最后更新: {new Date().toLocaleString('zh-CN')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`card card-hover p-6 ${stat.pulse ? 'animate-glow' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-primary-300 text-sm">{stat.label}</p>
                <p className="text-4xl font-bold text-white mt-2 font-mono">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-primary-400" />
              最近报告
            </h2>
            <Link to="/reports" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentReports.length === 0 ? (
            <div className="text-center py-8 text-primary-400">
              <FileBarChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无测算报告</p>
              <p className="text-sm mt-1">创建线圈和磁场序列后可生成报告</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReports.map(report => (
                <Link
                  key={report.id}
                  to={`/reports/${report.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-bg/50 hover:bg-primary-600/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      report.hasMissingTurns ? 'bg-accent-error animate-pulse' :
                      report.hasFluxReversal ? 'bg-accent-warning' : 'bg-accent-success'
                    }`} />
                    <div>
                      <p className="text-white font-medium">{report.name}</p>
                      <p className="text-xs text-primary-400">
                        {new Date(report.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.hasMissingTurns && (
                      <span className="badge-error">匝数缺失</span>
                    )}
                    {report.hasFluxReversal && (
                      <span className="badge-warning">磁通反向</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-primary-400 group-hover:text-primary-300 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-400" />
              操作历史
            </h2>
            <Link to="/history" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentHistory.length === 0 ? (
            <div className="text-center py-8 text-primary-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无操作记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentHistory.map(record => (
                <div
                  key={record.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-dark-bg/50"
                >
                  <div className={`w-2 h-2 mt-1.5 rounded-full ${
                    record.operationType === 'supplement' ? 'bg-accent-warning' :
                    record.operationType === 'delete' ? 'bg-accent-error' :
                    'bg-accent-info'
                  }`} />
                  <div className="flex-1">
                    <p className="text-white text-sm">{record.operationDetail}</p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      {record.operator} · {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          快捷操作
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/coils"
            className="p-4 rounded-lg bg-dark-bg/50 hover:bg-primary-600/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600/30 flex items-center justify-center group-hover:bg-primary-600/50 transition-colors">
                <CircuitBoard className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-white font-medium">管理线圈参数</p>
                <p className="text-xs text-primary-400">添加或编辑线圈信息</p>
              </div>
            </div>
          </Link>
          <Link
            to="/magnetic"
            className="p-4 rounded-lg bg-dark-bg/50 hover:bg-primary-600/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/30 flex items-center justify-center group-hover:bg-purple-600/50 transition-colors">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">导入磁场数据</p>
                <p className="text-xs text-primary-400">录入或补录磁场序列</p>
              </div>
            </div>
          </Link>
          <Link
            to="/replay"
            className="p-4 rounded-lg bg-dark-bg/50 hover:bg-primary-600/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/30 flex items-center justify-center group-hover:bg-green-600/50 transition-colors">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">曲线回放分析</p>
                <p className="text-xs text-primary-400">可视化分析实验数据</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
