type Props = {
  type: 'before' | 'after';
  waterLevel?: number;
};

export function SectionThumbnail({ type, waterLevel = 22.5 }: Props) {
  const wl = waterLevel;
  const hasSection = type === 'after';

  return (
    <div className="relative h-28 w-full overflow-hidden bg-slate-950">
      <svg viewBox="0 0 160 100" className="h-full w-full">
        {/* 背景渐变 */}
        <defs>
          <linearGradient id={`water-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00aaff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#004488" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`concrete-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a6470" />
            <stop offset="100%" stopColor="#3a4250" />
          </linearGradient>
        </defs>

        {/* 船闸左右墙 */}
        <rect x="10" y="10" width="8" height="80" fill={`url(#concrete-${type})`} />
        <rect x="142" y="10" width="8" height="80" fill={`url(#concrete-${type})`} />

        {/* 底部 */}
        <rect x="18" y="82" width="124" height="8" fill={`url(#concrete-${type})`} />

        {/* 水体 */}
        {!hasSection && (
          <rect x="18" y={82 - (wl / 30) * 70} width="124" height={(wl / 30) * 70} fill={`url(#water-${type})`} opacity="0.7" />
        )}

        {/* 剖切后显示内部结构 */}
        {hasSection && (
          <>
            <rect x="18" y={82 - (wl / 30) * 70} width="55" height={(wl / 30) * 70} fill={`url(#water-${type})`} opacity="0.7" />
            {/* 剖切平面 */}
            <line x1="75" y1="10" x2="75" y2="82" stroke="#339af0" strokeWidth="2" strokeDasharray="4 2" />
            {/* 剖切后露出的阀门 */}
            <circle cx="45" cy="70" r="4" fill="#ff6b6b" opacity="0.9" />
            <circle cx="105" cy="70" r="4" fill="#51cf66" opacity="0.9" />
            {/* 水位差指示 */}
            <line x1="78" y1={82 - (wl / 30) * 70} x2="78" y2={82 - (wl / 30) * 70 + 10} stroke="#ff3355" strokeWidth="1.5" />
            <text x="82" y={82 - (wl / 30) * 70 + 5} fill="#ff3355" fontSize="7" fontWeight="bold">
              0.6m
            </text>
          </>
        )}

        {/* 设备点 */}
        <circle cx="25" cy="30" r="2" fill={hasSection ? '#00ff88' : '#00ff88'} opacity="0.9" />
        <circle cx="135" cy="40" r="2" fill={hasSection ? '#00ff88' : '#00ff88'} opacity="0.9" />
        <circle cx="80" cy="25" r="2.5" fill={hasSection ? '#ff3355' : '#ff3355'} opacity="1">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>

        {/* 剖切标签 */}
        {hasSection && (
          <g>
            <rect x="55" y="3" width="50" height="12" rx="2" fill="#339af033" stroke="#339af0" strokeWidth="0.5" />
            <text x="80" y="12" textAnchor="middle" fill="#51cf66" fontSize="7" fontWeight="bold">
              剖切剖面
            </text>
          </g>
        )}

        {/* 水位线 */}
        <line x1="18" y1={82 - (wl / 30) * 70} x2="142" y2={82 - (wl / 30) * 70} stroke="#00ffff" strokeWidth="0.8" strokeDasharray="2 1" opacity="0.6" />
      </svg>
    </div>
  );
}
