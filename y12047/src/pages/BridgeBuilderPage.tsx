import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BridgeCanvas } from '../components/BridgeCanvas';
import { useBridgeStore, useVersionStore } from '../store';
import { csvHandler } from '../data/csvHandler';
import { budgetCalculator } from '../engine/budgetCalculator';
import { PRESET_LEVELS } from '../data/presetLevels';
import type { Member } from '../types';

export function BridgeBuilderPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    currentLevelId,
    currentVersionId,
    nodes,
    members,
    budget,
    renderOptions,
    selectedMemberId,
    isDirty,
    versionDiff,
    updateMember,
    setRenderOptions,
    setSelectedMemberId,
    loadFromPreset,
    applyBoundaryCase,
    saveVersion,
    createNewVersion,
    calculateTotalCost,
    checkBudgetExceeded,
  } = useBridgeStore();

  const { loadVersionsByLevel } = useVersionStore();
  
  const [additionalBudget, setAdditionalBudget] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'nodes' | 'members' | 'cases' | 'import'>('members');

  const currentLevel = PRESET_LEVELS.find((l) => l.id === currentLevelId);
  const totalCost = calculateTotalCost();
  const isOverBudget = checkBudgetExceeded();
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  if (!currentLevel || nodes.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🏗️</div>
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

  const handleMemberClick = (memberId: string) => {
    setSelectedMemberId(memberId === selectedMemberId ? null : memberId);
  };

  const handleUpdateMember = (field: keyof Member, value: number | string) => {
    if (!selectedMemberId) return;
    updateMember(selectedMemberId, { [field]: value });
  };

  const handleSaveVersion = () => {
    if (!currentLevelId) return;
    
    const version = saveVersion(currentLevelId, currentVersionId || undefined, additionalBudget);
    loadVersionsByLevel(currentLevelId);
    setShowSaveModal(false);
    setAdditionalBudget(0);
  };

  const handleImportNodes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const importedNodes = csvHandler.parseNodesCSV(text);
      if (importedNodes.length > 0) {
        loadFromPreset(importedNodes, members, budget);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportMembers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const importedMembers = csvHandler.parseMembersCSV(text);
      if (importedMembers.length > 0) {
        loadFromPreset(nodes, importedMembers, budget);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyBoundaryCase = (caseSetup: { nodes?: any; members?: any; budget?: number }) => {
    applyBoundaryCase(caseSetup);
  };

  const handleReset = () => {
    loadFromPreset(currentLevel.presetNodes, currentLevel.presetMembers, currentLevel.budgetLimit);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{currentLevel.name} - 桥梁构建</h2>
          <p className="text-sm text-slate-500 mt-1">导入节点卡和杆件卡，调整参数，保存版本</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            重置为预置
          </button>
          <button
            onClick={() => navigate('/simulation')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            开始模拟 →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">桥梁预览</h3>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={renderOptions.showStressColors}
                    onChange={(e) => setRenderOptions({ showStressColors: e.target.checked })}
                  />
                  应力颜色
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={renderOptions.showLabels}
                    onChange={(e) => setRenderOptions({ showLabels: e.target.checked })}
                  />
                  标签
                </label>
              </div>
            </div>
            <div className="h-96">
              <BridgeCanvas
                nodes={nodes}
                members={members}
                renderOptions={renderOptions}
                onMemberClick={handleMemberClick}
                selectedMemberId={selectedMemberId}
              />
            </div>
          </div>

          {versionDiff && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <h3 className="font-semibold text-blue-800 mb-2">📋 变更说明</h3>
              <p className="text-sm text-blue-700">{versionDiff.description}</p>
              {versionDiff.budgetChange !== 0 && (
                <p className="text-sm text-blue-600 mt-2">
                  预算变化：¥{versionDiff.budgetChange > 0 ? '+' : ''}{versionDiff.budgetChange.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">预算面板</h3>
              {isOverBudget && <span className="text-xs text-red-500 font-medium">已超支</span>}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">预算上限</span>
                <span className="font-medium">¥{budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">当前造价</span>
                <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-slate-800'}`}>
                  ¥{totalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">剩余预算</span>
                <span className={`font-medium ${budget - totalCost < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ¥{(budget - totalCost).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (totalCost / budget) * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-sm text-slate-600 mb-2">
                补充预算（第二次导入时使用）
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={additionalBudget}
                  onChange={(e) => setAdditionalBudget(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入金额"
                />
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={!isDirty && additionalBudget === 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存版本
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              {[
                { key: 'members', label: '杆件' },
                { key: 'cases', label: '边界样例' },
                { key: 'import', label: '导入' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {activeTab === 'members' && (
                <div className="space-y-3">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleMemberClick(m.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMemberId === m.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{m.name}</span>
                        <span className="text-xs text-slate-500">
                          {m.startNodeId}→{m.endNodeId}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        截面积：{m.crossSection} mm² | 材料：{m.material}
                      </div>
                    </div>
                  ))}

                  {selectedMember && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-medium text-slate-800 mb-3">手动修正 - {selectedMember.name}</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">截面积 (mm²)</label>
                          <input
                            type="number"
                            value={selectedMember.crossSection}
                            onChange={(e) => handleUpdateMember('crossSection', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">材料</label>
                          <select
                            value={selectedMember.material}
                            onChange={(e) => handleUpdateMember('material', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                          >
                            <option value="steel_q235">Q235 钢 (235 MPa)</option>
                            <option value="steel_q345">Q345 钢 (345 MPa)</option>
                            <option value="aluminum">铝合金 (276 MPa)</option>
                            <option value="wood">木材 (40 MPa)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">弹性模量 (GPa)</label>
                          <input
                            type="number"
                            value={selectedMember.elasticModulus}
                            onChange={(e) => handleUpdateMember('elasticModulus', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">单位成本 (元/m)</label>
                          <input
                            type="number"
                            value={selectedMember.unitCost}
                            onChange={(e) => handleUpdateMember('unitCost', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'cases' && (
                <div className="space-y-3">
                  {currentLevel.boundaryCases.map((bc) => (
                    <div
                      key={bc.id}
                      className="p-3 rounded-lg border border-slate-200 hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-800">
                          {bc.type === 'overload' ? '⚡ 杆件过载' :
                           bc.type === 'misalignment' ? '🔧 支点错位' : '💰 预算超支'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{bc.description}</p>
                      <button
                        onClick={() => handleApplyBoundaryCase(bc.setup)}
                        className="w-full py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                      >
                        应用此样例
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'import' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">导入节点卡</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleImportNodes}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-slate-400 mt-1">CSV格式：节点ID, X坐标, Y坐标, 约束类型, 约束角度</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">导入杆件卡</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportMembers}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    <p className="text-xs text-slate-400 mt-1">CSV格式：杆件ID, 起点ID, 终点ID, 截面积, 材料</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        const nodesCsv = csvHandler.exportNodesCSV(nodes);
                        const blob = new Blob([nodesCsv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'nodes.csv';
                        a.click();
                      }}
                      className="w-full py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 mb-2"
                    >
                      导出节点卡 CSV
                    </button>
                    <button
                      onClick={() => {
                        const membersCsv = csvHandler.exportMembersCSV(members);
                        const blob = new Blob([membersCsv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'members.csv';
                        a.click();
                      }}
                      className="w-full py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                      导出杆件卡 CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {currentVersionId ? '创建新版本' : '保存第一版'}
            </h3>
            
            {currentVersionId && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  将基于当前版本创建新版本，旧版本会保留。
                  {additionalBudget > 0 && (
                    <span className="block mt-1">补充预算：+¥{additionalBudget.toLocaleString()}</span>
                  )}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveVersion}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
