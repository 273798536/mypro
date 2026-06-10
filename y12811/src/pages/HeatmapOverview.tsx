import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FlaskConical, 
  ClipboardCheck, 
  FileBarChart,
  ArrowRight,
  Activity,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { samples, abundanceData, cultureRecords, reviews } from '@/data';

export default function HeatmapOverview() {
  const totalSamples = samples.length;
  const totalMicrobes = abundanceData.length;
  const pendingReviews = reviews.filter(r => r.status === 'pending').length;
  const cultureCount = cultureRecords.length;

  const stats = [
    {
      label: '样本总数',
      value: totalSamples,
      icon: Activity,
      color: 'text-teal-400',
      bgColor: 'bg-teal-400/10',
    },
    {
      label: '微生物检测',
      value: totalMicrobes,
      icon: FlaskConical,
      color: 'text-lab-400',
      bgColor: 'bg-lab-400/10',
    },
    {
      label: '待复核',
      value: pendingReviews,
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
    {
      label: '培养记录',
      value: cultureCount,
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
  ];

  const quickLinks = [
    { label: '热图分析', path: '/heatmap', icon: LayoutDashboard, desc: '查看微生物丰度热图' },
    { label: '培养记录', path: '/culture-records', icon: FlaskConical, desc: '管理培养记录数据' },
    { label: '复核中心', path: '/review-center', icon: ClipboardCheck, desc: '处理待复核项目' },
    { label: '综合报告', path: '/report', icon: FileBarChart, desc: '生成分析报告' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">热图总览</h2>
        <p className="text-lab-400 mt-1">欢迎使用微生物丰度热图分析平台</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="glass-card p-5 rounded-xl transition-all duration-300 hover:border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lab-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickLinks.map((link, index) => (
          <Link
            key={index}
            to={link.path}
            className="glass-card p-5 rounded-xl transition-all duration-300 hover:border-teal-400/30 hover:bg-white/5 group"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-teal-400/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-400/20 transition-colors duration-200">
                <link.icon className="w-5 h-5 text-teal-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">{link.label}</h3>
                  <ArrowRight className="w-4 h-4 text-lab-400 group-hover:text-teal-400 group-hover:translate-x-1 transition-all duration-200" />
                </div>
                <p className="text-lab-400 text-sm mt-1">{link.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="glass-card p-6 rounded-xl">
        <h3 className="text-white font-medium mb-4">平台功能</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <h4 className="text-white font-medium mb-2">丰度热图分析</h4>
            <p className="text-lab-400 text-sm">直观展示样本中微生物丰度分布，支持交互式探索和多维度筛选</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <h4 className="text-white font-medium mb-2">培养记录管理</h4>
            <p className="text-lab-400 text-sm">完整记录微生物培养过程，支持版本追溯和变更历史</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <h4 className="text-white font-medium mb-2">质量复核流程</h4>
            <p className="text-lab-400 text-sm">规范化的复核审批流程，确保数据准确性和可追溯性</p>
          </div>
        </div>
      </div>
    </div>
  );
}
