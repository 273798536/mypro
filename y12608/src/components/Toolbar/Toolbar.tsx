import { MousePointer, Move, CheckCircle, AlertTriangle, Clock, Undo2, Redo2, Upload, Download, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvasStore';
import { ToolType } from '../../types';
import { motion } from 'framer-motion';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolButton({ icon, label, active, onClick, disabled }: ToolButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-12 h-12 flex items-center justify-center rounded-xl
        transition-all duration-200
        ${active 
          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
          : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={label}
    >
      {icon}
    </motion.button>
  );
}

interface ToolDividerProps {
  label?: string;
}

function ToolDivider({ label }: ToolDividerProps) {
  return (
    <div className="w-full flex flex-col items-center gap-1">
      {label && (
        <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="w-8 h-px bg-white/10" />
    </div>
  );
}

export function Toolbar({
  onImport,
  onExport,
  onReview
}: {
  onImport: () => void;
  onExport: () => void;
  onReview: () => void;
}) {
  const {
    currentTool,
    setTool,
    undo,
    redo,
    historyIndex,
    history,
    reset,
    selectedTrackId,
    flipTrack,
    toggleTrackVisibility,
    deleteTrack,
    tracks
  } = useCanvasStore();

  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer size={20} />, label: '选择 (V)' },
    { id: 'pan', icon: <Move size={20} />, label: '平移 (H)' },
  ];

  const annotationTools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'annotate-normal', icon: <CheckCircle size={20} />, label: '标注正常 (1)' },
    { id: 'annotate-abnormal', icon: <AlertTriangle size={20} />, label: '标注异常 (2)' },
    { id: 'annotate-pending', icon: <Clock size={20} />, label: '标注待确认 (3)' },
  ];

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="h-full w-20 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center py-4 gap-3 border-r border-white/5">
      <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center mb-2">
        <span className="text-white font-bold text-lg">战</span>
      </div>
      
      <ToolDivider label="工具" />
      
      {tools.map(tool => (
        <ToolButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          active={currentTool === tool.id}
          onClick={() => setTool(tool.id)}
        />
      ))}
      
      <ToolDivider label="标注" />
      
      {annotationTools.map(tool => (
        <ToolButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          active={currentTool === tool.id}
          onClick={() => setTool(tool.id)}
        />
      ))}
      
      <ToolDivider label="操作" />
      
      <ToolButton
        icon={<Undo2 size={20} />}
        label="撤销 (Ctrl+Z)"
        onClick={undo}
        disabled={!canUndo}
      />
      
      <ToolButton
        icon={<Redo2 size={20} />}
        label="重做 (Ctrl+Y)"
        onClick={redo}
        disabled={!canRedo}
      />
      
      <ToolDivider label="文件" />
      
      <ToolButton
        icon={<Upload size={20} />}
        label="导入数据"
        onClick={onImport}
      />
      
      <ToolButton
        icon={<Download size={20} />}
        label="导出数据"
        onClick={onExport}
      />
      
      <ToolButton
        icon={<Eye size={20} />}
        label="复核面板"
        onClick={onReview}
      />
      
      {selectedTrack && (
        <>
          <ToolDivider label="轨迹" />
          
          <ToolButton
            icon={<RefreshCw size={20} />}
            label="翻转坐标"
            onClick={() => flipTrack(selectedTrackId!)}
          />
          
          <ToolButton
            icon={<Eye size={20} />}
            label={selectedTrack.visible ? '隐藏轨迹' : '显示轨迹'}
            onClick={() => toggleTrackVisibility(selectedTrackId!)}
          />
          
          <ToolButton
            icon={<Trash2 size={20} />}
            label="删除轨迹"
            onClick={() => deleteTrack(selectedTrackId!)}
          />
        </>
      )}
      
      <div className="flex-1" />
      
      <ToolDivider />
      
      <ToolButton
        icon={<RefreshCw size={20} />}
        label="重置画布"
        onClick={reset}
      />
    </div>
  );
}
