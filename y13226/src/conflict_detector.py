import os
import json
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from collections import defaultdict


class AliasResolver:
    def __init__(self, base_dir: str):
        alias_config_path = os.path.join(base_dir, 'config', 'alias_config.json')
        with open(alias_config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        self._build_index(config['alias_groups'])

    def _build_index(self, alias_groups: List[Dict]):
        self.name_to_canonical = {}
        self.canonical_to_aliases = {}
        for group in alias_groups:
            canonical = group['canonical']
            self.canonical_to_aliases[canonical] = set(group['aliases'])
            self.canonical_to_aliases[canonical].add(canonical)
            self.name_to_canonical[canonical.lower()] = canonical
            for alias in group['aliases']:
                self.name_to_canonical[alias.lower()] = canonical

    def resolve(self, name: str) -> str:
        if not name:
            return ''
        return self.name_to_canonical.get(name.strip().lower(), name.strip())

    def is_alias_pair(self, name1: str, name2: str) -> bool:
        if not name1 or not name2:
            return False
        c1 = self.resolve(name1)
        c2 = self.resolve(name2)
        return c1 == c2 and name1.strip().lower() != name2.strip().lower()


class VersionManager:
    def __init__(self):
        self.version_keywords = ['新版', 'v2', 'v3', '最终', '正式', 'latest', 'new', 'final']
        self.old_keywords = ['旧版', 'v1', '历史', '归档', 'old', 'archive', 'history']
        self.temp_keywords = ['临时', '调整', '修改', '林姐', 'temp', 'adjust', 'manual']
        self.time_tolerance_minutes = 15

    def _parse_time(self, time_str: str):
        if not time_str:
            return None
        for fmt in ['%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M']:
            try:
                return datetime.strptime(time_str.strip(), fmt)
            except ValueError:
                continue
        return None

    def _time_diff_minutes(self, t1_str: str, t2_str: str) -> float:
        t1 = self._parse_time(t1_str)
        t2 = self._parse_time(t2_str)
        if not t1 or not t2:
            return 999999
        return abs((t2 - t1).total_seconds() / 60)

    def _score_version(self, row: Dict) -> Tuple[int, str]:
        text = f"{row.get('_source_file', '')} {row.get('version', '')}"
        score = 0
        label = '普通版'
        text_lower = text.lower()
        for kw in self.temp_keywords:
            if kw.lower() in text_lower:
                score = 50
                label = '临时修改版'
                break
        if score == 0:
            for kw in self.version_keywords:
                if kw.lower() in text_lower:
                    score += 30
                    label = '新版'
            for kw in self.old_keywords:
                if kw.lower() in text_lower:
                    score -= 20
                    label = '旧版'
        return score, label

    def classify_rows(self, rows: List[Dict]) -> Dict[str, List[Dict]]:
        for row in rows:
            score, label = self._score_version(row)
            row['_version_score'] = score
            row['_version_label'] = label
        return rows

    def group_duplicates(self, rows: List[Dict], alias_resolver: AliasResolver) -> Dict[str, List[Dict]]:
        coarse_groups = defaultdict(list)
        for row in rows:
            if not row['_is_valid']:
                continue
            key_parts = [
                alias_resolver.resolve(row.get('song_name', '')),
                str(row.get('theater', '')).strip()
            ]
            key = '|'.join(key_parts)
            coarse_groups[key].append(row)

        final_groups = {}
        for coarse_key, group_rows in coarse_groups.items():
            if len(group_rows) < 2:
                continue
            subgroup_id = 0
            row_to_subgroup = {}
            subgroup_rows = defaultdict(list)

            for i, r1 in enumerate(group_rows):
                if i in row_to_subgroup:
                    continue
                current_sg = subgroup_id
                row_to_subgroup[i] = current_sg
                subgroup_rows[current_sg].append(r1)

                for j in range(i + 1, len(group_rows)):
                    if j in row_to_subgroup:
                        continue
                    r2 = group_rows[j]
                    time_diff = self._time_diff_minutes(
                        r1.get('performance_time', ''),
                        r2.get('performance_time', '')
                    )
                    if time_diff <= self.time_tolerance_minutes:
                        row_to_subgroup[j] = current_sg
                        subgroup_rows[current_sg].append(r2)

                subgroup_id += 1

            for sg_id, sg_rows in subgroup_rows.items():
                if len(sg_rows) >= 2:
                    times = sorted([r.get('performance_time', '') for r in sg_rows])
                    final_key = f"{coarse_key}|times_{times[0]}_to_{times[-1]}"
                    final_groups[final_key] = sg_rows

        return final_groups

    def get_version_advice(self, group: List[Dict]) -> Dict:
        sorted_group = sorted(group, key=lambda r: r.get('_version_score', 0), reverse=True)
        best = sorted_group[0]
        older = sorted_group[1:]

        time_set = set(r.get('performance_time', '') for r in group)
        has_time_diff = len(time_set) > 1

        time_diff_details = []
        best_time = best.get('performance_time', '')
        for r in older:
            r_time = r.get('performance_time', '')
            diff = self._time_diff_minutes(best_time, r_time)
            if diff <= 60:
                time_diff_details.append(f"{r.get('song_name', '')}({r_time}) 与推荐版差 {diff:.0f} 分钟")
            else:
                time_diff_details.append(f"{r.get('song_name', '')}({r_time}) 与推荐版差 {diff/60:.1f} 小时")

        if has_time_diff:
            advice = (f"检测到同一曲目存在{len(time_set)}个不同排期（时间差在{self.time_tolerance_minutes}分钟内），"
                      f"建议采用 [{best.get('_version_label', '')}] {best.get('_source_file', '')} "
                      f"第{best.get('_line_number', '?')}行(时间: {best_time})，"
                      f"其余{len(older)}条为旧版/临时版【请勿直接覆盖】，"
                      f"请先核对排期差异后再处理。排期差异: {'; '.join(time_diff_details)}")
        else:
            advice = (f"检测到{len(group)}条完全重复排期，"
                      f"建议采用 [{best.get('_version_label', '')}] {best.get('_source_file', '')} "
                      f"第{best.get('_line_number', '?')}行，其余{len(older)}条为旧版/临时版，请核对后再处理")

        return {
            'recommended_row': best,
            'older_versions': older,
            'advice': advice,
            'has_time_difference': has_time_diff,
            'distinct_times': sorted(list(time_set)),
            'time_diff_details': time_diff_details,
            'version_sources': [
                {
                    'source': r.get('_source_file', ''),
                    'line': r.get('_line_number', ''),
                    'label': r.get('_version_label', ''),
                    'score': r.get('_version_score', 0),
                    'status': r.get('status', ''),
                    'song_name': r.get('song_name', ''),
                    'performance_time': r.get('performance_time', ''),
                    'theater': r.get('theater', '')
                }
                for r in sorted_group
            ]
        }


class ConflictDetector:
    def __init__(self, base_dir: str):
        self.alias_resolver = AliasResolver(base_dir)
        self.version_manager = VersionManager()

    def _parse_time(self, time_str: str) -> datetime:
        if not time_str:
            return None
        for fmt in ['%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M']:
            try:
                return datetime.strptime(time_str.strip(), fmt)
            except ValueError:
                continue
        return None

    def detect_schedule_conflicts(self, rows: List[Dict]) -> List[Dict]:
        conflicts = []
        theater_groups = defaultdict(list)
        for row in rows:
            if not row['_is_valid']:
                continue
            theater = str(row.get('theater', '')).strip()
            theater_groups[theater].append(row)

        for theater, theater_rows in theater_groups.items():
            valid_rows = []
            for r in theater_rows:
                t = self._parse_time(r.get('performance_time', ''))
                if t:
                    valid_rows.append((t, r))
            valid_rows.sort(key=lambda x: x[0])

            for i in range(len(valid_rows)):
                for j in range(i + 1, len(valid_rows)):
                    t1, r1 = valid_rows[i]
                    t2, r2 = valid_rows[j]
                    time_diff = (t2 - t1).total_seconds() / 60
                    if time_diff < 10:
                        conflicts.append({
                            'type': '排期时间冲突',
                            'theater': theater,
                            'time_diff_minutes': time_diff,
                            'row1': {
                                'song_name': r1.get('song_name', ''),
                                'canonical_name': self.alias_resolver.resolve(r1.get('song_name', '')),
                                'performance_time': r1.get('performance_time', ''),
                                'source': r1.get('_source_file', ''),
                                'line': r1.get('_line_number', '')
                            },
                            'row2': {
                                'song_name': r2.get('song_name', ''),
                                'canonical_name': self.alias_resolver.resolve(r2.get('song_name', '')),
                                'performance_time': r2.get('performance_time', ''),
                                'source': r2.get('_source_file', ''),
                                'line': r2.get('_line_number', '')
                            },
                            'description': f"同一剧场[{theater}]，两首曲间隔仅{time_diff:.0f}分钟（<10分钟）"
                        })
        return conflicts

    def detect_alias_duplicates(self, rows: List[Dict]) -> List[Dict]:
        duplicates = []
        time_groups = defaultdict(list)
        for row in rows:
            if not row['_is_valid']:
                continue
            time_key = str(row.get('performance_time', '')).strip()
            theater = str(row.get('theater', '')).strip()
            time_groups[f"{time_key}|{theater}"].append(row)

        for key, group_rows in time_groups.items():
            name_map = defaultdict(list)
            for r in group_rows:
                canonical = self.alias_resolver.resolve(r.get('song_name', ''))
                if canonical:
                    name_map[canonical].append(r)
            for canonical, matched_rows in name_map.items():
                if len(matched_rows) >= 2:
                    original_names = [r.get('song_name', '') for r in matched_rows]
                    has_alias = len(set(n.strip().lower() for n in original_names)) > 1
                    duplicates.append({
                        'type': '曲名别名重复' if has_alias else '同曲名重复排期',
                        'canonical_name': canonical,
                        'original_names': original_names,
                        'performance_time': matched_rows[0].get('performance_time', ''),
                        'theater': matched_rows[0].get('theater', ''),
                        'rows': [
                            {
                                'song_name': r.get('song_name', ''),
                                'source': r.get('_source_file', ''),
                                'line': r.get('_line_number', ''),
                                'performer': r.get('performer', '')
                            }
                            for r in matched_rows
                        ],
                        'description': f"检测到{len(matched_rows)}条记录指向同一曲目[{canonical}]，原曲名分别为：{'、'.join(original_names)}"
                    })
        return duplicates

    def detect_version_conflicts(self, rows: List[Dict]) -> List[Dict]:
        conflicts = []
        self.version_manager.classify_rows(rows)
        groups = self.version_manager.group_duplicates(rows, self.alias_resolver)
        for key, group in groups.items():
            advice = self.version_manager.get_version_advice(group)
            canonical = self.alias_resolver.resolve(group[0].get('song_name', ''))

            conflict_type = '多版本冲突(排期有差异)' if advice['has_time_difference'] else '多版本冲突(完全重复)'

            conflicts.append({
                'type': conflict_type,
                'canonical_name': canonical,
                'key': key,
                'row_count': len(group),
                'distinct_time_count': len(advice['distinct_times']),
                'distinct_times': advice['distinct_times'],
                'theater': group[0].get('theater', ''),
                'recommended_source': advice['recommended_row'].get('_source_file', ''),
                'recommended_line': advice['recommended_row'].get('_line_number', ''),
                'recommended_label': advice['recommended_row'].get('_version_label', ''),
                'recommended_time': advice['recommended_row'].get('performance_time', ''),
                'advice': advice['advice'],
                'time_diff_details': advice['time_diff_details'],
                'version_sources': advice['version_sources'],
                'older_sources': [
                    f"{v['source']}第{v['line']}行({v['label']}, {v['performance_time']})"
                    for v in advice['version_sources'][1:]
                ]
            })
        return conflicts

    def detect_all(self, rows: List[Dict]) -> Dict:
        return {
            'schedule_conflicts': self.detect_schedule_conflicts(rows),
            'alias_duplicates': self.detect_alias_duplicates(rows),
            'version_conflicts': self.detect_version_conflicts(rows)
        }
