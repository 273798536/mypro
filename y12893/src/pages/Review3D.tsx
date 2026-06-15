import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IslandScene } from '@/components/3D/IslandScene';
import { SceneControls } from '@/components/3D/SceneControls';
import { RecordDetailPanel } from '@/components/UI/RecordDetailPanel';
import { useDataStore } from '@/store/useDataStore';
import type { DataRecord } from '@/types';

export default function Review3D() {
  const navigate = useNavigate();
  const { records, selectedRecord, selectRecord, loadRecords, loadStats } = useDataStore();

  useEffect(() => {
    loadRecords();
    loadStats();
  }, [loadRecords, loadStats]);

  const handleRecordClick = (record: DataRecord) => {
    selectRecord(record);
  };

  const handleCloseDetail = () => {
    selectRecord(null);
  };

  return (
    <div className="h-[calc(100vh-3rem)] -mx-6 -my-6">
      <div className="relative w-full h-full">
        <IslandScene onRecordClick={handleRecordClick} />
        <SceneControls />

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-6 py-3">
            <h1 className="text-lg font-bold text-[#0A2463]">3D交互复核</h1>
            <p className="text-xs text-gray-500 text-center">
              点击数据点查看详情 · 鼠标拖拽旋转 · 滚轮缩放
            </p>
          </div>
        </div>

        <div className="absolute bottom-20 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">数据统计</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#3E92CC]">{records.length}</p>
                <p className="text-[10px] text-gray-500">总记录</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E63946]">
                  {records.filter(r => r.qualityIssues.length > 0).length}
                </p>
                <p className="text-[10px] text-gray-500">异常</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2A9D8F]">
                  {records.filter(r => r.status === 'approved').length}
                </p>
                <p className="text-[10px] text-gray-500">已通过</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-20 right-4 z-10">
          <button
            onClick={() => navigate('/workbench')}
            className="bg-gradient-to-r from-[#0A2463] to-[#3E92CC] text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-medium flex items-center gap-2"
          >
            前往复核工作台
          </button>
        </div>
      </div>

      {selectedRecord && (
        <RecordDetailPanel record={selectedRecord} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
