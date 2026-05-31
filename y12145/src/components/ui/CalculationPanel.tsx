import { useSolarSailStore } from '@/store/solarSailStore';
import { calculateRadiationPressure, calculateForce, calculateAcceleration } from '@/physics/radiationPressure';
import { SOLAR_CONSTANT, SPEED_OF_LIGHT, REFLECTIVITY } from '@/physics/constants';
import { Calculator, Zap, Gauge, ArrowRight } from 'lucide-react';

export function CalculationPanel() {
  const { params, currentTime, velocity, position } = useSolarSailStore();
  
  const radiationPressure = calculateRadiationPressure(params.sailArea, params.attitudeAngle);
  const forceMagnitude = Math.sqrt(
    (radiationPressure * Math.cos(params.attitudeAngle * Math.PI / 180)) ** 2 +
    (radiationPressure * Math.sin(params.attitudeAngle * Math.PI / 180)) ** 2
  );
  const acceleration = params.spacecraftMass > 0 
    ? forceMagnitude / params.spacecraftMass 
    : 0;
  const velocityMag = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-5 border border-slate-700">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
        光压计算
      </h2>

      <div className="space-y-4 font-mono text-sm">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Calculator className="w-4 h-4" />
            <span>入射光压计算</span>
          </div>
          <div className="text-xs text-slate-500 mb-1">
            P₀ = S / c
          </div>
          <div className="text-teal-400">
            = {SOLAR_CONSTANT.toFixed(0)} / {SPEED_OF_LIGHT.toExponential(2)}
          </div>
          <div className="text-white mt-1">
            = {(SOLAR_CONSTANT / SPEED_OF_LIGHT).toExponential(4)} Pa
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Zap className="w-4 h-4" />
            <span>有效推力计算</span>
          </div>
          <div className="text-xs text-slate-500 mb-1">
            F = P₀ · A · cos²(θ) · (1 + ρ)
          </div>
          <div className="text-orange-400 text-xs">
            = ({(SOLAR_CONSTANT / SPEED_OF_LIGHT).toExponential(2)}) · {params.sailArea.toFixed(0)} · cos²({params.attitudeAngle}°) · (1 + {REFLECTIVITY})
          </div>
          <div className="text-white mt-1">
            = {radiationPressure.toExponential(4)} N
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Gauge className="w-4 h-4" />
            <span>加速度计算</span>
          </div>
          <div className="text-xs text-slate-500 mb-1">
            a = F / m
          </div>
          <div className="text-cyan-400 text-xs">
            = {radiationPressure.toExponential(2)} / {params.spacecraftMass.toFixed(1)}
          </div>
          <div className="text-white mt-1">
            = {acceleration.toExponential(4)} m/s²
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3">
        <div className="bg-slate-900/30 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">当前时间</div>
          <div className="font-mono text-white">{(currentTime / 3600).toFixed(2)} h</div>
        </div>
        <div className="bg-slate-900/30 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">当前速度</div>
          <div className="font-mono text-teal-400">{velocityMag.toExponential(3)} m/s</div>
        </div>
        <div className="bg-slate-900/30 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">X 位置</div>
          <div className="font-mono text-orange-400">{position.x.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900/30 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Y 位置</div>
          <div className="font-mono text-cyan-400">{position.y.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
