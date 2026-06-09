import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Layers,
  FileText,
  Database,
  Activity,
  Droplets,
  Box,
  AlertTriangle,
  ChevronRight,
  RefreshCcw,
} from 'lucide-react';
import { useAppStore } from '@/store';
import PointCloud3DViewer from '@/components/PointCloud3DViewer';
import { RiskBadge } from '@/components/StatusBadge';
import { formatDate, formatNumber, formatDateShort } from '@/utils/format';
import { generateFingerprint } from '@/utils/deduplication';
import type { CrossSectionData } from '@/types';

export default function CollisionDetection() {
  const navigate = useNavigate();
  const {
    tanks,
    slices,
    importRecords,
    selectedSliceId,
    selectSlice,
    importSlice,
    resetToSampleData,
  } = useAppStore();

  const selectedSlice = slices.find((s) => s.id === selectedSliceId) || slices[0];

  const stats = useMemo(() => {
    const totalPoints = slices.reduce((acc, s) => acc + s.pointCount, 0);
    const riskCounts = {
      low: slices.filter((s) => s.collisionRisk === 'low').length,
      medium: slices.filter((s) => s.collisionRisk === 'medium').length,
      high: slices.filter((s) => s.collisionRisk === 'high').length,
    };
    const totalCapacity = tanks.reduce((acc, t) => acc + t.capacity, 0);
    const totalFill = tanks.reduce((acc, t) => acc + t.currentFill, 0);
    return { totalPoints, riskCounts, totalCapacity, totalFill };
  }, [slices, tanks]);

  const handleImportDemoData = () => {
    if (!tanks[0]) return;

    const generateDemoCrossSection = (seed: number): CrossSectionData => {
      const points = [];
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (let i = 0; i < 500; i++) {
        const pseudo = Math.sin(seed * 1000 + i * 0.1) * 0.5 + 0.5;
        const angle = (i / 500) * Math.PI * 2 + pseudo * 0.1;
        const radius = 2.5 + Math.sin(i * 0.05 + seed) * 0.3;
        const noise = Math.sin(i * 0.3 + seed * 2) * 0.1;
        const x = Math.cos(angle) * radius + noise;
        const y = seed * 3;
        const z = Math.sin(angle) * radius + noise;

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
        points.push({ x, y, z, intensity: 0.5 + pseudo * 0.5 });
      }
      return { plane: 'XZ' as const, position: seed, points, boundaries: { minX, maxX, minY, maxY, minZ, maxZ } };
    };

    const now = new Date().toISOString();
    const seed = Date.now() % 1000 / 100;
    const crossSection = generateDemoCrossSection(seed);

    importSlice({
      tankId: tanks[0].id,
      tankName: tanks[0].name,
      timestamp: now,
      pointCount: crossSection.points.length,
      crossSection,
      pointDensity: 280 + Math.floor(Math.random() * 100),
      spacingDeviation: 5 + Math.random() * 15,
      collisionIndex: 500 + Math.floor(Math.random() * 1200),
      collisionRisk: Math.random() > 0.7 ? 'medium' : 'low',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">碰撞检测</h1>
          <p className="text-tech-gray-400 mt-1">日常监控入口 - 点云数据实时监测与碰撞风险分析</p>
        </div>
        <div className="flex gap-3">
          <button onClick={resetToSampleData} className="btn-secondary flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            重置示例数据
          </button>
          <button onClick={handleImportDemoData} className="btn-primary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            导入演示数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-tech-gray-400 text-sm">压载舱总数</span>
            <Box className="w-5 h-5 text-deep-sea-400" />
          </div>
          <p className="text-3xl font-bold text-white">{tanks.length}</p>
          <p className="text-xs text-tech-gray-500 mt-1">
            总容量 {formatNumber(stats.totalCapacity, 0)} m³
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-tech-gray-400 text-sm">当前充载</span>
            <Droplets className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{formatNumber(stats.totalFill, 0)}</p>
          <p className="text-xs text-tech-gray-500 mt-1">
            m³ · 占比 {formatNumber((stats.totalFill / stats.totalCapacity) * 100, 1)}%
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-tech-gray-400 text-sm">点云总数</span>
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">{formatNumber(stats.totalPoints, 0)}</p>
          <p className="text-xs text-tech-gray-500 mt-1">
            {slices.length} 个切片 · {importRecords.length} 次导入
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-tech-gray-400 text-sm">风险状态</span>
            <Activity className="w-5 h-5 text-warning-orange-500" />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-white">{stats.riskCounts.medium + stats.riskCounts.high}</p>
            <span className="text-xs text-warning-orange-500">需关注</span>
          </div>
          <p className="text-xs text-tech-gray-500 mt-1">
            低风险 {stats.riskCounts.low} · 中风险 {stats.riskCounts.medium}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">3D 点云预览</h2>
              {selectedSlice && (
                <p className="text-sm text-tech-gray-400 mt-1">
                  {selectedSlice.tankName} · {formatDate(selectedSlice.timestamp)}
                </p>
              )}
            </div>
            {selectedSlice?.collisionRisk && <RiskBadge risk={selectedSlice.collisionRisk} />}
          </div>
          {selectedSlice ? (
            <PointCloud3DViewer
              crossSection={selectedSlice.crossSection}
              collisionRisk={selectedSlice.collisionRisk}
              height="420px"
            />
          ) : (
            <div className="h-[420px] flex items-center justify-center text-tech-gray-500">
              暂无点云数据，请先导入
            </div>
          )}
          <div className="flex items-center justify-between mt-4 text-xs text-tech-gray-500">
            <span>提示：拖拽旋转视角，滚轮缩放</span>
            <button
              onClick={() => navigate('/slices')}
              className="text-deep-sea-400 hover:text-deep-sea-300 flex items-center gap-1 transition-colors"
            >
              查看详细切片 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-orange-500" />
              实时状态
            </h3>
            {selectedSlice ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-tech-gray-400 text-sm">切片 ID</span>
                  <span className="text-white text-sm font-mono">{selectedSlice.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-tech-gray-400 text-sm">数据指纹</span>
                  <span className="text-tech-gray-300 text-xs font-mono truncate max-w-[140px]">
                    {selectedSlice.fingerprint}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-tech-gray-400 text-sm">点数量</span>
                  <span className="text-white text-sm">{formatNumber(selectedSlice.pointCount, 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-tech-gray-400 text-sm">点密度</span>
                  <span className="text-white text-sm">
                    {selectedSlice.pointDensity} points/m³
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-tech-gray-400 text-sm">间距偏差</span>
                  <span className={`text-sm ${
                    (selectedSlice.spacingDeviation ?? 0) > 15
                      ? 'text-warning-orange-500'
                      : 'text-white'
                  }`}>
                    {selectedSlice.spacingDeviation}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-tech-gray-400 text-sm">碰撞指数</span>
                  <span className={`text-sm ${
                    (selectedSlice.collisionIndex ?? 0) > 1500
                      ? 'text-warning-orange-500'
                      : 'text-white'
                  }`}>
                    {selectedSlice.collisionIndex}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <button
                    onClick={() => navigate('/calculator')}
                    className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    打开计算工具
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-tech-gray-500 text-sm">暂无数据</p>
            )}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-deep-sea-400" />
              快速切换切片
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
              {slices.map((slice) => (
                <button
                  key={slice.id}
                  onClick={() => selectSlice(slice.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedSliceId === slice.id
                      ? 'bg-deep-sea-500/20 border border-deep-sea-500/30'
                      : 'bg-tech-gray-900/40 border border-transparent hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{slice.tankName}</span>
                    {slice.collisionRisk && <RiskBadge risk={slice.collisionRisk} />}
                  </div>
                  <p className="text-xs text-tech-gray-500 mt-1">
                    {formatNumber(slice.pointCount, 0)} 点 · {formatDateShort(slice.timestamp)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
