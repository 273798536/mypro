import { useState, useEffect } from 'react';
import { X, Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getDiffTypeLabel, getDiffTypeColor } from '../../utils/diffDetector';
import type { BuildingModel, MeterData } from '../../types';

export const DataManagement = () => {
  const {
    isDataManagementOpen,
    setDataManagementOpen,
    buildingModel,
    meterData,
    mergeDiffs,
    detectMergeDiffs,
    setBuildingModel,
    setMeterData,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'model' | 'meter' | 'diff'>('diff');
  const [uploadingModel, setUploadingModel] = useState(false);
  const [uploadingMeter, setUploadingMeter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDataManagementOpen) {
      detectMergeDiffs();
    }
  }, [isDataManagementOpen, detectMergeDiffs]);

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingModel(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BuildingModel;
        setBuildingModel(data);
        setUploadingModel(false);
      } catch {
        setError('楼栋模型文件格式错误，请上传有效的JSON文件');
        setUploadingModel(false);
      }
    };
    reader.readAsText(file);
  };

  const handleMeterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMeter(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as MeterData;
        setMeterData(data);
        setUploadingMeter(false);
      } catch {
        setError('电表数据文件格式错误，请上传有效的JSON文件');
        setUploadingMeter(false);
      }
    };
    reader.readAsText(file);
  };

  if (!isDataManagementOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <FileSpreadsheet size={20} />
            数据管理
          </h2>
          <button
            onClick={() => setDataManagementOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-700">
          {[
            { id: 'diff', label: '差异对比', icon: AlertCircle },
            { id: 'model', label: '楼栋模型', icon: FileJson },
            { id: 'meter', label: '电表数据', icon: FileSpreadsheet },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.id === 'diff' && mergeDiffs.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {mergeDiffs.length}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-4 mt-4 bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'diff' && (
            <div className="space-y-4">
              {mergeDiffs.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">数据一致</h3>
                  <p className="text-slate-400">楼栋模型与电表数据完全匹配，无差异</p>
                </div>
              ) : (
                <>
                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="text-yellow-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="text-yellow-500 font-semibold mb-1">存在数据差异</h4>
                        <p className="text-yellow-200/70 text-sm">
                          检测到 {mergeDiffs.length} 处数据不一致，请与相关人员确认后再进行合并操作。
                          以下提示可直接转述给相关责任人：
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mergeDiffs.map((diff, index) => (
                      <div
                        key={index}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${getDiffTypeColor(diff.type)}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-medium">
                                {getDiffTypeLabel(diff.type)}
                              </span>
                              {diff.floorName && (
                                <span className="text-slate-500 text-sm">
                                  · {diff.floorName}
                                </span>
                              )}
                              {diff.deviceName && (
                                <span className="text-slate-500 text-sm">
                                  · {diff.deviceName}
                                </span>
                              )}
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3 mb-2">
                              <p className="text-slate-300 text-sm">📋 {diff.message}</p>
                            </div>
                            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                              <p className="text-blue-400 text-sm">
                                💡 <span className="font-medium">建议：</span>
                                {diff.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleModelUpload}
                  className="hidden"
                  id="model-upload"
                />
                <label
                  htmlFor="model-upload"
                  className="cursor-pointer"
                >
                  <Upload className="mx-auto text-slate-500 mb-3" size={40} />
                  <p className="text-white font-medium mb-1">
                    {uploadingModel ? '上传中...' : '点击上传楼栋模型'}
                  </p>
                  <p className="text-slate-500 text-sm">支持 JSON 格式文件</p>
                </label>
              </div>

              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">{buildingModel.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">楼层数量</span>
                    <p className="text-white">{buildingModel.floors.length} 层</p>
                  </div>
                  <div>
                    <span className="text-slate-500">最后更新</span>
                    <p className="text-white">
                      {new Date(buildingModel.lastModified).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {buildingModel.floors.map((floor) => (
                    <div
                      key={floor.id}
                      className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2"
                    >
                      <span className="text-white text-sm">{floor.name}</span>
                      <span className="text-slate-400 text-xs">
                        {floor.devices.length} 台设备
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meter' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleMeterUpload}
                  className="hidden"
                  id="meter-upload"
                />
                <label
                  htmlFor="meter-upload"
                  className="cursor-pointer"
                >
                  <Upload className="mx-auto text-slate-500 mb-3" size={40} />
                  <p className="text-white font-medium mb-1">
                    {uploadingMeter ? '上传中...' : '点击上传电表数据'}
                  </p>
                  <p className="text-slate-500 text-sm">支持 JSON / CSV 格式文件</p>
                </label>
              </div>

              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">电表数据概览</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">统计周期</span>
                    <p className="text-white">
                      {new Date(meterData.period.start).toLocaleDateString('zh-CN')} -{' '}
                      {new Date(meterData.period.end).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">数据更新</span>
                    <p className="text-white">
                      {new Date(meterData.lastModified).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {meterData.floorMeters.map((fm) => (
                    <div
                      key={fm.floorId}
                      className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2"
                    >
                      <span className="text-white text-sm">{fm.floorName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">
                          {fm.energyConsumption.electricity.toLocaleString()} kWh
                        </span>
                        {fm.devices.some((d) => d.isAbnormal) && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                            异常
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={() => setDataManagementOpen(false)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            关闭
          </button>
          <button
            onClick={() => {
              detectMergeDiffs();
              setDataManagementOpen(false);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            确认并应用
          </button>
        </div>
      </div>
    </div>
  );
};
