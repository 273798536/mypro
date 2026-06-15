import { useState } from 'react';
import { Edit2, Check, X, RotateCcw, Tag, FileText, AlignLeft } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { cn } from '@/lib/utils';

interface SceneInfoProps {
  reviewId: string;
  variant?: 'labels' | 'sideNote' | 'summary' | 'all';
}

const availableLabels = [
  '主干道交叉口',
  '次干道',
  '老旧管网',
  '新建区域',
  '早高峰积水',
  '地势低洼',
  '文教区',
  '绿化率高',
  '落叶较多',
  '滨江区域',
];

export default function SceneInfo({ reviewId, variant = 'all' }: SceneInfoProps) {
  const sceneMeta = useReviewStore((state) => state.getSceneMeta(reviewId));
  const updateSceneLabels = useReviewStore((state) => state.updateSceneLabels);
  const updateSideNote = useReviewStore((state) => state.updateSideNote);
  const updatePageSummary = useReviewStore((state) => state.updatePageSummary);
  const regenerateFromLabels = useReviewStore((state) => state.regenerateFromLabels);

  const [editingLabels, setEditingLabels] = useState(false);
  const [editingSideNote, setEditingSideNote] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [tempLabels, setTempLabels] = useState<string[]>([]);
  const [tempSideNote, setTempSideNote] = useState('');
  const [tempSummary, setTempSummary] = useState('');

  if (!sceneMeta) return null;

  const startEditLabels = () => {
    setTempLabels([...sceneMeta.sceneLabels]);
    setEditingLabels(true);
  };

  const saveLabels = () => {
    updateSceneLabels(reviewId, tempLabels);
    setEditingLabels(false);
  };

  const cancelLabels = () => {
    setTempLabels([]);
    setEditingLabels(false);
  };

  const toggleLabel = (label: string) => {
    if (tempLabels.includes(label)) {
      setTempLabels(tempLabels.filter((l) => l !== label));
    } else {
      setTempLabels([...tempLabels, label]);
    }
  };

  const startEditSideNote = () => {
    setTempSideNote(sceneMeta.sideNote);
    setEditingSideNote(true);
  };

  const saveSideNote = () => {
    updateSideNote(reviewId, tempSideNote, true);
    setEditingSideNote(false);
  };

  const cancelSideNote = () => {
    setTempSideNote('');
    setEditingSideNote(false);
  };

  const startEditSummary = () => {
    setTempSummary(sceneMeta.pageSummary);
    setEditingSummary(true);
  };

  const saveSummary = () => {
    updatePageSummary(reviewId, tempSummary, true);
    setEditingSummary(false);
  };

  const cancelSummary = () => {
    setTempSummary('');
    setEditingSummary(false);
  };

  const handleRegenerate = () => {
    regenerateFromLabels(reviewId);
  };

  const labelsSection = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-steel-600">
          <Tag size={16} className="text-primary-500" />
          <span>场景标注</span>
          {!editingLabels && (
            <span className="text-xs text-steel-400 font-normal">
              （统一数据源）
            </span>
          )}
        </div>
        {!editingLabels ? (
          <button
            onClick={startEditLabels}
            className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
          >
            <Edit2 size={12} />
            编辑
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={saveLabels}
              className="flex items-center gap-1 text-xs text-success-500 hover:text-success-600"
            >
              <Check size={14} />
              保存
            </button>
            <button
              onClick={cancelLabels}
              className="flex items-center gap-1 text-xs text-steel-400 hover:text-steel-500"
            >
              <X size={14} />
              取消
            </button>
          </div>
        )}
      </div>

      {!editingLabels ? (
        <div className="flex flex-wrap gap-2">
          {sceneMeta.sceneLabels.length > 0 ? (
            sceneMeta.sceneLabels.map((label) => (
              <span
                key={label}
                className="px-2.5 py-1 bg-primary-50 text-primary-600 text-xs rounded-md"
              >
                {label}
              </span>
            ))
          ) : (
            <span className="text-sm text-steel-400">暂无场景标注</span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {availableLabels.map((label) => (
              <button
                key={label}
                onClick={() => toggleLabel(label)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-md border transition-colors',
                  tempLabels.includes(label)
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-steel-500 border-steel-200 hover:border-primary-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-steel-400">
            选择场景标签后，系统将自动更新侧边说明和页面摘要
          </p>
        </div>
      )}
    </div>
  );

  const sideNoteSection = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-steel-600">
          <AlignLeft size={16} className="text-primary-500" />
          <span>侧边说明</span>
          {sceneMeta.sideNoteManual && (
            <span className="text-xs text-warning-500 font-normal bg-warning-50 px-1.5 py-0.5 rounded">
              已手动调整
            </span>
          )}
        </div>
        {!editingSideNote ? (
          <div className="flex items-center gap-2">
            {sceneMeta.sideNoteManual && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1 text-xs text-steel-400 hover:text-steel-500"
                title="根据标签重新生成"
              >
                <RotateCcw size={12} />
                重新生成
              </button>
            )}
            <button
              onClick={startEditSideNote}
              className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
            >
              <Edit2 size={12} />
              编辑
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={saveSideNote}
              className="flex items-center gap-1 text-xs text-success-500 hover:text-success-600"
            >
              <Check size={14} />
              保存
            </button>
            <button
              onClick={cancelSideNote}
              className="flex items-center gap-1 text-xs text-steel-400 hover:text-steel-500"
            >
              <X size={14} />
              取消
            </button>
          </div>
        )}
      </div>

      {!editingSideNote ? (
        <p className="text-sm text-steel-500 leading-relaxed">
          {sceneMeta.sideNote}
        </p>
      ) : (
        <textarea
          value={tempSideNote}
          onChange={(e) => setTempSideNote(e.target.value)}
          className="w-full h-24 px-3 py-2 text-sm border border-steel-200 rounded-md text-steel-700 placeholder-steel-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none"
        />
      )}
    </div>
  );

  const summarySection = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-steel-600">
          <FileText size={16} className="text-primary-500" />
          <span>页面摘要</span>
          {sceneMeta.pageSummaryManual && (
            <span className="text-xs text-warning-500 font-normal bg-warning-50 px-1.5 py-0.5 rounded">
              已手动调整
            </span>
          )}
        </div>
        {!editingSummary ? (
          <div className="flex items-center gap-2">
            {sceneMeta.pageSummaryManual && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1 text-xs text-steel-400 hover:text-steel-500"
                title="根据标签重新生成"
              >
                <RotateCcw size={12} />
                重新生成
              </button>
            )}
            <button
              onClick={startEditSummary}
              className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
            >
              <Edit2 size={12} />
              编辑
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={saveSummary}
              className="flex items-center gap-1 text-xs text-success-500 hover:text-success-600"
            >
              <Check size={14} />
              保存
            </button>
            <button
              onClick={cancelSummary}
              className="flex items-center gap-1 text-xs text-steel-400 hover:text-steel-500"
            >
              <X size={14} />
              取消
            </button>
          </div>
        )}
      </div>

      {!editingSummary ? (
        <p className="text-sm text-steel-500 leading-relaxed">
          {sceneMeta.pageSummary}
        </p>
      ) : (
        <textarea
          value={tempSummary}
          onChange={(e) => setTempSummary(e.target.value)}
          className="w-full h-20 px-3 py-2 text-sm border border-steel-200 rounded-md text-steel-700 placeholder-steel-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none"
        />
      )}
    </div>
  );

  if (variant === 'labels') return labelsSection;
  if (variant === 'sideNote') return sideNoteSection;
  if (variant === 'summary') return summarySection;

  return (
    <div className="space-y-5">
      {labelsSection}
      <div className="border-t border-steel-100" />
      {sideNoteSection}
      <div className="border-t border-steel-100" />
      {summarySection}
      <div className="pt-2 text-xs text-steel-400 flex items-center justify-between">
        <span>最后更新：{sceneMeta.updatedAt}</span>
        <span>更新人：{sceneMeta.updatedBy}</span>
      </div>
    </div>
  );
}
