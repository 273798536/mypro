import React, { useRef, useEffect } from 'react';
import type { LogLevel } from '@/types';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import {
  RefreshCcw,
  DatabaseZap,
  CheckSquare,
  Play,
  Square,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Terminal,
} from 'lucide-react';
import { useTypewriterLog, formatTimestamp } from '@/hooks/useTypewriterLog';
import { getReviewActionLabel } from '@/utils/format';

const levelClass: Record<LogLevel, string> = {
  INFO: 'log-info',
  WARN: 'log-warn',
  ERROR: 'log-error',
  SUCCESS: 'log-success',
};

const levelIcon: Record<LogLevel, React.ReactNode> = {
  INFO: <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />,
  WARN: <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />,
  ERROR: <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />,
  SUCCESS: <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />,
};

interface ActionConfig {
  type: 'rerun' | 'backfill' | 'manual_confirm';
  icon: React.ReactNode;
  tone: 'warn' | 'primary' | 'success';
  description: string;
  hint: string;
}

const actions: ActionConfig[] = [
  {
    type: 'rerun',
    icon: <RefreshCcw className="w-5 h-5" />,
    tone: 'warn',
    description: '重放原始事件与查询，复现异常并验证修复方案',
    hint: '核心步骤：必须先执行此步骤验证可复现性',
  },
  {
    type: 'backfill',
    icon: <DatabaseZap className="w-5 h-5" />,
    tone: 'primary',
    description: '从上游数据源补录缺失记录后，再次执行一致性校验',
    hint: '交叉验证：确认非数据缺失导致的误报',
  },
  {
    type: 'manual_confirm',
    icon: <CheckSquare className="w-5 h-5" />,
    tone: 'success',
    description: '人工复核确认，完成终审标记并归档',
    hint: '最终步骤：建议前两项通过后再执行',
  },
];

interface LogPanelProps {
  actionType: 'rerun' | 'backfill' | 'manual_confirm';
  collapsed: boolean;
}

const LogPanel: React.FC<LogPanelProps> = ({ actionType, collapsed }) => {
  const logHook = useTypewriterLog(actionType);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logHook.logLines]);

  useEffect(() => {
    if (!collapsed && logHook.status === 'idle' && logHook.logLines.length === 0) {
      logHook.start();
    }
  }, [collapsed, logHook]);

  if (collapsed) return null;

  return (
    <div className="mt-3 border-2 border-gray-700 bg-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono text-gray-300">
            {actionType.toUpperCase()} · execute.log
          </span>
          {logHook.isRunning && (
            <Tag tone="primary" className="!text-[10px] !bg-blue-500/20 !text-blue-300 !border-blue-500/50 animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin mr-0.5" />
              运行中
            </Tag>
          )}
          {logHook.status === 'success' && (
            <Tag tone="emerald" className="!text-[10px]">
              <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
              执行成功
            </Tag>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<Square className="w-3 h-3" />}
            onClick={logHook.reset}
            className="!text-gray-400 !text-[10px] !py-0.5 !px-2 hover:!text-white hover:!bg-gray-700"
          >
            清空
          </Button>
        </div>
      </div>
      <div className="terminal-log !bg-gray-900 !text-emerald-300 h-48 overflow-y-auto font-mono !text-[12px] !leading-6">
        {logHook.logLines.length === 0 && !logHook.isRunning && (
          <div className="text-gray-500 italic text-center py-8">
            点击上方 "执行 {getReviewActionLabel(actionType)}" 按钮开始操作...
          </div>
        )}
        {logHook.logLines.map((line, i) => (
          <div key={i} className={`flex gap-2 ${levelClass[line.level]}`}>
            <span className="text-gray-500 flex-shrink-0">[{line.timestamp}]</span>
            {levelIcon[line.level]}
            <span className="flex-1 whitespace-pre-wrap break-all">{line.message}</span>
          </div>
        ))}
        {logHook.isRunning && (
          <div className="flex gap-2 log-info">
            <span className="text-gray-500 flex-shrink-0">[{formatTimestamp()}]</span>
            <span className="log-cursor" />
          </div>
        )}
        <div ref={logEndRef} />
      </div>
      {logHook.summary && (
        <div className="px-3 py-2 bg-emerald-900/30 border-t border-emerald-700/50 text-[12px] text-emerald-200 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
          <div>
            <span className="font-semibold text-emerald-300 mr-1.5">执行摘要：</span>
            {logHook.summary}
          </div>
        </div>
      )}
    </div>
  );
};

interface ReviewActionsProps {
  activeAction: 'rerun' | 'backfill' | 'manual_confirm' | null;
  onActionClick: (type: 'rerun' | 'backfill' | 'manual_confirm') => void;
  onExecuted?: (type: 'rerun' | 'backfill' | 'manual_confirm', summary: string) => void;
}

export const ReviewActions: React.FC<ReviewActionsProps> = ({
  activeAction,
  onActionClick,
}) => {
  return (
    <Section
      tone="primary"
      title={
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary-600" />
          <span>复核操作区 · 三步校验流程</span>
        </div>
      }
      subtitle="日常使用必试：重复运行 → 补录 → 人工确认，三步少一个都会让后续打折"
      defaultOpen
    >
      <div className="mb-4 p-3 bg-gradient-to-r from-primary-50 to-amber-50/50 border border-primary-200">
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <span className="font-semibold">复核流程规范：</span>
            建议按顺序执行 <span className="font-mono text-amber-700 font-bold">①重复运行</span> →
            <span className="font-mono text-primary-700 font-bold">②补录</span> →
            <span className="font-mono text-emerald-700 font-bold">③人工确认</span>，
            每步执行日志完整留痕，便于审计回溯。
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {actions.map((action, idx) => {
          const isActive = activeAction === action.type;

          return (
            <div
              key={action.type}
              className={[
                'border-2 p-3 transition-all',
                isActive
                  ? 'border-primary-400 shadow-lg bg-primary-50/40 ring-1 ring-primary-200'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    'w-8 h-8 flex-shrink-0 flex items-center justify-center font-bold text-sm border-2',
                    action.tone === 'warn'
                      ? 'bg-amber-500 text-white border-amber-400'
                      : action.tone === 'primary'
                      ? 'bg-primary-600 text-white border-primary-500'
                      : 'bg-emerald-600 text-white border-emerald-500',
                  ].join(' ')}
                >
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div>
                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        {action.icon}
                        {getReviewActionLabel(action.type)}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{action.description}</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        {action.hint}
                      </p>
                    </div>
                    <Button
                      variant={action.tone}
                      icon={
                        isActive && activeAction === action.type ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )
                      }
                      onClick={() => onActionClick(action.type)}
                    >
                      执行{getReviewActionLabel(action.type)}
                    </Button>
                  </div>

                  <LogPanel actionType={action.type} collapsed={!isActive} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};
