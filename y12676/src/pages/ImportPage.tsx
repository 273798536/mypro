import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShotSession, ShotPoint, OutlierType } from '../types';
import { getOutlierTypeLabel } from '../mockData';

function generateDemoPoints(count: number): ShotPoint[] {
  const outliers: Array<{ index: number; type: OutlierType }> = [
    { index: Math.floor(count * 0.15), type: 'drift' },
    { index: Math.floor(count * 0.45), type: 'camera-loss' },
    { index: Math.floor(count * 0.5), type: 'camera-loss' },
    { index: Math.floor(count * 0.55), type: 'camera-loss' },
    { index: Math.floor(count * 0.72), type: 'interference' },
    { index: Math.floor(count * 0.85), type: 'noise' },
  ];

  const points: ShotPoint[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = 0.3 + 9.5 * t + (Math.random() - 0.5) * 0.08;
    const z = 0.2 + 4.8 * Math.sin(t * Math.PI) + (Math.random() - 0.5) * 0.06;
    const y = -4.9 * t * t + 9.8 * t + 2.05 + (Math.random() - 0.5) * 0.05;

    const outlier = outliers.find(o => o.index === i);
    const isOutlier = !!outlier;

    let fx = x, fy = y, fz = z;
    if (isOutlier && outlier) {
      switch (outlier.type) {
        case 'drift': fx += 2.3; fy += 3.1; fz += 1.5; break;
        case 'camera-loss': fx -= 1.8; fy += 5.2; fz -= 2.0; break;
        case 'interference': fx += 0.8; fy -= 2.5; fz += 1.1; break;
        case 'noise': fx += 0.5; fy += 0.8; fz -= 0.4; break;
        default: fx += 1.5; fy += 2.0; fz += 0.9;
      }
    }

    const segId = i < count * 0.33 ? 'seg-01' : i < count * 0.66 ? 'seg-02' : 'seg-03';
    const segName = segId === 'seg-01' ? '第一段-起跳到出手' : segId === 'seg-02' ? '第二段-出手到最高点' : '第三段-最高点到入筐';

    points.push({
      id: `pt-${String(i).padStart(3, '0')}`,
      index: i,
      timestamp: Date.now() - (count - i) * 80,
      x: fx, y: fy, z: fz,
      originalX: x, originalY: y, originalZ: z,
      isOutlier,
      outlierType: outlier?.type || 'unknown',
      source: isOutlier && outlier ? getOutlierTypeLabel(outlier.type).source : 'MotionCapture-正常采集',
      confidence: isOutlier ? 0.15 + Math.random() * 0.25 : 0.88 + Math.random() * 0.1,
      status: 'raw',
      materialId: segId,
      materialName: segName,
      changeHistory: [],
    });
  }
  return points;
}

export function ImportPage() {
  const { sessions, currentSession, setCurrentSession, importSession } = useApp();
  const [dragOver, setDragOver] = useState(false);

  const handleImport = (fileName: string) => {
    const count = 45 + Math.floor(Math.random() * 15);
    const hasCamLoss = Math.random() > 0.5;
    const points = generateDemoPoints(count);

    const newSession: ShotSession = {
      id: `session-${Date.now()}`,
      name: `导入数据-${new Date().toLocaleDateString('zh-CN')} #${Math.floor(Math.random() * 99)}`,
      materialName: fileName,
      createdAt: Date.now(),
      hasCameraLoss: hasCamLoss,
      cameraLossSegments: hasCamLoss ? [{ start: Math.floor(count * 0.42), end: Math.floor(count * 0.58) }] : [],
      materialSegments: [
        { id: 'seg-01', name: '第一段-起跳到出手', startIndex: 0, endIndex: Math.floor(count * 0.33), sourceFile: fileName },
        { id: 'seg-02', name: '第二段-出手到最高点', startIndex: Math.floor(count * 0.33) + 1, endIndex: Math.floor(count * 0.66), sourceFile: fileName },
        { id: 'seg-03', name: '第三段-最高点到入筐', startIndex: Math.floor(count * 0.66) + 1, endIndex: count - 1, sourceFile: fileName },
      ],
      processed: false,
      conclusions: {
        raw: hasCamLoss
          ? `检测到相机视角丢失段，建议按流程执行三步处理。共检测到 ${points.filter(p => p.isOutlier).length} 个异常点。`
          : `数据已导入，检测到 ${points.filter(p => p.isOutlier).length} 个异常点。`,
      },
      solutions: {
        're-run': { type: 're-run', applied: false, operator: '', affectedPointIds: [] },
        're-record': { type: 're-record', applied: false, operator: '', affectedPointIds: [] },
        'manual': { type: 'manual', applied: false, operator: '', affectedPointIds: [] },
      },
      points,
    };
    importSession(newSession);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">数据导入</h1>
        <p className="text-sm text-gray-500 mt-1">
          上传 CSV / JSON 格式的设备坐标数据文件，或选择下方已有的会话继续处理
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
              dragOver ? 'border-accent bg-orange-50 shadow-lg' : 'border-gray-300 bg-white'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              handleImport(e.dataTransfer.files[0]?.name || 'imported-data.csv');
            }}
          >
            <span className="material-icons text-6xl text-primary">cloud_upload</span>
            <p className="text-lg font-medium text-gray-800 mt-4">拖放 CSV / JSON 文件到此处</p>
            <p className="text-sm text-gray-500 mt-1">真实设备坐标导出格式</p>
            <input
              type="file"
              className="hidden"
              id="fileInput"
              accept=".csv,.json"
              onChange={e => handleImport(e.target.files?.[0]?.name || 'imported-data.csv')}
            />
            <button
              onClick={() => document.getElementById('fileInput')?.click()}
              className="mt-5 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-blue-800 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-icons text-sm">attach_file</span>
              选择文件
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="material-icons text-accent text-lg">info</span>
              支持的数据格式
            </h3>
            <div className="text-sm text-gray-600 space-y-1.5">
              <p>• CSV：timestamp, x, y, z, confidence</p>
              <p>• JSON：{`[{timestamp, x, y, z, confidence, ...}]`}</p>
              <p>• 坐标单位：米 (m)，符合动作捕捉标准</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">已导入会话</h2>
            <span className="text-xs text-gray-500">共 {sessions.length} 个会话</span>
          </div>
          <div className="divide-y max-h-[70vh] overflow-auto">
            {sessions.map(session => {
              const outlierCount = session.points.filter(p => p.isOutlier).length;
              const progress = Object.values(session.solutions).filter(s => s.applied).length;
              return (
                <div
                  key={session.id}
                  onClick={() => setCurrentSession(session)}
                  className={`p-5 cursor-pointer transition-colors ${
                    currentSession?.id === session.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 truncate">{session.name}</p>
                        {session.hasCameraLoss && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1 whitespace-nowrap">
                            <span className="material-icons text-xs">visibility_off</span>
                            视角丢失
                          </span>
                        )}
                        {session.processed && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full whitespace-nowrap">
                            已处理
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 font-mono truncate">
                        📄 {session.materialName}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-xs">timeline</span>
                          {session.points.length} 点
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <span className="material-icons text-xs">error</span>
                          {outlierCount} 异常
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-xs">folder</span>
                          {session.materialSegments.length} 段材料
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-xs">task_alt</span>
                          {progress}/3 方案
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs text-gray-400">
                        {new Date(session.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {currentSession?.id === session.id && (
                        <span className="material-icons text-primary text-sm">check_circle</span>
                      )}
                    </div>
                  </div>

                  {progress > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>处理进度</span>
                        <span>{Math.round((progress / 3) * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progress === 3 ? 'bg-green-500' : 'bg-primary'}`}
                          style={{ width: `${(progress / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
