import { X, FileText, User, Calendar, Tag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatDate, getSourceLabel, getSourceColor } from '../../utils/colorUtils';
import { cn } from '../../lib/utils';

export function SelectionPanel() {
  const { selectedOrganId, organs, doses, notes, selectOrgan } = useAppStore();

  const selectedOrgan = organs.find((o) => o.id === selectedOrganId);
  const organDoses = doses.filter((d) => d.organId === selectedOrganId);
  const organNotes = notes.filter((n) => n.organId === selectedOrganId);

  if (!selectedOrgan) {
    return (
      <div className="p-4 text-center text-slate-500">
        <FileText size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">点击3D视图中的器官查看详情</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg"
            style={{ backgroundColor: selectedOrgan.color }}
          />
          <div>
            <h3 className="font-semibold text-white">{selectedOrgan.name}</h3>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full text-white',
              getSourceColor(selectedOrgan.source)
            )}>
              {getSourceLabel(selectedOrgan.source)}
            </span>
          </div>
        </div>
        <button
          onClick={() => selectOrgan(null)}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
            <Tag size={12} />
            版本
          </div>
          <div className="text-white font-medium">{selectedOrgan.version}</div>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
            <User size={12} />
            导入者
          </div>
          <div className="text-white font-medium">{selectedOrgan.importedBy}</div>
        </div>
      </div>

      <div className="p-3 bg-slate-800/50 rounded-lg">
        <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
          <Calendar size={12} />
          导入时间
        </div>
        <div className="text-white text-sm">{formatDate(selectedOrgan.importTime)}</div>
      </div>

      <div className="p-3 bg-slate-800/50 rounded-lg">
        <div className="text-slate-400 text-xs mb-2">位置坐标</div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="text-red-400 text-xs">X</div>
            <div className="text-white">{selectedOrgan.position[0].toFixed(1)}</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 text-xs">Y</div>
            <div className="text-white">{selectedOrgan.position[1].toFixed(1)}</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 text-xs">Z</div>
            <div className="text-white">{selectedOrgan.position[2].toFixed(1)}</div>
          </div>
        </div>
      </div>

      {organDoses.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">关联剂量</h4>
          <div className="space-y-2">
            {organDoses.map((dose) => (
              <div key={dose.id} className="p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm">{dose.name}</span>
                  <span className="text-xs text-slate-400">{dose.version}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">最小</div>
                    <div className="text-white">{dose.minDose.toFixed(1)}Gy</div>
                  </div>
                  <div>
                    <div className="text-slate-400">平均</div>
                    <div className="text-white">{dose.meanDose.toFixed(1)}Gy</div>
                  </div>
                  <div>
                    <div className="text-slate-400">最大</div>
                    <div className={dose.maxDose > dose.threshold ? 'text-red-400' : 'text-white'}>
                      {dose.maxDose.toFixed(1)}Gy
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {organNotes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">医生备注</h4>
          <div className="space-y-2">
            {organNotes.map((note) => (
              <div key={note.id} className="p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm">{note.author}</span>
                  <span className="text-xs text-slate-400">{formatDate(note.createTime)}</span>
                </div>
                <p className="text-slate-300 text-sm">{note.content}</p>
                <div className="flex gap-1 mt-2">
                  {note.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
