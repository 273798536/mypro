import { useState } from 'react';
import { GitCompare, Trash2, Save, Edit3, ChevronDown, ArrowRight, AlertTriangle } from 'lucide-react';
import type { VersionSnapshot, CalculationResult, RecallPriorityItem } from '../types';
import { MEMBER_STATE_LABELS } from '../types';
import { saveVersion, deleteVersion, getVersions, generateVersionId } from '../utils/storage';

interface VersionCompareProps {
  currentResult: CalculationResult | null;
  currentConfig: any;
  onLoadVersion: (version: VersionSnapshot) => void;
  modifiedMemberId?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
}

export function VersionCompare({
  currentResult,
  currentConfig,
  onLoadVersion,
  modifiedMemberId,
  modifiedFrom,
  modifiedTo,
}: VersionCompareProps) {
  const [versions, setVersions] = useState<VersionSnapshot[]>(getVersions());
  const [selectedOldId, setSelectedOldId] = useState<string>('');
  const [selectedNewId, setSelectedNewId] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionNote, setVersionNote] = useState('');

  const refreshVersions = () => {
    setVersions(getVersions());
  };

  const handleSaveVersion = () => {
    if (!currentResult) return;

    const snapshot: VersionSnapshot = {
      id: generateVersionId(),
      name: versionName || `版本 ${new Date().toLocaleString('zh-CN')}`,
      createdAt: new Date().toISOString(),
      config: currentConfig,
      result: currentResult,
      note: versionNote,
      modifiedMemberId,
      modifiedFrom: modifiedFrom as any,
      modifiedTo: modifiedTo as any,
    };

    saveVersion(snapshot);
    refreshVersions();
    setShowSaveModal(false);
    setVersionName('');
    setVersionNote('');
  };

  const handleDeleteVersion = (id: string) => {
    if (confirm('确定要删除这个版本吗？')) {
      deleteVersion(id);
      refreshVersions();
      if (selectedOldId === id) setSelectedOldId('');
      if (selectedNewId === id) setSelectedNewId('');
    }
  };

  const getVersionDiff = (oldVersion: VersionSnapshot, newVersion: VersionSnapshot) => {
    const oldItems = oldVersion.result.recallPriorities;
    const newItems = newVersion.result.recallPriorities;

    const oldMap = new Map(oldItems.map(i => [i.memberId, i]));
    const newMap = new Map(newItems.map(i => [i.memberId, i]));

    const changes: Array<{
      memberId: string;
      memberName?: string;
      oldProb: number;
      newProb: number;
      oldRank: number;
      newRank: number;
      probDiff: number;
      rankDiff: number;
      oldState: string;
      newState: string;
      isModified: boolean;
    }> = [];

    const allMemberIds = new Set([...oldMap.keys(), ...newMap.keys()]);

    allMemberIds.forEach(memberId => {
      const old = oldMap.get(memberId);
      const newItem = newMap.get(memberId);

      if (old && newItem) {
        const probDiff = newItem.churnProbability - old.churnProbability;
        const rankDiff = old.rank - newItem.rank;

        if (Math.abs(probDiff) > 0.01 || rankDiff !== 0) {
          changes.push({
            memberId,
            memberName: newItem.memberName || old.memberName,
            oldProb: old.churnProbability,
            newProb: newItem.churnProbability,
            oldRank: old.rank,
            newRank: newItem.rank,
            probDiff,
            rankDiff,
            oldState: old.currentState,
            newState: newItem.currentState,
            isModified: memberId === modifiedMemberId || memberId === newVersion.modifiedMemberId,
          });
        }
      }
    });

    return changes.sort((a, b) => Math.abs(b.probDiff) - Math.abs(a.probDiff));
  };

  const oldVersion = versions.find(v => v.id === selectedOldId);
  const newVersion = versions.find(v => v.id === selectedNewId);
  const diff = oldVersion && newVersion ? getVersionDiff(oldVersion, newVersion) : [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">历史版本对比</h3>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              if (currentResult) {
                setVersionName(`修改 ${modifiedMemberId || ''} ${modifiedFrom ? MEMBER_STATE_LABELS[modifiedFrom as any] : ''} → ${modifiedTo ? MEMBER_STATE_LABELS[modifiedTo as any] : ''}`.trim());
                setShowSaveModal(true);
              }
            }}
            disabled={!currentResult}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存当前版本
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">旧版本</label>
          <select
            value={selectedOldId}
            onChange={(e) => setSelectedOldId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">选择版本</option>
            {versions.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({formatDate(v.createdAt)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">新版本</label>
          <select
            value={selectedNewId}
            onChange={(e) => setSelectedNewId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">选择版本</option>
            {versions.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({formatDate(v.createdAt)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {versions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>已保存版本 ({versions.length})</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {versions.map(v => (
              <div
                key={v.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer hover:bg-gray-50
                  ${(selectedOldId === v.id || selectedNewId === v.id) ? 'bg-slate-50 border border-slate-200' : ''}`}
                onClick={() => onLoadVersion(v)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">{v.name}</div>
                  <div className="text-xs text-gray-500">{formatDate(v.createdAt)}</div>
                  {v.note && <div className="text-xs text-slate-600 mt-0.5">💬 {v.note}</div>}
                  {v.modifiedMemberId && (
                    <div className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      修改 {v.modifiedMemberId}: {v.modifiedFrom ? MEMBER_STATE_LABELS[v.modifiedFrom] : ''} → {v.modifiedTo ? MEMBER_STATE_LABELS[v.modifiedTo] : ''}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVersion(v.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {oldVersion && newVersion && diff.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            差异对比 ({diff.length} 个会员有变化)
          </h4>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">会员</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">状态变化</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">流失概率</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">排名变化</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {diff.slice(0, 20).map(change => (
                  <tr
                    key={change.memberId}
                    className={`${change.isModified ? 'bg-amber-50' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">
                        {change.memberName || change.memberId}
                      </div>
                      <div className="text-xs text-gray-500">{change.memberId}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-600">{MEMBER_STATE_LABELS[change.oldState as any]}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-slate-700 font-medium">{MEMBER_STATE_LABELS[change.newState as any]}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-mono font-medium ${change.probDiff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {change.probDiff > 0 ? '↑' : '↓'}
                        {(change.oldProb * 100).toFixed(1)}% → {(change.newProb * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-mono font-medium ${change.rankDiff > 0 ? 'text-emerald-600' : change.rankDiff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        #{change.oldRank} → #{change.newRank}
                        {change.rankDiff > 0 ? ` (↑${change.rankDiff})` : change.rankDiff < 0 ? ` (↓${Math.abs(change.rankDiff)})` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {change.isModified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          状态被修改
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {diff.length > 20 && (
            <div className="text-center text-sm text-gray-500 mt-2">
              仅显示前20条变化，共{diff.length}条
            </div>
          )}
        </div>
      )}

      {oldVersion && newVersion && diff.length === 0 && (
        <div className="border-t border-gray-200 pt-4 text-center text-sm text-gray-500">
          两个版本之间没有显著差异
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">保存版本</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">版本名称</label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="输入版本名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注 (可选)</label>
                <textarea
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                  rows={3}
                  placeholder="输入版本备注"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveVersion}
                className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
