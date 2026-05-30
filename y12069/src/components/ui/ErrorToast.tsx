import { useEffect } from 'react';
import { useGameStore, useGameErrors } from '@/store/useGameStore';
import { AlertTriangle, X, ArrowRight, Zap } from 'lucide-react';

export function ErrorToast() {
  const errors = useGameErrors();
  const clearError = useGameStore((state) => state.clearError);
  
  useEffect(() => {
    if (errors.length > 0) {
      const timer = setTimeout(() => {
        clearError(errors[0].id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errors, clearError]);
  
  if (errors.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.slice(0, 3).map((error) => (
        <div
          key={error.id}
          className={`
            relative border-2 rounded-lg p-4 shadow-2xl animate-shake
            ${error.type === 'momentum_direction' 
              ? 'bg-red-900/90 border-neon-red' 
              : 'bg-orange-900/90 border-neon-orange'
            }
          `}
          style={{
            boxShadow: error.type === 'momentum_direction'
              ? '0 0 20px rgba(255, 59, 48, 0.5)'
              : '0 0 20px rgba(255, 149, 0, 0.5)'
          }}
        >
          <button
            onClick={() => clearError(error.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-start gap-3">
            <div className={`
              p-2 rounded-full flex-shrink-0
              ${error.type === 'momentum_direction' ? 'bg-neon-red/20' : 'bg-neon-orange/20'}
            `}>
              <AlertTriangle 
                size={24} 
                className={error.type === 'momentum_direction' ? 'text-neon-red' : 'text-neon-orange'} 
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-pixel text-xs text-white uppercase tracking-wide">
                  {error.type === 'momentum_direction' ? '动量方向错误' : '能量超限'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  #{error.collisionId.slice(-4)}
                </span>
              </div>
              
              <p className="font-mono text-sm text-white mb-2">
                {error.message}
              </p>
              
              {error.materialName && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">相关材料:</span>
                  <span className={`
                    px-2 py-0.5 rounded font-bold
                    ${error.type === 'momentum_direction' 
                      ? 'bg-neon-red/30 text-neon-red' 
                      : 'bg-neon-orange/30 text-neon-orange'
                    }
                  `}>
                    {error.materialName}
                  </span>
                </div>
              )}
              
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 font-mono">
                <div className="flex items-center gap-1">
                  <Zap size={12} className="text-neon-orange" />
                  <span>位置: ({error.position.x.toFixed(0)}, {error.position.y.toFixed(0)})</span>
                </div>
              </div>
              
              {error.type === 'momentum_direction' && (
                <div className="mt-3 p-2 bg-black/30 rounded border border-neon-red/30">
                  <p className="text-xs text-gray-300 font-mono">
                    <ArrowRight size={12} className="inline mr-1" />
                    提示: 碰撞后动量方向应与入射方向大致相同，检查粒子质量和速度设置
                  </p>
                </div>
              )}
              
              {error.type === 'energy_over_limit' && (
                <div className="mt-3 p-2 bg-black/30 rounded border border-neon-orange/30">
                  <p className="text-xs text-gray-300 font-mono">
                    <ArrowRight size={12} className="inline mr-1" />
                    提示: 碰撞后能量不能超过碰撞前，降低发射功率或选择更重的粒子
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className={`
            absolute bottom-0 left-0 h-1 rounded-b
            ${error.type === 'momentum_direction' ? 'bg-neon-red' : 'bg-neon-orange'}
            animate-[shrink_5s_linear_forwards]
          `} 
          style={{
            animation: 'shrink 5s linear forwards'
          }}
          />
          
          <style>{`
            @keyframes shrink {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>
      ))}
    </div>
  );
}
