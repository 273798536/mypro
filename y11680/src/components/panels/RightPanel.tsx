import { useState } from 'react';
import {
  Layers,
  MapPin,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import FrequencyChart from '../charts/FrequencyChart';
import MaterialList from './MaterialList';
import MeasurementPointsList from './MeasurementPointsList';
import ErrorDisplay from './ErrorDisplay';
import ModificationHistory from './ModificationHistory';

export default function RightPanel() {
  const [expandedSections, setExpandedSections] = useState({
    materials: true,
    points: true,
    chart: true,
    errors: true,
    history: false,
  });

  const errors = useStore((state) => state.errors);
  const selectedPointId = useStore((state) => state.selectedPointId);
  const measurementPoints = useStore((state) => state.measurementPoints);
  const selectedPoint = measurementPoints.find((p) => p.id === selectedPointId);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="w-80 bg-dark-800 border-l border-dark-900 overflow-y-auto">
      <div className="p-4 border-b border-dark-900">
        <h2 className="font-display text-lg text-primary-400 flex items-center gap-2">
          <Layers size={20} />
          分析面板
        </h2>
      </div>

      <Section
        title="吸音材料"
        icon={<Layers size={16} />}
        expanded={expandedSections.materials}
        onToggle={() => toggleSection('materials')}
      >
        <MaterialList />
      </Section>

      <Section
        title="测量点"
        icon={<MapPin size={16} />}
        expanded={expandedSections.points}
        onToggle={() => toggleSection('points')}
      >
        <MeasurementPointsList />
      </Section>

      <Section
        title="频率响应"
        icon={<span className="text-xs">📊</span>}
        expanded={expandedSections.chart}
        onToggle={() => toggleSection('chart')}
      >
        {selectedPoint ? (
          <FrequencyChart point={selectedPoint} />
        ) : (
          <div className="text-gray-400 text-sm text-center py-4">
            请在3D视图中选择一个测量点
          </div>
        )}
      </Section>

      <Section
        title={`验证警告 (${errors.length})`}
        icon={<AlertTriangle size={16} className={errors.length > 0 ? 'text-accent-500' : ''} />}
        expanded={expandedSections.errors}
        onToggle={() => toggleSection('errors')}
      >
        <ErrorDisplay errors={errors} />
      </Section>

      <Section
        title="修改历史"
        icon={<History size={16} />}
        expanded={expandedSections.history}
        onToggle={() => toggleSection('history')}
      >
        <ModificationHistory />
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, icon, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="border-b border-dark-900">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-dark-900 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-200">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {expanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
