import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import Scene3D from '@/components/three/Scene3D';
import StatusBadge from '@/components/ui/StatusBadge';
import Timeline from '@/components/ui/Timeline';
import {
  ArrowLeft,
  MapPin,
  Eye,
  AlertTriangle,
  Camera,
  Clock,
  User,
  Database,
  Ruler,
  Target,
  Box,
  History,
  FileText,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

const evidenceTypeLabels: Record<string, string> = {
  distance: '距离测量',
  raycast: '射线检测',
  frustum: '视锥体分析',
  history: '历史记录',
};

const evidenceTypeIcons: Record<string, JSX.Element> = {
  distance: <Ruler className="w-4 h-4" />,
  raycast: <Target className="w-4 h-4" />,
  frustum: <Box className="w-4 h-4" />,
  history: <History className="w-4 h-4" />,
};

export default function ConflictDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    conflicts,
    cameras,
    venueObjects,
    cameraHistories,
    updateConflictStatus,
    setSelectedCamera,
    focusedCameraIds,
  } = useAppStore();

  const conflict = conflicts.find(c => c.id === id);
  const cameraA = cameras.find(c => c.id === conflict?.cameraAId);
  const cameraB = conflict?.cameraBId ? cameras.find(c => c.id === conflict.cameraBId) : undefined;
  const venueObject = conflict?.venueObjectId ? venueObjects.find(v => v.id === conflict.venueObjectId) : undefined;

  const cameraAHistory = cameraA ? cameraHistories.filter(h => h.cameraId === cameraA.id) : [];
  const cameraBHistory = cameraB ? cameraHistories.filter(h => h.cameraId === cameraB.id) : [];

  if (!conflict) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">未找到冲突记录</h2>
          <p className="text-gray-400 mb-4">该冲突可能已被删除或不存在</p>
          <button
            onClick={() => navigate('/workspace')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
          >
            返回工作台
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/workspace');
  };

  const formatValue = (key: string, value: any): string => {
    if (key.includes('position') || key.includes('distance')) {
      return `${Number(value).toFixed(2)} 米`;
    }
    if (key.includes('angle') || key.includes('rotation') || key.includes('fov')) {
      return `${Number(value).toFixed(1)}°`;
    }
    return String(value);
  };

  const getConflictWhyFailed = (): string => {
    switch (conflict.type) {
      case 'position':
        const dist = conflict.evidence.find(e => e.type === 'distance')?.data.distance;
        return `安全距离要求是1.5米，但这两个机位只相距${dist ? Number(dist).toFixed(2) : '约0.4'}米，` +
               `摄像机和三脚架会互相打架，摄像师连转身的空间都没有。`;
      case 'occlusion':
        const objName = venueObject?.name || '障碍物';
        return `从${cameraA?.number}号机位看向比赛场地时，视线被${objName}挡住了。` +
               `这意味着转播画面会出现柱子或墙壁，观众看不到比赛。`;
      case 'boundary':
        return `${cameraA?.number}号机位的镜头照到了禁摄区域。` +
               `这个区域可能包含未经授权的人员、敏感设备，或者会穿帮到后台。`;
      default:
        return conflict.humanDescription;
    }
  };

  const getSuggestedFix = (): string[] => {
    switch (conflict.type) {
      case 'position':
        return [
          '将相冲突的其中一个机位沿水平方向至少移动1.2米',
          '如果场地受限，可以考虑升高其中一个机位的三脚架',
          '与导播沟通，确认是否可以合并两个机位的功能',
        ];
      case 'occlusion':
        return [
          '将机位向左或向右平移，避开遮挡物',
          '升高机位高度，从遮挡物上方拍摄',
          '改用长焦镜头，从更远的位置拍摄',
          '如果是立柱遮挡，可以考虑在对面增设补位机位',
        ];
      case 'boundary':
        return [
          '调整镜头的水平转角（Pan），避开禁摄区域',
          '缩小镜头视场角（改用更长焦距）',
          '如果必须保留该视角，需申请特殊拍摄许可',
        ];
      default:
        return ['请根据具体情况调整机位参数'];
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-white">冲突详情</h1>
                <StatusBadge type="conflictType" value={conflict.type} />
                <StatusBadge type="severity" value={conflict.severity} />
                <StatusBadge type="status" value={conflict.status} />
              </div>
              <p className="text-sm text-gray-400">
                检测时间：{new Date(conflict.detectedAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>

          {conflict.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => updateConflictStatus(conflict.id, 'resolved')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                标记已解决
              </button>
              <button
                onClick={() => updateConflictStatus(conflict.id, 'accepted')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                接受风险
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 bg-gray-900/50 border-r border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">问题说明</h2>
            </div>
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
              <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                为什么通不过？
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {getConflictWhyFailed()}
              </p>
            </div>
          </div>

          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">整改建议</h2>
            </div>
            <ul className="space-y-2">
              {getSuggestedFix().map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600/20 text-green-400 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">涉事机位</h2>
            </div>

            <div className="space-y-4">
              {cameraA && (
                <div
                  className={`bg-gray-800/50 rounded-lg p-4 border transition-colors cursor-pointer ${
                    focusedCameraIds.includes(cameraA.id)
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedCamera(cameraA.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-blue-400">{cameraA.number}</span>
                      <div>
                        <div className="font-medium text-white">{cameraA.name}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {cameraA.operator}
                        </div>
                      </div>
                    </div>
                    <StatusBadge type="severity" value="critical" size="sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-500 mb-1">X</div>
                      <div className="text-cyan-400">{cameraA.position.x.toFixed(2)}m</div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-500 mb-1">Y</div>
                      <div className="text-green-400">{cameraA.position.y.toFixed(2)}m</div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-500 mb-1">Z</div>
                      <div className="text-purple-400">{cameraA.position.z.toFixed(2)}m</div>
                    </div>
                  </div>
                </div>
              )}

              {cameraB && (
                <div
                  className={`bg-gray-800/50 rounded-lg p-4 border transition-colors cursor-pointer ${
                    focusedCameraIds.includes(cameraB.id)
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedCamera(cameraB.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-red-400">{cameraB.number}</span>
                      <div>
                        <div className="font-medium text-white">{cameraB.name}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {cameraB.operator}
                        </div>
                      </div>
                    </div>
                    <StatusBadge type="severity" value="critical" size="sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-500 mb-1">X</div>
                      <div className="text-cyan-400">{cameraB.position.x.toFixed(2)}m</div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-500 mb-1">Y</div>
                      <div className="text-green-400">{cameraB.position.y.toFixed(2)}m</div>
                    </div>
                    <div className="bg-gray-900/50 rounded p-2">
                      <div className="text-gray-500 mb-1">Z</div>
                      <div className="text-purple-400">{cameraB.position.z.toFixed(2)}m</div>
                    </div>
                  </div>
                </div>
              )}

              {venueObject && (
                <div className="bg-orange-900/20 border border-orange-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Box className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 font-medium">关联场馆物体</span>
                  </div>
                  <div className="text-white font-medium">{venueObject.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    类型：{venueObject.type === 'restricted' ? '禁摄区域' : 
                           venueObject.type === 'pillar' ? '立柱' :
                           venueObject.type === 'wall' ? '墙壁' :
                           venueObject.type === 'field' ? '比赛场地' : '看台'}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">检测证据</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              每项冲突都有可追溯的计算依据，点击可查看详细数据
            </p>

            <div className="space-y-3">
              {conflict.evidence.map((evidence, index) => (
                <div
                  key={evidence.id}
                  className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">
                        {evidenceTypeIcons[evidence.type]}
                      </span>
                      <span className="text-sm font-medium text-white">
                        #{index + 1} {evidenceTypeLabels[evidence.type]}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{evidence.description}</span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(evidence.data).map(([key, value]) => (
                        <div key={key} className="bg-gray-900/50 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">{key}</div>
                          <div className="font-mono text-sm text-cyan-400">
                            {formatValue(key, value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">修改历史追溯</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              查看涉事机位的参数变更记录，帮助定位冲突产生的原因
            </p>

            {cameraA && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {cameraA.number}号机位历史记录
                </h3>
                <Timeline history={cameraAHistory.slice(0, 5)} />
              </div>
            )}

            {cameraB && (
              <div>
                <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {cameraB.number}号机位历史记录
                </h3>
                <Timeline history={cameraBHistory.slice(0, 5)} />
              </div>
            )}

            {!cameraA && !cameraB && (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无历史记录
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <Scene3D />
          <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">3D视图说明</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-gray-300">冲突机位（红色高亮闪烁）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500/30" />
                <span className="text-gray-300">镜头视锥（蓝色半透明）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500/50" />
                <span className="text-gray-300">禁摄区域（橙色网格）</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-gray-900/90 backdrop-blur rounded-lg p-4 border border-gray-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-white mb-1">技术描述</div>
                <p className="text-sm text-gray-400">{conflict.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    检测算法：{conflict.type === 'position' ? '欧式距离计算' :
                              conflict.type === 'occlusion' ? '射线相交检测' : '视锥体相交检测'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    检测时间：{new Date(conflict.detectedAt).toLocaleTimeString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
