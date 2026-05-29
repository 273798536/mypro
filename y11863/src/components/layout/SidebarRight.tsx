import { AlertTriangle, Info, Wrench, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatEnergyValue } from '../../utils/heatmapColors';

const deviceTypeLabels: Record<string, string> = {
  hvac: '空调系统',
  lighting: '照明系统',
  elevator: '电梯',
  other: '其他设备',
};

export const SidebarRight = () => {
  const {
    buildingModel,
    meterData,
    energyType,
    selectedFloor,
    selectedDevice,
  } = useAppStore();

  const floor = selectedFloor
    ? buildingModel.floors.find((f) => f.id === selectedFloor)
    : null;
  const floorMeter = selectedFloor
    ? meterData.floorMeters.find((fm) => fm.floorId === selectedFloor)
    : null;

  const device =
    selectedDevice && floor
      ? floor.devices.find((d) => d.id === selectedDevice)
      : null;
  const deviceMeter =
    selectedDevice && floorMeter
      ? floorMeter.devices.find((d) => d.deviceId === selectedDevice)
      : null;

  const abnormalDevices = meterData.floorMeters.flatMap((fm) =>
    fm.devices
      .filter((d) => d.isAbnormal)
      .map((d) => ({
        ...d,
        floorId: fm.floorId,
        floorName: fm.floorName,
      }))
  );

  if (!selectedFloor && !selectedDevice) {
    return (
      <aside className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            异常设备列表
            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {abnormalDevices.length}
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {abnormalDevices.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <Info size={48} className="mx-auto mb-2 opacity-50" />
              <p>暂无异常设备</p>
            </div>
          ) : (
            <div className="space-y-3">
              {abnormalDevices.map((abnormal, index) => (
                <div
                  key={`${abnormal.floorId}-${abnormal.deviceId}`}
                  className="bg-red-900/20 border border-red-700/50 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm">
                        {abnormal.deviceName}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {abnormal.floorName}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-red-400 text-xs bg-red-900/30 rounded p-2">
                    ⚠️ {abnormal.abnormalReason}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <TrendingUp size={12} className="text-orange-400" />
                    <span className="text-orange-400">
                      能耗: {formatEnergyValue(
                        abnormal.energyConsumption[energyType] || 0,
                        energyType
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <h3 className="text-slate-400 text-xs mb-2">操作提示</h3>
          <ul className="text-slate-500 text-xs space-y-1">
            <li>• 点击楼层或设备查看详情</li>
            <li>• 鼠标拖拽旋转3D模型</li>
            <li>• 滚轮缩放视图</li>
            <li>• 右键拖拽平移视角</li>
          </ul>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Info size={18} />
          {device ? '设备详情' : '楼层详情'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {device ? (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-white font-bold text-lg">{device.name}</h3>
              <p className="text-slate-400 text-sm">{deviceTypeLabels[device.type]}</p>
              {floor && <p className="text-slate-500 text-xs mt-1">{floor.name}</p>}
            </div>

            {deviceMeter && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-slate-400 text-xs mb-3">能耗数据</h4>
                <div className="text-2xl font-bold text-white">
                  {formatEnergyValue(
                    deviceMeter.energyConsumption[energyType] || 0,
                    energyType
                  )}
                </div>
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      deviceMeter.isAbnormal ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: deviceMeter.isAbnormal ? '100%' : '60%' }}
                  />
                </div>
              </div>
            )}

            {deviceMeter?.isAbnormal && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertTriangle size={16} />
                  <span className="font-semibold text-sm">异常告警</span>
                </div>
                <p className="text-red-300 text-sm">
                  {deviceMeter.abnormalReason}
                </p>
              </div>
            )}

            <div className="bg-slate-800 rounded-lg p-4">
              <h4 className="text-slate-400 text-xs mb-3 flex items-center gap-1">
                <Wrench size={12} />
                建议措施
              </h4>
              <ul className="text-slate-300 text-sm space-y-2">
                {device.type === 'hvac' && (
                  <>
                    <li>• 检查空调滤网清洁状况</li>
                    <li>• 核实温度设置是否合理</li>
                    <li>• 安排维护人员现场检查</li>
                  </>
                )}
                {device.type === 'elevator' && (
                  <>
                    <li>• 查看电梯运行日志</li>
                    <li>• 检查是否有故障代码</li>
                    <li>• 联系电梯维保单位</li>
                  </>
                )}
                {device.type === 'lighting' && (
                  <>
                    <li>• 检查是否存在常亮区域</li>
                    <li>• 核实感应开关是否正常</li>
                    <li>• 考虑更换节能灯具</li>
                  </>
                )}
                {device.type === 'other' && (
                  <>
                    <li>• 核实设备运行时间表</li>
                    <li>• 检查是否有异常负载</li>
                    <li>• 安排技术人员排查</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        ) : (
          floor && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-white font-bold text-lg">{floor.name}</h3>
                <p className="text-slate-400 text-sm">共 {floor.devices.length} 台设备</p>
              </div>

              {floorMeter && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h4 className="text-slate-400 text-xs mb-3">楼层能耗</h4>
                  <div className="text-2xl font-bold text-white">
                    {formatEnergyValue(
                      floorMeter.energyConsumption[energyType] || 0,
                      energyType
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center">
                      <div className="text-slate-500 text-xs">电力</div>
                      <div className="text-white text-sm font-medium">
                        {floorMeter.energyConsumption.electricity.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-500 text-xs">用水</div>
                      <div className="text-white text-sm font-medium">
                        {floorMeter.energyConsumption.water?.toLocaleString() || '-'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-500 text-xs">燃气</div>
                      <div className="text-white text-sm font-medium">
                        {floorMeter.energyConsumption.gas?.toLocaleString() || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-slate-400 text-xs mb-3">设备列表</h4>
                <div className="space-y-2">
                  {floor.devices.map((d) => {
                    const dm = floorMeter?.devices.find(
                      (dev) => dev.deviceId === d.id
                    );
                    return (
                      <div
                        key={d.id}
                        className={`p-2 rounded-lg border transition-colors ${
                          dm?.isAbnormal
                            ? 'bg-red-900/20 border-red-700/50'
                            : 'bg-slate-700/50 border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm">{d.name}</span>
                          {dm?.isAbnormal && (
                            <AlertTriangle size={14} className="text-red-400" />
                          )}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {formatEnergyValue(
                            dm?.energyConsumption[energyType] || 0,
                            energyType
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
};
