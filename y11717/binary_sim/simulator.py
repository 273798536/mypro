"""
模拟器核心模块
==============

负责双星系统的主模拟循环，包括状态记录、能量监控、碰撞检测、异常记录。
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable
from enum import Enum

from .physics import (
    Body, get_integrator, total_energy, total_kinetic_energy, 
    total_potential_energy, check_collision, suggest_timestep
)


class SimulationStatus(Enum):
    """模拟状态枚举"""
    RUNNING = "running"
    COMPLETED = "completed"
    COLLISION = "collision"
    ENERGY_DRIFT = "energy_drift"
    ESCAPE = "escape"
    ERROR = "error"


@dataclass
class SimulationEvent:
    """模拟事件记录"""
    step: int
    time: float
    event_type: str
    description: str
    details: Dict = field(default_factory=dict)
    
    def __str__(self):
        return f"[步骤{self.step} t={self.time:.4f}年] {self.event_type}: {self.description}"


@dataclass
class SimulationState:
    """单步模拟状态"""
    step: int
    time: float
    positions: List[np.ndarray]
    velocities: List[np.ndarray]
    kinetic_energy: float
    potential_energy: float
    total_energy: float
    distances: List[float]


@dataclass
class SimulationConfig:
    """模拟配置"""
    dt: float = 0.01
    max_steps: int = 10000
    method: str = 'rk4'
    energy_drift_threshold: float = 0.05
    record_interval: int = 1
    collision_detection: bool = True
    auto_stop_on_collision: bool = True
    auto_stop_on_escape: bool = True
    escape_distance: float = 100.0


class BinarySimulator:
    """
    双星系统模拟器
    
    示例:
        >>> from binary_sim.physics import Body
        >>> bodies = [Body(mass=1.0, pos=[1.0, 0.0], vel=[0.0, 6.28]),
        ...               Body(mass=1.0, pos=[-1.0, 0.0], vel=[0.0, -6.28])
        >>> sim = BinarySimulator(bodies, dt=0.01)
        >>> sim.run(1000)
    """
    
    def __init__(self, bodies: List[Body], config: Optional[SimulationConfig] = None):
        if len(bodies) != 2:
            raise ValueError("双星模拟器需要恰好2个星体")
        
        self.bodies = bodies
        self.config = config or SimulationConfig()
        self.status = SimulationStatus.RUNNING
        self.events: List[SimulationEvent] = []
        self.states: List[SimulationState] = []
        self.current_step = 0
        self.current_time = 0.0
        self._prev_accelerations = None
        self._integrator = get_integrator(self.config.method)
        self._initial_energy = None
        self._max_energy_drift = 0.0
        
        self._record_state()
        self._initial_energy = self.states[0].total_energy
        
        self._add_event(0, 0.0, "初始化", f"模拟开始，使用{self.config.method}积分器", {
            "dt": self.config.dt,
            "initial_energy": self._initial_energy,
            "bodies": [{"name": b.name, "mass": b.mass} for b in bodies]
        })
    
    def _add_event(self, step: int, time: float, event_type: str, description: str, details: Optional[Dict] = None):
        """添加事件记录"""
        event = SimulationEvent(step, time, event_type, description, details or {})
        self.events.append(event)
    
    def _record_state(self):
        """记录当前状态"""
        positions = [b.pos.copy() for b in self.bodies]
        velocities = [b.vel.copy() for b in self.bodies]
        ke = total_kinetic_energy(self.bodies)
        pe = total_potential_energy(self.bodies)
        te = ke + pe
        distances = [np.linalg.norm(self.bodies[1].pos - self.bodies[0].pos)]
        
        state = SimulationState(
            step=self.current_step,
            time=self.current_time,
            positions=positions,
            velocities=velocities,
            kinetic_energy=ke,
            potential_energy=pe,
            total_energy=te,
            distances=distances
        )
        self.states.append(state)
    
    def _check_energy_drift(self) -> bool:
        """
        检测能量漂移
        
        Returns:
            是否发生显著能量漂移
        """
        if self._initial_energy is None or abs(self._initial_energy) < 1e-10:
            return False
        
        current_energy = self.states[-1].total_energy
        drift = abs((current_energy - self._initial_energy) / abs(self._initial_energy))
        self._max_energy_drift = max(self._max_energy_drift, drift)
        
        if drift > self.config.energy_drift_threshold:
            self.status = SimulationStatus.ENERGY_DRIFT
            self._add_event(
                self.current_step, self.current_time,
                "能量漂移",
                f"能量漂移超过阈值: {drift*100:.2f}% > {self.config.energy_drift_threshold*100:.0f}%",
                {
                    "drift": drift,
                    "initial_energy": self._initial_energy,
                    "current_energy": current_energy,
                    "threshold": self.config.energy_drift_threshold
                }
            )
            return True
        return False
    
    def _check_collision(self) -> bool:
        """
        检测碰撞
        
        Returns:
            是否发生碰撞
        """
        if not self.config.collision_detection:
            return False
        
        collided, distance = check_collision(self.bodies[0], self.bodies[1])
        if collided:
            self.status = SimulationStatus.COLLISION
            self._add_event(
                self.current_step, self.current_time,
                "碰撞",
                f"星体发生碰撞！距离: {distance:.6f} AU",
                {
                    "distance": distance,
                    "min_distance": self.bodies[0].radius + self.bodies[1].radius
                }
            )
            return True
        return False
    
    def _check_escape(self) -> bool:
        """
        检测逃逸
        
        Returns:
            是否有星体逃逸
        """
        distance = np.linalg.norm(self.bodies[1].pos - self.bodies[0].pos)
        if distance > self.config.escape_distance:
            self.status = SimulationStatus.ESCAPE
            self._add_event(
                self.current_step, self.current_time,
                "逃逸",
                f"星体距离过大（{distance:.2f} AU），可能已逃逸",
                {"distance": distance, "threshold": self.config.escape_distance}
            )
            return True
        return False
    
    def _step(self):
        """执行单步积分"""
        if self.config.method == 'verlet':
            self._prev_accelerations = self._integrator(
                self.bodies, self.config.dt, self._prev_accelerations
            )
        else:
            self._integrator(self.bodies, self.config.dt)
        
        self.current_step += 1
        self.current_time += self.config.dt
    
    def run(self, steps: Optional[int] = None) -> SimulationStatus:
        """
        运行模拟
        
        Args:
            steps: 运行步数，None表示运行到max_steps
        
        Returns:
            模拟结束状态
        """
        max_steps = steps or self.config.max_steps
        target_step = self.current_step + max_steps
        
        try:
            while self.current_step < target_step and self.status == SimulationStatus.RUNNING:
                self._step()
                
                if self.current_step % self.config.record_interval == 0:
                    self._record_state()
                
                if self._check_collision():
                    if self.config.auto_stop_on_collision:
                        break
                
                if self._check_escape():
                    if self.config.auto_stop_on_escape:
                        break
                
                if self._check_energy_drift():
                    pass
                
        except Exception as e:
            self.status = SimulationStatus.ERROR
            self._add_event(
                self.current_step, self.current_time,
                "错误",
                f"模拟出错: {str(e)}",
                {"error": str(e)}
            )
        
        if self.status == SimulationStatus.RUNNING:
            self.status = SimulationStatus.COMPLETED
            self._add_event(
                self.current_step, self.current_time,
                "完成",
                f"模拟正常完成，共{self.current_step}步",
                {"total_steps": self.current_step, "total_time": self.current_time}
            )
        
        return self.status
    
    def reset(self):
        """重置模拟器到初始状态"""
        initial_state = self.states[0]
        for i, body in enumerate(self.bodies):
            body.pos = initial_state.positions[i].copy()
            body.vel = initial_state.velocities[i].copy()
        
        self.status = SimulationStatus.RUNNING
        self.events = []
        self.states = []
        self.current_step = 0
        self.current_time = 0.0
        self._prev_accelerations = None
        self._max_energy_drift = 0.0
        self._record_state()
        self._initial_energy = self.states[0].total_energy
    
    def get_trajectory(self, body_index: int) -> np.ndarray:
        """
        获取指定星体的轨迹
        
        Args:
            body_index: 星体索引 (0或1)
        
        Returns:
            轨迹数组 (N, 2)
        """
        return np.array([state.positions[body_index] for state in self.states])
    
    def get_energy_history(self) -> Dict[str, np.ndarray]:
        """
        获取能量历史
        
        Returns:
            包含动能、势能、总能量的字典
        """
        steps = np.array([s.step for s in self.states])
        times = np.array([s.time for s in self.states])
        ke = np.array([s.kinetic_energy for s in self.states])
        pe = np.array([s.potential_energy for s in self.states])
        te = np.array([s.total_energy for s in self.states])
        
        return {
            'step': steps,
            'time': times,
            'kinetic': ke,
            'potential': pe,
            'total': te
        }
    
    def get_distance_history(self) -> Dict[str, np.ndarray]:
        """
        获取星体距离历史
        
        Returns:
            包含时间和距离的字典
        """
        return {
            'time': np.array([s.time for s in self.states]),
            'distance': np.array([s.distances[0] for s in self.states])
        }
    
    def print_events(self):
        """打印所有事件"""
        print("=" * 60)
        print("模拟事件记录")
        print("=" * 60)
        for event in self.events:
            print(event)
        print("=" * 60)
    
    def validate_timestep(self) -> Dict:
        """
        验证时间步长是否合理
        
        Returns:
            验证结果字典
        """
        suggested_dt = suggest_timestep(self.bodies, self.config.method)
        current_dt = self.config.dt
        
        ratio = current_dt / suggested_dt if suggested_dt > 0 else float('inf')
        
        result = {
            'suggested_dt': suggested_dt,
            'current_dt': current_dt,
            'ratio': ratio,
            'is_reasonable': ratio <= 2.0,
            'warnings': []
        }
        
        if ratio > 10.0:
            result['warnings'].append(
                f"时间步长过大！建议: {suggested_dt:.6f}年，当前: {current_dt:.6f}年"
            )
        elif ratio > 2.0:
            result['warnings'].append(
                f"时间步长略大，建议不超过: {suggested_dt:.6f}年"
            )
        
        return result
