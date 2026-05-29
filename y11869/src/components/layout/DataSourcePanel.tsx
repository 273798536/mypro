import { Database, Box, Truck, Layers, Clock, ExternalLink } from 'lucide-react';
import { useYardStore } from '@/store/yardStore';

export function DataSourcePanel() {
  const { dataSources } = useYardStore();

  const sources = [
    {
      id: 'slots',
      name: '箱位数据',
      icon: Layers,
      data: dataSources.slots,
      color: 'text-accent-blue',
    },
    {
      id: 'containers',
      name: '集装箱数据',
      icon: Box,
      data: dataSources.containers,
      color: 'text-accent-green',
    },
    {
      id: 'cranes',
      name: '吊机数据',
      icon: Truck,
      data: dataSources.cranes,
      color: 'text-accent-orange',
    },
  ];

  return (
    <div className="w-64 bg-yard-darker/90 border-r border-yard-light/20 flex flex-col h-full backdrop-blur-sm">
      <div className="p-3 border-b border-yard-light/20">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-neutral-gray" />
          <h2 className="text-neutral-light font-mono text-sm font-semibold">数据来源</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <div
              key={source.id}
              className="bg-yard-dark/50 border border-yard-light/20 rounded p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${source.color}`} />
                <span className="text-neutral-light text-sm font-medium">
                  {source.name}
                </span>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-gray">数据量</span>
                  <span className="text-neutral-light font-mono">
                    {source.data.count} 条
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-neutral-gray">
                    <Clock className="w-3 h-3" />
                    <span>同步时间</span>
                  </div>
                  <span className="text-neutral-light font-mono">
                    {source.data.lastSync.split('T')[1]}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-gray">来源文件</span>
                  <button className="flex items-center gap-1 text-accent-blue hover:text-accent-blue/80 transition-colors">
                    <span className="font-mono max-w-20 truncate">
                      {source.data.source}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-yard-light/20">
        <div className="text-xs text-neutral-gray mb-2">追溯命令</div>
        <div className="bg-yard-dark border border-yard-light/20 rounded p-2 font-mono text-xs text-accent-green">
          /trace conflict --id cf-001
        </div>
        <div className="mt-2 text-xs text-neutral-gray">
          在控制台输入命令查看完整计算链
        </div>
      </div>
    </div>
  );
}
