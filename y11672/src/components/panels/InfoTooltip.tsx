import { useMemo } from 'react';
import { useYardStore } from '../../store/useYardStore';
import { getContainerAlerts } from '../../utils/detection';
import { AlertTriangle, AlertCircle, Clock, Layers, Database, User, History } from 'lucide-react';

export function InfoTooltip() {
  const { containers, hoveredContainer, selectedContainer, alerts } = useYardStore();
  
  const containerId = hoveredContainer || selectedContainer;
  
  const container = useMemo(() => {
    if (!containerId) return null;
    return containers.find(c => c.id === containerId);
  }, [containerId, containers]);
  
  const containerAlerts = useMemo(() => {
    if (!containerId) return [];
    return getContainerAlerts(containerId, alerts);
  }, [containerId, alerts]);
  
  if (!container) return null;
  
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'stacked': return <Layers className="w-3 h-3" />;
      case 'dangerous_adjacent': return <AlertTriangle className="w-3 h-3" />;
      case 'expired': return <Clock className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stacked': return '压箱';
      case 'dangerous_adjacent': return '危险品相邻';
      case 'expired': return '预约过期';
      default: return '未知';
    }
  };
  
  const formatTime = (time: string) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const statusLabels: Record<string, string> = {
    pending: '待处理',
    ready: '就绪',
    completed: '已完成',
    expired: '已过期'
  };
  
  const typeLabels: Record<string, string> = {
    dry: '干货箱',
    reefer: '冷藏箱',
    tank: '罐式箱',
    open: '开顶箱'
  };

  return (
    <div className="absolute left-1/2 bottom-24 -translate-x-1/2 z-50 pointer-events-auto">
      <div className="bg-industrial-darker/95 backdrop-blur-sm border border-industrial-gray/30 rounded-lg shadow-xl min-w-80 max-w-md">
        <div className="p-3 border-b border-industrial-gray/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-gray">箱号</span>
              <span className="font-mono text-sm text-industrial-light font-medium">{container.id}</span>
            </div>
            {containerAlerts.length > 0 && (
              <div className="flex gap-1">
                {containerAlerts.map((alert, i) => (
                  <span
                    key={i}
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      alert.severity === 'danger'
                        ? 'bg-industrial-red/20 text-industrial-red'
                        : 'bg-industrial-yellow/20 text-industrial-yellow'
                    }`}
                  >
                    {getAlertIcon(alert.type)} {getTypeLabel(alert.type)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-industrial-gray">位置</span>
              <div className="text-industrial-light font-mono">
                {container.bay}贝 / {container.row}排 / {container.tier}层
              </div>
            </div>
            <div>
              <span className="text-industrial-gray">尺寸类型</span>
              <div className="text-industrial-light">
                {container.size}尺 / {typeLabels[container.type]}
              </div>
            </div>
            
            {container.dangerousGoods.level > 0 && (
              <div className="col-span-2">
                <span className="text-industrial-gray">危险品</span>
                <div className="text-industrial-red">
                  等级 {container.dangerousGoods.level}: {container.dangerousGoods.class}
                </div>
              </div>
            )}
            
            {container.booking.trainId && (
              <>
                <div>
                  <span className="text-industrial-gray">预约车次</span>
                  <div className="text-industrial-light font-mono">{container.booking.trainId}</div>
                </div>
                <div>
                  <span className="text-industrial-gray">提箱顺序</span>
                  <div className="text-industrial-light">#{container.booking.pickupOrder}</div>
                </div>
                <div>
                  <span className="text-industrial-gray">预约时间</span>
                  <div className="text-industrial-light">{formatTime(container.booking.appointmentTime)}</div>
                </div>
                <div>
                  <span className="text-industrial-gray">状态</span>
                  <div className={`${
                    container.booking.status === 'expired' ? 'text-industrial-red' :
                    container.booking.status === 'ready' ? 'text-industrial-green' :
                    'text-industrial-light'
                  }`}>
                    {statusLabels[container.booking.status]}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {containerAlerts.length > 0 && (
            <div className="border-t border-industrial-gray/30 pt-2">
              <div className="text-xs text-industrial-gray mb-1">异常信息</div>
              <div className="space-y-1">
                {containerAlerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded ${
                      alert.severity === 'danger'
                        ? 'bg-industrial-red/10 text-industrial-red'
                        : 'bg-industrial-yellow/10 text-industrial-yellow'
                    }`}
                  >
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="border-t border-industrial-gray/30 pt-2">
            <div className="flex items-center gap-1 text-xs text-industrial-gray mb-1">
              <Database className="w-3 h-3" />
              <span>数据来源</span>
            </div>
            <div className="text-xs text-industrial-light">
              {container.source.origin}
            </div>
            <div className="flex items-center gap-1 text-xs text-industrial-gray mt-1">
              <History className="w-3 h-3" />
              <span>最后修改: {formatTime(container.source.lastModified)}</span>
            </div>
          </div>
          
          {container.source.modifyHistory.length > 0 && (
            <div className="border-t border-industrial-gray/30 pt-2">
              <div className="flex items-center gap-1 text-xs text-industrial-gray mb-1">
                <User className="w-3 h-3" />
                <span>修改历史 ({container.source.modifyHistory.length} 条)</span>
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {container.source.modifyHistory.slice(-3).reverse().map((record, i) => (
                  <div key={i} className="text-xs text-industrial-light bg-industrial-dark/50 p-1.5 rounded">
                    <span className="text-industrial-gray">{record.operator}</span>
                    {' '}修改了{' '}
                    <span className="text-industrial-blue">{record.field}</span>
                    {' '}从{' '}
                    <span className="text-industrial-gray">{String(record.oldValue)}</span>
                    {' '}到{' '}
                    <span className="text-industrial-green">{String(record.newValue)}</span>
                    <div className="text-industrial-gray text-[10px] mt-0.5">
                      {formatTime(record.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
