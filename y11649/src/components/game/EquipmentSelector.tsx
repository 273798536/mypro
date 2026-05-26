import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { equipmentData } from '@/data/equipment';
import type { EquipmentType } from '@/types';
import { Check } from 'lucide-react';

interface EquipmentSelectorProps {
  selected: EquipmentType[];
  onChange: (equipment: EquipmentType[]) => void;
  required?: EquipmentType[];
}

export const EquipmentSelector = ({ selected, onChange, required = [] }: EquipmentSelectorProps) => {
  const toggleEquipment = (type: EquipmentType) => {
    if (selected.includes(type)) {
      onChange(selected.filter(e => e !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {equipmentData.map(equip => {
        const isSelected = selected.includes(equip.type);
        const isRequired = required.includes(equip.type);

        return (
          <button
            key={equip.type}
            onClick={() => toggleEquipment(equip.type)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              isSelected
                ? 'border-snow-blue-500 bg-snow-blue-50'
                : isRequired
                ? 'border-orange-300 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{equip.name}</span>
              {isSelected && (
                <Check size={16} className="text-snow-blue-500" />
              )}
            </div>
            <p className="text-xs text-gray-500">{equip.description}</p>
            {isRequired && !isSelected && (
              <span className="text-xs text-orange-600 mt-1 block">* 建议配备</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
