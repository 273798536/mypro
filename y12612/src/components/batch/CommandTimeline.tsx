import { useBatchStore } from '@/stores/useBatchStore';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { formatTimestamp, getRiskLevelColor } from '@/utils/helpers';
import {
  Move,
  FileUp,
  MessageSquare,
  Edit3,
  Trash2,
  Layers,
  Filter,
  RefreshCw,
  Clock,
  ChevronRight,
  MapPin,
} from 'lucide-react';

const COMMAND_ICONS: Record<string, typeof Move> = {
  device_drag: Move,
  device_import: FileUp,
  annotation_add: MessageSquare,
  annotation_edit: Edit3,
  annotation_delete: Trash2,
  device_delete: Trash2,
  layer_toggle: Layers,
  filter_apply: Filter,
  coordinate_correction: RefreshCw,
};

const COMMAND_COLORS: Record<string, string> = {
  device_drag: '#3182ce',
  device_import: '#805ad5',
  annotation_add: '#38a169',
  annotation_edit: '#dd6b20',
  annotation_delete: '#e53e3e',
  device_delete: '#e53e3e',
  layer_toggle: '#2d3748',
  filter_apply: '#d69e2e',
  coordinate_correction: '#ed8936',
};

export function CommandTimeline() {
  const { currentBatch, highlightedCommandId, setHighlightedCommand, operator } =
    useBatchStore();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  const commands = currentBatch.commands.slice(0, currentBatch.currentIndex + 1);
  const futureCommands = currentBatch.commands.slice(currentBatch.currentIndex + 1);

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-bold text-[#1e3a5f] flex items-center gap-2">
          <Clock size={18} />
          批处理记录
        </h2>
        <div className="text-xs text-gray-500 mt-1">
          运行ID: <span className="font-mono text-[#1e3a5f]">{currentBatch.runId}</span>
        </div>
        <div className="text-xs text-gray-500">
          操作人: <span className="font-medium">{operator}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded text-sm transition-colors ${
            canUndo
              ? 'bg-[#1e3a5f] text-white hover:bg-[#2a4a7a]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronRight
            size={16}
            className="rotate-180"
          />
          撤销
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded text-sm transition-colors ${
            canRedo
              ? 'bg-[#1e3a5f] text-white hover:bg-[#2a4a7a]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          重做
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative px-4 py-3">
          <div className="absolute left-7 top-6 bottom-3 w-0.5 bg-gray-200" />

          {commands.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              暂无操作记录
            </div>
          )}

          {commands.map((cmd, index) => {
            const Icon = COMMAND_ICONS[cmd.type] || MapPin;
            const color = COMMAND_COLORS[cmd.type] || '#718096';
            const isHighlighted = highlightedCommandId === cmd.id;
            const isCurrent = index === currentBatch.currentIndex;

            return (
              <div
                key={cmd.id}
                className={`relative pl-12 pb-4 cursor-pointer transition-all ${
                  isHighlighted ? 'scale-[1.02]' : 'hover:bg-gray-50 rounded'
                }`}
                onMouseEnter={() => setHighlightedCommand(cmd.id)}
                onMouseLeave={() => setHighlightedCommand(null)}
              >
                <div
                  className={`absolute left-5 w-4 h-4 rounded-full border-2 bg-white transition-all ${
                    isHighlighted || isCurrent ? 'scale-125' : ''
                  }`}
                  style={{ borderColor: color, backgroundColor: isCurrent ? color : 'white' }}
                />

                <div
                  className={`p-2.5 rounded border transition-all ${
                    isHighlighted
                      ? 'border-blue-300 bg-blue-50'
                      : isCurrent
                        ? 'border-[#1e3a5f] bg-blue-50/50'
                        : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="p-1.5 rounded flex-shrink-0"
                      style={{ backgroundColor: color + '20', color }}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">
                        {cmd.description}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatTimestamp(cmd.timestamp)}
                      </div>
                      {cmd.type === 'annotation_add' && (
                        <div className="mt-1 text-xs bg-gray-50 p-2 rounded">
                          <div className="text-gray-600">
                            {
                              (cmd.payload as { annotation: { content: string } })
                                .annotation.content
                            }
                          </div>
                          <div className="text-blue-600 mt-0.5">
                            意见:{' '}
                            {
                              (cmd.payload as { annotation: { opinion: string } })
                                .annotation.opinion
                            }
                          </div>
                        </div>
                      )}
                      {cmd.type === 'coordinate_correction' && (
                        <div
                          className="mt-1 text-xs bg-amber-50 text-amber-800 p-2 rounded"
                        >
                          {(cmd.payload as { reason: string }).reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {futureCommands.length > 0 && (
            <>
              <div className="text-xs text-center text-amber-600 py-2 font-medium">
                — 已撤销的操作 ({futureCommands.length}) —
              </div>
              {futureCommands.map((cmd) => {
                const Icon = COMMAND_ICONS[cmd.type] || MapPin;
                const color = COMMAND_COLORS[cmd.type] || '#718096';

                return (
                  <div
                    key={cmd.id}
                    className="relative pl-12 pb-4 opacity-40"
                  >
                    <div
                      className="absolute left-5 w-4 h-4 rounded-full border-2 border-dashed bg-white"
                      style={{ borderColor: color }}
                    />
                    <div className="p-2.5 rounded border border-gray-200 border-dashed">
                      <div className="flex items-start gap-2">
                        <div
                          className="p-1.5 rounded flex-shrink-0"
                          style={{ backgroundColor: color + '20', color }}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500">
                            {cmd.description}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatTimestamp(cmd.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        操作 {currentBatch.currentIndex + 1} / {currentBatch.commands.length}
        <span className="float-right">
          <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px]">Ctrl+Z</kbd> 撤销{' '}
          <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px]">Ctrl+Y</kbd> 重做
        </span>
      </div>
    </div>
  );
}
