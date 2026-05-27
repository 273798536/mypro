"""
分析报告模块
============

提供模拟结果的深度分析、异常检测、稳定性评分和详细报告生成。

功能包括:
- 能量漂移分析
- 轨道稳定性分析
- 碰撞和逃逸检测
- 参数合理性检查
- 稳定性评分系统
- 详细报告生成
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
import json
from datetime import datetime

from .simulator import BinarySimulator, SimulationStatus, SimulationEvent
from .physics import Body, G, circular_velocity, escape_velocity, orbital_period


class AnomalyType(Enum):
    """异常类型枚举"""
    TIMESTEP_TOO_LARGE = "timestep_too_large"
    ENERGY_DRIFT = "energy_drift"
    COLLISION = "collision"
    ESCAPE = "escape"
    UNSTABLE_ORBIT = "unstable_orbit"
    INVALID_PARAMETERS = "invalid_parameters"
    NUMERICAL_ERROR = "numerical_error"


class Severity(Enum):
    """严重程度枚举"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Anomaly:
    """异常记录"""
    anomaly_type: AnomalyType
    severity: Severity
    title: str
    description: str
    source: str
    details: Dict = field(default_factory=dict)
    suggestion: str = ""
    
    def __str__(self):
        return f"[{self.severity.value.upper()}] {self.title}: {self.description}"


@dataclass
class StabilityScore:
    """稳定性评分"""
    total_score: float
    max_score: float
    breakdown: Dict[str, Tuple[float, float, str]]  # 项名: (得分, 满分, 说明)
    
    def __str__(self):
        lines = [f"稳定性评分: {self.total_score:.1f}/{self.max_score:.1f}"]
        for name, (score, max_s, desc) in self.breakdown.items():
            lines.append(f"  {name}: {score:.1f}/{max_s:.1f} - {desc}")
        return "\n".join(lines)
    
    def grade(self) -> str:
        """返回等级评定"""
        ratio = self.total_score / self.max_score if self.max_score > 0 else 0
        if ratio >= 0.9:
            return "优秀 (A)"
        elif ratio >= 0.75:
            return "良好 (B)"
        elif ratio >= 0.6:
            return "及格 (C)"
        elif ratio >= 0.4:
            return "较差 (D)"
        else:
            return "不及格 (F)"


@dataclass
class AnalysisReport:
    """分析报告"""
    timestamp: str
    simulator_config: Dict
    initial_conditions: Dict
    final_state: Dict
    events: List[SimulationEvent]
    anomalies: List[Anomaly]
    stability_score: StabilityScore
    summary: Dict
    recommendations: List[str]
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "timestamp": self.timestamp,
            "simulator_config": self.simulator_config,
            "initial_conditions": self.initial_conditions,
            "final_state": self.final_state,
            "events": [
                {
                    "step": e.step,
                    "time": e.time,
                    "type": e.event_type,
                    "description": e.description,
                    "details": e.details
                }
                for e in self.events
            ],
            "anomalies": [
                {
                    "type": a.anomaly_type.value,
                    "severity": a.severity.value,
                    "title": a.title,
                    "description": a.description,
                    "source": a.source,
                    "details": a.details,
                    "suggestion": a.suggestion
                }
                for a in self.anomalies
            ],
            "stability_score": {
                "total": self.stability_score.total_score,
                "max": self.stability_score.max_score,
                "grade": self.stability_score.grade(),
                "breakdown": {
                    k: {"score": v[0], "max": v[1], "description": v[2]}
                    for k, v in self.stability_score.breakdown.items()
                }
            },
            "summary": self.summary,
            "recommendations": self.recommendations
        }
    
    def to_json(self, indent: int = 2) -> str:
        """转换为JSON字符串"""
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)
    
    def save(self, filepath: str):
        """保存到文件"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(self.to_json())
        print(f"报告已保存到: {filepath}")
    
    def print_summary(self):
        """打印摘要"""
        print("=" * 70)
        print("双星轨道模拟分析报告")
        print("=" * 70)
        print(f"生成时间: {self.timestamp}")
        print()
        
        print("-" * 70)
        print("模拟摘要")
        print("-" * 70)
        for key, value in self.summary.items():
            print(f"  {key}: {value}")
        print()
        
        print("-" * 70)
        print(self.stability_score)
        print(f"等级: {self.stability_score.grade()}")
        print()
        
        if self.anomalies:
            print("-" * 70)
            print(f"检测到 {len(self.anomalies)} 个异常:")
            print("-" * 70)
            for anomaly in self.anomalies:
                print(f"  {anomaly}")
                if anomaly.suggestion:
                    print(f"    建议: {anomaly.suggestion}")
            print()
        
        if self.recommendations:
            print("-" * 70)
            print("建议:")
            print("-" * 70)
            for i, rec in enumerate(self.recommendations, 1):
                print(f"  {i}. {rec}")
            print()
        
        print("=" * 70)


class OrbitAnalyzer:
    """
    轨道分析器
    
    对模拟结果进行深度分析，检测异常并生成报告。
    """
    
    def __init__(self, simulator: BinarySimulator):
        self.simulator = simulator
        self.anomalies: List[Anomaly] = []
    
    def analyze(self) -> AnalysisReport:
        """
        执行完整分析
        
        Returns:
            分析报告对象
        """
        self.anomalies = []
        
        self._check_timestep()
        self._check_energy_conservation()
        self._check_orbit_stability()
        self._check_simulation_events()
        self._check_physical_validity()
        
        score = self._calculate_stability_score()
        summary = self._generate_summary()
        recommendations = self._generate_recommendations()
        
        return AnalysisReport(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            simulator_config=self._get_simulator_config(),
            initial_conditions=self._get_initial_conditions(),
            final_state=self._get_final_state(),
            events=list(self.simulator.events),
            anomalies=list(self.anomalies),
            stability_score=score,
            summary=summary,
            recommendations=recommendations
        )
    
    def _add_anomaly(self, anomaly_type: AnomalyType, severity: Severity, 
                    title: str, description: str, source: str,
                    details: Optional[Dict] = None, suggestion: str = ""):
        """添加异常记录"""
        anomaly = Anomaly(
            anomaly_type=anomaly_type,
            severity=severity,
            title=title,
            description=description,
            source=source,
            details=details or {},
            suggestion=suggestion
        )
        self.anomalies.append(anomaly)
    
    def _check_timestep(self):
        """检查时间步长合理性"""
        sim = self.simulator
        validation = sim.validate_timestep()
        
        if not validation['is_reasonable']:
            ratio = validation['ratio']
            if ratio > 10.0:
                severity = Severity.CRITICAL
            elif ratio > 5.0:
                severity = Severity.ERROR
            else:
                severity = Severity.WARNING
            
            self._add_anomaly(
                AnomalyType.TIMESTEP_TOO_LARGE,
                severity,
                "时间步长过大",
                f"当前时间步长 ({sim.config.dt:.6f}年) 是建议值 ({validation['suggested_dt']:.6f}年) 的 {ratio:.1f} 倍",
                "physics.suggest_timestep",
                {
                    "current_dt": sim.config.dt,
                    "suggested_dt": validation['suggested_dt'],
                    "ratio": ratio,
                    "method": sim.config.method
                },
                f"建议将时间步长减小到 {validation['suggested_dt']:.6f} 年以下，或使用更精确的积分方法（如RK4或Verlet）"
            )
    
    def _check_energy_conservation(self):
        """检查能量守恒性"""
        sim = self.simulator
        energy = sim.get_energy_history()
        
        if len(energy['total']) < 2:
            return
        
        initial_energy = energy['total'][0]
        if abs(initial_energy) < 1e-10:
            return
        
        final_energy = energy['total'][-1]
        total_drift = abs((final_energy - initial_energy) / abs(initial_energy)) * 100
        max_drift = sim._max_energy_drift * 100
        
        energy_std = np.std(energy['total'])
        relative_std = energy_std / abs(initial_energy) * 100
        
        if max_drift > 10.0:
            severity = Severity.CRITICAL
        elif max_drift > 5.0:
            severity = Severity.ERROR
        elif max_drift > 1.0:
            severity = Severity.WARNING
        elif max_drift > 0.1:
            severity = Severity.INFO
        else:
            return
        
        self._add_anomaly(
            AnomalyType.ENERGY_DRIFT,
            severity,
            "能量漂移",
            f"模拟过程中最大能量漂移为 {max_drift:.2f}%，总漂移为 {total_drift:.2f}%",
            "analysis.OrbitAnalyzer._check_energy_conservation",
            {
                "initial_energy": initial_energy,
                "final_energy": final_energy,
                "max_drift_percent": max_drift,
                "total_drift_percent": total_drift,
                "relative_std_percent": relative_std,
                "threshold": sim.config.energy_drift_threshold * 100
            },
            "能量漂移可能由时间步长过大或积分方法精度不足引起。建议减小时间步长或更换为Verlet/RK4积分器。"
        )
    
    def _check_orbit_stability(self):
        """检查轨道稳定性"""
        sim = self.simulator
        
        if len(sim.states) < 10:
            return
        
        distances = np.array([s.distances[0] for s in sim.states])
        times = np.array([s.time for s in sim.states])
        
        if len(distances) < 2:
            return
        
        mean_dist = np.mean(distances)
        std_dist = np.std(distances)
        variation = std_dist / mean_dist * 100 if mean_dist > 0 else 0
        
        initial_energy = sim.states[0].total_energy
        
        if initial_energy > 0:
            self._add_anomaly(
                AnomalyType.UNSTABLE_ORBIT,
                Severity.WARNING,
                "正总能量",
                f"系统总能量为正 ({initial_energy:.4f})，星体可能最终逃逸",
                "analysis.OrbitAnalyzer._check_orbit_stability",
                {"initial_energy": initial_energy},
                "正总能量意味着系统不是束缚态，星体将沿双曲线轨道分离。"
            )
        
        if variation > 50.0:
            self._add_anomaly(
                AnomalyType.UNSTABLE_ORBIT,
                Severity.WARNING,
                "轨道距离变化过大",
                f"星体距离变化率为 {variation:.1f}%，轨道可能不稳定",
                "analysis.OrbitAnalyzer._check_orbit_stability",
                {
                    "mean_distance": mean_dist,
                    "std_distance": std_dist,
                    "variation_percent": variation
                },
                "较大的距离变化可能表明轨道偏心率很高或系统不稳定。"
            )
        
        if len(distances) > 100:
            recent_distances = distances[-100:]
            trend = np.polyfit(times[-100:], recent_distances, 1)[0]
            if trend > 0.1 * mean_dist / times[-1]:
                self._add_anomaly(
                    AnomalyType.UNSTABLE_ORBIT,
                    Severity.WARNING,
                    "轨道扩张趋势",
                    f"检测到轨道距离正在增大，趋势斜率: {trend:.6f} AU/年",
                    "analysis.OrbitAnalyzer._check_orbit_stability",
                    {"trend": trend},
                    "轨道扩张可能表明系统正在解体或能量漂移导致的数值不稳定。"
                )
    
    def _check_simulation_events(self):
        """检查模拟事件"""
        sim = self.simulator
        
        if sim.status == SimulationStatus.COLLISION:
            collision_event = [e for e in sim.events if e.event_type == "碰撞"]
            if collision_event:
                details = collision_event[0].details
                self._add_anomaly(
                    AnomalyType.COLLISION,
                    Severity.CRITICAL,
                    "星体碰撞",
                    f"星体在 t={collision_event[0].time:.4f} 年发生碰撞，距离: {details.get('distance', 0):.6f} AU",
                    "simulator.BinarySimulator._check_collision",
                    details,
                    "碰撞事件发生后模拟已停止。如需继续，请增大碰撞检测阈值或调整初始条件。"
                )
        
        if sim.status == SimulationStatus.ESCAPE:
            escape_event = [e for e in sim.events if e.event_type == "逃逸"]
            if escape_event:
                details = escape_event[0].details
                self._add_anomaly(
                    AnomalyType.ESCAPE,
                    Severity.WARNING,
                    "星体逃逸",
                    f"星体在 t={escape_event[0].time:.4f} 年距离超过阈值 ({details.get('threshold', 100):.1f} AU)",
                    "simulator.BinarySimulator._check_escape",
                    details,
                    "星体距离过大可能已逃逸。如需继续模拟，请增大escape_distance参数。"
                )
        
        if sim.status == SimulationStatus.ERROR:
            error_event = [e for e in sim.events if e.event_type == "错误"]
            if error_event:
                details = error_event[0].details
                self._add_anomaly(
                    AnomalyType.NUMERICAL_ERROR,
                    Severity.CRITICAL,
                    "数值错误",
                    f"模拟在 t={error_event[0].time:.4f} 年出错: {details.get('error', '未知错误')}",
                    "simulator.BinarySimulator.run",
                    details,
                    "数值错误可能由数值不稳定或异常参数引起。请检查输入参数。"
                )
    
    def _check_physical_validity(self):
        """检查物理合理性"""
        sim = self.simulator
        bodies = sim.bodies
        
        for i, body in enumerate(bodies):
            if body.mass <= 0:
                self._add_anomaly(
                    AnomalyType.INVALID_PARAMETERS,
                    Severity.CRITICAL,
                    "无效质量",
                    f"星体{i+1}质量必须为正，当前值: {body.mass}",
                    "analysis.OrbitAnalyzer._check_physical_validity",
                    {"body": i, "mass": body.mass},
                    "请设置正的质量值。"
                )
        
        if len(sim.states) >= 1:
            initial_state = sim.states[0]
            final_state = sim.states[-1]
            
            for i in range(2):
                init_speed = np.linalg.norm(initial_state.velocities[i])
                final_speed = np.linalg.norm(final_state.velocities[i])
                
                if init_speed > 1000 or final_speed > 1000:
                    self._add_anomaly(
                        AnomalyType.NUMERICAL_ERROR,
                        Severity.WARNING,
                        "速度异常",
                        f"星体{i+1}速度过大 (初始: {init_speed:.2f} AU/年, 最终: {final_speed:.2f} AU/年)",
                        "analysis.OrbitAnalyzer._check_physical_validity",
                        {"body": i, "init_speed": init_speed, "final_speed": final_speed},
                        "异常高的速度可能表明数值不稳定或碰撞事件。"
                    )
    
    def _calculate_stability_score(self) -> StabilityScore:
        """
        计算稳定性评分
        
        评分项:
        - 能量守恒 (30分): 根据能量漂移
        - 时间步长合理性 (20分): 根据时间步长与建议值的比值
        - 轨道规则性 (25分): 根据轨道距离变化
        - 无异常事件 (25分): 是否有碰撞、逃逸等事件
        
        Returns:
            稳定性评分对象
        """
        sim = self.simulator
        breakdown = {}
        total_score = 0.0
        max_score = 0.0
        
        max_score += 30
        energy_score = 30.0
        if sim._max_energy_drift > 0:
            energy_score = max(0.0, 30.0 * (1.0 - min(sim._max_energy_drift / 0.1, 1.0)))
        breakdown["能量守恒"] = (energy_score, 30.0, 
                                   f"能量漂移 {sim._max_energy_drift*100:.2f}%，漂移越小得分越高")
        total_score += energy_score
        
        max_score += 20
        validation = sim.validate_timestep()
        timestep_score = 20.0
        if validation['ratio'] > 1.0:
            timestep_score = max(0.0, 20.0 * (1.0 - min((validation['ratio'] - 1.0) / 9.0, 1.0)))
        breakdown["时间步长"] = (timestep_score, 20.0,
                                  f"步长比 {validation['ratio']:.1f}x，比值越接近1得分越高")
        total_score += timestep_score
        
        max_score += 25
        orbit_score = 25.0
        if len(sim.states) >= 10:
            distances = np.array([s.distances[0] for s in sim.states])
            mean_dist = np.mean(distances)
            std_dist = np.std(distances)
            variation = std_dist / mean_dist * 100 if mean_dist > 0 else 0
            orbit_score = max(0.0, 25.0 * (1.0 - min(variation / 50.0, 1.0)))
            breakdown["轨道规则性"] = (orbit_score, 25.0,
                                        f"距离变化 {variation:.1f}%，变化越小轨道越稳定")
        else:
            breakdown["轨道规则性"] = (orbit_score, 25.0, "模拟步数不足，无法评估")
        total_score += orbit_score
        
        max_score += 25
        event_score = 25.0
        if sim.status == SimulationStatus.COLLISION:
            event_score = 0.0
        elif sim.status == SimulationStatus.ESCAPE:
            event_score = 10.0
        elif sim.status == SimulationStatus.ERROR:
            event_score = 5.0
        elif any(a.anomaly_type in [AnomalyType.ENERGY_DRIFT, AnomalyType.UNSTABLE_ORBIT] 
                for a in self.anomalies):
            event_score = 15.0
        breakdown["无异常事件"] = (event_score, 25.0,
                                    f"模拟状态: {sim.status.value}，无异常得满分")
        total_score += event_score
        
        return StabilityScore(total_score, max_score, breakdown)
    
    def _generate_summary(self) -> Dict:
        """生成摘要信息"""
        sim = self.simulator
        
        if len(sim.states) < 1:
            return {}
        
        initial_state = sim.states[0]
        final_state = sim.states[-1]
        
        energy = sim.get_energy_history()
        initial_energy = energy['total'][0] if len(energy['total']) > 0 else 0
        final_energy = energy['total'][-1] if len(energy['total']) > 0 else 0
        
        if abs(initial_energy) > 1e-10:
            energy_drift = abs((final_energy - initial_energy) / abs(initial_energy)) * 100
        else:
            energy_drift = 0.0
        
        distances = np.array([s.distances[0] for s in sim.states])
        min_dist = np.min(distances)
        max_dist = np.max(distances)
        
        return {
            "模拟状态": sim.status.value,
            "总步数": sim.current_step,
            "总模拟时间": f"{sim.current_time:.4f} 年",
            "积分方法": sim.config.method,
            "时间步长": f"{sim.config.dt:.6f} 年",
            "星体1质量": f"{sim.bodies[0].mass} M☉",
            "星体2质量": f"{sim.bodies[1].mass} M☉",
            "初始能量": f"{initial_energy:.4f}",
            "最终能量": f"{final_energy:.4f}",
            "能量漂移": f"{energy_drift:.2f}%",
            "最小距离": f"{min_dist:.4f} AU",
            "最大距离": f"{max_dist:.4f} AU",
            "事件数量": len(sim.events),
            "异常数量": len(self.anomalies)
        }
    
    def _generate_recommendations(self) -> List[str]:
        """生成改进建议"""
        recommendations = []
        sim = self.simulator
        
        has_large_timestep = any(a.anomaly_type == AnomalyType.TIMESTEP_TOO_LARGE 
                                for a in self.anomalies)
        if has_large_timestep:
            validation = sim.validate_timestep()
            recommendations.append(
                f"减小时间步长至 {validation['suggested_dt']:.6f} 年以下，"
                f"或使用更精确的积分方法（如RK4或Verlet）"
            )
        
        has_energy_drift = any(a.anomaly_type == AnomalyType.ENERGY_DRIFT 
                              for a in self.anomalies)
        if has_energy_drift and sim.config.method == 'euler':
            recommendations.append(
                "欧拉法能量守恒性差，建议改用RK4或Verlet积分器以提高能量守恒性"
            )
        
        if sim.config.method == 'euler' and not has_large_timestep:
            recommendations.append(
                "欧拉法虽然简单但精度较低，对于高精度模拟建议使用RK4或Verlet"
            )
        
        has_collision = any(a.anomaly_type == AnomalyType.COLLISION for a in self.anomalies)
        if has_collision:
            recommendations.append(
                "碰撞事件发生。请调整初始距离或速度以避免碰撞，"
                "或增大星体半径用于研究碰撞过程"
            )
        
        has_escape = any(a.anomaly_type == AnomalyType.ESCAPE for a in self.anomalies)
        if has_escape:
            recommendations.append(
                "星体已逃逸。如要研究束缚轨道，请减小初始速度或增大星体质量"
            )
        
        if len(recommendations) == 0:
            recommendations.append("模拟参数合理，结果可信。可以尝试调整参数观察不同的轨道行为。")
        
        return recommendations
    
    def _get_simulator_config(self) -> Dict:
        """获取模拟器配置"""
        cfg = self.simulator.config
        return {
            "dt": cfg.dt,
            "max_steps": cfg.max_steps,
            "method": cfg.method,
            "energy_drift_threshold": cfg.energy_drift_threshold,
            "record_interval": cfg.record_interval,
            "collision_detection": cfg.collision_detection,
            "escape_distance": cfg.escape_distance
        }
    
    def _get_initial_conditions(self) -> Dict:
        """获取初始条件"""
        if len(self.simulator.states) < 1:
            return {}
        
        state = self.simulator.states[0]
        bodies = self.simulator.bodies
        
        return {
            "body1": {
                "name": bodies[0].name,
                "mass": bodies[0].mass,
                "radius": bodies[0].radius,
                "position": state.positions[0].tolist(),
                "velocity": state.velocities[0].tolist()
            },
            "body2": {
                "name": bodies[1].name,
                "mass": bodies[1].mass,
                "radius": bodies[1].radius,
                "position": state.positions[1].tolist(),
                "velocity": state.velocities[1].tolist()
            }
        }
    
    def _get_final_state(self) -> Dict:
        """获取最终状态"""
        if len(self.simulator.states) < 1:
            return {}
        
        state = self.simulator.states[-1]
        
        return {
            "step": state.step,
            "time": state.time,
            "body1": {
                "position": state.positions[0].tolist(),
                "velocity": state.velocities[0].tolist()
            },
            "body2": {
                "position": state.positions[1].tolist(),
                "velocity": state.velocities[1].tolist()
            },
            "kinetic_energy": state.kinetic_energy,
            "potential_energy": state.potential_energy,
            "total_energy": state.total_energy,
            "distance": state.distances[0]
        }
