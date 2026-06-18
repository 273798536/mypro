import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface TicketLinkProps {
  ticketId?: string;
  ticketSummary?: string;
  ticketLink?: string;
}

export default function TicketLink({ ticketId, ticketSummary, ticketLink }: TicketLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!ticketId) {
    return <span className="text-slate-400 text-sm">—</span>;
  }

  return (
    <div className="relative inline-block">
      <a
        href={ticketLink || '#'}
        target={ticketLink ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-brand font-mono hover:underline"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {ticketId}
        {ticketLink && <ExternalLink className="w-3 h-3" />}
      </a>
      {showTooltip && ticketSummary && (
        <div className="absolute bottom-full left-0 mb-2 w-72 px-3 py-2 bg-slate-800 text-white text-xs rounded shadow-lg z-50 whitespace-normal">
          {ticketSummary}
          <div className="absolute -bottom-1 left-4 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}
    </div>
  );
}
