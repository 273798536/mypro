import { X, Radio, Clock, FileText } from "lucide-react";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export function SensorDetailModal() {
  const { showSensorModal, sensorDetail, setShowSensorModal } = useStore();

  if (!sensorDetail) return null;

  const sensorNameMap: Record<string, string> = {
    altimeter: "高度计",
    airspeed: "空速传感器",
    temperature: "温度传感器",
    humidity: "湿度传感器",
    air_quality: "空气质量传感器",
    obstacle_radar: "障碍物雷达",
  };

  const normalRangeMap: Record<string, { min: number; max: number; desc: string }> = {
    altimeter: { min: 100, max: 500, desc: "100-500 m (低空巡航)" },
    airspeed: { min: 60, max: 150, desc: "60-150 km/h (经济速度)" },
    temperature: { min: 5, max: 35, desc: "5-35°C (适飞区间)" },
    humidity: { min: 20, max: 85, desc: "20-85 %RH (正常范围)" },
    air_quality: { min: 0, max: 100, desc: "0-100 AQI (优良)" },
    obstacle_radar: { min: 50, max: 500, desc: ">100m (安全距离)" },
  };

  const range = normalRangeMap[sensorDetail.type];
  const isNormal =
    range && sensorDetail.rawReading >= range.min && sensorDetail.rawReading <= range.max;
  const sensorName = sensorNameMap[sensorDetail.type] || sensorDetail.type;

  return (
    <AnimatePresence>
      {showSensorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSensorModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center">
                  <Radio className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text">
                    {sensorName} · 原始记录
                  </h2>
                  <p className="text-xs text-muted font-mono">
                    {sensorDetail.id.substring(0, 16)}...
                  </p>
                </div>
              </div>
              <button
                className="text-muted hover:text-text transition-colors p-1 rounded-lg hover:bg-surface-hover"
                onClick={() => setShowSensorModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div
                className={`rounded-xl p-5 text-center ${
                  isNormal
                    ? "bg-success/5 border border-success/30"
                    : "bg-warning/5 border border-warning/30"
                }`}
              >
                <div className="text-xs text-muted mb-1">原始读数</div>
                <div
                  className={`text-4xl font-mono font-bold mb-1 ${
                    isNormal ? "text-success" : "text-warning"
                  }`}
                >
                  {sensorDetail.rawReading}
                  <span className="text-lg ml-1 font-normal opacity-70">
                    {sensorDetail.unit}
                  </span>
                </div>
                <div
                  className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    isNormal
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {isNormal ? "✓ 读数在正常区间内" : "⚠ 需关注此读数"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background border border-border rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                    <Radio className="w-3 h-3" />
                    设备编号
                  </div>
                  <p className="font-mono text-sm text-text">
                    {sensorDetail.deviceCode}
                  </p>
                </div>
                <div className="bg-background border border-border rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                    <Clock className="w-3 h-3" />
                    采集时间
                  </div>
                  <p className="font-mono text-sm text-text">
                    {format(new Date(sensorDetail.timestamp), "MM-dd HH:mm:ss")}
                  </p>
                </div>
                <div className="bg-background border border-border rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                    <FileText className="w-3 h-3" />
                    关联航段
                  </div>
                  <p className="font-mono text-sm text-text">
                    第 {sensorDetail.corridorSegmentIndex + 1} 航段
                  </p>
                </div>
                <div className="bg-background border border-border rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                    <Radio className="w-3 h-3" />
                    传感器类型
                  </div>
                  <p className="text-sm text-text">{sensorName}</p>
                </div>
              </div>

              {range && (
                <div className="bg-background border border-border rounded-lg p-4">
                  <div className="text-xs text-muted mb-2">正常参考范围</div>
                  <p className="text-sm text-text mb-3">{range.desc}</p>
                  <div className="relative h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-success to-success/70 rounded-full"
                      style={{
                        left: `${((range.min - 0) / (range.max * 1.5)) * 100}%`,
                        width: `${((range.max - range.min) / (range.max * 1.5)) * 100}%`,
                      }}
                    />
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background shadow ${
                        isNormal ? "bg-success" : "bg-warning"
                      }`}
                      style={{
                        left: `${Math.min(95, Math.max(0, (sensorDetail.rawReading / (range.max * 1.5)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] font-mono text-muted">
                    <span>0</span>
                    <span>{range.min}</span>
                    <span>{range.max}</span>
                    <span>{Math.round(range.max * 1.5)}</span>
                  </div>
                </div>
              )}

              {sensorDetail.metadata &&
                Object.keys(sensorDetail.metadata).length > 0 && (
                  <div className="bg-background border border-border rounded-lg p-4">
                    <div className="text-xs text-muted mb-2">设备元数据</div>
                    <div className="space-y-1.5">
                      {Object.entries(sensorDetail.metadata).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted capitalize">{key}</span>
                          <span className="font-mono text-text">
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="px-6 py-3 border-t border-border bg-background/50 text-xs text-muted text-center">
              ⓘ 此为传感器原始采集数据，可作为方案判定依据，截图将包含完整溯源信息
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
