import React from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Buoy, Sensor } from '@/types';
import { BUOY_STATUS_LABEL, SENSOR_TYPE_LABEL } from '@/types';
import { Activity, Thermometer, Droplets, Gauge, Waves, Wind, Clock } from 'lucide-react';

interface BuoyCardProps {
  buoy: Buoy;
  screenshotMode?: boolean;
}

const sensorIcons: Record<Sensor['type'], LucideIcon> = {
  temperature: Thermometer,
  salinity: Droplets,
  pressure: Gauge,
  wave: Waves,
  wind: Wind,
};

function getSensorProgress(sensor: Sensor): number {
  const { min, max } = sensor.threshold;
  const clamped = Math.max(min, Math.min(max, sensor.value));
  return ((clamped - min) / (max - min)) * 100;
}

const BuoyCard: React.FC<BuoyCardProps> = ({ buoy, screenshotMode = false }) => {
  const navigate = useNavigate();
  const isOutOfRange = buoy.status === 'out_of_range';

  const handleClick = () => {
    navigate(`/events/${buoy.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'nautical-card p-5 cursor-pointer relative overflow-hidden',
        !screenshotMode && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        isOutOfRange && !screenshotMode && 'animate-border-pulse ring-2 ring-coral-500/60'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('status-dot flex-shrink-0', `status-${buoy.status}`)} />
            <h3 className="font-display text-lg text-ocean-100 truncate">{buoy.name}</h3>
          </div>
          <p className="data-value text-ocean-400">{buoy.code}</p>
        </div>
        <span
          className={cn(
            'tag flex-shrink-0',
            buoy.status === 'normal' && 'tag-available',
            buoy.status === 'offline' && 'bg-ocean-500/20 text-ocean-300 border border-ocean-500/30',
            buoy.status === 'anomaly' && 'tag-recollect',
            buoy.status === 'out_of_range' && 'tag-recollect',
            buoy.status === 'pending' && 'tag-pending'
          )}
        >
          {BUOY_STATUS_LABEL[buoy.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-ocean-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-ocean-400 text-xs mb-1">
            <Activity className="w-3.5 h-3.5" strokeWidth={2} />
            <span>布放深度</span>
          </div>
          <p className="font-mono text-seafoam-300 text-base">{buoy.depth}<span className="text-xs text-ocean-400 ml-0.5">m</span></p>
        </div>
        <div className="bg-ocean-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-ocean-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" strokeWidth={2} />
            <span>最后在线</span>
          </div>
          <p className="font-mono text-ocean-200 text-xs leading-5">
            {dayjs(buoy.lastOnline).format('MM-DD HH:mm')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {buoy.sensors.map((sensor) => {
          const SensorIcon = sensorIcons[sensor.type];
          const progress = getSensorProgress(sensor);
          const isBad = sensor.isOutOfRange;

          return (
            <div key={sensor.id} className="flex items-center gap-2">
              <div className="w-14 flex items-center gap-1 flex-shrink-0">
                <SensorIcon
                  className={cn('w-3.5 h-3.5', isBad ? 'text-coral-400' : 'text-ocean-400')}
                  strokeWidth={2}
                />
                <span className={cn('text-xs', isBad ? 'text-coral-400' : 'text-ocean-400')}>
                  {SENSOR_TYPE_LABEL[sensor.type]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 bg-ocean-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isBad ? 'bg-coral-500' : 'bg-gradient-to-r from-seafoam-500 to-seafoam-300'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-right flex-shrink-0">
                <span className={cn('font-mono text-xs', isBad ? 'text-coral-400' : 'text-ocean-200')}>
                  {sensor.value.toFixed(1)}
                </span>
                <span className={cn('text-xs ml-0.5', isBad ? 'text-coral-500/70' : 'text-ocean-500')}>
                  /{sensor.threshold.max}{sensor.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BuoyCard;
