import { Html } from '@react-three/drei';
import { households } from '@/data/mockData';
import useAppStore from '@/store/useAppStore';

export default function HouseholdMarkers() {
  const showHouseholds = useAppStore((state) => state.showHouseholds);
  const showCoordinateErrors = useAppStore((state) => state.showCoordinateErrors);
  const hoveredObject = useAppStore((state) => state.hoveredObject);
  const setHoveredObject = useAppStore((state) => state.setHoveredObject);

  if (!showHouseholds) return null;

  return (
    <group>
      {households.map((household) => (
        <group key={household.id}>
          <group
            position={household.actualPosition as [number, number, number]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredObject(household.id);
            }}
            onPointerOut={() => setHoveredObject(null)}
          >
            <mesh position={[0, 2, 0]}>
              <boxGeometry args={[3, 3, 3]} />
              <meshStandardMaterial
                color={household.hasCoordinateError ? '#f59e0b' : '#3b82f6'}
              />
            </mesh>
            <mesh position={[0, 4.5, 0]}>
              <coneGeometry args={[2.2, 2, 4]} />
              <meshStandardMaterial
                color={household.hasCoordinateError ? '#d97706' : '#2563eb'}
              />
            </mesh>
            {household.hasCoordinateError && (
              <mesh position={[0, 6.5, 0]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color="#f59e0b" />
              </mesh>
            )}
            {hoveredObject === household.id && (
              <Html position={[0, 8, 0]} center distanceFactor={15}>
                <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-slate-700 shadow-xl min-w-[180px]">
                  <div className="font-medium flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: household.hasCoordinateError ? '#f59e0b' : '#3b82f6' }}
                    />
                    {household.name}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    实际坐标: ({household.actualPosition[0].toFixed(1)}, {household.actualPosition[2].toFixed(1)})
                  </div>
                  {household.hasCoordinateError && showCoordinateErrors && (
                    <>
                      <div className="text-slate-400 text-xs">
                        上报坐标: ({household.reportedPosition[0].toFixed(1)}, {household.reportedPosition[2].toFixed(1)})
                      </div>
                      <div className="text-amber-400 text-xs mt-1 font-medium">
                        ⚠️ 坐标偏差: {Math.sqrt(
                          Math.pow(household.actualPosition[0] - household.reportedPosition[0], 2) +
                          Math.pow(household.actualPosition[2] - household.reportedPosition[2], 2)
                        ).toFixed(1)}m
                      </div>
                    </>
                  )}
                </div>
              </Html>
            )}
          </group>
          {household.hasCoordinateError && showCoordinateErrors && (
            <group position={household.reportedPosition as [number, number, number]}>
              <mesh position={[0, 2, 0]}>
                <boxGeometry args={[3, 3, 3]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.3} wireframe />
              </mesh>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([
                      household.actualPosition[0], household.actualPosition[1] + 2, household.actualPosition[2],
                      household.reportedPosition[0], household.reportedPosition[1] + 2, household.reportedPosition[2]
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#f59e0b" linewidth={2} />
              </line>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}
