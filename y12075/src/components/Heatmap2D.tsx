import { useAppStore } from '../store/appStore';
import { splToColor, getSPLRange } from '../utils/acoustics';

export default function Heatmap2D() {
  const { seats, seatPressures, activeSections, musicians, selectedSeatId, selectSeat } = useAppStore();
  const splRange = getSPLRange(seatPressures);

  const activeMusicianIds = musicians
    .filter((m) => activeSections.has(m.sectionId) && m.position)
    .map((m) => m.id);

  const maxRow = Math.max(...seats.map((s) => s.row));
  const maxCol = Math.max(...seats.map((s) => s.col));

  const getFilteredSPL = (seatId: string) => {
    const sp = seatPressures.find((p) => p.seatId === seatId);
    const filtered = sp?.contributions.filter((c) => activeMusicianIds.includes(c.musicianId)) || [];
    if (filtered.length === 0) return 40;
    const energySum = filtered.reduce((sum, c) => sum + Math.pow(10, c.spl / 10), 0);
    return 10 * Math.log10(energySum || 1e-10);
  };

  return (
    <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
      <h3 className="text-sm font-semibold text-[#F5F0E8] mb-3 font-['DM_Sans']">座位热力图</h3>

      <div className="flex gap-4 mb-3">
        <div className="flex-1 h-2 rounded" style={{
          background: 'linear-gradient(to right, #1E76DC, #4AE885, #FFE040, #FF3020)'
        }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-3">
        <span>{splRange.min} dB</span>
        <span>{Math.round((splRange.min + splRange.max) / 2)} dB</span>
        <span>{splRange.max} dB</span>
      </div>

      <div className="overflow-x-auto">
        <div className="grid gap-0.5" style={{
          gridTemplateColumns: `repeat(${maxCol}, 16px)`,
          gridTemplateRows: `repeat(${maxRow}, 12px)`,
        }}>
          {seats.map((seat) => {
            const spl = getFilteredSPL(seat.id);
            const isSelected = selectedSeatId === seat.id;
            return (
              <div
                key={seat.id}
                className={`cursor-pointer transition-transform ${isSelected ? 'ring-1 ring-white z-10 scale-125' : 'hover:scale-110'}`}
                style={{
                  gridRow: seat.row,
                  gridColumn: seat.col,
                  backgroundColor: splToColor(spl, splRange.min, splRange.max),
                  borderRadius: 2,
                }}
                onClick={() => selectSeat(isSelected ? null : seat.id)}
                title={`${seat.id}: ${Math.round(spl)} dB`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
