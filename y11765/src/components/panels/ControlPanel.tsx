import { useState } from 'react';
import {
  Zap,
  RotateCcw,
  Layers,
  Palette,
  ChevronDown,
  ChevronUp,
  Power,
  ArrowLeftRight,
  Sliders,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CoilDirection } from '../../types';

interface PanelSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const PanelSection = ({ title, icon, children, defaultOpen = true }: PanelSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div className="p-3 pt-0 space-y-3">{children}</div>}
    </div>
  );
};

export const ControlPanel = () => {
  const { motorConfig, updateCoil, setMotorConfig, resetConfig, addOperation } = useAppStore();

  const handleCoilCurrentChange = (coilId: string, current: number) => {
    const coil = motorConfig.coils.find((c) => c.id === coilId);
    const oldValue = coil?.current;

    updateCoil(coilId, { current });
    addOperation({
      type: 'coil_current',
      previousValue: oldValue,
      newValue: current,
      sourceRef: `ControlPanel.tsx:handleCoilCurrentChange:${coilId}`,
      description: `线圈 ${coil?.name} 电流从 ${oldValue}A 改为 ${current}A`,
    });
  };

  const handleCoilDirectionChange = (coilId: string, direction: CoilDirection) => {
    const coil = motorConfig.coils.find((c) => c.id === coilId);
    const oldValue = coil?.direction;

    updateCoil(coilId, { direction });
    addOperation({
      type: 'coil_current',
      previousValue: oldValue,
      newValue: direction,
      sourceRef: `ControlPanel.tsx:handleCoilDirectionChange:${coilId}`,
      description: `线圈 ${coil?.name} 方向从 ${oldValue} 改为 ${direction}`,
    });
  };

  const handleCoilToggle = (coilId: string, enabled: boolean) => {
    const coil = motorConfig.coils.find((c) => c.id === coilId);
    const oldValue = coil?.enabled;

    updateCoil(coilId, { enabled });
    addOperation({
      type: 'coil_current',
      previousValue: oldValue,
      newValue: enabled,
      sourceRef: `ControlPanel.tsx:handleCoilToggle:${coilId}`,
      description: `线圈 ${coil?.name} ${enabled ? '启用' : '禁用'}`,
    });
  };

  const handleRotorAngleChange = (angle: number) => {
    const oldValue = motorConfig.rotorAngle;

    setMotorConfig({ rotorAngle: angle });
    addOperation({
      type: 'rotor_angle',
      previousValue: oldValue,
      newValue: angle,
      sourceRef: 'ControlPanel.tsx:handleRotorAngleChange',
      description: `转子角度从 ${oldValue}° 改为 ${angle}°`,
    });
  };

  const handleSectionPositionChange = (position: number) => {
    const oldValue = motorConfig.sectionPlane.position;

    setMotorConfig({
      sectionPlane: { ...motorConfig.sectionPlane, position },
    });
    addOperation({
      type: 'section_adjust',
      previousValue: oldValue,
      newValue: position,
      sourceRef: 'ControlPanel.tsx:handleSectionPositionChange',
      description: `剖面位置从 ${oldValue} 改为 ${position}`,
    });
  };

  return (
    <div className="w-80 bg-slate-900/95 text-white h-full overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sliders size={20} className="text-blue-400" />
          参数控制
        </h2>
      </div>

      <div className="flex-1">
        <PanelSection title="线圈控制" icon={<Zap size={16} className="text-yellow-400" />}>
          {motorConfig.coils.map((coil) => (
            <div
              key={coil.id}
              className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: coil.color }}
                  />
                  <span className="text-sm font-medium">{coil.name}</span>
                </div>
                <button
                  onClick={() => handleCoilToggle(coil.id, !coil.enabled)}
                  className={`p-1.5 rounded transition-colors ${
                    coil.enabled
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-700 text-slate-500'
                  }`}
                >
                  <Power size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>电流 (A)</span>
                    <span className="text-blue-400 font-mono">{coil.current}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={coil.current}
                    onChange={(e) =>
                      handleCoilCurrentChange(coil.id, parseFloat(e.target.value))
                    }
                    disabled={!coil.enabled}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <ArrowLeftRight size={12} />
                      方向
                    </span>
                    <span className="text-blue-400">
                      {coil.direction === 'clockwise' ? '顺时针' : '逆时针'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCoilDirectionChange(coil.id, 'clockwise')}
                      disabled={!coil.enabled}
                      className={`flex-1 py-1 text-xs rounded transition-colors ${
                        coil.direction === 'clockwise'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      顺时针
                    </button>
                    <button
                      onClick={() => handleCoilDirectionChange(coil.id, 'counterclockwise')}
                      disabled={!coil.enabled}
                      className={`flex-1 py-1 text-xs rounded transition-colors ${
                        coil.direction === 'counterclockwise'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      逆时针
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </PanelSection>

        <PanelSection title="转子控制" icon={<RotateCcw size={16} className="text-green-400" />}>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>角度 (°)</span>
              <span className="text-green-400 font-mono">{motorConfig.rotorAngle}</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={motorConfig.rotorAngle}
              onChange={(e) => handleRotorAngleChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMotorConfig({ showRotor: !motorConfig.showRotor })}
              className={`flex-1 py-2 text-xs rounded transition-colors ${
                motorConfig.showRotor
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {motorConfig.showRotor ? '显示转子' : '隐藏转子'}
            </button>
            <button
              onClick={() => setMotorConfig({ showStator: !motorConfig.showStator })}
              className={`flex-1 py-2 text-xs rounded transition-colors ${
                motorConfig.showStator
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {motorConfig.showStator ? '显示定子' : '隐藏定子'}
            </button>
          </div>
        </PanelSection>

        <PanelSection title="剖面控制" icon={<Layers size={16} className="text-purple-400" />}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs">启用剖面</span>
            <button
              onClick={() =>
                setMotorConfig({
                  sectionPlane: {
                    ...motorConfig.sectionPlane,
                    visible: !motorConfig.sectionPlane.visible,
                  },
                })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                motorConfig.sectionPlane.visible ? 'bg-purple-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  motorConfig.sectionPlane.visible ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {motorConfig.sectionPlane.visible && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>位置</span>
                  <span className="text-purple-400 font-mono">
                    {motorConfig.sectionPlane.position.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.1"
                  value={motorConfig.sectionPlane.position}
                  onChange={(e) =>
                    handleSectionPositionChange(parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </>
          )}
        </PanelSection>

        <PanelSection title="显示设置" icon={<Palette size={16} className="text-pink-400" />}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs">磁场箭头</span>
            <button
              onClick={() =>
                setMotorConfig({ showFieldArrows: !motorConfig.showFieldArrows })
              }
              className={`w-12 h-6 rounded-full transition-colors ${
                motorConfig.showFieldArrows ? 'bg-pink-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  motorConfig.showFieldArrows ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {motorConfig.showFieldArrows && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>箭头密度</span>
                  <span className="text-pink-400 font-mono">{motorConfig.arrowDensity}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={motorConfig.arrowDensity}
                  onChange={(e) =>
                    setMotorConfig({ arrowDensity: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>箭头缩放</span>
                  <span className="text-pink-400 font-mono">{motorConfig.arrowScale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={motorConfig.arrowScale}
                  onChange={(e) =>
                    setMotorConfig({ arrowScale: parseFloat(e.target.value) })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>
            </>
          )}

          <div>
            <div className="text-xs mb-2">颜色映射方案</div>
            <div className="grid grid-cols-2 gap-1">
              {(['viridis', 'plasma', 'jet', 'rainbow'] as const).map((map) => (
                <button
                  key={map}
                  onClick={() =>
                    setMotorConfig({
                      colorScale: { ...motorConfig.colorScale, colormap: map },
                    })
                  }
                  className={`py-1 text-xs rounded capitalize transition-colors ${
                    motorConfig.colorScale.colormap === map
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {map}
                </button>
              ))}
            </div>
          </div>
        </PanelSection>
      </div>

      <div className="p-3 border-t border-slate-700">
        <button
          onClick={resetConfig}
          className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm flex items-center justify-center gap-2"
        >
          <RotateCcw size={14} />
          重置所有参数
        </button>
      </div>
    </div>
  );
};
