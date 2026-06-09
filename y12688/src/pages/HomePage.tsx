import { useNavigate } from 'react-router-dom';
import { useData } from '../store/DataContext';
import { StatusBadge, TypeBadge } from '../components/Badges';
import { formatDateTime } from '../utils/helpers';

export default function HomePage() {
  const navigate = useNavigate();
  const { stats, batches, records, filterRecords } = useData();

  const recentRecords = records.slice(0, 5);
  const abnormalRecords = filterRecords({ status: ['duplicate', 'conflict', 'missing_camera'] }).slice(0, 5);

  const statCards = [
    { label: '总记录数', value: stats.total, color: 'from-blue-500 to-blue-600', to: '/filter' },
    { label: '重复记录', value: stats.duplicate, color: 'from-yellow-500 to-amber-500', to: '/filter?status=duplicate' },
    { label: '数据冲突', value: stats.conflict, color: 'from-red-500 to-rose-600', to: '/filter?status=conflict' },
    { label: '相机视角丢失', value: stats.missingCamera, color: 'from-purple-500 to-violet-600', to: '/filter?status=missing_camera' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">参数联动 · 日常入口</h3>
            <p className="text-sm text-slate-500 mt-1">浮标阵列海况立体图 — 数据导入、异常筛选、剖切分析一站式工作台</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/import')}
              className="px-4 py-2 bg-deep-sea text-white rounded text-sm font-medium hover:bg-ocean-dark transition"
            >
              + 新建导入
            </button>
            <button
              onClick={() => navigate('/section')}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition"
            >
              剖切查看
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map(card => (
          <button
            key={card.label}
            onClick={() => navigate(card.to)}
            className="text-left bg-white rounded-lg p-4 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className={`inline-block px-2 py-1 rounded text-xs text-white bg-gradient-to-r ${card.color}`}>
              {card.label}
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-800">{card.value}</div>
            <div className="text-xs text-slate-400 mt-1">点击查看筛选结果 →</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700">最近导入批次</h4>
            <button className="text-xs text-tech-blue hover:underline" onClick={() => navigate('/import')}>
              全部批次
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {batches.slice(0, 5).map(batch => (
              <div key={batch.id} className="px-5 py-3 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{batch.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {batch.fileNames.join('、')} · {batch.recordCount} 条记录
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{formatDateTime(batch.importTime)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700">待复核异常记录</h4>
            <button className="text-xs text-tech-blue hover:underline" onClick={() => navigate('/filter')}>
              全部异常
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {abnormalRecords.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">暂无异常记录</div>
            ) : (
              abnormalRecords.map(r => (
                <div
                  key={r.id}
                  className="px-5 py-3 hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/detail/${r.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <TypeBadge type={r.type} />
                    <StatusBadge status={r.status} />
                    <span className="text-sm font-medium text-slate-800 ml-1 truncate flex-1">
                      {r.data.name || r.data.buoyId || r.data.deviceId || r.fileName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 flex justify-between">
                    <span className="truncate">来源: {r.fileName} · 行{r.originalLine}</span>
                    <span>{formatDateTime(r.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h4 className="text-sm font-semibold text-slate-700">近期数据变更</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">类型</th>
                <th className="text-left px-5 py-2.5 font-medium">标识</th>
                <th className="text-left px-5 py-2.5 font-medium">状态</th>
                <th className="text-left px-5 py-2.5 font-medium">来源文件</th>
                <th className="text-left px-5 py-2.5 font-medium">原始行号</th>
                <th className="text-left px-5 py-2.5 font-medium">更新时间</th>
                <th className="text-left px-5 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRecords.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3"><TypeBadge type={r.type} /></td>
                  <td className="px-5 py-3 text-slate-800 font-medium">
                    {r.data.name || r.data.buoyId || r.data.deviceId || '-'}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-slate-600 truncate max-w-[200px]">{r.fileName}</td>
                  <td className="px-5 py-3 text-slate-600 font-mono text-xs">{r.originalLine}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDateTime(r.updatedAt)}</td>
                  <td className="px-5 py-3">
                    <button
                      className="text-xs text-tech-blue hover:underline"
                      onClick={() => navigate(`/detail/${r.id}`)}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
