import { FileText, Image, FileCode } from 'lucide-react';
import { useEthicsStore } from '../store/useEthicsStore';

interface TraceAnchorProps {
  type: 'row' | 'image' | 'source';
  value: string;
  sampleId: string;
  onClick?: () => void;
}

export default function TraceAnchor({ type, value, sampleId, onClick }: TraceAnchorProps) {
  const setHighlightedElement = useEthicsStore((s) => s.setHighlightedElement);
  const highlightedElementId = useEthicsStore((s) => s.highlightedElementId);

  const iconMap = {
    row: FileText,
    image: Image,
    source: FileCode,
  };

  const labelMap = {
    row: '原始行号',
    image: '图片名',
    source: '来源备注',
  };

  const Icon = iconMap[type];
  const elementId = `trace-${type}-${sampleId}`;
  const isHighlighted = highlightedElementId === elementId;

  const handleClick = () => {
    setHighlightedElement(elementId);
    setTimeout(() => setHighlightedElement(null), 1500);
    onClick?.();
  };

  return (
    <button
      id={elementId}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${
        isHighlighted
          ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300 animate-highlight'
          : 'text-gray-500 hover:bg-primary-50 hover:text-primary-600'
      }`}
      title={`点击追溯${labelMap[type]}: ${value}`}
    >
      <Icon className="w-3 h-3" />
      <span className="truncate max-w-[120px]">{value}</span>
    </button>
  );
}
