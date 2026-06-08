import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import {
  useAppStore,
  getRecordsOfCurrentBatch,
  getAnomaliesOfCurrentBatch,
} from '@/store/useAppStore';
import { CargoBox } from '@/components/CargoBox';
import {
  Scissors,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowRight,
  Box,
  AlertTriangle,
} from 'lucide-react';
import {
  AnomalyTypeBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/Badges';
import { useEffect } from 'react';

function CabinShell() {
  return (
    <group>
      <mesh position={[3, 4.5, 4]} receiveShadow>
        <boxGeometry args={[7, 0.1, 8.5]} />
        <meshStandardMaterial
          color="#1e3a5f"
          roughness={0.8}
          metalness={0.4}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-0.5, 2.5, 4]} receiveShadow>
        <boxGeometry args={[0.1, 4, 8.5]} />
        <meshStandardMaterial
          color="#2f5d94"
          roughness={0.7}
          metalness={0.5}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[6.5, 2.5, 4]} receiveShadow>
        <boxGeometry args={[0.1, 4, 8.5]} />
        <meshStandardMaterial
          color="#2f5d94"
          roughness={0.7}
          metalness={0.5}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[3, 2.5, -0.25]} receiveShadow>
        <boxGeometry args={[7, 4, 0.1]} />
        <meshStandardMaterial
          color="#2f5d94"
          roughness={0.7}
          metalness={0.5}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[3, 0, 4]} receiveShadow>
        <boxGeometry args={[7, 0.1, 8.5]} />
        <meshStandardMaterial color="#172d4a" roughness={0.9} metalness={0.3} />
      </mesh>
      <gridHelper
        args={[7, 14, '#2f5d94', '#1e3a5f']}
        position={[3, 0.06, 4]}
      />
    </group>
  );
}

function ClippingSetup({
  cutX,
  cutY,
  cutZ,
}: {
  cutX: number | null;
  cutY: number | null;
  cutZ: number | null;
}) {
  const { gl } = useThree();
  useMemo(() => {
    gl.localClippingEnabled = true;
  }, [gl]);
  return null;
}

function CutPlaneVisual({
  cutX,
  cutY,
  cutZ,
}: {
  cutX: number | null;
  cutY: number | null;
  cutZ: number | null;
}) {
  return (
    <group>
      {cutX !== null && (
        <mesh position={[cutX, 2.5, 4]}>
          <planeGeometry args={[5, 9]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {cutY !== null && (
        <mesh position={[3, cutY, 4]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7, 9]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {cutZ !== null && (
        <mesh position={[3, 2.5, cutZ]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[7, 5]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

export function Scene3DPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    cutPlanes,
    setCutPlane,
    resetCutPlanes,
    selectedRecordId,
    setSelectedRecord,
    records,
    anomalies,
    currentBatchId,
  } = useAppStore();

  useEffect(() => {
    const rec = searchParams.get('record');
    if (rec) setSelectedRecord(rec);
  }, [searchParams, setSelectedRecord]);

  const batchRecords = records.filter((r) => r.batchId === currentBatchId);
  const batchAnomalyIds = useMemo(
    () => new Set(batchRecords.map((r) => r.id)),
    [batchRecords]
  );
  const batchAnomalies = anomalies.filter((a) =>
    batchAnomalyIds.has(a.recordId)
  );
  const anomalyRecords = batchRecords.filter((r) =>
    batchAnomalies.some((a) => a.recordId === r.id)
  );

  const selectedRecord = batchRecords.find((r) => r.id === selectedRecordId);
  const selectedAnomalies = batchAnomalies.filter(
    (a) => a.recordId === selectedRecordId
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center gap-3 bg-gradient-to-b from-marine-900/80 to-transparent">
          <div className="flex items-center gap-2 bg-marine-800/80 backdrop-blur border border-marine-700/50 rounded px-3 py-2">
            <Scissors className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-marine-300">剖切：</span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-marine-400">X</span>
              <input
                type="range"
                min={0}
                max={6}
                step={0.1}
                value={cutPlanes.x ?? 0}
                onChange={(e) =>
                  setCutPlane(
                    'x',
                    e.target.value === '0' ? null : parseFloat(e.target.value)
                  )
                }
                className="w-20"
              />
              {cutPlanes.x !== null && (
                <button
                  onClick={() => setCutPlane('x', null)}
                  className="text-xs text-marine-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-marine-400">Y</span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.1}
                value={cutPlanes.y ?? 0}
                onChange={(e) =>
                  setCutPlane(
                    'y',
                    e.target.value === '0' ? null : parseFloat(e.target.value)
                  )
                }
                className="w-20"
              />
              {cutPlanes.y !== null && (
                <button
                  onClick={() => setCutPlane('y', null)}
                  className="text-xs text-marine-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-marine-400">Z</span>
              <input
                type="range"
                min={0}
                max={8}
                step={0.1}
                value={cutPlanes.z ?? 0}
                onChange={(e) =>
                  setCutPlane(
                    'z',
                    e.target.value === '0' ? null : parseFloat(e.target.value)
                  )
                }
                className="w-20"
              />
              {cutPlanes.z !== null && (
                <button
                  onClick={() => setCutPlane('z', null)}
                  className="text-xs text-marine-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={resetCutPlanes}
              className="flex items-center gap-1 px-2 py-1 text-xs text-marine-300 hover:text-white bg-marine-700/50 rounded ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              重置
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2 text-xs text-marine-400 bg-marine-800/80 backdrop-blur border border-marine-700/50 rounded px-3 py-2">
            <span className="flex items-center gap-1">
              <Box className="w-3 h-3 text-blue-400" /> 正常 {batchRecords.length - anomalyRecords.length}
            </span>
            <span className="text-marine-600">|</span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" /> 异常 {anomalyRecords.length}
            </span>
          </div>
        </div>

        <Canvas
          shadows
          gl={{ antialias: true, alpha: false }}
          style={{ background: 'linear-gradient(180deg, #0a1526 0%, #07101d 100%)' }}
        >
          <PerspectiveCamera
            makeDefault
            position={[9, 7, 11]}
            fov={45}
          />
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2.1}
          />

          <color attach="background" args={['#07101d']} />
          <fog attach="fog" args={['#07101d', 15, 35]} />

          <ambientLight intensity={0.35} />
          <directionalLight
            position={[8, 12, 6]}
            intensity={0.7}
            color="#88aaff"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-3, 6, -2]} intensity={0.4} color="#ffaa44" />
          <pointLight position={[4, 2, 10]} intensity={0.2} color="#66ccff" />

          <ClippingSetup
            cutX={cutPlanes.x}
            cutY={cutPlanes.y}
            cutZ={cutPlanes.z}
          />

          <CabinShell />
          <CutPlaneVisual
            cutX={cutPlanes.x}
            cutY={cutPlanes.y}
            cutZ={cutPlanes.z}
          />

          {batchRecords.map((r) => (
            <CargoBox
              key={r.id}
              record={r}
              anomalies={batchAnomalies.filter((a) => a.recordId === r.id)}
              isSelected={r.id === selectedRecordId}
              cutX={cutPlanes.x}
              cutY={cutPlanes.y}
              cutZ={cutPlanes.z}
              onClick={() =>
                setSelectedRecord(r.id === selectedRecordId ? null : r.id)
              }
            />
          ))}

          <Environment preset="city" />
        </Canvas>
      </div>

      <div className="w-80 bg-marine-900 border-l border-marine-700/50 flex flex-col">
        <div className="p-4 border-b border-marine-700/50">
          <div className="text-sm font-semibold text-white mb-1 flex items-center gap-1.5">
            <Box className="w-4 h-4 text-marine-300" />
            货物信息
          </div>
          <div className="text-xs text-marine-400">
            点击 3D 模型或下方列表查看详情
          </div>
        </div>

        {selectedRecord ? (
          <div className="p-4 border-b border-marine-700/50 bg-marine-800/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-mono text-white">
                  {selectedRecord.cargoNo}
                </div>
                <div className="text-xs text-marine-400 mt-0.5">
                  {selectedRecord.cabinNo}
                </div>
              </div>
              <button
                onClick={() => navigate(`/records/${selectedRecord.id}`)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-marine-700 hover:bg-marine-600 text-white rounded transition-colors"
              >
                详情
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-marine-500">坐标</div>
                <div className="text-marine-200 font-mono">
                  {selectedRecord.positionX.toFixed(2)},{' '}
                  {selectedRecord.positionY.toFixed(2)},{' '}
                  {selectedRecord.positionZ.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-marine-500">重量</div>
                <div className="text-marine-200 font-mono">
                  {selectedRecord.weight.toLocaleString()} kg
                </div>
              </div>
              <div>
                <div className="text-marine-500">体积</div>
                <div className="text-marine-200 font-mono">
                  {selectedRecord.volume.toFixed(2)} m³
                </div>
              </div>
              <div>
                <div className="text-marine-500">测量时间</div>
                <div className="text-marine-200 font-mono text-[10px]">
                  {new Date(selectedRecord.measuredAt).toLocaleString('zh-CN', {
                    hour12: false,
                  })}
                </div>
              </div>
            </div>
            {selectedAnomalies.length > 0 && (
              <div className="mt-3 pt-3 border-t border-marine-700/40 space-y-2">
                <div className="text-xs text-marine-400">异常</div>
                {selectedAnomalies.map((a) => (
                  <div
                    key={a.id}
                    className="p-2 rounded bg-marine-900/60 border border-marine-700/40"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <AnomalyTypeBadge type={a.type} />
                      <SeverityBadge severity={a.severity} />
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="text-xs text-marine-300">{a.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 border-b border-marine-700/50 text-xs text-marine-500">
            未选择货物
          </div>
        )}

        <div className="p-4 flex-1 overflow-auto">
          <div className="text-xs text-marine-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              异常货物列表
            </span>
            <span>{anomalyRecords.length} 项</span>
          </div>
          {anomalyRecords.length === 0 ? (
            <div className="text-xs text-marine-500 py-8 text-center">
              无异常货物
            </div>
          ) : (
            <div className="space-y-1.5">
              {anomalyRecords.map((r) => {
                const a = batchAnomalies.filter((x) => x.recordId === r.id);
                const isSel = r.id === selectedRecordId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecord(isSel ? null : r.id)}
                    className={`w-full text-left p-2.5 rounded border transition-colors ${
                      isSel
                        ? 'bg-marine-700/50 border-amber-500/40'
                        : 'bg-marine-800/40 border-marine-700/40 hover:bg-marine-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-marine-100">
                        {r.cargoNo}
                      </span>
                      <span className="text-[10px] text-marine-400">
                        {r.cabinNo}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {a.slice(0, 2).map((x) => (
                        <AnomalyTypeBadge key={x.id} type={x.type} />
                      ))}
                      {a.length > 2 && (
                        <span className="text-[10px] text-marine-500">
                          +{a.length - 2}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
