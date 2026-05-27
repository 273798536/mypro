import copy
import math


class ConstraintChecker:

    DEFAULT_CONFIG = {
        'max_orders_per_tech': 5,
        'max_route_distance_km': 50,
        'buffer_minutes': 15,
        'start_hour': 8,
        'end_hour': 18
    }

    def filter(self, scored_orders, config):
        cfg = {**self.DEFAULT_CONFIG, **(config or {})}
        filtered = []
        for order in scored_orders:
            tech_scores = order.get('tech_scores', [])
            valid_scores = [ts for ts in tech_scores if '技能不匹配' not in ts.get('flags', [])]
            if not valid_scores:
                filtered.append(order)
                continue
            order_copy = dict(order)
            order_copy['tech_scores'] = valid_scores
            if valid_scores:
                best = valid_scores[0]
                order_copy['best_technician'] = best.get('technician_name', '')
                order_copy['best_technician_id'] = best.get('technician_id', '')
                order_copy['best_score'] = best.get('composite_score', 0)
            filtered.append(order_copy)
        return filtered

    def detect_anomalies(self, routes, work_orders, technicians):
        anomalies = []

        for route in routes:
            tech_name = route.get('technician_name', '')
            orders = route.get('orders', [])

            skill_issues = self._check_skill_mismatch(orders, technicians, tech_name)
            anomalies.extend(skill_issues)

            window_issues = self._check_window_violations(orders)
            anomalies.extend(window_issues)

            backtrack_issues = self._check_backtracking(orders)
            anomalies.extend(backtrack_issues)

            if route.get('total_distance_km', 0) > 100:
                anomalies.append({
                    'type': '距离超限',
                    'order_id': '',
                    'technician_name': tech_name,
                    'description': f'{tech_name} 总里程 {route["total_distance_km"]:.1f}km 超过常规范围',
                    'severity': 'warning',
                    'source_row': ''
                })

            if len(orders) > 5:
                anomalies.append({
                    'type': '派单过载',
                    'order_id': '',
                    'technician_name': tech_name,
                    'description': f'{tech_name} 当日派单 {len(orders)} 单，超过建议上限',
                    'severity': 'warning',
                    'source_row': ''
                })

        for order in work_orders:
            assigned = False
            for route in routes:
                for r_order in route.get('orders', []):
                    if r_order.get('id') == order.get('id'):
                        assigned = True
                        break
                if assigned:
                    break
            if not assigned:
                anomalies.append({
                    'type': '未派单',
                    'order_id': order.get('id', ''),
                    'technician_name': '',
                    'description': f'工单 {order.get("name", order.get("id", ""))} 未能分配到合适师傅',
                    'severity': 'critical',
                    'source_row': order.get('_source_row', '')
                })

        return anomalies

    def _check_skill_mismatch(self, orders, technicians, tech_name):
        issues = []
        tech = next((t for t in technicians if t.get('name') == tech_name or t.get('id') == tech_name), None)
        if not tech:
            return issues
        tech_skills = [s.strip() for s in tech.get('skills', []) if s.strip()]

        for order in orders:
            required = order.get('required_skill', '').strip()
            if not required:
                continue
            match = self._match_level(required, tech_skills)
            if match == 'none':
                issues.append({
                    'type': '技能不匹配',
                    'order_id': order.get('id', ''),
                    'technician_name': tech_name,
                    'description': (f'工单 {order.get("name", order.get("id", ""))} 需要【{required}】，'
                                   f'但 {tech_name} 技能为 {"/".join(tech_skills) or "无"}'),
                    'severity': 'critical',
                    'source_row': order.get('_source_row', '')
                })
            elif match == 'related':
                issues.append({
                    'type': '技能相关但非专长',
                    'order_id': order.get('id', ''),
                    'technician_name': tech_name,
                    'description': (f'工单 {order.get("name", order.get("id", ""))} 需要【{required}】，'
                                   f'{tech_name} 技能相关但非专长'),
                    'severity': 'warning',
                    'source_row': order.get('_source_row', '')
                })
        return issues

    def _match_level(self, required, tech_skills):
        if not required:
            return 'exact'
        if required in tech_skills:
            return 'exact'
        related_map = {
            '空调维修': ['空调保养', '制冷维修'],
            '空调保养': ['空调维修', '制冷维修'],
            '水管维修': ['紧急抢修', '管道安装'],
            '紧急抢修': ['水管维修', '管道安装'],
            '电路检修': ['弱电安装', '强电维修'],
            '弱电安装': ['电路检修', '强电维修']
        }
        related = related_map.get(required, [])
        for ts in tech_skills:
            if ts in related:
                return 'related'
        for ts in tech_skills:
            if ts and (ts in required or required in ts):
                return 'partial'
        return 'none'

    def _check_window_violations(self, orders):
        issues = []
        for order in orders:
            violation = order.get('window_violation', '')
            if violation:
                arrival = order.get('arrival_min', 0)
                ws = order.get('window_start')
                we = order.get('window_end')
                arrival_str = self._format_minutes(arrival)
                if violation == '超窗':
                    issues.append({
                        'type': '预约超窗',
                        'order_id': order.get('id', ''),
                        'technician_name': order.get('_tech_name', ''),
                        'description': (f'工单 {order.get("name", order.get("id", ""))} '
                                       f'预计到达 {arrival_str}，超过预约结束时间 '
                                       f'{self._format_minutes(we) if we else "?"}'),
                        'severity': 'critical',
                        'source_row': order.get('_source_row', '')
                    })
                elif violation == '早到':
                    issues.append({
                        'type': '预约早到',
                        'order_id': order.get('id', ''),
                        'technician_name': order.get('_tech_name', ''),
                        'description': (f'工单 {order.get("name", order.get("id", ""))} '
                                       f'预计到达 {arrival_str}，早于预约开始时间 '
                                       f'{self._format_minutes(ws) if ws else "?"}'),
                        'severity': 'warning',
                        'source_row': order.get('_source_row', '')
                    })
        return issues

    def _check_backtracking(self, orders):
        issues = []
        if len(orders) < 3:
            return issues

        for i in range(len(orders) - 2):
            prev = orders[i]
            curr = orders[i + 1]
            next_o = orders[i + 2]

            prev_lat = prev.get('lat')
            curr_lat = curr.get('lat')
            next_lat = next_o.get('lat')

            if None in (prev_lat, curr_lat, next_lat):
                continue

            if curr_lat <= prev_lat and next_lat > curr_lat:
                issues.append({
                    'type': '路线回头',
                    'order_id': curr.get('id', ''),
                    'technician_name': '',
                    'description': (f'路线中在第{i+2}站【{curr.get("name", "")}】处出现回头趋势，'
                                   f'建议调整顺序'),
                    'severity': 'warning',
                    'source_row': curr.get('_source_row', '')
                })

        for i in range(len(orders)):
            for j in range(i + 2, len(orders)):
                o1 = orders[i]
                o2 = orders[j]
                if (o1.get('lat') is not None and o2.get('lat') is not None and
                    o1.get('lng') is not None and o2.get('lng') is not None):
                    dist = math.sqrt(
                        (o2['lat'] - o1['lat']) ** 2 +
                        (o2['lng'] - o1['lng']) ** 2
                    )
                    if dist < 0.001:
                        in_between = any(
                            orders[k].get('lat') is not None and
                            orders[k].get('lng') is not None and
                            math.sqrt(
                                (orders[k]['lat'] - o1['lat']) ** 2 +
                                (orders[k]['lng'] - o1['lng']) ** 2
                            ) > dist * 0.5
                            for k in range(i + 1, j)
                        )
                        if in_between:
                            issues.append({
                                'type': '路线回头',
                                'order_id': o2.get('id', ''),
                                'technician_name': '',
                                'description': (f'第{j+1}站【{o2.get("name", "")}】距离第{i+1}站过近，'
                                               f'存在回头路径，建议合并或调整'),
                                'severity': 'warning',
                                'source_row': o2.get('_source_row', '')
                            })
        return issues

    def _format_minutes(self, val):
        if val is None:
            return '?'
        if isinstance(val, (int, float)):
            h = int(val // 60)
            m = int(val % 60)
            return f'{h:02d}:{m:02d}'
        return str(val)
