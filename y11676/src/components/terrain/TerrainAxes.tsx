import { useMemo } from 'react';
import { Text, Grid } from '@react-three/drei';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';

const CURRENCY_SPACING = 3;
const DATE_SPACING = 0.8;
const LABEL_OFFSET_X = -2.5;
const LABEL_OFFSET_Z = -1.5;
const ZERO_PLANE_Y = 0;

function formatMonthLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function TerrainAxes() {
  const filteredRecords = useCashFlowStore((s) => s.filteredRecords);
  const filters = useCashFlowStore((s) => s.filters);

  const selectedCurrencies = useMemo(
    () => filters.selectedCurrencies.length > 0
      ? filters.selectedCurrencies
      : ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
    [filters.selectedCurrencies]
  );

  const sortedDates = useMemo(
    () => [...new Set(filteredRecords.map((r) => r.flowDate))].sort(),
    [filteredRecords]
  );

  const monthBoundaries = useMemo(() => {
    const boundaries: { label: string; x: number }[] = [];
    let currentMonth = '';
    sortedDates.forEach((dateStr, index) => {
      const month = dateStr.substring(0, 7);
      if (month !== currentMonth) {
        currentMonth = month;
        const x = (index - sortedDates.length / 2 + 0.5) * DATE_SPACING;
        boundaries.push({ label: formatMonthLabel(dateStr), x });
      }
    });
    return boundaries;
  }, [sortedDates]);

  const currencyCount = selectedCurrencies.length;
  const totalDates = sortedDates.length;

  const gridSizeX = Math.max(totalDates * DATE_SPACING + 2, 10);
  const gridSizeY = Math.max(currencyCount * CURRENCY_SPACING + 2, 10);

  return (
    <group>
      <Grid
        args={[gridSizeX, gridSizeY]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a3a5c"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a5a8c"
        fadeDistance={60}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
        position={[0, 0, ZERO_PLANE_Y]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ZERO_PLANE_Y - 0.01]} receiveShadow>
        <planeGeometry args={[gridSizeX, gridSizeY]} />
        <meshStandardMaterial
          color="#0d1f35"
          roughness={0.9}
          metalness={0}
          transparent
          opacity={0.6}
        />
      </mesh>

      {selectedCurrencies.map((currency, i) => {
        const y = (i - currencyCount / 2 + 0.5) * CURRENCY_SPACING;
        return (
          <Text
            key={`currency-${currency}`}
            position={[LABEL_OFFSET_X, y, 0]}
            fontSize={0.45}
            color="#9cc4e8"
            anchorX="right"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#0a1628"
          >
            {currency}
          </Text>
        );
      })}

      {monthBoundaries.map(({ label, x }) => (
        <Text
          key={`date-${label}-${x}`}
          position={[x, LABEL_OFFSET_Z, 0]}
          fontSize={0.35}
          color="#7aaad4"
          anchorX="center"
          anchorY="top"
          rotation={[-Math.PI / 2, 0, 0]}
          outlineWidth={0.015}
          outlineColor="#0a1628"
        >
          {label}
        </Text>
      ))}

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              -gridSizeX / 2, 0, 0,
              gridSizeX / 2, 0, 0,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3a6a9a" linewidth={1} />
      </line>
    </group>
  );
}
