import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  FilePen,
  Eye,
} from 'lucide-react';
import { useStore } from '@/store';
import type { Violation, Conclusion, Draft } from '@/api';

export default function LevelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentLevel,
    violations,
    affectedConclusions,
    conclusions,
    drafts,
    fetchLevel,
    fetchViolations,
    fetchConclusions,
    fetchDrafts,
    loading,
  } = useStore();
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchLevel(id);
    fetchViolations(id);
    fetchConclusions(id);
    fetchDrafts(id);
  }, [id, fetchLevel, fetchViolations, fetchConclusions, fetchDrafts]);

  if (loading || !currentLevel) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-custom">加载中...</div>
    );
  }

  const openViolations = violations.filter((v) => v.status === 'open');
  const fixedViolations = violations.filter((v) => v.status === 'fixed');
  const suppressedViolations = violations.filter((v) => v.status === 'suppressed');

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '待检';
      case 'review': return '审核中';
      case 'confirmed': return '已确认';
      case 'pending': return '待确认';
      case 'rejected': return '已驳回';
      case 'missing': return '缺失';
      case 'partial': return '部分';
      case 'complete': return '完整';
      case 'open': return '未修正';
      case 'fixed': return '已修正';
      case 'suppressed': return '已抑制';
      default: return status;
    }
  };

  const getConclusionById = (cid: string): Conclusion | undefined => {
    return affectedConclusions.find((c) => c.id === cid) || conclusions.find((c) => c.id === cid);
  };

  const getDraftsForConclusion = (conclusion: Conclusion): Draft[] => {
    return drafts.filter(
      (d) => d.linkedConclusionIds.includes(conclusion.id)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="btn-emboss-ghost p-1.5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-serif text-2xl font-semibold text-ink">{currentLevel.name}</h2>
          <p className="text-sm text-slate-custom">{currentLevel.description}</p>
        </div>
        <button
          onClick={() => navigate(`/level/${id}/edit`)}
          className="btn-emboss-primary flex items-center gap-1.5 text-sm"
        >
          <Edit3 className="h-4 w-4" />
          修正违例
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-amber" />
          <h3 className="font-serif text-lg font-semibold">关卡配置</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-custom/70">网格尺寸</p>
            <p className="font-medium text-ink">{currentLevel.gridWidth}×{currentLevel.gridHeight}</p>
          </div>
          <div>
            <p className="text-xs text-slate-custom/70">单元格大小</p>
            <p className="font-medium text-ink">{currentLevel.cellSize}px</p>
          </div>
          <div>
            <p className="text-xs text-slate-custom/70">吸附</p>
            <p className="font-medium text-ink">{currentLevel.snapEnabled ? '已启用' : '未启用'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-custom/70">状态</p>
            <p className="font-medium text-ink">{getStatusLabel(currentLevel.status)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-terracotta" />
          <h3 className="font-serif text-lg font-semibold">
            违例列表
            {violations.length > 0 && (
              <span className="ml-2 text-sm font-normal text-terracotta">
                ({openViolations.length} 未修正 / {fixedViolations.length} 已修正 / {suppressedViolations.length} 已抑制)
              </span>
            )}
          </h3>
        </div>

        {violations.length === 0 ? (
          <div className="card-success flex items-center gap-2 py-3">
            <span className="text-moss">无违例记录</span>
          </div>
        ) : (
          violations.map((v) => (
            <ViolationCard
              key={v.id}
              violation={v}
              expanded={expandedViolation === v.id}
              onToggle={() =>
                setExpandedViolation(expandedViolation === v.id ? null : v.id)
              }
              getConclusionById={getConclusionById}
              getDraftsForConclusion={getDraftsForConclusion}
              onFix={() => navigate(`/level/${id}/edit`)}
            />
          ))
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-moss" />
          <h3 className="font-serif text-lg font-semibold">
            结论清单
            <span className="ml-2 text-sm font-normal text-slate-custom">
              ({conclusions.length})
            </span>
          </h3>
        </div>
        {conclusions.length === 0 ? (
          <div className="card text-center text-slate-custom py-6">暂无结论</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {conclusions.map((c) => (
              <ConclusionCard key={c.id} conclusion={c} drafts={drafts} getStatusLabel={getStatusLabel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ViolationCard({
  violation,
  expanded,
  onToggle,
  getConclusionById,
  getDraftsForConclusion,
  onFix,
}: {
  violation: Violation;
  expanded: boolean;
  onToggle: () => void;
  getConclusionById: (id: string) => Conclusion | undefined;
  getDraftsForConclusion: (c: Conclusion) => Draft[];
  onFix: () => void;
}) {
  const statusBadge = () => {
    switch (violation.status) {
      case 'open':
        return <span className="badge badge-error">未修正</span>;
      case 'fixed':
        return <span className="badge badge-success">已修正</span>;
      case 'suppressed':
        return <span className="badge badge-warning">已抑制</span>;
    }
  };

  const affectedConclusionsList = violation.affectedConclusionIds
    .map((cid) => getConclusionById(cid))
    .filter(Boolean) as Conclusion[];

  return (
    <div className={`${violation.status === 'open' ? 'card-violation' : 'card'}`}>
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {statusBadge()}
          <div>
            <p className="text-sm font-medium text-ink">
              {violation.violationType}
            </p>
            <p className="text-xs text-slate-custom">{violation.description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-custom" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-custom" />
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-ink/8 pt-3">
          {affectedConclusionsList.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-custom">受影响的结论</p>
              <div className="space-y-1.5">
                {affectedConclusionsList.map((ac) => {
                  const relatedDrafts = getDraftsForConclusion(ac);
                  return (
                    <div
                      key={ac.id}
                      className="rounded-lg bg-white/60 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-ink font-medium">{ac.content}</span>
                        <span className={`badge ${
                          ac.status === 'confirmed'
                            ? 'badge-success'
                            : ac.status === 'rejected'
                            ? 'badge-error'
                            : 'badge-warning'
                        }`}>
                          {ac.status === 'confirmed' ? '已确认' : ac.status === 'rejected' ? '已驳回' : '待确认'}
                        </span>
                      </div>
                      {relatedDrafts.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <FilePen className="h-3 w-3 text-amber-dark" />
                          <span className="text-xs text-slate-custom">
                            关联草稿: {relatedDrafts.map((d) => d.name).join(', ')}
                          </span>
                        </div>
                      )}
                      {ac.sourceDraftIds.length > 0 && (
                        <p className="text-xs text-slate-custom/60 mt-0.5">
                          来源草稿: {ac.sourceDraftIds.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onFix();
            }}
            className="btn-emboss-primary text-xs"
          >
            前往修正
          </button>
        </div>
      )}
    </div>
  );
}

function ConclusionCard({
  conclusion,
  drafts,
  getStatusLabel,
}: {
  conclusion: Conclusion;
  drafts: Draft[];
  getStatusLabel: (status: string) => string;
}) {
  const linkedDrafts = drafts.filter((d) =>
    d.linkedConclusionIds.includes(conclusion.id)
  );

  return (
    <div className="card flex items-start gap-3 py-3">
      {conclusion.status === 'confirmed' ? (
        <FileText className="h-4 w-4 mt-0.5 text-moss" />
      ) : conclusion.status === 'rejected' ? (
        <FileText className="h-4 w-4 mt-0.5 text-terracotta" />
      ) : (
        <FilePen className="h-4 w-4 mt-0.5 text-amber-dark" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink break-words">{conclusion.content}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-custom/70">
          <span>{new Date(conclusion.createdAt).toLocaleDateString('zh-CN')}</span>
          {linkedDrafts.length > 0 && (
            <span>· 关联 {linkedDrafts.length} 草稿</span>
          )}
        </div>
      </div>
      <span
        className={`badge ${
          conclusion.status === 'confirmed'
            ? 'badge-success'
            : conclusion.status === 'rejected'
            ? 'badge-error'
            : 'badge-warning'
        }`}
      >
        {getStatusLabel(conclusion.status)}
      </span>
    </div>
  );
}
