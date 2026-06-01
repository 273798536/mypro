import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PieChart,
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Branch, PipeSegment } from '@/types';
import { PipeSegmentInput } from './PipeSegmentInput';
import { ValveControl } from './ValveControl';
import { TechInput } from './common/TechInput';
import { cn } from '@/lib/utils';
import { useCalculationStore } from '@/store/calculationStore';

const COLORS = ['#1E88E5', '#FF8F00', '#2E7D32', '#C62828', '#7B1FA2'];

export const BranchManager: React.FC = () => {
  const {
    session,
    addBranch,
    updateBranch,
    removeBranch,
    addBranchSegment,
    updateBranchSegment,
    removeBranchSegment,
    setBranchValve,
  } = useCalculationStore();

  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  const toggleBranch = (id: string) => {
    const next = new Set(expandedBranches);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedBranches(next);
  };

  const pieData = session.branches.map((branch, index) => ({
    name: branch.name,
    value: branch.flowRateRatio * 100,
    color: COLORS[index % COLORS.length],
  }));

  const totalRatio = session.branches.reduce((sum, b) => sum + b.flowRateRatio, 0);
  const hasMissingData = session.branches.some(b => b.isMissingData);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-800 rounded">
            <GitBranch className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-industrial-text">支路管理</h3>
            <p className="text-xs text-industrial-textMuted">
              共 {session.branches.length} 条支路
            </p>
          </div>
        </div>
        <button
          onClick={addBranch}
          className="tech-button flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          添加支路
        </button>
      </div>

      {session.branches.length > 0 && (
        <div className="tech-card p-4">
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, '流量分配']}
                    contentStyle={{
                      backgroundColor: '#243B5C',
                      border: '1px solid #2D4A73',
                      borderRadius: '4px',
                      color: '#E8EAF6',
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-industrial-textMuted" />
                <span className="text-sm text-industrial-textMuted">流量分配占比</span>
              </div>
              <div className="space-y-1">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-industrial-text">{item.name}</span>
                    <span className="font-mono text-primary-400">
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              {Math.abs(totalRatio - 1) > 0.01 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-danger-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    流量分配总和: {(totalRatio * 100).toFixed(1)}%，不等于 100%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasMissingData && (
        <div className="p-3 bg-danger-500/10 border border-danger-500/30 rounded flex items-center gap-2">
          <XCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <div className="text-sm text-danger-400">
            存在支路数据不完整，计算结果可能不准确。请补全数据或标记为"待确认"。
          </div>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {session.branches.map((branch, index) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              index={index}
              isExpanded={expandedBranches.has(branch.id)}
              onToggle={() => toggleBranch(branch.id)}
              onUpdate={(updates) => updateBranch(branch.id, updates)}
              onRemove={() => removeBranch(branch.id)}
              onAddSegment={() => addBranchSegment(branch.id)}
              onUpdateSegment={(segId, updates) => updateBranchSegment(branch.id, segId, updates)}
              onRemoveSegment={(segId) => removeBranchSegment(branch.id, segId)}
              onValveChange={(updates) => setBranchValve(branch.id, updates)}
            />
          ))}
        </AnimatePresence>
      </div>

      {session.branches.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="tech-card p-8 text-center"
        >
          <GitBranch className="w-12 h-12 text-industrial-textMuted mx-auto mb-3" />
          <p className="text-industrial-textMuted mb-4">暂无支路</p>
          <button
            onClick={addBranch}
            className="tech-button-secondary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加第一条支路
          </button>
        </motion.div>
      )}
    </div>
  );
};

interface BranchCardProps {
  branch: Branch;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<Branch>) => void;
  onRemove: () => void;
  onAddSegment: () => void;
  onUpdateSegment: (segmentId: string, updates: Partial<PipeSegment>) => void;
  onRemoveSegment: (segmentId: string) => void;
  onValveChange: (updates: Partial<Branch['valveConfig']>) => void;
}

const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onAddSegment,
  onUpdateSegment,
  onRemoveSegment,
  onValveChange,
}) => {
  const color = COLORS[index % COLORS.length];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'tech-card overflow-hidden',
        branch.isMissingData && 'danger-glow border-danger-500/50'
      )}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary-900/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-12 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={branch.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-transparent hover:border-primary-500 focus:border-primary-400 focus:outline-none font-medium text-industrial-text px-1"
              />
              {branch.isMissingData ? (
                <XCircle className="w-4 h-4 text-danger-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-success-500" />
              )}
            </div>
            <div className="text-xs text-industrial-textMuted font-mono mt-0.5">
              流量分配: {(branch.flowRateRatio * 100).toFixed(1)}% | {branch.segments.length} 段管路
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2 text-industrial-textMuted hover:text-danger-400 hover:bg-danger-500/10 rounded transition-colors"
            title="删除支路"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-industrial-textMuted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-industrial-textMuted" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-industrial-border/50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TechInput
                  label="流量分配比"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={branch.flowRateRatio}
                  onChange={(e) => onUpdate({ flowRateRatio: Number(e.target.value) })}
                  suffix="× 总流量"
                />

                <div className="space-y-1">
                  <label className="tech-label">数据完整性</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdate({ isMissingData: false, missingFields: [] })}
                      className={cn(
                        'flex-1 px-3 py-2 text-sm rounded border transition-all flex items-center justify-center gap-2',
                        !branch.isMissingData
                          ? 'bg-success-500/20 border-success-500 text-success-400'
                          : 'bg-industrial-surface border-industrial-border text-industrial-textMuted hover:border-success-500/50'
                      )}
                    >
                      <CheckCircle className="w-4 h-4" />
                      数据完整
                    </button>
                    <button
                      onClick={() => onUpdate({ isMissingData: true, missingFields: ['待确认'] })}
                      className={cn(
                        'flex-1 px-3 py-2 text-sm rounded border transition-all flex items-center justify-center gap-2',
                        branch.isMissingData
                          ? 'bg-danger-500/20 border-danger-500 text-danger-400'
                          : 'bg-industrial-surface border-industrial-border text-industrial-textMuted hover:border-danger-500/50'
                      )}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      数据待确认
                    </button>
                  </div>
                </div>
              </div>

              {branch.isMissingData && (
                <div className="p-3 bg-danger-500/10 border border-danger-500/30 rounded">
                  <label className="tech-label">未填写项（用逗号分隔）</label>
                  <input
                    type="text"
                    value={branch.missingFields.join('、')}
                    onChange={(e) =>
                      onUpdate({ missingFields: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) })
                    }
                    className="tech-input w-full"
                    placeholder="例如：管径, 管长, 弯头数量"
                  />
                </div>
              )}

              <ValveControl
                valve={branch.valveConfig}
                onChange={onValveChange}
                title={`${branch.name} - 支路阀门`}
                showEvidence={true}
              />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-industrial-text">
                    支路管路段 ({branch.segments.length})
                  </h4>
                  <button
                    onClick={onAddSegment}
                    className="tech-button-secondary text-xs py-1 px-3 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    添加管段
                  </button>
                </div>
                <div className="space-y-3">
                  {branch.segments.map((segment, segIndex) => (
                    <PipeSegmentInput
                      key={segment.id}
                      segment={segment}
                      index={segIndex}
                      onChange={(updates) => onUpdateSegment(segment.id, updates)}
                      onRemove={() => onRemoveSegment(segment.id)}
                      canRemove={branch.segments.length > 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
