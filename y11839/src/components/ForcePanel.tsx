import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { MATERIALS } from '../types';
import type { BridgeMember } from '../types';
import { getStressColor, getStressLabel } from '../utils/physics';

function shortId(id: string) {
  return id.length > 8 ? id.slice(0, 4) + '..' + id.slice(-3) : id;
}

function MemberRow({ member, selected, onSelect }: { member: BridgeMember; selected: boolean; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isTension = member.internalForce >= 0;
  const forceColor = isTension ? 'text-blue-400' : 'text-red-400';
  const stressColor = getStressColor(member.stressRatio);
  const stressLabel = getStressLabel(member.stressRatio);
  const labelColor =
    stressLabel === '安全' ? 'text-green-400' :
    stressLabel === '正常' ? 'text-yellow-400' :
    stressLabel === '临界' ? 'text-orange-400' : 'text-red-400';
  const isOverloaded = member.stressRatio > 1.0;
  const matZh = MATERIALS[member.materialType]?.nameZh ?? member.materialType;

  return (
    <div
      className={`border-b border-[#1F4A6E] px-3 py-2 cursor-pointer transition-colors ${
        selected ? 'bg-[#0D2844]' : 'hover:bg-[#0D2844]/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-[#7EB8DA] w-16 truncate" title={member.id}>
          {shortId(member.id)}
        </span>
        <span className="text-[#8CA0B3] text-xs w-10">{matZh}</span>
        <span className={`font-mono w-20 text-right ${forceColor}`}>
          {isTension ? '+' : ''}{member.internalForce.toFixed(1)}
        </span>
        <div className="flex-1 flex items-center gap-1.5">
          <div className="flex-1 h-2 bg-[#0A1628] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(member.stressRatio * 100, 100)}%`,
                backgroundColor: stressColor,
              }}
            />
          </div>
          <span className={`text-xs font-mono w-10 text-right ${labelColor}`}>{stressLabel}</span>
        </div>
        {isOverloaded && (
          <button
            className="text-red-400 hover:text-red-300 p-0.5"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>
      {isOverloaded && expanded && member.overloadReason && (
        <div className="mt-1.5 ml-2 p-2 bg-red-950/30 border border-red-900/40 rounded text-xs text-red-300 leading-relaxed">
          <div className="flex items-start gap-1">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>{member.overloadReason}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForcePanel() {
  const members = useGameStore((s) => s.members);
  const selectedMemberId = useGameStore((s) => s.selectedMemberId);
  const selectMember = useGameStore((s) => s.selectMember);

  const sorted = [...members].sort((a, b) => {
    const aOver = a.stressRatio > 1.0 ? 1 : 0;
    const bOver = b.stressRatio > 1.0 ? 1 : 0;
    if (aOver !== bOver) return bOver - aOver;
    return b.stressRatio - a.stressRatio;
  });

  return (
    <div className="h-full flex flex-col bg-[#0F2744] border-l border-[#1F4A6E] text-white">
      <div className="px-4 py-3 border-b border-[#1F4A6E]">
        <h2 className="text-base font-bold tracking-wider text-[#7EB8DA] uppercase font-mono">
          杆件受力
        </h2>
        <div className="mt-1 h-px bg-gradient-to-r from-[#2A4A6C] via-[#7EB8DA] to-[#2A4A6C]" />
      </div>

      <div className="px-3 py-1.5 grid grid-cols-[64px_40px_80px_1fr_40px_20px] gap-2 text-[10px] text-[#5A7A94] uppercase tracking-wider font-mono border-b border-[#1F4A6E]">
        <span>ID</span>
        <span>材料</span>
        <span className="text-right">内力(kN)</span>
        <span>应力比</span>
        <span className="text-right">状态</span>
        <span />
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#3A5A74] text-sm">
            暂无杆件
          </div>
        ) : (
          sorted.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              selected={selectedMemberId === m.id}
              onSelect={() => selectMember(m.id)}
            />
          ))
        )}
      </div>

      {members.length > 0 && (
        <div className="px-4 py-2 border-t border-[#1F4A6E] text-[10px] text-[#3A5A74] font-mono flex justify-between">
          <span>共 {members.length} 件</span>
          <span>
            过载 {members.filter((m) => m.stressRatio > 1.0).length}
          </span>
        </div>
      )}
    </div>
  );
}
