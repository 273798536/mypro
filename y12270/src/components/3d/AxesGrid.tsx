import { Grid, Html } from '@react-three/drei';

interface AxesGridProps {
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
}

export function AxesGrid({ bounds }: AxesGridProps) {
  const xRange = bounds.xMax - bounds.xMin;
  const yRange = bounds.yMax - bounds.yMin;
  const zRange = bounds.zMax - bounds.zMin;
  
  const gridSize = Math.max(xRange, yRange, zRange) * 1.2;
  const xCenter = (bounds.xMin + bounds.xMax) / 2;
  const yCenter = (bounds.yMin + bounds.yMax) / 2;
  const zMin = bounds.zMin - zRange * 0.1;

  return (
    <group>
      <Grid
        position={[xCenter, zMin, yCenter]}
        rotation={[-Math.PI / 2, 0, 0]}
        args={[gridSize, gridSize, Math.floor(gridSize), Math.floor(gridSize)]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={gridSize * 2}
        fadeStrength={1}
        followCamera={false}
      />
      
      <group position={[xCenter, zMin - 0.1, yCenter]} rotation={[-Math.PI / 2, 0, 0]}>
        <Html center distanceFactor={gridSize / 30} position={[gridSize / 2 + 1, 0, 0]}>
          <div className="text-xs font-mono text-slate-400 whitespace-nowrap px-2 py-1 bg-slate-900/80 rounded">
            久期 (年)
          </div>
        </Html>
        <Html center distanceFactor={gridSize / 30} position={[0, gridSize / 2 + 1, 0]}>
          <div className="text-xs font-mono text-slate-400 whitespace-nowrap px-2 py-1 bg-slate-900/80 rounded">
            收益率 (%)
          </div>
        </Html>
      </group>
      
      <Html center distanceFactor={gridSize / 30} position={[xCenter, bounds.zMax + zRange * 0.2, yCenter]}>
        <div className="text-xs font-mono text-slate-400 whitespace-nowrap px-2 py-1 bg-slate-900/80 rounded">
          风险值
        </div>
      </Html>
    </group>
  );
}
