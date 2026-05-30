import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { crackPoints } from '@/data/mockData';
import useAppStore from '@/store/useAppStore';

export default function CrackMarkers() {
  const showCracks = useAppStore((state) => state.showCracks);
  const showDuplicateCracks = useAppStore((state) => state.showDuplicateCracks);
  const hoveredObject = useAppStore((state) => state.hoveredObject);
  const setHoveredObject = useAppStore((state) => state.setHoveredObject);
  const currentTimeIndex = useAppStore((state) => state.currentTimeIndex);

  const visibleCracks = useMemo(() => {
    return crackPoints.filter((crack, index) => {
      if (index > currentTimeIndex + 2) return false;
      if (!showDuplicateCracks && crack.isDuplicate) return false;
      return true;
    });
  }, [currentTimeIndex, showDuplicateCracks]);

  if (!showCracks) return null;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'tensile': return '张拉裂缝';
      case 'shear': return '剪切裂缝';
      case 'compression': return '挤压裂缝';
      default: return type;
    }
  };

  return (
    <group>
      {visibleCracks.map((crack) => (
        <group
          key={crack.id}
          position={crack.position as [number, number, number]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredObject(crack.id);
          }}
          onPointerOut={() => setHoveredObject(null)}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[crack.width, crack.width + 0.3, 32]} />
            <meshBasicMaterial
              color={crack.isDuplicate ? '#a855f7' : '#ef4444'}
              transparent
              opacity={0.8}
              side={2}
            />
          </mesh>
          <mesh position={[0, crack.depth / 2, 0]}>
            <cylinderGeometry args={[crack.width * 0.3, crack.width * 0.5, crack.depth, 8]} />
            <meshStandardMaterial
              color={crack.isDuplicate ? '#a855f7' : '#ef4444'}
              emissive={crack.isDuplicate ? '#a855f7' : '#ef4444'}
              emissiveIntensity={hoveredObject === crack.id ? 0.5 : 0.2}
            />
          </mesh>
          {crack.isDuplicate && (
            <mesh position={[0, crack.depth + 1, 0]}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshBasicMaterial color="#a855f7" />
            </mesh>
          )}
          {hoveredObject === crack.id && (
            <Html position={[0, crack.depth + 2, 0]} center distanceFactor={15}>
              <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-slate-700 shadow-xl min-w-[160px]">
                <div className="font-medium flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: crack.isDuplicate ? '#a855f7' : '#ef4444' }}
                  />
                  {crack.id}
                </div>
                <div className="text-slate-400 text-xs mt-1">
                  类型: {getTypeLabel(crack.type)}
                </div>
                <div className="text-slate-400 text-xs">
                  宽度: {crack.width}m | 深度: {crack.depth}m
                </div>
                <div className="text-slate-400 text-xs">
                  日期: {crack.timestamp}
                </div>
                {crack.isDuplicate && (
                  <div className="text-purple-400 text-xs mt-1 font-medium">
                    ⚠️ 重复记录 (与 {crack.duplicateWith} 重复)
                  </div>
                )}
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}
