import React from 'react';
import { Megaphone, Clock, AlertTriangle, Shield, Heart } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BroadcastCategory } from '../../types';

const categoryConfig: Record<
  BroadcastCategory,
  { icon: React.ReactNode; label: string; color: string }
> = {
  evacuation: {
    icon: <Shield size={16} />,
    label: '疏散',
    color: 'bg-metro-red',
  },
  diversion: {
    icon: <AlertTriangle size={16} />,
    label: '分流',
    color: 'bg-metro-yellow',
  },
  lockdown: {
    icon: <Shield size={16} />,
    label: '封控',
    color: 'bg-metro-orange',
  },
  reassurance: {
    icon: <Heart size={16} />,
    label: '安抚',
    color: 'bg-metro-blue',
  },
};

export const BroadcastPanel: React.FC = () => {
  const broadcasts = useGameStore((state) => state.broadcasts);
  const broadcastCooldowns = useGameStore((state) => state.broadcastCooldowns);
  const activeBroadcastId = useGameStore((state) => state.activeBroadcastId);
  const playBroadcast = useGameStore((state) => state.playBroadcast);
  const status = useGameStore((state) => state.status);

  const groupedBroadcasts = broadcasts.reduce((acc, broadcast) => {
    if (!acc[broadcast.category]) {
      acc[broadcast.category] = [];
    }
    acc[broadcast.category].push(broadcast);
    return acc;
  }, {} as Record<BroadcastCategory, typeof broadcasts>);

  const handlePlay = (broadcastId: string) => {
    if (status !== 'playing') return;
    playBroadcast(broadcastId);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="metro-panel h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-metro-border">
        <Megaphone className="text-metro-yellow" size={20} />
        <h3 className="font-mono font-bold text-metro-text">广播控制</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {Object.entries(groupedBroadcasts).map(([category, items]) => {
          const config = categoryConfig[category as BroadcastCategory];
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`${config.color} text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1`}>
                  {config.icon}
                  {config.label}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((broadcast) => {
                  const cooldown = broadcastCooldowns[broadcast.id] ?? 0;
                  const isOnCooldown = cooldown > 0;
                  const isActive = activeBroadcastId === broadcast.id;
                  const isDisabled = isOnCooldown || status !== 'playing';

                  return (
                    <button
                      key={broadcast.id}
                      onClick={() => handlePlay(broadcast.id)}
                      disabled={isDisabled}
                      className={`w-full text-left p-3 rounded border-2 transition-all ${
                        isActive
                          ? 'border-metro-blue bg-metro-blue/20'
                          : isOnCooldown
                          ? 'border-metro-border bg-metro-bg/50 opacity-60'
                          : status !== 'playing'
                          ? 'border-metro-border bg-metro-bg/50 opacity-60 cursor-not-allowed'
                          : 'border-metro-border bg-metro-bg hover:border-metro-blue hover:bg-metro-blue/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-metro-text text-sm">
                          {broadcast.title}
                        </span>
                        {isOnCooldown && (
                          <span className="flex items-center gap-1 text-metro-textMuted text-xs">
                            <Clock size={12} />
                            {cooldown}s
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-metro-textMuted line-clamp-2">
                        {broadcast.content}
                      </p>
                      {isOnCooldown && (
                        <div className="mt-2 h-1 bg-metro-border rounded overflow-hidden">
                          <div
                            className="h-full bg-metro-yellow transition-all"
                            style={{
                              width: `${(cooldown / broadcast.cooldownSeconds) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {status === 'idle' && (
        <div className="mt-3 p-2 bg-metro-bg/50 rounded text-center text-metro-textMuted text-xs">
          游戏开始后可播放广播
        </div>
      )}
    </div>
  );
};
