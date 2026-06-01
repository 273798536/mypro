import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { History, GitCompare, Trash2, Eye, ArrowRight, Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CalculationVersion, VersionComparison } from '../../shared/types';
import { api } from '../utils/api';

export function VersionTracker() {
  const versions = useAppStore((state) => state.versions);
  const loadVersions = useAppStore((state) => state.loadVersions);
  const deleteVersion = useAppStore((state) => state.deleteVersion);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);

  useEffect(() => {
    loadVersions();
  }, []);

  const toggleVersionSelect = (id: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
    setComparison(null);
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;

    try {
      const result = await api.versions.compare(selectedVersions[0], selectedVersions[1]);
      if ('error' in result) {
        throw new Error(result.error as string);
      }
      setComparison(result);
    } catch (err) {
      console.error('对比失败:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityCount = (version: CalculationVersion) => ({
    error: version.warnings.filter((w) => w.severity === 'error').length,
    warning: version.warnings.filter((w) => w.severity === 'warning').length,
    info: version.warnings.filter((w) => w.severity === 'info').length,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-7 h-7 text-brand" />
            版本追踪
          </h2>
          <p className="text-slate-500 mt-1">查看历史核算版本，对比差异</p>
        </div>
        {selectedVersions.length === 2 && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleCompare}
          >
            <GitCompare className="w-4 h-4" />
            对比选中版本
          </button>
        )}
      </div>

      {comparison && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-brand" />
              版本对比
            </h3>
            <button
              className="btn-secondary text-sm"
              onClick={() => setComparison(null)}
            >
              关闭对比
            </button>
          </div>
          <VersionComparisonView comparison={comparison} />
        </div>
      )}

      <div className="space-y-3">
        {versions.length === 0 ? (
          <div className="card p-12 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">暂无核算版本</p>
            <p className="text-sm text-slate-400 mt-1">去核算工作台创建第一个版本吧</p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-4">
              去核算 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          versions.map((version) => {
            const severity = getSeverityCount(version);
            const isSelected = selectedVersions.includes(version.id);

            return (
              <div
                key={version.id}
                className={`card card-hover p-4 transition-all ${
                  isSelected ? 'ring-2 ring-brand ring-offset-2' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-brand rounded"
                    checked={isSelected}
                    onChange={() => toggleVersionSelect(version.id)}
                    disabled={!isSelected && selectedVersions.length >= 2}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                          {version.name}
                          {version.note && (
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {version.note}
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(version.createdAt)}
                          </span>
                          <span className="font-mono">
                            电费: ¥{version.totalBill.toFixed(2)}
                          </span>
                          <span className="font-mono">
                            计算: ¥{version.calculatedTotal.toFixed(2)}
                          </span>
                          <span className="font-mono">
                            用量: {version.totalCalculatedKwh.toFixed(2)}kWh
                          </span>
                          {Math.abs(version.discrepancy) > 0.01 && (
                            <span className="text-amber-600 font-mono">
                              差异: ¥{Math.abs(version.discrepancy).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {severity.error > 0 && (
                            <span className="badge-error flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {severity.error}
                            </span>
                          )}
                          {severity.warning > 0 && (
                            <span className="badge-warning flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {severity.warning}
                            </span>
                          )}
                          {severity.info > 0 && (
                            <span className="badge-info flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              {severity.info}
                            </span>
                          )}
                          {version.warnings.length === 0 && (
                            <span className="badge-success flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              无异常
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Link
                            to={`/trace/${version.id}`}
                            className="p-2 text-slate-500 hover:text-brand hover:bg-slate-100 rounded transition-colors"
                            title="查看溯源"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 rounded transition-colors"
                            title="删除"
                            onClick={() => deleteVersion(version.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex-1 flex gap-2">
                        {version.tierResults.map((tier, idx) => (
                          <div
                            key={tier.tierId}
                            className="text-xs bg-slate-50 px-2 py-1 rounded"
                          >
                            <span className="text-slate-500">{tier.tierName}:</span>{' '}
                            <span className="font-mono font-medium text-slate-700">
                              {tier.billedKwh.toFixed(1)}kWh
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface VersionComparisonViewProps {
  comparison: VersionComparison;
}

function VersionComparisonView({ comparison }: VersionComparisonViewProps) {
  const { versionA, versionB, differences, tierDifferences } = comparison;

  const formatField = (field: string) => {
    const labels: Record<string, string> = {
      totalBill: '实际总电费',
      calculatedTotal: '计算总电费',
      discrepancy: '差异金额',
      totalCalculatedKwh: '计算总用量',
      tariffTableId: '电价表ID',
      usageRecordId: '用电记录ID',
      billedKwh: '结算电量',
      billedAmount: '电费金额',
      pricePerKwh: '电价',
      exists: '是否存在',
    };
    return labels[field] || field;
  };

  const formatValue = (value: unknown, field: string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && ['totalBill', 'calculatedTotal', 'discrepancy', 'billedAmount'].includes(field)) {
      return `¥${value.toFixed(2)}`;
    }
    if (typeof value === 'number' && ['totalCalculatedKwh', 'billedKwh', 'pricePerKwh'].includes(field)) {
      return `${value.toFixed(2)}${field === 'pricePerKwh' ? '元/kWh' : 'kWh'}`;
    }
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    return String(value);
  };

  const getTierName = (tierId: string) => {
    const tierA = versionA.tierResults.find((t) => t.tierId === tierId);
    const tierB = versionB.tierResults.find((t) => t.tierId === tierId);
    return tierA?.tierName || tierB?.tierName || tierId;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <h5 className="font-medium text-slate-700 mb-2">版本 A</h5>
          <p className="text-sm text-slate-600">{versionA.name}</p>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(versionA.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <h5 className="font-medium text-slate-700 mb-2">版本 B</h5>
          <p className="text-sm text-slate-600">{versionB.name}</p>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(versionB.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      {differences.length === 0 && tierDifferences.length === 0 ? (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg text-center">
          <CheckCircle className="w-5 h-5 mx-auto mb-2" />
          两个版本完全一致
        </div>
      ) : (
        <>
          {differences.length > 0 && (
            <div>
              <h5 className="font-medium text-slate-700 mb-3">主要差异</h5>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead className="table-header">
                    <tr>
                      <th className="table-cell text-left">字段</th>
                      <th className="table-cell text-right">版本 A</th>
                      <th className="table-cell text-right">版本 B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {differences.map((diff, idx) => (
                      <tr key={idx} className="bg-amber-50/50">
                        <td className="table-cell font-medium text-slate-700">
                          {formatField(diff.field)}
                        </td>
                        <td className="table-cell text-right font-mono">
                          {formatValue(diff.valueA, diff.field)}
                        </td>
                        <td className="table-cell text-right font-mono">
                          {formatValue(diff.valueB, diff.field)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tierDifferences.length > 0 && (
            <div>
              <h5 className="font-medium text-slate-700 mb-3">档位差异</h5>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead className="table-header">
                    <tr>
                      <th className="table-cell text-left">档位</th>
                      <th className="table-cell text-left">字段</th>
                      <th className="table-cell text-right">版本 A</th>
                      <th className="table-cell text-right">版本 B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tierDifferences.map((diff, idx) => (
                      <tr key={idx} className="bg-amber-50/50">
                        <td className="table-cell font-medium text-slate-700">
                          {getTierName(diff.tierId)}
                        </td>
                        <td className="table-cell text-slate-600">
                          {formatField(diff.field)}
                        </td>
                        <td className="table-cell text-right font-mono">
                          {formatValue(diff.valueA, diff.field)}
                        </td>
                        <td className="table-cell text-right font-mono">
                          {formatValue(diff.valueB, diff.field)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
