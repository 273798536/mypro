import math
import copy


class Optimizer:

    DEFAULT_CONFIG = {
        'weights': {
            'distance': 0.35,
            'urgency': 0.35,
            'skill': 0.30
        },
        'max_orders_per_tech': 5,
        'max_route_distance_km': 50,
        'buffer_minutes': 15,
        'start_hour': 8,
        'end_hour': 18,
        'avg_speed_kmh': 30,
        'violation_penalty': 0.5
    }

    def score_all(self, work_orders, technicians, config):
        cfg = {**self.DEFAULT_CONFIG, **(config or {})}
        weights = cfg['weights']

        scored_orders = []
        for order in work_orders:
            order_scores = []
            for tech in technicians:
                dist_score = self._score_distance(order, tech, cfg)
                urgency_score = self._score_urgency(order, cfg)
                skill_score = self._score_skill(order, tech, cfg)

                composite = (
                    dist_score * weights['distance'] +
                    urgency_score * weights['urgency'] +
                    skill_score * weights['skill']
                )

                order_scores.append({
                    'technician_id': tech['id'],
                    'technician_name': tech.get('name', ''),
                    'composite_score': round(composite, 3),
                    'score_distance': round(dist_score, 3),
                    'score_urgency': round(urgency_score, 3),
                    'score_skill': round(skill_score, 3),
                    'distance_km': self._calc_distance_km(order, tech),
                    'travel_minutes': self._calc_travel_minutes(order, tech, cfg),
                    'skill_match': self._check_skill_match(order, tech),
                    'flags': self._initial_flags(order, tech, cfg)
                })

            order_scores.sort(key=lambda x: x['composite_score'], reverse=True)

            best = order_scores[0] if order_scores else {}
            scored = dict(order)
            scored['tech_scores'] = order_scores
            scored['best_technician'] = best.get('technician_name', '')
            scored['best_technician_id'] = best.get('technician_id', '')
            scored['best_score'] = best.get('composite_score', 0)
            scored['best_distance'] = best.get('score_distance', 0)
            scored['best_urgency'] = best.get('score_urgency', 0)
            scored['best_skill'] = best.get('score_skill', 0)
            scored['flags'] = self._collect_all_flags(order_scores)
            scored_orders.append(scored)

        return scored_orders

    def _score_distance(self, order, tech, cfg):
        dist_km = self._calc_distance_km(order, tech)
        max_dist = cfg.get('max_route_distance_km', 50)
        if dist_km is None:
            return 0.5
        normalized = min(dist_km / max(max_dist, 1), 1.0)
        return round(1.0 - normalized, 3)

    def _score_urgency(self, order, cfg):
        urgency = order.get('urgency', 2)
        return round(urgency / 3.0, 3)

    def _score_skill(self, order, tech, cfg):
        match = self._check_skill_match(order, tech)
        if match == 'exact':
            return 1.0
        elif match == 'partial':
            return 0.6
        elif match == 'related':
            return 0.3
        else:
            return 0.0

    def _check_skill_match(self, order, tech):
        required = order.get('required_skill', '').strip()
        tech_skills = [s.strip() for s in tech.get('skills', []) if s.strip()]
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
        related_skills = related_map.get(required, [])
        for ts in tech_skills:
            if ts in related_skills:
                return 'related'
        for ts in tech_skills:
            if ts and (ts in required or required in ts):
                return 'partial'
        return 'none'

    def _calc_distance_km(self, order, tech):
        lat1, lng1 = order.get('lat'), order.get('lng')
        lat2, lng2 = tech.get('lat'), tech.get('lng')
        if None in (lat1, lng1, lat2, lng2):
            return None
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

    def _calc_travel_minutes(self, order, tech, cfg):
        dist_km = self._calc_distance_km(order, tech)
        if dist_km is None:
            traffic = order.get('traffic_time', 0) or 0
            return traffic * 60 if traffic < 10 else traffic
        speed = cfg.get('avg_speed_kmh', 30)
        return round((dist_km / speed) * 60, 1)

    def _initial_flags(self, order, tech, cfg):
        flags = []
        if self._check_skill_match(order, tech) == 'none':
            flags.append('技能不匹配')
        elif self._check_skill_match(order, tech) == 'related':
            flags.append('技能相关但非专长')
        ws = order.get('window_start')
        we = order.get('window_end')
        if ws and we and ws >= we:
            flags.append('预约窗口异常')
        dist = self._calc_distance_km(order, tech)
        if dist is not None and dist > cfg.get('max_route_distance_km', 50):
            flags.append('距离超限')
        return flags

    def _collect_all_flags(self, order_scores):
        if not order_scores:
            return []
        best = order_scores[0]
        return list(best.get('flags', []))

    def build_routes(self, scored_orders, technicians, config):
        cfg = {**self.DEFAULT_CONFIG, **(config or {})}
        max_orders = cfg.get('max_orders_per_tech', 5)

        routes = {t['id']: {
            'technician_id': t['id'],
            'technician_name': t.get('name', t['id']),
            'orders': [],
            'total_distance_km': 0,
            'total_time_min': 0,
            'start_location': t.get('location', ''),
            'current_lat': t.get('lat'),
            'current_lng': t.get('lng'),
            'current_time': cfg['start_hour'] * 60
        } for t in technicians}

        sorted_orders = sorted(scored_orders, key=lambda o: o.get('best_score', 0), reverse=True)

        assigned = set()

        for order in sorted_orders:
            best_tech_id = order.get('best_technician_id')
            if not best_tech_id or best_tech_id in assigned:
                for ts in order.get('tech_scores', []):
                    tid = ts['technician_id']
                    if tid not in assigned and len(routes[tid]['orders']) < max_orders:
                        best_tech_id = tid
                        break

            if not best_tech_id:
                continue
            if len(routes[best_tech_id]['orders']) >= max_orders:
                continue

            route = routes[best_tech_id]
            travel_min = self._travel_from_current(route, order, cfg)
            arrival_min = route['current_time'] + travel_min
            order_assigned = dict(order)
            order_assigned['arrival_min'] = round(arrival_min, 1)
            order_assigned['departure_min'] = round(arrival_min + order.get('service_time', 1) * 60, 1)
            order_assigned['travel_min'] = travel_min

            ws = order.get('window_start')
            we = order.get('window_end')
            if ws and we:
                if arrival_min < ws - cfg['buffer_minutes']:
                    order_assigned['window_violation'] = '早到'
                elif arrival_min > we:
                    order_assigned['window_violation'] = '超窗'
                else:
                    order_assigned['window_violation'] = ''
            else:
                order_assigned['window_violation'] = ''

            dist_km = self._calc_distance_km({
                'lat': route['current_lat'],
                'lng': route['current_lng']
            }, order)
            order_assigned['leg_distance_km'] = dist_km

            route['orders'].append(order_assigned)
            route['total_distance_km'] += dist_km or 0
            route['total_time_min'] = order_assigned['departure_min'] - cfg['start_hour'] * 60
            route['current_lat'] = order.get('lat')
            route['current_lng'] = order.get('lng')
            route['current_time'] = order_assigned['departure_min']

            assigned.add(best_tech_id)

        result_routes = []
        for tech_id, route in routes.items():
            if route['orders']:
                r = {
                    'technician_id': tech_id,
                    'technician_name': route['technician_name'],
                    'orders': route['orders'],
                    'total_distance_km': round(route['total_distance_km'], 2),
                    'total_time_min': round(route['total_time_min'], 1),
                    'order_count': len(route['orders'])
                }
                if r['total_distance_km'] > cfg.get('max_route_distance_km', 50):
                    r['flags'] = r.get('flags', []) + ['总里程超限']
                if route['current_time'] > cfg['end_hour'] * 60:
                    r.setdefault('flags', []).append('超时下班')
                result_routes.append(r)

        return result_routes

    def _travel_from_current(self, route, order, cfg):
        speed = cfg.get('avg_speed_kmh', 30)
        dist_km = self._calc_distance_km({
            'lat': route['current_lat'],
            'lng': route['current_lng']
        }, order)
        if dist_km is None:
            return 30
        return round((dist_km / speed) * 60, 1)

    def generate_schedule(self, routes, config):
        cfg = {**self.DEFAULT_CONFIG, **(config or {})}
        schedule = []
        for route in routes:
            for idx, order in enumerate(route.get('orders', []), 1):
                entry = {
                    '师傅': route.get('technician_name', ''),
                    '序号': idx,
                    '工单号': order.get('id', ''),
                    '工单名称': order.get('name', ''),
                    '位置': order.get('location', ''),
                    '紧急等级': order.get('urgency', ''),
                    '所需技能': order.get('required_skill', ''),
                    '预计到达(分钟)': order.get('arrival_min', ''),
                    '预计离开(分钟)': order.get('departure_min', ''),
                    '行驶时间(分钟)': order.get('travel_min', ''),
                    '服务时长(小时)': order.get('service_time', ''),
                    '预约窗口': self._format_window(order),
                    '超窗状态': order.get('window_violation', ''),
                    '综合评分': order.get('best_score', ''),
                    '来源行号': order.get('_source_row', '')
                }
                schedule.append(entry)
        return schedule

    def _format_window(self, order):
        ws = order.get('window_start')
        we = order.get('window_end')
        if ws is None and we is None:
            return '无预约'
        parts = []
        for v, label in [(ws, '起'), (we, '止')]:
            if v is not None:
                if isinstance(v, (int, float)) and v < 24 * 60:
                    h = int(v // 60)
                    m = int(v % 60)
                    parts.append(f'{label}{h:02d}:{m:02d}')
                else:
                    parts.append(f'{label}{v}')
        return ' '.join(parts)
