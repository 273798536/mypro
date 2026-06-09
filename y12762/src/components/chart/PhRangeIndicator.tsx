import { cn } from '@/lib/utils';

interface PhRangeIndicatorProps {
  value: number;
}

const PH_MIN = 0;
const PH_MAX = 14;
const NORMAL_MIN = 2;
const NORMAL_MAX = 12;

function getPhColor(value: number): string {
  if (value < 2) return '#dc2626';
  if (value < 4) return '#ea580c';
  if (value < 6) return '#ca8a04';
  if (value < 8) return '#16a34a';
  if (value < 10) return '#0891b2';
  if (value < 12) return '#4f46e5';
  return '#7c3aed';
}

function isNormal(value: number): boolean {
  return value >= NORMAL_MIN && value <= NORMAL_MAX;
}

export default function PhRangeIndicator({ value }: PhRangeIndicatorProps) {
  const clampedValue = Math.max(PH_MIN, Math.min(PH_MAX, value));
  const positionPercent = (clampedValue / PH_MAX) * 100;
  const normalStartPercent = (NORMAL_MIN / PH_MAX) * 100;
  const normalWidthPercent = ((NORMAL_MAX - NORMAL_MIN) / PH_MAX) * 100;
  const color = getPhColor(clampedValue);
  const normal = isNormal(clampedValue);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#1e3a5f]">pH值指示</span>
        <span
          className={cn(
            'text-sm font-bold px-2 py-0.5 rounded',
            normal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}
        >
          {clampedValue.toFixed(1)} {normal ? '正常' : '异常'}
        </span>
      </div>
      <div className="relative h-8 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          {Array.from({ length: PH_MAX + 1 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-white/30 last:border-r-0"
              style={{ backgroundColor: getPhColor(i) }}
            />
          ))}
        </div>
        <div
          className="absolute top-0 h-full bg-green-500/30 border-x-2 border-green-600"
          style={{
            left: `${normalStartPercent}%`,
            width: `${normalWidthPercent}%`,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300"
          style={{ left: `${positionPercent}%` }}
        >
          <div className="relative">
            <div
              className="w-5 h-5 rounded-full border-3 border-white shadow-lg"
              style={{ backgroundColor: color, borderWidth: 3 }}
            />
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `8px solid ${color}`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        {Array.from({ length: 8 }).map((_, i) => {
          const tick = Math.round((i * PH_MAX) / 7);
          return (
            <span key={i} className="text-xs text-gray-500">
              {tick}
            </span>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>酸性</span>
        <span>中性</span>
        <span>碱性</span>
      </div>
    </div>
  );
}
