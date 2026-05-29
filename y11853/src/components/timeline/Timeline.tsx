import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Calendar } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { Button } from '../ui/Button';

export function Timeline() {
  const isPlaying = useUIStore(s => s.isPlaying);
  const currentTimeIndex = useUIStore(s => s.currentTimeIndex);
  const setCurrentTimeIndex = useUIStore(s => s.setCurrentTimeIndex);
  const togglePlay = useUIStore(s => s.togglePlay);
  const firstRunResult = useDataStore(s => s.firstRunResult);
  
  const hasData = firstRunResult && firstRunResult.assets.length > 0;
  
  const formatDate = (index: number) => {
    const now = new Date();
    now.setMonth(now.getMonth() - (23 - index));
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTimeIndex(parseInt(e.target.value));
  };
  
  const handleSkipBack = () => {
    setCurrentTimeIndex(Math.max(0, currentTimeIndex - 1));
  };
  
  const handleSkipForward = () => {
    setCurrentTimeIndex(Math.min(23, currentTimeIndex + 1));
  };
  
  const handleReset = () => {
    setCurrentTimeIndex(0);
    useUIStore.getState().setIsPlaying(false);
  };
  
  if (!hasData) return null;
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="absolute bottom-4 left-80 right-80 z-10"
    >
      <div className="backdrop-blur-xl bg-slate-900/85 border border-slate-600/30 rounded-xl px-6 py-4 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="p-2"
            >
              <SkipBack size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipBack}
              className="p-2"
            >
              <SkipBack size={16} className="-scale-x-100" />
            </Button>
            <Button
              variant={isPlaying ? 'primary' : 'secondary'}
              size="sm"
              onClick={togglePlay}
              className="p-3 rounded-full"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipForward}
              className="p-2"
            >
              <SkipForward size={16} />
            </Button>
          </div>
          
          <div className="flex-1">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="23"
                step="1"
                value={currentTimeIndex}
                onChange={handleSliderChange}
                className="w-full h-2 bg-slate-700/80 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    #00D4AA 0%, 
                    #0099FF ${(currentTimeIndex / 23) * 100}%, 
                    #334155 ${(currentTimeIndex / 23) * 100}%, 
                    #334155 100%
                  )`,
                }}
              />
            </div>
            
            <div className="flex justify-between mt-1">
              {Array.from({ length: 5 }, (_, i) => {
                const index = i * 5;
                return (
                  <span
                    key={index}
                    className={`text-xs ${
                      Math.abs(currentTimeIndex - index) < 3
                        ? 'text-emerald-400 font-medium'
                        : 'text-slate-500'
                    }`}
                  >
                    {formatDate(index)}
                  </span>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-slate-300 font-mono">
              {formatDate(currentTimeIndex)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
