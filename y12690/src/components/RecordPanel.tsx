import { useApp } from '../context/AppContext';
import type { InspectionRecord, RecordStatus, PipeElement, Vec3 } from '../types';

const STATUS_LABEL: Record<RecordStatus, { label: string; cls: string }> = {
  valid: { label: '可用', cls: 'bg-emerald-600/20 text-emerald-300 border-emerald-600' },
  needs_review: { label: '需复核', cls: 'bg-amber-600/20 text-amber-300 border-amber-600' },
  invalid: { label: '不可用', cls: 'bg-red-600/20 text-red-300 border-red-600' },
};

function RecordCard({ record, active, onClick }: { record: InspectionRecord; active: boolean; onClick: () => void }) {
  const status = STATUS_LABEL[record.status];
  const date = new Date(record.createdAt).toLocaleDateString('zh-CN');

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-md border cursor-pointer transition-all ${
        active
          ? 'bg-industrial-blue/20 border-blue-500 shadow-lg shadow-blue-900/30'
          : 'bg-slate-800/50 border-gray-700 hover:border-gray-500 hover:bg-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-gray-100 line-clamp-2 leading-snug">{record.name}</span>
        <span className={`status-badge border flex-shrink-0 ${status.cls}`}>{status.label}</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {record.hasDuplicates && <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-900/50 text-red-300 border border-red-700">重复</span>}
        {record.hasEmptyValues && <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-700 text-gray-300 border border-gray-600">空值</span>}
        {record.hasCoordinateIssues && <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-900/50 text-purple-300 border border-purple-700">坐标系混用</span>}
        {record.hasUnitMismatch && <span className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-900/50 text-cyan-300 border border-cyan-700">单位不统一</span>}
        {!record.timeParams.timelineSync && <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-900/50 text-orange-300 border border-orange-700">时间轴不同步</span>}
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>{date}</span>
        <span>碰撞 {record.collisions.length} · 视角 {record.viewpoints.length}</span>
      </div>
    </div>
  );
}

export default function RecordPanel() {
  const {
    records,
    activeRecord,
    setActiveRecord,
    updateRecordStatus,
    importModel,
  } = useApp();

  const handleImportDemo = () => {
    const demo: PipeElement[] = [
      { id: `demo_${Date.now()}_1`, name: '新管N-001', type: 'pipe', position: [0, 2500, 0] as Vec3, size: [5000, 250, 250] as Vec3, unit: 'mm', coordinateSystem: 'world' },
      { id: `demo_${Date.now()}_2`, name: '新支N-002', type: 'support', position: [0, 1000, 0] as Vec3, size: [400, 2000, 400] as Vec3, unit: 'mm', coordinateSystem: 'world' },
    ];
    importModel(demo, `手动导入_${new Date().toLocaleTimeString('zh-CN')}`);
  };

  return (
    <aside className="w-80 bg-tech-gray border-r border-gray-700 flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-200">检测记录</h2>
          <span className="text-xs text-gray-500">{records.length} 条</span>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-xs flex-1" onClick={handleImportDemo}>导入模型</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5">
        {records.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            暂无记录，点击上方导入
          </div>
        )}
        {records.map((rec) => (
          <RecordCard
            key={rec.id}
            record={rec}
            active={activeRecord?.id === rec.id}
            onClick={() => setActiveRecord(rec.id)}
          />
        ))}
      </div>

      {activeRecord && (
        <div className="p-3 border-t border-gray-700 bg-slate-800/50">
          <div className="text-xs text-gray-400 mb-2">标记此记录：</div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                activeRecord.status === 'valid'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-700 text-gray-300 border-gray-600 hover:bg-slate-600'
              }`}
              onClick={() => updateRecordStatus(activeRecord.id, 'valid')}
            >
              可用
            </button>
            <button
              className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                activeRecord.status === 'needs_review'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-slate-700 text-gray-300 border-gray-600 hover:bg-slate-600'
              }`}
              onClick={() => updateRecordStatus(activeRecord.id, 'needs_review')}
            >
              需复核
            </button>
            <button
              className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                activeRecord.status === 'invalid'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-slate-700 text-gray-300 border-gray-600 hover:bg-slate-600'
              }`}
              onClick={() => updateRecordStatus(activeRecord.id, 'invalid')}
            >
              不可用
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
