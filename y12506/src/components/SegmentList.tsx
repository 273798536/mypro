import React from 'react';
import { AudioSegment, ValidationResult } from '../types';

interface SegmentListProps {
  segments: AudioSegment[];
  activeSegmentId: string | null;
  validationResults: Map<string, ValidationResult>;
  onSelectSegment: (segmentId: string) => void;
  onUpload: () => void;
}

const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  activeSegmentId,
  validationResults,
  onSelectSegment,
  onUpload
}) => {
  return (
    <div className="bg-spectrum-mid/90 backdrop-blur-sm rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          音频片段
        </h3>
        <button
          onClick={onUpload}
          className="p-1.5 bg-purple-600 hover:bg-purple-500 rounded text-white transition-colors"
          title="上传音频"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {segments.map((segment) => {
          const validation = validationResults.get(segment.id);
          return (
            <div
              key={segment.id}
              onClick={() => onSelectSegment(segment.id)}
              className={`p-3 rounded cursor-pointer transition-all ${
                activeSegmentId === segment.id
                  ? 'bg-purple-600/30 border border-purple-500'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  validation?.isRejected ? 'bg-red-500' : 
                  validation ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <span className="text-white text-sm font-medium truncate flex-1">
                  {segment.name}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                <span>{segment.frames.length} 帧</span>
                <span>{segment.duration.toFixed(1)}s</span>
                {validation && (
                  <span className={validation.isRejected ? 'text-red-400' : 'text-green-400'}>
                    {validation.validFrames}/{validation.totalFrames} 有效
                  </span>
                )}
              </div>
              {segment.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {segment.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SegmentList;
