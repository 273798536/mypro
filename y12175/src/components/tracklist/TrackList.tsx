import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Edit2, Check, X, Star, Mic, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatDuration } from '@/types';
import type { Track } from '@/types';
import { cn } from '@/utils/helpers';

interface TrackRowProps {
  track: Track;
  index: number;
  hasVersionError: boolean;
  isHighlighted: boolean;
  onHighlight: () => void;
}

function TrackRow({ track, index, hasVersionError, isHighlighted, onHighlight }: TrackRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDuration, setEditDuration] = useState('');
  const { selectVersion, updateTrack, highlightTrackId } = useStore();

  const selectedVersion = track.versions.find(v => v.id === track.selectedVersionId);
  const defaultVersion = track.versions.find(v => v.isDefault);

  const handleSaveEdit = () => {
    const newDuration = parseInt(editDuration);
    if (!isNaN(newDuration) && newDuration > 0) {
      const updatedVersions = track.versions.map(v =>
        v.id === track.selectedVersionId ? { ...v, duration: newDuration } : v
      );
      updateTrack(track.id, { versions: updatedVersions });
    }
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditDuration(selectedVersion?.duration.toString() || '0');
    setIsEditing(true);
  };

  return (
    <motion.div
      layout
      className={cn(
        'bg-indigo-900/30 rounded-lg border transition-all duration-300',
        isHighlighted
          ? 'border-amber-450 bg-amber-450/10 animate-highlight-pulse'
          : 'border-indigo-800 hover:border-indigo-700'
      )}
      onAnimationComplete={() => {
        if (isHighlighted) {
          setTimeout(() => useStore.getState().highlightTrack(null), 3000);
        }
      }}
    >
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="w-8 h-8 flex items-center justify-center bg-indigo-800 rounded-full text-sm font-mono text-amber-450">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{track.name}</span>
            {track.isEncore && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full">
                <Mic className="w-3 h-3" />
                返场
              </span>
            )}
            {hasVersionError && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                <AlertCircle className="w-3 h-3" />
                版本差异
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
            <span className="font-mono">{selectedVersion?.name}</span>
            <span>·</span>
            <span className="font-mono">{formatDuration(selectedVersion?.duration || 0)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">换场</div>
            <div className="font-mono">
              {track.transitionTime !== null && track.transitionTime !== undefined
                ? `${track.transitionTime}秒`
                : <span className="text-amber-400">默认</span>
              }
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onHighlight();
            }}
            className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-indigo-800 pt-4">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">版本选择</h4>
                <div className="flex flex-wrap gap-2">
                  {track.versions.map(version => (
                    <button
                      key={version.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectVersion(track.id, version.id);
                      }}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2',
                        version.id === track.selectedVersionId
                          ? 'bg-amber-450 text-indigo-950 font-medium'
                          : 'bg-indigo-800 hover:bg-indigo-700'
                      )}
                    >
                      {version.isDefault && <Star className="w-3 h-3" />}
                      <span>{version.name}</span>
                      <span className="font-mono opacity-75">
                        {formatDuration(version.duration)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={track.isEncore}
                      onChange={(e) => {
                        updateTrack(track.id, { isEncore: e.target.checked });
                      }}
                      className="w-4 h-4 rounded border-indigo-600 bg-indigo-800 text-amber-450 focus:ring-amber-450"
                    />
                    <span className="text-sm">标记为返场曲目</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">换场时间:</span>
                    <input
                      type="number"
                      value={track.transitionTime ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : null;
                        updateTrack(track.id, { transitionTime: val });
                      }}
                      placeholder="默认"
                      className="w-20 px-2 py-1 bg-indigo-800 border border-indigo-700 rounded text-sm font-mono focus:outline-none focus:border-amber-450"
                    />
                    <span className="text-sm text-gray-400">秒</span>
                  </div>
                </div>

                {!isEditing ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit();
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-sm transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    手动修正时长
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="w-24 px-2 py-1 bg-indigo-800 border border-amber-450 rounded text-sm font-mono focus:outline-none"
                      autoFocus
                    />
                    <span className="text-sm text-gray-400">秒</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit();
                      }}
                      className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(false);
                      }}
                      className="p-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {defaultVersion && selectedVersion && selectedVersion.id !== defaultVersion.id && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400">
                    <span className="font-medium">提示:</span> 当前版本「{selectedVersion.name}」
                    与默认版本「{defaultVersion.name}」时长差异
                    {Math.round(Math.abs(selectedVersion.duration - defaultVersion.duration) / defaultVersion.duration * 100)}%
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TrackList() {
  const { tracks, currentValidation, highlightTrack, highlightTrackId } = useStore();
  const sortedTracks = [...tracks].sort((a, b) => a.order - b.order);

  const versionErrorTracks = new Set(
    currentValidation?.errors
      .filter(e => e.type === 'VERSION_MISMATCH' && e.trackId)
      .map(e => e.trackId) || []
  );

  if (tracks.length === 0) {
    return (
      <div className="bg-indigo-900/30 rounded-xl p-8 border border-indigo-800 text-center text-gray-400">
        <p>暂无曲目，请导入曲目清单</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg">曲目清单 ({tracks.length}首)</h3>
        <div className="text-sm text-gray-400">
          正场 {tracks.filter(t => !t.isEncore).length}首 ·
          返场 {tracks.filter(t => t.isEncore).length}首
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {sortedTracks.map((track, idx) => (
          <TrackRow
            key={track.id}
            track={track}
            index={idx}
            hasVersionError={versionErrorTracks.has(track.id)}
            isHighlighted={highlightTrackId === track.id}
            onHighlight={() => highlightTrack(track.id)}
          />
        ))}
      </div>
    </div>
  );
}
