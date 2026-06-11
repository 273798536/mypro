import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FlaskConical,
  User,
  Calendar,
  ImageOff,
  Save,
  AlertTriangle,
  StickyNote,
  History,
  Tag,
  Clock,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useSampleStore } from '../store/useSampleStore';
import type {
  ImageAnnotation,
  SampleVersion,
  PathologyNote,
  CorrectionLog,
  SampleVersionStatus,
} from '../types';

/**
 * 版本状态标签映射
 */
const versionStatusLabel: Record<SampleVersionStatus, string> = {
  draft: '草稿',
  ai_reviewed: 'AI已复核',
  human_corrected: '人工已修正',
  final: '最终版',
};

/**
 * 版本状态对应徽章变体
 */
const versionStatusBadge: Record<SampleVersionStatus, 'neutral' | 'warn' | 'info' | 'success'> = {
  draft: 'neutral',
  ai_reviewed: 'warn',
  human_corrected: 'info',
  final: 'success',
};

/**
 * 标注编辑器组件（完整版，用于详情页左侧）
 */
function AnnotationEditor({
  annotations,
  versionId,
  onAdd,
  onUpdate,
  onDelete,
}: {
  annotations: ImageAnnotation[];
  versionId: string;
  onAdd: (ann: ImageAnnotation) => void;
  onUpdate: (id: string, patch: Partial<ImageAnnotation>, reason: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editReason, setEditReason] = useState('');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const labels = ['肝肿大', '脾坏死', '肾囊肿', '肠道炎症', '鳃丝增生', '心肌病变'];
  const [newLabel, setNewLabel] = useState(labels[0]);

  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);

  const handleAddAnnotation = () => {
    const newAnnotation: ImageAnnotation = {
      id: `ann_${Date.now()}`,
      version_id: versionId,
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      label: newLabel,
      confidence: 1.0,
      source: 'human',
      created_at: new Date().toISOString(),
    };
    onAdd(newAnnotation);
  };

  return (
    <Card className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif font-semibold text-deep-ocean text-lg">标注编辑器</h3>
          <p className="text-xs text-deep-ocean/50 mt-0.5">
            点击图片添加标注，或选择已有标注进行编辑
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleAddAnnotation}>
          <span className="flex items-center gap-1">
            <Plus size={14} />
            添加标注
          </span>
        </Button>
      </div>

      {/* 图片画布区域 */}
      <div className="flex-1 min-h-96 bg-paper-dark rounded-lg border border-deep-ocean/10 relative overflow-hidden mb-4">
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <FlaskConical size={64} className="mx-auto mb-2 text-deep-ocean/20" />
            <p className="text-deep-ocean/40 text-sm">样本图片预览</p>
            <p className="text-deep-ocean/30 text-xs mt-1">（实际项目中此处为真实病理图像）</p>
          </div>
        </div>
        {/* 标注框可视化 */}
        {annotations.map((ann) => (
          <div
            key={ann.id}
            onClick={() => setSelectedAnnotationId(ann.id)}
            className={`absolute border-2 rounded cursor-pointer transition-all ${
              selectedAnnotationId === ann.id
                ? 'border-life-green ring-2 ring-life-green/30'
                : ann.source === 'ai'
                ? 'border-corral-severe bg-corral-severe/5'
                : 'border-deep-ocean bg-deep-ocean/5'
            }`}
            style={{
              left: `${(ann.x / 600) * 100}%`,
              top: `${(ann.y / 450) * 100}%`,
              width: `${(ann.width / 600) * 100}%`,
              height: `${(ann.height / 450) * 100}%`,
            }}
          >
            <span
              className={`absolute -top-5 left-0 text-xs px-1.5 py-0.5 rounded ${
                selectedAnnotationId === ann.id
                  ? 'bg-life-green text-paper'
                  : ann.source === 'ai'
                  ? 'bg-corral-severe text-paper'
                  : 'bg-deep-ocean text-paper'
              }`}
            >
              {ann.label}
            </span>
          </div>
        ))}
      </div>

      {/* 标注编辑面板 */}
      {selectedAnnotation ? (
        <div className="p-4 bg-paper-dark/50 rounded-lg border border-deep-ocean/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-deep-ocean text-sm">编辑标注</h4>
            <button
              onClick={() => {
                onDelete(selectedAnnotation.id);
                setSelectedAnnotationId(null);
              }}
              className="p-1 rounded hover:bg-corral-severe/10 text-corral-severe"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-deep-ocean/60 mb-1 block">标签类型</label>
              <select
                value={selectedAnnotation.label}
                onChange={(e) =>
                  onUpdate(
                    selectedAnnotation.id,
                    { label: e.target.value },
                    editReason || '修改标签类型'
                  )
                }
                className="input-field text-sm"
              >
                {labels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-deep-ocean/60 mb-1 block">置信度</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={selectedAnnotation.confidence}
                onChange={(e) =>
                  onUpdate(
                    selectedAnnotation.id,
                    { confidence: parseFloat(e.target.value) },
                    editReason || '调整置信度'
                  )
                }
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-deep-ocean/60 mb-1 block">X 坐标</label>
              <input
                type="number"
                value={selectedAnnotation.x}
                onChange={(e) =>
                  onUpdate(
                    selectedAnnotation.id,
                    { x: parseInt(e.target.value) },
                    editReason || '调整标注位置'
                  )
                }
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-deep-ocean/60 mb-1 block">Y 坐标</label>
              <input
                type="number"
                value={selectedAnnotation.y}
                onChange={(e) =>
                  onUpdate(
                    selectedAnnotation.id,
                    { y: parseInt(e.target.value) },
                    editReason || '调整标注位置'
                  )
                }
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-deep-ocean/60 mb-1 block">宽度</label>
              <input
                type="number"
                value={selectedAnnotation.width}
                onChange={(e) =>
                  onUpdate(
                    selectedAnnotation.id,
                    { width: parseInt(e.target.value) },
                    editReason || '调整标注尺寸'
                  )
                }
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-deep-ocean/60 mb-1 block">高度</label>
              <input
                type="number"
                value={selectedAnnotation.height}
                onChange={(e) =>
                  onUpdate(
                    selectedAnnotation.id,
                    { height: parseInt(e.target.value) },
                    editReason || '调整标注尺寸'
                  )
                }
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-deep-ocean/60 mb-1 block">修改原因（用于修正记录）</label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="请输入修改原因..."
              className="input-field text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-deep-ocean/50">
            <Badge variant={selectedAnnotation.source === 'ai' ? 'warn' : 'success'}>
              {selectedAnnotation.source === 'ai' ? 'AI 标注' : '人工标注'}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {new Date(selectedAnnotation.created_at).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-paper-dark/30 rounded-lg border border-dashed border-deep-ocean/10 text-center">
          <p className="text-sm text-deep-ocean/40">点击标注框进行编辑</p>
        </div>
      )}
    </Card>
  );
}

/**
 * 独立样本详情页
 * 左侧标注编辑器，右侧样本信息 + 版本历史 + 病理备注 + 修正记录
 */
export function SampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const getSampleById = useSampleStore((s) => s.getSampleById);
  const getSampleVersions = useSampleStore((s) => s.getSampleVersions);
  const getVersionAnnotations = useSampleStore((s) => s.getVersionAnnotations);
  const getVersionPathologyNotes = useSampleStore((s) => s.getVersionPathologyNotes);
  const getVersionCorrectionLogs = useSampleStore((s) => s.getVersionCorrectionLogs);
  const addAnnotation = useSampleStore((s) => s.addAnnotation);
  const updateAnnotation = useSampleStore((s) => s.updateAnnotation);
  const addPathologyNote = useSampleStore((s) => s.addPathologyNote);

  const sample = id ? getSampleById(id) : undefined;

  if (!sample) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <FlaskConical size={64} className="text-deep-ocean/20 mb-4" />
          <h2 className="font-serif font-semibold text-deep-ocean text-xl mb-2">样本不存在</h2>
          <p className="text-deep-ocean/50 mb-4">未找到 ID 为 {id} 的样本</p>
          <Button variant="secondary" onClick={() => navigate('/samples')}>
            <span className="flex items-center gap-2">
              <ArrowLeft size={16} />
              返回样本列表
            </span>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const versions = getSampleVersions(sample.id);
  const [selectedVersionId, setSelectedVersionId] = useState(
    sample.current_version_id || versions[versions.length - 1]?.id || ''
  );
  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  const annotations = getVersionAnnotations(selectedVersionId);
  const pathologyNotes = getVersionPathologyNotes(selectedVersionId);
  const correctionLogs = getVersionCorrectionLogs(selectedVersionId);

  const [newNote, setNewNote] = useState('');
  const [editingInfo, setEditingInfo] = useState(false);
  const [editSpecies, setEditSpecies] = useState(sample.species_name);

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedVersionId) return;
    addPathologyNote({
      id: `note_${Date.now()}`,
      version_id: selectedVersionId,
      content: newNote,
      annotation_id: null,
      created_at: new Date().toISOString(),
      created_by: 'current_user',
    });
    setNewNote('');
  };

  const handleDeleteAnnotation = () => {
    // 简化实现，实际项目中应有专门的删除方法
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/samples')}
            >
              <span className="flex items-center gap-1">
                <ArrowLeft size={16} />
                返回
              </span>
            </Button>
            <div>
              <h1 className="font-serif font-bold text-deep-ocean text-2xl">
                {sample.id}
              </h1>
              <p className="text-sm text-deep-ocean/50 mt-0.5">
                {sample.standard_species_name || sample.species_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">实验组 {sample.group}</Badge>
            {selectedVersion && (
              <Badge variant={versionStatusBadge[selectedVersion.status]}>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  {versionStatusLabel[selectedVersion.status]}
                </span>
              </Badge>
            )}
          </div>
        </div>

        {/* 主体内容：左右两栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧：标注编辑器 */}
          <div className="lg:col-span-3">
            <AnnotationEditor
              annotations={annotations}
              versionId={selectedVersionId}
              onAdd={addAnnotation}
              onUpdate={updateAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          </div>

          {/* 右侧：样本信息面板 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 样本基本信息 */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-semibold text-deep-ocean text-lg">样本信息</h3>
                <button
                  onClick={() => setEditingInfo(!editingInfo)}
                  className="p-1.5 rounded-lg hover:bg-paper-dark text-deep-ocean/50 hover:text-deep-ocean"
                >
                  <Edit3 size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* 物种名称 */}
                <div>
                  <label className="text-xs text-deep-ocean/60 mb-1 block">物种名称</label>
                  {editingInfo ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editSpecies}
                        onChange={(e) => setEditSpecies(e.target.value)}
                        className="input-field text-sm flex-1"
                      />
                      <Button variant="primary" size="sm">
                        <Save size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-deep-ocean">
                        {sample.standard_species_name || sample.species_name}
                      </p>
                      {sample.standard_species_name && sample.standard_species_name !== sample.species_name && (
                        <p className="text-xs text-deep-ocean/50 mt-0.5">
                          原始输入: {sample.species_name}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 实验组 */}
                <div>
                  <label className="text-xs text-deep-ocean/60 mb-1 block">实验组</label>
                  <p className="text-sm text-deep-ocean">{sample.group}</p>
                </div>

                {/* 投喂记录关联 */}
                <div>
                  <label className="text-xs text-deep-ocean/60 mb-1 block">所属投喂记录</label>
                  <p className="text-sm text-deep-ocean">{sample.feeding_record_id}</p>
                </div>

                {/* 创建时间 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-deep-ocean/60 mb-1 block">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        创建时间
                      </span>
                    </label>
                    <p className="text-sm text-deep-ocean">
                      {new Date(sample.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-deep-ocean/60 mb-1 block">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        更新时间
                      </span>
                    </label>
                    <p className="text-sm text-deep-ocean">
                      {new Date(sample.updated_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>

                {/* 图片状态 */}
                <div>
                  <label className="text-xs text-deep-ocean/60 mb-1 block">图片状态</label>
                  {sample.image_url ? (
                    <Badge variant="success">已上传</Badge>
                  ) : (
                    <Badge variant="danger">
                      <span className="flex items-center gap-1">
                        <ImageOff size={12} />
                        缺失
                      </span>
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* 版本历史 */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-semibold text-deep-ocean text-lg">
                  <span className="flex items-center gap-2">
                    <History size={18} />
                    版本历史
                  </span>
                </h3>
                <Badge variant="info">{versions.length} 个版本</Badge>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {versions.map((version, idx) => (
                  <div
                    key={version.id}
                    onClick={() => setSelectedVersionId(version.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedVersionId === version.id
                        ? 'border-deep-ocean bg-deep-ocean/5'
                        : 'border-deep-ocean/10 hover:border-deep-ocean/30 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-deep-ocean text-sm">
                        v{version.version_number}
                      </span>
                      <Badge variant={versionStatusBadge[version.status]}>
                        {versionStatusLabel[version.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-deep-ocean/50">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {version.created_by}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag size={10} />
                        {version.run_id}
                      </span>
                    </div>
                    <p className="text-xs text-deep-ocean/40 mt-1">
                      {new Date(version.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* 病理备注编辑 */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-semibold text-deep-ocean text-lg">
                  <span className="flex items-center gap-2">
                    <StickyNote size={18} />
                    病理备注
                  </span>
                </h3>
                <Badge variant="info">{pathologyNotes.length} 条</Badge>
              </div>

              {/* 备注列表 */}
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto scrollbar-thin">
                {pathologyNotes.length === 0 ? (
                  <p className="text-sm text-deep-ocean/40 text-center py-4">暂无病理备注</p>
                ) : (
                  pathologyNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-life-green/5 rounded-lg border-l-4 border-life-green"
                    >
                      <p className="text-sm text-deep-ocean/80 leading-relaxed">
                        {note.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-deep-ocean/50">
                        <User size={12} />
                        {note.created_by}
                        <span>·</span>
                        {new Date(note.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 添加备注 */}
              <div className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="输入病理备注..."
                  className="input-field min-h-20 resize-none text-sm"
                />
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleAddNote}>
                    <span className="flex items-center gap-1">
                      <Save size={14} />
                      保存备注
                    </span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* 修正记录 */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-semibold text-deep-ocean text-lg">
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={18} />
                    修正记录
                  </span>
                </h3>
                <Badge variant="warn">{correctionLogs.length} 条</Badge>
              </div>

              {correctionLogs.length === 0 ? (
                <p className="text-sm text-deep-ocean/40 text-center py-4">暂无修正记录</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {correctionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-amber-warn/5 rounded-lg border border-amber-warn/20"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={12} className="text-amber-warn" />
                        <span className="text-xs font-medium text-amber-warn">
                          {log.field_name} 已修正
                        </span>
                      </div>
                      <p className="text-xs text-deep-ocean/70">
                        <span className="line-through">{log.old_value}</span>
                        <span className="mx-2">→</span>
                        <span className="font-medium">{log.new_value}</span>
                      </p>
                      {log.reason && (
                        <p className="text-xs text-deep-ocean/50 mt-1">原因：{log.reason}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-deep-ocean/40">
                        <User size={10} />
                        {log.created_by}
                        <span>·</span>
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
