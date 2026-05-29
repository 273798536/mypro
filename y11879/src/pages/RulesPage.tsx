import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../store/appStore';
import { GripVertical, Settings2, Scale, Eye, EyeOff, Trash2 } from 'lucide-react';
import { CSSProperties } from 'react';
import { TieBreakRule } from '../types';

interface SortableRuleProps {
  rule: TieBreakRule;
  onToggle: () => void;
}

function SortableRule({ rule, onToggle }: SortableRuleProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: rule.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-4 ${
        rule.enabled ? 'border-primary-500/30' : 'border-dark-600/50 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-dark-700 rounded"
        >
          <GripVertical className="w-5 h-5 text-dark-400" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold">
              {rule.priority}
            </span>
            <h4 className="font-medium text-white">{rule.name}</h4>
          </div>
          <p className="text-sm text-dark-400 ml-8">{rule.description}</p>
        </div>

        <button
          onClick={onToggle}
          className={`p-2 rounded-lg transition-colors ${
            rule.enabled
              ? 'bg-success/20 text-success hover:bg-success/30'
              : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
          }`}
        >
          {rule.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

const RulesPage = () => {
  const { rules, reorderRules, toggleRuleEnabled, events, updateEventWeight } = useAppStore();
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedRules.findIndex((r) => r.id === active.id);
      const newIndex = sortedRules.findIndex((r) => r.id === over.id);
      reorderRules(arrayMove(sortedRules, oldIndex, newIndex));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white">规则配置</h2>
        <p className="text-dark-400 text-sm mt-1">拖拽调整同分规则优先级，点击开关启用/禁用规则</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-primary-500" />
              <h3 className="font-display font-semibold text-white">同分规则优先级</h3>
            </div>
            <p className="text-sm text-dark-400 mb-4">
              当选手总分相同时，系统将按以下顺序依次应用同分规则，直到区分出名次
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sortedRules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {sortedRules.map((rule) => (
                    <SortableRule
                      key={rule.id}
                      rule={rule}
                      onToggle={() => toggleRuleEnabled(rule.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <div className="col-span-5">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-primary-500" />
              <h3 className="font-display font-semibold text-white">项目权重设置</h3>
            </div>
            <p className="text-sm text-dark-400 mb-4">
              各项目得分将乘以权重后计入总分
            </p>

            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{event.name}</p>
                    <p className="text-xs text-dark-400">
                      {event.type === 'track' ? '径赛' : '田赛'} · {event.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateEventWeight(event.id, Math.max(0.5, event.weight - 0.1))}
                      className="w-8 h-8 flex items-center justify-center bg-dark-600 text-white rounded hover:bg-dark-500"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-display font-bold text-primary-400">
                      {event.weight.toFixed(1)}
                    </span>
                    <button
                      onClick={() => updateEventWeight(event.id, Math.min(3, event.weight + 0.1))}
                      className="w-8 h-8 flex items-center justify-center bg-dark-600 text-white rounded hover:bg-dark-500"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-dark-700/30 rounded-lg">
              <p className="text-xs text-dark-400">
                💡 提示：重要项目可设置较高权重（如1.3-1.5），一般项目权重为1.0
              </p>
            </div>
          </div>

          <div className="card p-5 mt-6">
            <h3 className="font-display font-semibold text-white mb-3">规则说明</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-success mt-1.5" />
                <div>
                  <p className="text-white">最高单项成绩</p>
                  <p className="text-dark-400">比较所有项目中的最高加权得分</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-warning mt-1.5" />
                <div>
                  <p className="text-white">获第一名次数</p>
                  <p className="text-dark-400">统计各选手在单项中获得第一名的次数</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-info mt-1.5" />
                <div>
                  <p className="text-white">次高/第三高单项</p>
                  <p className="text-dark-400">依次比较次高、第三高的单项成绩</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;
