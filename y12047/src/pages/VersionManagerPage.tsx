import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBridgeStore, useSimulationStore, useVersionStore } from '../store';
import { PRESET_LEVELS } from '../data/presetLevels';
import { storageAdapter } from '../data/storageAdapter';
import type { BridgeVersion } from '../types';

export function VersionManagerPage() {
  const navigate = useNavigate();
  
  const { currentLevelId, loadVersion, createNewVersion } = useBridgeStore();
  const { reset: resetSimulation } = useSimulationStore();
  const { versions, loadVersionsByLevel, getVersionChain, deleteVersion, duplicateVersion, exportVersionData } = useVersionStore();

  const currentLevel = PRESET_LEVELS.find((l) => l.id === currentLevelId);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  if (!currentLevel) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📁</div>
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

  const handleLoadVersion = (versionId: string) => {
    loadVersion(versionId);
    resetSimulation();
    setSelectedVersionId(versionId);
  };

  const handleDeleteVersion = (versionId: string) => {
    if (confirm('确定要删除这个版本吗？所有相关的模拟结果也会被删除。')) {
      deleteVersion(versionId);
      if (selectedVersionId === versionId) {
        setSelectedVersionId(null);
      }
    }
  };

  const handleDuplicateVersion = (versionId: string) => {
    if (currentLevelId) {
      const newVersion = duplicateVersion(versionId, currentLevelId);
      if (newVersion) {
        loadVersionsByLevel(currentLevelId);
      }
    }
  };

  const handleExportVersion = (versionId: string) => {
    const data = exportVersionData(versionId);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `version_${versionId}.json`;
    a.click();
  };

  const handleCreateChildVersion = (parentVersion: BridgeVersion) => {
    if (!currentLevelId) return;
    
    const newVersion = createNewVersion(
      currentLevelId,
      parentVersion.nodes,
      parentVersion.members,
      parentVersion.budget,
      parentVersion.id
    );
    
    loadVersion(newVersion.id);
    resetSimulation();
    navigate('/builder');
  };

  const getResultStatus = (versionId: string) => {
    const results = storageAdapter.getResultsByVersionId(versionId);
    if (results.length === 0) return { color: 'bg-slate-100', text: '未模拟' };
    
    const finalResult = results[results.length - 1];
    if (finalResult.status === 'success') return { color: 'bg-green-100 text-green-700', text: '✓ 通过' };
    if (finalResult.status === 'failed') return { color: 'bg-red-100 text-red-700', text: '✗ 失败' };
    return { color: 'bg-blue-100 text-blue-700', text: '运行中' };
  };

  const getMaxStress = (versionId: string) => {
    const results = storageAdapter.getResultsByVersionId(versionId);
    if (results.length === 0) return '-';
    const finalResult = results[results.length - 1];
    return `${(finalResult.maxStress / 1e6).toFixed(2)} MPa`;
  };

  const versionTree = versions.sort(
    (a, b) => a.versionNumber - b.versionNumber
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{currentLevel.name} - 版本管理</h2>
          <p className="text-sm text-slate-500 mt-1">所有版本历史，旧结论不会被覆盖</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/builder')}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            ← 返回构建
          </button>
          <button
            onClick={() => navigate('/comparison')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            去对比版本 →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">版本列表</h3>
            </div>
            
            {versionTree.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-slate-600">暂无版本，请先在桥梁构建页面保存版本</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {versionTree.map((version) => {
                  const chain = getVersionChain(version.id);
                  const status = getResultStatus(version.id);
                  
                  return (
                    <div
                      key={version.id}
                      className={`p-4 hover:bg-slate-50 transition-colors ${
                        selectedVersionId === version.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-slate-800">{version.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                            {version.parentVersionId && (
                              <span className="text-xs text-slate-400">
                                派生自 V{chain[chain.length - 2]?.versionNumber}
                              </span>
                            )}
                          </div>
                          
                          {version.changeDescription && (
                            <p className="text-sm text-slate-600 mt-1">{version.changeDescription}</p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>创建者：{version.createdBy}</span>
                            <span>{new Date(version.createdAt).toLocaleString()}</span>
                            <span>预算：¥{version.budget.toLocaleString()}</span>
                            <span>最大应力：{getMaxStress(version.id)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            {chain.map((v, idx) => (
                              <span key={v.id} className="text-xs">
                                {idx > 0 && <span className="text-slate-300 mx-1">→</span>}
                                <span className={`px-1.5 py-0.5 rounded ${
                                  v.id === version.id ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  V{v.versionNumber}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => handleLoadVersion(version.id)}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            加载
                          </button>
                          <button
                            onClick={() => handleCreateChildVersion(version)}
                            className="px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100"
                          >
                            新建子版本
                          </button>
                          <button
                            onClick={() => handleDuplicateVersion(version.id)}
                            className="px-3 py-1.5 text-sm bg-slate-50 text-slate-600 rounded hover:bg-slate-100"
                          >
                            复制
                          </button>
                          <button
                            onClick={() => handleExportVersion(version.id)}
                            className="px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
                          >
                            导出
                          </button>
                          <button
                            onClick={() => handleDeleteVersion(version.id)}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">版本统计</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">总版本数</span>
                <span className="font-medium text-slate-800">{versions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">通过版本</span>
                <span className="font-medium text-green-600">
                  {versions.filter((v) => getResultStatus(v.id).text === '✓ 通过').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">失败版本</span>
                <span className="font-medium text-red-600">
                  {versions.filter((v) => getResultStatus(v.id).text === '✗ 失败').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">未模拟</span>
                <span className="font-medium text-slate-600">
                  {versions.filter((v) => getResultStatus(v.id).text === '未模拟').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 版本机制说明</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• 每次保存都会创建新版本，旧版本不会被覆盖</li>
              <li>• 第二次导入补充预算时，基于旧版本创建新版本</li>
              <li>• 系统自动记录版本间的变更内容和差异</li>
              <li>• 可以基于任意版本创建新的设计分支</li>
              <li>• 导出的 JSON 文件可用于备份和分享</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-3">数据管理</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (confirm('确定要清除所有本地数据吗？这会删除所有版本和模拟结果。')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                清除所有本地数据
              </button>
              <button
                onClick={() => {
                  const allData = {
                    versions: storageAdapter.getVersions(),
                    results: storageAdapter.getAllResults(),
                    changeLogs: storageAdapter.getChangeLogs(),
                    exportedAt: new Date().toISOString(),
                  };
                  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                }}
                className="w-full px-4 py-2 text-sm bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100"
              >
                导出全部数据备份
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
