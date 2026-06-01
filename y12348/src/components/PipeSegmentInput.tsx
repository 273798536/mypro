import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Circle,
  Ruler,
  CircleDot,
  CornerUpRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import type { PipeSegment, DiameterUnit, LengthUnit, ElbowAngle } from '@/types';
import { PIPE_ROUGHNESS } from '@/data/valveCoefficients';
import { TechInput, TechSelect } from './common/TechInput';
import { cn } from '@/lib/utils';

interface PipeSegmentInputProps {
  segment: PipeSegment;
  index: number;
  onChange: (updates: Partial<PipeSegment>) => void;
  onRemove: () => void;
  canRemove: boolean;
  unitWarning?: string;
}

export const PipeSegmentInput: React.FC<PipeSegmentInputProps> = ({
  segment,
  index,
  onChange,
  onRemove,
  canRemove,
  unitWarning,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const diameterUnits: { value: DiameterUnit; label: string }[] = [
    { value: 'mm', label: 'mm' },
    { value: 'cm', label: 'cm' },
    { value: 'm', label: 'm' },
    { value: 'inch', label: '英寸' },
  ];

  const lengthUnits: { value: LengthUnit; label: string }[] = [
    { value: 'm', label: 'm' },
    { value: 'km', label: 'km' },
    { value: 'ft', label: '英尺' },
  ];

  const elbowAngles: { value: ElbowAngle; label: string }[] = [
    { value: 45, label: '45°' },
    { value: 90, label: '90°' },
    { value: 180, label: '180°' },
  ];

  const roughnessOptions = Object.entries(PIPE_ROUGHNESS).map(([name, value]) => ({
    value: value.toString(),
    label: `${name} (${value} mm)`,
  }));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'tech-card overflow-hidden',
        unitWarning && 'warning-glow border-warning-500/50'
      )}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary-900/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-800 rounded">
            <Circle className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={segment.name}
                onChange={(e) => onChange({ name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-transparent hover:border-primary-500 focus:border-primary-400 focus:outline-none font-medium text-industrial-text px-1"
              />
              {unitWarning && (
                <AlertTriangle className="w-4 h-4 text-warning-500" />
              )}
            </div>
            <div className="text-xs text-industrial-textMuted font-mono mt-0.5">
              Φ{segment.diameter}{segment.diameterUnit} × {segment.length}{segment.lengthUnit}
              {segment.elbowCount > 0 && ` | ${segment.elbowCount}×${segment.elbowAngle}°弯头`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 text-industrial-textMuted hover:text-danger-400 hover:bg-danger-500/10 rounded transition-colors"
              title="删除管段"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 text-industrial-textMuted hover:text-industrial-text transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-industrial-border/50">
              {unitWarning && (
                <div className="mb-4 p-3 bg-warning-500/10 border border-warning-500/30 rounded">
                  <div className="flex items-center gap-2 text-warning-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{unitWarning}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TechInput
                  label="管径"
                  type="number"
                  value={segment.diameter}
                  onChange={(e) => onChange({ diameter: Number(e.target.value) })}
                  unit={segment.diameterUnit}
                  unitOptions={diameterUnits.map((u) => u.value)}
                  onUnitChange={(u) => onChange({ diameterUnit: u as DiameterUnit })}
                  prefix={<CircleDot className="w-4 h-4" />}
                  warning={unitWarning?.includes('管径') ? '请确认单位' : undefined}
                />

                <TechInput
                  label="管长"
                  type="number"
                  value={segment.length}
                  onChange={(e) => onChange({ length: Number(e.target.value) })}
                  unit={segment.lengthUnit}
                  unitOptions={lengthUnits.map((u) => u.value)}
                  onUnitChange={(u) => onChange({ lengthUnit: u as LengthUnit })}
                  prefix={<Ruler className="w-4 h-4" />}
                  warning={unitWarning?.includes('管长') ? '请确认单位' : undefined}
                />

                <TechSelect
                  label="管壁粗糙度"
                  value={segment.roughness.toString()}
                  onChange={(e) => onChange({ roughness: Number(e.target.value) })}
                  options={roughnessOptions}
                />

                <div className="grid grid-cols-2 gap-2">
                  <TechInput
                    label="弯头数量"
                    type="number"
                    min="0"
                    value={segment.elbowCount}
                    onChange={(e) => onChange({ elbowCount: Number(e.target.value) })}
                    prefix={<CornerUpRight className="w-4 h-4" />}
                  />
                  <TechSelect
                    label="弯头角度"
                    value={segment.elbowAngle.toString()}
                    onChange={(e) => onChange({ elbowAngle: Number(e.target.value) as ElbowAngle })}
                    options={elbowAngles.map((a) => ({
                      value: a.value.toString(),
                      label: a.label,
                    }))}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
