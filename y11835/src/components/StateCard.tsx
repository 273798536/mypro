export default function StateCard({
  state,
  isSelected,
  onClick,
}: {
  state: import('@/types/quantum').QuantumState;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tagColor = state.importTag === '先到' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300';

  return (
    <button
      onClick={onClick}
      className={`
        relative group rounded-xl p-4 w-full text-left transition-all duration-300
        backdrop-blur-md border
        ${isSelected
          ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_24px_rgba(0,212,255,0.3)] scale-[1.03]'
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 hover:shadow-[0_0_16px_rgba(0,212,255,0.15)]'
        }
      `}
    >
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${tagColor}`}
      >
        {state.importTag} #{state.importOrder}
      </span>
      <div className="text-2xl font-bold text-white font-orbitron tracking-wider">
        {state.label}
      </div>
      <div className="mt-1 text-xs text-slate-400">
        振幅: [{state.amplitudes.map((a) => `${a.re.toFixed(2)}${a.im >= 0 ? '+' : ''}${a.im.toFixed(2)}i`).join(', ')}]
      </div>
      <div className="mt-1 text-xs text-slate-500">
        表达基: {state.basis}
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
      )}
    </button>
  );
}
