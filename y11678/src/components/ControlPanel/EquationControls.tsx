import { useCallback } from 'react';
import { Calculator } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { classifySurface } from '../../math/quadric';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function SliderInput({ label, value, onChange, min = -5, max = 5, step = 0.1 }: SliderInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-space-300">{label}</span>
        <input
          type="number"
          value={value.toFixed(2)}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 input-control text-sm text-right"
          step={step}
        />
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

export function EquationControls() {
  const equation = useStore((state) => state.surface.equation);
  const setEquation = useStore((state) => state.setEquation);
  const surfaceName = useStore((state) => state.surface.name);
  const source = useStore((state) => state.surface.source);

  const surfaceType = classifySurface(equation);

  const handleChange = useCallback(
    (key: keyof typeof equation, value: number) => {
      setEquation({ [key]: value });
    },
    [setEquation]
  );

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator size={18} className="text-primary-500" />
        <h3 className="font-display text-lg font-semibold text-primary-500">
          曲面方程
        </h3>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-space-200">
          <span className="text-space-400">当前曲面:</span> {surfaceType}
        </div>
        <div className="text-xs text-space-400">
          Ax² + By² + Cz² + Dxy + Eyz + Fzx + Gx + Hy + Iz + J = 0
        </div>
        {source && (
          <div className="text-xs text-space-500 mt-1">
            来源: {source}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <SliderInput label="A (x²)" value={equation.A} onChange={(v) => handleChange('A', v)} min={-2} max={2} />
          <SliderInput label="B (y²)" value={equation.B} onChange={(v) => handleChange('B', v)} min={-2} max={2} />
          <SliderInput label="C (z²)" value={equation.C} onChange={(v) => handleChange('C', v)} min={-2} max={2} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SliderInput label="D (xy)" value={equation.D} onChange={(v) => handleChange('D', v)} min={-2} max={2} />
          <SliderInput label="E (yz)" value={equation.E} onChange={(v) => handleChange('E', v)} min={-2} max={2} />
          <SliderInput label="F (zx)" value={equation.F} onChange={(v) => handleChange('F', v)} min={-2} max={2} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SliderInput label="G (x)" value={equation.G} onChange={(v) => handleChange('G', v)} min={-5} max={5} />
          <SliderInput label="H (y)" value={equation.H} onChange={(v) => handleChange('H', v)} min={-5} max={5} />
          <SliderInput label="I (z)" value={equation.I} onChange={(v) => handleChange('I', v)} min={-5} max={5} />
        </div>
        <SliderInput label="J (常数项)" value={equation.J} onChange={(v) => handleChange('J', v)} min={-10} max={10} />
      </div>
    </div>
  );
}
