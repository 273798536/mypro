import { useState } from 'react';
import CalendarGrid from '../components/calendar/CalendarGrid';
import DayDetailDrawer from '../components/calendar/DayDetailDrawer';
import BalanceChart from '../components/forecast/BalanceChart';
import FilterBar from '../components/common/FilterBar';
import EditEntryDialog from '../components/common/EditEntryDialog';
import { useCashflowStore } from '../store/useCashflowStore';
import type { CashflowEntry } from '../types';
import { format, startOfMonth } from 'date-fns';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEntry, setEditingEntry] = useState<CashflowEntry | null>(null);

  const filters = useCashflowStore(state => state.filters);
  const setFilters = useCashflowStore(state => state.setFilters);
  const currentScenario = useCashflowStore(state => state.currentScenario);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">现金流压力日历</h1>
          <p className="text-sm text-gray-500 mt-1">
            当前方案: {currentScenario?.name || '未选择'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <CalendarGrid
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onMonthChange={setCurrentMonth}
            onDateSelect={setSelectedDate}
          />

          <BalanceChart days={90} />
        </div>

        <div className="space-y-6">
          <FilterBar
            filters={filters}
            onChange={setFilters}
          />

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="font-medium text-gray-800 mb-3">图例说明</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">资金流入</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">资金流出</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-yellow-400 bg-yellow-50"></div>
                <span className="text-gray-600">警告 - 需要关注</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50"></div>
                <span className="text-gray-600">危险 - 余额可能穿透</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayDetailDrawer
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onEditEntry={setEditingEntry}
        />
      )}

      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}