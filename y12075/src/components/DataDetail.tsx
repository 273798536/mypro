import { useAppStore } from '../store/appStore';
import { Music, User, AlertTriangle, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function DataDetail() {
  const {
    selectedSeatId,
    selectedMusicianId,
    seats,
    seatPressures,
    musicians,
    instrumentSPLs,
    sections,
    updateInstrumentSPL,
  } = useAppStore();

  const [editingSpl, setEditingSpl] = useState<string | null>(null);
  const [newSplValue, setNewSplValue] = useState<string>('');

  const selectedSeat = seats.find((s) => s.id === selectedSeatId);
  const selectedSeatPressure = seatPressures.find((p) => p.seatId === selectedSeatId);
  const selectedMusician = musicians.find((m) => m.id === selectedMusicianId);
  const selectedMusicianSPL = instrumentSPLs.find((s) => s.musicianId === selectedMusicianId);

  const handleSaveSpl = () => {
    if (editingSpl && newSplValue) {
      const value = parseFloat(newSplValue);
      if (!isNaN(value) && value >= 0 && value <= 140) {
        updateInstrumentSPL(editingSpl, value);
        setEditingSpl(null);
        setNewSplValue('');
      }
    }
  };

  if (!selectedSeat && !selectedMusician) {
    return (
      <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
        <h3 className="text-sm font-semibold text-[#F5F0E8] mb-3 font-['DM_Sans']">数据明细</h3>
        <p className="text-sm text-gray-400 text-center py-8">点击3D视图中的座位或乐手查看详细数据</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C] max-h-64 overflow-y-auto">
      <h3 className="text-sm font-semibold text-[#F5F0E8] mb-3 font-['DM_Sans']">数据明细</h3>

      {selectedSeat && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-[#D4A843]" />
            <span className="text-[#F5F0E8] font-medium">
              座位 {selectedSeat.row}排 {selectedSeat.col}座
            </span>
          </div>
          <div className="pl-6 text-sm">
            <div className="text-gray-400">总声压级: <span className="text-[#F5F0E8]">{selectedSeatPressure?.totalSPL || '-'} dB</span></div>
          </div>

          <div className="pl-6">
            <div className="text-xs text-gray-500 mb-1">各声部贡献:</div>
            <div className="space-y-1">
              {sections.map((section) => {
                const contributions = selectedSeatPressure?.contributions.filter(
                  (c) => musicians.find((m) => m.id === c.musicianId)?.sectionId === section.id
                ) || [];
                const totalSection = contributions.reduce((sum, c) => sum + Math.pow(10, c.spl / 10), 0);
                const sectionSPL = totalSection > 0 ? 10 * Math.log10(totalSection) : 0;
                if (sectionSPL < 40) return null;
                return (
                  <div key={section.id} className="flex items-center justify-between text-xs">
                    <span style={{ color: section.color }}>{section.name}</span>
                    <span className="text-gray-300">{Math.round(sectionSPL)} dB</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedMusician && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-[#D4A843]" />
            <span className="text-[#F5F0E8] font-medium">{selectedMusician.name}</span>
          </div>
          <div className="pl-6 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">乐器:</span>
              <span className="text-[#F5F0E8]">{selectedMusician.instrument}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">声部:</span>
              <span style={{ color: sections.find((s) => s.id === selectedMusician.sectionId)?.color }}>
                {sections.find((s) => s.id === selectedMusician.sectionId)?.name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">声压级:</span>
              {editingSpl === selectedMusician.id ? (
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={newSplValue}
                    onChange={(e) => setNewSplValue(e.target.value)}
                    className="w-16 px-1 py-0.5 text-xs bg-[#1a2d4a] border border-[#D4A843] rounded text-[#F5F0E8]"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSpl()}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveSpl}
                    className="px-2 py-0.5 text-xs bg-[#D4A843] text-[#0a1628] rounded"
                  >
                    保存
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingSpl(selectedMusician.id);
                    setNewSplValue(String(selectedMusicianSPL?.spl ?? ''));
                  }}
                  className={`text-sm ${selectedMusicianSPL?.spl === null ? 'text-red-400' : 'text-[#F5F0E8]'} hover:underline`}
                >
                  {selectedMusicianSPL?.spl !== null
                    ? `${selectedMusicianSPL.spl} dB`
                    : <span className="flex items-center gap-1"><AlertTriangle size={12} />缺失</span>}
                  {selectedMusicianSPL?.isEstimated && ' (估算)'}
                </button>
              )}
            </div>
            {selectedMusician.remark && (
              <div className="flex items-start gap-1 pt-1">
                <MessageSquare size={12} className="text-gray-500 mt-0.5" />
                <span className="text-xs text-gray-400">{selectedMusician.remark}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
