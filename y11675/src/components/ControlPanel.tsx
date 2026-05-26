import { useState } from 'react';
import { Plus, Minus, Trash2, GripVertical, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Charge } from '@/types';

export function ControlPanel() {
  const {
    charges,
    selectedChargeId,
    selectCharge,
    addCharge,
    removeCharge,
    updateChargeValue,
    loadPreset
  } = useStore();

  const [newChargeValue, setNewChargeValue] = useState(1);

  const handleAddCharge = () => {
    const x = (Math.random() - 0.5) * 4;
    const y = (Math.random() - 0.5) * 2;
    const z = (Math.random() - 0.5) * 2;
    addCharge({ x, y, z }, newChargeValue);
  };

  return (
    <div className="w-72 bg-slate-900/90 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          电荷控制
        </h2>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-2 block">预设场景</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => loadPreset('monopole')}
              className="px-2 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded text-xs text-white transition-colors"
            >
              单电荷
            </button>
            <button
              onClick={() => loadPreset('dipole')}
              className="px-2 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded text-xs text-white transition-colors"
            >
              电偶极子
            </button>
            <button
              onClick={() => loadPreset('quadrupole')}
              className="px-2 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded text-xs text-white transition-colors"
            >
              四极子
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-2 block">新增电荷电量</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={newChargeValue}
              onChange={(e) => setNewChargeValue(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-500"
            />
            <span className={`text-sm font-mono w-12 text-right ${
              newChargeValue > 0 ? 'text-red-400' : newChargeValue < 0 ? 'text-cyan-400' : 'text-slate-400'
            }`}>
              {newChargeValue.toFixed(1)}
            </span>
          </div>
        </div>

        <button
          onClick={handleAddCharge}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加电荷
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <label className="text-xs text-slate-400 mb-2 block">电荷列表</label>
        {charges.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-8">
            暂无电荷
          </div>
        ) : (
          charges.map(charge => (
            <ChargeItem
              key={charge.id}
              charge={charge}
              isSelected={selectedChargeId === charge.id}
              onSelect={() => selectCharge(charge.id)}
              onRemove={() => removeCharge(charge.id)}
              onUpdateValue={(val) => updateChargeValue(charge.id, val)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ChargeItemProps {
  charge: Charge;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onUpdateValue: (value: number) => void;
}

function ChargeItem({ charge, isSelected, onSelect, onRemove, onUpdateValue }: ChargeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(charge.charge);

  const handleValueCommit = () => {
    onUpdateValue(tempValue);
    setIsEditing(false);
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-slate-700/80 border-cyan-500/50'
          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: charge.color }}
          />
          <span className="text-sm text-slate-300">
            {charge.id}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 hover:bg-red-500/20 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400" />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">电量</span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-16 px-1 py-0.5 bg-slate-700 rounded text-xs text-white"
                autoFocus
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleValueCommit();
                }}
                className="text-cyan-400 hover:text-cyan-300"
              >
                ✓
              </button>
            </div>
          ) : (
            <span
              className={`font-mono ${
                charge.charge > 0 ? 'text-red-400' : charge.charge < 0 ? 'text-cyan-400' : 'text-slate-400'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setTempValue(charge.charge);
                setIsEditing(true);
              }}
            >
              {charge.charge > 0 ? '+' : ''}{charge.charge.toFixed(2)} C
            </span>
          )}
        </div>

        <div className="text-xs text-slate-500">
          位置: ({charge.position.x.toFixed(2)}, {charge.position.y.toFixed(2)}, {charge.position.z.toFixed(2)})
        </div>
      </div>
    </div>
  );
}
