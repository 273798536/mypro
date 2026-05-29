interface AxesGridProps {
  showGrid: boolean;
  showAxes: boolean;
  duration: number;
}

export function AxesGrid({ showGrid, showAxes, duration }: AxesGridProps) {
  return (
    <group>
      {showGrid && (
        <>
          <gridHelper
            args={[20, 20, 0x1e3a5f, 0x0f172a]}
            position={[0, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
          <gridHelper
            args={[20, 20, 0x1e3a5f, 0x0f172a]}
            position={[0, 6, -10]}
          />
        </>
      )}

      {showAxes && (
        <>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([-10, 0, -10, 10, 0, -10])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#06b6d4" linewidth={2} />
          </line>

          <mesh position={[10.2, 0.3, -10]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#06b6d4" />
          </mesh>

          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([-10, 0, -10, -10, 12, -10])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#10b981" linewidth={2} />
          </line>

          <mesh position={[-10, 12.3, -10]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>

          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([-10, 0, -10, -10, 0, 10])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#f59e0b" linewidth={2} />
          </line>

          <mesh position={[-10, 0.3, 10]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </>
      )}
    </group>
  );
}
