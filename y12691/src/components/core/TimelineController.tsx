import { useEffect, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { formatDate } from '../../utils/helpers';

export function TimelineController() {
  const {
    currentTime, startTime, endTime, isPlaying, playbackSpeed,
    setCurrentTime, togglePlay, syncIssues,
  } = useAppStore();

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const timePerMs = (endTime - startTime) / (60 * 1000);
      const increment = delta * playbackSpeed * timePerMs;

      const newTime = currentTime + increment;
      if (newTime >= endTime) {
        setCurrentTime(endTime);
        togglePlay();
      } else {
        setCurrentTime(newTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const progress = ((currentTime - startTime) / (endTime - startTime)) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const newTime = startTime + (val / 100) * (endTime - startTime);
    setCurrentTime(newTime);
  };

  const syncIssueOnTimeline = syncIssues.filter(issue => {
    const earliest = Math.min(...issue.affectedMaterials.map(m => m.timestamp.getTime()));
    return earliest >= startTime && earliest <= endTime;
  });

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-ice-blue" />
          <h3 className="font-display text-lg text-gradient">时间轴</h3>
        </div>
        <div className="text-sm text-text-secondary font-mono">
          {formatDate(new Date(currentTime))}
        </div>
      </div>

      <div className="relative">
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ice-blue via-ice-light to-info rounded-full transition-all duration-100 animate-gradient-shift bg-300%"
            style={{ width: `${progress}%` }}
          />
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {syncIssueOnTimeline.map((issue, idx) => {
          const issueTime = Math.min(...issue.affectedMaterials.map(m => m.timestamp.getTime()));
          const pos = ((issueTime - startTime) / (endTime - startTime)) * 100;
          return (
            <div
              key={issue.id}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${pos}%` }}
              title={issue.description}
            >
              <div className={`w-3 h-3 rounded-full border-2 border-bg-primary animate-pulse ${
                issue.severity === 'error' ? 'bg-danger' : issue.severity === 'warning' ? 'bg-warning' : 'bg-info'
              }`} />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted font-mono">
        <span>{formatDate(new Date(startTime))}</span>
        <span>{formatDate(new Date(endTime))}</span>
      </div>

      {syncIssues.length > 0 && (
        <div className="pt-2 border-t border-ice-blue/20 space-y-2">
          <div className="text-xs text-text-secondary flex items-center gap-1">
            <AlertTriangle size={14} className="text-warning" />
            时间轴同步问题 ({syncIssues.length})
          </div>
          <div className="space-y-1">
            {syncIssues.slice(0, 2).map(issue => (
              <div
                key={issue.id}
                className={`p-2 rounded-lg text-xs flex items-start gap-2 ${
                  issue.severity === 'error'
                    ? 'bg-danger/10 border border-danger/30'
                    : issue.severity === 'warning'
                    ? 'bg-warning/10 border border-warning/30'
                    : 'bg-info/10 border border-info/30'
                }`}
              >
                {issue.severity === 'error' ? (
                  <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
                ) : issue.severity === 'warning' ? (
                  <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 size={14} className="text-info mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-text-primary truncate">{issue.description}</div>
                  <div className="text-text-muted mt-0.5">
                    影响: {issue.affectedMaterials.map(m => m.name).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
