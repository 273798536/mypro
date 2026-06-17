import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Float } from "@react-three/drei";
import * as THREE from "three";
import {
  Filter,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Thermometer,
  Zap,
} from "lucide-react";
import { useAppStore, useFilteredLogs } from "@/store/appStore";
import { clsx } from "clsx";
import type { BatteryCell } from "@/types";

function BatteryCellMesh({
  cell,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  cell: BatteryCell;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (v: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { row, col, layer } = cell.position;
  const x = (col - 3.5) * 1.3;
  const y = layer * 1.8 + 0.6;
  const z = (row - 2) * 1.3;

  const baseColor = useMemo(() => {
    if (cell.status === "anomaly") return new THREE.Color("#FF4757");
    if (cell.status === "warning") return new THREE.Color("#FFA502");
    if (cell.status === "pending") return new THREE.Color("#7B2CBF");
    return new THREE.Color("#00D4AA");
  }, [cell.status]);

  useFrame(() => {
    if (!meshRef.current) return;
    const target = isSelected || isHovered ? 1.15 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
  });

  return (
    <group position={[x, y, z]}>
      <Float speed={isSelected ? 2 : 0} floatIntensity={isSelected ? 0.15 : 0} rotationIntensity={0}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(true);
          }}
          onPointerOut={() => onHover(false)}
        >
          <cylinderGeometry args={[0.35, 0.35, 1.1, 16]} />
          <meshStandardMaterial
            color={baseColor}
            emissive={isSelected ? baseColor : new THREE.Color("#000000")}
            emissiveIntensity={isSelected ? 0.6 : 0}
            metalness={0.6}
            roughness={0.25}
            transparent
            opacity={isHovered && !isSelected ? 0.85 : 1}
          />
        </mesh>
      </Float>
      {isSelected && (
        <pointLight color="#00D4AA" intensity={3} distance={4} position={[0, 0.5, 0]} />
      )}
    </group>
  );
}

function BatteryPack() {
  const cells = useAppStore((s) => s.battery.cells);
  const selectedId = useAppStore((s) => s.battery.selectedId);
  const hoverId = useAppStore((s) => s.battery.hoverId);
  const selectBattery = useAppStore((s) => s.selectBattery);
  const hoverBattery = useAppStore((s) => s.hoverBattery);

  return (
    <>
      {cells.map((cell) => (
        <BatteryCellMesh
          key={cell.id}
          cell={cell}
          isSelected={cell.id === selectedId}
          isHovered={cell.id === hoverId}
          onSelect={() => selectBattery(cell.id)}
          onHover={(v) => hoverBattery(v ? cell.id : null)}
        />
      ))}
    </>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.25} color="#a0c4ff" />
      <directionalLight position={[8, 12, 6]} intensity={0.9} color="#e8f4ff" castShadow />
      <directionalLight position={[-6, 8, -4]} intensity={0.3} color="#7bb8e0" />
      <BatteryPack />
      <Grid
        args={[30, 30]}
        position={[0, -0.2, 0]}
        cellSize={1.3}
        cellThickness={0.5}
        cellColor="#0F1F38"
        sectionSize={5.2}
        sectionThickness={1}
        sectionColor="#1E3A5C"
        fadeDistance={25}
        fadeStrength={1.5}
        infiniteGrid
      />
      <Environment preset="night" background={false} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

function TimeAxisSlider() {
  const timeRange = useAppStore((s) => s.log.timeRange);
  const setTimeRange = useAppStore((s) => s.setTimeRange);
  const logs = useAppStore((s) => s.log.logs);
  const [playing, setPlaying] = useState(false);

  const minTs = logs.length ? logs[0].timestamp : Date.now() - 86400000;
  const maxTs = logs.length ? logs[logs.length - 1].timestamp : Date.now();
  const range = maxTs - minTs;
  const startPct = range > 0 ? ((timeRange.start - minTs) / range) * 100 : 0;
  const endPct = range > 0 ? ((timeRange.end - minTs) / range) * 100 : 100;

  const fmt = (ts: number) =>
    new Date(ts).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="section-title">时间轴</span>
        <div className="flex items-center gap-1">
          <button className="btn-ghost !px-1.5 !py-1" title="回到起点">
            <SkipBack className="h-3 w-3" />
          </button>
          <button className="btn-ghost !px-1.5 !py-1" onClick={() => setPlaying(!playing)} title={playing ? "暂停" : "播放"}>
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
          <button className="btn-ghost !px-1.5 !py-1" title="前进">
            <SkipForward className="h-3 w-3" />
          </button>
          <button
            className="btn-ghost !px-1.5 !py-1"
            title="重置"
            onClick={() => setTimeRange({ start: minTs, end: maxTs })}
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="relative mb-2 h-8 overflow-hidden rounded-lg bg-deepspace-900/60 border border-deepspace-700/50">
        <div
          className="absolute inset-y-0 bg-cyber-500/15 border-x border-cyber-500/40"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        ></div>
        <input
          type="range"
          min={minTs}
          max={maxTs}
          value={timeRange.start}
          step={range / 200}
          onChange={(e) => setTimeRange({ start: +e.target.value, end: timeRange.end })}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <input
          type="range"
          min={minTs}
          max={maxTs}
          value={timeRange.end}
          step={range / 200}
          onChange={(e) => setTimeRange({ start: timeRange.start, end: +e.target.value })}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{fmt(timeRange.start)}</span>
        <span className="text-cyber-400/60 font-mono">
          {Math.round((endPct - startPct) / 100 * 72)}h
        </span>
        <span>{fmt(timeRange.end)}</span>
      </div>
    </div>
  );
}

function FilterPanel() {
  const filters = useAppStore((s) => s.log.filters);
  const toggleAnomalyOnly = useAppStore((s) => s.toggleAnomalyOnly);
  const toggleUnauditedOnly = useAppStore((s) => s.toggleUnauditedOnly);
  const toggleUnitFilter = useAppStore((s) => s.toggleUnitFilter);
  const setFilters = useAppStore((s) => s.setFilters);
  const cells = useAppStore((s) => s.battery.cells);
  const selectedId = useAppStore((s) => s.battery.selectedId);

  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="section-title">筛选器</span>
        <Filter className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="备注关键词..."
          value={filters.remarkKeyword ?? ""}
          onChange={(e) => setFilters({ remarkKeyword: e.target.value })}
          className="input-deep !py-1.5 !pl-8 text-xs"
        />
      </div>
      <div>
        <div className="mb-1 text-[10px] text-slate-500 uppercase tracking-wider">单位</div>
        <div className="flex gap-1.5">
          {(["mΩ", "μΩ", "Ω"] as const).map((u) => (
            <button
              key={u}
              onClick={() => toggleUnitFilter(u)}
              className={clsx(
                "rounded-md border px-2 py-1 text-[11px] font-mono transition-all",
                filters.units.includes(u)
                  ? "border-cyber-500/50 bg-cyber-500/15 text-cyber-400"
                  : "border-deepspace-600/50 text-slate-400 hover:border-cyber-500/30",
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 text-[10px] text-slate-500 uppercase tracking-wider">状态</div>
        <div className="flex gap-1.5">
          <button
            onClick={toggleAnomalyOnly}
            className={clsx(
              "rounded-md border px-2 py-1 text-[11px] transition-all",
              filters.anomalyOnly
                ? "border-alert-500/50 bg-alert-500/15 text-alert-400"
                : "border-deepspace-600/50 text-slate-400 hover:border-alert-500/30",
            )}
          >
            仅异常
          </button>
          <button
            onClick={toggleUnauditedOnly}
            className={clsx(
              "rounded-md border px-2 py-1 text-[11px] transition-all",
              filters.unauditedOnly
                ? "border-amberx-500/50 bg-amberx-500/15 text-amberx-400"
                : "border-deepspace-600/50 text-slate-400 hover:border-amberx-500/30",
            )}
          >
            未审核
          </button>
        </div>
      </div>
      {selectedId && (
        <div className="rounded-lg border border-cyber-500/20 bg-cyber-500/5 p-2">
          <div className="text-[10px] text-cyber-400">当前选中</div>
          <div className="font-mono text-sm font-semibold text-cyber-300">
            {cells.find((c) => c.id === selectedId)?.code ?? "—"}
          </div>
        </div>
      )}
    </div>
  );
}

function LogTable() {
  const filtered = useFilteredLogs();
  const remarks = useAppStore((s) => s.history.remarks);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-deepspace-700/50 px-4 py-3">
        <span className="section-title">传感器日志 <span className="text-slate-500">({filtered.length})</span></span>
        <div className="flex gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cyber-500"></span>正常</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-alert-500"></span>异常</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-aurora-500"></span>历史版本</span>
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-deepspace-800/90 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr className="border-b border-deepspace-700/50">
              <th className="px-3 py-2">编号</th>
              <th className="px-3 py-2">时间</th>
              <th className="px-3 py-2">内阻</th>
              <th className="px-3 py-2">电压</th>
              <th className="px-3 py-2">温度</th>
              <th className="px-3 py-2">方向</th>
              <th className="px-3 py-2">备注</th>
              <th className="px-3 py-2">状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((l, idx) => {
              const latestRemark = remarks.filter((r) => r.logId === l.id && r.isLatest)[0];
              const hasHistory = remarks.filter((r) => r.logId === l.id).length > 1;
              return (
                <tr
                  key={l.id}
                  className={clsx(
                    "border-b border-deepspace-800/50 transition-colors hover:bg-deepspace-800/60",
                    l.isAnomaly && "border-l-2 border-l-alert-500/60 bg-alert-500/5",
                    idx % 2 === 0 && !l.isAnomaly && "bg-deepspace-900/30",
                    hasHistory && "border-l-2 border-l-aurora-500/40",
                  )}
                >
                  <td className="px-3 py-2 font-mono text-cyber-400">{l.batteryCode}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {new Date(l.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-3 py-2 data-value">
                    {l.resistance} <span className="text-slate-500">{l.unit}</span>
                  </td>
                  <td className="px-3 py-2 data-value">{l.voltage.toFixed(3)} V</td>
                  <td className="px-3 py-2 data-value">
                    <span className={l.temperature > 28 ? "text-amberx-400" : ""}>{l.temperature.toFixed(1)} °C</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={clsx("chip", l.directionSign === "reversed" ? "chip-alert" : "chip-cyber")}>
                      {l.directionSign === "reversed" ? "⚠ 反置" : l.directionSign === "negative" ? "−" : "+"}
                    </span>
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-slate-400">
                    {latestRemark ? latestRemark.content.slice(0, 18) : "—"}
                    {hasHistory && <span className="ml-1 text-aurora-400">v{remarks.filter((r) => r.logId === l.id).length}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {l.isAnomaly ? (
                      <span className="chip-alert">异常</span>
                    ) : l.isAudited ? (
                      <span className="chip-cyber">已审</span>
                    ) : (
                      <span className="chip-amber">未审</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 50 && (
          <div className="border-t border-deepspace-700/50 px-4 py-2 text-center text-xs text-slate-500">
            显示前 50 条，共 {filtered.length} 条
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThreeDPanel() {
  const hoverId = useAppStore((s) => s.battery.hoverId);
  const cells = useAppStore((s) => s.battery.cells);
  const hoveredCell = cells.find((c) => c.id === hoverId);

  return (
    <div className="mx-auto flex max-w-[1600px] gap-4" style={{ height: "calc(100vh - 140px)" }}>
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        <div className="panel relative flex-1 overflow-hidden">
          <Canvas camera={{ position: [0, 8, 16], fov: 50 }} gl={{ antialias: true }}>
            <Scene />
          </Canvas>
          {hoveredCell && (
            <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-deepspace-600/50 bg-deepspace-900/90 px-3 py-2 backdrop-blur-sm">
              <div className="font-mono text-sm font-bold text-cyber-400">{hoveredCell.code}</div>
              <div className="text-[11px] text-slate-400">{hoveredCell.model} · {hoveredCell.nominalResistance.toFixed(2)} mΩ</div>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-slate-500/60">
            点击单体选中 · 拖拽旋转 · 滚轮缩放
          </div>
        </div>
        <div>
          <TimeAxisSlider />
        </div>
      </div>

      <div className="flex w-80 shrink-0 flex-col gap-4">
        <FilterPanel />
        <div className="flex-1 overflow-hidden">
          <LogTable />
        </div>
      </div>
    </div>
  );
}
