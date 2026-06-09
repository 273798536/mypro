import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useData } from '../store/DataContext';
import { DataRecord, SectionData } from '../types';
import { StatusBadge, TypeBadge } from '../components/Badges';
import { formatDateTime } from '../utils/helpers';

function PointCloud({ data, highlight = false }: { data: number[][]; highlight?: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr: number[] = [];
    data.forEach((row, y) => {
      row.forEach((v, x) => {
        arr.push((x - row.length / 2) * 0.15, v * 0.05 - 2, (y - data.length / 2) * 0.15);
      });
    });
    return new Float32Array(arr);
  }, [data]);

  const colors = useMemo(() => {
    const arr: number[] = [];
    data.forEach(row => {
      row.forEach(v => {
        const t = v / 100;
        const color = new THREE.Color().setHSL(0.6 - t * 0.6, 0.8, 0.3 + t * 0.4);
        arr.push(color.r, color.g, color.b);
      });
    });
    return new Float32Array(arr);
  }, [data]);

  useFrame(() => {
    if (ref.current && highlight) {
      ref.current.rotation.y += 0.001;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={highlight ? 0.12 : 0.08} vertexColors transparent opacity={highlight ? 1 : 0.85} sizeAttenuation />
    </points>
  );
}

function SectionPlane({ index, total }: { index: number; total: number }) {
  const offset = (index - (total - 1) / 2) * 2.5;
  return (
    <mesh position={[0, 0, offset]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8, 6]} />
      <meshStandardMaterial color="#0099CC" transparent opacity={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Scene3D({ section, allSections }: { section: SectionData | null; allSections: SectionData[] }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.9} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#aaccff" />
      <Grid cellSize={1} cellThickness={0.5} cellColor="#334155" sectionSize={5} fadeDistance={30} fadeStrength={1} infiniteGrid position={[0, -2.5, 0]} />

      {allSections.map((s, i) => (
        <group key={s.id}>
          <SectionPlane index={i} total={allSections.length} />
          <group position={[0, 0, (i - (allSections.length - 1) / 2) * 2.5]}>
            <PointCloud data={s.sliceData} highlight={section?.id === s.id} />
          </group>
        </group>
      ))}

      <OrbitControls enableDamping dampingFactor={0.08} minDistance={5} maxDistance={40} />
    </>
  );
}

function Heatmap2D({ data }: { data: number[][] }) {
  return (
    <div className="inline-block border border-slate-200 rounded overflow-hidden">
      {data.map((row, y) => (
        <div key={y} className="flex">
          {row.map((v, x) => {
            const t = v / 100;
            const h = (0.6 - t * 0.6) * 360;
            const l = 30 + t * 40;
            return (
              <div
                key={x}
                title={`(${x},${y}): ${v}`}
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: `hsl(${h}, 80%, ${l}%)`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function SectionPage() {
  const { recordId } = useParams<{ recordId?: string }>();
  const navigate = useNavigate();
  const { records, sections, getSectionsByRecordId, getRecordById } = useData();

  const modelRecords = useMemo(() => records.filter(r => r.type === 'model'), [records]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(recordId || null);

  useEffect(() => {
    if (recordId) setSelectedRecordId(recordId);
    else if (modelRecords.length > 0 && !selectedRecordId) setSelectedRecordId(modelRecords[0].id);
  }, [recordId, modelRecords]);

  const selectedRecord: DataRecord | undefined = selectedRecordId ? getRecordById(selectedRecordId) : undefined;
  const currentSections: SectionData[] = selectedRecordId ? getSectionsByRecordId(selectedRecordId) : [];
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (currentSections.length > 0 && !activeSectionId) {
      setActiveSectionId(currentSections[0].id);
    }
    if (currentSections.length > 0 && activeSectionId && !currentSections.find(s => s.id === activeSectionId)) {
      setActiveSectionId(currentSections[0].id);
    }
  }, [currentSections]);

  const activeSection = currentSections.find(s => s.id === activeSectionId) || null;

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">剖切分析</h3>
          <p className="text-sm text-slate-500 mt-1">
            月底或课前复核用。点云切片与结论双向关联，复盘时可直接跳回原始记录。
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRecord && (
            <button
              onClick={() => navigate(`/detail/${selectedRecord.id}`)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
            >
              ← 跳回记录详情
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-200px)]">
        <div className="col-span-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700">三维模型列表</h4>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-100">
            {modelRecords.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">暂无三维模型记录</div>
            ) : (
              modelRecords.map(r => {
                const rSections = getSectionsByRecordId(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRecordId(r.id);
                      navigate(`/section/${r.id}`, { replace: true });
                    }}
                    className={`w-full text-left p-3 transition ${
                      selectedRecordId === r.id ? 'bg-ocean-light/50 border-l-4 border-tech-blue' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TypeBadge type={r.type} />
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {r.data.name || r.data.modelId || r.fileName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {r.fileName} · {rSections.length} 个切片
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-700">
                3D 点云剖切视图
                {selectedRecord && (
                  <span className="ml-2 text-xs text-slate-500 font-normal">
                    — {selectedRecord.data.name || selectedRecord.data.modelId}
                  </span>
                )}
              </h4>
            </div>
            <div className="text-[11px] text-slate-400">拖拽旋转 / 滚轮缩放</div>
          </div>
          <div className="flex-1 bg-gradient-to-b from-slate-100 to-slate-200">
            {currentSections.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="text-4xl mb-2">📐</div>
                <div className="text-sm">该模型暂无剖切切片数据</div>
                <div className="text-xs mt-1">请选择有切片数据的模型记录</div>
              </div>
            ) : (
              <Canvas
                camera={{ position: [8, 6, 12], fov: 50 }}
                gl={{ antialias: true }}
                dpr={[1, 2]}
              >
                <color attach="background" args={['#e2e8f0']} />
                <Scene3D section={activeSection} allSections={currentSections} />
              </Canvas>
            )}
          </div>
        </div>

        <div className="col-span-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700">切片与结论</h4>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {!selectedRecord ? (
              <div className="p-6 text-center text-xs text-slate-400">请先选择一个模型</div>
            ) : currentSections.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">该模型暂无剖切数据</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {currentSections.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSectionId(s.id)}
                    className={`p-3 cursor-pointer transition ${
                      activeSectionId === s.id ? 'bg-ocean-light/50 border-l-4 border-tech-blue' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-700">切片 #{s.sliceIndex + 1}</span>
                      <span className="text-[10px] text-slate-400">{formatDateTime(s.timestamp)}</span>
                    </div>
                    <div className="flex gap-3 items-start">
                      <Heatmap2D data={s.sliceData.map(row => row.slice(0, 15))} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-700 leading-relaxed">{s.conclusion}</div>
                        <Link
                          to={`/detail/${s.recordId}`}
                          className="inline-block mt-2 text-[11px] text-tech-blue hover:underline"
                        >
                          溯源到记录 →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeSection && selectedRecord && (
            <div className="border-t border-slate-100 p-4 bg-slate-50">
              <div className="text-[11px] text-slate-500 mb-1">当前切片关联记录</div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TypeBadge type={selectedRecord.type} />
                <StatusBadge status={selectedRecord.status} />
              </div>
              <div className="text-xs font-medium text-slate-800 truncate">
                {selectedRecord.data.name || selectedRecord.data.modelId || selectedRecord.fileName}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                {selectedRecord.fileName} · 行 {selectedRecord.originalLine}
              </div>
              <button
                onClick={() => navigate(`/detail/${selectedRecord.id}`)}
                className="mt-2 w-full text-xs py-1.5 bg-tech-blue text-white rounded hover:bg-tech-blue/90 transition"
              >
                查看完整详情
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
