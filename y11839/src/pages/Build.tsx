import { useNavigate } from 'react-router-dom';
import {
  Plus, Circle, GripVertical, Trash2, GitMerge, Play,
  Wrench, FlaskConical, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { MATERIALS } from '@/types';
import type { BuildTool, MaterialType } from '@/types';
import Canvas from '@/components/Canvas';
import ForcePanel from '@/components/ForcePanel';
import BudgetBar from '@/components/BudgetBar';
import DiffMergeModal from '@/components/DiffMergeModal';

import type { LucideIcon } from 'lucide-react';

const TOOLS: { tool: BuildTool; icon: LucideIcon; label: string }[] = [
  { tool: 'addNode', icon: Circle, label: '自由节点' },
  { tool: 'addSupport', icon: GripVertical, label: '支座节点' },
  { tool: 'addMember', icon: Plus, label: '连接杆件' },
  { tool: 'select', icon: Wrench, label: '选择/移动' },
  { tool: 'delete', icon: Trash2, label: '删除' },
];

export default function Build() {
  const navigate = useNavigate();
  const buildTool = useGameStore((s) => s.buildTool);
  const setBuildTool = useGameStore((s) => s.setBuildTool);
  const newMemberMaterial = useGameStore((s) => s.newMemberMaterial);
  const setNewMemberMaterial = useGameStore((s) => s.setNewMemberMaterial);
  const startTest = useGameStore((s) => s.startTest);
  const startMerge = useGameStore((s) => s.startMerge);
  const members = useGameStore((s) => s.members);
  const nodes = useGameStore((s) => s.nodes);
  const budgetUsed = useGameStore((s) => s.budgetUsed);
  const budget = useGameStore((s) => s.budget);

  const handleStartTest = () => {
    if (members.length < 1) return;
    startTest();
    navigate('/test');
  };

  const canTest = members.length >= 1 && nodes.length >= 2;

  return (
    <div className="h-screen flex flex-col bg-[#0A1628] text-white overflow-hidden">
      <BudgetBar />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-14 bg-[#0D1F3C] border-r border-[#1F4A6E] flex flex-col items-center py-3 gap-1">
          {TOOLS.map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              onClick={() => setBuildTool(tool)}
              className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
                buildTool === tool
                  ? 'bg-[#1B3A5C] text-[#7EB8DA] shadow-inner border border-[#3A7ABD]/40'
                  : 'text-[#4A7A9A] hover:text-[#7EB8DA] hover:bg-[#1B3A5C]/50'
              }`}
              title={label}
            >
              <Icon size={18} />
            </button>
          ))}

          <div className="flex-1" />

          <button
            onClick={startMerge}
            className="w-11 h-11 rounded-lg flex items-center justify-center text-[#9B59B6] hover:text-[#AF7AC5] hover:bg-[#1B3A5C]/50 transition-all"
            title="方案合并"
          >
            <GitMerge size={18} />
          </button>
        </div>

        <div className="flex-1 relative">
          <Canvas />

          {buildTool === 'addMember' && (
            <div className="absolute top-3 left-3 bg-[#0D1F3C]/90 border border-[#1F4A6E] rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-xs text-[#7EB8DA]">材料:</span>
              {(Object.keys(MATERIALS) as MaterialType[]).map((mat) => (
                <button
                  key={mat}
                  onClick={() => setNewMemberMaterial(mat)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    newMemberMaterial === mat
                      ? 'bg-[#1B3A5C] text-[#7EB8DA] border border-[#3A7ABD]/40'
                      : 'text-[#4A7A9A] hover:text-[#7EB8DA]'
                  }`}
                >
                  {MATERIALS[mat].nameZh}
                </button>
              ))}
            </div>
          )}

          {buildTool === 'addNode' && (
            <div className="absolute top-3 left-3 bg-[#0D1F3C]/90 border border-[#1F4A6E] rounded-lg px-3 py-2">
              <span className="text-xs text-[#7EB8DA]">点击画布放置自由节点</span>
            </div>
          )}
          {buildTool === 'addSupport' && (
            <div className="absolute top-3 left-3 bg-[#0D1F3C]/90 border border-[#1F4A6E] rounded-lg px-3 py-2">
              <span className="text-xs text-[#7EB8DA]">点击画布放置支座（固定节点）</span>
            </div>
          )}
          {buildTool === 'addMember' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#0D1F3C]/90 border border-[#1F4A6E] rounded-lg px-3 py-2">
              <span className="text-xs text-[#7EB8DA]">依次点击两个节点来连接杆件</span>
            </div>
          )}
          {buildTool === 'select' && (
            <div className="absolute top-3 left-3 bg-[#0D1F3C]/90 border border-[#1F4A6E] rounded-lg px-3 py-2">
              <span className="text-xs text-[#7EB8DA]">点击选择，拖拽移动节点</span>
            </div>
          )}
          {buildTool === 'delete' && (
            <div className="absolute top-3 left-3 bg-[#0D1F3C]/90 border border-[#E74C3C]/40 rounded-lg px-3 py-2">
              <span className="text-xs text-[#E74C3C]">点击节点或杆件删除</span>
            </div>
          )}
        </div>

        <div className="w-72">
          <ForcePanel />
        </div>
      </div>

      <div className="h-12 bg-[#0D1F3C] border-t border-[#1F4A6E] flex items-center px-4 gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#4A7A9A] hover:text-[#7EB8DA] hover:bg-[#1B3A5C]/50 transition-all"
        >
          <ArrowLeft size={14} />
          返回
        </button>

        <div className="flex-1 flex items-center justify-center gap-4 text-xs text-[#4A7A9A] font-mono">
          <span>节点: {nodes.length}</span>
          <span>杆件: {members.length}</span>
          <span>预算: {budgetUsed.toFixed(0)}/{budget}</span>
        </div>

        <button
          onClick={handleStartTest}
          disabled={!canTest}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-[#E87722] to-[#D35400] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#E87722]/20 transition-all"
        >
          <FlaskConical size={16} />
          载荷测试
          <ArrowRight size={14} />
        </button>
      </div>

      <DiffMergeModal />
    </div>
  );
}
