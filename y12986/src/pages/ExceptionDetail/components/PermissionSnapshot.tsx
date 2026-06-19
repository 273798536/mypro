import React, { useState, useMemo } from 'react';
import type { PermissionSnapshot, PermissionDiff } from '@/types';
import { Section } from '@/components/ui/Section';
import { Tag } from '@/components/ui/Tag';
import { Shield, ShieldCheck, ShieldAlert, GitCompare, History } from 'lucide-react';
import { formatDateTime, getChangeTypeBadgeClass, getChangeTypeLabel } from '@/utils/format';
import { diffMatrix, getItemChangeType, getDiffRowClass } from '@/utils/diff';

interface PermissionSnapshotViewProps {
  snapshots: PermissionSnapshot[];
  defaultBaselineFirst?: boolean;
  sideBySideMode?: boolean;
  oldSnapshot?: PermissionSnapshot;
  newSnapshot?: PermissionSnapshot;
  showSideBySideToggle?: boolean;
  conclusionBefore?: string;
  conclusionAfter?: string;
}

const opToneMap: Record<string, any> = {
  SELECT: 'sky',
  INSERT: 'emerald',
  UPDATE: 'amber',
  DELETE: 'rose',
};

function PermissionMatrixTable({
  snapshot,
  diffs,
  highlightChanges = true,
}: {
  snapshot: PermissionSnapshot;
  diffs?: PermissionDiff[];
  highlightChanges?: boolean;
}) {
  const resources = Array.from(new Set(snapshot.matrix.map((m) => m.resource)));
  const roles = Array.from(new Set(snapshot.matrix.map((m) => `${m.role}${m.user ? '|' + m.user : ''}`)));

  const getCell = (roleKey: string, resource: string) => {
    const [role, user] = roleKey.split('|');
    return snapshot.matrix.find(
      (m) => m.role === role && (m.user || '') === (user || '') && m.resource === resource
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-gray-200 table-zebra">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-3 py-2 text-xs font-semibold text-gray-700 uppercase border-b border-gray-200 w-36">
              角色 / 用户
            </th>
            {resources.map((r) => (
              <th
                key={r}
                className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200 font-mono"
              >
                {r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roles.map((roleKey) => {
            const [role, user] = roleKey.split('|');
            return (
              <tr key={roleKey} className="border-b border-gray-100 align-top">
                <td className="px-3 py-2 border-r border-gray-100 bg-gray-50/50">
                  <div className="font-semibold text-gray-800">{role}</div>
                  {user && (
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">@ {user}</div>
                  )}
                </td>
                {resources.map((resource) => {
                  const item = getCell(roleKey, resource);
                  if (!item) {
                    return (
                      <td key={resource} className="px-3 py-2 border-r border-gray-50">
                        <span className="text-gray-300 text-[10px]">—</span>
                      </td>
                    );
                  }
                  const changeType = highlightChanges
                    ? getItemChangeType(item.id, diffs)
                    : 'none';
                  return (
                    <td
                      key={resource}
                      className={`px-3 py-2 border-r border-gray-50 ${getDiffRowClass(changeType)}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {item.granted ? (
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 text-rose-500" />
                          )}
                          <span
                            className={
                              item.granted
                                ? 'text-emerald-700 font-medium'
                                : 'text-rose-600 line-through'
                            }
                          >
                            {item.granted ? '已授权' : '已撤销'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.operations.map((op) => (
                            <Tag key={op} tone={opToneMap[op] || 'gray'} className="!text-[10px] !px-1.5">
                              {op}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const PermissionSnapshotView: React.FC<PermissionSnapshotViewProps> = ({
  snapshots,
  oldSnapshot: propOld,
  newSnapshot: propNew,
  showSideBySideToggle = false,
  conclusionBefore,
  conclusionAfter,
}) => {
  const baseline = snapshots.find((s) => s.isBaseline) || snapshots[0];
  const current = snapshots[snapshots.length - 1];

  const [selectedBaselineId, setSelectedBaselineId] = useState(baseline?.id || '');
  const [selectedCompareId, setSelectedCompareId] = useState(current?.id || '');
  const [sideBySide, setSideBySide] = useState(Boolean(propOld && propNew));

  const showOld = propOld || snapshots.find((s) => s.id === selectedBaselineId);
  const showNew = propNew || snapshots.find((s) => s.id === selectedCompareId);

  const diffs = useMemo(() => {
    if (!showOld || !showNew) return [];
    return diffMatrix(showOld.matrix, showNew.matrix);
  }, [showOld, showNew]);

  const renderSideBySide = () => {
    if (!showOld || !showNew) return null;
    const oldDiffs = diffMatrix(showOld.matrix, showNew.matrix).filter((d) => d.changeType !== 'add').map((d) => ({ ...d }));
    const newDiffs = diffMatrix(showOld.matrix, showNew.matrix).filter((d) => d.changeType !== 'remove').map((d) => ({ ...d }));

    return (
      <div className="grid grid-cols-2 gap-0 border border-gray-200">
        <div className="border-r border-gray-200">
          <div className="bg-rose-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold text-gray-800">旧权限配置</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                {showOld.version} · {formatDateTime(showOld.snapshotTime)}
              </div>
            </div>
            <Tag tone="rose">变更前</Tag>
          </div>
          {conclusionBefore && (
            <div className="px-4 py-2 bg-rose-50/50 border-b border-rose-100 text-[12px] text-gray-700">
              <span className="font-semibold text-rose-700 mr-2">旧结论:</span>
              {conclusionBefore}
            </div>
          )}
          <div className="p-3 bg-gray-50/30">
            <PermissionMatrixTable snapshot={showOld} diffs={oldDiffs} />
          </div>
        </div>

        <div>
          <div className="bg-emerald-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-gray-800">新权限配置</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                {showNew.version} · {formatDateTime(showNew.snapshotTime)}
              </div>
            </div>
            <Tag tone="emerald">变更后</Tag>
          </div>
          {conclusionAfter && (
            <div className="px-4 py-2 bg-emerald-50/50 border-b border-emerald-100 text-[12px] text-gray-700">
              <span className="font-semibold text-emerald-700 mr-2">新结论:</span>
              {conclusionAfter}
            </div>
          )}
          <div className="p-3 bg-gray-50/30">
            <PermissionMatrixTable snapshot={showNew} diffs={newDiffs} />
          </div>
        </div>
      </div>
    );
  };

  const renderSingle = () => {
    if (!showNew) return <div className="p-8 text-center text-gray-400">选择一个权限版本以查看</div>;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap p-3 bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">对比基线:</span>
            <select
              value={selectedBaselineId}
              onChange={(e) => setSelectedBaselineId(e.target.value)}
              className="border border-gray-300 px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary-500"
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.version} {s.isBaseline ? '(基线)' : ''}
                </option>
              ))}
            </select>
          </div>
          <ChevronRightIcon />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">当前版本:</span>
            <select
              value={selectedCompareId}
              onChange={(e) => setSelectedCompareId(e.target.value)}
              className="border border-gray-300 px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary-500"
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.version}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Tag tone={showNew.isBaseline ? 'emerald' : 'primary'}>{showNew.version}</Tag>
            <span className="text-[11px] text-gray-500 font-mono">
              {formatDateTime(showNew.snapshotTime)}
            </span>
          </div>
        </div>

        {showNew.description && (
          <div className="text-sm text-gray-600 bg-amber-50 border-l-4 border-amber-400 px-3 py-2">
            💡 {showNew.description}
          </div>
        )}

        {diffs.length > 0 && (
          <div className="border border-amber-200 bg-amber-50/60 p-3">
            <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              相对 {showOld?.version} 的差异 ({diffs.length} 项)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {diffs.map((d, i) => (
                <span
                  key={i}
                  className={`text-[11px] px-2 py-0.5 border inline-flex items-center gap-1 ${getChangeTypeBadgeClass(
                    d.changeType
                  )}`}
                >
                  {getChangeTypeLabel(d.changeType)}
                  <span className="font-mono text-gray-700">{String(d.field)}</span>
                  {d.oldValue !== null && d.newValue !== null && (
                    <span className="text-gray-500">
                      {Array.isArray(d.oldValue) ? d.oldValue.join(',') : String(d.oldValue)} →{' '}
                      {Array.isArray(d.newValue) ? d.newValue.join(',') : String(d.newValue)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        <PermissionMatrixTable snapshot={showNew} diffs={diffs} />
      </div>
    );
  };

  return (
    <Section
      tone="default"
      title={
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-600" />
          <span>权限清单快照</span>
          {showSideBySideToggle && (
            <button
              onClick={() => setSideBySide(!sideBySide)}
              className={[
                'ml-2 text-[11px] px-2 py-0.5 border-2 font-medium transition-colors',
                sideBySide
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400 hover:text-primary-600',
              ].join(' ')}
            >
              {sideBySide ? '✓ 并排对比' : '切换并排'}
            </button>
          )}
        </div>
      }
      subtitle={
        <span className="text-[11px] text-gray-500">
          共 {snapshots.length} 个历史版本 · 绿色新增 / 红色删除 / 黄色修改
        </span>
      }
    >
      {(propOld && propNew) || sideBySide ? renderSideBySide() : renderSingle()}
    </Section>
  );
};

const ChevronRightIcon = () => <span className="text-gray-300">→</span>;
