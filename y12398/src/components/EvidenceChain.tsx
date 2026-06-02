import React, { useState } from 'react';
import { ChevronDown, Image, FileText, Clock, Camera } from 'lucide-react';
import type { Evidence } from '../../shared/types';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '../utils/format';

interface EvidenceChainProps {
  evidence: Evidence[];
}

const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  device_note: FileText,
  borrow_record: FileText,
  return_record: FileText,
  damage_photo: Camera,
  inventory_snapshot: FileText
};

export const EvidenceChain: React.FC<EvidenceChainProps> = ({ evidence }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sortedEvidence = [...evidence].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedEvidence.map((item, index) => {
        const Icon = typeIcons[item.type] || FileText;
        const isExpanded = expandedIds.has(item.id);
        const isLast = index === sortedEvidence.length - 1;

        return (
          <div key={item.id} className="relative">
            {!isLast && (
              <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200" />
            )}
            <div className="relative">
              <div
                className="flex items-start gap-3 cursor-pointer group"
                onClick={() => toggleExpand(item.id)}
              >
                <div className={`p-2 rounded-full bg-white border-2 border-slate-200 z-10 transition-colors ${
                  item.type === 'damage_photo' ? 'border-rose-300' : 'group-hover:border-primary-400'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    item.type === 'damage_photo' ? 'text-rose-500' : 'text-slate-500 group-hover:text-primary-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge type="evidence" value={item.type} />
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>
                  <h4 className="font-medium text-slate-900 mt-1">{item.title}</h4>

                  <div className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-96 mt-3' : 'max-h-0'
                  }`}>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-slate-700 text-sm">{item.content}</p>
                      {item.photoUrl && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <Image className="w-4 h-4" />
                            <span>证据照片</span>
                          </div>
                          <img
                            src={item.photoUrl}
                            alt={item.title}
                            className="rounded-lg max-w-xs max-h-48 object-cover border border-slate-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
