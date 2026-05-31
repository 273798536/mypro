import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';
import type { ValidationRule } from '@/types';
import PageContainer from '@/components/layout/PageContainer';

function getTypeLabel(type: ValidationRule['type']): string {
  switch (type) {
    case 'artist_max_count':
      return '歌手重复限制';
    case 'decade_range':
      return '年代分布均衡';
    case 'tag_ratio':
      return '标签配比';
    case 'genre_balance':
      return '流派均衡';
    default:
      return type;
  }
}

function RuleCard({ rule }: { rule: ValidationRule }) {
  const { updateValidationRule } = useStore();

  const handleToggle = () => {
    updateValidationRule(rule.id, { enabled: !rule.enabled });
  };

  const handleWeightChange = (weight: number) => {
    updateValidationRule(rule.id, { weight });
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border p-5 transition-opacity',
        rule.enabled ? 'border-pale shadow-sm' : 'border-pale opacity-60'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-charcoal">{rule.name}</h3>
          <p className="text-sm text-muted mt-0.5">{getTypeLabel(rule.type)}</p>
        </div>
        <button
          onClick={handleToggle}
          className={cn(
            'relative w-10 h-6 rounded-full transition-colors',
            rule.enabled ? 'bg-forest' : 'bg-pale'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
              rule.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted">权重</span>
          <span className="text-sm font-mono text-charcoal">{rule.weight}</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={rule.weight}
          onChange={(e) => handleWeightChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-pale rounded-full appearance-none cursor-pointer accent-navy"
        />
      </div>

      <ParamsEditor rule={rule} />
    </div>
  );
}

function ParamsEditor({ rule }: { rule: ValidationRule }) {
  const { updateValidationRule } = useStore();

  switch (rule.type) {
    case 'artist_max_count': {
      const params = rule.params as { maxCount: number };
      return (
        <div>
          <label className="block text-sm text-muted mb-1">最大允许次数</label>
          <input
            type="number"
            min={1}
            value={params.maxCount}
            onChange={(e) =>
              updateValidationRule(rule.id, {
                params: { ...rule.params, maxCount: parseInt(e.target.value, 10) || 1 },
              })
            }
            className="w-32 px-3 py-1.5 border border-pale rounded text-sm font-mono focus:outline-none focus:border-navy"
          />
        </div>
      );
    }
    case 'decade_range': {
      const params = rule.params as {
        ranges: { min: number; max: number; minRatio: number; maxRatio: number }[];
      };
      return (
        <div>
          <label className="block text-sm text-muted mb-2">年代区间配比</label>
          <div className="space-y-2">
            {params.ranges.map((range, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-cream/50 rounded"
              >
                <span className="text-sm font-mono text-charcoal w-24">
                  {range.min}-{range.max}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted">最低</span>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    max={1}
                    value={range.minRatio}
                    onChange={(e) => {
                      const newRanges = [...params.ranges];
                      newRanges[idx] = {
                        ...newRanges[idx],
                        minRatio: parseFloat(e.target.value) || 0,
                      };
                      updateValidationRule(rule.id, {
                        params: { ...rule.params, ranges: newRanges },
                      });
                    }}
                    className="w-16 px-2 py-1 border border-pale rounded text-xs font-mono focus:outline-none focus:border-navy"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted">最高</span>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    max={1}
                    value={range.maxRatio}
                    onChange={(e) => {
                      const newRanges = [...params.ranges];
                      newRanges[idx] = {
                        ...newRanges[idx],
                        maxRatio: parseFloat(e.target.value) || 0,
                      };
                      updateValidationRule(rule.id, {
                        params: { ...rule.params, ranges: newRanges },
                      });
                    }}
                    className="w-16 px-2 py-1 border border-pale rounded text-xs font-mono focus:outline-none focus:border-navy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'tag_ratio': {
      const params = rule.params as {
        requiredTags: string[];
        minRatio: number;
        maxRatio: number;
      };
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-muted mb-1">必检标签</label>
            <div className="flex flex-wrap gap-1.5">
              {params.requiredTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-navy/10 text-navy rounded text-xs"
                >
                  {tag}
                  <button
                    onClick={() => {
                      const newTags = params.requiredTags.filter((_, i) => i !== idx);
                      updateValidationRule(rule.id, {
                        params: { ...rule.params, requiredTags: newTags },
                      });
                    }}
                    className="hover:text-alert"
                  >
                    ×
                  </button>
                </span>
              ))}
              <TagAddInput
                onAdd={(tag) => {
                  if (params.requiredTags.includes(tag)) return;
                  updateValidationRule(rule.id, {
                    params: { ...rule.params, requiredTags: [...params.requiredTags, tag] },
                  });
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">最低占比</label>
              <input
                type="number"
                step={0.01}
                min={0}
                max={1}
                value={params.minRatio}
                onChange={(e) =>
                  updateValidationRule(rule.id, {
                    params: { ...rule.params, minRatio: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-20 px-2 py-1 border border-pale rounded text-xs font-mono focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">最高占比</label>
              <input
                type="number"
                step={0.01}
                min={0}
                max={1}
                value={params.maxRatio}
                onChange={(e) =>
                  updateValidationRule(rule.id, {
                    params: { ...rule.params, maxRatio: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-20 px-2 py-1 border border-pale rounded text-xs font-mono focus:outline-none focus:border-navy"
              />
            </div>
          </div>
        </div>
      );
    }
    case 'genre_balance': {
      const params = rule.params as { maxGenreRatio: number };
      return (
        <div>
          <label className="block text-sm text-muted mb-1">单流派最大占比</label>
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={params.maxGenreRatio}
            onChange={(e) =>
              updateValidationRule(rule.id, {
                params: { ...rule.params, maxGenreRatio: parseFloat(e.target.value) || 0 },
              })
            }
            className="w-32 px-3 py-1.5 border border-pale rounded text-sm font-mono focus:outline-none focus:border-navy"
          />
        </div>
      );
    }
    default:
      return null;
  }
}

function TagAddInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="+ 添加"
      className="w-16 px-2 py-0.5 border border-pale rounded text-xs focus:outline-none focus:border-navy"
    />
  );
}

export default function SettingsPage() {
  const { validationRules, resetValidationRules } = useStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    resetValidationRules();
    setShowResetConfirm(false);
  };

  return (
    <PageContainer title="约束规则">
      <div className="max-w-2xl space-y-4">
        {validationRules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-pale text-charcoal rounded-lg hover:bg-pale/70 transition-colors"
        >
          <RotateCcw size={16} />
          重置为默认值
        </button>
      </div>

      {showResetConfirm && (
        <div
          className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-50"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-80 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-charcoal mb-2">确认重置</h3>
            <p className="text-sm text-muted mb-4">
              所有规则将恢复为默认设置，自定义修改将丢失。确定继续？
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-1.5 text-sm text-muted hover:text-charcoal"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-1.5 text-sm bg-alert text-white rounded hover:bg-alert/90"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
