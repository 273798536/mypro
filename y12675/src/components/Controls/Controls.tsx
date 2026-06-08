import { useState, useRef } from 'react';
import { Upload, RefreshCw, Play, Trash2, Zap } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { generateMockData, cleanPointCloudData, detectCollisions } from '../../utils/dataProcessing';
import type { PointCloudData } from '../../types';

export default function Controls() {
  const { 
    pointCloudData, 
    importData, 
    clearData, 
    reset,
    addCollision,
    collisions,
    timeState
  } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportMockData = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const mockData = generateMockData();
      importData(mockData);
      setIsLoading(false);
    }, 500);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as PointCloudData;
        
        if (!data.points || !data.metadata) {
          throw new Error('Invalid data format');
        }
        
        const cleanedData = cleanPointCloudData(data);
        importData(cleanedData);
        
        const currentDefects = cleanedData.points.filter(
          (d) => d.timestamp <= timeState.currentTime
        );
        const detectedCollisions = detectCollisions(currentDefects);
        detectedCollisions.forEach((collision) => addCollision(collision));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to parse file:', error);
        setIsLoading(false);
        alert('文件格式错误，请上传有效的JSON文件');
      }
    };
    
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTestDuplicateImport = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const mockData1 = generateMockData();
      importData(mockData1);
      
      setTimeout(() => {
        const mockData2 = generateMockData();
        importData(mockData2);
        
        setIsLoading(false);
      }, 1000);
    }, 500);
  };

  const handleReset = () => {
    clearData();
    reset();
  };

  return (
    <div className="bg-gray-900 bg-opacity-95 rounded-lg p-4 backdrop-blur-sm border border-gray-800">
      <div className="flex items-center space-x-2 mb-4">
        <Zap className="w-5 h-5 text-cyan-400" />
        <span className="text-cyan-400 text-sm font-medium">数据控制</span>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleImportMockData}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Play className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? '加载中...' : '导入模拟数据'}</span>
        </button>

        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>上传JSON文件</span>
          </label>
        </div>

        <button
          onClick={handleTestDuplicateImport}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>测试重复导入</span>
        </button>

        <button
          onClick={handleReset}
          disabled={!pointCloudData}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>清空数据</span>
        </button>
      </div>

      {pointCloudData && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">当前数据</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">缺陷数:</span>
              <span className="text-gray-300">{pointCloudData.points.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">材料:</span>
              <span className="text-gray-300">{pointCloudData.metadata.material}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">碰撞事件:</span>
              <span className={collisions.length > 0 ? 'text-orange-400' : 'text-gray-300'}>
                {collisions.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
