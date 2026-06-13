import { useState } from 'react';
import {
  MessageSquare,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  PROCESSING_STATUS_LABEL,
  PROCESSING_STATUS_COLOR,
  COMMENT_SOURCE_LABEL,
  type ProcessingStatus,
  type CommentSource,
} from '../types';

export default function CommentPanel() {
  const comments = useAppStore((s) => s.filteredComments);
  const allComments = useAppStore((s) => s.comments);
  const options = useAppStore((s) => s.stationOptions);
  const segments = useAppStore((s) => s.timelineSegments);
  const statusFilter = useAppStore((s) => s.statusFilter);
  const sourceFilter = useAppStore((s) => s.sourceFilter);
  const searchKeyword = useAppStore((s) => s.searchKeyword);
  const selectedOptionId = useAppStore((s) => s.selectedOptionId);
  const selectedTimelineId = useAppStore((s) => s.selectedTimelineId);
  const setStatusFilter = useAppStore((s) => s.setStatusFilter);
  const setSourceFilter = useAppStore((s) => s.setSourceFilter);
  const setSearchKeyword = useAppStore((s) => s.setSearchKeyword);
  const setSelectedOption = useAppStore((s) => s.setSelectedOption);
  const setHighlightedComment = useAppStore((s) => s.setHighlightedComment);
  const updateComment = useAppStore((s) => s.updateComment);
  const addComment = useAppStore((s) => s.addComment);
  const pendingFloorCheck = useAppStore((s) => s.pendingFloorCheck);
  const confirmFloorCheck = useAppStore((s) => s.confirmFloorCheck);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState<ProcessingStatus>('pending');
  const [editSource, setEditSource] = useState<CommentSource>('other');
  const [editEvidence, setEditEvidence] = useState('');

  const [newContent, setNewContent] = useState('');
  const [newSource, setNewSource] = useState<CommentSource>('expert_review');
  const [newOptionId, setNewOptionId] = useState(options[0]?.id || '');
  const [newTimelineId, setNewTimelineId] = useState<string | 'none'>('none');
  const [newFieldName, setNewFieldName] = useState('');

  const handleStartEdit = (c: any) => {
    setEditingId(c.id);
    setEditContent(c.content);
    setEditStatus(c.status);
    setEditSource(c.source);
    setEditEvidence((c.evidenceRefs || []).join('\n'));
    setExpandedId(c.id);
  };

  const handleSaveEdit = (id: string) => {
    const evRefs = editEvidence
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    updateComment(id, {
      content: editContent,
      status: editStatus,
      source: editSource,
      evidenceRefs: evRefs,
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newContent.trim()) return;
    const raw: Record<string, string> = {};
    if (newFieldName.trim()) {
      raw[newFieldName.trim()] = newContent;
    }
    addComment({
      optionId: newOptionId,
      timelineSegmentId: newTimelineId === 'none' ? null : newTimelineId,
      content: newContent,
      source: newSource,
      originalFieldName: newFieldName.trim() || undefined,
      rawFields: Object.keys(raw).length ? raw : undefined,
    });
    setNewContent('');
    setNewFieldName('');
    setShowAddForm(false);
  };

  const optMap = Object.fromEntries(options.map((o) => [o.id, o]));
  const segMap = Object.fromEntries(segments.map((s) => [s.id, s]));

  return (
    <div className="bg-white rounded-lg border border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">评审批注</h3>
          <span className="text-xs text-slate-400">
            共 {comments.length}/{allComments.length} 条
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="ml-auto px-2.5 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1"
          >
            <Plus size={12} />
            新增
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search
              size={13}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索备注、原始字段..."
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2 py-1.5 text-xs border border-slate-300 rounded"
          >
            <option value="all">全部状态</option>
            {Object.entries(PROCESSING_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-2 py-1.5 text-xs border border-slate-300 rounded"
          >
            <option value="all">全部来源</option>
            {Object.entries(COMMENT_SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {(selectedOptionId || selectedTimelineId) && (
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
            <Filter size={12} />
            筛选：
            {selectedOptionId && (
              <span
                onClick={() => setSelectedOption(null)}
                className="cursor-pointer px-1.5 py-0.5 rounded bg-white border border-slate-200 hover:text-primary-600"
              >
                {optMap[selectedOptionId]?.name} ✕
              </span>
            )}
            {selectedTimelineId && (
              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                {segMap[selectedTimelineId]?.name}
              </span>
            )}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="p-4 border-b border-slate-100 bg-primary-50/40">
          <div className="text-xs font-medium text-slate-600 mb-2">
            新增评审批注（复核人可能用不同字段名提交，系统会自动保留原始字段名）
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="原始字段名（如：专家意见/运维反馈）"
              className="px-2 py-1.5 text-xs border border-slate-300 rounded col-span-2"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="备注内容"
              rows={2}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded col-span-2"
            />
            <select
              value={newSource}
              onChange={(e) => setNewSource(e.target.value as CommentSource)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded"
            >
              {Object.entries(COMMENT_SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  来源：{v}
                </option>
              ))}
            </select>
            <select
              value={newOptionId}
              onChange={(e) => setNewOptionId(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <select
              value={newTimelineId}
              onChange={(e) => setNewTimelineId(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded col-span-2"
            >
              <option value="none">（不关联阶段）</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.order}. {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              添加
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {comments.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            暂无匹配的评审批注
          </div>
        )}
        {comments.map((c) => {
          const opt = optMap[c.optionId];
          const seg = c.timelineSegmentId ? segMap[c.timelineSegmentId] : null;
          const isExpanded = expandedId === c.id;
          const isEditing = editingId === c.id;
          const isHighlighted = useAppStore.getState().highlightedCommentId === c.id;
          const floorCheck = pendingFloorCheck[c.id];
          const pendingFloor = !!floorCheck;

          return (
            <div
              key={c.id}
              onMouseEnter={() => setHighlightedComment(c.id)}
              onMouseLeave={() => setHighlightedComment(null)}
              className={`border-b border-slate-100 p-4 transition-colors ${
                isHighlighted ? 'bg-primary-50/60' : 'hover:bg-slate-50'
              } ${pendingFloor ? 'bg-amber-50/60' : ''}`}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: opt?.color || '#94a3b8' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-medium" style={{ color: opt?.color }}>
                      {opt?.code}方案
                    </span>
                    {seg && (
                      <span className="text-xs text-slate-500">
                        [{seg.name}]
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs border ${PROCESSING_STATUS_COLOR[c.status]}`}
                    >
                      {PROCESSING_STATUS_LABEL[c.status]}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                      {COMMENT_SOURCE_LABEL[c.source]}
                    </span>
                    {pendingFloor && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 border border-amber-300 flex items-center gap-0.5">
                        <AlertTriangle size={10} />
                        楼层单位待确认
                      </span>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                      {c.content}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as ProcessingStatus)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        >
                          {Object.entries(PROCESSING_STATUS_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value as CommentSource)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        >
                          {Object.entries(COMMENT_SOURCE_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={editEvidence}
                        onChange={(e) => setEditEvidence(e.target.value)}
                        placeholder="证据引用，每行一条（如：专家评审会纪要第3条）"
                        rows={2}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded"
                      />
                    </div>
                  )}

                  {isExpanded && !isEditing && (
                    <div className="mt-3 space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <div className="grid grid-cols-2 gap-1">
                        <span>录入人：{c.createdBy}</span>
                        <span>录入时间：{c.createdAt}</span>
                        {c.handler && <span>处理人：{c.handler}</span>}
                        {c.handledAt && <span>处理时间：{c.handledAt}</span>}
                        <span>最近修改：{c.updatedBy} · {c.updatedAt}</span>
                      </div>

                      {c.originalFieldName && (
                        <div className="flex items-start gap-1 bg-slate-50 p-2 rounded">
                          <FileText size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-slate-600 font-medium">原始字段：</span>
                            <code className="bg-white px-1 py-0.5 rounded text-slate-700">
                              {c.originalFieldName}
                            </code>
                            {c.rawFields && (
                              <div className="mt-1 text-slate-500">
                                原始内容：{c.rawFields[c.originalFieldName]}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {c.evidenceRefs && c.evidenceRefs.length > 0 && (
                        <div className="bg-green-50 p-2 rounded border border-green-100">
                          <div className="flex items-center gap-1 text-green-700 font-medium mb-1">
                            <CheckCircle2 size={12} />
                            证据引用（{c.evidenceRefs.length}条）
                          </div>
                          <ul className="list-disc list-inside space-y-0.5">
                            {c.evidenceRefs.map((e, i) => (
                              <li key={i}>{e}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {c.floorUnitMixed && !pendingFloor && (
                        <div className="bg-slate-50 p-2 rounded text-slate-500">
                          楼层/单位校验：{c.floorUnitCheckNote || '已处理'}
                        </div>
                      )}
                    </div>
                  )}

                  {pendingFloor && floorCheck && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3 text-xs">
                      <div className="flex items-start gap-1.5 text-amber-800 font-medium mb-1">
                        <AlertCircle size={13} className="mt-0.5" />
                        楼层单位混写检测
                      </div>
                      <div className="text-amber-700 mb-1">
                        <span className="font-medium">原因：</span>
                        {floorCheck.reason}
                      </div>
                      <div className="text-amber-700 mb-2">
                        <span className="font-medium">下一步：</span>
                        {floorCheck.nextStep}
                      </div>
                      {floorCheck.normalizedValue && (
                        <div className="text-amber-700 mb-2">
                          <span className="font-medium">建议修正：</span>
                          <code className="bg-white px-1 py-0.5 rounded">
                            {floorCheck.normalizedValue}
                          </code>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            confirmFloorCheck(c.id, true, floorCheck.normalizedValue)
                          }
                          className="px-2.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                        >
                          采用建议值
                        </button>
                        <button
                          onClick={() => confirmFloorCheck(c.id, false)}
                          className="px-2.5 py-1 bg-white border border-amber-300 text-amber-700 rounded hover:bg-amber-100"
                        >
                          保留原文
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    {!isEditing ? (
                      <button
                        onClick={() => handleStartEdit(c)}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
                      >
                        <Edit3 size={11} />
                        编辑
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSaveEdit(c.id)}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          取消
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-0.5 ml-auto"
                    >
                      {isExpanded ? (
                        <>
                          收起 <ChevronUp size={11} />
                        </>
                      ) : (
                        <>
                          详情 <ChevronDown size={11} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
