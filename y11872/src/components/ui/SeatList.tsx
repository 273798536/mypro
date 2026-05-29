import { List, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useTheaterStore } from '@/store/theaterStore';
import { Seat } from '@/types';

const sectionColors: Record<string, string> = {
  orchestra: 'bg-yellow-900/30 text-yellow-400',
  mezzanine: 'bg-red-900/30 text-red-400',
  balcony: 'bg-purple-900/30 text-purple-400',
};

const sectionNames: Record<string, string> = {
  orchestra: '管弦乐',
  mezzanine: '中层',
  balcony: '阳台',
};

export function SeatList() {
  const filteredSeats = useTheaterStore((state) => state.getFilteredSeats());
  const selectedSeat = useTheaterStore((state) => state.selectedSeat);
  const setSelectedSeat = useTheaterStore((state) => state.setSelectedSeat);
  const filters = useTheaterStore((state) => state.filters);

  const getVisibilityIcon = (seat: Seat) => {
    if (!seat.visibility) return null;
    
    const isBlocked =
      !seat.visibility.stage.visible ||
      !seat.visibility.leftScreen.visible ||
      !seat.visibility.rightScreen.visible;
    
    const isPartial =
      seat.visibility.stage.confidence === 'medium' ||
      seat.visibility.leftScreen.confidence === 'medium' ||
      seat.visibility.rightScreen.confidence === 'medium';
    
    if (isBlocked) {
      return <EyeOff size={14} className="text-theater-red" />;
    }
    if (isPartial) {
      return <AlertTriangle size={14} className="text-theater-warning" />;
    }
    return <Eye size={14} className="text-theater-success" />;
  };

  return (
    <div className="bg-theater-dark border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <h3 className="text-theater-gold font-display text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <List size={18} />
            座位列表
          </span>
          <span className="text-sm text-gray-400 font-normal">
            共 {filteredSeats.length} 个
          </span>
        </h3>
        {(filters.section !== 'all' || filters.visibility !== 'all' || filters.searchText) && (
          <p className="text-xs text-gray-500 mt-1">已筛选</p>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {filteredSeats.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <List size={32} className="mx-auto mb-2 opacity-50" />
            <p>没有符合条件的座位</p>
            <p className="text-xs mt-1">请调整筛选条件</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {filteredSeats.map((seat) => (
              <button
                key={seat.id}
                onClick={() => setSelectedSeat(seat)}
                className={`w-full p-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors text-left ${
                  selectedSeat?.id === seat.id ? 'bg-theater-gold/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded flex items-center justify-center font-mono font-bold text-sm ${
                      sectionColors[seat.section]
                    }`}
                  >
                    {seat.row}{seat.number}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">
                      {seat.row}排 {seat.number}座
                    </div>
                    <div className="text-gray-500 text-xs">
                      {sectionNames[seat.section]}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-theater-gold font-mono text-sm">
                    ¥{seat.price}
                  </span>
                  {getVisibilityIcon(seat)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
