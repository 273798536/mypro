import { Play, Pause, RotateCcw } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
export function GameControls() {
 const { status, startGame, pauseGame, resumeGame, restartGame, currentTrack } = useGameStore();
 return (<div className="flex items-center justify-center gap-6 p-4 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50">
 <div className="flex items-center gap-4">
 <div className="text-center">
 <div className="text-xs text-slate-400 uppercase tracking-wider">曲目</div>
 <div className="text-white font-semibold">{currentTrack.name}</div>
 </div>
 <div className="w-px h-10 bg-slate-600"/>
 <div className="text-center">
 <div className="text-xs text-slate-400 uppercase tracking-wider">BPM</div>
 <div className="text-white font-semibold">{currentTrack.bpm}</div>
 </div>
 <div className="w-px h-10 bg-slate-600"/>
 <div className="text-center">
 <div className="text-xs text-slate-400 uppercase tracking-wider">拍号</div>
 <div className="text-white font-semibold">{currentTrack.timeSignature.join('/')}</div>
 </div>
 </div>

 <div className="w-px h-12 bg-slate-600"/>

 <div className="flex items-center gap-3">
 {status === 'idle' && (<button onClick={startGame} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95">
 <Play className="w-5 h-5" fill="currentColor"/>
 开始练习
 </button>)}

 {status === 'playing' && (<button onClick={pauseGame} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all duration-300 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95">
 <Pause className="w-5 h-5" fill="currentColor"/>
 暂停
 </button>)}

 {status === 'paused' && (<>
 <button onClick={resumeGame} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95">
 <Play className="w-5 h-5" fill="currentColor"/>
 继续
 </button>
 <button onClick={restartGame} className="flex items-center gap-2 px-4 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all duration-300 hover:scale-105 active:scale-95">
 <RotateCcw className="w-5 h-5"/>
 重开
 </button>
 </>)}

 {status === 'finished' && (<button onClick={restartGame} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95">
 <RotateCcw className="w-5 h-5"/>
 再来一次
 </button>)}
 </div>
 </div>);
}

