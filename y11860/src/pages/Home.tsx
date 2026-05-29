import React, { useEffect, useMemo } from 'react';
import { Cpu, Github, Info } from 'lucide-react';
import { RobotScene } from '@/components/Scene';
import { ControlPanel } from '@/components/ControlPanel';
import { FilterPanel } from '@/components/FilterPanel';
import { DetailsTable } from '@/components/DetailsTable';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export default function Home() {
  const { getFilteredPoints, computeWorkspace, workspaceResult, isComputing } = useWorkspaceStore();

  const filteredPoints = useMemo(() => {
    return getFilteredPoints();
  }, [getFilteredPoints, workspaceResult]);

  useEffect(() => {
    const timer = setTimeout(() => {
      computeWorkspace();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-space-bg overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-space-border bg-space-panel/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 flex items-center justify-center border border-neon-cyan/50">
            <Cpu className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h1 className="font-display text-lg text-neon-cyan glow-text-cyan tracking-wider">
              机器人工作空间云图
            </h1>
            <p className="text-xs text-gray-500 font-mono">Robotic Workspace Visualizer</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
            <Info className="w-3.5 h-3.5" />
            <span>调节关节角 → 点击运行分析 → 查看云图变化</span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <aside className="flex-shrink-0 w-80 border-r border-space-border overflow-y-auto p-4 space-y-4">
          <ControlPanel />
        </aside>

        {/* Center - 3D View */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 3D Scene */}
          <div className="flex-1 relative">
            <RobotScene filteredPoints={filteredPoints} />

            {/* Status Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              <div className="bg-space-panel/90 backdrop-blur-sm border border-space-border rounded-lg px-3 py-2 text-xs">
                <span className="text-gray-400">采样点: </span>
                <span className="font-mono text-neon-cyan">
                  {filteredPoints.length}
                </span>
                <span className="text-gray-500"> / </span>
                <span className="font-mono text-gray-400">
                  {workspaceResult?.samplePoints.length || 0}
                </span>
              </div>
              {isComputing && (
                <div className="bg-neon-cyan/20 backdrop-blur-sm border border-neon-cyan rounded-lg px-3 py-2 text-xs text-neon-cyan animate-pulse">
                  正在计算工作空间...
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-space-panel/90 backdrop-blur-sm border border-space-border rounded-lg p-3 z-10">
              <div className="text-xs text-gray-400 mb-2 font-display">图例</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success-green" />
                  <span className="text-gray-300">可达</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-warning-orange" />
                  <span className="text-gray-300">关节越界</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-error-red" />
                  <span className="text-gray-300">碰撞</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-singularity-purple" />
                  <span className="text-gray-300">奇异位形</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom - Details Table */}
          <div className="flex-shrink-0 h-[35vh] border-t border-space-border">
            <DetailsTable filteredPoints={filteredPoints} />
          </div>
        </main>

        {/* Right Panel - Filters */}
        <aside className="flex-shrink-0 w-72 border-l border-space-border overflow-y-auto p-4">
          <FilterPanel />
        </aside>
      </div>
    </div>
  );
}
