import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { BatchStatusBadge } from '@/components/StatusBadges';
import { FlaskConical, Clock, CheckCircle, AlertTriangle, Skull, ChevronRight, TrendingUp } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { batches, samples } = useAppStore();

  const totalBatches = batches.length;
  const pendingCount = batches.filter((b) => b.status === 'pending' || b.status === 'reviewing').length;
  const approvedCount = batches.filter((b) => b.status === 'approved').length;
  const needsReviewCount = batches.filter((b) => b.status === 'needs_review').length;
  const contaminatedCount = samples.filter((s) => s.status === 'contaminated').length;

  const statCards = [
    {
      label: '总批次数',
      value: totalBatches,
      icon: FlaskConical,
      gradient: 'from-abyss-500 to-abyss-700',
      bg: 'bg-abyss-50',
      textColor: 'text-abyss-700',
    },
    {
      label: '待复核',
      value: pendingCount,
      icon: Clock,
      gradient: 'from-amber-400 to-amber-600',
      bg: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      label: '已通过',
      value: approvedCount,
      icon: CheckCircle,
      gradient: 'from-moss-400 to-moss-600',
      bg: 'bg-moss-50',
      textColor: 'text-moss-700',
    },
    {
      label: '需再复核',
      value: needsReviewCount,
      icon: AlertTriangle,
      gradient: 'from-ember-400 to-ember-600',
      bg: 'bg-ember-50',
      textColor: 'text-ember-700',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-serif-cn font-bold text-abyss-900 mb-1">实验总览</h2>
        <p className="text-sm text-abyss-500">查看所有抗生素梯度实验批次的复核状态和统计概览</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className={`card-base p-5 relative overflow-hidden animate-fade-in-up stagger-${index + 1}`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${card.bg} -translate-y-8 translate-x-8 opacity-60`}></div>
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-soft`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-3xl font-bold text-abyss-900 mb-1">{card.value}</div>
              <div className={`text-sm ${card.textColor} font-medium`}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-base overflow-hidden animate-fade-in-up stagger-3">
        <div className="px-6 py-4 border-b border-abyss-100/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-abyss-800">批次列表</h3>
            <p className="text-xs text-abyss-500 mt-0.5">点击批次进入复核详情页</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-abyss-500">
            <Skull className="w-4 h-4 text-crimson-500" />
            <span>污染样本：{contaminatedCount} 个</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-ivory-50/80">
                <th className="table-header text-left px-6 py-3">批次名称</th>
                <th className="table-header text-left px-4 py-3">实验日期</th>
                <th className="table-header text-left px-4 py-3">批次效应</th>
                <th className="table-header text-left px-4 py-3">状态</th>
                <th className="table-header text-left px-4 py-3">复核人</th>
                <th className="table-header text-left px-4 py-3">污染样本</th>
                <th className="table-header text-right px-6 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-50">
              {batches.map((batch, index) => {
                const batchSamples = samples.filter((s) => s.batchId === batch.id);
                const contaminated = batchSamples.filter((s) => s.status === 'contaminated').length;

                return (
                  <tr
                    key={batch.id}
                    className="hover:bg-abyss-50/40 transition-colors cursor-pointer group"
                    style={{ animationDelay: `${index * 50 + 200}ms` }}
                    onClick={() => navigate(`/batch/${batch.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-abyss-100 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-abyss-600" />
                        </div>
                        <div>
                          <div className="font-medium text-abyss-800">{batch.name}</div>
                          <div className="text-xs text-abyss-500">{batch.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-abyss-700">{batch.date}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-abyss-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              batch.batchEffectScore >= 0.8
                                ? 'bg-moss-500'
                                : batch.batchEffectScore >= 0.7
                                ? 'bg-amber-500'
                                : 'bg-crimson-500'
                            }`}
                            style={{ width: `${batch.batchEffectScore * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-abyss-700">
                          {(batch.batchEffectScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <BatchStatusBadge status={batch.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-abyss-600">
                      {batch.reviewer || '-'}
                    </td>
                    <td className="px-4 py-4">
                      {contaminated > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm text-crimson-600 font-medium">
                          <Skull className="w-3.5 h-3.5" />
                          {contaminated} 个
                        </span>
                      ) : (
                        <span className="text-sm text-abyss-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-sm text-abyss-500 group-hover:text-abyss-700 transition-colors">
                        查看详情
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up stagger-5">
        <div className="card-base p-6">
          <h3 className="section-title flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-abyss-500" />
            快速说明
          </h3>
          <div className="space-y-3 text-sm text-abyss-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-moss-100 text-moss-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
              <p>批次效应得分在 75%-90% 之间为正常范围，说明实验重复性良好。</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-ember-100 text-ember-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
              <p>"需再复核"状态表示导师认为数据有疑问，需动物房管理员重新核对。</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-crimson-100 text-crimson-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
              <p>污染样本会被标记并从统计中剔除，但仍保留在样本清单中可追溯。</p>
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <h3 className="section-title flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-ember-500" />
            待处理事项
          </h3>
          <div className="space-y-3">
            {batches.filter((b) => b.status === 'pending' || b.status === 'needs_review').map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3 rounded-md bg-ivory-50 hover:bg-ivory-100/80 transition-colors cursor-pointer"
                onClick={() => navigate(`/batch/${batch.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    batch.status === 'needs_review' ? 'bg-ember-500 animate-pulse-soft' : 'bg-amber-500'
                  }`}></div>
                  <span className="text-sm text-abyss-700 font-medium">{batch.name}</span>
                </div>
                <BatchStatusBadge status={batch.status} />
              </div>
            ))}
            {batches.filter((b) => b.status === 'pending' || b.status === 'needs_review').length === 0 && (
              <p className="text-sm text-abyss-400 text-center py-4">暂无待处理事项</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
