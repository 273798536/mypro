from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import time

from .wave_source import WaveSource
from .wave_simulator import WaveSimulator
from .boundary_reflection import BoundaryReflection, ReflectionType
from .water_grid import WaterGrid
from .settlement import Settlement, SettlementResult


@dataclass
class GameRecord:
    record_id: str
    scenario: str
    sources: List[Dict[str, Any]]
    simulation_result: Dict[str, Any]
    reflections: List[Dict[str, Any]]
    settlement: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "scenario": self.scenario,
            "sources": self.sources,
            "simulation_result": self.simulation_result,
            "reflections": self.reflections,
            "settlement": self.settlement,
            "timestamp": self.timestamp,
        }


class WaveInterferenceGame:
    def __init__(
        self,
        grid_size: tuple = (50, 50),
        target_amplitude: float = 1.5,
    ):
        self.grid_size = grid_size
        self.simulator = WaveSimulator(grid_size=grid_size)
        self.boundary_reflection = BoundaryReflection(
            amplitude_threshold=1.6,
            edge_margin=8,
            spike_threshold=2.5
        )
        self.water_grid = WaterGrid(default_size=grid_size)
        self.settlement = Settlement(target_amplitude=target_amplitude)
        self.records: List[GameRecord] = []

    def play_scenario(
        self,
        sources: List[WaveSource],
        scenario_name: str = "custom",
    ) -> SettlementResult:
        print(f"\n=== 开始场景: {scenario_name} ===")
        print(f"波源数量: {len(sources)}")

        for i, source in enumerate(sources, 1):
            print(f"  波源{i}: {source.id} at ({source.x:.1f}, {source.y:.1f}")
            if source.remark:
                print(f"    备注: {source.remark}")

        sources_info = [s.to_dict() for s in sources]
        sim_result = self.simulator.simulate(sources, time=0.5)

        print(f"\n--- 波动模拟完成 ---")
        print(f"最大振幅: {sim_result.max_amplitude:.4f}")
        print(f"干涉模式: {sim_result.interference_pattern}")

        reflections = self.boundary_reflection.detect_reflections(
            sim_result.grid, sources_info
        )
        reflection_summary = self.boundary_reflection.get_reflection_summary(
            reflections
        )

        print(f"\n--- 边界反射检测 ---")
        print(f"发现 {len(reflections)} 处反射")
        for ref in reflections:
            print(f"  [{ref.type.value}] {ref.description}")

        settlement_result = self.settlement.calculate(
            sources, sim_result, reflections, reflection_summary
        )

        print(f"\n--- 结算 ---")
        print(settlement_result.to_human_readable())

        record = GameRecord(
            record_id=f"rec_{int(time.time())}",
            scenario=scenario_name,
            sources=sources_info,
            simulation_result=sim_result.to_dict(),
            reflections=[r.to_dict() for r in reflections],
            settlement={
                "result": settlement_result.result.value,
                "score": settlement_result.total_score,
                "fail_reason": settlement_result.fail_reason.value,
            },
        )
        self.records.append(record)

        return settlement_result

    def demo_normal_scenario(self) -> SettlementResult:
        print("\n" + "=" * 60)
        print("样例1: 正常双波源干涉（无边界反射问题）")
        print("=" * 60)

        sources = [
            WaveSource(
                id="A",
                x=-2.0,
                y=0.0,
                amplitude=1.0,
                frequency=0.5,
                phase=0.0,
                remark="教学演示用-左波源",
            ),
            WaveSource(
                id="B",
                x=2.0,
                y=0.0,
                amplitude=1.0,
                frequency=0.5,
                phase=0.0,
                remark="教学演示用-右波源",
            ),
        ]
        return self.play_scenario(sources, "正常双波源干涉")

    def demo_boundary_reflection_scenario(self) -> SettlementResult:
        print("\n" + "=" * 60)
        print("样例2: 含边界反射（需人工确认的例外情况）")
        print("=" * 60)

        sources = [
            WaveSource(
                id="C",
                x=-4.2,
                y=0.0,
                amplitude=1.5,
                frequency=0.5,
                phase=0.0,
                remark="非常靠近左边界",
            ),
            WaveSource(
                id="D",
                x=4.2,
                y=0.0,
                amplitude=1.5,
                frequency=0.5,
                phase=0.0,
                remark="非常靠近右边界",
            ),
        ]
        return self.play_scenario(sources, "边界反射场景")

    def demo_overlapping_source_scenario(self) -> SettlementResult:
        print("\n" + "=" * 60)
        print("样例3: 波源重叠导致失败（结算说明波动模拟关系）")
        print("=" * 60)

        sources = [
            WaveSource(
                id="E",
                x=0.0,
                y=0.0,
                amplitude=1.5,
                frequency=0.5,
                phase=None,
                remark="缺相位字段",
            ),
            WaveSource(
                id="F",
                x=0.2,
                y=0.1,
                amplitude=1.5,
                frequency=0.5,
                phase=None,
                remark="与E波源距离过近",
            ),
        ]
        return self.play_scenario(sources, "波源重叠场景")

    def get_all_records(self) -> List[Dict[str, Any]]:
        return [r.to_dict() for r in self.records]

    def print_summary(self):
        print("\n" + "=" * 60)
        print("游戏记录汇总")
        print("=" * 60)
        for i, record in enumerate(self.records, 1):
            print(f"{i}. {record.scenario}")
            print(f"   结果: {record.settlement.get('result')}")
            print(f"   得分: {record.settlement.get('score')}")
            print(f"   失败原因: {record.settlement.get('fail_reason')}")
            print()
