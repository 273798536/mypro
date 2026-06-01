import { Info, MapPin, Ruler, AlertTriangle, Clock, User } from 'lucide-react';
import { TerrainCanvas } from '../components/terrain3d/TerrainCanvas';
import { DataGapNotice } from '../components/terrain3d/DataGapNotice';
import { useAppStore } from '../store/useAppStore';

export function TerrainPage() {
  const selectedCrack = useAppStore((state) => state.selectedCrack);
  const cracks = useAppStore((state) => state.cracks);
  const getCrackHistory = useAppStore((state) => state.getCrackHistory);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      normal: '正常',
      duplicate: '重复',
      missing_field: '缺字段',
      late_added: '晚补',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      normal: 'status-normal',
      duplicate: 'status-duplicate',
      missing_field: 'status-missing',
      late_added: 'status-late',
    };
    return classes[status] || '';
  };

  const getRiskLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: '低风险',
      medium: '中风险',
      high: '高风险',
    };
    return labels[level] || level;
  };

  const getRiskClass = (level: string) => {
    const classes: Record<string, string> = {
      low: 'text-status-normal',
      medium: 'text-status-missing',
      high: 'text-status-duplicate',
    };
    return classes[level] || '';
  };

  const history = selectedCrack ? getCrackHistory(selectedCrack.id) : [];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">3D地形模型</h2>
            <p className="text-xs text-slate-500">点击标记点查看裂缝详情</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-status-normal" />
            <span className="text-slate-400">正常</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-status-duplicate animate-pulse" />
            <span className="text-slate-400">重复</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-status-missing" />
            <span className="text-slate-400">异常</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <TerrainCanvas />
          <DataGapNotice />

          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700 px-3 py-2">
            <p className="text-xs text-slate-400">
              共 <span className="text-white font-medium">{cracks.length}</span> 个监测点
            </p>
          </div>
        </div>

        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              裂缝详情
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedCrack ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{selectedCrack.name}</h4>
                    <span className={`status-badge ${getStatusClass(selectedCrack.status)}`}>
                      {getStatusLabel(selectedCrack.status)}
                    </span>
                  </div>
                  <p className={`text-sm ${getRiskClass(selectedCrack.riskLevel)}`}>
                    {getRiskLabel(selectedCrack.riskLevel)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">坐标 X</p>
                      <p className="text-sm text-white font-mono">{selectedCrack.x.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">坐标 Y</p>
                      <p className="text-sm text-white font-mono">{selectedCrack.y.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">高程</p>
                      <p className="text-sm text-white font-mono">{selectedCrack.z.toFixed(1)}m</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        长度
                      </p>
                      <p className="text-sm text-white font-mono">{selectedCrack.length}m</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-2">备注</p>
                    <p className="text-sm text-slate-300">{selectedCrack.remark}</p>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">雨量数据</span>
                      <span className={`text-sm ${selectedCrack.rainfall ? 'text-slate-300' : 'text-status-missing'}`}>
                        {selectedCrack.rainfall || '缺失'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">住户坐标</span>
                      <span className={`text-sm ${selectedCrack.residentCoords ? 'text-slate-300' : 'text-status-missing'}`}>
                        {selectedCrack.residentCoords || '缺失'}
                      </span>
                    </div>
                  </div>

                  {selectedCrack.isDuplicate && selectedCrack.duplicateOf && (
                    <div className="bg-status-duplicate/10 border border-status-duplicate/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-status-duplicate mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">重复记录警告</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        与 {cracks.find((c) => c.id === selectedCrack.duplicateOf)?.name || '其他记录'} 疑似重复
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>创建: {selectedCrack.createTime}</span>
                  </div>
                </div>

                {history.length > 0 && (
                  <div className="pt-4 border-t border-slate-700">
                    <h5 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                      <User className="w-3 h-3" />
                      操作历史
                    </h5>
                    <div className="space-y-2">
                      {history.slice(0, 5).map((record) => (
                        <div key={record.id} className="bg-slate-800/30 rounded p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-300 font-medium">{record.operator}</span>
                            <span className="text-slate-500">
                              {record.action === 'create' ? '创建' : record.action === 'update' ? '修改' : '删除'}
                            </span>
                          </div>
                          {record.field && (
                            <p className="text-slate-500">
                              {record.field}: {record.oldValue} → {record.newValue}
                            </p>
                          )}
                          <p className="text-slate-600 mt-1">{record.timestamp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm">点击3D模型中的标记点</p>
                <p className="text-slate-600 text-xs mt-1">查看裂缝详细信息</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
