import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload as UploadIcon } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ImportPanel } from '@/components/ImportPanel';
import { SAMPLE_CSV } from '@/utils/mockData';

export function ImportPage() {
  const { init } = useAppStore();

  useEffect(() => {
    init();
  }, []);

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pocket_analysis_sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-pocket-border bg-pocket-card px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-pocket-muted hover:text-pocket-text"
          >
            <ArrowLeft size={14} />
            返回数据浏览
          </Link>
          <h1 className="text-sm font-semibold text-pocket-text">数据导入</h1>
          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 text-xs text-pocket-accent hover:underline"
          >
            <UploadIcon size={12} className="rotate-180" />
            下载示例 CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-pocket-text">导入药物结合口袋数据</h2>
            <p className="mt-1 text-[11px] text-pocket-muted">
              支持 CSV 和 Excel 格式，系统会自动识别字段、检测异常并保留原始行号用于追溯。
            </p>
          </div>

          <ImportPanel />

          <div className="mt-6 rounded-lg border border-pocket-border bg-pocket-card p-4">
            <h3 className="mb-2 text-xs font-semibold text-pocket-text">支持的字段</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-pocket-muted">行号</span>
                <span className="font-mono text-pocket-text">row, line, 行号</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pocket-muted">蛋白名称</span>
                <span className="font-mono text-pocket-text">protein, 蛋白</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pocket-muted">口袋坐标</span>
                <span className="font-mono text-pocket-text">x, y, z</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pocket-muted">亲和力</span>
                <span className="font-mono text-pocket-text">affinity, 亲和力</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pocket-muted">相机视角</span>
                <span className="font-mono text-pocket-text">azimuth, elevation, distance</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pocket-muted">图片名/备注</span>
                <span className="font-mono text-pocket-text">image, note</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
