import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useConfigStore } from '../../store/useConfigStore';
import { Magnet3D } from './Magnet3D';
import { FieldLines } from './FieldLines';

export function Scene3D() {
  const { magnets, fieldLineParams, fieldLineVersion, interaction } = useConfigStore();
  const [selectedMagnetId, setSelectedMagnetId] = useState<string | null>(null);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} />
        <pointLight position={[0, 3, 0]} intensity={0.8} color="#00d4ff" />
        
        <Environment preset="city" />
        
        <Grid
          position={[0, -1, 0]}
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#475569"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
        />
        
        {magnets.map((magnet) => (
          <Magnet3D
            key={magnet.id}
            magnet={magnet}
            isSelected={selectedMagnetId === magnet.id}
            onSelect={() => setSelectedMagnetId(magnet.id)}
          />
        ))}
        
        <FieldLines
          magnets={magnets}
          params={fieldLineParams}
          version={fieldLineVersion}
        />
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={15}
          enabled={!interaction.isDragging}
        />
      </Canvas>
      
      <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
        <div className="text-sm text-slate-300 font-medium">
          磁体数量: {magnets.length} | 场线版本: {fieldLineVersion}
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
        <div className="text-xs text-slate-400">
          <div>🖱️ 拖拽磁体移动位置</div>
          <div>🔄 右键拖动旋转视角</div>
          <div>🔍 滚轮缩放</div>
        </div>
      </div>
    </div>
  );
}
