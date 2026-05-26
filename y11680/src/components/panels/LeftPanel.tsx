import { useState } from 'react';
import { Settings, Volume2, Box, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import Slider from '../ui/Slider';
import NumberInput from '../ui/NumberInput';

export default function LeftPanel() {
  const [expandedSections, setExpandedSections] = useState({
    room: true,
    source: true,
    display: true,
  });

  const room = useStore((state) => state.room);
  const soundSource = useStore((state) => state.soundSource);
  const setRoom = useStore((state) => state.setRoom);
  const setSoundSource = useStore((state) => state.setSoundSource);
  const showHeatmap = useStore((state) => state.showHeatmap);
  const heatmapOpacity = useStore((state) => state.heatmapOpacity);
  const animationSpeed = useStore((state) => state.animationSpeed);
  const setShowHeatmap = useStore((state) => state.setShowHeatmap);
  const setHeatmapOpacity = useStore((state) => state.setHeatmapOpacity);
  const setAnimationSpeed = useStore((state) => state.setAnimationSpeed);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="w-80 bg-dark-800 border-r border-dark-900 overflow-y-auto">
      <div className="p-4 border-b border-dark-900">
        <h2 className="font-display text-lg text-primary-400 flex items-center gap-2">
          <Settings size={20} />
          参数控制
        </h2>
      </div>

      <Section
        title="房间尺寸"
        icon={<Box size={16} />}
        expanded={expandedSections.room}
        onToggle={() => toggleSection('room')}
      >
        <div className="space-y-4">
          <Slider
            label="宽度 (m)"
            value={room.width}
            min={1}
            max={20}
            step={0.1}
            onChange={(v) => setRoom({ width: v })}
          />
          <Slider
            label="高度 (m)"
            value={room.height}
            min={2}
            max={10}
            step={0.1}
            onChange={(v) => setRoom({ height: v })}
          />
          <Slider
            label="深度 (m)"
            value={room.depth}
            min={1}
            max={20}
            step={0.1}
            onChange={(v) => setRoom({ depth: v })}
          />
        </div>
      </Section>

      <Section
        title="声源参数"
        icon={<Volume2 size={16} />}
        expanded={expandedSections.source}
        onToggle={() => toggleSection('source')}
      >
        <div className="space-y-4">
          <Slider
            label="频率 (Hz)"
            value={soundSource.frequency}
            min={20}
            max={2000}
            step={1}
            onChange={(v) => setSoundSource({ frequency: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="X (m)"
              value={soundSource.x}
              min={0}
              max={room.width}
              step={0.1}
              onChange={(v) => setSoundSource({ x: v })}
            />
            <NumberInput
              label="Y (m)"
              value={soundSource.y}
              min={0}
              max={room.height}
              step={0.1}
              onChange={(v) => setSoundSource({ y: v })}
            />
            <NumberInput
              label="Z (m)"
              value={soundSource.z}
              min={0}
              max={room.depth}
              step={0.1}
              onChange={(v) => setSoundSource({ z: v })}
            />
            <NumberInput
              label="振幅"
              value={soundSource.amplitude}
              min={0.1}
              max={2}
              step={0.1}
              onChange={(v) => setSoundSource({ amplitude: v })}
            />
          </div>
        </div>
      </Section>

      <Section
        title="显示设置"
        icon={<Settings size={16} />}
        expanded={expandedSections.display}
        onToggle={() => toggleSection('display')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">显示热力图</span>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`w-12 h-6 rounded-full transition-colors ${
                showHeatmap ? 'bg-primary-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  showHeatmap ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {showHeatmap && (
            <Slider
              label="热力图透明度"
              value={heatmapOpacity}
              min={0.1}
              max={1}
              step={0.05}
              onChange={setHeatmapOpacity}
            />
          )}
          <Slider
            label="动画速度"
            value={animationSpeed}
            min={0}
            max={3}
            step={0.1}
            onChange={setAnimationSpeed}
          />
        </div>
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
