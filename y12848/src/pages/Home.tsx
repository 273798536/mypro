import { Link } from 'react-router-dom';
import { FlaskConical, CheckCircle2, Clock, AlertTriangle, FileCheck, Edit, ArrowRight } from 'lucide-react';
import { useEthicsStore, useFirstVisitExperience } from '../store/useEthicsStore';
import StatCard from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import TraceAnchor from '../components/TraceAnchor';
import DemoDataGuide from '../components/DemoDataGuide';

export default function Home() {
  useFirstVisitExperience();

  const samples = useEthicsStore((s) => s.samples);
  const getFilteredSamples = useEthicsStore((s) => s.getFilteredSamples);
  const duplicateLogs = useEthicsStore((s) => s.duplicateLogs);

  const totalSamples = samples.length;
  const approvedCount = samples.filter((s) => s.status === 'approved').length;
  const pendingCount = samples.filter((s) => s.status === 'pending' || s.status === 'reviewing').length;
  const duplicateCount = duplicateLogs.filter((d) => d.resolution === 'pending').length;

  const recentSamples = [...samples]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const pendingDuplicates = duplicateLogs.filter((d) => d.resolution === 'pending');

  return (
    <div className="space-y-8">
      <DemoDataGuide />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">样本质控</h2>
          <p className="text-gray-500 text-sm">日常入口 · 查看样本总览 · 进入伦理材料核对</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/ethics-review"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
          >
            <FileCheck className="w-4 h-4" />
            进入伦理核对
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard
          icon={FlaskConical}
          label="样本总数"
          value={totalSamples}
          color="primary"
          delay={0}
          trend="较上月 +12%"
          trendUp
        />
        <StatCard
          icon={CheckCircle2}
          label="已通过核对"
          value={approvedCount}
          color="emerald"
          delay={100}
          trend={`通过率 ${totalSamples > 0 ? Math.round((approvedCount / totalSamples) * 100) : 0}%`}
          trendUp
        />
        <StatCard
          icon={Clock}
          label="待复核"
          value={pendingCount}
          color="amber"
          delay={200}
          trend="需要及时处理"
          trendUp={false}
        />
        <StatCard
          icon={AlertTriangle}
          label="待处理重复"
          value={duplicateCount}
          color="rose"
          delay={300}
          trend={duplicateCount > 0 ? '需人工确认' : '全部已处理'}
          trendUp={false}
        />
      </div>

      {pendingDuplicates.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-semibold text-rose-800">检测到重复记录</h3>
              <p className="text-sm text-rose-600">
                共有 {pendingDuplicates.length} 组重复记录需要人工处理，避免同一件事出现两份结论
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingDuplicates.map((dup) => (
              <div
                key={dup.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-rose-700 font-medium">条码 {dup.sampleBarcode}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">
                    涉及 {dup.sampleIds.length} 条记录 · 类型：
                    {dup.duplicateType === 'barcode' ? '条码重复' : dup.duplicateType === 'import' ? '导入重复' : '补录重复'}
                  </span>
                </div>
                <Link
                  to="/ethics-review"
                  className="text-rose-600 hover:text-rose-700 font-medium text-xs"
                >
                  去处理 →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">最近更新的样本</h3>
          <Link
            to="/ethics-review"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            查看全部 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-zebra">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  样本条码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  采样地点
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  追溯信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  批次
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentSamples.map((sample) => (
                <tr key={sample.id} className="transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-900">{sample.barcode}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{sample.samplingLocation}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <TraceAnchor
                        type="row"
                        value={sample.originalRowNumber}
                        sampleId={sample.id}
                      />
                      <TraceAnchor
                        type="image"
                        value={sample.imageName}
                        sampleId={sample.id}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{sample.batchNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={sample.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {new Date(sample.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/ethics-review/${sample.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        复核
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white">
          <h3 className="font-serif text-lg font-bold mb-2">月底/课前人工修正检查</h3>
          <p className="text-primary-100 text-sm mb-4">
            定期检查人工修正是否能解释清楚，确保所有变更都有合理的追溯依据
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-primary-200">项待人工确认</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{duplicateCount}</p>
              <p className="text-xs text-primary-200">组重复待处理</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-3">快捷操作</h3>
          <div className="space-y-2">
            <Link
              to="/ethics-review"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-primary-600">
                    进入伦理材料核对
                  </p>
                  <p className="text-xs text-gray-500">查看统计图表和明细</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600" />
            </Link>
            <Link
              to="/supervisor-report"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-amber-600">
                    查看导师报告
                  </p>
                  <p className="text-xs text-gray-500">汇总报告与追溯链路</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
