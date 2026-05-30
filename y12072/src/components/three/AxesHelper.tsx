import { Line, Text } from '@react-three/drei';
import { AXIS_COLORS } from '../../utils/colorScheme';

export function Axes3D() {
  const axisLength = 12;
  
  return (
    <group position={[-1, -1, -1]}>
      <Line
        points={[[0, 0, 0], [axisLength, 0, 0]]}
        color={AXIS_COLORS.x}
        lineWidth={2}
      />
      <Text
        position={[axisLength + 0.5, 0, 0]}
        fontSize={0.6}
        color={AXIS_COLORS.x}
        anchorX="center"
        anchorY="middle"
      >
        指法
      </Text>
      
      <Line
        points={[[0, 0, 0], [0, 105, 0]]}
        color={AXIS_COLORS.y}
        lineWidth={2}
      />
      <Text
        position={[0, 107, 0]}
        fontSize={0.6}
        color={AXIS_COLORS.y}
        anchorX="center"
        anchorY="middle"
      >
        时间
      </Text>
      
      <Line
        points={[[0, 0, 0], [0, 0, axisLength]]}
        color={AXIS_COLORS.z}
        lineWidth={2}
      />
      <Text
        position={[0, 0, axisLength + 0.5]}
        fontSize={0.6}
        color={AXIS_COLORS.z}
        anchorX="center"
        anchorY="middle"
      >
        频段
      </Text>
      
      {[0, 2, 4, 6, 8, 10].map(t => (
        <Text
          key={`y-tick-${t}`}
          position={[-0.8, t * 10, -0.8]}
          fontSize={0.4}
          color="#888"
          anchorX="right"
          anchorY="middle"
        >
          {t * 12}s
        </Text>
      ))}
      
      {['散音', '按音', '泛音', '走音', '带音', '掐起', '掩', '虚掩'].map((label, i) => (
        <Text
          key={`x-tick-${i}`}
          position={[(i / 7) * 10, -0.8, -0.8]}
          fontSize={0.35}
          color="#888"
          anchorX="center"
          anchorY="top"
        >
          {label}
        </Text>
      ))}
      
      {['20Hz', '200Hz', '2kHz', '20kHz'].map((label, i) => (
        <Text
          key={`z-tick-${i}`}
          position={[-0.8, -0.8, (i / 3) * 10]}
          fontSize={0.35}
          color="#888"
          anchorX="right"
          anchorY="top"
        >
          {label}
        </Text>
      ))}
    </group>
  );
}
