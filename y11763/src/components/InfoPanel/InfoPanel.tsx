import { Info, X, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useParticleStore } from '../../store/useParticleStore';
import { useAppStore } from '../../store/useAppStore';
import { PARTICLE_INFO } from '../../types/particle';
import { twMerge } from 'tailwind-merge';

export default function InfoPanel() {
  const selectedParticleId = useParticleStore((state) => state.selectedParticleId);
  const particles = useParticleStore((state) => state.particles);
  const { errors, showErrors, toggleShowErrors, clearErrors } = useAppStore();
  const setSelectedParticle = useParticleStore((state) => state.setSelectedParticle);

  const selectedParticle = particles.find((p) => p.id === selectedParticleId);

  return (
    <div className="absolute right-4 top-4 w-72 z-10 space-y-4">
      {selectedParticle && (
        <div className="bg-chamber-900/90 backdrop-blur-md rounded-xl border border-chamber-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-chamber-700/50">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              <h2 className="font-orbitron text-sm font-bold text-white">粒子详情</h2>
            </div>
            <button
              onClick={() => setSelectedParticle(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <ParticleInfoCard particle={selectedParticle} />
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-chamber-900/90 backdrop-blur-md rounded-xl border border-red-500/30 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-red-500/20 cursor-pointer"
            onClick={toggleShowErrors}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="font-orbitron text-sm font-bold text-red-400">
                数据问题 ({errors.length})
              </h2>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearErrors();
              }}
              className="text-gray-400 hover:text-white transition-colors text-xs"
            >
              清除
            </button>
          </div>

          {showErrors && (
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {errors.map((error, i) => (
                <div
                  key={i}
                  className={twMerge(
                    'p-3 rounded-lg text-xs',
                    error.severity === 'error'
                      ? 'bg-red-500/10 border border-red-500/30'
                      : 'bg-yellow-500/10 border border-yellow-500/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {error.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-jetbrains text-gray-300">{error.message}</div>
                      {error.particleId && (
                        <div className="text-gray-500 mt-1">ID: {error.particleId}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedParticle && errors.length === 0 && (
        <div className="bg-chamber-900/90 backdrop-blur-md rounded-xl border border-chamber-700/50 p-4">
          <div className="text-center text-gray-400 text-sm">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-jetbrains">点击粒子轨迹查看详情</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ParticleInfoCard({ particle }: { particle: any }) {
  const info = PARTICLE_INFO[particle.type];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: info.color + '30',
            boxShadow: `0 0 20px ${info.color}50`,
          }}
        >
          <span className="font-orbitron text-lg" style={{ color: info.color }}>
            {info.symbol}
          </span>
        </div>
        <div>
          <div className="font-orbitron text-white">{info.name}</div>
          <div className="text-xs text-gray-500 font-jetbrains">{particle.id}</div>
        </div>
      </div>

      <div className="space-y-2">
        <InfoRow label="电荷" value={`${particle.charge} e`} />
        <InfoRow label="质量" value={`${particle.mass} MeV/c²`} />
        <InfoRow
          label="速度"
          value={`(${particle.velocity.x.toFixed(2)}, ${particle.velocity.y.toFixed(2)}, ${particle.velocity.z.toFixed(2)})`}
        />
        <InfoRow label="轨迹点数" value={particle.trajectoryPoints.length.toString()} />
        <InfoRow label="来源" value={particle.source} />
        <InfoRow label="版本" value={particle.version} />
      </div>

      <div className="pt-3 border-t border-chamber-700/50">
        <p className="text-xs text-gray-400 font-jetbrains leading-relaxed">
          {info.description}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500 font-jetbrains">{label}</span>
      <span className="text-xs text-gray-300 font-jetbrains">{value}</span>
    </div>
  );
}
