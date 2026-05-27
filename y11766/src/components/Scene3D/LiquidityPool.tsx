import { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { PoolBlockData, RiskType } from '../../types';
import { useDataStore } from '../../store/useDataStore';
import { PoolBlock } from './PoolBlock';

function generatePoolBlocks(): PoolBlockData[] {
  const { holdings, redemptions, cashPositions, riskAlerts } = useDataStore.getState();
  const blocks: PoolBlockData[] = [];

  const crossDayRedemptionIds = riskAlerts
    .filter(r => r.riskType === 'CROSS_DAY_REDEMPTION' && !r.isResolved)
    .flatMap(r => r.affectedIds);

  const totalHoldings = holdings.reduce((sum, h) => sum + h.amount, 0);
  const totalRedemptions = redemptions.filter(r => r.status !== 'COMPLETED').reduce((sum, r) => sum + r.amount, 0);
  const totalCash = cashPositions.reduce((sum, c) => sum + c.availableCash, 0);

  const gridSize = 4;
  let holdingIndex = 0;

  holdings.forEach((holding) => {
    const row = Math.floor(holdingIndex / gridSize);
    const col = holdingIndex % gridSize;
    const normalizedHeight = (holding.amount / totalHoldings) * 3;
    const pressureLevel = holding.liquidityLevel === 'LOW' ? 0.8 : holding.liquidityLevel === 'MEDIUM' ? 0.4 : 0.1;
    const isRisk = crossDayRedemptionIds.length > 0 && holding.liquidityLevel === 'LOW';

    blocks.push({
      id: `holding_${holding.id}`,
      x: (col - gridSize / 2 + 0.5) * 1.2,
      y: normalizedHeight / 2 + 0.1,
      z: (row - gridSize / 2 + 0.5) * 1.2 - 2,
      width: 1,
      height: normalizedHeight,
      depth: 1,
      value: holding.amount,
      layer: 'holding',
      liquidityLevel: holding.liquidityLevel,
      pressureLevel,
      isRisk,
      relatedId: holding.id,
    });
    holdingIndex++;
  });

  const cashBlockCount = Math.min(cashPositions.length, 4);
  cashPositions.slice(0, cashBlockCount).forEach((cash, i) => {
    const normalizedHeight = (cash.availableCash / totalCash) * 1.5;
    const isRisk = riskAlerts.some(r => r.riskType === 'DUPLICATE_CASH_USAGE' && !r.isResolved);

    blocks.push({
      id: `cash_${cash.id}`,
      x: (i - cashBlockCount / 2 + 0.5) * 1.5,
      y: normalizedHeight / 2 - 1,
      z: 3,
      width: 1.2,
      height: normalizedHeight,
      depth: 1.2,
      value: cash.availableCash,
      layer: 'cash',
      pressureLevel: isRisk ? 0.9 : 0.1,
      isRisk,
      riskType: isRisk ? 'DUPLICATE_CASH_USAGE' : undefined,
      relatedId: cash.id,
    });
  });

  const pendingRedemptions = redemptions.filter(r => r.status !== 'COMPLETED');
  pendingRedemptions.forEach((redemption, i) => {
    const normalizedHeight = (redemption.amount / Math.max(totalRedemptions, 1)) * 2;
    const isRisk = crossDayRedemptionIds.includes(redemption.id);
    const isMismatchRisk = riskAlerts.some(r => r.riskType === 'LIQUIDITY_MISMATCH' && !r.isResolved);

    blocks.push({
      id: `redemption_${redemption.id}`,
      x: (i - pendingRedemptions.length / 2 + 0.5) * 1.3,
      y: normalizedHeight / 2 + 3,
      z: 0,
      width: 0.9,
      height: normalizedHeight,
      depth: 0.9,
      value: redemption.amount,
      layer: 'redemption',
      pressureLevel: isRisk ? 0.95 : isMismatchRisk ? 0.7 : 0.5,
      isRisk: isRisk || isMismatchRisk,
      riskType: isRisk ? 'CROSS_DAY_REDEMPTION' : isMismatchRisk ? 'LIQUIDITY_MISMATCH' : undefined,
      relatedId: redemption.id,
    });
  });

  return blocks;
}

export function LiquidityPool() {
  const blocks = useMemo(() => generatePoolBlocks(), []);
  const selectedBlockId = useDataStore(state => state.selectedBlockId);
  const selectBlock = useDataStore(state => state.selectBlock);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color={0x0088ff} />
      <pointLight position={[10, 5, 10]} intensity={0.3} color={0x00ffaa} />

      <gridHelper args={[20, 20, 0x1a3a5c, 0x0a1628]} position={[0, -1, 0]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.01, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x0a1628} />
      </mesh>

      {blocks.map(block => (
        <PoolBlock
          key={block.id}
          block={block}
          isSelected={selectedBlockId === block.id}
          onClick={selectBlock}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        target={[0, 1, 0]}
      />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
