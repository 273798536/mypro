import { ChevronUp, ChevronDown } from 'lucide-react';
import { useGalleryStore } from '@/store/useGalleryStore';
import { workOrders, valves } from '@/data/mockData';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  completed: { label: '已完成', color: 'text-[#2ECC71]' },
  in_progress: { label: '进行中', color: 'text-[#00BFFF]' },
  overdue: { label: '已过期', color: 'text-[#E74C3C]' },
};

export default function WorkOrderTable() {
  const drawerOpen = useGalleryStore((s) => s.workOrderDrawerOpen);
  const toggleDrawer = useGalleryStore((s) => s.toggleWorkOrderDrawer);
  const setFocusPosition = useGalleryStore((s) => s.setFocusPosition);
  const selectValve = useGalleryStore((s) => s.selectValve);
  const overdueIssues = useGalleryStore((s) => s.overdueIssues);
  const overdueSet = new Set(overdueIssues.map((o) => o.workOrderId));

  const handleRowClick = (valveRef: string) => {
    const valve = valves.find((v) => v.valveId === valveRef);
    if (valve) {
      selectValve(`${valve.valveId}@${valve.galleryId}`);
      setFocusPosition(valve.position);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <button
        onClick={toggleDrawer}
        className="mx-auto flex items-center gap-1 bg-[#0f1a2e] hover:bg-[#162240] text-zinc-400 hover:text-white px-4 py-1 rounded-t-lg border border-b-0 border-[#1e3050] text-xs transition-colors"
        style={{ display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
      >
        工单记录 {drawerOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>
      <div
        className="bg-[#0f1a2e]/95 backdrop-blur border-t border-[#1e3050] overflow-hidden transition-all duration-300"
        style={{ maxHeight: drawerOpen ? '240px' : '0' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e3050] text-zinc-500">
                <th className="text-left px-4 py-2 font-semibold">工单号</th>
                <th className="text-left px-4 py-2 font-semibold">关联阀门</th>
                <th className="text-left px-4 py-2 font-semibold">状态</th>
                <th className="text-left px-4 py-2 font-semibold">截止日期</th>
                <th className="text-left px-4 py-2 font-semibold">超期天数</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => {
                const isOverdue = overdueSet.has(wo.workOrderId);
                const overdueIssue = overdueIssues.find((o) => o.workOrderId === wo.workOrderId);
                const statusInfo = STATUS_MAP[wo.status];
                return (
                  <tr
                    key={wo.workOrderId}
                    onClick={() => handleRowClick(wo.valveRef)}
                    className={`border-b border-[#1e3050]/50 cursor-pointer transition-colors ${
                      isOverdue ? 'bg-[#E74C3C]/8 hover:bg-[#E74C3C]/15' : 'hover:bg-[#1a2640]'
                    }`}
                  >
                    <td className="px-4 py-2 font-mono text-zinc-200">{wo.workOrderId}</td>
                    <td className="px-4 py-2 font-mono text-zinc-300">{wo.valveRef}</td>
                    <td className={`px-4 py-2 font-semibold ${statusInfo.color}`}>{statusInfo.label}</td>
                    <td className="px-4 py-2 text-zinc-400">{wo.dueDate}</td>
                    <td className="px-4 py-2">
                      {isOverdue && overdueIssue ? (
                        <span className="text-[#E74C3C] font-bold">{overdueIssue.overdueDays}天</span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
