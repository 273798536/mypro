import uuid
import math
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

@dataclass
class RiskLevel:
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

@dataclass
class RiskType:
    HEADWIND_SUDDEN_CHANGE = 'headwind_sudden_change'
    BATTERY_AGING = 'battery_aging'
    NO_FLY_ZONE_DETOUR = 'no_fly_zone_detour'
    INSUFFICIENT_BATTERY = 'insufficient_battery'
    PAYLOAD_EXCEED = 'payload_exceed'
    WIND_EXCEED_LIMIT = 'wind_exceed_limit'
    ALTITUDE_EXCEED = 'altitude_exceed'

class RiskDetector:
    def __init__(self):
        self.risk_thresholds = {
            'max_wind_speed': 12.0,
            'max_payload': 5.0,
            'max_altitude': 500.0,
            'min_battery_level': 30.0,
            'critical_battery_level': 15.0,
            'battery_aging_warning': 0.85,
            'battery_aging_critical': 0.7,
            'wind_sudden_change_threshold': 3.0,
            'detour_distance_warning': 2.0
        }

    def detect_all_risks(
        self,
        waypoint_plan: Dict[str, Any],
        payload_weight: Dict[str, Any],
        wind_field: Dict[str, Any],
        battery_info: Optional[Dict[str, Any]] = None,
        no_fly_zones: Optional[List[Dict[str, Any]]] = None,
        energy_model_result: Optional[Dict[str, Any]] = None,
        return_threshold: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        risks = []

        risks.extend(self._detect_wind_risks(wind_field))
        risks.extend(self._detect_payload_risks(payload_weight))
        risks.extend(self._detect_altitude_risks(waypoint_plan))

        if battery_info:
            risks.extend(self._detect_battery_aging_risks(battery_info))

        if no_fly_zones:
            risks.extend(self._detect_no_fly_zone_risks(no_fly_zones))

        if energy_model_result and return_threshold:
            risks.extend(self._detect_energy_risks(energy_model_result, return_threshold))

        if wind_field.get('suddenChange'):
            risks.extend(self._detect_sudden_wind_change_risk(wind_field['suddenChange'], payload_weight))

        for risk in risks:
            risk['id'] = str(uuid.uuid4())
            risk['sourceTraceId'] = str(uuid.uuid4())

        return sorted(risks, key=lambda r: self._risk_priority(r['level']), reverse=True)

    def _risk_priority(self, level: str) -> int:
        priority = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3, RiskLevel.CRITICAL: 4}
        return priority.get(level, 0)

    def _detect_wind_risks(self, wind_field: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        base_wind = wind_field.get('baseWindSpeed', 0)

        if base_wind > self.risk_thresholds['max_wind_speed']:
            risks.append({
                'level': RiskLevel.CRITICAL,
                'type': RiskType.WIND_EXCEED_LIMIT,
                'message': f'基础风速 {base_wind} m/s 超过安全限值 {self.risk_thresholds["max_wind_speed"]} m/s',
                'details': {
                    'currentWindSpeed': base_wind,
                    'maxAllowed': self.risk_thresholds['max_wind_speed'],
                    'exceedAmount': round(base_wind - self.risk_thresholds['max_wind_speed'], 2)
                }
            })
        elif base_wind > self.risk_thresholds['max_wind_speed'] * 0.8:
            risks.append({
                'level': RiskLevel.HIGH,
                'type': RiskType.WIND_EXCEED_LIMIT,
                'message': f'基础风速 {base_wind} m/s 接近安全限值',
                'details': {
                    'currentWindSpeed': base_wind,
                    'maxAllowed': self.risk_thresholds['max_wind_speed'],
                    'percentage': round(base_wind / self.risk_thresholds['max_wind_speed'] * 100, 1)
                }
            })

        return risks

    def _detect_sudden_wind_change_risk(
        self,
        sudden_change: Dict[str, Any],
        payload_weight: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        risks = []
        point = sudden_change.get('point', 0)
        new_wind = sudden_change.get('windSpeed', 0)
        base_wind = 5.0
        wind_increase = new_wind - base_wind

        payload = payload_weight.get('payload', 0) if isinstance(payload_weight, dict) else payload_weight
        payload_factor = 1.0 + (payload / self.risk_thresholds['max_payload']) * 0.5

        if wind_increase >= self.risk_thresholds['wind_sudden_change_threshold']:
            energy_increase_pct = wind_increase * 8 * payload_factor

            if new_wind > self.risk_thresholds['max_wind_speed']:
                level = RiskLevel.CRITICAL
                message = f'在 {point} km 处发生逆风突变，风速从 {base_wind} m/s 骤升至 {new_wind} m/s，超过安全限值'
            elif energy_increase_pct > 30:
                level = RiskLevel.CRITICAL
                message = f'在 {point} km 处发生逆风突变，能耗预计增加 {round(energy_increase_pct, 1)}%，严重影响返航安全'
            elif energy_increase_pct > 15:
                level = RiskLevel.HIGH
                message = f'在 {point} km 处发生逆风突变，能耗预计增加 {round(energy_increase_pct, 1)}%，建议提前规划返航'
            else:
                level = RiskLevel.MEDIUM
                message = f'在 {point} km 处检测到逆风变化，风速增加 {round(wind_increase, 1)} m/s'

            risks.append({
                'level': level,
                'type': RiskType.HEADWIND_SUDDEN_CHANGE,
                'message': message,
                'details': {
                    'changePoint': point,
                    'originalWindSpeed': base_wind,
                    'newWindSpeed': new_wind,
                    'windIncrease': round(wind_increase, 2),
                    'energyIncreasePercent': round(energy_increase_pct, 2),
                    'payloadFactor': round(payload_factor, 3),
                    'windDirection': sudden_change.get('windDirection', 0)
                }
            })

        return risks

    def _detect_payload_risks(self, payload_weight: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        payload = payload_weight.get('payload', 0) if isinstance(payload_weight, dict) else payload_weight
        takeoff_weight = payload_weight.get('takeoffWeight', 0) if isinstance(payload_weight, dict) else 0

        max_payload = self.risk_thresholds['max_payload']
        max_takeoff_weight = max_payload + 12.5

        if payload > max_payload:
            risks.append({
                'level': RiskLevel.CRITICAL,
                'type': RiskType.PAYLOAD_EXCEED,
                'message': f'载荷重量 {payload} kg 超过最大允许值 {max_payload} kg',
                'details': {
                    'currentPayload': payload,
                    'maxAllowed': max_payload,
                    'exceedAmount': round(payload - max_payload, 2),
                    'takeoffWeight': takeoff_weight
                }
            })
        elif payload > max_payload * 0.9:
            risks.append({
                'level': RiskLevel.HIGH,
                'type': RiskType.PAYLOAD_EXCEED,
                'message': f'载荷重量 {payload} kg 接近最大允许值',
                'details': {
                    'currentPayload': payload,
                    'maxAllowed': max_payload,
                    'percentage': round(payload / max_payload * 100, 1)
                }
            })

        return risks

    def _detect_altitude_risks(self, waypoint_plan: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        waypoints = waypoint_plan.get('waypoints', [])

        if not waypoints:
            return risks

        max_altitude = max(wp.get('altitude', 0) for wp in waypoints)
        max_allowed = self.risk_thresholds['max_altitude']

        if max_altitude > max_allowed:
            risks.append({
                'level': RiskLevel.HIGH,
                'type': RiskType.ALTITUDE_EXCEED,
                'message': f'飞行高度 {max_altitude} m 超过最大允许值 {max_allowed} m',
                'details': {
                    'maxAltitude': max_altitude,
                    'maxAllowed': max_allowed,
                    'exceedAmount': round(max_altitude - max_allowed, 2)
                }
            })

        return risks

    def _detect_battery_aging_risks(self, battery_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        battery = battery_info.get('battery', battery_info) if isinstance(battery_info, dict) else {}

        aging_factor = battery.get('agingFactor', 1.0)
        cycle_count = battery.get('cycleCount', 0)
        current_capacity = battery.get('currentCapacity', 0)
        initial_capacity = battery.get('initialCapacity', 0)

        capacity_loss = (1 - aging_factor) * 100 if initial_capacity > 0 else 0

        if aging_factor < self.risk_thresholds['battery_aging_critical']:
            risks.append({
                'level': RiskLevel.CRITICAL,
                'type': RiskType.BATTERY_AGING,
                'message': f'电池老化严重，容量已衰减 {round(capacity_loss, 1)}%，禁止执行本次任务',
                'details': {
                    'agingFactor': aging_factor,
                    'capacityLossPercent': round(capacity_loss, 2),
                    'cycleCount': cycle_count,
                    'currentCapacity': current_capacity,
                    'initialCapacity': initial_capacity,
                    'recommendation': '建议更换电池'
                }
            })
        elif aging_factor < self.risk_thresholds['battery_aging_warning']:
            risks.append({
                'level': RiskLevel.HIGH,
                'type': RiskType.BATTERY_AGING,
                'message': f'电池老化明显，容量已衰减 {round(capacity_loss, 1)}%，需增加安全余量',
                'details': {
                    'agingFactor': aging_factor,
                    'capacityLossPercent': round(capacity_loss, 2),
                    'cycleCount': cycle_count,
                    'currentCapacity': current_capacity,
                    'initialCapacity': initial_capacity,
                    'recommendation': '建议增加15%电池安全余量'
                }
            })
        elif aging_factor < 0.95:
            risks.append({
                'level': RiskLevel.MEDIUM,
                'type': RiskType.BATTERY_AGING,
                'message': f'电池容量衰减 {round(capacity_loss, 1)}%，已循环 {cycle_count} 次',
                'details': {
                    'agingFactor': aging_factor,
                    'capacityLossPercent': round(capacity_loss, 2),
                    'cycleCount': cycle_count
                }
            })

        return risks

    def _detect_no_fly_zone_risks(self, no_fly_zones: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        risks = []
        total_detour = 0.0

        for nfz in no_fly_zones:
            detour = nfz.get('detourDistance', 0)
            total_detour += detour

            if detour > self.risk_thresholds['detour_distance_warning']:
                risks.append({
                    'level': RiskLevel.HIGH,
                    'type': RiskType.NO_FLY_ZONE_DETOUR,
                    'message': f'需绕行禁飞区 {nfz.get("id", "unknown")}，绕行距离 {detour} km',
                    'details': {
                        'noFlyZoneId': nfz.get('id'),
                        'center': nfz.get('center'),
                        'radius': nfz.get('radius'),
                        'detourDistance': detour
                    }
                })
            elif detour > 0:
                risks.append({
                    'level': RiskLevel.MEDIUM,
                    'type': RiskType.NO_FLY_ZONE_DETOUR,
                    'message': f'需绕行禁飞区 {nfz.get("id", "unknown")}，绕行距离 {detour} km',
                    'details': {
                        'noFlyZoneId': nfz.get('id'),
                        'detourDistance': detour
                    }
                })

        if total_detour > self.risk_thresholds['detour_distance_warning']:
            risks.append({
                'level': RiskLevel.HIGH,
                'type': RiskType.NO_FLY_ZONE_DETOUR,
                'message': f'总绕行距离 {round(total_detour, 2)} km，将显著增加能耗',
                'details': {
                    'totalDetourDistance': round(total_detour, 2),
                    'energyIncreasePercent': round(total_detour * 8, 2),
                    'zonesCount': len(no_fly_zones)
                }
            })

        return risks

    def _detect_energy_risks(
        self,
        energy_model_result: Dict[str, Any],
        return_threshold: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        risks = []

        urgency = return_threshold.get('returnUrgency', 'low')
        should_return = return_threshold.get('shouldReturnNow', False)
        min_battery = return_threshold.get('minBatteryLevel', 0)
        current_energy = return_threshold.get('currentEnergyWh', 0)
        energy_to_return = return_threshold.get('energyToReturn', 0)
        energy_to_continue = return_threshold.get('energyToContinue', 0)

        if should_return:
            risks.append({
                'level': RiskLevel.CRITICAL,
                'type': RiskType.INSUFFICIENT_BATTERY,
                'message': '电池电量不足，必须立即返航',
                'details': {
                    'minBatteryRequired': min_battery,
                    'currentEnergyWh': current_energy,
                    'energyToReturn': energy_to_return,
                    'energyToContinue': energy_to_continue,
                    'energyDeficit': round(energy_to_return + energy_to_continue - current_energy, 2)
                }
            })
        elif urgency == 'high':
            risks.append({
                'level': RiskLevel.HIGH,
                'type': RiskType.INSUFFICIENT_BATTERY,
                'message': '电池余量紧张，建议准备返航',
                'details': {
                    'returnUrgency': urgency,
                    'energyMargin': round(current_energy - energy_to_return - energy_to_continue, 2),
                    'minBatteryRequired': min_battery
                }
            })
        elif urgency == 'medium':
            risks.append({
                'level': RiskLevel.MEDIUM,
                'type': RiskType.INSUFFICIENT_BATTERY,
                'message': '电池余量适中，建议监控电池状态',
                'details': {
                    'returnUrgency': urgency,
                    'energyMargin': round(current_energy - energy_to_return - energy_to_continue, 2)
                }
            })

        return risks

    def calculate_risk_summary(self, risks: List[Dict[str, Any]]) -> Dict[str, Any]:
        counts = {RiskLevel.LOW: 0, RiskLevel.MEDIUM: 0, RiskLevel.HIGH: 0, RiskLevel.CRITICAL: 0}
        types = {}

        for risk in risks:
            level = risk.get('level', RiskLevel.LOW)
            risk_type = risk.get('type', 'unknown')
            counts[level] = counts.get(level, 0) + 1
            types[risk_type] = types.get(risk_type, 0) + 1

        if counts[RiskLevel.CRITICAL] > 0:
            overall_level = RiskLevel.CRITICAL
        elif counts[RiskLevel.HIGH] > 0:
            overall_level = RiskLevel.HIGH
        elif counts[RiskLevel.MEDIUM] > 0:
            overall_level = RiskLevel.MEDIUM
        else:
            overall_level = RiskLevel.LOW

        return {
            'totalRisks': len(risks),
            'riskCounts': counts,
            'riskTypes': types,
            'overallRiskLevel': overall_level,
            'canProceed': overall_level in [RiskLevel.LOW, RiskLevel.MEDIUM],
            'recommendation': self._generate_recommendation(overall_level, counts, risks)
        }

    def _generate_recommendation(
        self,
        overall_level: str,
        counts: Dict[str, int],
        risks: List[Dict[str, Any]]
    ) -> str:
        if overall_level == RiskLevel.CRITICAL:
            critical_risks = [r for r in risks if r['level'] == RiskLevel.CRITICAL]
            risk_types = set(r['type'] for r in critical_risks)
            return f'禁止执行任务。存在 {counts[RiskLevel.CRITICAL]} 项严重风险：{", ".join(risk_types)}。'
        elif overall_level == RiskLevel.HIGH:
            high_risks = [r for r in risks if r['level'] == RiskLevel.HIGH]
            risk_types = set(r['type'] for r in high_risks)
            return f'不建议执行任务。存在 {counts[RiskLevel.HIGH]} 项高风险：{", ".join(risk_types)}。需进行风险缓释。'
        elif overall_level == RiskLevel.MEDIUM:
            return f'可以执行任务，但需保持监控。存在 {counts[RiskLevel.MEDIUM]} 项中等风险。'
        else:
            return '可以安全执行任务。风险水平较低。'
