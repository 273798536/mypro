import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { HandKeypoints } from './HandKeypoints';
import { PianoKeyboard } from './PianoKeyboard';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { HandKeyframe } from '@/types';
import * as THREE from 'three';

interface SceneContentProps {
  leftHandFrame?: HandKeyframe;
  rightHandFrame?: HandKeyframe;
  currentErrorType?: string;
  hasDataGap: boolean;
}

function SceneContent({ leftHandFrame, rightHandFrame, currentErrorType, hasDataGap }: SceneContentProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <spotLight position={[5, 8, 5]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <spotLight position={[-5, 8, 5]} angle={0.3} penumbra={1} intensity={0.6} />
      
      <PianoKeyboard activeNotes={[]} />
      
      {leftHandFrame && (
        <HandKeypoints
          keypoints={leftHandFrame.fingerKeypoints}
          hand="left"
          errorType={currentErrorType}
          hasDataGap={hasDataGap}
        />
      )}
      
      {rightHandFrame && (
        <HandKeypoints
          keypoints={rightHandFrame.fingerKeypoints}
          hand="right"
          errorType={currentErrorType}
          hasDataGap={hasDataGap}
        />
      )}
      
      <ContactShadows
        position={[0, -0.05, 0]}
        opacity={0.4}
        scale={5}
        blur={2}
        far={4}
      />
      
      <OrbitControls
        makeDefault
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={1}
        maxDistance={4}
      />
      
      <Environment preset="studio" />
      
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} />
      </EffectComposer>
    </>
  );
}

function PlaybackController() {
  const { isPlaying, playbackSpeed, currentTime, setCurrentTime, session } = usePlaybackStore();
  const lastTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (isPlaying) {
      const newTime = currentTime + delta * playbackSpeed;
      if (newTime >= session.totalDuration) {
        setCurrentTime(0);
      } else {
        setCurrentTime(newTime);
      }
    }
  });

  return null;
}

export function HandScene() {
  const { currentKeyframes, currentErrors, hasDataGap, session, setCurrentTime } = usePlaybackStore();

  useEffect(() => {
    setCurrentTime(0);
  }, [setCurrentTime]);

  const leftHandFrame = currentKeyframes.find(kf => kf.hand === 'left');
  const rightHandFrame = currentKeyframes.find(kf => kf.hand === 'right');
  const currentErrorType = currentErrors[0]?.type;

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 1.5, 2.5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(180deg, #0A2342 0%, #1a3a5c 100%)' }}
      >
        <SceneContent
          leftHandFrame={leftHandFrame}
          rightHandFrame={rightHandFrame}
          currentErrorType={currentErrorType}
          hasDataGap={hasDataGap}
        />
        <PlaybackController />
      </Canvas>
      
      {hasDataGap && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">数据缺口警告</span>
          </div>
          <p className="text-sm mt-1 opacity-90">
            当前时间段数据不完整，3D手型渲染可能不准确
          </p>
        </div>
      )}
    </div>
  );
}
