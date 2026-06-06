import { useState } from 'react';
import Timeline from '../components/History/Timeline';
import DiffViewer from '../components/History/DiffViewer';
import TraceView from '../components/History/TraceView';
import { Operation } from '../types';
import { Layers } from 'lucide-react';

export default function HistoryPage() {
  const [selected, setSelected] = useState<Operation | null>(null);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[420px] border-r border-port-border flex flex-col bg-port-panel/30">
          <Timeline onSelect={setSelected} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <DiffViewer operation={selected} />
          <TraceView />
        </div>
      </div>
    </div>
  );
}
