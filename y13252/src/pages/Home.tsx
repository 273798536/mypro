import { useEffect, useState } from 'react';
import { FileText, MapPin, AlertTriangle } from 'lucide-react';
import { useComplaintStore } from '../store/useComplaintStore.js';
import Toolbar from '../components/Toolbar.js';
import ComplaintCard from '../components/ComplaintCard.js';
import MapView from '../components/MapView.js';
import PhotoList from '../components/PhotoList.js';
import ChangeHistory from '../components/ChangeHistory.js';
import AddPhotoModal from '../components/AddPhotoModal.js';
import { formatTime, getStatusText, getStatusColor } from '../utils/geoUtils.js';

export default function Home() {
  const { complaints, selectedComplaintId, selectComplaint, fetchAll, fetchStatus, getSelectedComplaint } = useComplaintStore();
  const [showAddPhoto, setShowAddPhoto] = useState(false);

  useEffect(() => {
    fetchAll();
    fetchStatus();
  }, [fetchAll, fetchStatus]);

  const selectedComplaint = getSelectedComplaint();

  return (
    <div className="min-h-screen flex flex-col">
      <Toolbar onAddPhoto={() => setShowAddPhoto(true)} />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] bg-slate-100 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1e3a5f]" />
              投诉列表
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              共 {complaints.length} 条记录
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {complaints.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">暂无数据</p>
                <p className="text-xs text-slate-400 mt-1">点击上方"放样例"按钮生成测试数据</p>
              </div>
            ) : (
              complaints.map((complaint, index) => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  selected={complaint.id === selectedComplaintId}
                  onClick={() => selectComplaint(complaint.id)}
                  index={index}
                />
              ))
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {selectedComplaint ? (
            <div className="p-6 space-y-6">
              <div className="animate-fade-in bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-slate-800">
                        {selectedComplaint.title}
                      </h2>
                      <span className={`text-xs px-2.5 py-1 rounded border ${getStatusColor(selectedComplaint.status)}`}>
                        {getStatusText(selectedComplaint.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {selectedComplaint.address}
                      </span>
                      <span>投诉编号: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{selectedComplaint.id}</code></span>
                      <span>创建时间: {formatTime(selectedComplaint.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-slate-500">投诉坐标</div>
                    <div className="font-mono text-sm text-slate-700">
                      ({selectedComplaint.latitude.toFixed(6)}, {selectedComplaint.longitude.toFixed(6)})
                    </div>
                    {selectedComplaint.hasCoordinateOffset && (
                      <div className="text-xs text-amber-600 mt-1 flex items-center justify-end gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        检测到坐标偏移，最大{selectedComplaint.offsetDistance}米
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-[#1e3a5f]">{selectedComplaint.photos.length}</div>
                    <div className="text-xs text-slate-500 mt-1">巡检照片</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">
                      {selectedComplaint.photos.filter(p => p.isNameMismatch).length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">名称不一致</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-500">
                      {selectedComplaint.hasCoordinateOffset ? '是' : '否'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">坐标偏移</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-500">{selectedComplaint.changeHistory.length}</div>
                    <div className="text-xs text-slate-500 mt-1">变更记录</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <MapView complaint={selectedComplaint} />
                <div className="space-y-6">
                  <ChangeHistory changes={selectedComplaint.changeHistory} />
                </div>
              </div>
              
              <PhotoList
                photos={selectedComplaint.photos}
                complaintLat={selectedComplaint.latitude}
                complaintLon={selectedComplaint.longitude}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-lg">请选择左侧投诉记录查看详情</p>
                <p className="text-sm mt-2">如无数据，请点击顶部"放样例"按钮</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <AddPhotoModal open={showAddPhoto} onClose={() => setShowAddPhoto(false)} />
    </div>
  );
}
