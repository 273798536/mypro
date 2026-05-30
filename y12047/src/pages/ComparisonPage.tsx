import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BridgeCanvas } from '../components/BridgeCanvas';
import { useBridgeStore, useSimulationStore, useVersionStore } from '../store';
import { PRESET_LEVELS } from '../data/presetLevels';
import { storageAdapter } from '../data/storageAdapter';
import type { BridgeVersion, SimulationResult } from '../types';

export function ComparisonPage() {
  const navigate = useNavigate();
  
  const { currentLevelId, renderOptions } = useBridgeStore();
  const { compareVersionId, versionDiff, changeLogs, versions, compareVersions, clearComparison } = useVersionStore();
  
  const currentLevel = PRESET_LEVELS.find((l) => l.id === currentLevelId);
  
  const [selectedVersion1, setSelectedVersion1] = useState<string | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(20);
  const [syncSteps, setSyncSteps] = useState(true);

  if (!currentLevel) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">请先选择关卡</h2>
        <p className="text-slate-600 mb-6">返回关卡选择页面，选择一个关卡开始设计</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          去选择关卡
        </button>
      </div>
    );
  }

  const version1 = selectedVersion1 ? storageAdapter.getVersionById(selectedVersion1) : null;
  const version2 = selectedVersion2 ? storageAdapter.getVersionById(selectedVersion2) : null;
  
  const results1 = selectedVersion1 ? storageAdapter.getResultsByVersionId(selectedVersion1) : [];
  const results2 = selectedVersion2 ? storageAdapter.getResultsByVersionId(selectedVersion2) : [];
  
  const result1 = results1[currentStep] || null;
  const result2 = results2[currentStep] || null;

  const handleCompare = () => {
    if (selectedVersion1 && selectedVersion2) {
      compareVersions(selectedVersion1, selectedVersion2);
      const steps1 = results1.length > 0 ? results1.length - 1 : 20;
      const steps2 = results2.length > 0 ? results2.length - 1 : 20;
      setTotalSteps(Math.max(steps1, steps2));
    }
  };

  const getStepLoadPosition = () => {
    return (currentStep / totalSteps) * 100;
  };

  const getResultStatus = (result: SimulationResult | null) => {
    if (!result) return { color: 'bg-slate-100', text: '未模拟' };
    if (result.status === 'success') return { color: 'bg-green-100 text-green-700', text: '✓ 通过' };
    if (result.status === 'failed') return { color: 'bg-red-100 text-red-700', text: '✗ 失败' };
    return { color: 'bg-blue-100 text-blue-700', text: '运行中' };
  };

  const getMemberDiffClass = (memberId: string) => {
    if (!versionDiff) return '';
    if (versionDiff.changedMembers.some((m) => m.memberId === memberId)) {
      return 'ring-2 ring-amber-400';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{currentLevel.name} - 复盘对比</h2>
          <p className="text-sm text-slate-500 mt-1">新旧版本并排对比，查看修改前后的受力变化</p>
        </div>
        <button
          onClick={() => navigate('/versions')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          版本管理 →
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-800 mb-4">选择对比版本</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">版本 A（旧版）</label>
            <select
              value={selectedVersion1 || ''}
              onChange={(e) => setSelectedVersion1(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择版本</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-2xl text-slate-400">VS</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">版本 B（新版）</label>
            <select
              value={selectedVersion2 || ''}
              onChange={(e) => setSelectedVersion2(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择版本</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleCompare}
            disabled={!selectedVersion1 || !selectedVersion2 || selectedVersion1 === selectedVersion2}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 font-medium"
          >
            开始对比
          </button>
          <button
            onClick={clearComparison}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            清除对比
          </button>
        </div>
      </div>

      {versionDiff && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <h3 className="font-semibold text-blue-800 mb-2">📋 变更分析</h3>
          <p className="text-sm text-blue-700 mb-3">{versionDiff.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-600">杆件变化</span>
              <span className="font-medium text-blue-800">{versionDiff.changedMembers.length} 根</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">预算变化</span>
              <span className={`font-medium ${versionDiff.budgetChange > 0 ? 'text-red-600' : versionDiff.budgetChange < 0 ? 'text-green-600' : 'text-blue-800'}`}>
                {versionDiff.budgetChange > 0 ? '+' : ''}¥{versionDiff.budgetChange.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">最大应力变化</span>
              <span className={`font-medium ${versionDiff.maxStressChange > 0 ? 'text-red-600' : versionDiff.maxStressChange < 0 ? 'text-green-600' : 'text-blue-800'}`}>
                {versionDiff.maxStressChange > 0 ? '+' : ''}{(versionDiff.maxStressChange / 1e6).toFixed(2)} MPa
              </span>
            </div>
          </div>
        </div>
      )}

      {version1 && version2 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">动画同步控制</h3>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={syncSteps}
                  onChange={(e) => setSyncSteps(e.target.checked)}
                />
                同步步进
              </label>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 w-20">步骤</span>
              <input
                type="range"
                min={0}
                max={totalSteps}
                value={currentStep}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-mono text-slate-700 w-20 text-right">
                {currentStep} / {totalSteps}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 ${versionDiff ? getMemberDiffClass('') : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">版本 A - {version1.name}</h3>
                  <p className="text-xs text-slate-500">{new Date(version1.createdAt).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getResultStatus(result1).color}`}>
                  {getResultStatus(result1).text}
                </span>
              </div>
              <div className="h-64">
                <BridgeCanvas
                  nodes={version1.nodes}
                  members={version1.members}
                  result={result1}
                  renderOptions={renderOptions}
                  loadPosition={getStepLoadPosition()}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">预算</div>
                  <div className="text-sm font-bold text-slate-800">¥{version1.budget.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">最大应力</div>
                  <div className="text-sm font-bold text-slate-800">
                    {result1 ? `${(result1.maxStress / 1e6).toFixed(2)} MPa` : '-'}
                  </div>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">最危险杆件</div>
                  <div className="text-sm font-bold text-slate-800">
                    {result1?.maxStressMemberId || '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 ${versionDiff ? getMemberDiffClass('') : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">版本 B - {version2.name}</h3>
                  <p className="text-xs text-slate-500">{new Date(version2.createdAt).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getResultStatus(result2).color}`}>
                  {getResultStatus(result2).text}
                </span>
              </div>
              <div className="h-64">
                <BridgeCanvas
                  nodes={version2.nodes}
                  members={version2.members}
                  result={result2}
                  renderOptions={renderOptions}
                  loadPosition={getStepLoadPosition()}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">预算</div>
                  <div className="text-sm font-bold text-slate-800">¥{version2.budget.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">最大应力</div>
                  <div className="text-sm font-bold text-slate-800">
                    {result2 ? `${(result2.maxStress / 1e6).toFixed(2)} MPa` : '-'}
                  </div>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-500">最危险杆件</div>
                  <div className="text-sm font-bold text-slate-800">
                    {result2?.maxStressMemberId || '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {changeLogs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-4">变更日志</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {changeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">
                        {log.field === 'crossSection' ? '截面积' :
                         log.field === 'material' ? '材料' :
                         log.field === 'elasticModulus' ? '弹性模量' :
                         log.field === 'unitCost' ? '单位成本' :
                         log.field === 'budget' ? '预算' : log.field}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      杆件 {log.memberId || '系统'}：{log.oldValue} → {log.newValue}
                    </div>
                    {log.description && (
                      <div className="text-xs text-blue-600 mt-1">{log.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {versionDiff && versionDiff.changedMembers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-4">杆件参数对比</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-medium text-slate-600">杆件</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">参数</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">版本 A</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">版本 B</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionDiff.changedMembers.map((change, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 px-3 text-slate-800">{change.memberId}</td>
                        <td className="py-2 px-3 text-slate-600">{change.field}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{change.oldValue}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{change.newValue}</td>
                        <td className={`py-2 px-3 text-right font-medium ${
                          (change.field === 'crossSection' && Number(change.newValue) > Number(change.oldValue)) ||
                          (change.field === 'unitCost' && Number(change.newValue) > Number(change.oldValue))
                            ? 'text-red-600'
                            : (change.field === 'crossSection' && Number(change.newValue) < Number(change.oldValue)) ||
                              (change.field === 'unitCost' && Number(change.newValue) < Number(change.oldValue))
                            ? 'text-green-600'
                            : 'text-slate-600'
                        }`}>
                          {typeof change.newValue === 'number' && typeof change.oldValue === 'number'
                            ? `${change.newValue > change.oldValue ? '+' : ''}${(change.newValue - change.oldValue).toFixed(0)}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
