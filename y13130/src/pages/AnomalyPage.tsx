import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import AnomalyTag from '@/components/AnomalyTag';
import { Ban, Divide, ArrowRight } from 'lucide-react';

export default function AnomalyPage() {
  const { getUniqueRecords } = useStore();
  const records = getUniqueRecords();
  const emptySetRecords = records.filter((r) => r.anomalyType === 'empty_set');
  const divZeroRecords = records.filter((r) => r.anomalyType === 'division_by_zero');

  return (
    <Layout title="异常隔离区">
      <div className="mb-6 card p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <div className="text-amber-600 mt-0.5">
            <Ban size={20} />
          </div>
          <div className="text-sm">
            <div className="font-bold text-amber-800">排班同事请注意</div>
            <div className="text-amber-700 text-xs mt-1">
              这里把除零边界与空集合单独拎出来了，不会混进正常结果统计。评审会沟通时直接引用本页截图即可。
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Divide className="text-amber-600" size={20} />
            <h2 className="font-display text-lg font-bold text-ink-900">除零边界</h2>
            <span className="text-xs text-ink-600">共 {divZeroRecords.length} 条</span>
          </div>
          <div className="space-y-3">
            {divZeroRecords.map((r) => (
              <div key={r.id} className="card p-4 border-amber-200 bg-amber-50/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-mono text-xs text-ink-700">{r.sampleId}</span>
                    <span className="mx-2 text-ink-400">·</span>
                    <span className="text-sm font-bold text-ink-900">{r.title}</span>
                  </div>
                  <AnomalyTag type="division_by_zero" size="sm" />
                </div>
                <pre className="text-[11px] font-mono bg-white rounded p-2 border border-paper-200 mb-2">
                  {r.rawInput}
                </pre>
                {r.anomalyDetail && (
                  <div className="text-xs text-amber-700 flex gap-1.5 mb-2">
                    <span>▸</span> {r.anomalyDetail}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-ink-600">
                    触发位置：极角排序 → 分母为零 → 返回 NaN
                  </span>
                  <Link to={`/sample/${r.id}`} className="btn-ghost !py-1 !px-3 text-xs text-ink-700">
                    查看详情 <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
            {divZeroRecords.length === 0 && (
              <div className="card p-6 text-center text-ink-600 text-sm">没有除零边界记录</div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Ban className="text-red-600" size={20} />
            <h2 className="font-display text-lg font-bold text-ink-900">空集合</h2>
            <span className="text-xs text-ink-600">共 {emptySetRecords.length} 条</span>
          </div>
          <div className="space-y-3">
            {emptySetRecords.map((r) => (
              <div key={r.id} className="card p-4 border-red-200 bg-red-50/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-mono text-xs text-ink-700">{r.sampleId}</span>
                    <span className="mx-2 text-ink-400">·</span>
                    <span className="text-sm font-bold text-ink-900">{r.title}</span>
                  </div>
                  <AnomalyTag type="empty_set" size="sm" />
                </div>
                <pre className="text-[11px] font-mono bg-white rounded p-2 border border-paper-200 mb-2">
                  {r.rawInput}
                </pre>
                {r.anomalyDetail && (
                  <div className="text-xs text-red-700 flex gap-1.5 mb-2">
                    <span>▸</span> {r.anomalyDetail}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-ink-600">
                    触发位置：points.length === 0 → 标记 empty_set
                  </span>
                  <Link to={`/sample/${r.id}`} className="btn-ghost !py-1 !px-3 text-xs text-ink-700">
                    查看详情 <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
            {emptySetRecords.length === 0 && (
              <div className="card p-6 text-center text-ink-600 text-sm">没有空集合记录</div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
