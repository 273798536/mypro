import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RiverbedMesh } from './RiverbedMesh';
import { WaterSurface } from './WaterSurface';
import { SectionMarker } from './SectionMarker';
import { useAppStore } from '../../store/useAppStore';
import { COLORS } from '../../types';
import { formatTimeShort } from '../../data/mockData';

function SceneContent({ showDiff = false }: { showDiff?: boolean }) {
  const {
    sections,
    flowData,
    time,
    calculationResult,
    comparePlan,
    selectedSectionId,
    selectSection,
    isCalculating,
  } = useAppStore();

  const fogRef = useRef<THREE.Fog>(null);

  useFrame((state, delta) => {
    if (time.isPlaying) {
      const newTime = time.currentTime + delta * time.playbackSpeed * 3600 * 1000 * 2;
      if (newTime >= time.endTime) {
        useAppStore.getState().setCurrentTime(time.startTime);
      } else {
        useAppStore.getState().setCurrentTime(newTime);
      }
    }
  });

  const sortedSections = useMemo(() =>
    [...sections].sort((a, b) => a.chainage - b.chainage),
    [sections]
  );

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[200, -80, 50]}
        fov={50}
        near={0.1}
        far={1000}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={300}
        maxPolarAngle={Math.PI / 2.1}
        target={[175, 0, 5]}
      />

      <fog
        ref={fogRef}
        attach="fog"
        args={['#0F172A', 100, 400]}
      />

      <ambientLight intensity={0.4} color="#ffffff" />

      <directionalLight
        position={[100, -100, 80]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-200, 200, 200, -200, 0.1, 500]}
        />
      </directionalLight>

      <directionalLight
        position={[-50, 50, 30]}
        intensity={0.3}
        color="#60A5FA"
      />

      <pointLight
        position={[175, 0, 30]}
        intensity={0.5}
        color={COLORS.primary}
        distance={100}
      />

      <Environment resolution={256}>
        <Lightformer
          position={[0, 0, 100]}
          scale={[100, 100, 1]}
          color="#ffffff"
          intensity={2}
          form="rect"
        />
        <Lightformer
          position={[0, -100, 50]}
          scale={[100, 50, 1]}
          color="#60A5FA"
          intensity={1}
          form="rect"
        />
      </Environment>

      <Grid
        position={[175, 0, -0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        args={[500, 200]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#1E293B"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={300}
        fadeStrength={1}
        followCamera={false}
      />

      <RiverbedMesh
        sections={sortedSections}
        result={calculationResult}
        currentTime={time.currentTime}
        selectedSectionId={selectedSectionId}
        onSectionClick={selectSection}
        compareResult={comparePlan?.resultData}
        showDiff={showDiff}
      />

      <WaterSurface
        sections={sortedSections}
        flowData={flowData}
        currentTime={time.currentTime}
      />

      {sortedSections.map((section) => (
        <SectionMarker
          key={section.id}
          section={section}
          result={calculationResult}
          isSelected={section.id === selectedSectionId}
          onClick={() => selectSection(section.id)}
          timeIndex={time.currentIndex}
        />
      ))}

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.5}
          mipmapBlur
        />
        <Vignette
          offset={0.5}
          darkness={0.5}
        />
      </EffectComposer>
    </>
  );
}

export function RiverbedViewer({ showDiff = false }: { showDiff?: boolean }) {
  const { time, calculationResult, isCalculating } = useAppStore();

  return (
    <div className="relative w-full h-full bg-[#0F172A] rounded-lg overflow-hidden">
      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0F172A']} />
        <SceneContent showDiff={showDiff} />
      </Canvas>

      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-600">
          <div className="text-slate-400 text-xs">当前时间</div>
          <div className="text-white font-mono text-lg">{formatTimeShort(time.currentTime)}</div>
        </div>

        {calculationResult && (
          <div className="bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-600">
            <div className="text-slate-400 text-xs">累计冲淤</div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-red-400">冲刷</span>
                <span className="text-white ml-1 font-mono">
                  {(calculationResult.erosionVolume / 10000).toFixed(2)}万m³
                </span>
              </div>
              <div>
                <span className="text-green-400">淤积</span>
                <span className="text-white ml-1 font-mono">
                  {(calculationResult.depositionVolume / 10000).toFixed(2)}万m³
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-600">
        <div className="text-slate-400 text-xs mb-2">冲淤图例</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.erosion }} />
          <span className="text-xs text-slate-300">冲刷</span>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#94A3B8' }} />
          <span className="text-xs text-slate-300">稳定</span>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.deposition }} />
          <span className="text-xs text-slate-300">淤积</span>
        </div>
      </div>

      {isCalculating && (
        <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
          <div className="bg-slate-800 px-6 py-4 rounded-lg border border-sky-500 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-500 border-t-transparent" />
            <span className="text-white">正在计算冲淤变化...</span>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-600">
        <div className="text-slate-400 text-xs">操作提示</div>
        <div className="text-xs text-slate-300 mt-1">
          <div>左键拖动: 旋转视角</div>
          <div>滚轮: 缩放</div>
          <div>右键拖动: 平移</div>
          <div>点击断面: 选择断面</div>
        </div>
      </div>
    </div>
  );
}
