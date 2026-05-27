import { useFlightStore } from '../store/useFlightStore';
import { AlertTriangle, CloudLightning, Ban } from 'lucide-react';

const WarningList = () => {
  const { collisionResult } = useFlightStore();

  if (!collisionResult || collisionResult.violations.length === 0) return null;

  const dangerViolations = collisionResult.violations.filter(v => v.severity === 'danger');
  const warningViolations = collisionResult.violations.filter(v => v.severity === 'warning');

  return (
    <div className="absolute left-4 top-24 w-96 z-10">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 overflow-hidden">
        <div className="bg-red-600 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white" />
            <span className="text-white font-semibold">
              检测到 {collisionResult.violations.length} 项违规
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {dangerViolations.map((violation, index) => (
            <div
              key={`danger-${index}`}
              className="bg-red-900/30 border border-red-700 rounded-lg p-3"
            >
              <div className="flex items-start gap-3">
                {violation.type === 'storm' ? (
                  <CloudLightning className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <Ban className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="text-red-400 font-medium text-sm">危险</div>
                  <p className="text-white text-sm mt-1">{violation.message}</p>
                  {violation.location && (
                    <p className="text-slate-400 text-xs mt-2">
                      位置: {violation.location.lat.toFixed(4)}°N, {violation.location.lng.toFixed(4)}°E
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {warningViolations.map((violation, index) => (
            <div
              key={`warning-${index}`}
              className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3"
            >
              <div className="flex items-start gap-3">
                {violation.type === 'storm' ? (
                  <CloudLightning className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <Ban className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="text-yellow-400 font-medium text-sm">警告</div>
                  <p className="text-white text-sm mt-1">{violation.message}</p>
                  {violation.location && (
                    <p className="text-slate-400 text-xs mt-2">
                      位置: {violation.location.lat.toFixed(4)}°N, {violation.location.lng.toFixed(4)}°E
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WarningList;
