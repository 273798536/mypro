import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Upload,
  FileClock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Info,
  Terminal,
  List,
} from 'lucide-react';
import { useState } from 'react';
import { useSeatStore } from '../store/useSeatStore';

type StepState = 'idle' | 'loading' | 'done';

export default function ImportDemo() {
  const navigate = useNavigate();
  const { importBatch, importLateAttachment, lastImportLog, records, exceptions } = useSeatStore();

  const [step1, setStep1] = useState<StepState>('idle');
  const [step2, setStep2] = useState<StepState>('idle');

  const handleStep1 = async () => {
    setStep1('loading');
    await importBatch();
    setStep1('done');
  };

  const handleStep2 = async () => {
    setStep2('loading');
    await importLateAttachment();
    setStep2('done');
  };

  const steps = [
    {
      id: 1,
      title: '导入旧材料（第一批）',
      description: '模拟上午工作时段，批量导入历史积累的口袋公园座椅材料。',
      icon: Upload,
      state: step1,
      onClick: handleStep1,
      disabled: step1 !== 'idle',
      color: 'primary',
      buttonLabel: step1 === 'done' ? '已完成' : step1 === 'loading' ? '导入中...' : '执行导入',
    },
    {
      id: 2,
      title: '补录晚到附件（第二批）',
      description: '模拟下午换班前，各街道补交的零散附件晚到数据。',
      icon: FileClock,
      state: step2,
      onClick: handleStep2,
      disabled: step1 !== 'done' || step2 !== 'idle',
      color: 'accent',
      buttonLabel: step2 === 'done' ? '已完成' : step2 === 'loading' ? '补录中...' : '执行补录',
    },
    {
      id: 3,
      title: '查看异常队列变化',
      description: '前往异常队列，查看两批导入后系统检测到的各类异常。',
      icon: AlertTriangle,
      state: 'idle' as StepState,
      onClick: () => navigate('/exceptions'),
      disabled: false,
      color: 'warning',
      buttonLabel: '跳转异常队列',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 animate-fadeIn">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-serif font-semibold text-lg text-text-dark mb-1">材料导入演示流程</h2>
            <p className="text-sm text-gray-600">
              按下午换班前真实节奏测试：先导入旧材料 → 再补晚到附件 → 最后查看异常队列变化
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={clsx(
              'bg-white border rounded-lg p-5 relative animate-slideIn transition-all',
              step.state === 'done'
                ? 'border-primary/40 bg-primary/5'
                : step.disabled
                ? 'border-gray-200 opacity-75'
                : 'border-gray-200 hover:border-primary/30',
            )}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  step.color === 'primary' && 'bg-primary/10',
                  step.color === 'accent' && 'bg-accent/10',
                  step.color === 'warning' && 'bg-warning/20',
                )}
              >
                <step.icon
                  className={clsx(
                    'w-5 h-5',
                    step.color === 'primary' && 'text-primary',
                    step.color === 'accent' && 'text-accent',
                    step.color === 'warning' && 'text-yellow-700',
                  )}
                />
              </div>
              <span className="text-xs text-gray-500 font-mono">步骤 {step.id}/3</span>
            </div>
            <h3 className="font-serif font-semibold text-text-dark mb-1">{step.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{step.description}</p>
            <button
              onClick={step.onClick}
              disabled={step.disabled && step.state !== 'loading'}
              className={clsx(
                'w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded transition-colors font-medium',
                step.state === 'done'
                  ? 'bg-gray-100 text-gray-600 cursor-default'
                  : step.disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : step.color === 'primary'
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : step.color === 'accent'
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-warning text-yellow-900 hover:bg-warning/90',
              )}
            >
              {step.state === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
              {step.state === 'done' && <CheckCircle2 className="w-4 h-4" />}
              {step.state === 'idle' && step.id === 3 && <ArrowRight className="w-4 h-4" />}
              {step.buttonLabel}
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-slideIn">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold text-sm text-text-dark">操作日志</h3>
          </div>
          <div className="p-4 bg-gray-900 text-gray-200 font-mono text-xs h-64 overflow-y-auto">
            {lastImportLog.length === 0 ? (
              <p className="text-gray-500">等待执行操作...</p>
            ) : (
              lastImportLog.map((line, idx) => (
                <div
                  key={idx}
                  className="py-0.5 animate-fadeIn"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <span className="text-green-400">$</span> {line}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-slideIn" style={{ animationDelay: '80ms' }}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <List className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold text-sm text-text-dark">当前数据摘要</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">总记录数</span>
              <span className="font-mono font-semibold text-text-dark">{records.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">异常数</span>
              <span className="font-mono font-semibold text-accent">{exceptions.length}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs text-gray-500 mb-2">各状态分布：</p>
              {[
                { label: '待处理', value: records.filter(r => r.status === 'pending').length, color: 'bg-gray-400' },
                { label: '已通过', value: records.filter(r => r.status === 'approved').length, color: 'bg-primary' },
                { label: '异常', value: records.filter(r => r.status === 'exception').length, color: 'bg-accent' },
                { label: '待补证', value: records.filter(r => r.status === 'need_evidence').length, color: 'bg-warning' },
                { label: '疑似重复', value: records.filter(r => r.status === 'suspected_duplicate').length, color: 'bg-indigo-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', item.color)} />
                  <span className="text-gray-600 flex-1">{item.label}</span>
                  <span className="font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
