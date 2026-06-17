import { Map, Database, ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

export function Header() {
  const [selectedPacket, setSelectedPacket] = useState('demo-pack');
  const [showPacketMenu, setShowPacketMenu] = useState(false);

  const packets = [
    {
      id: 'demo-pack',
      name: '演示数据包',
      description: '含正常记录与容量超限',
      count: 5,
      overload: 2,
    },
  ];

  const currentPacket = packets.find((p) => p.id === selectedPacket);

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-lg shadow-lg shadow-sky-500/20">
          <Map className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 tracking-wide">
            慢行桥坡道投诉回放
          </h1>
          <p className="text-[10px] text-slate-500 -mt-0.5">
            GIS 点位 · 异常高亮 · 历史追溯
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowPacketMenu(!showPacketMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors"
          >
            <Database className="w-4 h-4 text-sky-400" />
            <div className="text-left">
              <div className="text-xs font-medium text-slate-200">
                {currentPacket?.name}
              </div>
              <div className="text-[10px] text-slate-500">
                {currentPacket?.count} 条点位 · {currentPacket?.overload} 条超限
              </div>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-400 transition-transform',
                showPacketMenu && 'rotate-180'
              )}
            />
          </button>

          {showPacketMenu && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {packets.map((packet) => (
                <button
                  key={packet.id}
                  onClick={() => {
                    setSelectedPacket(packet.id);
                    setShowPacketMenu(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2.5 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-b-0',
                    selectedPacket === packet.id && 'bg-sky-500/10'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">
                      {packet.name}
                    </span>
                    {selectedPacket === packet.id && (
                      <span className="text-[10px] text-sky-400">当前</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {packet.description}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-slate-400">
                      {packet.count} 点位
                    </span>
                    <span className="text-[10px] text-orange-400">
                      {packet.overload} 超限
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-700/50" />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[11px] text-emerald-400">数据已加载</span>
          </div>
        </div>

        <button
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="系统说明"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
