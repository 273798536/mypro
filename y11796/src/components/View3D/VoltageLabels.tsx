import { Html } from '@react-three/drei';
import { formatTimeConstant } from '@/utils/units';
import { formatNumber } from '@/utils/helpers';

interface VoltageLabelsProps {
  batteryPos: [number, number, number];
  resistorPos: [number, number, number];
  capacitorPos: [number, number, number];
  Vs: number;
  Vr: number;
  Vc: number;
  tau: number;
}

export default function VoltageLabels({
  batteryPos,
  resistorPos,
  capacitorPos,
  Vs,
  Vr,
  Vc,
  tau,
}: VoltageLabelsProps) {
  const tauInfo = formatTimeConstant(tau);
  const batPos: [number, number, number] = [batteryPos[0], batteryPos[1] + 1.5, batteryPos[2]];
  const resPos: [number, number, number] = [resistorPos[0], resistorPos[1] + 1.5, resistorPos[2]];
  const capPos: [number, number, number] = [capacitorPos[0], capacitorPos[1] + 1.5, capacitorPos[2]];

  return (
    <>
      <Html position={batPos}>
        <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-cyan-500/30">
          <div className="text-cyan-400 font-mono text-xs whitespace-nowrap">
            Vs = {formatNumber(Vs, 2)} V
          </div>
        </div>
      </Html>

      <Html position={resPos}>
        <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-orange-500/30">
          <div className="text-orange-400 font-mono text-xs whitespace-nowrap">
            Vr = {formatNumber(Vr, 3)} V
          </div>
        </div>
      </Html>

      <Html position={capPos}>
        <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-pink-500/30">
          <div className="text-pink-400 font-mono text-xs whitespace-nowrap">
            Vc = {formatNumber(Vc, 3)} V
          </div>
        </div>
      </Html>

      <Html position={[0, -1, -3]}>
        <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-green-500/30">
          <div className="text-green-400 font-mono text-sm whitespace-nowrap">
            τ = R × C = {tauInfo.display}
          </div>
        </div>
      </Html>

      <Html position={[0, -1, 3]}>
        <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-500/30">
          <div className="text-yellow-400 font-mono text-xs whitespace-nowrap">
            5τ = {formatNumber(tau * 5, 4)} s ≈ {Math.ceil(tau * 5)}τ 稳定时间
          </div>
        </div>
      </Html>
    </>
  );
}
