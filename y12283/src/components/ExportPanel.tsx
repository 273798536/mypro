import React from 'react';
import { Download, FileText, Camera, Copy, Check } from 'lucide-react';
import { VectorField, SeedPoint, StreamlineData } from '../types';

interface ExportPanelProps {
  field: VectorField | null;
  seeds: SeedPoint[];
  streamlines: StreamlineData[];
  screenshot: string | null;
  onCaptureScreenshot: () => void;
  onExport: () => void;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  field,
  seeds,
  streamlines,
  screenshot,
  onCaptureScreenshot,
  onExport,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCorrespondence = () => {
    const correspondence = {
      vectorField: field
        ? {
            id: field.id,
            name: field.name,
            formula: field.formula,
            parameters: field.parameters,
          }
        : null,
      seedPoints: seeds.map((seed) => ({
        id: seed.id,
        position: seed.position,
        status: seed.status,
        remark: seed.remark,
        createdAt: seed.createdAt,
        modifiedAt: seed.modifiedAt,
      })),
      streamlines: streamlines.map((sl) => ({
        id: sl.id,
        seedId: sl.seedId,
        pointCount: sl.points.length,
        hasExplosion: sl.hasExplosion,
        explosionRegions: sl.explosionRegions,
        maxDivergence: sl.maxDivergence,
        dataGapRegions: sl.dataGapRegions,
      })),
      exportedAt: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(correspondence, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 h-full flex flex-col border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <FileText size={18} />
          导出详情
        </h2>
        <button
          onClick={onExport}
          disabled={!field || seeds.length === 0}
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors flex items-center gap-1"
        >
          <Download size={14} />
          导出报告
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {!field ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <FileText size={32} className="mb-2 opacity-50" />
            <p className="text-sm">请先选择向量场</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-200 mb-2">向量场公式</h3>
              <p className="text-cyan-400 font-medium mb-2">{field.name}</p>
              <div className="bg-slate-900/50 rounded p-2 font-mono text-xs space-y-1">
                <p>
                  <span className="text-pink-400">dx/dt</span> ={' '}
                  <span className="text-yellow-300">{field.formula.x}</span>
                </p>
                <p>
                  <span className="text-pink-400">dy/dt</span> ={' '}
                  <span className="text-yellow-300">{field.formula.y}</span>
                </p>
                <p>
                  <span className="text-pink-400">dz/dt</span> ={' '}
                  <span className="text-yellow-300">{field.formula.z}</span>
                </p>
              </div>
              {Object.keys(field.parameters).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-400 mb-1">参数:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(field.parameters).map(([key, value]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                      >
                        {key} = {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-200">种子点 - 流线对应</h3>
                <button
                  onClick={handleCopyCorrespondence}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? '已复制' : '复制对应关系'}
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {seeds.map((seed, index) => {
                  const streamline = streamlines.find((sl) => sl.seedId === seed.id);
                  return (
                    <div
                      key={seed.id}
                      className="bg-slate-900/50 rounded p-2 border border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">种子点 #{index + 1}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          ID: {seed.id.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-sm text-cyan-300 font-mono mb-1">
                        ({seed.position.x.toFixed(2)}, {seed.position.y.toFixed(2)},{' '}
                        {seed.position.z.toFixed(2)})
                      </p>
                      {streamline ? (
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">流线点数:</span>
                            <span className="text-slate-200">{streamline.points.length}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">最大散度:</span>
                            <span
                              className={
                                streamline.maxDivergence > 100
                                  ? 'text-red-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {streamline.maxDivergence.toFixed(2)}
                            </span>
                          </div>
                          {streamline.hasExplosion && (
                            <div className="flex items-center gap-1 text-red-400">
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              <span>检测到采样爆炸 ({streamline.explosionRegions.length}处)</span>
                            </div>
                          )}
                          {streamline.dataGapRegions.length > 0 && (
                            <div className="flex items-center gap-1 text-orange-400">
                              <span className="w-2 h-2 bg-orange-500 rounded-full" />
                              <span>数据缺口 ({streamline.dataGapRegions.length}处)</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">尚未计算流线</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Camera size={14} />
                  截图
                </h3>
                <button
                  onClick={onCaptureScreenshot}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                >
                  捕获截图
                </button>
              </div>
              {screenshot ? (
                <div className="relative">
                  <img
                    src={screenshot}
                    alt="Vector field screenshot"
                    className="w-full rounded border border-slate-600"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-center">
                    {screenshot.length > 0 ? `截图大小: ${(screenshot.length / 1024).toFixed(1)} KB` : ''}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 bg-slate-900/50 rounded border border-dashed border-slate-600">
                  <Camera size={24} className="text-slate-500 mb-1" />
                  <p className="text-xs text-slate-500">点击"捕获截图"获取当前视图</p>
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-200 mb-2">图例说明</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-cyan-400 rounded" />
                  <span className="text-slate-300">正常流线段</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-red-500 rounded" />
                  <span className="text-slate-300">采样爆炸区域 (散度阈值)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-400" />
                  <span className="text-slate-300">种子点位置</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-orange-400 border-dashed" />
                  <span className="text-slate-300">数据缺口警告</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;
