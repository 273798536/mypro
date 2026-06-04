import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Edit3, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore } from '../../stores/canvasStore';
import { StatusBadge, AnnotationStatusBadge } from '../common/StatusBadge';
import { AnnotationStatus } from '../../types';

interface SectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, count, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-gray-100">
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-semibold text-gray-700">{title}</span>
          {count !== undefined && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
              {count}
            </span>
          )}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TrackItemProps {
  track: any;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function TrackItem({ track, isSelected, onSelect, onToggle, onDelete }: TrackItemProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all
        ${isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}
      `}
      onClick={onSelect}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="w-6 h-6 flex items-center justify-center"
      >
        <div
          className="w-3 h-3 rounded-full transition-opacity"
          style={{
            backgroundColor: track.color,
            opacity: track.visible ? 1 : 0.3
          }}
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700 truncate">
          {track.name}
        </div>
        <div className="text-xs text-gray-400">
          {track.points.length} 个点 · {track.isFlipped ? '已翻转' : '正常'}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

interface AnnotationItemProps {
  annotation: any;
  trackName: string;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}

function AnnotationItem({ annotation, trackName, isSelected, onSelect, onUpdate, onDelete }: AnnotationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState(annotation.note);
  
  const handleSave = () => {
    onUpdate({ note: editNote });
    setIsEditing(false);
  };
  
  const handleStatusChange = (status: AnnotationStatus) => {
    onUpdate({ status });
  };
  
  return (
    <div
      className={`
        p-3 rounded-lg cursor-pointer transition-all
        ${isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'}
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge type={annotation.type} size="sm" />
            <AnnotationStatusBadge status={annotation.status} />
          </div>
          <div className="text-xs text-gray-500 mb-2">
            关联轨迹: {trackName || '未关联'}
          </div>
          
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-primary-500"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                className="p-1 text-green-500 hover:bg-green-50 rounded"
              >
                <Check size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditNote(annotation.note); }}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-600 flex-1">
                {annotation.note || '暂无备注'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded flex-shrink-0"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
          
          {!isEditing && (
            <div className="flex gap-1 mt-2">
              {(['draft', 'confirmed', 'rejected'] as AnnotationStatus[]).map(status => (
                <button
                  key={status}
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(status); }}
                  className={`
                    px-2 py-0.5 text-xs rounded transition-colors
                    ${annotation.status === status 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }
                  `}
                >
                  {status === 'draft' ? '草稿' : status === 'confirmed' ? '确认' : '拒绝'}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function InfoPanel() {
  const {
    tracks,
    annotations,
    selectedTrackId,
    selectedAnnotationId,
    selectTrack,
    selectAnnotation,
    toggleTrackVisibility,
    deleteTrack,
    deleteAnnotation,
    updateAnnotation
  } = useCanvasStore();
  
  const abnormalCount = annotations.filter(a => a.type === 'abnormal').length;
  const pendingCount = annotations.filter(a => a.type === 'pending').length;
  
  return (
    <div className="h-full w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">信息面板</h2>
        <div className="flex gap-2 mt-2">
          <div className="px-3 py-1.5 bg-blue-50 rounded-lg">
            <span className="text-xs text-blue-600">轨迹 {tracks.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-green-50 rounded-lg">
            <span className="text-xs text-green-600">标注 {annotations.length}</span>
          </div>
          {abnormalCount > 0 && (
            <div className="px-3 py-1.5 bg-orange-50 rounded-lg">
              <span className="text-xs text-orange-600">异常 {abnormalCount}</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="px-3 py-1.5 bg-yellow-50 rounded-lg">
              <span className="text-xs text-yellow-600">待确认 {pendingCount}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <Section title="轨迹列表" count={tracks.length}>
          <div className="space-y-2">
            {tracks.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                暂无轨迹数据
              </div>
            ) : (
              tracks.map(track => (
                <TrackItem
                  key={track.id}
                  track={track}
                  isSelected={selectedTrackId === track.id}
                  onSelect={() => selectTrack(track.id)}
                  onToggle={() => toggleTrackVisibility(track.id)}
                  onDelete={() => deleteTrack(track.id)}
                />
              ))
            )}
          </div>
        </Section>
        
        <Section title="标注列表" count={annotations.length} defaultOpen={false}>
          <div className="space-y-2">
            {annotations.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                暂无标注
              </div>
            ) : (
              annotations.map(annotation => {
                const track = tracks.find(t => t.id === annotation.trackId);
                return (
                  <AnnotationItem
                    key={annotation.id}
                    annotation={annotation}
                    trackName={track?.name || ''}
                    isSelected={selectedAnnotationId === annotation.id}
                    onSelect={() => selectAnnotation(annotation.id)}
                    onUpdate={(updates) => updateAnnotation(annotation.id, updates)}
                    onDelete={() => deleteAnnotation(annotation.id)}
                  />
                );
              })
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
