import { AlertTriangle, CheckCircle, Info, Database } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { checkDataStatus } from '../../utils/dataProcessing';

export default function StatusPanel() {
  const { pointCloudData, measurements } = useAppStore();
  
  const dataStatus = checkDataStatus(pointCloudData);
  const needsReviewMeasurements = measurements.filter((m) => m.status === 'needs_review');
  const directUseMeasurements = measurements.filter((m) => m.status === 'direct_use');

  return (
    <div className="bg-gray-900 bg-opacity-95 rounded-lg p-4 backdrop-blur-sm border border-blue-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">状态概览</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">数据质量</div>
          <div className="space-y-2">
            {dataStatus.hasNulls && (
              <div className="flex items-center space-x-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400">
                  存在 {pointCloudData?.metadata.nullCount} 个空值数据
                </span>
              </div>
            )}
            
            {dataStatus.hasDuplicates && (
              <div className="flex items-center space-x-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400">
                  存在 {pointCloudData?.metadata.duplicateCount} 个重复数据
                </span>
              </div>
            )}
            
            {dataStatus.hasNotes && (
              <div className="flex items-center space-x-2 text-xs">
                <Info className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400">
                  包含 {pointCloudData?.metadata.noteCount} 个含备注项
                </span>
              </div>
            )}
            
            {!dataStatus.hasNulls && !dataStatus.hasDuplicates && !dataStatus.hasNotes && (
              <div className="flex items-center space-x-2 text-xs">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400">数据质量良好</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">测量统计</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-gray-700 rounded">
              <div className="text-lg text-cyan-400 font-bold">{measurements.length}</div>
              <div className="text-xs text-gray-400">总测量数</div>
            </div>
            <div className="text-center p-2 bg-green-900 bg-opacity-30 rounded border border-green-800">
              <div className="text-lg text-green-400 font-bold">{directUseMeasurements.length}</div>
              <div className="text-xs text-green-400">直接可用</div>
            </div>
          </div>
          
          {needsReviewMeasurements.length > 0 && (
            <div className="mt-2 p-2 bg-orange-900 bg-opacity-30 rounded border border-orange-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-xs text-orange-400 font-medium">
                    {needsReviewMeasurements.length} 项需复核
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    请编辑测量记录，添加结论后转为可用状态
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {pointCloudData && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">数据信息</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">材料:</span>
                <span className="text-gray-300">{pointCloudData.metadata.material}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">缺陷点数:</span>
                <span className="text-gray-300">{pointCloudData.points.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">数据来源:</span>
                <span className="text-gray-300">{pointCloudData.metadata.source}</span>
              </div>
            </div>
          </div>
        )}

        {pointCloudData && (dataStatus.hasNulls || dataStatus.hasDuplicates) && (
          <div className="p-3 bg-orange-900 bg-opacity-30 rounded-lg border border-orange-800">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
              <div>
                <div className="text-xs text-orange-400 font-medium mb-1">
                  运维提示
                </div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  当前数据包含质量问题，建议：
                  <br />
                  1. 点击左侧"切片工具"进行数据清洗
                  <br />
                  2. 或联系运维主管复核数据
                </div>
              </div>
            </div>
          </div>
        )}

        {measurements.length > 0 && directUseMeasurements.length > 0 && (
          <div className="p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-800">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <div className="text-xs text-green-400 font-medium mb-1">
                  可直接使用的结论
                </div>
                <div className="text-xs text-gray-300">
                  已完成 {directUseMeasurements.length} 项测量并添加结论，可直接用于报告
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
