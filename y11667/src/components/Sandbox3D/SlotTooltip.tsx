import { useWarehouseStore } from '@/store/useWarehouseStore';
import { STATUS_LABELS, STATUS_COLORS, WAREHOUSES } from '@/data/warehouseConfig';

export function SlotTooltip() {
  const { slots, hoveredSlotId } = useWarehouseStore();

  const slot = slots.find((s) => s.id === hoveredSlotId);

  if (!slot || slot.receipts.length === 0) return null;

  const warehouse = WAREHOUSES.find((w) => w.id === slot.warehouseId);
  const statusColor = STATUS_COLORS[slot.status];
  const statusLabel = STATUS_LABELS[slot.status];

  return (
    <div className="fixed top-24 right-80 z-50 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-lg">{slot.id}</h3>
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: statusColor + '30', color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="text-slate-300 text-sm mb-3">
        <p className="mb-1">
          <span className="text-slate-500">仓库：</span>
          {warehouse?.name || '-'}
        </p>
        <p className="mb-1">
          <span className="text-slate-500">位置：</span>
          L{slot.level} 层 · R{slot.row} 行 · C{slot.col} 列
        </p>
        <p>
          <span className="text-slate-500">库容：</span>
          <span className={slot.usedCapacity > slot.maxCapacity ? 'text-red-400' : 'text-emerald-400'}>
            {slot.usedCapacity}
          </span>
          <span className="text-slate-500"> / {slot.maxCapacity}</span>
        </p>
      </div>

      <div className="border-t border-slate-700 pt-3">
        <h4 className="text-white text-sm font-semibold mb-2">仓单列表</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {slot.receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="bg-slate-800/50 rounded p-2 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-mono">{receipt.id}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    receipt.qualityStatus === 'pass'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : receipt.qualityStatus === 'fail'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {receipt.qualityStatus === 'pass' ? '合格' : receipt.qualityStatus === 'fail' ? '不合格' : '待检'}
                </span>
              </div>
              <p className="text-slate-400">
                {receipt.commodity} · {receipt.quantity} 单位
              </p>
              <p className="text-slate-500 text-[10px]">批次：{receipt.batchNumber}</p>
              <p className="text-slate-500 text-[10px]">交割：{receipt.deliveryDate}</p>
              <p className="text-slate-600 text-[10px] mt-1">来源：{receipt.dataSource}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
