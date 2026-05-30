import { useAttitudeStore } from '../../store/useAttitudeStore';
import { KeyframeMarker } from '../../types';

interface KeyframeMarkersProps {
  duration: number;
  onMarkerClick: (frameIndex: number) => void;
}

export const KeyframeMarkers = ({ duration, onMarkerClick }: KeyframeMarkersProps) => {
  const { keyframeMarkers, playbackState } = useAttitudeStore();

  if (keyframeMarkers.length === 0) return null;

  const getMarkerColor = (type: KeyframeMarker['type']) => {
    switch (type) {
      case 'gimbal_lock':
        return '#ff4d4f';
      case 'warning':
        return '#faad14';
      case 'note':
        return '#1890ff';
      default:
        return '#1890ff';
    }
  };

  const getMarkerTitle = (type: KeyframeMarker['type']) => {
    switch (type) {
      case 'gimbal_lock':
        return '万向节锁';
      case 'warning':
        return '警告';
      case 'note':
        return '备注';
      default:
        return '标记';
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
      {keyframeMarkers.map((marker, index) => {
        const position = (marker.frameIndex / Math.max(playbackState.totalFrames - 1, 1)) * 100;
        const isActive = marker.frameIndex === playbackState.currentFrame;
        const color = getMarkerColor(marker.type);

        return (
          <div
            key={`${marker.frameIndex}-${marker.type}-${index}`}
            className="absolute top-0 bottom-0 pointer-events-auto cursor-pointer group"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            onClick={() => onMarkerClick(marker.frameIndex)}
            title={`${getMarkerTitle(marker.type)}: ${marker.description}`}
          >
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all ${
                isActive ? 'scale-150' : 'group-hover:scale-125'
              }`}
              style={{
                backgroundColor: color,
                boxShadow: isActive ? `0 0 10px ${color}` : `0 0 5px ${color}80`,
              }}
            />
            {isActive && (
              <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap z-20"
                style={{
                  backgroundColor: color,
                  color: '#ffffff',
                }}
              >
                {getMarkerTitle(marker.type)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
