import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import AnomalyTag from '@/components/AnomalyTag';
import MaterialDiffCard from '@/components/MaterialDiffCard';
import ConvexHullVisual from '@/components/ConvexHullVisual';
import StepsList from '@/components/StepsList';
import ScreenshotCard from '@/components/ScreenshotCard';
import { Play, Download, RefreshCw, ArrowRight, Eye } from 'lucide-react';

export default function SampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { records, rerunRecord, rerunResult } = useStore();
  const record = records.find((r) => r.id === id);
  const screenshotRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!showPreview) return;
    let cancelled = false;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 250));
      if (cancelled || !screenshotRef.current) return;
      try {
        setExporting(true);
        setExportMessage('正在生成截图说明...');
        const canvas = await html2canvas(screenshotRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        });
        const link = document.createElement('a');
        link.download = `${record?.sampleId || 'record'}-凸包面积复盘说明.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setExportMessage('截图说明已导出，可直接用于评审会沟通');
      } catch (e) {
        setExportMessage(`导出失败：${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setExporting(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [showPreview, record]);

  if (!record) {
    return (
      <Layout title="样本未找到" showBack>
        <div className="card p-10 text-center text-ink-600">未找到该错题记录</div>
      </Layout>
    );
  }

  const rr = rerunResult[record.id];
  const displaySteps = rr ? rr.steps : record.calculationSteps;
  const displayHull = rr ? rr.hull : record.inputPoints;
  const rerunArea = rr ? rr.area : undefined;

  const handleRerun = () => rerunRecord(record.id);

  const handleExport = () => {
    setExportMessage(null);
    setShowPreview(true);
  };

  return (
    <Layout title={`${record.sampleId} · ${record.title}`} showBack>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-display text-2xl font-bold text-ink-900">{record.title}</h2>
            <AnomalyTag type={record.anomalyType} />
            {record.has口径Change && (
              <span className="tag bg-amber-100 text-amber-700 border border-amber-200 text-xs">
                口径已变更
              </span>
            )}
          </div>
          <div className="text-xs text-ink-600 flex gap-4">
            <span>样本 ID: <span className="font-mono">{record.sampleId}</span></span>
            <span>创建于 {record.createdAt}</span>
            <span>提交 {record.submittedCount} 次（已去重）</span>
            {record.anomalyDetail && (
              <span className="text-amber-700">· {record.anomalyDetail}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={handleExport} className="btn-primary" disabled={exporting}>
            <Download size={16} /> {exporting ? '导出中...' : '导出截图说明'}
          </button>
          {exportMessage && !showPreview && (
            <span className={`text-xs ${exportMessage.includes('失败') ? 'text-red-600' : 'text-emerald-700'}`}>
              {exportMessage}
            </span>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold text-ink-800 mb-3 flex items-center gap-2">
          <Eye size={15} /> 三份材料 · 口径变更对比
          <span className="text-[10px] text-ink-600 font-normal ml-1">
            （高亮黄色虚线 = 该份材料后来改过口径）
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {record.materials.length > 0 ? (
            record.materials.map((m) => <MaterialDiffCard key={m.id} material={m} />)
          ) : (
            <div className="col-span-3 text-xs text-ink-600 p-4 bg-paper-50 border border-paper-200 rounded">
              该记录缺少材料详情（可能为重复提交副本）
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-sm font-bold text-ink-800 mb-3">凸包可视化 · 放样例</h3>
          <ConvexHullVisual points={record.inputPoints} hull={displayHull ?? undefined} width={520} height={380} />
          <div className="mt-2 text-[11px] text-ink-600 flex gap-4">
            <span>● 蓝点：输入点集</span>
            <span>○ 橙圈：凸包顶点</span>
            <span>▢ 阴影：凸包多边形区域</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-ink-800 mb-3">计算步骤 · 数字来源追溯</h3>
          <div className="max-h-[380px] overflow-y-auto pr-2">
            <StepsList steps={displaySteps} />
          </div>
        </div>
      </div>

      <div className="card p-6 mb-8">
        <h3 className="text-sm font-bold text-ink-800 mb-4 flex items-center gap-2">
          <RefreshCw size={15} /> 重跑验证
        </h3>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-start">
          <div className="card p-4 bg-paper-50">
            <div className="text-[11px] text-ink-600 mb-1">期望面积</div>
            <div className="font-display text-3xl font-bold text-ink-900">
              {record.expectedArea ?? '—'}
            </div>
          </div>
          <div className="flex items-center h-24">
            <ArrowRight size={20} className="text-ink-600" />
          </div>
          <div className={`card p-4 ${Number.isNaN(record.actualArea) ? 'bg-amber-50 border-amber-200' : 'bg-paper-50'}`}>
            <div className="text-[11px] text-ink-600 mb-1">原始实际结果</div>
            <div className={`font-display text-3xl font-bold ${Number.isNaN(record.actualArea) ? 'text-amber-700' : 'text-ink-900'}`}>
              {Number.isNaN(record.actualArea) ? 'NaN' : record.actualArea ?? '—'}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 h-24 justify-center">
            <button onClick={handleRerun} className="btn-primary">
              <Play size={14} /> 点我重跑
            </button>
            <ArrowRight size={20} className="text-ink-600" />
          </div>
          <div className={`card p-4 ${rerunArea !== undefined ? 'bg-emerald-50 border-emerald-200' : 'bg-paper-50 border-dashed'}`}>
            <div className="text-[11px] text-ink-600 mb-1">重跑结果</div>
            <div className="font-display text-3xl font-bold text-emerald-700">
              {rerunArea === undefined ? '未重跑' : rerunArea === null ? '异常' : Number(rerunArea).toFixed(4).replace(/\.?0+$/, '')}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 text-xs text-ink-600 card p-4 bg-paper-50/50">
        <span className="font-bold text-ink-800">使用说明（不长）：</span>
        <span className="ml-2">① 放样例：中间 SVG 图实时展示凸包与点集；</span>
        <span className="ml-2">② 重跑：点「点我重跑」按钮，绿框显示重跑面积；</span>
        <span className="ml-2">③ 查看截图说明：点右上「导出截图说明」，生成可直接发评审会的 PNG 卡片。</span>
      </div>

      <div className={showPreview ? 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8' : 'hidden'}>
        <div className="relative max-h-[90vh] flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <span className={`text-sm ${exportMessage && !exporting ? (exportMessage.includes('失败') ? 'text-red-400' : 'text-emerald-300') : 'text-white'}`}>
              {exportMessage || (exporting ? '正在导出...' : '截图说明预览')}
            </span>
            <button
              onClick={() => setShowPreview(false)}
              className="text-white text-sm hover:underline ml-4"
            >
              关闭预览
            </button>
          </div>
          <div className="overflow-auto max-h-[calc(90vh-40px)] bg-white rounded-lg shadow-2xl">
            <ScreenshotCard ref={screenshotRef} record={record} rerunArea={rerunArea} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
