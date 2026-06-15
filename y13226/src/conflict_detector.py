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
        groups = defaultdict(list)
        for row in rows:
            if not row['_is_valid']:
                continue
            key_parts = [
                alias_resolver.resolve(row.get('song_name', '')),
                str(row.get('performance_time', '')).strip(),
                str(row.get('theater', '')).strip()
            ]
            key = '|'.join(key_parts)
            groups[key].append(row)
        return {k: v for k, v in groups.items() if len(v) > 1}

    def get_version_advice(self, group: List[Dict]) -> Dict:
        sorted_group = sorted(group, key=lambda r: r.get('_version_score', 0), reverse=True)
        best = sorted_group[0]
        older = sorted_group[1:]
        return {
            'recommended_row': best,
            'older_versions': older,
            'advice': f"建议采用 [{best.get('_version_label', '')}] {best.get('_source_file', '')} 第{best.get('_line_number', '?')}行，其余{len(older)}条为旧版/临时版，请核对后再处理",
            'version_sources': [
                {
                    'source': r.get('_source_file', ''),
                    'line': r.get('_line_number', ''),
                    'label': r.get('_version_label', ''),
                    'score': r.get('_version_score', 0),
                    'status': r.get('status', '')
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
            conflicts.append({
                'type': '多版本冲突',
                'key': key,
                'row_count': len(group),
                'recommended_source': advice['recommended_row'].get('_source_file', ''),
                'recommended_line': advice['recommended_row'].get('_line_number', ''),
                'recommended_label': advice['recommended_row'].get('_version_label', ''),
                'advice': advice['advice'],
                'version_sources': advice['version_sources'],
                'older_sources': [
                    f"{v['source']}第{v['line']}行({v['label']})"
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
