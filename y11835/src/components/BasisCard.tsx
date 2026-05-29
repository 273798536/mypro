export default function BasisCard({
  basis,
  isSelected,
  onClick,
}: {
  basis: import('@/types/quantum').MeasurementBasis;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tagColor = basis.importTag === '先到' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300';

  return (
    <button
      onClick={onClick}
      className={`
        relative group rounded-xl p-3 text-center transition-all duration-300
        backdrop-blur-md border min-w-[100px]
        ${isSelected
          ? 'border-opacity-80 shadow-[0_0_20px_rgba(0,255,136,0.3)] scale-[1.05]'
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
        }
      `}
      style={{
        borderColor: isSelected ? basis.color : undefined,
        background: isSelected ? `${basis.color}15` : undefined,
      }}
    >
      <span
        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-1 ${tagColor}`}
      >
        {basis.importTag} #{basis.importOrder}
      </span>
      <div className="text-lg font-bold text-white font-orbitron">{basis.label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{basis.symbol}</div>
      <div className="text-[10px] text-slate-500 mt-1">
        {basis.eigenvectors.map((ev) => ev.label).join(' · ')}
      </div>
      {isSelected && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
          style={{ background: basis.color }}
        />
      )}
    </button>
  );
}
