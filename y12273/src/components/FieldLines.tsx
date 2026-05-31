import { useMemo } from "react";
import * as THREE from "three";
import { useFieldStore } from "@/store/fieldStore";
import { fieldStrengthToColor } from "@/utils/fieldCalculator";
import type { FieldLineData } from "@/types";

function FieldLineArrow({ position, direction, color }: { position: [number, number, number]; direction: [number, number, number]; color: string }) {
  const quaternion = useMemo(() => {
    const dir = new THREE.Vector3(...direction).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [direction]);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <coneGeometry args={[0.06, 0.18, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function SingleFieldLine({ data }: { data: FieldLineData }) {
  const { curve, color, arrowPositions, arrowDirections } = useMemo(() => {
    if (data.points.length < 2) {
      return { curve: new THREE.CatmullRomCurve3([]), color: "#00f5d4", arrowPositions: [], arrowDirections: [] };
    }

    const pts = data.points.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts);

    const [r, g, b] = fieldStrengthToColor(data.magnitude);
    const color = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

    const arrowCount = Math.max(2, Math.floor(data.points.length / 20));
    const arrowPositions: [number, number, number][] = [];
    const arrowDirections: [number, number, number][] = [];

    for (let i = 1; i <= arrowCount; i++) {
      const t = i / (arrowCount + 1);
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      if (data.direction === "reversed") {
        tangent.negate();
      }

      arrowPositions.push([point.x, point.y, point.z]);
      arrowDirections.push([tangent.x, tangent.y, tangent.z]);
    }

    return { curve, color, arrowPositions, arrowDirections };
  }, [data]);

  if (data.points.length < 2) return null;

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, data.points.length, 0.015, 6, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} />
      </mesh>
      {arrowPositions.map((pos, idx) => (
        <FieldLineArrow
          key={`arrow-${data.id}-${idx}`}
          position={pos}
          direction={arrowDirections[idx]}
          color={color}
        />
      ))}
      {data.direction === "reversed" && (
        <mesh position={[data.points[0][0], data.points[0][1] + 0.3, data.points[0][2]]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#ff0" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

export default function FieldLines() {
  const fieldLines = useFieldStore((s) => s.fieldLines);

  return (
    <group>
      {fieldLines.map((fl) => (
        <SingleFieldLine key={fl.id} data={fl} />
      ))}
    </group>
  );
}
