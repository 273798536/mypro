import { X, Clock, User, Image as ImageIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function HistoryDrawer() {
  const isHistoryDrawerOpen = useStore((s) => s.isHistoryDrawerOpen);
  const toggleHistoryDrawer = useStore((s) => s.toggleHistoryDrawer);
  const selectedSensorName = useStore((s) => s.selectedSensorName);
  const historicalNotes = useStore((s) => s.historicalNotes);
  const sensorData = useStore((s) => s.sensorData);

  if (!isHistoryDrawerOpen) return null;

  const sensor = sensorData.find((s) => s.sensorName === selectedSensorName);
  const notes = historicalNotes
    .filter((n) => n.sensorName === selectedSensorName)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <div className="h-full bg-[#111827] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 text-white text-sm font-semibold">
          <Clock size={14} className="text-[#00E5A0]" />
          历史备注
        </div>
        <button
          onClick={toggleHistoryDrawer}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {sensor && (
        <div className="px-3 py-2 border-b border-gray-800 shrink-0">
          <p className="text-xs text-gray-400">
            传感器: <span className="text-white">{sensor.sensorName}</span>
          </p>
          <p className="text-xs text-gray-500">
            {sensor.channel} / {sensor.cabinet} / {sensor.unit}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {notes.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">暂无历史备注</p>
        ) : (
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-700" />
            {notes.map((note) => (
              <div
                key={note.id}
                className={`relative mb-4 pl-4 border-l-2 ${
                  note.isLatest ? 'border-[#00E5A0]' : 'border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User size={10} className="text-gray-500" />
                  <span className="text-xs text-gray-400">{note.author}</span>
                  <span className="text-xs text-gray-600">
                    {note.timestamp.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{note.content}</p>
                {note.screenshotUrl && (
                  <div className="mt-2 rounded overflow-hidden border border-gray-700">
                    <img
                      src={note.screenshotUrl}
                      alt="历史截图"
                      className="w-full h-auto max-h-32 object-cover"
                    />
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800/50">
                      <ImageIcon size={10} className="text-gray-500" />
                      <span className="text-[10px] text-gray-500">旧版本截图</span>
                    </div>
                  </div>
                )}
                {!note.isLatest && (
                  <span className="text-[10px] text-gray-600 mt-1 block">
                    （历史版本，非最终值）
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
