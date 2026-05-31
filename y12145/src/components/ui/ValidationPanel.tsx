import { useSolarSailStore } from '@/store/solarSailStore';
import { Shield, CheckCircle, AlertTriangle, XCircle, FileCode } from 'lucide-react';

const parameterLabels: Record<string, string> = {
  sailArea: '帆面积',
  spacecraftMass: '航天器质量',
  attitudeAngle: '姿态角',
  timeStep: '时间步长'
};

export function ValidationPanel() {
  const { validationRecords } = useSolarSailStore();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'normal':
        return <CheckCircle className="w-4 h-4 text-teal-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string, isValid: boolean) => {
    if (!isValid) {
      return type === 'error' ? 'border-red-500/50 bg-red-500/10' : 'border-yellow-500/50 bg-yellow-500/10';
    }
    return 'border-teal-500/30 bg-teal-500/5';
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-5 border border-slate-700">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
        数据验证
        <Shield className="w-4 h-4 text-slate-400 ml-auto" />
      </h2>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
        {validationRecords.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无验证记录</p>
            <p className="text-xs">调整参数后自动验证</p>
          </div>
        ) : (
          validationRecords.map((record) => (
            <div
              key={record.id}
              className={`rounded-lg p-3 border ${getTypeColor(record.type, record.isValid)}`}
            >
              <div className="flex items-start gap-2">
                {getTypeIcon(record.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {parameterLabels[record.parameter] || record.parameter}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {record.value.toExponential(2)}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${record.isValid ? 'text-slate-400' : record.type === 'error' ? 'text-red-300' : 'text-yellow-300'}`}>
                    {record.message}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                    <FileCode className="w-3 h-3" />
                    <span className="truncate font-mono">{record.source}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            正常 {validationRecords.filter(r => r.isValid).length}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            警告 {validationRecords.filter(r => !r.isValid && r.type === 'warning').length}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            错误 {validationRecords.filter(r => !r.isValid && r.type === 'error').length}
          </span>
        </div>
      </div>
    </div>
  );
}
