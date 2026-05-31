import { useSimStore } from "../store/simStore";
import ScheduleTable from "../components/ScheduleTable";
import { CalendarDays } from "lucide-react";

export default function SchedulePage() {
  const result = useSimStore((s) => s.result);

  if (!result) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-slate-200">排程建议</h1>
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-12 text-center">
          <CalendarDays className="w-10 h-10 mx-auto text-slate-700" />
          <p className="text-slate-500 text-sm mt-4">
            请先在仿真总览页运行仿真
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-200">排程建议</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          基于仿真结果的泵启停排程、余氯补给与成本对比
        </p>
      </div>
      <ScheduleTable />
    </div>
  );
}
