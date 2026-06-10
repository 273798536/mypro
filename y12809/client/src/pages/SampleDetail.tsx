import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  sampleApi,
  sequencingApi,
  cultivationApi,
  lineageApi,
  batchApi,
} from '../api';
import {
  Sample,
  RegionAnnotation,
  SequencingResult,
  CultivationRecord,
  LineageNode,
  BatchEffectReport,
} from '../types';
import {
  SampleStatusBadge,
  ReviewStatusBadge,
  QualityScore,
  CategoryTag,
  categoryColors,
  categoryLabels,
} from '../components/Badges';

const CANVAS_W = 600;
const CANVAS_H = 500;

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const [sequencing, setSequencing] = useState<SequencingResult[]>([]);
  const [cultivation, setCultivation] = useState<CultivationRecord[]>([]);
  const [lineage, setLineage] = useState<{ nodes: LineageNode[]; samples: Sample[] } | null>(null);
  const [batchReport, setBatchReport] = useState<BatchEffectReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'annotations' | 'sequencing' | 'lineage' | 'cultivation'>('annotations');
  const [selectedAnnotation, setSelectedAnnotation] = useState<RegionAnnotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [newCategory, setNewCategory] = useState<RegionAnnotation['category']>('tumor');
  const [newLabel, setNewLabel] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'flag' | 'comment'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [supplementData, setSupplementData] = useState({ date: '', operator: '', action: 'passage' as const, details: '' });
  const [showLineageCorrectModal, setShowLineageCorrectModal] = useState(false);
  const [lineageCorrectNotes, setLineageCorrectNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      sampleApi.getById(id),
      sequencingApi.getBySample(id),
      cultivationApi.getBySample(id),
      lineageApi.getBySample(id),
    ]).then(async ([s, seq, cult, lin]) => {
      setSample(s);
      setSequencing(seq);
      setCultivation(cult);
      setLineage(lin);
      const report = await batchApi.getReport(s.batchId);
      setBatchReport(report);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    drawCanvas();
  }, [sample, selectedAnnotation, isDrawing, drawStart, drawEnd]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !sample) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    grad.addColorStop(0, '#fef9c3');
    grad.addColorStop(0.3, '#fde68a');
    grad.addColorStop(0.6, '#fcd34d');
    grad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = sample.status === 'bad' ? '#fee2e2' : grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = 'rgba(180, 83, 9, 0.15)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * CANVAS_W;
      const y = Math.random() * CANVAS_H;
      const r = 10 + Math.random() * 30;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(120, 53, 15, 0.25)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * CANVAS_W;
      const y = Math.random() * CANVAS_H;
      const r = 2 + Math.random() * 6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    sample.annotations.forEach((ann) => {
      const isSelected = selectedAnnotation?.id === ann.id;
      const color = categoryColors[ann.category] || '#3b82f6';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = `${color}30`;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [8, 4] : []);
      ctx.beginPath();
      ctx.rect(ann.x, ann.y, ann.width, ann.height);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = color;
      const lblW = Math.min(120, ann.width);
      ctx.fillRect(ann.x, ann.y - 20, lblW, 18);
      ctx.fillStyle = '#fff';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${ann.label} (${(ann.confidence * 100).toFixed(0)}%)`,
        ann.x + 5,
        ann.y - 11,
        lblW - 10
      );
    });

    if (isDrawing && drawStart && drawEnd) {
      const color = categoryColors[newCategory] || '#3b82f6';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = `${color}40`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const w = Math.abs(drawEnd.x - drawStart.x);
      const h = Math.abs(drawEnd.y - drawStart.y);
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const clicked = sample?.annotations.find(
      (a) => pos.x >= a.x && pos.x <= a.x + a.width && pos.y >= a.y && pos.y <= a.y + a.height
    );
    if (clicked) {
      setSelectedAnnotation(clicked);
      setIsDrawing(false);
      return;
    }
    setSelectedAnnotation(null);
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawEnd(pos);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setDrawEnd(getCanvasPos(e));
  };

  const handleCanvasMouseUp = async () => {
    if (!isDrawing || !drawStart || !drawEnd || !id) {
      setIsDrawing(false);
      return;
    }
    const x = Math.min(drawStart.x, drawEnd.x);
    const y = Math.min(drawStart.y, drawEnd.y);
    const width = Math.abs(drawEnd.x - drawStart.x);
    const height = Math.abs(drawEnd.y - drawStart.y);
    if (width > 10 && height > 10) {
      try {
        const annotation = await sampleApi.addAnnotation(id, {
          x,
          y,
          width,
          height,
          label: newLabel || categoryLabels[newCategory] || '区域',
          category: newCategory,
          confidence: 0.85,
          notes: '人工标注',
        });
        setSample((prev) => (prev ? { ...prev, annotations: [...prev.annotations, annotation] } : prev));
        setSelectedAnnotation(annotation);
        setNewLabel('');
      } catch (e) {
        console.error(e);
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
  };

  const submitReview = async () => {
    if (!id) return;
    try {
      const { sample: updated } = await sampleApi.review(id, {
        action: reviewAction,
        notes: reviewNotes,
        reviewer: '李研究员',
      });
      setSample(updated);
      setShowReviewModal(false);
      setReviewNotes('');
    } catch (e) {
      console.error(e);
    }
  };

  const submitSupplement = async () => {
    if (!id) return;
    try {
      const record = await cultivationApi.add({
        sampleId: id,
        ...supplementData,
      });
      setCultivation((prev) => [...prev, record]);
      setShowSupplementModal(false);
      setSupplementData({ date: '', operator: '', action: 'passage', details: '' });
      if (lineage) {
        const refreshed = await lineageApi.getBySample(id);
        setLineage(refreshed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitLineageCorrect = async () => {
    if (!id) return;
    try {
      await lineageApi.correct({
        sampleId: id,
        notes: lineageCorrectNotes,
        operator: '李研究员',
      });
      const [updatedSample, refreshedLineage] = await Promise.all([
        sampleApi.getById(id),
        lineageApi.getBySample(id),
      ]);
      setSample(updatedSample);
      setLineage(refreshedLineage);
      setShowLineageCorrectModal(false);
      setLineageCorrectNotes('');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center' }}>加载中...</div>;
  }
  if (!sample) {
    return <div style={{ padding: 60, textAlign: 'center' }}>样本不存在</div>;
  }

  const seq = sequencing[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button
          onClick={() => navigate('/samples')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-white)',
            fontSize: 13,
            color: 'var(--color-text-secondary)',
          }}
        >
          ← 返回列表
        </button>
        <div>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
            {sample.name}
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--color-text-muted)' }}>{sample.code}</span>
          </h3>
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
        }}
      >
        <InfoCell label="样本类型" value={<SampleStatusBadge status={sample.status} />} />
        <InfoCell label="复核状态" value={<ReviewStatusBadge status={sample.reviewStatus} />} />
        <InfoCell label="所属批次" value={<span style={{ fontFamily: 'monospace', fontSize: 13, color: '#1d4ed8' }}>{sample.batchId}</span>} />
        <InfoCell label="谱系编号" value={<span style={{ fontFamily: 'monospace', fontSize: 13 }}>{sample.lineageId}</span>} />
        <InfoCell label="物种 / 组织" value={<span>{sample.species} · {sample.tissueType}</span>} />
        <InfoCell label="染色方式" value={sample.stainingMethod} />
        <InfoCell label="切片厚度" value={`${sample.sliceThickness} μm`} />
        <InfoCell label="质量评分" value={<QualityScore score={sample.qualityScore} />} />
        {sample.reviewer && <InfoCell label="复核人" value={sample.reviewer} />}
        {sample.reviewedAt && <InfoCell label="复核时间" value={new Date(sample.reviewedAt).toLocaleString('zh-CN')} />}
        {sample.isUnavailable && (
          <InfoCell
            label="不可用原因"
            value={<span style={{ color: '#dc2626', fontSize: 12 }}>🚫 {sample.unavailableReason}</span>}
            span={2}
          />
        )}
        {sample.reviewNotes && (
          <InfoCell
            label="复核备注"
            value={<span style={{ fontSize: 12 }}>{sample.reviewNotes}</span>}
            span={2}
          />
        )}
      </div>

      {batchReport && batchReport.detected && (
        <div
          style={{
            background: batchReport.severity === 'severe' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${batchReport.severity === 'severe' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            borderRadius: 'var(--radius-md)',
            padding: 18,
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: batchReport.severity === 'severe' ? '#dc2626' : '#b45309' }}>
                批次效应告警 - 样本 {batchReport.severity === 'severe' ? '严重' : '中度'} 受影响
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              此样本所属批次 {batchReport.batchId} 已被检测到存在显著批次效应。
            </p>
            <button
              onClick={() => navigate('/batches')}
              style={{
                marginTop: 12,
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${batchReport.severity === 'severe' ? '#dc2626' : '#d97706'}`,
                background: 'white',
                color: batchReport.severity === 'severe' ? '#dc2626' : '#b45309',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              查看批次详情分析 →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>为什么被拦下来：</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {batchReport.possibleCauses.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>{i + 1}.</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>处理建议：</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {batchReport.recommendations.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>{i + 1}.</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>病理切片画布 · 区域标注</h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                在画布上<b>拖拽绘制矩形</b>添加新标注；<b>点击已有标注</b>查看详细信息
              </p>
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius)',
                border: 'none',
                background: 'var(--color-primary)',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              }}
            >
              ✅ 提交复核结论
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>标注类别：</span>
            {(Object.keys(categoryLabels) as (keyof typeof categoryLabels)[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setNewCategory(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: newCategory === cat ? `2px solid ${categoryColors[cat]}` : `1px solid var(--color-border)`,
                  background: newCategory === cat ? `${categoryColors[cat]}1a` : 'var(--color-white)',
                  fontSize: 12,
                  fontWeight: newCategory === cat ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 10, height: 10, background: categoryColors[cat], borderRadius: 2 }} />
                {categoryLabels[cat]}
              </button>
            ))}
            <input
              type="text"
              placeholder="自定义标注名称（可选）"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: 12,
                width: 180,
                marginLeft: 'auto',
              }}
            />
          </div>

          <div style={{ position: 'relative', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              style={{
                width: '100%',
                height: 'auto',
                cursor: isDrawing ? 'crosshair' : 'pointer',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              已标注 {sample.annotations.length} 个区域 · 画布尺寸 {CANVAS_W}×{CANVAS_H}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>区域标注明细表格</h5>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>共 {sample.annotations.length} 个标注</span>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>标签</th>
                    <th style={thStyle}>类别</th>
                    <th style={thStyle}>位置 (x,y)</th>
                    <th style={thStyle}>尺寸 (w×h)</th>
                    <th style={thStyle}>置信度</th>
                    <th style={thStyle}>备注</th>
                    <th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sample.annotations.map((ann, i) => (
                    <tr
                      key={ann.id}
                      onClick={() => setSelectedAnnotation(ann)}
                      style={{
                        borderTop: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: selectedAnnotation?.id === ann.id ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                      }}
                    >
                      <td style={tdStyle}><span style={{ color: 'var(--color-text-muted)' }}>{i + 1}</span></td>
                      <td style={tdStyle}><span style={{ fontWeight: 500 }}>{ann.label}</span></td>
                      <td style={tdStyle}><CategoryTag category={ann.category} /></td>
                      <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>({ann.x.toFixed(0)}, {ann.y.toFixed(0)})</span></td>
                      <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{ann.width.toFixed(0)} × {ann.height.toFixed(0)}</span></td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${ann.confidence * 100}%`, height: '100%', background: categoryColors[ann.category] }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{(ann.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={tdStyle}><span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{ann.notes || '-'}</span></td>
                      <td style={tdStyle}>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!id) return;
                            await sampleApi.deleteAnnotation(id, ann.id);
                            setSample((prev) => prev ? { ...prev, annotations: prev.annotations.filter(a => a.id !== ann.id) } : prev);
                            if (selectedAnnotation?.id === ann.id) setSelectedAnnotation(null);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            color: '#dc2626',
                            background: 'transparent',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            borderRadius: 4,
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              {[
                { k: 'annotations', l: '标注详情' },
                { k: 'sequencing', l: '测序结果' },
                { k: 'lineage', l: '谱系追踪' },
                { k: 'cultivation', l: '培养记录' },
              ].map((tab) => (
                <button
                  key={tab.k}
                  onClick={() => setActiveTab(tab.k as any)}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    fontSize: 12,
                    fontWeight: 500,
                    border: 'none',
                    background: activeTab === tab.k ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                    color: activeTab === tab.k ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    borderBottom: activeTab === tab.k ? '2px solid var(--color-primary)' : '2px solid transparent',
                  }}
                >
                  {tab.l}
                </button>
              ))}
            </div>

            <div style={{ padding: 16, maxHeight: 480, overflowY: 'auto' }}>
              {activeTab === 'annotations' && (
                <div>
                  {selectedAnnotation ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        padding: 14,
                        borderRadius: 'var(--radius)',
                        background: `${categoryColors[selectedAnnotation.category]}12`,
                        border: `1px solid ${categoryColors[selectedAnnotation.category]}30`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <CategoryTag category={selectedAnnotation.category} />
                          <span style={{ fontSize: 18, fontWeight: 700 }}>{selectedAnnotation.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          置信度：<strong style={{ color: categoryColors[selectedAnnotation.category] }}>{(selectedAnnotation.confidence * 100).toFixed(1)}%</strong>
                        </div>
                      </div>
                      <InfoRow label="区域类别" value={categoryLabels[selectedAnnotation.category] || selectedAnnotation.category} />
                      <InfoRow label="坐标 X" value={`${selectedAnnotation.x.toFixed(1)} px`} />
                      <InfoRow label="坐标 Y" value={`${selectedAnnotation.y.toFixed(1)} px`} />
                      <InfoRow label="宽度" value={`${selectedAnnotation.width.toFixed(1)} px`} />
                      <InfoRow label="高度" value={`${selectedAnnotation.height.toFixed(1)} px`} />
                      <InfoRow label="面积" value={`${(selectedAnnotation.width * selectedAnnotation.height).toFixed(0)} px²`} />
                      <InfoRow label="创建时间" value={new Date(selectedAnnotation.createdAt).toLocaleString('zh-CN')} />
                      <InfoRow label="更新时间" value={new Date(selectedAnnotation.updatedAt).toLocaleString('zh-CN')} />
                      {selectedAnnotation.notes && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>备注说明</div>
                          <div style={{ fontSize: 12, padding: 10, background: '#f9fafb', borderRadius: 6, color: 'var(--color-text-secondary)' }}>
                            {selectedAnnotation.notes}
                          </div>
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: 8,
                          padding: 12,
                          borderRadius: 8,
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          fontSize: 12,
                          color: '#1e40af',
                        }}
                      >
                        <strong>📖 解读说明：</strong>
                        该区域被分类为「{categoryLabels[selectedAnnotation.category] || selectedAnnotation.category}」，
                        置信度为 <strong>{(selectedAnnotation.confidence * 100).toFixed(0)}%</strong>。
                        {selectedAnnotation.confidence < 0.7
                          ? '置信度偏低，建议人工复核确认。'
                          : '置信度较高，可作为初步诊断参考。'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 13 }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
                      <div>点击画布中的标注区域<br />查看详细信息</div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'sequencing' && seq && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    padding: 14,
                    borderRadius: 'var(--radius)',
                    background: seq.batchEffectScore > 50 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${seq.batchEffectScore > 50 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>批次效应风险评分</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: seq.batchEffectScore > 50 ? '#dc2626' : '#059669' }}>
                        {seq.batchEffectScore.toFixed(0)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>（满分100，越低越好）</span>
                    </div>
                    {seq.batchEffectFlags.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {seq.batchEffectFlags.map((f, i) => (
                          <span key={i} style={{
                            padding: '2px 8px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#dc2626',
                            borderRadius: 4,
                            fontSize: 10,
                          }}>
                            ⚠️ {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <InfoRow label="测序批次" value={<span style={{ fontFamily: 'monospace' }}>{seq.batchId}</span>} />
                  <InfoRow label="测序质量" value={<QualityScore score={seq.qualityScore} />} />
                  <InfoRow label="GC含量" value={`${seq.gcContent.toFixed(1)}%`} />
                  <InfoRow label="覆盖深度" value={`${seq.coverageDepth.toFixed(0)} ×`} />
                  <InfoRow label="污染率" value={`${seq.contaminationRate.toFixed(2)}%`} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>PCA 坐标</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {['PC1', 'PC2', 'PC3'].map((pc, i) => (
                        <div key={pc} style={{
                          padding: 8,
                          background: '#f9fafb',
                          borderRadius: 6,
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{pc}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                            {[seq.pcaCoordinates.pc1, seq.pcaCoordinates.pc2, seq.pcaCoordinates.pc3][i].toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      fontSize: 12,
                      color: '#1e40af',
                      lineHeight: 1.7,
                    }}
                  >
                    <strong>📖 解读说明：</strong><br />
                    本测序结果的批次效应评分为 <strong>{seq.batchEffectScore.toFixed(0)}</strong>，
                    {seq.batchEffectScore > 50
                      ? '已超过阈值（50），建议重点关注。结合 PCA 聚类图分析，该样本在 PC1 方向与其他批次样本存在显著分离。'
                      : '处于合理范围内。各指标均在正常范围内，可用于后续分析。'}
                  </div>
                </div>
              )}

              {activeTab === 'lineage' && lineage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    padding: 14,
                    borderRadius: 'var(--radius)',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>谱系编号</div>
                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{lineage.lineageId}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5' }}>
                        共 {lineage.samples.length} 个子代
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                      谱系关系图
                    </div>
                    <div style={{
                      padding: 16,
                      background: '#fafafa',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                    }}>
                      {lineage.nodes.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: 20 }}>
                          暂无谱系节点
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {lineage.nodes.map((node, i) => (
                            <div key={node.id}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: node.status === 'corrected'
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : node.status === 'superseded'
                                    ? 'rgba(156, 163, 175, 0.2)'
                                    : 'rgba(34, 197, 94, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 14,
                                  flexShrink: 0,
                                }}>
                                  G{node.generation}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: node.sampleId === sample.id ? 'var(--color-primary)' : 'var(--color-text)',
                                    textDecoration: node.status === 'superseded' ? 'line-through' : 'none',
                                  }}>
                                    {lineage.samples.find(s => s.id === node.sampleId)?.name || node.sampleId.slice(0, 10)}
                                    {node.sampleId === sample.id && (
                                      <span style={{
                                        marginLeft: 6,
                                        padding: '1px 6px',
                                        background: 'rgba(37, 99, 235, 0.15)',
                                        color: '#2563eb',
                                        borderRadius: 4,
                                        fontSize: 10,
                                      }}>当前</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                                    {node.status === 'active' ? '🟢 活跃' : node.status === 'corrected' ? '🟡 已修正' : '⚪ 已废弃'}
                                    {node.correctedFromId && ' · 人工修正'}
                                  </div>
                                </div>
                              </div>
                              {i < lineage.nodes.length - 1 && (
                                <div style={{
                                  width: 1,
                                  height: 12,
                                  marginLeft: 15,
                                  background: '#e5e7eb',
                                }} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowLineageCorrectModal(true)}
                    style={{
                      padding: '10px',
                      border: '1px dashed #d97706',
                      borderRadius: 8,
                      background: 'rgba(245, 158, 11, 0.05)',
                      color: '#b45309',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    🔧 人工修正谱系关系（补录培养记录后同步更新）
                  </button>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: '#fef3c7',
                      border: '1px solid #fcd34d',
                      fontSize: 12,
                      color: '#92400e',
                      lineHeight: 1.7,
                    }}
                  >
                    <strong>📖 说明：</strong><br />
                    谱系追踪采用<strong>动态可修正</strong>模式，培养记录补录后，人工修正会同步更新所有关联节点，
                    不会造成不可逆的一次性错误。
                  </div>
                </div>
              )}

              {activeTab === 'cultivation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => setShowSupplementModal(true)}
                    style={{
                      padding: '10px',
                      border: '1px dashed #2563eb',
                      borderRadius: 8,
                      background: 'rgba(37, 99, 235, 0.04)',
                      color: '#1d4ed8',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ➕ 补录培养记录
                  </button>

                  {cultivation.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 13 }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                      暂无培养记录
                    </div>
                  ) : (
                    cultivation.map((rec, i) => (
                      <div key={rec.id} style={{
                        position: 'relative',
                        padding: 12,
                        paddingLeft: 16,
                        background: rec.isSupplement ? 'rgba(168, 85, 247, 0.06)' : 'white',
                        borderRadius: 8,
                        border: `1px solid ${rec.isSupplement ? 'rgba(168, 85, 247, 0.25)' : '#f0f0f0'}`,
                      }}>
                        {rec.isSupplement && (
                          <span style={{
                            position: 'absolute',
                            top: -8,
                            right: 8,
                            padding: '1px 8px',
                            background: 'rgba(168, 85, 247, 0.9)',
                            color: 'white',
                            borderRadius: 4,
                            fontSize: 10,
                          }}>
                            补录
                          </span>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>
                            {rec.action === 'passage' ? '🔄 传代' :
                             rec.action === 'medium_change' ? '💧 换液' :
                             rec.action === 'treatment' ? '💊 处理' :
                             rec.action === 'observation' ? '👁️ 观察' : '📋 其他'}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {new Date(rec.date).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                          {rec.details}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          操作人：{rec.operator}
                        </div>
                      </div>
                    )).reverse()
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>图例说明</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(Object.keys(categoryLabels) as (keyof typeof categoryLabels)[]).map((cat) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 14,
                    height: 14,
                    background: categoryColors[cat],
                    borderRadius: 3,
                    border: '2px solid ' + categoryColors[cat] + '60',
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{categoryLabels[cat]}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 6,
              background: '#f9fafb',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
            }}>
              💡 每个颜色区域的含义：
              <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
                <li>红框为肿瘤/病变区域，需重点关注</li>
                <li>绿框为正常对照组织，用于基线参考</li>
                <li>紫框为坏死区域，可能影响数据质量</li>
                <li>灰框为切片伪影，分析时需排除</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showReviewModal && (
        <Modal title="提交复核结论" onClose={() => setShowReviewModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>复核结论</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { k: 'approve', l: '✅ 通过', c: '#16a34a' },
                  { k: 'comment', l: '💬 备注', c: '#2563eb' },
                  { k: 'flag', l: '⚠️ 标记关注', c: '#d97706' },
                  { k: 'reject', l: '🚫 不通过', c: '#dc2626' },
                ].map((opt) => (
                  <button
                    key={opt.k}
                    onClick={() => setReviewAction(opt.k as any)}
                    style={{
                      padding: '14px 8px',
                      borderRadius: 'var(--radius)',
                      border: reviewAction === opt.k ? `2px solid ${opt.c}` : '1px solid var(--color-border)',
                      background: reviewAction === opt.k ? `${opt.c}12` : 'var(--color-white)',
                      fontSize: 12,
                      fontWeight: reviewAction === opt.k ? 600 : 400,
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>复核说明</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="请填写复核意见，如：样本质量良好，区域标注准确..."
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            {reviewAction === 'reject' && (
              <div style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: 12,
                color: '#b91c1c',
              }}>
                ⚠️ 选择「不通过」后，该样本将被标记为<strong>不可用记录</strong>，月底转交时会自动汇总给导师。
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowReviewModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-white)',
                  fontSize: 13,
                }}
              >
                取消
              </button>
              <button
                onClick={submitReview}
                style={{
                  padding: '10px 24px',
                  borderRadius: 'var(--radius)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                确认提交
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showSupplementModal && (
        <Modal title="补录培养记录" onClose={() => setShowSupplementModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>操作日期</label>
              <input
                type="date"
                value={supplementData.date}
                onChange={(e) => setSupplementData({ ...supplementData, date: e.target.value })}
                style={{ width: '100%', padding: 10, border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>操作人</label>
              <input
                type="text"
                placeholder="请输入操作人姓名"
                value={supplementData.operator}
                onChange={(e) => setSupplementData({ ...supplementData, operator: e.target.value })}
                style={{ width: '100%', padding: 10, border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>操作类型</label>
              <select
                value={supplementData.action}
                onChange={(e) => setSupplementData({ ...supplementData, action: e.target.value as any })}
                style={{ width: '100%', padding: 10, border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13 }}
              >
                <option value="passage">🔄 传代</option>
                <option value="medium_change">💧 更换培养基</option>
                <option value="treatment">💊 药物/处理</option>
                <option value="observation">👁️ 观察记录</option>
                <option value="other">📋 其他操作</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>操作详情</label>
              <textarea
                rows={3}
                placeholder="请描述具体操作细节，如：1:3传代、加入XX药物处理24小时..."
                value={supplementData.details}
                onChange={(e) => setSupplementData({ ...supplementData, details: e.target.value })}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{
              padding: 10,
              borderRadius: 6,
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              fontSize: 11,
              color: '#6b21a8',
            }}>
              💡 补录记录会自动标记「补录」标签，并同步触发谱系追踪的人工修正流程
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSupplementModal(false)}
                style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'white', fontSize: 13 }}
              >
                取消
              </button>
              <button
                onClick={submitSupplement}
                style={{
                  padding: '10px 24px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#a855f7',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                确认补录
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showLineageCorrectModal && (
        <Modal title="人工修正谱系关系" onClose={() => setShowLineageCorrectModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: 14,
              borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: 12,
              color: '#92400e',
            }}>
              <strong>📌 谱系可追溯修正：</strong><br />
              谱系追踪采用<strong>可追溯、可撤销</strong>模式，不是一次性判断。
              本次修正会：
              <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li>将原节点标记为「已废弃」</li>
                <li>创建新的修正节点并保留历史</li>
                <li>自动同步到培养记录和复核历史</li>
              </ol>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>修正说明</label>
              <textarea
                rows={4}
                placeholder="请说明修正原因，如：补录了3代前的传代记录，需要调整父本节点..."
                value={lineageCorrectNotes}
                onChange={(e) => setLineageCorrectNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLineageCorrectModal(false)}
                style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'white', fontSize: 13 }}
              >
                取消
              </button>
              <button
                onClick={submitLineageCorrect}
                style={{
                  padding: '10px 24px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#d97706',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                确认修正
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoCell({ label, value, span = 1 }: { label: string; value: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #f0f0f0' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          minWidth: 480,
          maxWidth: 560,
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h4>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: '#f3f4f6',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border)',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 12,
  color: 'var(--color-text)',
};
