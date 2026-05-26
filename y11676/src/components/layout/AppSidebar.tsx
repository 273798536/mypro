import CurrencyFilter from '../panels/CurrencyFilter';
import RiskFilter from '../panels/RiskFilter';
import DateRangeFilter from '../panels/DateRangeFilter';

export function AppSidebar() {
  return (
    <aside className="w-72 flex-shrink-0 border-r border-white/10 bg-[#0c1826] overflow-y-auto">
      <div className="p-4 space-y-3">
        <CurrencyFilter />
        <RiskFilter />
        <DateRangeFilter />
      </div>
    </aside>
  );
}