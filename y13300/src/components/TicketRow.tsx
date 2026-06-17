import { Eye, GitCompare, Download } from 'lucide-react';
import { Ticket, STATUS_COLORS } from '../../shared/types.js';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge.js';

interface TicketRowProps {
  ticket: Ticket;
  onView?: (ticket: Ticket) => void;
  onCompare?: (ticket: Ticket) => void;
  onExport?: (ticket: Ticket) => void;
}

export default function TicketRow({ ticket, onView, onCompare, onExport }: TicketRowProps) {
  const statusColorClass = STATUS_COLORS[ticket.status].replace('bg-', 'bg-');

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border bg-white p-4 transition-all duration-200',
        'hover:shadow-md cursor-pointer'
      )}
    >
      <div
        className={cn('h-12 w-1 rounded-full', statusColorClass)}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-gray-900">
            {ticket.ticketNo}
          </span>
          <StatusBadge status={ticket.status} size="sm" />
          <span className="text-xs text-gray-500">
            v{ticket.currentVersion} / v{ticket.latestVersion}
          </span>
          {ticket.hasSampleLeak && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              样本泄露
            </span>
          )}
          {ticket.hasManualMark && (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              人工标注
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-gray-600">
          {ticket.customerIssue}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          客户: {ticket.customerName}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onView?.(ticket)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="查看"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onCompare?.(ticket)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="对比"
        >
          <GitCompare className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onExport?.(ticket)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="导出"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
