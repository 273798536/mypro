import { useAppStore } from '../store/useAppStore';
import type { FilterStatus } from '../types';
import RecordCard from '../components/record/RecordCard';

const filterTabs: { key: FilterStatus; label: string; color: string }[] = [
  { key: 'all', label: '全部', color: 'lab-blue' },
  { key: 'passed', label: '已通过', color: 'lab-green' },
  { key: 'pending', label: '待确认', color: 'lab-yellow' },
  { key: 'error', label: '异常', color: 'lab-red' },
];

export default function RecordList() {
  const { filterStatus, setFilterStatus, getFilteredRecords, getCounts, currentRole } = useAppStore();
  const counts = getCounts();
  const records = getFilteredRecords();

  const roleHint =
    currentRole === 'student'
      ? '学生视角：绿色数据可直接使用，黄色/红色数据请联系环境监测员'
      : currentRole === 'teacher'
      ? '教师视角：可查看全部数据并使用教师讲解文案'
      : '环境监测员视角：按待确认优先排序，点击记录进入详情复核';

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-3xl text-lab-blue font-bold mb-2">实验记录列表</h2>
        <p className="text-sm text-gray-500">{roleHint}</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {filterTabs.map((tab) => {
          const isActive = filterStatus === tab.key;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm transition-all btn-press ${
                isActive
                  ? `bg-${tab.color} text-white shadow-md`
                  : 'bg-white text-gray-600 hover:bg-paper border border-paper-dark'
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-paper-dark text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-sm-plus border border-dashed border-paper-dark">
          当前筛选条件下暂无记录
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {records.map((record, idx) => (
            <RecordCard key={record.id} record={record} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
