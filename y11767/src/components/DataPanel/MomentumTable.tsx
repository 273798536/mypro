import { useMemo } from 'react';
import { Vector3 } from 'three';
import { useExperimentStore } from '../../store/useExperimentStore';
import { calculateMomentum, calculateKineticEnergy, formatVector } from '../../utils/physics';

export function MomentumTable() {
  const balls = useExperimentStore((state) => state.balls);
  const initialMomentum = useExperimentStore((state) => state.initialMomentum);
  const initialKineticEnergy = useExperimentStore((state) => state.initialKineticEnergy);

  const totalMomentum = useMemo(() => {
    return balls.reduce((total, ball) => {
      return total.add(calculateMomentum(ball));
    }, new Vector3(0, 0, 0));
  }, [balls]);

  const totalKineticEnergy = useMemo(() => {
    return balls.reduce((total, ball) => total + calculateKineticEnergy(ball), 0);
  }, [balls]);

  const momentumChange = useMemo(() => {
    if (!initialMomentum) return null;
    const initialMag = initialMomentum.magnitude;
    const currentMag = totalMomentum.length();
    if (initialMag < 0.001) return 0;
    return ((currentMag - initialMag) / initialMag) * 100;
  }, [initialMomentum, totalMomentum]);

  const keChange = useMemo(() => {
    if (!initialKineticEnergy || initialKineticEnergy < 0.001) return null;
    return ((totalKineticEnergy - initialKineticEnergy) / initialKineticEnergy) * 100;
  }, [initialKineticEnergy, totalKineticEnergy]);

  const momentumStatus = useMemo(() => {
    if (momentumChange === null) return 'info';
    if (Math.abs(momentumChange) > 5) return 'error';
    if (Math.abs(momentumChange) > 1) return 'warning';
    return 'success';
  }, [momentumChange]);

  return (
    <div className="bg-space-800 rounded-lg p-4 border border-space-700">
      <h3 className="text-sm font-medium text-white/70 mb-3">动量与能量监控</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs mono-text">
          <thead>
            <tr className="text-white/50 border-b border-space-700">
              <th className="text-left py-2 pr-2">球体</th>
              <th className="text-right py-2 pr-2">质量(kg)</th>
              <th className="text-right py-2 pr-2">速率(m/s)</th>
              <th className="text-right py-2 pr-2">动量(kg·m/s)</th>
              <th className="text-right py-2">动能(J)</th>
            </tr>
          </thead>
          <tbody>
            {balls.map((ball) => {
              const momentum = calculateMomentum(ball);
              const ke = calculateKineticEnergy(ball);
              return (
                <tr key={ball.id} className="border-b border-space-700/50">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ball.color }}
                      />
                      <span>{ball.label}</span>
                    </div>
                  </td>
                  <td className="text-right py-2 pr-2">{ball.mass.toFixed(2)}</td>
                  <td className="text-right py-2 pr-2">{ball.velocity.length().toFixed(3)}</td>
                  <td className="text-right py-2 pr-2">{momentum.length().toFixed(3)}</td>
                  <td className="text-right py-2">{ke.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-space-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-white/50 text-xs mb-1">总动量</div>
            <div className="mono-text text-cyber-400">
              {totalMomentum.length().toFixed(4)} kg·m/s
            </div>
            <div className="text-xs text-white/40 mono-text">
              {formatVector(totalMomentum)}
            </div>
            {momentumChange !== null && (
              <div
                className={cn(
                  "text-xs mt-1",
                  momentumStatus === 'error' && 'text-alert-orange',
                  momentumStatus === 'warning' && 'text-yellow-400',
                  momentumStatus === 'success' && 'text-alert-green',
                )}
              >
                变化: {momentumChange >= 0 ? '+' : ''}{momentumChange.toFixed(2)}%
                {momentumStatus === 'error' && ' ⚠️'}
              </div>
            )}
          </div>
          <div>
            <div className="text-white/50 text-xs mb-1">总动能</div>
            <div className="mono-text text-cyber-400">
              {totalKineticEnergy.toFixed(4)} J
            </div>
            {keChange !== null && (
              <div className="text-xs mt-1 text-white/60">
                变化: {keChange >= 0 ? '+' : ''}{keChange.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {initialMomentum && (
        <div className="mt-3 pt-3 border-t border-space-700 text-xs">
          <div className="text-white/50 mb-1">初始值参考</div>
          <div className="mono-text text-white/60">
            动量: {initialMomentum.magnitude.toFixed(4)} kg·m/s |
            动能: {initialKineticEnergy?.toFixed(4)} J
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
