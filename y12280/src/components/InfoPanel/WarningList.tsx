import { AlertTriangle, X } from 'lucide-react';
import { useMagneticStore } from '@/store/magneticStore';
import { ValidationWarning } from '@/types';

function getWarningIcon(type: ValidationWarning['type']) {
  switch (type) {
    case 'pole_reverse':
      return '🔄';
    case 'sample_dense':
      return '📊';
    case 'field_explosion':
      return '⚠️';
    default:
      return '⚠️';
  }
}

function getWarningTitle(type: ValidationWarning['type']) {
  switch (type) {
    case 'pole_reverse':
      return '磁极反向警告';
    case 'sample_dense':
      return '采样密度警告';
    case 'field_explosion':
      return '场强异常警告';
    default:
      return '系统警告';
  }
}

export function WarningList() {
  const { warnings } = useMagneticStore();

  if (warnings.length === 0) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex items-center gap-2 text-green-500 mb-2">
          <span className="text-lg">✓</span>
          <span className="text-sm font-medium">参数正常</span>
        </div>
        <p className="text-xs text-gray-500">
          当前磁体配置和采样参数均在合理范围内
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
          <AlertTriangle size={16} />
          系统警告 ({warnings.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {warnings.map((warning) => (
          <div
            key={warning.id}
            className="p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{getWarningIcon(warning.type)}</span>
                <span className="text-sm font-medium text-orange-300">
                  {getWarningTitle(warning.type)}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-gray-300 mb-2">
              {warning.message}
            </p>

            {warning.affectedMagnets.length > 0 && (
              <div className="text-[10px] text-gray-400">
                <span className="text-orange-400">影响磁体: </span>
                {warning.affectedMagnets.map((id, i) => (
                  <span key={id}>
                    {id}{i < warning.affectedMagnets.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}

            {warning.affectedLines.length > 0 && (
              <div className="text-[10px] text-gray-400 mt-1">
                <span className="text-orange-400">影响场线: </span>
                {warning.affectedLines.length} 条（已在场景中高亮显示）
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
