import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Warehouse, Route, AlertTriangle, Mountain, CircleDot } from 'lucide-react';
import { useStore } from '@/store/useStore';
import AlertPanel from './AlertPanel';

const supplyTypeColors: Record<string, string> = {
  '沙袋': '#8B7355',
  '救生衣': '#FF6B35',
  '帐篷': '#4ECDC4',
  '食品': '#00D68F',
  '饮用水': '#5B9BD5',
  '医疗物资': '#E91E63',
  '发电机': '#FFC107',
  '照明设备': '#9C27B0',
};

const warehouseStatusColors: Record<string, string> = {
  normal: '#00d68f',
  isolated: '#ff6b35',
  overloaded: '#ef4444',
};

const warehouseStatusLabels: Record<string, string> = {
  normal: '正常',
  isolated: '孤立',
  overloaded: '过载',
};

const roadStatusColors: Record<string, string> = {
  open: '#5b9bd5',
  interrupted: '#ff6b35',
  slope_limited: '#ffc107',
};

const roadStatusLabels: Record<string, string> = {
  open: '畅通',
  interrupted: '中断',
  slope_limited: '限行',
};

function SupplyBarChart({ supplies }: { supplies: { type: string; quantity: number }[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    supplies.forEach((s) => map.set(s.type, (map.get(s.type) || 0) + s.quantity));
    return Array.from(map.entries()).map(([type, quantity]) => ({
      type,
      quantity,
      color: supplyTypeColors[type] || '#8b8fa3',
    }));
  }, [supplies]);

  const total = grouped.reduce((sum, g) => sum + g.quantity, 0);

  if (total === 0) return <div className="h-4 rounded-full bg-[#2e3548]" />;

  return (
    <div className="flex rounded-full overflow-hidden h-4">
      {grouped.map((g) => (
        <div
          key={g.type}
          className="h-full transition-all duration-300"
          style={{
            width: `${(g.quantity / total) * 100}%`,
            backgroundColor: g.color,
            minWidth: g.quantity > 0 ? '4px' : '0',
          }}
          title={`${g.type}: ${g.quantity}`}
        />
      ))}
    </div>
  );
}

function QuantityBar({ quantity, maxQuantity, color }: { quantity: number; maxQuantity: number; color: string }) {
  const pct = maxQuantity > 0 ? (quantity / maxQuantity) * 100 : 0;
  return (
    <div className="h-1.5 rounded-full bg-[#2e3548] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function SlopeGauge({ angle }: { angle: number }) {
  const clamped = Math.min(Math.max(angle, 0), 45);
  const pct = (clamped / 45) * 100;
  const color = angle > 25 ? '#ffc107' : angle > 15 ? '#ff6b35' : '#00d68f';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[#2e3548] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold font-['Rajdhani'] min-w-[40px] text-right" style={{ color }}>
        {angle.toFixed(1)}°
      </span>
    </div>
  );
}

function ElevationProfile({ waypoints }: { waypoints: [number, number, number][] }) {
  if (waypoints.length < 2) return null;

  const elevations = waypoints.map((w) => w[1]);
  const minE = Math.min(...elevations);
  const maxE = Math.max(...elevations);
  const range = maxE - minE || 1;

  const w = 280;
  const h = 80;
  const padX = 10;
  const padY = 10;

  const points = waypoints.map((wp, i) => ({
    x: padX + (i / (waypoints.length - 1)) * (w - padX * 2),
    y: padY + (1 - (wp[1] - minE) / range) * (h - padY * 2),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${h - padY} L ${points[0].x} ${h - padY} Z`;

  return (
    <div>
      <p className="text-xs text-[#8b8fa3] mb-1.5">高程剖面</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ecdc4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4ecdc4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#elevGrad)" />
        <path d={pathD} fill="none" stroke="#4ecdc4" strokeWidth="1.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#4ecdc4" />
        ))}
        <text x={padX} y={h - 2} fontSize="8" fill="#8b8fa3">{minE.toFixed(0)}m</text>
        <text x={w - padX} y={10} fontSize="8" fill="#8b8fa3" textAnchor="end">{maxE.toFixed(0)}m</text>
      </svg>
    </div>
  );
}

function WarehouseDetail({ warehouse }: { warehouse: ReturnType<typeof useStore.getState>['warehouses'][0] }) {
  const { roads } = useStore();
  const connectedRoads = roads.filter((r) => r.connectedWarehouseIds.includes(warehouse.id));
  const maxQty = Math.max(...warehouse.supplies.map((s) => s.quantity), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Warehouse className="w-4 h-4 text-[#4ecdc4]" />
        <h3 className="text-lg font-semibold text-[#e8eaed] font-['Rajdhani']">{warehouse.name}</h3>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: `${warehouseStatusColors[warehouse.status]}20`,
            color: warehouseStatusColors[warehouse.status],
          }}
        >
          {warehouseStatusLabels[warehouse.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1f2e]/60 rounded-lg px-3 py-2">
          <p className="text-[10px] text-[#8b8fa3] mb-0.5">海拔</p>
          <p className="text-base font-semibold text-[#e8eaed] font-['Rajdhani']">{warehouse.elevation.toFixed(1)}m</p>
        </div>
        <div className="bg-[#1a1f2e]/60 rounded-lg px-3 py-2">
          <p className="text-[10px] text-[#8b8fa3] mb-0.5">服务半径</p>
          <p className="text-base font-semibold text-[#e8eaed] font-['Rajdhani']">{warehouse.serviceRadius}km</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-[#8b8fa3] mb-2">物资分布</p>
        <SupplyBarChart supplies={warehouse.supplies.map((s) => ({ type: s.type, quantity: s.quantity }))} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {[...new Map(warehouse.supplies.map((s) => [s.type, supplyTypeColors[s.type] || '#8b8fa3'])).entries()].map(
            ([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-[#8b8fa3]">{type}</span>
              </div>
            )
          )}
        </div>
      </div>

      <div>
        <p className="text-xs text-[#8b8fa3] mb-2">物资明细</p>
        <div className="space-y-2">
          {warehouse.supplies.map((s) => (
            <div key={s.id}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-[#e8eaed]">{s.name}</span>
                <span className="text-xs text-[#8b8fa3] font-['Rajdhani']">
                  {s.quantity} {s.unit}
                </span>
              </div>
              <QuantityBar
                quantity={s.quantity}
                maxQuantity={maxQty}
                color={supplyTypeColors[s.type] || '#8b8fa3'}
              />
            </div>
          ))}
        </div>
      </div>

      {connectedRoads.length > 0 && (
        <div>
          <p className="text-xs text-[#8b8fa3] mb-2">连接道路</p>
          <div className="space-y-1">
            {connectedRoads.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#1a1f2e]/60 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Route className="w-3.5 h-3.5" style={{ color: roadStatusColors[r.status] }} />
                <span className="text-sm text-[#e8eaed] flex-1">{r.name}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${roadStatusColors[r.status]}20`,
                    color: roadStatusColors[r.status],
                  }}
                >
                  {roadStatusLabels[r.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoadDetail({ road }: { road: ReturnType<typeof useStore.getState>['roads'][0] }) {
  const { warehouses, setSelectedWarehouse } = useStore();
  const connectedWarehouses = warehouses.filter((w) => road.connectedWarehouseIds.includes(w.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Route className="w-4 h-4 text-[#5b9bd5]" />
        <h3 className="text-lg font-semibold text-[#e8eaed] font-['Rajdhani']">{road.name}</h3>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: `${roadStatusColors[road.status]}20`,
            color: roadStatusColors[road.status],
          }}
        >
          {roadStatusLabels[road.status]}
        </span>
      </div>

      <div>
        <p className="text-xs text-[#8b8fa3] mb-1.5">坡度角度</p>
        <SlopeGauge angle={road.slopeAngle} />
      </div>

      {road.status === 'interrupted' && road.interruptReason && (
        <div className="rounded-lg bg-[#ff6b35]/10 border border-[#ff6b35]/30 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ff6b35]" />
            <span className="text-xs font-semibold text-[#ff6b35]">中断原因</span>
          </div>
          <p className="text-xs text-[#e8eaed] leading-relaxed">{road.interruptReason}</p>
        </div>
      )}

      {road.status === 'slope_limited' && road.slopeLimitedReason && (
        <div className="rounded-lg bg-[#ffc107]/10 border border-[#ffc107]/30 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Mountain className="w-3.5 h-3.5 text-[#ffc107]" />
            <span className="text-xs font-semibold text-[#ffc107]">限行原因</span>
          </div>
          <p className="text-xs text-[#e8eaed] leading-relaxed">{road.slopeLimitedReason}</p>
          <p className="text-[10px] text-[#8b8fa3] mt-1">
            当前坡度 {road.slopeAngle.toFixed(1)}°，超过 15° 限行阈值
          </p>
        </div>
      )}

      {connectedWarehouses.length > 0 && (
        <div>
          <p className="text-xs text-[#8b8fa3] mb-2">连接仓库</p>
          <div className="space-y-1">
            {connectedWarehouses.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#1a1f2e]/60 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => setSelectedWarehouse(w.id)}
              >
                <Warehouse className="w-3.5 h-3.5" style={{ color: warehouseStatusColors[w.status] }} />
                <span className="text-sm text-[#e8eaed] flex-1">{w.name}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${warehouseStatusColors[w.status]}20`,
                    color: warehouseStatusColors[w.status],
                  }}
                >
                  {warehouseStatusLabels[w.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {road.waypoints.length >= 2 && <ElevationProfile waypoints={road.waypoints} />}
    </div>
  );
}

function OverviewStats() {
  const { warehouses, roads, conflictAlerts } = useStore();
  const totalSupplies = warehouses.reduce((sum, w) => sum + w.supplies.length, 0);
  const activeAlerts = conflictAlerts.filter((a) => a.severity === 'critical' || a.severity === 'warning').length;

  const stats = [
    { label: '仓库总数', value: warehouses.length, color: '#4ecdc4', icon: Warehouse },
    { label: '道路总数', value: roads.length, color: '#5b9bd5', icon: Route },
    { label: '物资种类', value: totalSupplies, color: '#00d68f', icon: CircleDot },
    { label: '活跃告警', value: activeAlerts, color: activeAlerts > 0 ? '#ef4444' : '#8b8fa3', icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {stats.map((s) => (
        <div key={s.label} className="bg-[#1a1f2e]/60 rounded-lg px-3 py-3">
          <s.icon className="w-4 h-4 mb-1.5" style={{ color: s.color }} />
          <p className="text-xl font-bold text-[#e8eaed] font-['Rajdhani']">{s.value}</p>
          <p className="text-[10px] text-[#8b8fa3]">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function DetailPanel() {
  const { warehouses, roads, selectedWarehouseId, selectedRoadId, rightPanelOpen, toggleRightPanel } = useStore();

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
  const selectedRoad = roads.find((r) => r.id === selectedRoadId);

  if (!rightPanelOpen) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 px-2 bg-[#242938]/80 backdrop-blur-md border-l border-[#2e3548]">
        <button
          className="p-2 rounded-lg hover:bg-white/5 text-[#8b8fa3] hover:text-[#e8eaed] transition-colors"
          onClick={toggleRightPanel}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[320px] flex flex-col bg-[#242938]/80 backdrop-blur-md border-l border-[#2e3548] h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e3548]">
        <h2 className="text-base font-semibold text-[#e8eaed] font-['Rajdhani'] tracking-wide">
          详情面板
        </h2>
        <button
          className="p-1.5 rounded-lg hover:bg-white/5 text-[#8b8fa3] hover:text-[#e8eaed] transition-colors"
          onClick={toggleRightPanel}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {selectedWarehouse ? (
          <WarehouseDetail warehouse={selectedWarehouse} />
        ) : selectedRoad ? (
          <RoadDetail road={selectedRoad} />
        ) : (
          <OverviewStats />
        )}
      </div>

      <div className="border-t border-[#2e3548] px-4 py-3">
        <AlertPanel />
      </div>
    </div>
  );
}
