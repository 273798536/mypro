import { useState } from 'react';
import { Header } from '@/components/common/Header';
import { useSampleStore } from '@/store/useSampleStore';
import { useTrackStore } from '@/store/useTrackStore';
import { useLicenseStore } from '@/store/useLicenseStore';
import { exportSamplesCSV, exportTracksCSV, exportLicensesCSV, exportAllData } from '@/utils/exportUtils';
import { Download, FileText, Music, Disc, FileCheck, Check } from 'lucide-react';

export const Export = () => {
  const { samples } = useSampleStore();
  const { tracks } = useTrackStore();
  const { licenses } = useLicenseStore();
  const [exportSuccess, setExportSuccess] = useState('');

  const handleExport = (type: string) => {
    if (type === 'samples') {
      exportSamplesCSV(samples);
    } else if (type === 'tracks') {
      exportTracksCSV(tracks);
    } else if (type === 'licenses') {
      exportLicensesCSV(licenses);
    } else if (type === 'all') {
      exportAllData(samples, tracks, licenses);
    }

    setExportSuccess(type);
    setTimeout(() => setExportSuccess(''), 3000);
  };

  const exportOptions = [
    {
      id: 'samples',
      title: '导出采样素材清单',
      description: '导出所有采样素材的详细信息，包括名称、来源、格式、时长等',
      icon: Music,
      count: samples.length,
      color: 'accent',
    },
    {
      id: 'tracks',
      title: '导出曲目项目清单',
      description: '导出所有曲目项目的详细信息，包括名称、艺术家、专辑、关联素材等',
      icon: Disc,
      count: tracks.length,
      color: 'success',
    },
    {
      id: 'licenses',
      title: '导出授权报告清单',
      description: '导出所有授权报告的详细信息，包括名称、类型、有效期、关联曲目等',
      icon: FileCheck,
      count: licenses.length,
      color: 'purple',
    },
    {
      id: 'all',
      title: '导出全部数据',
      description: '一次性导出采样素材、曲目项目和授权报告的所有数据',
      icon: FileText,
      count: samples.length + tracks.length + licenses.length,
      color: 'warning',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="导出中心" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {exportSuccess && (
            <div className="mb-6 p-4 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3">
              <Check className="w-5 h-5 text-success" />
              <p className="text-sm text-success">导出成功！文件已开始下载</p>
            </div>
          )}

          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10 mb-8">
            <h3 className="text-lg font-semibold text-white mb-2">数据概览</h3>
            <p className="text-sm text-gray-400 mb-6">
              系统当前共有 {samples.length} 个采样素材、{tracks.length} 个曲目项目、{licenses.length} 份授权报告
            </p>

            <div className="grid grid-cols-2 gap-4">
              {exportOptions.map((option) => (
                <div
                  key={option.id}
                  className="p-6 rounded-lg bg-primary/30 border border-white/10 hover:border-accent/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <option.icon className={`w-8 h-8 text-${option.color}`} />
                    <span className="text-xs text-gray-400">{option.count} 条</span>
                  </div>
                  <h4 className="font-medium text-white mb-2">{option.title}</h4>
                  <p className="text-xs text-gray-400 mb-4">{option.description}</p>
                  <button
                    onClick={() => handleExport(option.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    导出 CSV
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">导出说明</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                <div>
                  <p className="text-sm font-medium text-white">CSV 格式</p>
                  <p className="text-xs text-gray-400">导出文件采用 UTF-8 编码，可直接在 Excel 或其他电子表格软件中打开</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-success mt-2" />
                <div>
                  <p className="text-sm font-medium text-white">包含字段</p>
                  <p className="text-xs text-gray-400">包含所有核心字段，不包括版本历史和人工修改记录</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-warning mt-2" />
                <div>
                  <p className="text-sm font-medium text-white">命名规则</p>
                  <p className="text-xs text-gray-400">文件名自动包含导出类型和当前日期，如"采样素材清单_2025-01-15.csv"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
