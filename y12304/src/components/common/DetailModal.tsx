import { X, FileText, MapPin, AlertTriangle, CheckCircle2, Link2, Server, Wind, Cable, Thermometer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSceneStore } from '../../store/useSceneStore';
import { useAlarmStore } from '../../store/useAlarmStore';
import { mockRacks, mockVents, mockTrays, mockSensors } from '../../data/mockData';
import { ObjectType } from '../../types';

const objectTypeIcons: Record<ObjectType, any> = {
  rack: Server,
  vent: Wind,
  tray: Cable,
  sensor: Thermometer,
};

const objectTypeLabels: Record<ObjectType, string> = {
  rack: '机柜',
  vent: '风口',
  tray: '桥架',
  sensor: '探头',
};

export function DetailModal() {
  const { isDetailModalOpen, selectedObject, setDetailModalOpen, setSelectedObject } = useSceneStore();
  const { alarms, getAlarmsByRelatedObject } = useAlarmStore();

  if (!selectedObject) return null;

  const objectData = getObjectData(selectedObject.type, selectedObject.id);
  const relatedAlarms = getAlarmsByRelatedObject(selectedObject.id);

  const handleClose = () => {
    setDetailModalOpen(false);
    setSelectedObject(null);
  };

  return (
    <AnimatePresence>
      {isDetailModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] overflow-hidden z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-gray-700/50 shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    {(() => {
                      const Icon = objectTypeIcons[selectedObject.type];
                      return <Icon className="w-5 h-5 text-cyan-400" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedObject.name}</h3>
                    <p className="text-xs text-gray-400">
                      {objectTypeLabels[selectedObject.type]} 详情
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh] p-4 space-y-4">
                {objectData && <ObjectInfo data={objectData} type={selectedObject.type} />}

                {relatedAlarms.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      关联告警 ({relatedAlarms.length})
                    </h4>
                    <div className="space-y-2">
                      {relatedAlarms.map((alarm) => (
                        <div
                          key={alarm.id}
                          className="p-3 rounded-lg border border-gray-700/50 bg-gray-800/50"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-1.5 rounded-md ${
                                alarm.level === 'critical'
                                  ? 'bg-red-500/20'
                                  : alarm.level === 'warning'
                                  ? 'bg-orange-500/20'
                                  : 'bg-blue-500/20'
                              }`}
                            >
                              <AlertTriangle
                                className={`w-4 h-4 ${
                                  alarm.level === 'critical'
                                    ? 'text-red-400'
                                    : alarm.level === 'warning'
                                    ? 'text-orange-400'
                                    : 'text-blue-400'
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-200 font-medium">{alarm.message}</p>
                              <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
                                <div className="flex items-start gap-2 text-gray-400">
                                  <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>触发材料: {alarm.sourceMaterial}</span>
                                </div>
                                <div className="flex items-start gap-2 text-gray-400">
                                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>卡点位置: {alarm.blockPoint}</span>
                                </div>
                                <div className="flex items-start gap-2 text-gray-400">
                                  <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span className="whitespace-pre-line">
                                    下一步: {alarm.nextStep}
                                  </span>
                                </div>
                              </div>
                              {alarm.clues.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-700/50">
                                  <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" />
                                    关联线索
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {alarm.clues.map((clue) => (
                                      <span
                                        key={clue.id}
                                        className="px-2 py-0.5 text-xs rounded bg-gray-700/50 text-gray-300"
                                      >
                                        {clue.description}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getObjectData(type: ObjectType, id: string) {
  switch (type) {
    case 'rack':
      return mockRacks.find((r) => r.id === id);
    case 'vent':
      return mockVents.find((v) => v.id === id);
    case 'tray':
      return mockTrays.find((t) => t.id === id);
    case 'sensor':
      return mockSensors.find((s) => s.id === id);
    default:
      return null;
  }
}

function ObjectInfo({ data, type }: { data: any; type: ObjectType }) {
  const renderFields = () => {
    switch (type) {
      case 'rack':
        return (
          <>
            <InfoRow label="型号" value={data.model} />
            <InfoRow label="位置" value={`Row ${data.row}, Col ${data.column}`} />
            <InfoRow
              label="温度"
              value={`${data.temperature.toFixed(1)}°C`}
              highlight={data.temperature > 30}
            />
            <InfoRow label="状态" value={data.status === 'normal' ? '正常' : data.status === 'warning' ? '警告' : '异常'} />
          </>
        );
      case 'vent':
        return (
          <>
            <InfoRow label="气流" value={`${data.airflow}/${data.maxAirflow} m³/h`} />
            <InfoRow label="效率" value={`${((data.airflow / data.maxAirflow) * 100).toFixed(0)}%`} />
            <InfoRow label="状态" value={data.status === 'normal' ? '正常' : data.status === 'warning' ? '警告' : '异常'} />
          </>
        );
      case 'tray':
        return (
          <>
            <InfoRow label="线缆数量" value={`${data.cableCount} 条`} />
            <InfoRow label="状态" value={data.status === 'normal' ? '正常' : data.status === 'warning' ? '警告' : '异常'} />
          </>
        );
      case 'sensor':
        return (
          <>
            <InfoRow label="类型" value={data.type === 'temperature' ? '温度' : '湿度'} />
            <InfoRow label="数值" value={data.type === 'temperature' ? `${data.value}°C` : `${data.value}%`} />
            <InfoRow label="最后在线" value={new Date(data.lastOnline).toLocaleString('zh-CN')} />
            <InfoRow label="状态" value={data.status === 'normal' ? '在线' : '离线'} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-300">基本信息</h4>
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-gray-700/50 bg-gray-800/30">
        {renderFields()}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p className={`text-sm font-medium ${highlight ? 'text-red-400' : 'text-gray-200'}`}>
        {value}
      </p>
    </div>
  );
}
