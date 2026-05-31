import uuid
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class TraceNode:
    id: str
    type: str
    description: str
    value: Any
    timestamp: str
    source_package_id: Optional[str] = None
    correction_id: Optional[str] = None
    previous_node_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class SourceTracer:
    def __init__(self):
        self.nodes: Dict[str, TraceNode] = {}
        self.root_nodes: List[TraceNode] = []

    def _generate_id(self) -> str:
        return str(uuid.uuid4())

    def _now(self) -> str:
        return datetime.now().isoformat()

    def add_raw_data_node(
        self,
        description: str,
        value: Any,
        source_package_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TraceNode:
        node = TraceNode(
            id=self._generate_id(),
            type='raw_data',
            description=description,
            value=json.dumps(value) if isinstance(value, (dict, list)) else str(value),
            timestamp=self._now(),
            source_package_id=source_package_id,
            metadata=metadata or {}
        )
        self.nodes[node.id] = node
        self.root_nodes.append(node)
        return node

    def add_calculation_step_node(
        self,
        description: str,
        value: Any,
        previous_node_id: str,
        calculation_details: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TraceNode:
        if previous_node_id not in self.nodes:
            raise ValueError(f"Previous node {previous_node_id} not found")

        full_metadata = metadata or {}
        if calculation_details:
            full_metadata['calculation_details'] = calculation_details

        node = TraceNode(
            id=self._generate_id(),
            type='calculation_step',
            description=description,
            value=json.dumps(value) if isinstance(value, (dict, list)) else str(value),
            timestamp=self._now(),
            previous_node_id=previous_node_id,
            metadata=full_metadata
        )
        self.nodes[node.id] = node
        return node

    def add_correction_node(
        self,
        description: str,
        old_value: Any,
        new_value: Any,
        previous_node_id: str,
        correction_id: str,
        corrected_by: str,
        reason: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TraceNode:
        if previous_node_id not in self.nodes:
            raise ValueError(f"Previous node {previous_node_id} not found")

        full_metadata = metadata or {}
        full_metadata.update({
            'corrected_by': corrected_by,
            'reason': reason,
            'old_value': json.dumps(old_value) if isinstance(old_value, (dict, list)) else str(old_value),
            'new_value': json.dumps(new_value) if isinstance(new_value, (dict, list)) else str(new_value)
        })

        node = TraceNode(
            id=self._generate_id(),
            type='correction',
            description=description,
            value=json.dumps(new_value) if isinstance(new_value, (dict, list)) else str(new_value),
            timestamp=self._now(),
            previous_node_id=previous_node_id,
            correction_id=correction_id,
            metadata=full_metadata
        )
        self.nodes[node.id] = node
        return node

    def add_result_node(
        self,
        description: str,
        value: Any,
        previous_node_id: str,
        result_summary: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TraceNode:
        if previous_node_id not in self.nodes:
            raise ValueError(f"Previous node {previous_node_id} not found")

        full_metadata = metadata or {}
        if result_summary:
            full_metadata['result_summary'] = result_summary

        node = TraceNode(
            id=self._generate_id(),
            type='result',
            description=description,
            value=json.dumps(value) if isinstance(value, (dict, list)) else str(value),
            timestamp=self._now(),
            previous_node_id=previous_node_id,
            metadata=full_metadata
        )
        self.nodes[node.id] = node
        return node

    def get_trace_chain(self, node_id: str) -> List[TraceNode]:
        if node_id not in self.nodes:
            raise ValueError(f"Node {node_id} not found")

        chain = []
        current_id: Optional[str] = node_id
        while current_id is not None:
            node = self.nodes[current_id]
            chain.insert(0, node)
            current_id = node.previous_node_id

        return chain

    def get_all_traces(self) -> List[Dict[str, Any]]:
        traces = []
        for root in self.root_nodes:
            chain = self._build_chain(root.id)
            traces.append({
                'root_node_id': root.id,
                'chain_length': len(chain),
                'nodes': [self._node_to_dict(n) for n in chain]
            })
        return traces

    def _build_chain(self, root_id: str) -> List[TraceNode]:
        chain = [self.nodes[root_id]]
        current = self.nodes[root_id]

        while True:
            next_nodes = [n for n in self.nodes.values() if n.previous_node_id == current.id]
            if not next_nodes:
                break
            current = next_nodes[0]
            chain.append(current)

        return chain

    def _node_to_dict(self, node: TraceNode) -> Dict[str, Any]:
        return {
            'id': node.id,
            'type': node.type,
            'description': node.description,
            'value': node.value,
            'timestamp': node.timestamp,
            'sourcePackageId': node.source_package_id,
            'correctionId': node.correction_id,
            'previousNodeId': node.previous_node_id,
            'metadata': node.metadata
        }

    def trace_energy_calculation(
        self,
        raw_data_package_id: str,
        payload_weight: float,
        wind_speed: float,
        altitude: float,
        speed: float,
        power_consumption: float,
        calculation_formula: str
    ) -> TraceNode:
        raw_node = self.add_raw_data_node(
            description='原始能耗参数输入',
            value={
                'payload_weight': payload_weight,
                'wind_speed': wind_speed,
                'altitude': altitude,
                'speed': speed
            },
            source_package_id=raw_data_package_id,
            metadata={'data_type': 'energy_input'}
        )

        calc_node = self.add_calculation_step_node(
            description='能耗计算：基础功率 × 载荷因子 × 风因子 × 高度因子 × 速度因子',
            value=power_consumption,
            previous_node_id=raw_node.id,
            calculation_details={
                'formula': calculation_formula,
                'payload_factor': 1.0 + (payload_weight / 5.0) * 0.6,
                'wind_factor': 1.0 + (wind_speed / 15.0) * 0.8,
                'altitude_factor': 1.0 + (altitude / 500.0) * 0.3,
                'speed_factor': 1.0 + (speed / 25.0) * 0.4
            }
        )

        return calc_node

    def trace_return_threshold_calculation(
        self,
        energy_model_node_id: str,
        min_battery_level: float,
        max_distance: float,
        safety_margin: float
    ) -> TraceNode:
        return self.add_calculation_step_node(
            description='返航阈值计算：考虑安全余量的最低电量和最远距离',
            value={
                'minBatteryLevel': min_battery_level,
                'maxDistance': max_distance
            },
            previous_node_id=energy_model_node_id,
            calculation_details={
                'safety_margin': safety_margin,
                'formula': 'min_battery = (返航能耗 × (1 + 安全余量)) / 电池容量 × 100%'
            }
        )

    def trace_risk_detection(
        self,
        previous_node_id: str,
        risk_type: str,
        risk_level: str,
        detection_criteria: str,
        threshold_value: Any,
        actual_value: Any
    ) -> TraceNode:
        return self.add_calculation_step_node(
            description=f'风险识别：{risk_type}',
            value={
                'riskType': risk_type,
                'riskLevel': risk_level
            },
            previous_node_id=previous_node_id,
            calculation_details={
                'detection_criteria': detection_criteria,
                'threshold_value': threshold_value,
                'actual_value': actual_value
            },
            metadata={'risk_detection': True}
        )

    def trace_correction(
        self,
        original_node_id: str,
        field: str,
        old_value: Any,
        new_value: Any,
        correction_id: str,
        corrected_by: str,
        reason: str
    ) -> TraceNode:
        return self.add_correction_node(
            description=f'人工修正：{field}',
            old_value=old_value,
            new_value=new_value,
            previous_node_id=original_node_id,
            correction_id=correction_id,
            corrected_by=corrected_by,
            reason=reason,
            metadata={'field': field}
        )

    def to_dict(self) -> List[Dict[str, Any]]:
        return [self._node_to_dict(node) for node in self.nodes.values()]

    def to_list(self) -> List[Dict[str, Any]]:
        return [self._node_to_dict(node) for node in self.nodes.values()]
