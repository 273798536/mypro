import React from 'react';
import { DollarSign, Zap, Users } from 'lucide-react';
import { formatNumber } from '@/utils/carbonCalculator';
interface ResourceGaugeProps {
 label: string;
 current: number;
 initial: number;
 icon: 'budget' | 'electricity' | 'transport';
 unit?: string;
}
const iconMap = {
 budget: DollarSign,
 electricity: Zap,
 transport: Users,
};
const colorMap = {
 budget: {
 low: '#E2703A',
 medium: '#f0ad7d',
 high: '#93B1A6',
 },
 electricity: {
 low: '#E2703A',
 medium: '#f0ad7d',
 high: '#93B1A6',
 },
 transport: {
 low: '#E2703A',
 medium: '#f0ad7d',
 high: '#93B1A6',
 },
};
export const ResourceGauge: React.FC<ResourceGaugeProps> = ({ label, current, initial, icon, unit = '', }) => {
 const Icon = iconMap[icon];
 const percentage = Math.max(0, Math.min(100, (current / initial) * 100));
 const isLow = percentage < 20;
 const isMedium = percentage >= 20 && percentage < 50;
 const color = isLow
 ? colorMap[icon].low
 : isMedium
 ? colorMap[icon].medium
 : colorMap[icon].high;
 const strokeDasharray = 283;
 const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;
 return (<div className={`glass rounded-2xl p-4 transition-all duration-300 ${isLow ? 'animate-shake anomaly-pulse' : ''}`}>
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 rounded-lg glass-light">
 <Icon className="w-5 h-5" style={{ color }}/>
 </div>
 <div>
 <div className="text-sm text-carbon-300">{label}</div>
 <div className="font-mono text-lg font-semibold number-roll" style={{ color }}>
 {formatNumber(current)}
 <span className="text-xs text-carbon-400 ml-1">{unit}</span>
 </div>
 </div>
 </div>
 <div className="relative w-full h-16">
 <svg viewBox="0 0 200 100" className="w-full h-full">
 <defs>
 <linearGradient id={`gradient-${icon}`} x1="0%" y1="0%" x2="100%" y2="0%">
 <stop offset="0%" stopColor={color} stopOpacity="0.8"/>
 <stop offset="100%" stopColor={color} stopOpacity="0.4"/>
 </linearGradient>
 </defs>
 <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="rgba(145, 177, 166, 0.1)" strokeWidth="12" strokeLinecap="round"/>
 <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke={`url(#gradient-${icon})`} strokeWidth="12" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 0.5s ease' }}/>
 <text x="100" y="70" textAnchor="middle" className="font-mono fill-carbon-100" fontSize="20" fontWeight="bold">
 {Math.round(percentage)}%
 </text>
 </svg>
 </div>
 <div className="text-xs text-carbon-400 text-center">
 初始: {formatNumber(initial)}{unit}
 </div>
 </div>);
};
