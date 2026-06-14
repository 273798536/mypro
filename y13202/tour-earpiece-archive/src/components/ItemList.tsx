import type { EarpieceItem, ItemStatus } from '../types';
import { useStore } from '../store';
import { IssueBadge } from './IssueBadge';
import { formatDate } from '../utils/common';

const STATUS_STYLE: Record<ItemStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  confirmed: 'bg-green-100 text-green-700 border-green-300',
  withdrawn: 'bg-red-100 text-red-700 border-red-300',
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  draft: '待确认',
  confirmed: '已确认',
  withdrawn: '已撤回',
};

interface RowProps {
  item: EarpieceItem;
  selected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  onWithdraw: () => void;
}

function ItemRow({ item, selected, onSelect, onConfirm, onWithdraw }: RowProps) {
  const hasError = item.issues.some((i) => i.severity === 'error');
  const hasWarning = item.issues.some((i) => i.severity === 'warning');
  return (
    <div
      onClick={onSelect}
      className={`grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-indigo-50/40 text-sm transition ${
        selected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
      } ${hasError ? 'bg-red-50/40' : ''}`}
    >
      <div className="col-span-3 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {item.songName || <span className="text-red-500 italic">（缺曲名）</span>}
        </div>
        {item.songAliases.length > 0 && (
          <div className="text-[11px] text-gray-500 truncate">别名：{item.songAliases.join(' / ')}</div>
        )}
      </div>
      <div className="col-span-2 truncate text-gray-700">
        {item.artist || <span className="text-amber-600 italic">（缺艺人）</span>}
      </div>
      <div className="col-span-2 truncate">
        {item.authDeadline ? (
          <span className={item.authExtractedFromNote ? 'text-sky-600' : 'text-gray-800'}>
            {item.authDeadline}
            {item.authExtractedFromNote && <span className="text-[10px] ml-1 text-sky-500">（来自备注）</span>}
          </span>
        ) : (
          <span className="text-amber-600 italic">（无授权期）</span>
        )}
      </div>
      <div className="col-span-3 min-w-0">
        <div className="flex flex-wrap gap-1">
          {item.issues.slice(0, 3).map((iss) => (
            <IssueBadge key={iss.id} issue={iss} compact />
          ))}
          {item.issues.length > 3 && (
            <span className="text-[10px] text-gray-500">+{item.issues.length - 3}</span>
          )}
          {item.annotations.some((a) => a.isLateNote) && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] rounded border bg-purple-100 text-purple-700 border-purple-300">
              后补备注
            </span>
          )}
        </div>
      </div>
      <div className="col-span-1">
        <span className={`inline-block px-2 py-0.5 text-[11px] rounded border ${STATUS_STYLE[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <div className="col-span-1 flex items-center gap-1 text-[11px]" onClick={(e) => e.stopPropagation()}>
        {item.status !== 'confirmed' && (
          <button
            onClick={onConfirm}
            className="px-1.5 py-0.5 rounded bg-green-600 text-white hover:bg-green-700"
            title="确认"
          >
            确认
          </button>
        )}
        {item.status !== 'withdrawn' && (
          <button
            onClick={onWithdraw}
            className="px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600"
            title="撤回"
          >
            撤回
          </button>
        )}
      </div>
      {hasWarning && !selected && (
        <div className="col-span-12 text-[10px] text-amber-600 opacity-80">
          v{item.version} · 更新于 {formatDate(item.updatedAt)}
          {item.annotations.length > 0 && ` · 批注 ${item.annotations.length}`}
        </div>
      )}
    </div>
  );
}

export function ItemList() {
  const { state, dispatch } = useStore();

  if (state.items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">耳返清单归档</h2>
        </div>
        <div className="p-10 text-center text-gray-400 text-sm">
          暂无归档记录，请在上方粘贴排练群文本并导入
        </div>
      </div>
    );
  }

  const stats = {
    total: state.items.length,
    draft: state.items.filter((i) => i.status === 'draft').length,
    confirmed: state.items.filter((i) => i.status === 'confirmed').length,
    withdrawn: state.items.filter((i) => i.status === 'withdrawn').length,
    issues: state.items.reduce((n, i) => n + i.issues.length, 0),
    errors: state.items.reduce((n, i) => n + i.issues.filter((x) => x.severity === 'error').length, 0),
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-800">耳返清单归档（共 {stats.total} 条）</h2>
        <div className="flex gap-3 text-xs">
          <span className="text-gray-500">待确认 <b className="text-gray-800">{stats.draft}</b></span>
          <span className="text-gray-500">已确认 <b className="text-green-600">{stats.confirmed}</b></span>
          <span className="text-gray-500">已撤回 <b className="text-red-600">{stats.withdrawn}</b></span>
          <span className="text-gray-500">问题数 <b className="text-amber-600">{stats.issues}</b>{stats.errors > 0 && <span className="text-red-600">（错误{stats.errors}）</span>}</span>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 border-b">
        <div className="col-span-3">曲名</div>
        <div className="col-span-2">艺人</div>
        <div className="col-span-2">授权期限</div>
        <div className="col-span-3">问题标记</div>
        <div className="col-span-1">状态</div>
        <div className="col-span-1">操作</div>
      </div>
      <div>
        {state.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            selected={state.selectedItemId === item.id}
            onSelect={() => dispatch({ type: 'SELECT', payload: item.id })}
            onConfirm={() => dispatch({ type: 'CONFIRM', payload: item.id })}
            onWithdraw={() => dispatch({ type: 'WITHDRAW', payload: item.id })}
          />
        ))}
      </div>
    </div>
  );
}
