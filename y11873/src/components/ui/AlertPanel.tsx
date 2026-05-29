import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ConflictAlert } from '@/types';

const severityColors = {
  critical: 'border-l-[#ef4444] bg-[#ef4444]/5',
  warning: 'border-l-[#ff6b35] bg-[#ff6b35]/5',
  info: 'border-l-[#5b9bd5] bg-[#5b9bd5]/5',
};

const severityTextColors = {
  critical: 'text-[#ef4444]',
  warning: 'text-[#ff6b35]',
  info: 'text-[#5b9bd5]',
};

function AlertIcon({ type, severity }: { type: ConflictAlert['type']; severity: ConflictAlert['severity'] }) {
  const className = `w-4 h-4 ${severityTextColors[severity]}`;
  switch (type) {
    case 'road_interrupted':
      return <AlertTriangle className={className} />;
    case 'supply_duplicate':
      return <AlertCircle className={className} />;
    case 'slope_miscalculated':
      return <Info className={className} />;
  }
}

function AlertItem({ alert }: { alert: ConflictAlert }) {
  const [expanded, setExpanded] = useState(false);
  const { warehouses, roads, setSelectedWarehouse, setSelectedRoad } = useStore();

  const handleClick = () => {
    for (const id of alert.relatedIds) {
      const warehouse = warehouses.find((w) => w.id === id);
      if (warehouse) {
        setSelectedWarehouse(warehouse.id);
        return;
      }
      const road = roads.find((r) => r.id === id);
      if (road) {
        setSelectedRoad(road.id);
        return;
      }
    }
  };

  return (
    <div
      className={`border-l-2 ${severityColors[alert.severity]} rounded-r-md px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        <AlertIcon type={alert.type} severity={alert.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#e8eaed] leading-snug">{alert.message}</p>
          <button
            className="flex items-center gap-1 mt-1 text-xs text-[#8b8fa3] hover:text-[#e8eaed] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            查看原因
          </button>
          {expanded && (
            <p className="text-xs text-[#8b8fa3] mt-1 leading-relaxed">{alert.reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertPanel() {
  const { conflictAlerts } = useStore();

  const criticalCount = conflictAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = conflictAlerts.filter((a) => a.severity === 'warning').length;
  const infoCount = conflictAlerts.filter((a) => a.severity === 'info').length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-semibold text-[#8b8fa3] uppercase tracking-wider font-['Rajdhani']">
          告警
        </h3>
        {criticalCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ef4444]/20 text-[#ef4444] font-semibold">
            {criticalCount}
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ff6b35]/20 text-[#ff6b35] font-semibold">
            {warningCount}
          </span>
        )}
        {infoCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#5b9bd5]/20 text-[#5b9bd5] font-semibold">
            {infoCount}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
        {conflictAlerts.length === 0 ? (
          <p className="text-xs text-[#8b8fa3] px-1 py-2">暂无告警</p>
        ) : (
          conflictAlerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)
        )}
      </div>
    </div>
  );
}
