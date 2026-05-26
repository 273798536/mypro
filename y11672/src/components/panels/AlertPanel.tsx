import { useState } from 'react';
import { AlertTriangle, AlertCircle, Clock, ChevronDown, ChevronUp, MapPin, Layers } from 'lucide-react';
import { useYardStore } from '../../store/useYardStore';
import { Alert } from '../../types';

export function AlertPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'danger' | 'warning'>('all');
  const { alerts, selectContainer, selectedContainer } = useYardStore();
  
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  });
  
  const dangerCount = alerts.filter(a => a.severity === 'danger').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'stacked':
        return <Layers className="w-4 h-4" />;
      case 'dangerous_adjacent':
        return <AlertTriangle className="w-4 h-4" />;
      case 'expired':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };
  
  const getTypeLabel = (type: Alert['type']) => {
    switch (type) {
      case 'stacked': return '压箱';
      case 'dangerous_adjacent': return '危险品相邻';
      case 'expired': return '预约过期';
      default: return '未知';
    }
  };
  
  const handleAlertClick = (alert: Alert) => {
    selectContainer(alert.containerId);
  };
  
  return (
    <div className="w-80 bg-industrial-darker border-r border-industrial-gray/30 h-full overflow-hidden flex flex-col">
      <div 
        className="p-3 border-b border-industrial-gray/30 cursor-pointer hover:bg-industrial-dark/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-industrial-yellow" />
            <span className="font-medium text-industrial-light">异常告警</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs">
              <span className="text-industrial-red">{dangerCount} 严重</span>
              <span className="text-industrial-gray">|</span>
              <span className="text-industrial-yellow">{warningCount} 警告</span>
            </span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <>
          <div className="p-2 border-b border-industrial-gray/30 flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1 text-xs rounded transition-colors ${
                filter === 'all'
                  ? 'bg-industrial-blue/20 text-industrial-blue'
                  : 'bg-industrial-dark text-industrial-gray hover:text-industrial-light'
              }`}
            >
              全部 ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('danger')}
              className={`flex-1 py-1 text-xs rounded transition-colors ${
                filter === 'danger'
                  ? 'bg-industrial-red/20 text-industrial-red'
                  : 'bg-industrial-dark text-industrial-gray hover:text-industrial-light'
              }`}
            >
              严重 ({dangerCount})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`flex-1 py-1 text-xs rounded transition-colors ${
                filter === 'warning'
                  ? 'bg-industrial-yellow/20 text-industrial-yellow'
                  : 'bg-industrial-dark text-industrial-gray hover:text-industrial-light'
              }`}
            >
              警告 ({warningCount})
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-4 text-center text-industrial-gray text-sm">
                暂无异常告警
              </div>
            ) : (
              <div className="divide-y divide-industrial-gray/20">
                {filteredAlerts.map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedContainer === alert.containerId
                        ? 'bg-industrial-blue/10 border-l-2 border-industrial-blue'
                        : 'hover:bg-industrial-dark/50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 ${
                        alert.severity === 'danger' ? 'text-industrial-red' : 'text-industrial-yellow'
                      }`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            alert.severity === 'danger'
                              ? 'bg-industrial-red/20 text-industrial-red'
                              : 'bg-industrial-yellow/20 text-industrial-yellow'
                          }`}>
                            {getTypeLabel(alert.type)}
                          </span>
                          <span className="text-xs text-industrial-gray font-mono">
                            {alert.containerId}
                          </span>
                        </div>
                        <p className="text-xs text-industrial-light leading-relaxed">
                          {alert.message}
                        </p>
                        {alert.relatedContainers.length > 0 && (
                          <div className="mt-1 text-xs text-industrial-gray">
                            相关箱: {alert.relatedContainers.slice(0, 3).join(', ')}
                            {alert.relatedContainers.length > 3 && ` 等${alert.relatedContainers.length}个`}
                          </div>
                        )}
                      </div>
                      <MapPin className="w-3 h-3 text-industrial-gray mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
