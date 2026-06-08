import { useState } from 'react';
import { Scissors, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { cleanPointCloudData, checkDataStatus } from '../../utils/dataProcessing';
import type { PointCloudData } from '../../types';

export default function SliceTool() {
  const { pointCloudData, importData, setSlicePlane, slicePlane } = useAppStore();
  const [cleanedData, setCleanedData] = useState<PointCloudData | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const dataStatus = checkDataStatus(cleanedData || pointCloudData);

  const handleCleanData = () => {
    if (!pointCloudData) return;
    
    setIsCleaning(true);
    
    setTimeout(() => {
      const cleaned = cleanPointCloudData(pointCloudData);
      setCleanedData(cleaned);
      setIsCleaning(false);
    }, 500);
  };

  const handleApplyCleaned = () => {
    if (cleanedData) {
      importData(cleanedData);
      setCleanedData(null);
    }
  };

  const handleToggleSlice = () => {
    setSlicePlane({ active: !slicePlane.active });
  };

  const handleAxisChange = (axis: 'x' | 'y' | 'z') => {
    const normal = { x: 0, y: 0, z: 0 };
    normal[axis] = 1;
    setSlicePlane({ normal });
  };

  return (
    <div className="bg-gray-900 bg-opacity-95 rounded-lg p-4 backdrop-blur-sm border border-purple-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Scissors className="w-5 h-5 text-purple-400" />
          <span className="text-purple-400 text-sm font-medium">切片工具</span>
        </div>
        <button
          onClick={handleToggleSlice}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            slicePlane.active
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {slicePlane.active ? '激活' : '禁用'}
        </button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2">切片轴向</div>
        <div className="flex space-x-2">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <button
              key={axis}
              onClick={() => handleAxisChange(axis)}
              className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                slicePlane.normal[axis] === 1
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {axis.toUpperCase()}轴
            </button>
          ))}
        </div>
      </div>

      {pointCloudData && (
        <>
          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">数据状态</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">空值数量</span>
                <div className="flex items-center space-x-1">
                  {dataStatus.hasNulls ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  <span className={`text-xs font-mono ${
                    dataStatus.hasNulls ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {cleanedData ? cleanedData.metadata.nullCount : pointCloudData.metadata.nullCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">重复数量</span>
                <div className="flex items-center space-x-1">
                  {dataStatus.hasDuplicates ? (
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  <span className={`text-xs font-mono ${
                    dataStatus.hasDuplicates ? 'text-orange-400' : 'text-green-400'
                  }`}>
                    {cleanedData ? cleanedData.metadata.duplicateCount : pointCloudData.metadata.duplicateCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">含备注项</span>
                <div className="flex items-center space-x-1">
                  {dataStatus.hasNotes ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  <span className={`text-xs font-mono ${
                    dataStatus.hasNotes ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {cleanedData ? cleanedData.metadata.noteCount : pointCloudData.metadata.noteCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleCleanData}
              disabled={isCleaning || (!dataStatus.hasNulls && !dataStatus.hasDuplicates)}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isCleaning ? 'animate-spin' : ''}`} />
              <span>{isCleaning ? '清洗中...' : '清洗数据'}</span>
            </button>

            {cleanedData && (
              <button
                onClick={handleApplyCleaned}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>应用清洗结果</span>
              </button>
            )}
          </div>

          {cleanedData && (
            <div className="mt-4 p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-800">
              <div className="text-xs text-green-400 mb-2">清洗结果预览</div>
              <div className="text-xs text-gray-300 space-y-1">
                <div>原始点数: {pointCloudData.points.length}</div>
                <div>清洗后: {cleanedData.points.length}</div>
                <div className="text-green-400">
                  移除: {pointCloudData.points.length - cleanedData.points.length} 个问题点
                </div>
              </div>
            </div>
          )}

          {dataStatus.needsReview && !cleanedData && (
            <div className="mt-4 p-3 bg-orange-900 bg-opacity-30 rounded-lg border border-orange-800">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5" />
                <div className="text-xs text-orange-300">
                  检测到数据质量问题，建议点击"清洗数据"进行处理
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
