import React from 'react';
import { AlertTriangle, Music, Repeat } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Measure, Note } from '../types';

const SheetMusic: React.FC = () => {
  const { measures, currentMeasureId, setCurrentMeasure, playbackTime } = useStore();

  const getNotePosition = (note: Note): number => {
    const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const baseOctave = 4;
    const semitones = noteOrder.indexOf(note.pitch) + (note.octave - baseOctave) * 12;
    return semitones;
  };

  const getDurationWidth = (duration: Note['duration']): number => {
    const widths: Record<string, number> = {
      'whole': 60,
      'half': 30,
      'quarter': 15,
      'eighth': 7.5,
      'sixteenth': 3.75,
    };
    return widths[duration] || 15;
  };

  const getProblemIcon = (problemType: Measure['problemType']) => {
    switch (problemType) {
      case 'chord-mismatch':
        return <AlertTriangle size={14} className="text-jazz-gold-500" />;
      case 'wrong-accidental':
        return <Music size={14} className="text-jazz-blue-500" />;
      case 'repetitive':
        return <Repeat size={14} className="text-jazz-burgundy-400" />;
      default:
        return null;
    }
  };

  const getProblemLabel = (problemType: Measure['problemType']) => {
    switch (problemType) {
      case 'chord-mismatch':
        return '和弦错位';
      case 'wrong-accidental':
        return '外音误判';
      case 'repetitive':
        return '片段重复';
      default:
        return '';
    }
  };

  const isMeasureActive = (measure: Measure) => {
    return playbackTime >= measure.startTime && playbackTime < measure.endTime;
  };

  const renderNotes = (measure: Measure) => {
    let xOffset = 10;
    
    return measure.notes.map((note, index) => {
      const semitonePos = getNotePosition(note);
      const yPos = 100 - (semitonePos * 2.5);
      const width = getDurationWidth(note.duration);
      const noteX = xOffset;
      xOffset += width + 5;

      const isAccidental = note.isAccidental;
      const isMisjudged = note.accidentalMisjudged;

      return (
        <g key={note.id || index}>
          {isAccidental && (
            <text
              x={noteX - 8}
              y={yPos + 4}
              fontSize="10"
              fill={isMisjudged ? '#de5471' : '#4A90D9'}
              fontWeight="bold"
            >
              {note.pitch.includes('#') ? '#' : '♮'}
            </text>
          )}
          
          <ellipse
            cx={noteX}
            cy={yPos}
            rx={6}
            ry={4}
            fill={isAccidental ? '#4A90D9' : '#e3e3e3'}
            stroke={isMisjudged ? '#de5471' : 'none'}
            strokeWidth={isMisjudged ? 2 : 0}
            transform={`rotate(-15, ${noteX}, ${yPos})`}
          />
          
          <line
            x1={noteX + 5}
            y1={yPos}
            x2={noteX + 5}
            y2={yPos - 20}
            stroke={isAccidental ? '#4A90D9' : '#e3e3e3'}
            strokeWidth="1.5"
          />
          
          {note.duration === 'eighth' && (
            <line
              x1={noteX + 5}
              y1={yPos - 20}
              x2={noteX + 12}
              y2={yPos - 18}
              stroke="#e3e3e3"
              strokeWidth="2"
            />
          )}
          {note.duration === 'sixteenth' && (
            <>
              <line
                x1={noteX + 5}
                y1={yPos - 20}
                x2={noteX + 12}
                y2={yPos - 18}
                stroke="#e3e3e3"
                strokeWidth="2"
              />
              <line
                x1={noteX + 5}
                y1={yPos - 16}
                x2={noteX + 12}
                y2={yPos - 14}
                stroke="#e3e3e3"
                strokeWidth="2"
              />
            </>
          )}
        </g>
      );
    });
  };

  return (
    <div className="bg-jazz-ink-800 rounded-lg border border-jazz-ink-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-jazz-ink-700 flex items-center justify-between">
        <h3 className="font-display text-lg text-jazz-ink-100">小节转写</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-jazz-gold-500/30 border border-jazz-gold-500"></span>
            和弦错位
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-jazz-blue-500/30 border border-jazz-blue-500"></span>
            外音误判
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-jazz-burgundy-500/30 border border-jazz-burgundy-500"></span>
            片段重复
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto max-h-[500px] scrollbar-thin">
        {measures.map((measure) => (
          <div
            key={measure.id}
            onClick={() => setCurrentMeasure(currentMeasureId === measure.id ? null : measure.id)}
            className={`
              rounded-lg p-3 cursor-pointer transition-all duration-200
              ${currentMeasureId === measure.id ? 'ring-2 ring-jazz-burgundy-500 bg-jazz-ink-700' : 'bg-jazz-ink-700/50 hover:bg-jazz-ink-700'}
              ${isMeasureActive(measure) ? 'border-l-4 border-jazz-gold-500' : ''}
              ${measure.problemType === 'chord-mismatch' ? 'border border-jazz-gold-500/50 bg-jazz-gold-500/5' : ''}
              ${measure.problemType === 'wrong-accidental' ? 'border border-jazz-blue-500/50 bg-jazz-blue-500/5' : ''}
              ${measure.problemType === 'repetitive' ? 'border border-jazz-burgundy-500/50 bg-jazz-burgundy-500/5' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-jazz-ink-400">m{measure.measureNumber}</span>
                {measure.problemType && (
                  <span className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                    ${measure.problemType === 'chord-mismatch' ? 'bg-jazz-gold-500/20 text-jazz-gold-400' : ''}
                    ${measure.problemType === 'wrong-accidental' ? 'bg-jazz-blue-500/20 text-jazz-blue-400' : ''}
                    ${measure.problemType === 'repetitive' ? 'bg-jazz-burgundy-500/20 text-jazz-burgundy-400' : ''}
                  `}>
                    {getProblemIcon(measure.problemType)}
                    {getProblemLabel(measure.problemType)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {measure.expectedChord && (
                  <span className="text-xs text-jazz-ink-500 line-through">{measure.chord}</span>
                )}
                <span className="font-mono text-lg font-bold text-jazz-gold-500">
                  {measure.expectedChord || measure.chord}
                </span>
              </div>
            </div>
            
            <div className="bg-jazz-ink-800 rounded p-2">
              <svg width="100%" height="120" viewBox="0 0 300 120">
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="10"
                    y1={30 + i * 15}
                    x2="290"
                    y2={30 + i * 15}
                    stroke="#515151"
                    strokeWidth="1"
                  />
                ))}
                
                <line x1="10" y1="30" x2="10" y2="90" stroke="#818181" strokeWidth="2" />
                <line x1="290" y1="30" x2="290" y2="90" stroke="#818181" strokeWidth="1" />
                
                <text x="15" y="70" fontSize="24" fill="#e3e3e3" fontFamily="serif">𝄞</text>
                
                <g transform="translate(35, 0)">
                  {renderNotes(measure)}
                </g>
              </svg>
            </div>
            
            {measure.problemExplanation && currentMeasureId === measure.id && (
              <div className="mt-3 p-3 bg-jazz-ink-900/50 rounded border border-jazz-ink-600">
                <p className="text-sm text-jazz-ink-300 leading-relaxed">
                  {measure.problemExplanation}
                </p>
              </div>
            )}
            
            <div className="mt-2 text-xs text-jazz-ink-500 font-mono">
              {measure.startTime.toFixed(1)}s - {measure.endTime.toFixed(1)}s
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SheetMusic;
