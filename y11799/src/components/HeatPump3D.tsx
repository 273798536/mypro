import { useRef, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store';
import { getHeatPumpById } from '@/data/heatPumps';

interface PartProps {
  position: [number, number, number];
  color: string;
  emissiveIntensity: number;
  label: string;
  info: string;
  children?: React.ReactNode;
}

const Part = ({ position, color, emissiveIntensity, label, info, children }: PartProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = hovered
        ? 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.2
        : emissiveIntensity;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {children}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        metalness={0.7}
        roughness={0.3}
      />
      {hovered && (
        <Html position={[0, 1, 0]} center distanceFactor={10}>
          <div className="bg-slate-800/95 text-white px-4 py-3 rounded-lg shadow-xl whitespace-nowrap border border-slate-600">
            <div className="font-bold text-blue-400 text-sm mb-1">{label}</div>
            <div className="text-xs text-slate-300 max-w-xs">{info}</div>
          </div>
        </Html>
      )}
    </mesh>
  );
};

const HeatPumpModel = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { input, result } = useAppStore();
  const heatPump = getHeatPumpById(input.heatPumpId);

  const efficiencyColor = useMemo(() => {
    if (!result) return '#64748b';
    if (result.cop >= 4.5) return '#22c55e';
    if (result.cop >= 3.5) return '#3b82f6';
    if (result.cop >= 2.5) return '#f59e0b';
    return '#ef4444';
  }, [result]);

  const glowIntensity = useMemo(() => {
    if (!result) return 0.1;
    return Math.min(0.4, result.cop / 15);
  }, [result]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Part
        position={[0, 0.5, 0]}
        color="#475569"
        emissiveIntensity={0.05}
        label="主机外壳"
        info={`${heatPump?.brand || ''} ${heatPump?.model || ''}\n额定制热量: ${heatPump?.ratedCapacity || 0}kW\n额定COP: ${heatPump?.ratedCOP || 0}`}
      >
        <boxGeometry args={[2, 1.5, 1]} />
      </Part>

      <Part
        position={[0, 1.5, 0]}
        color="#64748b"
        emissiveIntensity={0.03}
        label="顶部盖板"
        info="保护内部组件，便于维护检修"
      >
        <boxGeometry args={[2.1, 0.1, 1.1]} />
      </Part>

      <Part
        position={[-0.6, 0.5, 0.51]}
        color={efficiencyColor}
        emissiveIntensity={glowIntensity}
        label="蒸发器"
        info={`当前COP: ${result?.cop || 'N/A'}\n效率状态: ${result ? (result.cop >= 4 ? '优秀' : result.cop >= 3 ? '良好' : '一般') : '待计算'}\n从室外空气中吸收热量`}
      >
        <boxGeometry args={[0.8, 0.8, 0.05]} />
      </Part>

      <Part
        position={[0.6, 0.5, 0]}
        color="#94a3b8"
        emissiveIntensity={0.05}
        label="压缩机"
        info={`耗电量: ${result?.powerConsumption || 0} kW\n功率输入: ${heatPump?.powerInput || 0} kW\n系统核心部件，压缩制冷剂`}
      >
        <cylinderGeometry args={[0.25, 0.3, 0.6, 16]} />
      </Part>

      <Part
        position={[0.6, 0.2, 0]}
        color="#cbd5e1"
        emissiveIntensity={0.02}
        label="储液罐"
        info="储存制冷剂，稳定系统运行"
      >
        <cylinderGeometry args={[0.15, 0.15, 0.3, 12]} />
      </Part>

      <Part
        position={[0, -0.25, 0]}
        color="#334155"
        emissiveIntensity={0.02}
        label="底座"
        info="支撑整机，减震降噪"
      >
        <boxGeometry args={[2.2, 0.15, 1.2]} />
      </Part>

      <Part
        position={[-1.1, 0.8, 0]}
        color="#0ea5e9"
        emissiveIntensity={0.1}
        label="供水出口"
        info={`供水温度: ${input.supplyWaterTemp}℃\n输送热水至室内末端`}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
      </Part>

      <Part
        position={[-1.1, 0.2, 0]}
        color="#0284c7"
        emissiveIntensity={0.08}
        label="回水入口"
        info="冷水回流，重新加热"
      >
        <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
      </Part>

      <mesh position={[0, 0.5, -0.6]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive={efficiencyColor}
          emissiveIntensity={glowIntensity * 0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      <group position={[0, 1.8, 0]}>
        <mesh>
          <torusGeometry args={[0.3, 0.02, 16, 50]} />
          <meshBasicMaterial color={efficiencyColor} transparent opacity={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.01, 8, 32]} />
          <meshBasicMaterial color={efficiencyColor} transparent opacity={0.3} />
        </mesh>
      </group>
    </group>
  );
};

const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#60a5fa" />
      <pointLight position={[0, 2, 2]} intensity={0.8} color="#3b82f6" />
      
      <Suspense fallback={null}>
        <HeatPumpModel />
        <Environment preset="city" />
      </Suspense>

      <ContactShadows
        position={[0, -0.4, 0]}
        opacity={0.5}
        scale={5}
        blur={2}
        far={4}
      />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={false}
      />

      <gridHelper args={[10, 10, '#334155', '#1e293b']} position={[0, -0.4, 0]} />
    </>
  );
};

const HeatPump3D = () => {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [4, 3, 4], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 8, 15]} />
        <Scene />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded-lg">
        <div>🖱️ 拖拽旋转 | 滚轮缩放</div>
        <div>📍 悬停部件查看详情</div>
      </div>
    </div>
  );
};

export default HeatPump3D;
