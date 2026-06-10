import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Trash2,
  Save,
  Loader2,
  Crosshair,
  RotateCcw,
} from 'lucide-react';
import { useQcStore } from '../store/qcStore';
import StatusBadge from '../components/StatusBadge';
import DuplicateBanner from '../components/DuplicateBanner';
import type { Annotation } from '../../shared/types';

export default function AnnotationPage() {
  const { sampleId } = useParams<{ sampleId: string }>();
  const navigate = useNavigate();
  const store = useQcStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<'pointer' | 'annotate'>('annotate');
  const [qcConclusion, setQcConclusion] = useState('');
  const [saving, setSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (sampleId) {
      store.fetchSample(sampleId);
      store.fetchAnnotations(sampleId);
    }
  }, [sampleId]);

  useEffect(() => {
    if (store.currentSample) {
      setQcConclusion(store.currentSample.qcConclusion || '');
    }
  }, [store.currentSample]);

  useEffect(() => {
    drawCanvas();
  }, [store.currentAnnotations, zoom, canvasSize]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridStep = 40 * zoom;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const imgName = store.currentSample?.imageFileName || '';
    if (imgName) {
      ctx.fillStyle = '#64748b';
      ctx.font = `${12 * zoom}px IBM Plex Sans, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`📷 ${imgName}`, canvas.width / 2, 30);
    }

    for (const ann of store.currentAnnotations) {
      const x = ann.x * zoom;
      const y = ann.y * zoom;

      ctx.beginPath();
      ctx.arc(x, y, 8 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 118, 110, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 2 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#0F766E';
      ctx.fill();

      ctx.fillStyle = '#0F766E';
      ctx.font = `bold ${10 * zoom}px IBM Plex Sans, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(ann.label, x + 10 * zoom, y + 4 * zoom);
    }

    if (store.currentAnnotations.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px IBM Plex Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击画布添加细胞标注点', canvas.width / 2, canvas.height / 2);
    }
  }, [store.currentAnnotations, zoom, canvasSize, store.currentSample]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'annotate' || !sampleId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    await store.addAnnotation(sampleId, Math.round(x), Math.round(y), 'cell');
  };

  const handleDeleteAnnotation = async (ann: Annotation) => {
    if (!sampleId) return;
    await store.removeAnnotation(ann.id, sampleId);
  };

  const handleSave = async () => {
    if (!sampleId || !store.currentSample) return;
    setSaving(true);
    try {
      await store.updateSample(sampleId, {
        qcConclusion,
        status: store.currentSample.status === 'pending_qc' ? 'pending_review' : store.currentSample.status,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  if (!store.currentSample) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-qc-teal" />
      </div>
    );
  }

  const sample = store.currentSample;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="btn-secondary btn-sm">
          <ArrowLeft size={14} />
          返回
        </button>
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800">
            图像标注 · {sample.barcode}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={sample.status} />
            {sample.isDuplicate && (
              <span className="badge bg-amber-50 text-amber-700 border-amber-200">
                条码重复
              </span>
            )}
          </div>
        </div>
      </div>

      <DuplicateBanner sample={sample} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTool('annotate')}
                className={`btn-sm rounded flex items-center gap-1 px-2 py-1 text-xs ${
                  tool === 'annotate' ? 'bg-qc-teal text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Crosshair size={12} />
                标注
              </button>
              <button
                onClick={() => setTool('pointer')}
                className={`btn-sm rounded flex items-center gap-1 px-2 py-1 text-xs ${
                  tool === 'pointer' ? 'bg-qc-teal text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <MousePointer size={12} />
                选择
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                <ZoomIn size={16} />
              </button>
              <button onClick={handleResetZoom} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
          <div ref={containerRef} className="p-2">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`w-full border border-slate-200 rounded ${
                tool === 'annotate' ? 'cursor-crosshair' : 'cursor-default'
              }`}
              style={{ height: '500px' }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">样本信息</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">条码</span>
                <span className="font-mono font-medium">{sample.barcode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">原始行号</span>
                <span>{sample.originalRowNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">图片文件</span>
                <span className="truncate max-w-[140px]">{sample.imageFileName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">来源备注</span>
                <span className="truncate max-w-[140px]">{sample.sourceRemark || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">细胞计数</span>
                <span className="font-bold text-qc-teal text-lg">{sample.cellCount ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">标注列表</h3>
              <span className="text-xs text-slate-400">{store.currentAnnotations.length} 个</span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {store.currentAnnotations.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">暂无标注</p>
              ) : (
                store.currentAnnotations.map((ann, idx) => (
                  <div
                    key={ann.id}
                    className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded text-xs"
                  >
                    <span className="text-slate-600">
                      #{idx + 1} ({ann.x}, {ann.y}) {ann.label}
                    </span>
                    <button
                      onClick={() => handleDeleteAnnotation(ann)}
                      className="p-0.5 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">质控结论</h3>
            <textarea
              value={qcConclusion}
              onChange={(e) => setQcConclusion(e.target.value)}
              placeholder="输入质控结论..."
              className="input-field min-h-[80px] resize-y"
              rows={3}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full justify-center"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? '保存中...' : '保存并提交复核'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
