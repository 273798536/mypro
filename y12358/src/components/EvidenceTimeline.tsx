import React from 'react';
import { Timeline } from 'antd';
import { Scale, Activity, FileText, Download, Circle } from 'lucide-react';
import type { EvidenceItem } from '../types';
import { formatDateTime, getEvidenceTypeText } from '../utils';

interface EvidenceTimelineProps {
  evidence: EvidenceItem[];
}

const getIcon = (type: string) => {
  const iconProps = { size: 16, className: 'text-white' };
  switch (type) {
    case 'load_record':
      return <Scale {...iconProps} />;
    case 'oil_pressure':
      return <Activity {...iconProps} />;
    case 'maintenance_remark':
      return <FileText {...iconProps} />;
    case 'report':
      return <Download {...iconProps} />;
    default:
      return <Circle {...iconProps} />;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'load_record':
      return '#165DFF';
    case 'oil_pressure':
      return '#F53F3F';
    case 'maintenance_remark':
      return '#FF7D00';
    case 'report':
      return '#00B42A';
    default:
      return '#86909C';
  }
};

const EvidenceTimeline: React.FC<EvidenceTimelineProps> = ({ evidence }) => {
  const items = evidence
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((item) => ({
      color: getColor(item.type),
      dot: (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: getColor(item.type) }}
        >
          {getIcon(item.type)}
        </div>
      ),
      children: (
        <div className="pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: getColor(item.type) }}
            >
              {getEvidenceTypeText(item.type)}
            </span>
            <span className="text-xs text-gray-500">ID: {item.refId}</span>
          </div>
          <p className="text-sm text-gray-800 font-medium mb-1">{item.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>操作人：{item.operator}</span>
            <span>时间：{formatDateTime(item.timestamp)}</span>
          </div>
        </div>
      ),
    }));

  return (
    <div className="pl-4">
      <Timeline
        mode="left"
        items={items}
        className="evidence-timeline"
      />
    </div>
  );
};

export default EvidenceTimeline;
