import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useLogStore } from '../../store/useLogStore';
import { useSceneStore } from '../../store/useSceneStore';

export function Timeline() {
  const { logEntries } = useLogStore();
  const { currentStep, isPlaying, setCurrentStep, setIsPlaying } = useSceneStore();
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && logEntries.length > 0) {
      const animate = () => {
        setCurrentStep((prev) => {
          if (prev >= logEntries.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, logEntries.length, setCurrentStep, setIsPlaying]);

  const handlePlayPause = () => {
    if (currentStep >= logEntries.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentStep(parseInt(e.target.value));
    setIsPlaying(false);
  };

  return (
    <div className="glass-panel h-20 px-6 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          className="p-2 rounded hover:bg-primary-800/50 transition-all"
        >
          <SkipBack size={18} />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-3 bg-primary-600 rounded-full hover:bg-primary-500 transition-all"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(currentStep + 1, logEntries.length - 1))}
          className="p-2 rounded hover:bg-primary-800/50 transition-all"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={Math.max(0, logEntries.length - 1)}
            value={currentStep}
            onChange={handleStepChange}
            className="flex-1 h-2 bg-primary-900 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #00D4FF ${(currentStep / Math.max(1, logEntries.length - 1)) * 100}%, #1e3a5f ${(currentStep / Math.max(1, logEntries.length - 1)) * 100}%)`
            }}
          />
          <span className="text-xs font-mono text-primary-300 min-w-[80px] text-right">
            Step {currentStep} / {Math.max(0, logEntries.length - 1)}
          </span>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>开始</span>
          <span>训练进度</span>
          <span>结束</span>
        </div>
      </div>
    </div>
  );
}
