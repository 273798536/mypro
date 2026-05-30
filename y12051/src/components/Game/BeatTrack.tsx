import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Train } from './Train';
import { Track, Note, JudgmentResult } from '../../types';
import { formatTime } from '../../utils/rhythmUtils';

interface BeatTrackProps {
  track: Track;
  currentTime: number;
  judgments: JudgmentResult[];
  showRemarks: boolean;
}

const TRACK_COLORS = [
  'bg-gradient-to-br from-blue-400 to-blue-600',
  'bg-gradient-to-br from-green-400 to-green-600',
  'bg-gradient-to-br from-purple-400 to-purple-600',
  'bg-gradient-to-br from-pink-400 to-pink-600'
];

const TRACK_BG_COLORS = [
  'bg-blue-50',
  'bg-green-50',
  'bg-purple-50',
  'bg-pink-50'
];

export const BeatTrack: React.FC<BeatTrackProps> = ({ 
  track, 
  currentTime, 
  judgments,
  showRemarks 
}) => {
  const JUDGMENT_LINE_X = 200;
  const VISIBLE_WINDOW = 3000;
  const PIXELS_PER_MS = 0.3;

  const visibleNotes = useMemo(() => {
    return track.notes.filter(note => {
      const noteX = JUDGMENT_LINE_X + (note.time - currentTime) * PIXELS_PER_MS;
      return noteX > -100 && noteX < 1200;
    });
  }, [track.notes, currentTime]);

  const getNotePosition = (note: Note) => {
    return JUDGMENT_LINE_X + (note.time - currentTime) * PIXELS_PER_MS;
  };

  const recentJudgments = useMemo(() => {
    return judgments.slice(-5);
  }, [judgments]);

  return (
    <div className="relative w-full h-80 bg-gray-900 rounded-xl overflow-hidden">
      <div className="absolute top-2 left-2 z-10">
        <span className="text-white text-sm font-mono bg-black/50 px-2 py-1 rounded">
          {formatTime(currentTime)}
        </span>
      </div>

      {[1, 2, 3, 4].map(trackNum => (
        <div
          key={trackNum}
          className={`absolute h-20 ${TRACK_BG_COLORS[trackNum - 1]} border-b border-gray-300`}
          style={{ top: (trackNum - 1) * 80, left: 0, right: 0 }}
        >
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${TRACK_COLORS[trackNum - 1]}`}>
              {trackNum}
            </span>
          </div>
          
          <div className="absolute left-12 right-0 top-1/2 transform -translate-y-1/2 h-2 bg-gray-400 rounded">
            <div className="absolute inset-0 flex justify-around">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-1 h-2 bg-gray-500" />
              ))}
            </div>
          </div>
        </div>
      ))}

      <div
        className="absolute top-0 bottom-0 w-1 bg-red-500 z-20"
        style={{ left: JUDGMENT_LINE_X }}
      >
        <div className="absolute -left-3 top-0 text-red-500 text-lg">▼</div>
        <div className="absolute -left-3 bottom-0 text-red-500 text-lg rotate-180">▼</div>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {visibleNotes.map(note => (
          <Train
            key={note.id}
            note={note}
            position={getNotePosition(note)}
            showRemarks={showRemarks}
            trackColors={TRACK_COLORS}
          />
        ))}
      </div>

      <div className="absolute top-2 right-2 z-20 space-y-1">
        <AnimatePresence>
          {recentJudgments.map((judgment, index) => (
            <motion.div
              key={judgment.noteId}
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`text-xs font-bold px-2 py-1 rounded ${
                judgment.judgment === 'perfect' ? 'bg-green-500 text-white' :
                judgment.judgment === 'great' ? 'bg-blue-500 text-white' :
                judgment.judgment === 'good' ? 'bg-yellow-500 text-white' :
                'bg-red-500 text-white'
              }`}
              style={{ marginTop: index * 2 }}
            >
              <span className="uppercase">{judgment.judgment}</span>
              {judgment.timingError !== 0 && (
                <span className="ml-1 opacity-80">
                  ({judgment.timingError > 0 ? '+' : ''}{judgment.timingError}ms)
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
