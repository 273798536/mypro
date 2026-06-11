import type { EventType } from '@/types';

interface Props {
  type: EventType;
}

const TYPE_META: Record<
  EventType,
  { label: string; color: string; bg: string; iconText: string }
> = {
  created: { label: '创建', color: 'text-gray-600', bg: 'bg-gray-400', iconText: '＋' },
  processed: { label: '已处理', color: 'text-processed-green', bg: 'bg-processed-green', iconText: '✓' },
  suspended: { label: '挂起', color: 'text-suspended-red', bg: 'bg-suspended-red', iconText: '!' },
  withdrawn: { label: '已撤回', color: 'text-withdrawn-gray', bg: 'bg-withdrawn-gray', iconText: '×' },
  manual_overruled: { label: '人工改判', color: 'text-manual-purple', bg: 'bg-manual-purple', iconText: '★' },
  material_requested: { label: '待补材料', color: 'text-alert-orange', bg: 'bg-alert-orange', iconText: '?' },
  material_supplemented: { label: '材料已补', color: 'text-processed-green', bg: 'bg-processed-green', iconText: '✓' },
  note_added: { label: '备注补充', color: 'text-deep-sea', bg: 'bg-deep-sea', iconText: '…' },
};

export default function TimelineDot({ type }: Props) {
  const meta = TYPE_META[type];
  return (
    <div
      className={`timeline-dot ${meta.bg} flex items-center justify-center text-white text-[10px] font-bold leading-none`}
      title={meta.label}
    >
      {meta.iconText}
    </div>
  );
}

export { TYPE_META };
