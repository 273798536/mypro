import React, { useState } from 'react';
import { ArrowLeft, GitCompare, Trash2, RotateCcw, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVersionStore } from '@/store/useVersionStore';
import { VersionCard } from '@/components/common/VersionCard';
import type { BallastVersion } from '@/types';

export const VersionsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    ballastVersions,
    currentBallastId,
    setCurrentBallast,
    getCurrentBallast,
  } = useVersionStore();

  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const currentBallast = getCurrentBallast();
  const compareVersion = compareVersionId
    ? ballastVersions.find((v) => v.id === compareVersionId)
    : null;

  const activeVersions = ballastVersions.filter((v) => !v.isDeleted);

  const handleCompare = (version: BallastVersion) => {
    if (compareVersionId === version.id) {
      setCompareVersionId(null);
    } else {
      setCompareVersionId(version.id);
    }
  };

  const handleRestore = (version: BallastVersion) => {
    setCurrentBallast(version.id);
    alert(`已恢复到版本 ${version.version}`);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm"
          >
            <ArrowLeft size={16} />
            返回工作台
          </button>
          <h1 className="text-base font-bold text-slate-100">压载水版本管理</h1>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          共 {activeVersions.length} 个历史版本
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {compareVersion && currentBallast && (
            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <GitCompare size={18} />
                  <span>版本对比</span>
                </div>
                <button
                  onClick={() => setCompareVersionId(null)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  关闭对比
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-2">当前版本: {currentBallast.version}</div>
                  <div className="bg-slate-800/50 rounded p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">前舱</span>
                      <span className="font-mono text-slate-200">{currentBallast.foreTank}t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">后舱</span>
                      <span className="font-mono text-slate-200">{currentBallast.aftTank}t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">左舷</span>
                      <span className="font-mono text-slate-200">{currentBallast.portTank}t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">右舷</span>
                      <span className="font-mono text-slate-200">{currentBallast.starboardTank}t</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700 mt-2">
                      <span className="text-slate-400">总计</span>
                      <span className="font-mono text-slate-200">{currentBallast.totalBallast}t</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-2">对比版本: {compareVersion.version}</div>
                  <div className="bg-slate-800/50 rounded p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">前舱</span>
                      <span className={`font-mono ${compareVersion.foreTank !== currentBallast.foreTank ? 'text-amber-400' : 'text-slate-200'}`}>
                        {compareVersion.foreTank}t
                        {compareVersion.foreTank !== currentBallast.foreTank && (
                          <span className="ml-1 text-[10px]">
                            ({compareVersion.foreTank > currentBallast.foreTank ? '+' : ''}{compareVersion.foreTank - currentBallast.foreTank})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">后舱</span>
                      <span className={`font-mono ${compareVersion.aftTank !== currentBallast.aftTank ? 'text-amber-400' : 'text-slate-200'}`}>
                        {compareVersion.aftTank}t
                        {compareVersion.aftTank !== currentBallast.aftTank && (
                          <span className="ml-1 text-[10px]">
                            ({compareVersion.aftTank > currentBallast.aftTank ? '+' : ''}{compareVersion.aftTank - currentBallast.aftTank})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">左舷</span>
                      <span className={`font-mono ${compareVersion.portTank !== currentBallast.portTank ? 'text-amber-400' : 'text-slate-200'}`}>
                        {compareVersion.portTank}t
                        {compareVersion.portTank !== currentBallast.portTank && (
                          <span className="ml-1 text-[10px]">
                            ({compareVersion.portTank > currentBallast.portTank ? '+' : ''}{compareVersion.portTank - currentBallast.portTank})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">右舷</span>
                      <span className={`font-mono ${compareVersion.starboardTank !== currentBallast.starboardTank ? 'text-amber-400' : 'text-slate-200'}`}>
                        {compareVersion.starboardTank}t
                        {compareVersion.starboardTank !== currentBallast.starboardTank && (
                          <span className="ml-1 text-[10px]">
                            ({compareVersion.starboardTank > currentBallast.starboardTank ? '+' : ''}{compareVersion.starboardTank - currentBallast.starboardTank})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700 mt-2">
                      <span className="text-slate-400">总计</span>
                      <span className={`font-mono ${compareVersion.totalBallast !== currentBallast.totalBallast ? 'text-amber-400' : 'text-slate-200'}`}>
                        {compareVersion.totalBallast}t
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-slate-400">版本时间线</h2>
            <div className="relative pl-8">
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-700" />
              {[...activeVersions].reverse().map((version, index) => (
                <div key={version.id} className="relative mb-4">
                  <div
                    className={`absolute -left-[22px] top-4 w-3 h-3 rounded-full border-2 ${
                      currentBallastId === version.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  />
                  <div className="flex items-start gap-4">
                    <VersionCard
                      version={version}
                      isActive={currentBallastId === version.id}
                      onSelect={() => setCurrentBallast(version.id)}
                      onCompare={() => handleCompare(version)}
                      className="flex-1"
                    />
                    <div className="flex flex-col gap-2 pt-2">
                      {currentBallastId !== version.id && (
                        <button
                          onClick={() => handleRestore(version)}
                          className="p-2 rounded bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                          title="恢复此版本"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-slate-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-300 mb-1">版本管理说明</div>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• 所有压载水版本均采用追加式存储，永不删除旧版本，确保可追溯</li>
                  <li>• 每个版本独立记录操作人、修改时间和备注信息</li>
                  <li>• 点击版本卡片可切换当前使用的压载水版本</li>
                  <li>• 使用对比功能查看两个版本之间的差异</li>
                  <li>• 稳性计算结果会自动关联当时使用的压载水版本ID</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
