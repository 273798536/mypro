import { useState } from 'react';
import { Warehouse3D } from '@/components/Sandbox3D/Warehouse3D';
import { SlotTooltip } from '@/components/Sandbox3D/SlotTooltip';
import { FilterSidebar } from '@/components/FilterSidebar';
import { AlertPanel } from '@/components/AlertPanel';
import { Toolbar } from '@/components/Toolbar';
import { HistoryModal } from '@/components/HistoryModal';
import { useWarehouseStore } from '@/store/useWarehouseStore';

export default function Home() {
  const [showHistory, setShowHistory] = useState(false);
  const { slots, receipts, alerts } = useWarehouseStore();

  const totalSlots = slots.length;
  const usedSlots = slots.filter((s) => s.receipts.length > 0).length;
  const totalQuantity = receipts.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      <Toolbar onOpenHistory={() => setShowHistory(true)} />

      <div className="flex-1 flex overflow-hidden">
        <FilterSidebar />

        <div className="flex-1 relative flex-col">
          <div className="h-10 bg-slate-900/80 border-b border-slate-700 px-4 flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">仓库使用：</span>
              <span className="text-white font-mono">{usedSlots} / {totalSlots}</span>
              <span className="text-slate-500">库位</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400">仓单：</span>
              <span className="text-white font-mono">{receipts.length}</span>
              <span className="text-slate-500">张</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400">总量：</span>
              <span className="text-white font-mono">{totalQuantity.toLocaleString()}</span>
              <span className="text-slate-500">单位</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400">预警：</span>
              <span className={`font-mono ${alerts.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {alerts.length}
              </span>
              <span className="text-slate-500">条</span>
            </div>
          </div>

          <div id="sandbox-container" className="flex-1 relative">
            <Warehouse3D />
            <SlotTooltip />
          </div>
        </div>

        <AlertPanel />
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}
