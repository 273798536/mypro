import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { SlowQuery } from '../types';

interface TopSlowQueriesTableProps {
  queries: SlowQuery[];
}

export default function TopSlowQueriesTable({ queries }: TopSlowQueriesTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">TOP 5 耗时最长查询</h3>
          <p className="text-sm text-gray-500 mt-1">
            按查询耗时降序排列，红标表示存在索引失效问题
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-600 rounded-l-lg">ID</th>
              <th className="px-3 py-2 font-medium text-gray-600">时间</th>
              <th className="px-3 py-2 font-medium text-gray-600">类型</th>
              <th className="px-3 py-2 font-medium text-gray-600">表名</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">耗时</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">扫描/返回</th>
              <th className="px-3 py-2 font-medium text-gray-600">索引</th>
              <th className="px-3 py-2 font-medium text-gray-600 rounded-r-lg">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {queries.map((q, idx) => {
              const ratio = (q.rowsExamined / Math.max(q.rowsSent, 1)).toFixed(1);
              const isBadRatio = parseFloat(ratio) > 100;
              const hasIndexFailure = q.indexFailure.detected;

              return (
                <tr
                  key={q.id}
                  className={`hover:bg-gray-50 ${hasIndexFailure ? 'bg-red-50/50' : ''}`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{q.id}</td>
                  <td className="px-3 py-2.5 text-gray-600">{q.timestamp}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                      q.queryType === 'SELECT' ? 'bg-blue-100 text-blue-700' :
                      q.queryType === 'UPDATE' ? 'bg-amber-100 text-amber-700' :
                      q.queryType === 'DELETE' ? 'bg-red-100 text-red-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {q.queryType}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 font-mono text-xs">{q.tableName}</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span className={`font-semibold ${
                      q.queryTime > 10 ? 'text-red-600' :
                      q.queryTime > 5 ? 'text-amber-600' :
                      'text-gray-700'
                    }`}>
                      {q.queryTime.toFixed(1)}s
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-mono ${isBadRatio ? 'text-red-600' : 'text-gray-600'}`}>
                      {q.rowsExamined.toLocaleString()} / {q.rowsSent.toLocaleString()}
                      <span className="ml-1 text-xs">({ratio}:1)</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {q.indexUsed ? (
                      <span className="text-xs font-mono text-green-600">{q.indexUsed}</span>
                    ) : (
                      <span className="text-xs text-red-500">无</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {hasIndexFailure ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        索引失效
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                        <CheckCircle className="w-3 h-3" />
                        正常
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2">表说：如何解读这张表</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <span className="font-medium">扫描/返回比</span>：正常应 &lt; 10:1，超过 100:1 标记为红色，说明查询效率极低</li>
          <li>• <span className="font-medium">耗时</span>：&gt; 10s 红色，&gt; 5s 橙色，需优先处理</li>
          <li>• <span className="font-medium">索引失效</span>：红色背景标记，已从汇总中单独拦截，详见下方索引失效列表</li>
          <li>• <span className="font-medium">效率评估</span>：扫描行数远大于返回行数时，通常意味着索引失效或查询写法有问题</li>
        </ul>
      </div>
    </div>
  );
}
