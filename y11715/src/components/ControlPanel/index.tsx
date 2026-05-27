import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Save } from 'lucide-react';
import { Slider } from './Slider';
import { useLensStore } from '../../store/useLensStore';
import { CONSTANTS } from '../../types';
import { validateParameters } from '../../physics/lensCalculator';

export const ControlPanel: React.FC = () => {
  const { lensState, setFocalLength, setObjectDistance, reset, saveStep } = useLensStore();

  const validation = validateParameters(lensState.focalLength, lensState.objectDistance);
  const hasCriticalWarning = validation.warnings.some(w => w.severity === 'critical');

  return (
    <motion.div
      className="glass-panel rounded-xl p-5 space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">参数控制</h2>
        <div className="flex gap-2">
          <button
            onClick={() => reset()}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
            title="重置参数"
          >
            <RotateCcw className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={() => saveStep()}
            className="p-2 rounded-lg bg-optical-accent/20 hover:bg-optical-accent/30 transition-colors"
            title="保存当前状态"
          >
            <Save className="w-4 h-4 text-optical-accent" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <Slider
          label="焦距 f"
          value={lensState.focalLength}
          min={CONSTANTS.MIN_FOCAL_LENGTH}
          max={CONSTANTS.MAX_FOCAL_LENGTH}
          step={0.5}
          unit="cm"
          onChange={setFocalLength}
          accentColor="#3b82f6"
        />

        <Slider
          label="物距 u"
          value={lensState.objectDistance}
          min={CONSTANTS.MIN_OBJECT_DISTANCE}
          max={CONSTANTS.MAX_OBJECT_DISTANCE}
          step={0.5}
          unit="cm"
          onChange={setObjectDistance}
          accentColor="#f97316"
        />
      </div>

      {hasCriticalWarning && (
        <motion.div
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-sm text-red-400">
            ⚠️ 当前参数处于特殊区域，请注意观察光线变化
          </p>
        </motion.div>
      )}

      <div className="pt-2 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">
          提示：拖拽滑块调整参数，3D场景会实时更新。鼠标拖拽可旋转视角，滚轮缩放。
        </p>
      </div>
    </motion.div>
  );
};
