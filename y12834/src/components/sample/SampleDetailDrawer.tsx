import { useEffect, useState } from 'react';
import {
  X,
  ChevronRight,
  Clock,
  User,
  FileText,
  Edit3,
  AlertCircle,
  Tag,
} from 'lucide-react';
import type {
  Sample,
  SampleVersion,
  PathologyNote,
  CorrectionLog,
} from '@/types';
import { Badge } from '@/components/ui/Badge';

/**
 * 样本详情抽屉组件属性接口
 */
interface SampleDetailDrawerProps {
  /** 样本数据 */
  sample: Sample | null;
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 版本历史列表 */
  versions?: SampleVersion[];
  /** 病理备注列表 */
  pathologyNotes?: PathologyNote[];
  /** 人工修正记录 */
  correctionLogs?: CorrectionLog[];
}

/**
 * 格式化时间字符串为可读格式
 */
function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 获取版本状态显示文本
 */
function getVersionStatusLabel(status: SampleVersion['status']): string {
  const map: Record<SampleVersion['status'], string> = {
    draft: '草稿',
    ai_reviewed: 'AI已审核',
    human_corrected: '人工已修正',
    final: '最终版',
  };
  return map[status];
}

/**
 * 获取版本状态徽章变体
 */
function getVersionStatusVariant(
  status: SampleVersion['status']
): 'info' | 'success' | 'warn' | 'danger' | 'neutral' {
  switch (status) {
    case 'final':
      return 'success';
    case 'human_corrected':
      return 'info';
    case 'ai_reviewed':
      return 'warn';
    default:
      return 'neutral';
  }
}

/**
 * 样本详情右侧抽屉组件
 * 展示元数据表格、版本历史时间线、病理备注和人工修正记录
 */
export function SampleDetailDrawer({
  sample,
  open,
  onClose,
  versions = [],
  pathologyNotes = [],
  correctionLogs = [],
}: SampleDetailDrawerProps) {
  /** 当前选中的版本ID */
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  /** 打开抽屉时重置选中版本 */
  useEffect(() => {
    if (open && sample) {
      setSelectedVersionId(sample.current_version_id || versions[0]?.id || null);
    }
  }, [open, sample, versions]);

  /** 阻止背景滚动 */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !sample) return null;

  /** 当前版本数据 */
  const currentVersion = versions.find((v) => v.id === selectedVersionId);
  /** 当前版本的病理备注 */
  const currentNotes = pathologyNotes.filter(
    (n) => n.version_id === selectedVersionId
  );
  /** 当前版本的修正记录 */
  const currentCorrections = correctionLogs.filter(
    (c) => c.version_id === selectedVersionId
  );

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-deep-ocean/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 抽屉主体 */}
      <div className="absolute top-0 right-0 h-full w-full max-w-xl bg-paper shadow-lift flex flex-col animate-in slide-in-from-right duration-300">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-deep-ocean/10 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-serif font-semibold text-deep-ocean">
              样本详情
            </h2>
            <Badge variant="neutral">{sample.id}</Badge>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-paper-dark transition-colors text-deep-ocean/60 hover:text-deep-ocean"
          >
            <X size={20} />
          </button>
        </div>

        {/* 版本切换栏 */}
        <div className="px-6 py-3 border-b border-deep-ocean/10 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-sm text-deep-ocean/60 flex items-center gap-1">
              <Tag size={14} />
              版本:
            </span>
            <select
              value={selectedVersionId || ''}
              onChange={(e) => setSelectedVersionId(e.target.value || null)}
              className="flex-1 px-3 py-1.5 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 transition-all"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} — {getVersionStatusLabel(v.status)}
                </option>
              ))}
            </select>
            {currentVersion && (
              <Badge variant={getVersionStatusVariant(currentVersion.status)}>
                {getVersionStatusLabel(currentVersion.status)}
              </Badge>
            )}
          </div>
        </div>

        {/* 内容滚动区域 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 space-y-6">
            {/* 元数据表格 */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-deep-ocean mb-3">
                <FileText size={16} />
                元数据
              </h3>
              <div className="bg-white rounded-lg border border-deep-ocean/5 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-deep-ocean/5">
                      <td className="px-4 py-2.5 text-deep-ocean/50 w-1/3 bg-paper/50">
                        物种名
                      </td>
                      <td className="px-4 py-2.5 text-deep-ocean font-medium">
                        {sample.standard_species_name || sample.species_name}
                      </td>
                    </tr>
                    {sample.standard_species_name &&
                      sample.standard_species_name !== sample.species_name && (
                        <tr className="border-b border-deep-ocean/5">
                          <td className="px-4 py-2.5 text-deep-ocean/50 w-1/3 bg-paper/50">
                            原始输入名
                          </td>
                          <td className="px-4 py-2.5 text-deep-ocean line-through">
                            {sample.species_name}
                          </td>
                        </tr>
                      )}
                    <tr className="border-b border-deep-ocean/5">
                      <td className="px-4 py-2.5 text-deep-ocean/50 w-1/3 bg-paper/50">
                        分组
                      </td>
                      <td className="px-4 py-2.5 text-deep-ocean">
                        <Badge variant="neutral">分组 {sample.group}</Badge>
                      </td>
                    </tr>
                    <tr className="border-b border-deep-ocean/5">
                      <td className="px-4 py-2.5 text-deep-ocean/50 w-1/3 bg-paper/50">
                        创建时间
                      </td>
                      <td className="px-4 py-2.5 text-deep-ocean tabular">
                        {formatTime(sample.created_at)}
                      </td>
                    </tr>
                    <tr className="border-b border-deep-ocean/5">
                      <td className="px-4 py-2.5 text-deep-ocean/50 w-1/3 bg-paper/50">
                        更新时间
                      </td>
                      <td className="px-4 py-2.5 text-deep-ocean tabular">
                        {formatTime(sample.updated_at)}
                      </td>
                    </tr>
                    {currentVersion && (
                      <>
                        <tr className="border-b border-deep-ocean/5">
                          <td className="px-4 py-2.5 text-deep-ocean/50 w-1/3 bg-paper/50">
                            版本创建者
                          </td>
                          <td className="px-4 py-2.5 text-deep-ocean flex items-center gap-1">
                            <User size={14} className="text-deep-ocean/40" />
                            {currentVersion.created_by}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-deep-ocean/50 w-1/3 bg-paper/50">
                            版本创建时间
                          </td>
                          <td className="px-4 py-2.5 text-deep-ocean tabular">
                            {formatTime(currentVersion.created_at)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 版本历史时间线 */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-deep-ocean mb-3">
                <Clock size={16} />
                版本历史
              </h3>
              <div className="relative pl-6">
                {/* 时间线竖线 */}
                <div className="absolute left-2 top-1 bottom-1 w-px bg-deep-ocean/15" />
                {versions
                  .slice()
                  .sort((a, b) => b.version_number - a.version_number)
                  .map((v, idx) => (
                    <div key={v.id} className="relative mb-4 last:mb-0">
                      {/* 时间线节点 */}
                      <div
                        className={`absolute -left-[18px] top-1.5 w-3 h-3 rounded-full border-2 ${
                          v.id === selectedVersionId
                            ? 'bg-life-green border-life-green'
                            : 'bg-paper border-deep-ocean/30'
                        }`}
                      />
                      <div
                        onClick={() => setSelectedVersionId(v.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          v.id === selectedVersionId
                            ? 'bg-life-green/5 border-life-green/30'
                            : 'bg-white border-deep-ocean/5 hover:border-deep-ocean/15'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-deep-ocean">
                            v{v.version_number}
                          </span>
                          <Badge variant={getVersionStatusVariant(v.status)}>
                            {getVersionStatusLabel(v.status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-deep-ocean/50 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {v.created_by}
                          </span>
                          <ChevronRight size={12} />
                          <span>{formatTime(v.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            {/* 病理备注列表 */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-deep-ocean mb-3">
                <Edit3 size={16} />
                病理备注
                <Badge variant="info">{currentNotes.length}</Badge>
              </h3>
              {currentNotes.length === 0 ? (
                <div className="bg-white rounded-lg border border-deep-ocean/5 p-6 text-center text-deep-ocean/40 text-sm">
                  暂无病理备注
                </div>
              ) : (
                <div className="space-y-2">
                  {currentNotes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white rounded-lg border border-deep-ocean/5 p-4"
                    >
                      <p className="text-sm text-deep-ocean mb-2">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-deep-ocean/50">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {note.created_by}
                        </span>
                        <span>{formatTime(note.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 人工修正记录 */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-deep-ocean mb-3">
                <AlertCircle size={16} />
                人工修正记录
                <Badge variant="warn">{currentCorrections.length}</Badge>
              </h3>
              {currentCorrections.length === 0 ? (
                <div className="bg-white rounded-lg border border-deep-ocean/5 p-6 text-center text-deep-ocean/40 text-sm">
                  暂无人工修正记录
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCorrections.map((corr) => (
                    <div
                      key={corr.id}
                      className="bg-white rounded-lg border border-deep-ocean/5 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="warn">{corr.field_name}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <p className="text-xs text-deep-ocean/50 mb-1">
                            原值
                          </p>
                          <p className="text-sm text-corral-severe line-through">
                            {corr.old_value}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-deep-ocean/50 mb-1">
                            修正后
                          </p>
                          <p className="text-sm text-life-green font-medium">
                            {corr.new_value}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-deep-ocean/60 bg-paper/50 rounded px-2 py-1.5 mb-2">
                        {corr.reason}
                      </p>
                      <div className="flex items-center justify-between text-xs text-deep-ocean/50">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {corr.created_by}
                        </span>
                        <span>{formatTime(corr.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
