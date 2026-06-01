import { useNavigate } from 'react-router-dom';
import { Calculator, Layers, BarChart3, History, ArrowRight, Waves } from 'lucide-react';
import { useDopplerStore } from '../store/useDopplerStore';

export function Home() {
  const navigate = useNavigate();
  const { records } = useDopplerStore();

  const stats = {
    total: records.length,
    normal: records.filter(r => r.status === 'normal').length,
    pending: records.filter(r => r.status === 'pending').length,
    error: records.filter(r => r.status === 'error').length
  };

  const features = [
    {
      icon: Calculator,
      title: '单条计算',
      description: '支持分步输入，发射频率先到，接收频率后补，不覆盖已有判断',
      action: () => navigate('/single'),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Layers,
      title: '批量计算',
      description: '批量导入实验数据，自动分类正常、待确认、异常结果',
      action: () => navigate('/batch'),
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: BarChart3,
      title: '结果分析',
      description: '分类查看计算结果，支持导出完整数据和原因说明',
      action: () => navigate('/results'),
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: History,
      title: '历史记录',
      description: '持久化存储，重启不丢失，自动去重防止重复结论',
      action: () => navigate('/history'),
      color: 'from-emerald-500 to-teal-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Waves className="w-4 h-4" />
            物理教学辅助工具
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            多普勒测速教具
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            把抽象的多普勒公式变成可视化的计算工具，连接数据来源、判断逻辑和计算结果。
            支持批量处理实验数据，分步补录不覆盖，状态分类清晰明了。
          </p>
        </div>

        {stats.total > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-12 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-xs text-slate-500">总记录</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.normal}</div>
              <div className="text-xs text-emerald-600">正常</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-xs text-amber-600">待确认</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.error}</div>
              <div className="text-xs text-red-600">异常</div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <button
              key={index}
              onClick={feature.action}
              className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {feature.description}
              </p>
              <div className="flex items-center gap-1 text-blue-600 text-sm font-medium group-hover:gap-2 transition-all">
                开始使用
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">核心特性</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-slate-900">双向换算</h4>
                <p className="text-sm text-slate-600">频移→速度，速度→频移，单位实时校验</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-slate-900">分步补录</h4>
                <p className="text-sm text-slate-600">发射频率先到，接收频率后补，不覆盖判断</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-slate-900">状态分类</h4>
                <p className="text-sm text-slate-600">正常/待确认/异常，原因清晰可查</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">4</span>
              </div>
              <div>
                <h4 className="font-medium text-slate-900">持久存储</h4>
                <p className="text-sm text-slate-600">重启不丢失，自动去重防止重复结论</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
