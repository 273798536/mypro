import { useNavigate } from 'react-router-dom';
import { FileText, User, ChevronRight } from 'lucide-react';
import type { TitrationRecord } from '../../types';
import StatusBadge from './StatusBadge';
import SourceTooltip from './SourceTooltip';
import StudentMask from './StudentMask';
import { useAppStore } from '../../store/useAppStore';

const statusBorder: Record<string, string> = {
  passed: 'border-l-lab-green',
  pending: 'border-l-lab-yellow',
  error: 'border-l-lab-red',
};

interface Props {
  record: TitrationRecord;
  index: number;
}

export default function RecordCard({ record, index }: Props) {
  const navigate = useNavigate();
  const currentRole = useAppStore((s) => s.currentRole);

  const content = (
    <div
      onClick={() => navigate(`/record/${record.id}`)}
      className={`bg-white rounded-sm-plus border-l-4 ${statusBorder[record.status]} p-5 card-shadow card-shadow-hover cursor-pointer transition-all`}
      style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-display text-xl text-lab-blue font-semibold">
            {record.sampleCode}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">{record.titrationType}</div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={record.status} />
          <ChevronRight size={18} className="text-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <SourceTooltip source={record.source}>
          <span className="inline-flex items-center gap-1 cursor-help border-b border-dashed border-gray-400 hover:text-lab-blue transition-colors">
            <FileText size={12} />
            第 {record.source.lineNumber} 行 · {record.source.spectrumFile}
          </span>
        </SourceTooltip>
        <span className="inline-flex items-center gap-1">
          <User size={12} />
          学生：{record.student}
        </span>
      </div>

      <div className="p-3 bg-paper rounded-sm-plus italic text-sm text-gray-600 leading-relaxed border-l-2 border-paper-dark">
        {record.summary}
      </div>
    </div>
  );

  if (currentRole === 'student') {
    return (
      <div
        style={{ animationDelay: `${index * 60}ms` }}
        className="animate-fade-up"
      >
        <StudentMask
          status={record.status}
          reviewer={record.reviewer}
          lineNumber={record.source.lineNumber}
        >
          {content}
        </StudentMask>
      </div>
    );
  }

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      {content}
    </div>
  );
}
