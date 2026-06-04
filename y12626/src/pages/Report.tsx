import React, { useMemo } from 'react';
import { FileText, AlertTriangle, CheckCircle, XCircle, MapPin, User, Calendar, Download, Printer } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useDataExport } from '../hooks/useDataExport';
import { formatDateTime } from '../utils/coordinate';

const Report: React.FC = () => {
  const trackPoints = useAppStore(state => state.trackPoints);
  const sourceMaterials = useAppStore(state => state.sourceMaterials);
  const currentBatch = useAppStore(state => state.currentBatch);
  const getQualityMetrics = useAppStore(state => state.getQualityMetrics);
  const dataVersion = useAppStore(state => state.dataVersion);
  const reviewStatus = useAppStore(state => state.reviewStatus);
  const { exportReport, exportCSV, exportExcel } = useDataExport();

  const metrics = useMemo(() => getQualityMetrics(), [getQualityMetrics, dataVersion]);

  const boundaryCollisions = useMemo(() => {
    return trackPoints.filter(p => p.boundaryCollision);
  }, [trackPoints, dataVersion]);

  const colorInvalid = useMemo(() => {
    return trackPoints.filter(p => p.status === 'color-invalid');
  }, [trackPoints, dataVersion]);

  const missingUnit = useMemo(() => {
    return trackPoints.filter(p => p.status === 'missing-unit');
  }, [trackPoints, dataVersion]);

  const supplementary = useMemo(() => {
    return trackPoints.filter(p => p.status === 'supplementary');
  }, [trackPoints, dataVersion]);

  const materialsWithIssues = useMemo(() => {
    return sourceMaterials.map(mat => {
      const matPoints = trackPoints.filter(p => p.sourceMaterial === mat.id);
      const boundaryIssues = matPoints.filter(p => p.boundaryCollision);
      const otherIssues = matPoints.filter(p => p.status !== 'normal' && !p.boundaryCollision);
      return {
        ...mat,
        total: matPoints.length,
        boundaryIssues: boundaryIssues.length,
        otherIssues: otherIssues.length,
        hasIssue: boundaryIssues.length > 0 || otherIssues.length > 0,
        points: matPoints
      };
    }).sort((a, b) => (b.boundaryIssues + b.otherIssues) - (a.boundaryIssues + a.otherIssues));
  }, [sourceMaterials, trackPoints, dataVersion]);

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      'pending': <AlertTriangle className="w-5 h-5 text-rattan-500" />,
      'submitted': <CheckCircle className="w-5 h-5 text-azure-500" />,
      'approved': <CheckCircle className="w-5 h-5 text-azure-600" />,
      'rejected': <XCircle className="w-5 h-5 text-cinnabar-500" />,
    };
    return icons[status] || icons['pending'];
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'pending': '待提交',
      'submitted': '已提交复核',
      'approved': '复核通过',
      'rejected': '复核驳回',
    };
    return texts[status] || status;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-xuan-50 border-2 border-ochre-400 rounded-lg shadow-card overflow-hidden">
        <div className="bg-xuan-100 border-b-2 border-ochre-400 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-ochre-600" />
            <div>
              <h1 className="brush-font text-2xl text-ink-600">训练员复核报告</h1>
              <p className="text-sm text-ochre-600 font-serif">
                报告生成时间：{formatDateTime(Date.now())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-ochre-300">
              {getStatusIcon(reviewStatus)}
              <span className="text-sm font-serif text-ink-600">{getStatusText(reviewStatus)}</span>
            </div>
            <button
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2 bg-ochre-500 text-white rounded hover:bg-ochre-600 text-sm"
            >
              <Download className="w-4 h-4" />
              导出报告
            </button>
            <button
              onClick={() => exportExcel()}
              className="flex items-center gap-2 px-4 py-2 bg-azure-500 text-white rounded hover:bg-azure-600 text-sm"
            >
              <Printer className="w-4 h-4" />
              导出明细
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white border border-ochre-300 rounded-lg p-4">
            <h2 className="font-serif text-lg text-ink-600 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-ochre-600" />
              批次信息
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-ochre-600 mb-1">批次名称</p>
                <p className="font-serif text-ink-600">{currentBatch?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-ochre-600 mb-1">操作人员</p>
                <p className="font-serif text-ink-600">{currentBatch?.operator || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-ochre-600 mb-1">创建时间</p>
                <p className="font-serif text-ink-600">{currentBatch ? formatDateTime(currentBatch.createTime) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-ochre-600 mb-1">数据版本</p>
                <p className="font-serif text-ink-600">v{dataVersion}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-ochre-300 rounded-lg p-4">
            <h2 className="font-serif text-lg text-ink-600 mb-3">数据质量指标</h2>
            <div className="grid grid-cols-6 gap-3">
              <div className="text-center p-3 bg-xuan-50 rounded">
                <div className="text-3xl font-serif text-ink-600">{metrics.totalPoints}</div>
                <div className="text-xs text-ochre-600">总点数</div>
              </div>
              <div className="text-center p-3 bg-xuan-50 rounded">
                <div className="text-3xl font-serif text-azure-600">{metrics.normalCount}</div>
                <div className="text-xs text-ochre-600">正常</div>
              </div>
              <div className="text-center p-3 bg-xuan-50 rounded">
                <div className="text-3xl font-serif text-cinnabar-600">{metrics.anomalyCount}</div>
                <div className="text-xs text-ochre-600">异常</div>
              </div>
              <div className="text-center p-3 bg-xuan-50 rounded">
                <div className="text-3xl font-serif text-azure-600">{metrics.completeness}%</div>
                <div className="text-xs text-ochre-600">完整率</div>
              </div>
              <div className="text-center p-3 bg-xuan-50 rounded">
                <div className="text-3xl font-serif text-azure-600">{metrics.accuracy}%</div>
                <div className="text-xs text-ochre-600">准确率</div>
              </div>
              <div className="text-center p-3 bg-xuan-50 rounded">
                <div className="text-3xl font-serif text-cinnabar-600">{metrics.anomalyRate}%</div>
                <div className="text-xs text-ochre-600">异常率</div>
              </div>
            </div>
          </div>

          <div className="border-2 border-cinnabar-400 rounded-lg overflow-hidden">
            <div className="bg-cinnabar-500 text-white px-4 py-2 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <h2 className="font-serif text-lg">边界碰撞误判详情</h2>
              <span className="bg-white text-cinnabar-600 px-2 py-0.5 rounded text-sm ml-2">
                共 {boundaryCollisions.length} 条
              </span>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-auto bg-white">
              {boundaryCollisions.length === 0 ? (
                <p className="text-center text-ochre-600 py-4">暂无边界碰撞问题</p>
              ) : (
                boundaryCollisions.map(point => {
                  const mat = sourceMaterials.find(m => m.id === point.sourceMaterial);
                  return (
                    <div
                      key={point.id}
                      className="border border-cinnabar-200 bg-cinnabar-50 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-serif text-ink-600">点号：{point.id.slice(-8)}</span>
                          <span className="text-xs text-ochre-600 ml-3">
                            坐标：{point.originalLng.toFixed(6)}, {point.originalLat.toFixed(6)}
                          </span>
                        </div>
                        <span className="text-xs bg-rattan-100 text-rattan-700 px-2 py-0.5 rounded">
                          {point.operator}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-cinnabar-700">
                          <MapPin className="w-4 h-4" />
                          {point.boundaryCollision?.boundaryName}
                        </span>
                        <span className="text-cinnabar-700">
                          {point.boundaryCollision?.type === 'inside' ? '进入保护区' : '靠近边界'} ·
                          距离 {Math.abs(point.boundaryCollision?.distance || 0).toFixed(1)}米
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-cinnabar-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ochre-600">材料来源：</span>
                          <span className="text-xs bg-ochre-100 text-ochre-700 px-2 py-0.5 rounded font-serif">
                            {mat?.name || point.sourceMaterial}
                          </span>
                          <span className="text-xs text-ochre-500 ml-2">
                            （{mat?.description || '材料描述'}）
                          </span>
                        </div>
                        {point.reviewConclusion?.reviewed && (
                          <span className="text-xs text-azure-600">
                            已复核：{point.reviewConclusion.reviewerNote}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white border border-ochre-300 rounded-lg overflow-hidden">
            <div className="bg-xuan-100 border-b border-ochre-300 px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rattan-600" />
              <h2 className="font-serif text-lg text-ink-600">其他异常</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-rattan-300 bg-rattan-50 rounded-lg p-3">
                  <h3 className="font-serif text-rattan-700 mb-2">颜色越界（{colorInvalid.length}）</h3>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {colorInvalid.map(p => {
                      const mat = sourceMaterials.find(m => m.id === p.sourceMaterial);
                      return (
                        <div key={p.id} className="text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: p.color }} />
                            <span>{p.id.slice(-8)}</span>
                          </div>
                          <span className="text-ochre-600">{mat?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border border-ochre-300 bg-ochre-50 rounded-lg p-3">
                  <h3 className="font-serif text-ochre-700 mb-2">缺项漏填（{missingUnit.length}）</h3>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {missingUnit.map(p => {
                      const mat = sourceMaterials.find(m => m.id === p.sourceMaterial);
                      return (
                        <div key={p.id} className="text-xs flex items-center justify-between">
                          <span>{p.id.slice(-8)}</span>
                          <span className="text-ochre-600">{mat?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border border-ochre-300 bg-ochre-50 rounded-lg p-3">
                  <h3 className="font-serif text-ochre-700 mb-2">补录数据（{supplementary.length}）</h3>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {supplementary.map(p => {
                      const mat = sourceMaterials.find(m => m.id === p.sourceMaterial);
                      return (
                        <div key={p.id} className="text-xs flex items-center justify-between">
                          <span>{p.id.slice(-8)}</span>
                          <span className="text-ochre-600">{mat?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-ochre-300 rounded-lg overflow-hidden">
            <div className="bg-xuan-100 border-b border-ochre-300 px-4 py-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-ochre-600" />
              <h2 className="font-serif text-lg text-ink-600">按材料溯源分析</h2>
            </div>
            <div className="p-4">
              <table className="w-full old-table">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">材料名称</th>
                    <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">材料描述</th>
                    <th className="text-center px-3 py-2 text-xs font-serif text-ochre-700">总点数</th>
                    <th className="text-center px-3 py-2 text-xs font-serif text-ochre-700">边界碰撞</th>
                    <th className="text-center px-3 py-2 text-xs font-serif text-ochre-700">其他异常</th>
                    <th className="text-center px-3 py-2 text-xs font-serif text-ochre-700">状态</th>
                    <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">录入人员</th>
                  </tr>
                </thead>
                <tbody>
                  {materialsWithIssues.map((mat, idx) => (
                    <tr key={mat.id} className={idx % 2 === 0 ? 'bg-xuan-50' : 'bg-white'}>
                      <td className="px-3 py-2 font-serif text-ink-600">{mat.name}</td>
                      <td className="px-3 py-2 text-sm text-ochre-600">{mat.description}</td>
                      <td className="px-3 py-2 text-center text-ink-600">{mat.total}</td>
                      <td className={`px-3 py-2 text-center font-serif ${mat.boundaryIssues > 0 ? 'text-cinnabar-600' : 'text-azure-600'}`}>
                        {mat.boundaryIssues}
                        {mat.boundaryIssues > 0 && <span className="ml-1 text-xs">⚠</span>}
                      </td>
                      <td className={`px-3 py-2 text-center font-serif ${mat.otherIssues > 0 ? 'text-rattan-600' : 'text-azure-600'}`}>
                        {mat.otherIssues}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {mat.boundaryIssues > 0 ? (
                          <span className="text-xs bg-cinnabar-100 text-cinnabar-700 px-2 py-0.5 rounded">
                            需重点复核
                          </span>
                        ) : mat.otherIssues > 0 ? (
                          <span className="text-xs bg-rattan-100 text-rattan-700 px-2 py-0.5 rounded">
                            需关注
                          </span>
                        ) : (
                          <span className="text-xs bg-azure-100 text-azure-700 px-2 py-0.5 rounded">
                            正常
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-ochre-600">
                        {Array.from(new Set(mat.points.map(p => p.operator))).join('、')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
