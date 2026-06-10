import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { SideBySideCompare } from '@/components/features/SideBySideCompare';
import { Timeline } from '@/components/features/Timeline';
import { MAPlot } from '@/components/charts/MAPlot';
import { VolcanoPlot } from '@/components/charts/VolcanoPlot';
import { useSampleStore } from '@/store/sampleStore';
import { formatNumber } from '@/utils/formatters';
import type { HistoryVersion, DiffAnalysis } from '@/types';

const HistoryCompare: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const sample = useSampleStore((state) => state.getSampleById(id || ''));
  const historyVersions = useSampleStore((state) =>
    state.getHistoryVersionsBySampleId(id || '')
  );
  const reviewRecords = useSampleStore((state) =>
    state.getReviewRecordsBySampleId(id || '')
  );
  const { before: diffBefore, after: diffAfter, impact } = useSampleStore((state) =>
    state.getDiffAnalysis(id || '')
  );

  const sortedVersions = useMemo(() => {
    return [...historyVersions].sort((a, b) => a.version - b.version);
  }, [historyVersions]);

  const [oldVersionId, setOldVersionId] = useState<string>(() => {
    return sortedVersions.length > 0 ? sortedVersions[0].id : '';
  });
  const [newVersionId, setNewVersionId] = useState<string>(() => {
    return sortedVersions.length > 0 ? sortedVersions[sortedVersions.length - 1].id : '';
  });

  const versionOptions = useMemo(() => {
    return sortedVersions.map((v) => ({
      value: v.id,
      label: `版本 ${v.version} - ${new Date(v.snapshotTime).toLocaleString()}`,
    }));
  }, [sortedVersions]);

  const oldVersion = useMemo(() => {
    return sortedVersions.find((v) => v.id === oldVersionId);
  }, [sortedVersions, oldVersionId]);

  const newVersion = useMemo(() => {
    return sortedVersions.find((v) => v.id === newVersionId);
  }, [sortedVersions, newVersionId]);

  const handleBack = () => {
    navigate(-1);
  };

  const statsRows = useMemo(() => {
    if (!diffBefore || !diffAfter) return [];
    return [
      {
        label: '差异基因数',
        icon: BarChart3,
        oldValue: diffBefore.diffGeneCount,
        newValue: diffAfter.diffGeneCount,
        change: diffAfter.diffGeneCount - diffBefore.diffGeneCount,
      },
      {
        label: '上调基因数',
        icon: TrendingUp,
        oldValue: diffBefore.upRegulated,
        newValue: diffAfter.upRegulated,
        change: diffAfter.upRegulated - diffBefore.upRegulated,
      },
      {
        label: '下调基因数',
        icon: TrendingUp,
        oldValue: diffBefore.downRegulated,
        newValue: diffAfter.downRegulated,
        change: diffAfter.downRegulated - diffBefore.downRegulated,
      },
      {
        label: '富集通路',
        icon: GitCompare,
        oldValue: diffBefore.topPathway,
        newValue: diffAfter.topPathway,
        isText: true,
        changed: diffBefore.topPathway !== diffAfter.topPathway,
      },
    ];
  }, [diffBefore, diffAfter]);

  if (!sample || sortedVersions.length < 2) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-paper-600 mb-4">样本不存在或历史版本不足</p>
          <Button onClick={handleBack} icon={<ArrowLeft size={16} />}>
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50">
      <div className="sticky top-0 z-10 bg-white border-b border-paper-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowLeft size={18} />}
                onClick={handleBack}
              >
                返回
              </Button>
              <div>
                <h1 className="text-xl font-serif-sc font-bold text-paper-900 flex items-center gap-2">
                  <GitCompare size={22} className="text-deep-sea-600" />
                  历史版本对比
                </h1>
                <p className="text-sm text-paper-500 mt-0.5">
                  样本ID：{sample.sampleId} · 批次：{sample.batchId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-64">
                <Select
                  label="旧版本"
                  value={oldVersionId}
                  onChange={(e) => setOldVersionId(e.target.value)}
                  options={versionOptions.filter((opt) => opt.value !== newVersionId)}
                />
              </div>
              <div className="text-paper-400 pt-5">
                <GitCompare size={20} />
              </div>
              <div className="w-64">
                <Select
                  label="新版本"
                  value={newVersionId}
                  onChange={(e) => setNewVersionId(e.target.value)}
                  options={versionOptions.filter((opt) => opt.value !== oldVersionId)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {oldVersion && newVersion && (
          <Card bordered>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare size={20} className="text-deep-sea-600" />
                字段对比详情
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SideBySideCompare
                before={oldVersion.snapshotData}
                after={newVersion.snapshotData}
                impact={impact}
              />
            </CardContent>
          </Card>
        )}

        {diffBefore && diffAfter && (
          <Card bordered>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} className="text-deep-sea-600" />
                差异分析图表对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-paper-50 rounded-lg p-4 border border-paper-200">
                    <p className="text-sm font-medium text-paper-600 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-paper-400" />
                      修改前（版本 {oldVersion?.version}）
                    </p>
                    <MAPlot data={diffBefore.maPlotData} title="MA图 - 修改前" height={300} />
                  </div>
                  <div className="bg-paper-50 rounded-lg p-4 border border-paper-200">
                    <VolcanoPlot data={diffBefore.volcanoData} title="火山图 - 修改前" height={300} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-moss-green-50 rounded-lg p-4 border border-moss-green-200">
                    <p className="text-sm font-medium text-moss-green-700 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-moss-green-500" />
                      修改后（版本 {newVersion?.version}）
                    </p>
                    <MAPlot data={diffAfter.maPlotData} title="MA图 - 修改后" height={300} />
                  </div>
                  <div className="bg-moss-green-50 rounded-lg p-4 border border-moss-green-200">
                    <VolcanoPlot data={diffAfter.volcanoData} title="火山图 - 修改后" height={300} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {diffBefore && diffAfter && (
          <Card bordered>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} className="text-deep-sea-600" />
                差异分析统计指标对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-paper-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-paper-600 w-32">指标</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-paper-600">修改前</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-paper-600 w-20">变化</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-paper-600">修改后</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsRows.map((row, index) => (
                      <tr key={index} className="border-b border-paper-100 last:border-b-0 hover:bg-paper-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <row.icon size={16} className="text-paper-400" />
                            <span className="text-sm text-paper-800">{row.label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.isText ? (
                            <span className={`text-sm ${row.changed ? 'line-through text-paper-400' : 'text-paper-700'}`}>
                              {row.oldValue}
                            </span>
                          ) : (
                            <span className="text-sm font-mono text-paper-700">
                              {formatNumber(row.oldValue as number)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!row.isText && (
                            <span className={`text-sm font-mono font-medium ${
                              (row.change as number) > 0
                                ? 'text-rust-red-600'
                                : (row.change as number) < 0
                                ? 'text-deep-sea-600'
                                : 'text-paper-400'
                            }`}>
                              {(row.change as number) > 0 ? '+' : ''}
                              {formatNumber(row.change as number)}
                            </span>
                          )}
                          {row.isText && row.changed && (
                            <span className="text-moss-green-600">
                              <GitCompare size={16} />
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.isText ? (
                            <span className={`text-sm font-medium ${row.changed ? 'text-moss-green-700' : 'text-paper-700'}`}>
                              {row.newValue}
                            </span>
                          ) : (
                            <span className="text-sm font-mono font-medium text-moss-green-700">
                              {formatNumber(row.newValue as number)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {impact && (
          <Card bordered className="bg-gradient-to-r from-deep-sea-50 to-moss-green-50 border-deep-sea-200">
            <CardHeader className="border-b-deep-sea-200">
              <CardTitle className="flex items-center gap-2 text-deep-sea-800">
                <TrendingUp size={20} />
                影响评估说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white/80 rounded-lg p-4 shadow-inner-soft">
                  <p className="text-xs text-paper-500 mb-1">差异基因数变化</p>
                  <p className="text-xl font-bold text-deep-sea-700 font-serif-sc">
                    {impact.geneCountChange}
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-4 shadow-inner-soft">
                  <p className="text-xs text-paper-500 mb-1">通路变化</p>
                  <p className="text-sm font-medium text-deep-sea-700 leading-tight">
                    {impact.pathwayChange}
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-4 shadow-inner-soft">
                  <p className="text-xs text-paper-500 mb-1">影响样本数</p>
                  <p className="text-xl font-bold text-deep-sea-700 font-serif-sc">
                    {impact.affectedSamples}
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-4 shadow-inner-soft">
                  <p className="text-xs text-paper-500 mb-1">节省成本</p>
                  <p className="text-xl font-bold text-moss-green-600 font-serif-sc">
                    ¥{impact.costSaved.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white/60 rounded-lg p-4">
                <p className="text-sm text-paper-700 leading-relaxed">
                  <span className="font-medium text-deep-sea-700">影响说明：</span>
                  {impact.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card bordered>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare size={20} className="text-deep-sea-600" />
              操作时间线
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline records={reviewRecords} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HistoryCompare;
