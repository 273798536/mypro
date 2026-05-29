import { useParkingData } from '../../hooks/useParkingData';
import { pressureToColor, pressureToHexColor, getPressureLabel } from '../../utils/colorUtils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LayoutGrid, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function FloorHeatmap() {
  const { filteredFloors, currentRecord } = useParkingData();

  if (!currentRecord || filteredFloors.length === 0) {
    return (
      <Card className="h-full">
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            <LayoutGrid size={16} />
            楼层压力分布
          </Card.Title>
        </Card.Header>
        <Card.Content className="flex items-center justify-center h-40 text-slate-500">
          暂无楼层数据
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          <LayoutGrid size={16} />
          楼层压力分布
        </Card.Title>
        <Badge variant="info">{filteredFloors.length} 个楼层</Badge>
      </Card.Header>
      <Card.Content className="space-y-3">
        {filteredFloors.map((floor) => {
          const occupancyRate = floor.occupiedSpots / floor.totalSpots;
          const statusIcon = 
            floor.overflowStatus === 'full' ? <XCircle size={14} className="text-red-400" /> :
            floor.overflowStatus === 'overflow' ? <AlertTriangle size={14} className="text-amber-400" /> :
            <CheckCircle size={14} className="text-emerald-400" />;

          return (
            <div key={floor.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-cyan-300">B{floor.floorNumber + 1}层</span>
                  {statusIcon}
                  {floor._dirty && (
                    <Badge variant="warning" size="sm">数据待校验</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">
                    {floor.occupiedSpots}/{floor.totalSpots}
                  </span>
                  <span 
                    className="font-mono font-bold"
                    style={{ color: pressureToHexColor(floor.pressureLevel) }}
                  >
                    {Math.round(occupancyRate * 100)}%
                  </span>
                </div>
              </div>

              <div className="relative h-8 bg-slate-900/60 rounded-lg overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-10 gap-px p-1">
                  {Array.from({ length: 10 }, (_, i) => {
                    const spotPressure = (i + 1) / 10;
                    const isOccupied = spotPressure <= occupancyRate;
                    return (
                      <div
                        key={i}
                        className="rounded-sm transition-all duration-300"
                        style={{
                          backgroundColor: isOccupied 
                            ? pressureToColor(floor.pressureLevel, 0.8)
                            : 'rgba(30, 41, 59, 0.5)',
                          boxShadow: isOccupied 
                            ? `0 0 8px ${pressureToHexColor(floor.pressureLevel)}40`
                            : 'none',
                        }}
                      />
                    );
                  })}
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white/80 bg-black/40 px-2 py-0.5 rounded">
                    {getPressureLabel(floor.pressureLevel)}
                  </span>
                </div>
              </div>

              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${floor.pressureLevel * 100}%`,
                    backgroundColor: pressureToHexColor(floor.pressureLevel),
                    boxShadow: `0 0 10px ${pressureToHexColor(floor.pressureLevel)}80`,
                  }}
                />
              </div>

              {floor.notes && (
                <div className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                  📝 {floor.notes}
                </div>
              )}
            </div>
          );
        })}
      </Card.Content>
    </Card>
  );
}
