import { useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '../store';
import { IssueBadge } from './IssueBadge';
import { formatDate } from '../utils/common';
import { getItemVersions } from '../store/actions';
import type { EarpieceItem } from '../types';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      {editing ? (
        <div className="flex gap-1">
          <input
            className="flex-1 text-sm border border-indigo-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <button
            onClick={() => {
              onChange(draft);
              setEditing(false);
            }}
            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            保存
          </button>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="text-sm text-gray-800">
          {value || <span className="text-amber-600 italic">（空）</span>}
          <button
            onClick={() => setEditing(true)}
            className="ml-2 text-[10px] text-indigo-600 hover:underline"
          >
            编辑
          </button>
        </div>
      )}
    </div>
  );
}

export function DetailPanel() {
  const { state, dispatch } = useStore();
  const [noteInput, setNoteInput] = useState('');
  const [showVersions, setShowVersions] = useState(false);

  const item = state.items.find((i) => i.id === state.selectedItemId) as
    | EarpieceItem
    | undefined;

  if (!item) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400 text-sm">
        从左侧列表选择一条记录查看详情
      </div>
    );
  }

  const versions = getItemVersions(state, item.id);
  const snap = (snapshot: any) => snapshot as Partial<EarpieceItem>;

  const handleAnnotate = () => {
    if (!noteInput.trim()) return;
    dispatch({
      type: 'ANNOTATE',
      payload: { itemId: item.id, content: noteInput },
    });
    setNoteInput('');
  };

  const handleLateNote = () => {
    if (!noteInput.trim()) return;
    dispatch({
      type: 'ANNOTATE',
      payload: { itemId: item.id, content: noteInput, isLateNote: true },
    });
    setNoteInput('');
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">记录详情</h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowVersions(!showVersions)}
            className={`text-xs px-2 py-1 rounded border ${
              showVersions
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {showVersions ? '返回详情' : `查看版本（v${item.version}）`}
          </button>
          <button
            onClick={() => dispatch({ type: 'SELECT', payload: null })}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            关闭
          </button>
        </div>
      </div>

      {showVersions ? (
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="text-xs text-gray-600 space-y-2">
            <div className="font-semibold text-gray-800">
              历史版本（共 {versions.length} 条）
            </div>
            {versions.map((v) => {
              const s = snap(v.snapshot);
              const changeLabels: Record<string, string> = {
                create: '创建',
                update: '更新',
                confirm: '确认',
                withdraw: '撤回',
                annotate: '批注',
                reimport: '重新导入',
              };
              return (
                <div
                  key={v.id}
                  className="border border-gray-200 rounded p-2 bg-gray-50"
                >
                  <div className="flex justify-between items-center text-[11px] text-gray-500 mb-1">
                    <span>
                      <b>v{v.version}</b> · {formatDate(v.timestamp)}
                    </span>
                    <span>
                      {changeLabels[v.changeType] ?? v.changeType} · {v.operator}
                    </span>
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div>曲名：{s.songName ?? '—'}</div>
                    <div>艺人：{s.artist ?? '—'}</div>
                    <div>授权：{s.authDeadline || '—'}</div>
                    <div>状态：{s.status ?? '—'}</div>
                    <div>批注：{(s.annotations?.length ?? 0)} 条</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <EditableField
              label="曲名"
              value={item.songName}
              onChange={(v) =>
                dispatch({
                  type: 'UPDATE_FIELD',
                  payload: { itemId: item.id, field: 'songName', value: v },
                })
              }
            />
            <Field label="曲名别名">
              {item.songAliases.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {item.songAliases.map((a) => (
                    <span
                      key={a}
                      className="px-2 py-0.5 bg-gray-100 rounded text-[11px]"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-amber-600 italic text-sm">（无）</span>
              )}
            </Field>
            <EditableField
              label="艺人"
              value={item.artist}
              onChange={(v) =>
                dispatch({
                  type: 'UPDATE_FIELD',
                  payload: { itemId: item.id, field: 'artist', value: v },
                })
              }
            />
            <EditableField
              label="授权期限"
              value={item.authDeadline ?? ''}
              onChange={(v) =>
                dispatch({
                  type: 'UPDATE_FIELD',
                  payload: { itemId: item.id, field: 'authDeadline', value: v },
                })
              }
            />
          </div>

          {item.authExtractedFromNote && (
            <div className="text-xs bg-sky-50 border border-sky-200 rounded p-2 text-sky-700">
              ℹ️ 授权期限是从备注中提取的：原始值"
              {item.authDeadlineRaw}"
            </div>
          )}

          <Field label="原始备注/排练群文本">
            <div className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">
              第{item.rawLineNumber}行：{item.rawInput}
            </div>
          </Field>

          {item.issues.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                数据问题（{item.issues.length}）
              </div>
              <div className="space-y-1.5">
                {item.issues.map((iss) => (
                  <IssueBadge key={iss.id} issue={iss} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              人工批注（{item.annotations.length}）
              {item.annotations.some((a) => a.isLateNote) && (
                <span className="ml-2 text-purple-600 font-normal normal-case">
                  含后补备注
                </span>
              )}
            </div>
            {item.annotations.length === 0 && (
              <div className="text-sm text-gray-400">暂无批注</div>
            )}
            <div className="space-y-1.5">
              {item.annotations.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-2 rounded border text-xs ${
                    ann.isLateNote
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                    <span>
                      {ann.author}
                      {ann.isLateNote && (
                        <span className="ml-2 px-1 rounded bg-purple-200 text-purple-800">
                          后补
                        </span>
                      )}
                    </span>
                    <span>{formatDate(ann.createdAt)}</span>
                  </div>
                  <div className="text-gray-800">{ann.content}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="添加批注（对应交付清单引用、授权备注、排练备注等）"
                className="w-full p-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y h-16"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAnnotate}
                  disabled={!noteInput.trim()}
                  className="text-xs px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  添加批注
                </button>
                <button
                  onClick={handleLateNote}
                  disabled={!noteInput.trim()}
                  className="text-xs px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  标记为后补备注
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs text-gray-500">
            <Field label="版本">v{item.version}</Field>
            <Field label="状态">
              <span className="capitalize">
                {item.status === 'draft'
                  ? '待确认'
                  : item.status === 'confirmed'
                    ? '已确认'
                    : '已撤回'}
              </span>
            </Field>
            <Field label="创建时间">{formatDate(item.createdAt)}</Field>
            <Field label="更新时间">{formatDate(item.updatedAt)}</Field>
            {item.confirmedAt && (
              <Field label="确认时间">{formatDate(item.confirmedAt)}</Field>
            )}
            {item.withdrawnAt && (
              <Field label="撤回时间">{formatDate(item.withdrawnAt)}</Field>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => dispatch({ type: 'CONFIRM', payload: item.id })}
              disabled={item.status === 'confirmed'}
              className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              确认归档
            </button>
            <button
              onClick={() => dispatch({ type: 'WITHDRAW', payload: item.id })}
              disabled={item.status === 'withdrawn'}
              className="text-xs px-3 py-1.5 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            >
              撤回
            </button>
            <button
              onClick={() => {
                if (window.confirm('确认删除该条记录？')) {
                  dispatch({ type: 'DELETE', payload: item.id });
                }
              }}
              className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 ml-auto"
            >
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
