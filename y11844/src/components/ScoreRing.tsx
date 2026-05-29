import React from 'react';
interface ScoreRingProps {
 score: number;
 label: string;
 color: string;
 size?: number;
 strokeWidth?: number;
}
export const ScoreRing: React.FC<ScoreRingProps> = ({ score, label, color, size = 140, strokeWidth = 12, }) => {
 const radius = (size - strokeWidth) / 2;
 const circumference = 2 * Math.PI * radius;
 const offset = circumference - (score / 100) * circumference;
 const getScoreColor = () => {
 if (score >= 80)
 return '#318261';
 if (score >= 60)
 return '#93B1A6';
 if (score >= 40)
 return '#E2703A';
 return '#d65a22';
 };
 const displayColor = color || getScoreColor();
 return (<div className="relative flex flex-col items-center">
 <svg width={size} height={size} className="-rotate-90">
 <defs>
 <linearGradient id={`score-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor={displayColor} stopOpacity="1"/>
 <stop offset="100%" stopColor={displayColor} stopOpacity="0.6"/>
 </linearGradient>
 </defs>
 <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(145, 177, 166, 0.1)" strokeWidth={strokeWidth}/>
 <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`url(#score-gradient-${label})`} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease-out' }}/>
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="font-display text-3xl font-bold text-carbon-50 number-roll">
 {score}
 </span>
 <span className="text-xs text-carbon-400 mt-1">{label}</span>
 </div>
 </div>);
};
