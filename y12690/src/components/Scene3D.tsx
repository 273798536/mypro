import { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useApp } from '../context/AppContext';
import type { PipeElement, Collision, Vec3 } from '../types';
import { convertToMM } from '../utils';

const COLORS = {
  pipe: '#3B82F6',
  support: '#6B7280',
  beam: '#8B5CF6',
  flange: '#F59E0B',
  valve: '#10B981',
  empty: '#6B7280',
  duplicate: '#EF4444',
};

function PipeMesh({ element }: { element: PipeElement }) {
  const sizeMM = useMemo(
    () => element.size.map((v) => convertToMM(v, element.unit) / 1000) as Vec3,
    [element.size, element.unit]
  );
  const posMM = useMemo(
    () => element.position.map((v) => convertToMM(v, element.unit) / 1000) as Vec3,
    [element.position, element.unit]
  );

  let color = COLORS[element.type] ?? '#4B5563';
  if (element.isEmpty) color = '#374151';
  if (element.isDuplicate) color = COLORS.duplicate;

  const wireframe = element.isEmpty || !!element.rawNotes;

  return (
    <mesh position={posMM} castShadow receiveShadow>
      <boxGeometry args={sizeMM} />
      <meshStandardMaterial
        color={color}
        transparent={wireframe}
        opacity={wireframe ? 0.35 : 0.92}
        wireframe={wireframe}
        roughness={0.5}
        metalness={0.3}
      />
      {(element.isEmpty || element.isDuplicate || element.rawNotes) && (
        <Html position={[0, sizeMM[1] / 2 + 0.3, 0]} center distanceFactor={8}>
          <div className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
            element.isDuplicate ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-200'
          }`}>
            {element.isDuplicate ? '重复' : element.isEmpty ? '空值' : element.rawNotes || '备注'}
          </div>
        </Html>
      )}
    </mesh>
  );
}

function CollisionMarker({ collision, selected, onClick }: { collision: Collision; selected: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(
    () => collision.position.map((v) => v / 1000) as Vec3,
    [collision.position]
  );

  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.15;
      ref.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={pos} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={collision.colorCode}
          transparent
          opacity={0.6}
          emissive={collision.colorCode}
          emissiveIntensity={selected ? 0.8 : 0.4}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={collision.colorCode} />
      </mesh>
      <Html position={[0, 0.5, 0]} center distanceFactor={10}>
        <div
          className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap border ${
            selected ? 'bg-white text-gray-900 border-white' : 'bg-black/70 text-white border-gray-600'
          }`}
        >
          {collision.type === 'collision' ? '碰撞' : collision.type === 'boundary' ? '越界' : '警告'}
          {collision.isCritical ? ' · 严重' : ''}
        </div>
      </Html>
    </group>
  );
}

function BoundaryBox({ margin }: { margin: number }) {
  const half = margin / 1000;
  const points: [Vec3, Vec3][] = [
    [[-half, -half, -half], [half, -half, -half]],
    [[half, -half, -half], [half, half, -half]],
    [[half, half, -half], [-half, half, -half]],
    [[-half, half, -half], [-half, -half, -half]],
    [[-half, -half, half], [half, -half, half]],
    [[half, -half, half], [half, half, half]],
    [[half, half, half], [-half, half, half]],
    [[-half, half, half], [-half, -half, half]],
    [[-half, -half, -half], [-half, -half, half]],
    [[half, -half, -half], [half, -half, half]],
    [[half, half, -half], [half, half, half]],
    [[-half, half, -half], [-half, half, half]],
  ];
  return (
    <group>
      {points.map((p, i) => (
        <Line
          key={i}
          points={[p[0], p[1]]}
          color="#F59E0B"
          lineWidth={1}
          transparent
          opacity={0.5}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      ))}
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const { cameraPosition } = useApp();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const pos: Vec3 = [cameraPosition[0] / 1000, cameraPosition[1] / 1000, cameraPosition[2] / 1000];
    camera.position.set(pos[0], pos[1], pos[2]);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 2, 0);
      controlsRef.current.update();
    }
  }, [cameraPosition, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      target={[0, 2, 0]}
      minDistance={1}
      maxDistance={80}
    />
  );
}

function SceneContent() {
  const {
    activeRecord,
    showCollisions,
    showBoundaries,
    boundaryMargin,
    selectedCollisionId,
    selectCollision,
  } = useApp();

  if (!activeRecord) {
    return (
      <Html center>
        <div className="panel-card p-6 text-center">
          <p className="text-gray-400 mb-2">未选择记录</p>
          <p className="text-sm text-gray-500">请从左侧选择或导入三维模型</p>
        </div>
      </Html>
    );
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 8, -10]} intensity={0.4} color="#94A3B8" />
      <pointLight position={[0, 8, 0]} intensity={0.3} />

      <Grid
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#374151"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4B5563"
        fadeDistance={60}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <group>
        {activeRecord.elements.map((el) => (
          <PipeMesh key={el.id} element={el} />
        ))}
      </group>

      {showCollisions && activeRecord.collisions.map((col) => (
        <CollisionMarker
          key={col.id}
          collision={col}
          selected={col.id === selectedCollisionId}
          onClick={() => selectCollision(col.id)}
        />
      ))}

      {showBoundaries && <BoundaryBox margin={boundaryMargin} />}

      <CameraController />
    </>
  );
}

function ColorLegend() {
  const items = [
    { color: COLORS.pipe, label: '管道' },
    { color: COLORS.support, label: '支架' },
    { color: COLORS.beam, label: '横梁' },
    { color: COLORS.valve, label: '阀门' },
    { color: COLORS.flange, label: '法兰' },
    { color: '#DC2626', label: '碰撞/严重' },
    { color: '#EA580C', label: '越界警告' },
    { color: COLORS.duplicate, label: '重复构件' },
    { color: '#374151', label: '空值/备注' },
  ];
  return (
    <div className="panel-card p-3 text-xs space-y-1.5 max-w-[180px]">
      <div className="text-gray-400 font-semibold mb-1 uppercase tracking-wider">颜色图例</div>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: it.color }} />
          <span className="text-gray-300">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Scene3D() {
  const { activeRecord, restoreViewpoint } = useApp();
  const [vpName, setVpName] = useState('');
  const { saveViewpoint } = useApp();

  const handleSaveViewpoint = () => {
    if (!vpName.trim()) return;
    saveViewpoint(vpName.trim());
    setVpName('');
  };

  return (
    <div className="flex-1 relative min-h-0 bg-slate-950">
      <Canvas
        shadows
        camera={{ fov: 50, near: 0.1, far: 1000, position: [15, 12, 18] }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0B1220']} />
        <fog attach="fog" args={['#0B1220', 30, 80]} />
        <SceneContent />
      </Canvas>

      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <ColorLegend />
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3 pointer-events-none">
        <div className="panel-card p-3 pointer-events-auto flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            value={vpName}
            onChange={(e) => setVpName(e.target.value)}
            placeholder="输入视角名称后保存..."
            className="flex-1 bg-slate-800 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveViewpoint()}
          />
          <button className="btn-primary text-sm" onClick={handleSaveViewpoint}>
            保存视角
          </button>
        </div>

        {activeRecord && activeRecord.viewpoints.length > 0 && (
          <div className="panel-card p-2 pointer-events-auto max-w-md overflow-x-auto scrollbar-thin">
            <div className="flex gap-1.5">
              {activeRecord.viewpoints.map((vp) => (
                <button
                  key={vp.id}
                  onClick={() => restoreViewpoint(vp)}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded border border-gray-600 whitespace-nowrap"
                  title={vp.description}
                >
                  📷 {vp.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
