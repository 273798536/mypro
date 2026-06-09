import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import { getRegionById } from '@/data/brainRegions';
import { useCameraState } from '@/hooks/useCameraState';
import type { ConnectionRecord, RecordStatus } from '@/types';
import { BrainRegionNode } from './BrainRegionNode';
import { ConnectionLine } from './ConnectionLine';
import { ColorLegend } from './ColorLegend';
import { CameraBridge } from './CameraBridge';

interface RegionAggregatedInfo {
  status: RecordStatus | 'idle';
  outOfBounds: boolean;
  hasHighRisk: boolean;
  recordIds: string[];
}

const CameraController = () => {
  const { applySnapshot } = useCameraState();
  const { savedViewpoints, currentViewpointId } = useAppStore();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentViewpointId && appliedRef.current !== currentViewpointId) {
      const vp = savedViewpoints.find((v) => v.id === currentViewpointId);
      if (vp) {
        applySnapshot({
          position: vp.cameraPosition,
          target: vp.cameraTarget,
        });
        appliedRef.current = currentViewpointId;
      }
    }
    if (!currentViewpointId) {
      appliedRef.current = null;
    }
  }, [currentViewpointId, savedViewpoints, applySnapshot]);

  return null;
};

const SceneContent = () => {
  const {
    brainRegions,
    records,
    selectedRecordId,
    selectRecord,
    currentViewpointId,
    savedViewpoints,
  } = useAppStore();

  const regionInfo = useMemo(() => {
    const map = new Map<string, RegionAggregatedInfo>();
    brainRegions.forEach((r) => {
      map.set(r.id, {
        status: 'idle',
        outOfBounds: false,
        hasHighRisk: false,
        recordIds: [],
      });
    });

    const priority: Record<RecordStatus | 'idle', number> = {
      invalid: 3,
      pending: 2,
      normal: 1,
      idle: 0,
    };

    records.forEach((rec) => {
      [rec.fromRegion, rec.toRegion].forEach((rid) => {
        const info = map.get(rid);
        if (!info) return;
        info.recordIds.push(rec.id);
        if (priority[rec.status] > priority[info.status]) {
          info.status = rec.status;
        }
        if (rec.outOfBounds) info.outOfBounds = true;
        if (
          rec.riskNotes.some((n) => n.severity === 'high') ||
          rec.status === 'invalid'
        ) {
          info.hasHighRisk = true;
        }
      });
    });

    return map;
  }, [brainRegions, records]);

  const selectedRecord: ConnectionRecord | undefined = useMemo(
    () => records.find((r) => r.id === selectedRecordId),
    [records, selectedRecordId],
  );

  return (
    <>
      <hemisphereLight args={['#67E8F9', '#F59E0B', 0.7]} />
      <pointLight position={[0, 4, 4]} intensity={0.8} color="#FFFBEB" />
      <pointLight position={[0, -3, -2]} intensity={0.3} color="#22D3EE" />
      <ambientLight intensity={0.15} />

      <gridHelper
        args={[14, 28, '#1E293B', '#0F172A']}
        position={[0, -3.5, 0]}
      />

      {brainRegions.map((region) => {
        const info = regionInfo.get(region.id) ?? {
          status: 'idle' as const,
          outOfBounds: false,
          hasHighRisk: false,
          recordIds: [],
        };
        const isSelected =
          selectedRecord !== undefined &&
          (selectedRecord.fromRegion === region.id ||
            selectedRecord.toRegion === region.id);

        return (
          <BrainRegionNode
            key={region.id}
            region={region}
            status={info.status}
            isSelected={isSelected}
            outOfBounds={info.outOfBounds}
            hasHighRisk={info.hasHighRisk}
            onClick={() => {
              if (info.recordIds.length > 0) {
                selectRecord(
                  selectedRecordId && info.recordIds.includes(selectedRecordId)
                    ? null
                    : info.recordIds[0],
                );
              }
            }}
          />
        );
      })}

      {records.map((rec) => {
        const isSelected = rec.id === selectedRecordId;
        const dim =
          selectedRecord !== undefined &&
          !isSelected &&
          selectedRecord.fromRegion !== rec.fromRegion &&
          selectedRecord.fromRegion !== rec.toRegion &&
          selectedRecord.toRegion !== rec.fromRegion &&
          selectedRecord.toRegion !== rec.toRegion;

        return (
          <group key={rec.id} visible={dim ? false : true}>
            <ConnectionLine
              record={rec}
              isSelected={isSelected}
              onClick={() => selectRecord(isSelected ? null : rec.id)}
            />
          </group>
        );
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={22}
      />
      <CameraBridge />
      <CameraController />

      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
};

export const BrainAtlas3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#050814]"
      style={{
        background:
          'radial-gradient(ellipse at center, #0B1026 0%, #050814 55%, #02040A 100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%224%22><rect width=%224%22 height=%224%22 fill=%22%23ffffff%22/></svg>")',
        }}
      />
      <Canvas
        camera={{ position: [8, 4, 8], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        onCreated={({ scene, gl }) => {
          scene.fog = new THREE.FogExp2('#050814', 0.045);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <SceneContent />
      </Canvas>
      <ColorLegend />
      <div className="pointer-events-none absolute bottom-3 left-4 text-[10px] font-mono text-slate-500">
        拖拽旋转 · 滚轮缩放 · 右键平移
      </div>
    </div>
  );
};
