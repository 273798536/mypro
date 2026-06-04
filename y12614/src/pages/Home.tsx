import { useState } from 'react';
import { ImageCanvas } from '@/components/canvas/ImageCanvas';
import { ToolPanel } from '@/components/canvas/ToolPanel';
import { DetectionPanel } from '@/components/canvas/DetectionPanel';
import { mockSamples } from '@/data/mockSamples';
import { mockDevices } from '@/data/mockDevices';
import type { Sample } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ChevronDown } from 'lucide-react';

export default function Home() {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(mockSamples[0]);
  const [sampleDropdownOpen, setSampleDropdownOpen] = useState(false);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">病斑圈选</h2>
          
          <div className="relative">
            <button
              onClick={() => setSampleDropdownOpen(!sampleDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="text-sm">选择样例</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {sampleDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
                {mockSamples.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      setSelectedSample(sample);
                      setSampleDropdownOpen(false);
                    }}
                    className={`w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between border-b last:border-b-0 ${
                      selectedSample?.id === sample.id ? 'bg-green-50' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{sample.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sample.createdAt.toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <StatusBadge status={sample.status} type="sample" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedSample && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">当前:</span>
              <span className="text-sm font-medium">{selectedSample.name}</span>
              <StatusBadge status={selectedSample.status} type="sample" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>设备: {mockDevices.filter(d => d.status === 'active').length} 台在线</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ToolPanel
          sampleName={selectedSample?.name}
          manualNote={selectedSample?.manualNote}
        />
        <div className="flex-1">
          <ImageCanvas sample={selectedSample} />
        </div>
        <DetectionPanel />
      </div>
    </div>
  );
}
