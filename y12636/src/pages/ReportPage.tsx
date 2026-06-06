import ReportGenerator from '../components/Report/ReportGenerator';
import ErrorLocator from '../components/Report/ErrorLocator';
import MaterialTraceView from '../components/Report/MaterialTraceView';

export default function ReportPage() {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-port-border">
          <ReportGenerator />
        </div>
        <div className="w-[520px] flex flex-col overflow-hidden bg-port-panel/20">
          <div className="px-5 py-4 border-b border-port-border">
            <h2 className="text-lg font-bold text-white">学生视图：错误分析 & 材料溯源</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              重复运行结果一致，补录记录清晰，所有决策点均可人工确认溯源
            </p>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <ErrorLocator />
            <MaterialTraceView />
          </div>
        </div>
      </div>
    </div>
  );
}
