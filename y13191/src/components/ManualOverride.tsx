import React from 'react';
import { UserCheck, TrendingDown, TrendingUp, AlertOctagon } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { getOverrideStatistics, getInconsistentRecords } from '../utils/overrideAnalysis';

const ManualOverride: React.FC = () => {
  const { overrideAnalysis, rawLogs, resultsA } = useAnalysisStore();

  if (rawLogs.length === 0 || resultsA.length === 0) {
    return null;
  }

  const stats = getOverrideStatistics(overrideAnalysis);
  const inconsistentRecords = getInconsistentRecords(overrideAnalysis);

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-blue-900" />
        人工改判影响分析
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-500">总记录数</div>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.noOverride}</div>
          <div className="text-xs text-blue-500">无人工备注</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-sm text-center">
          <div className="text-2xl font-bold text-green-600">{stats.consistent}</div>
          <div className="text-xs text-green-500">判定一致</div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-center">
          <div className="text-2xl font-bold text-red-600">{stats.inconsistent}</div>
          <div className="text-xs text-red-500">判定不一致</div>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-sm text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingDown className="w-5 h-5 text-orange-600" />
            <span className="text-2xl font-bold text-orange-600">{stats.warningToNormal}</span>
          </div>
          <div className="text-xs text-orange-500">预警→正常</div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-sm text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-purple-600">{stats.normalToWarning}</span>
          </div>
          <div className="text-xs text-purple-500">正常→预警</div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.overrideRate}%</div>
          <div className="text-xs text-amber-500">改判率</div>
        </div>
      </div>

      {stats.inconsistent > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm mb-6">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 mb-2">改判影响说明</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {stats.warningToNormal > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">⚠️</span>
                    <span>
                      <strong>{stats.warningToNormal} 条"预警→正常"改判</strong>：
                      自动判定为预警，但人工改为正常。可能原因：传感器漂移、瞬时干扰等。
                      <strong className="text-orange-600">存在漏检风险</strong>，建议重点复核。
                    </span>
                  </li>
                )}
                {stats.normalToWarning > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">🔍</span>
                    <span>
                      <strong>{stats.normalToWarning} 条"正常→预警"改判</strong>：
                      自动判定为正常，但人工改为预警。可能原因：算法阈值设置过高、特殊工况等。
                      <strong className="text-purple-600">建议优化阈值参数</strong>。
                    </span>
                  </li>
                )}
                <li className="text-sm text-red-600 mt-2">
                  改判影响总分：<strong>{stats.totalImpactScore} 分</strong>
                  （每次改判+1分，分值越高表示人工干预程度越大）
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {inconsistentRecords.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-800 mb-3">不一致记录详情</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium w-16">行号</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">设备编号</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">自动判定</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">人工判定</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">改判方向</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">人工备注</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">操作人</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">影响</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {inconsistentRecords.map((record) => {
                  const isWarningToNormal =
                    record.autoJudgement === 'warning' && record.manualJudgement === 'normal';
                  const isNormalToWarning =
                    record.autoJudgement === 'normal' && record.manualJudgement === 'warning';

                  return (
                    <tr
                      key={record.logId}
                      className={`border-t border-gray-100 ${
                        isWarningToNormal ? 'bg-orange-50' : 'bg-purple-50'
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-500">{record.rawLineNumber}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{record.deviceId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            record.autoJudgement === 'warning'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {record.autoJudgement === 'warning' ? '🔴 预警' : '🟢 正常'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            record.manualJudgement === 'warning'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {record.manualJudgement === 'warning' ? '🔴 预警' : '🟢 正常'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            isWarningToNormal
                              ? 'bg-orange-200 text-orange-800'
                              : 'bg-purple-200 text-purple-800'
                          }`}
                        >
                          {isWarningToNormal ? (
                            <>
                              <TrendingDown className="w-3 h-3" />
                              预警→正常
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              正常→预警
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-xs">
                        {record.manualRemark ? `"${record.manualRemark}"` : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{record.operator || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-md">
                        {record.impactDescription}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.inconsistent === 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-sm flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-green-500" />
          <div>
            <p className="font-medium text-green-800">自动判定与人工判定一致性良好</p>
            <p className="text-sm text-green-600">
              所有有备注的记录中，人工判定与自动判定结果一致，算法准确率较高。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualOverride;
