import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  X,
  ImageOff,
  Calendar,
  User,
  Layers,
  Pencil,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useSampleStore } from '../store/useSampleStore';
import type {
  Sample,
  SampleVersion,
  ImageAnnotation,
  PathologyNote,
  CorrectionLog,
} from '../types';
import { getAllStandardSpecies } from '../utils/species';

/**
 * 样本筛选栏状态接口
 */
interface SampleFilterState {
  /** 搜索关键词（样本ID或物种名） */
  search: string;
  /** 实验组筛选 */
  group: string;
  /** 物种筛选 */
  species: string;
  /** 版本状态筛选 */
  versionStatus: string;
}

/**
 * 样本筛选栏组件
 */
function SampleFilterBar({
  filter,
  onChange,
  onClear,
}: {
  filter: SampleFilterState;
  onChange: (filter: SampleFilterState) => void;
  onClear: () => void;
}) {
  const speciesList = getAllStandardSpecies();
  const groups = ['A', 'B', 'C', 'D'];
  const versionStatuses = [
    { value: '', label: '全部状态' },
    { value: 'draft', label: '草稿' },
    { value: 'ai_reviewed', label: 'AI已复核' },
    { value: 'human_corrected', label: '人工已修正' },
    { value: 'final', label: '最终版' },
  ];

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-deep-ocean/40" />
          <input
            type="text"
            placeholder="搜索样本ID或物种名称..."
            value={filter.search}
            onChange={(e) => onChange({ ...filter, search: e.target.value })}
            className="input-field pl-9"
          />
          {filter.search && (
            <button
              onClick={() => onChange({ ...filter, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-deep-ocean/40 hover:text-deep-ocean"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 实验组筛选 */}
        <select
          value={filter.group}
          onChange={(e) => onChange({ ...filter, group: e.target.value })}
          className="input-field w-28"
        >
          <option value="">全部实验组</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              实验组 {g}
            </option>
          ))}
        </select>

        {/* 物种筛选 */}
        <select
          value={filter.species}
          onChange={(e) => onChange({ ...filter, species: e.target.value })}
          className="input-field w-36"
        >
          <option value="">全部物种</option>
          {speciesList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* 版本状态筛选 */}
        <select
          value={filter.versionStatus}
          onChange={(e) => onChange({ ...filter, versionStatus: e.target.value })}
          className="input-field w-36"
        >
          {versionStatuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* 清除筛选 */}
        {(filter.search || filter.group || filter.species || filter.versionStatus) && (
          <Button variant="secondary" size="sm" onClick={onClear}>
            <span className="flex items-center gap-1">
              <Filter size={14} />
              清除
            </span>
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * 样本卡片组件
 */
function SampleCard({
  sample,
  onClick,
}: {
  sample: Sample;
  onClick: () => void;
}) {
  const getSampleVersions = useSampleStore((s) => s.getSampleVersions);
  const versions = getSampleVersions(sample.id);
  const latestVersion = versions[versions.length - 1];

  const statusBadge = () => {
    if (!latestVersion) return <Badge variant="neutral">无版本</Badge>;
    switch (latestVersion.status) {
      case 'final':
        return <Badge variant="success">最终版</Badge>;
      case 'human_corrected':
        return <Badge variant="info">人工修正</Badge>;
      case 'ai_reviewed':
        return <Badge variant="warn">AI复核</Badge>;
      default:
        return <Badge variant="neutral">草稿</Badge>;
    }
  };

  return (
    <Card hoverable className="overflow-hidden cursor-pointer" onClick={onClick}>
      {/* 图片区域 */}
      <div className="aspect-[4/3] bg-paper-dark relative overflow-hidden">
        {sample.image_url ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(30,58,95,0.1) 0%, rgba(45,90,74,0.1) 100%)',
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <FlaskConical size={48} className="text-deep-ocean/30" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-deep-ocean/40">
              <ImageOff size={36} className="mx-auto mb-1" />
              <p className="text-xs">无图片</p>
            </div>
          </div>
        )}
        {/* 状态徽章 */}
        <div className="absolute top-2 right-2">{statusBadge()}</div>
      </div>

      {/* 信息区域 */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-serif font-semibold text-deep-ocean">{sample.id}</p>
            <p className="text-sm text-deep-ocean/60">
              {sample.standard_species_name || sample.species_name}
            </p>
          </div>
          <Badge variant="neutral">组 {sample.group}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-deep-ocean/50">
          <span className="flex items-center gap-1">
            <Layers size={12} />
            v{latestVersion?.version_number ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {new Date(sample.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </Card>
  );
}

/**
 * 标注编辑器组件（简化版）
 */
function AnnotationEditor({
  annotations,
  onAdd,
  onUpdate,
}: {
  annotations: ImageAnnotation[];
  onAdd: (ann: ImageAnnotation) => void;
  onUpdate: (id: string, patch: Partial<ImageAnnotation>, reason: string) => void;
}) {
  const [editReason, setEditReason] = useState('');
  const labels = ['肝肿大', '脾坏死', '肾囊肿', '肠道炎症', '鳃丝增生', '心肌病变'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-serif font-semibold text-deep-ocean">图片标注</h4>
        <Badge variant="info">{annotations.length} 个标注</Badge>
      </div>

      {/* 模拟图片画布 */}
      <div className="aspect-[4/3] bg-paper-dark rounded-lg border border-deep-ocean/10 relative overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-deep-ocean/40 text-sm">样本图片预览区域</p>
        </div>
        {/* 标注框可视化 */}
        {annotations.map((ann) => (
          <div
            key={ann.id}
            className="absolute border-2 border-corral-severe bg-corral-severe/10 rounded"
            style={{
              left: `${(ann.x / 600) * 100}%`,
              top: `${(ann.y / 450) * 100}%`,
              width: `${(ann.width / 600) * 100}%`,
              height: `${(ann.height / 450) * 100}%`,
            }}
          >
            <span className="absolute -top-5 left-0 text-xs bg-corral-severe text-paper px-1.5 py-0.5 rounded">
              {ann.label}
            </span>
          </div>
        ))}
      </div>

      {/* 标注列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {annotations.map((ann) => (
          <div
            key={ann.id}
            className="p-3 bg-paper-dark/50 rounded-lg border border-deep-ocean/5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={ann.source === 'ai' ? 'warn' : 'success'}>
                    {ann.source === 'ai' ? 'AI' : '人工'}
                  </Badge>
                  <span className="font-medium text-deep-ocean text-sm">{ann.label}</span>
                </div>
                <p className="text-xs text-deep-ocean/50 mt-1">
                  置信度: {(ann.confidence * 100).toFixed(0)}% | 位置: ({ann.x},{' '}
                  {ann.y})
                </p>
              </div>
              {ann.source === 'ai' && (
                <select
                  value={ann.label}
                  onChange={(e) => {
                    if (editReason) {
                      onUpdate(ann.id, { label: e.target.value }, editReason);
                      setEditReason('');
                    }
                  }}
                  className="input-field text-xs w-28"
                >
                  {labels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 样本详情抽屉组件
 */
function SampleDetailDrawer({
  sample,
  onClose,
}: {
  sample: Sample;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const getSampleVersions = useSampleStore((s) => s.getSampleVersions);
  const getVersionAnnotations = useSampleStore((s) => s.getVersionAnnotations);
  const getVersionPathologyNotes = useSampleStore((s) => s.getVersionPathologyNotes);
  const getVersionCorrectionLogs = useSampleStore((s) => s.getVersionCorrectionLogs);
  const addAnnotation = useSampleStore((s) => s.addAnnotation);
  const updateAnnotation = useSampleStore((s) => s.updateAnnotation);
  const addPathologyNote = useSampleStore((s) => s.addPathologyNote);

  const versions = getSampleVersions(sample.id);
  const [selectedVersionId, setSelectedVersionId] = useState(
    sample.current_version_id || versions[versions.length - 1]?.id || ''
  );
  const annotations = getVersionAnnotations(selectedVersionId);
  const pathologyNotes = getVersionPathologyNotes(selectedVersionId);
  const correctionLogs = getVersionCorrectionLogs(selectedVersionId);

  const [newNote, setNewNote] = useState('');

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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="p-5 border-b border-deep-ocean/10 flex items-start justify-between">
        <div>
          <h3 className="font-serif font-bold text-deep-ocean text-xl">{sample.id}</h3>
          <p className="text-sm text-deep-ocean/60 mt-0.5">
            {sample.standard_species_name || sample.species_name}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-deep-ocean/50">
            <span className="flex items-center gap-1">
              <User size={12} />
              实验组 {sample.group}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(sample.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/samples/${sample.id}`)}
          >
            <span className="flex items-center gap-1">
              <Pencil size={14} />
              完整编辑
            </span>
          </Button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-paper-dark text-deep-ocean/50 hover:text-deep-ocean"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
        {/* 版本选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-deep-ocean/70">版本历史</label>
          <select
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            className="input-field"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version_number} - {v.status} ({new Date(v.created_at).toLocaleString('zh-CN')})
              </option>
            ))}
          </select>
        </div>

        {/* 标注编辑器 */}
        <AnnotationEditor
          annotations={annotations}
          onAdd={addAnnotation}
          onUpdate={updateAnnotation}
        />

        {/* 病理备注 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-semibold text-deep-ocean">病理备注</h4>
            <Badge variant="info">{pathologyNotes.length} 条</Badge>
          </div>
          <div className="space-y-2">
            {pathologyNotes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-paper-dark/50 rounded-lg border-l-4 border-life-green"
              >
                <p className="text-sm text-deep-ocean/80 leading-relaxed">{note.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-deep-ocean/50">
                  <User size={12} />
                  {note.created_by}
                  <span>·</span>
                  {new Date(note.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
          {/* 添加备注 */}
          <div className="space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="输入病理备注..."
              className="input-field min-h-20 resize-none"
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
        </div>

        {/* 修正记录 */}
        {correctionLogs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-semibold text-deep-ocean">修正记录</h4>
              <Badge variant="warn">{correctionLogs.length} 条</Badge>
            </div>
            <div className="space-y-2">
              {correctionLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-amber-warn/5 rounded-lg border border-amber-warn/20"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-amber-warn" />
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
                    <User size={12} />
                    {log.created_by}
                    <span>·</span>
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 样本管理页
 * 顶部筛选栏 + 样本卡片瀑布流 + 详情抽屉
 */
export function SamplesPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const samples = useSampleStore((s) => s.samples);
  const versions = useSampleStore((s) => s.versions);
  const getSampleById = useSampleStore((s) => s.getSampleById);

  /** 筛选状态 */
  const [filter, setFilter] = useState<SampleFilterState>({
    search: '',
    group: '',
    species: '',
    versionStatus: '',
  });

  /** 选中的样本（用于抽屉） */
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(id ?? null);

  /**
   * 筛选样本
   */
  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      if (filter.search) {
        const search = filter.search.toLowerCase();
        if (
          !sample.id.toLowerCase().includes(search) &&
          !sample.species_name.toLowerCase().includes(search) &&
          !(sample.standard_species_name || '').toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      if (filter.group && sample.group !== filter.group) return false;
      if (
        filter.species &&
        sample.standard_species_name !== filter.species &&
        sample.species_name !== filter.species
      )
        return false;
      if (filter.versionStatus) {
        const sampleVersions = versions.filter((v) => v.sample_id === sample.id);
        const latest = sampleVersions[sampleVersions.length - 1];
        if (!latest || latest.status !== filter.versionStatus) return false;
      }
      return true;
    });
  }, [samples, versions, filter]);

  const selectedSample = selectedSampleId ? getSampleById(selectedSampleId) : null;

  /**
   * 右侧抽屉内容
   */
  const rightPanel = selectedSample ? (
    <SampleDetailDrawer
      sample={selectedSample}
      onClose={() => {
        setSelectedSampleId(null);
        navigate('/samples');
      }}
    />
  ) : null;

  return (
    <AppLayout rightPanel={rightPanel} rightPanelWidth="w-[480px]">
      <div className="space-y-6">
        {/* 页面标题和新建按钮 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif font-bold text-deep-ocean text-2xl">样本管理</h1>
            <p className="text-sm text-deep-ocean/50 mt-1">
              共 {samples.length} 个样本，筛选后 {filteredSamples.length} 个
            </p>
          </div>
          <Button variant="primary">
            <span className="flex items-center gap-2">
              <Plus size={16} />
              新建样本
            </span>
          </Button>
        </div>

        {/* 筛选栏 */}
        <SampleFilterBar
          filter={filter}
          onChange={setFilter}
          onClear={() =>
            setFilter({ search: '', group: '', species: '', versionStatus: '' })
          }
        />

        {/* 样本卡片网格 */}
        {filteredSamples.length === 0 ? (
          <Card className="p-12 text-center">
            <FlaskConical size={48} className="mx-auto mb-3 text-deep-ocean/30" />
            <p className="text-deep-ocean/50">暂无符合条件的样本</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSamples.map((sample) => (
              <SampleCard
                key={sample.id}
                sample={sample}
                onClick={() => {
                  setSelectedSampleId(sample.id);
                  navigate(`/samples/${sample.id}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
