import React, { useState, useMemo } from 'react';
import { Download, Camera, CheckCircle, Package, Edit3, FileText, ChevronRight, Check, FileSpreadsheet, AlertTriangle, X } from 'lucide-react';
import { useDataStore } from '@/stores/useDataStore';
import { StatusBadge } from '@/components/StatusBadge';
import { DataMarkTags } from '@/components/MarkTag';
import { downloadDataExport, groupForScreenshot, generateExportSummary, exportToCSV } from '@/utils/export';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { TowerData } from '@/types';

export const ExportDelivery: React.FC = () => {
  const { towerData, getStatsSummary, getFilteredData } = useDataStore();
  const stats = getStatsSummary();
  const [includeMarks, setIncludeMarks] = useState(true);
  const [exportRange, setExportRange] = useState<'all' | 'filtered'>('all');
  const [showSuccess, setShowSuccess] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errorTip, setErrorTip] = useState<string | null>(null);

  const filteredData = useMemo(() => getFilteredData(), [towerData, getFilteredData]);
  const groups = useMemo(() => groupForScreenshot(towerData), [towerData]);
  const summary = useMemo(() => generateExportSummary(towerData), [towerData]);

  const dataToExport = useMemo(() => {
    return exportRange === 'all' ? towerData : filteredData;
  }, [exportRange, towerData, filteredData]);

  const previewCSV = useMemo(() => {
    const csv = exportToCSV(dataToExport.slice(0, 3), includeMarks);
    const lines = csv.split('\n');
    return {
      header: lines[0] || '',
      sampleLines: lines.slice(1, 4),
      totalLines: dataToExport.length + 1,
    };
  }, [dataToExport, includeMarks]);

  const handleExport = () => {
    if (dataToExport.length === 0) {
      setErrorTip('当前筛选结果为空，无法导出');
      setTimeout(() => setErrorTip(null), 3000);
      return;
    }

    const tag = exportRange === 'all' ? '全部' : '筛选';
    const filename = `冷却塔水滴阈值预警_${tag}_${formatDateTime(new Date().toISOString()).replace(/[:\s]/g, '-')}.csv`;
    downloadDataExport(dataToExport, filename, includeMarks);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleGenerateScreenshot = () => {
    const hasAny = groups.processed.length > 0 || groups.pending.length > 0 || groups.manual.length > 0;
    if (!hasAny) {
      setErrorTip('暂无分组数据，无法生成截图说明');
      setTimeout(() => setErrorTip(null), 3000);
      return;
    }
    setGenerateSuccess(true);
    setTimeout(() => setGenerateSuccess(false), 2500);
  };

  const ScreenshotCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    count: number;
    color: string;
    bgColor: string;
    items: TowerData[];
    maxItems?: number;
  }> = ({ title, icon, count, color, bgColor, items, maxItems = 3 }) => (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className={cn('px-4 py-3 flex items-center justify-between', bgColor)}>
        <div className="flex items-center gap-2">
          {icon}
          <span className={cn('text-sm font-semibold', color)}>{title}</span>
        </div>
        <span className={cn('text-lg font-bold font-mono', color)}>{count}</span>
      </div>
      <div className="p-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
        {items.slice(0, maxItems).map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-gray-300">{item.id}</span>
              <StatusBadge status={item.status} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{item.towerId}</span>
              <DataMarkTags
                isNoiseSuspected={item.isNoiseSuspected}
                isOldNote={item.isOldNote}
                isNameMismatch={item.isNameMismatch}
                isVerbalNote={item.isVerbalNote}
                size="sm"
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-500">
            暂无数据
          </div>
        )}
        {items.length > maxItems && (
          <div className="text-center text-[10px] text-gray-500 pt-1">
            还有 {items.length - maxItems} 条...
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">导出交付</h1>
          <p className="text-sm text-gray-400">导出带标记的明细数据，生成给算法值班人的截图说明</p>
        </div>
        {errorTip && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-alert/10 border border-orange-alert/30 text-orange-alert text-sm">
            <AlertTriangle className="w-4 h-4" />
            {errorTip}
            <button onClick={() => setErrorTip(null)} className="ml-1 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-glow" />
              导出明细数据
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-2 block">导出范围</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportRange('all')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all border',
                      exportRange === 'all'
                        ? 'bg-teal-glow/15 text-teal-glow border-teal-glow/30'
                        : 'bg-white/[0.02] text-gray-400 border-white/10 hover:border-white/20'
                    )}
                  >
                    全部数据（{stats.total} 条）
                  </button>
                  <button
                    onClick={() => setExportRange('filtered')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all border',
                      exportRange === 'filtered'
                        ? 'bg-teal-glow/15 text-teal-glow border-teal-glow/30'
                        : 'bg-white/[0.02] text-gray-400 border-white/10 hover:border-white/20'
                    )}
                  >
                    当前筛选（{filteredData.length} 条）
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-gray-300">包含标记列</div>
                  <div className="text-xs text-gray-500">导出文件中包含噪声、旧版备注等标记列</div>
                </div>
                <button
                  onClick={() => setIncludeMarks(!includeMarks)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-all relative',
                    includeMarks ? 'bg-teal-glow' : 'bg-gray-600'
                  )}
                  aria-label={includeMarks ? '关闭标记列' : '开启标记列'}
                >
                  <div
                    className={cn(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow',
                      includeMarks ? 'left-6' : 'left-0.5'
                    )}
                  />
                </button>
              </div>

              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-teal-glow hover:text-teal-glow-400 inline-flex items-center gap-1"
                >
                  {showPreview ? '收起' : '展开'} CSV 内容预览
                  <ChevronRight className={cn('w-3 h-3 transition-transform', showPreview && 'rotate-90')} />
                </button>
                {showPreview && (
                  <div className="mt-2 p-3 rounded-lg bg-deep-blue-800 border border-white/10 overflow-x-auto scrollbar-thin">
                    <div className="text-[10px] text-gray-500 mb-1">
                      预览（{previewCSV.sampleLines.length}/{dataToExport.length} 行），总计 {previewCSV.totalLines} 行（含表头）
                    </div>
                    <pre className="text-[10px] font-mono text-gray-400 whitespace-pre">
{previewCSV.header}
{previewCSV.sampleLines.join('\n')}
{dataToExport.length > 3 ? '\n...' : ''}
                    </pre>
                  </div>
                )}
              </div>

              <button
                onClick={handleExport}
                disabled={dataToExport.length === 0}
                className={cn(
                  'w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors',
                  dataToExport.length > 0
                    ? 'bg-teal-glow text-deep-blue-900 hover:bg-teal-glow-400'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                )}
              >
                {showSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    导出成功，共 {dataToExport.length} 条
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    导出 CSV 文件（{dataToExport.length} 条）
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-teal-glow" />
              截图说明预览
            </h3>

            <p className="text-xs text-gray-500 mb-4">
              给算法值班人看的截图说明，按「已处理」「待补材料」「人工改判」三类分组
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScreenshotCard
                title="已处理"
                icon={<CheckCircle className="w-4 h-4" />}
                count={groups.processed.length}
                color="text-teal-glow"
                bgColor="bg-teal-glow/10"
                items={groups.processed}
              />
              <ScreenshotCard
                title="待补材料"
                icon={<Package className="w-4 h-4" />}
                count={groups.pending.length}
                color="text-blue-400"
                bgColor="bg-blue-400/10"
                items={groups.pending}
              />
              <ScreenshotCard
                title="人工改判"
                icon={<Edit3 className="w-4 h-4" />}
                count={groups.manual.length}
                color="text-purple-400"
                bgColor="bg-purple-400/10"
                items={groups.manual}
              />
            </div>

            <button
              onClick={handleGenerateScreenshot}
              className="mt-4 w-full py-3 rounded-lg bg-white/10 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-white/15 transition-colors border border-white/10"
            >
              {generateSuccess ? (
                <>
                  <Check className="w-4 h-4 text-teal-glow" />
                  <span className="text-teal-glow">已生成截图说明，可发给算法值班人</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  生成截图说明
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-glow" />
              复核说明摘要
            </h3>

            <div className="p-3 rounded-lg bg-deep-blue-700/50 border border-white/5 font-mono text-xs text-gray-400 whitespace-pre-wrap leading-relaxed">
              {summary}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-xs text-gray-500 mb-2">交付材料清单</div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <ChevronRight className="w-3 h-3 text-teal-glow" />
                  维修备注记录
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <ChevronRight className="w-3 h-3 text-teal-glow" />
                  处理记录时间线
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <ChevronRight className="w-3 h-3 text-teal-glow" />
                  截图说明（三类分组）
                </li>
              </ul>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border-teal-glow/20 bg-teal-glow/5">
            <h3 className="text-sm font-semibold text-teal-glow mb-3">使用提示</h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-teal-glow mt-0.5">1.</span>
                导出的 CSV 文件包含完整标记列，可用 Excel 筛选核对
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-glow mt-0.5">2.</span>
                截图说明可直接发给算法值班人查看三类分组
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-glow mt-0.5">3.</span>
                维修备注和处理记录在详情页可完整追溯
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-glow mt-0.5">4.</span>
                项目助理小宋可直接对给他人看
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
