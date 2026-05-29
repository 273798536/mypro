import { useParkingData } from '../../hooks/useParkingData';
import { pressureToColor, pressureToHexColor, getPressureLabel } from '../../utils/colorUtils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MapPin, Car, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function EntranceHeatmap() {
  const { filteredEntrances, currentRecord } = useParkingData();

  if (!currentRecord || filteredEntrances.length === 0) {
    return (
      <Card className="h-full">
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            <MapPin size={16} />
            入口压力分布
          </Card.Title>
        </Card.Header>
        <Card.Content className="flex items-center justify-center h-40 text-slate-500">
          暂无入口数据
        </Card.Content>
      </Card>
    );
  }

  const maxQueue = Math.max(...filteredEntrances.map(e => e.queueLength), 1);

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          <MapPin size={16} />
          入口压力分布
        </Card.Title>
        <Badge variant="info">{filteredEntrances.length} 个入口</Badge>
      </Card.Header>
      <Card.Content className="space-y-4">
        {filteredEntrances.map((entrance) => {
          const statusIcon = 
            entrance.blockageStatus === 'blocked' ? <XCircle size={14} className="text-red-400 animate-pulse" /> :
            entrance.blockageStatus === 'slow' ? <AlertTriangle size={14} className="text-amber-400" /> :
            <CheckCircle size={14} className="text-emerald-400" />;

          const statusText = 
            entrance.blockageStatus === 'blocked' ? '回堵' :
            entrance.blockageStatus === 'slow' ? '缓行' :
            '顺畅';

          return (
            <div key={entrance.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-cyan-400" />
                  <span className="font-semibold text-cyan-300">{entrance.entranceName}</span>
                  {statusIcon}
                  <Badge 
                    variant={
                      entrance.blockageStatus === 'blocked' ? 'critical' :
                      entrance.blockageStatus === 'slow' ? 'warning' : 'success'
                    }
                  >
                    {statusText}
                  </Badge>
                  {entrance._dirty && (
                    <Badge variant="warning">数据待校验</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Car size={12} />
                    <span>{entrance.incomingCars}辆/小时</span>
                  </div>
                  <span 
                    className="font-mono font-bold"
                    style={{ color: pressureToHexColor(entrance.pressureLevel) }}
                  >
                    {getPressureLabel(entrance.pressureLevel)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>排队长度</span>
                    <span>{entrance.queueLength} 辆</span>
                  </div>
                  <div className="h-6 bg-slate-900/60 rounded-lg overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 flex items-center gap-0.5 px-1">
                      {Array.from({ length: Math.min(entrance.queueLength, 20) }, (_, i) => (
                        <div
                          key={i}
                          className="w-3 h-4 rounded-sm transition-all"
                          style={{
                            backgroundColor: pressureToColor(
                              1 - (i / Math.max(entrance.queueLength, 1)) * 0.5,
                              0.8
                            ),
                            boxShadow: `0 0 4px ${pressureToHexColor(entrance.pressureLevel)}60`,
                          }}
                        />
                      ))}
                    </div>
                    {entrance.queueLength > 20 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-400 font-bold">
                        +{entrance.queueLength - 20}
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    backgroundColor: pressureToColor(entrance.pressureLevel, 0.2),
                    border: `2px solid ${pressureToHexColor(entrance.pressureLevel)}60`,
                  }}
                >
                  <div 
                    className="absolute inset-0 animate-pulse"
                    style={{
                      background: `radial-gradient(circle, ${pressureToHexColor(entrance.pressureLevel)}40 0%, transparent 70%)`,
                    }}
                  />
                  <span 
                    className="relative font-display font-bold text-lg"
                    style={{ color: pressureToHexColor(entrance.pressureLevel) }}
                  >
                    {Math.round(entrance.pressureLevel * 100)}
                  </span>
                </div>
              </div>

              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${entrance.pressureLevel * 100}%`,
                    backgroundColor: pressureToHexColor(entrance.pressureLevel),
                    boxShadow: `0 0 10px ${pressureToHexColor(entrance.pressureLevel)}80`,
                  }}
                />
              </div>

              {entrance.notes && (
                <div className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                  📝 {entrance.notes}
                </div>
              )}
            </div>
          );
        })}
      </Card.Content>
    </Card>
  );
}
