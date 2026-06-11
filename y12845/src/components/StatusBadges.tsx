import type { BatchStatus, SampleStatus } from '@/types';

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const configs: Record<BatchStatus, { label: string; className: string; dotColor: string }> = {
    pending: {
      label: '待复核',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      dotColor: 'bg-amber-500',
    },
    reviewing: {
      label: '复核中',
      className: 'bg-abyss-50 text-abyss-700 border border-abyss-200',
      dotColor: 'bg-abyss-500',
    },
    approved: {
      label: '已通过',
      className: 'bg-moss-50 text-moss-700 border border-moss-200',
      dotColor: 'bg-moss-500',
    },
    needs_review: {
      label: '需再复核',
      className: 'bg-ember-50 text-ember-700 border border-ember-200',
      dotColor: 'bg-ember-500',
    },
  };

  const config = configs[status];

  return (
    <span className={`status-badge ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} mr-1.5`}></span>
      {config.label}
    </span>
  );
}

export function SampleStatusBadge({ status }: { status: SampleStatus }) {
  const configs: Record<SampleStatus, { label: string; className: string; dotColor: string }> = {
    normal: {
      label: '正常',
      className: 'bg-moss-50 text-moss-700 border border-moss-200',
      dotColor: 'bg-moss-500',
    },
    contaminated: {
      label: '污染',
      className: 'bg-crimson-50 text-crimson-700 border border-crimson-200',
      dotColor: 'bg-crimson-500',
    },
    corrected: {
      label: '已修正',
      className: 'bg-ember-50 text-ember-700 border border-ember-200',
      dotColor: 'bg-ember-500',
    },
  };

  const config = configs[status];

  return (
    <span className={`status-badge ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} mr-1.5`}></span>
      {config.label}
    </span>
  );
}

export function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex ml-2">
      <div className="w-4 h-4 rounded-full bg-abyss-100 text-abyss-500 text-xs flex items-center justify-center cursor-help hover:bg-abyss-200 transition-colors">
        ?
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-abyss-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-56 z-10 leading-relaxed">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-abyss-800"></div>
      </div>
    </div>
  );
}
