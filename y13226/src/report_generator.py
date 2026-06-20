import os
import json
from datetime import datetime
from typing import List, Dict, Any
from collections import Counter


class ReportGenerator:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        paths_path = os.path.join(base_dir, 'config', 'paths.json')
        with open(paths_path, 'r', encoding='utf-8') as f:
            self.paths = json.load(f)
        self._ensure_dirs()

    def _ensure_dirs(self):
        output_dir = os.path.join(self.base_dir, self.paths['output_dir'])
        screenshot_dir = os.path.join(self.base_dir, self.paths['screenshot_dir'])
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(screenshot_dir, exist_ok=True)

    def _build_filters(self, all_rows: List[Dict]) -> Dict:
        theaters = sorted(set(str(r.get('theater', '')) for r in all_rows if r.get('theater')))
        versions = sorted(set(str(r.get('version', '')) for r in all_rows if r.get('version')))
        sources = sorted(set(str(r.get('_source_file', '')) for r in all_rows if r.get('_source_file')))
        statuses = sorted(set(str(r.get('status', '')) for r in all_rows if r.get('status')))
        return {
            'available_theaters': theaters,
            'available_versions': versions,
            'available_sources': sources,
            'available_statuses': statuses,
            'default_filter': {
                'theater': '全部',
                'version': '全部',
                'source': '全部',
                'status': '全部',
                'include_invalid': False
            }
        }

    def _build_statistics(self, all_rows: List[Dict], conflicts: Dict,
                           linjie_modifications: List[Dict]) -> Dict:
        valid_rows = [r for r in all_rows if r.get('_is_valid')]
        invalid_rows = [r for r in all_rows if not r.get('_is_valid')]

        schedule_conflicts = conflicts.get('schedule_conflicts', [])
        alias_duplicates = conflicts.get('alias_duplicates', [])
        version_conflicts = conflicts.get('version_conflicts', [])

        source_counter = Counter(r.get('_source_file', '未知') for r in valid_rows)
        theater_counter = Counter(r.get('theater', '未知') for r in valid_rows)

        return {
            'total_files': len(set(r.get('_source_file', '') for r in all_rows)),
            'total_rows': len(all_rows),
            'valid_rows': len(valid_rows),
            'invalid_rows': len(invalid_rows),
            'schedule_conflict_count': len(schedule_conflicts),
            'alias_duplicate_count': len(alias_duplicates),
            'version_conflict_count': len(version_conflicts),
            'total_conflicts': len(schedule_conflicts) + len(alias_duplicates) + len(version_conflicts),
            'linjie_modification_count': len(linjie_modifications),
            'rows_by_source': dict(source_counter),
            'rows_by_theater': dict(theater_counter)
        }

    def _build_detail_table(self, all_rows: List[Dict], conflicts: Dict) -> List[Dict]:
        detail_rows = []
        conflict_index = {}

        for c in conflicts.get('schedule_conflicts', []):
            key1 = f"{c['row1']['source']}|{c['row1']['line']}"
            key2 = f"{c['row2']['source']}|{c['row2']['line']}"
            conflict_index[key1] = conflict_index.get(key1, []) + ['排期时间冲突']
            conflict_index[key2] = conflict_index.get(key2, []) + ['排期时间冲突']

        for c in conflicts.get('alias_duplicates', []):
            for r in c['rows']:
                key = f"{r['source']}|{r['line']}"
                conflict_index[key] = conflict_index.get(key, []) + ['曲名别名重复']

        for c in conflicts.get('version_conflicts', []):
            for vs in c['version_sources']:
                key = f"{vs['source']}|{vs['line']}"
                conflict_index[key] = conflict_index.get(key, []) + ['多版本冲突']

        for row in all_rows:
            key = f"{row.get('_source_file', '')}|{row.get('_line_number', '')}"
            detail_rows.append({
                'row_id': row.get('_row_id', ''),
                'song_name': row.get('song_name', ''),
                'canonical_name': row.get('_canonical_name', row.get('song_name', '')),
                'performance_time': row.get('performance_time', ''),
                'theater': row.get('theater', ''),
                'performance_order': row.get('performance_order', ''),
                'performer': row.get('performer', ''),
                'duration': row.get('duration', ''),
                'version': row.get('version', ''),
                'source_file': row.get('_source_file', ''),
                'line_number': row.get('_line_number', ''),
                'source_field': row.get('source', ''),
                'status': row.get('status', ''),
                'version_label': row.get('_version_label', ''),
                'is_valid': row.get('_is_valid', True),
                'missing_fields': row.get('_missing_fields', []),
                'conflict_tags': conflict_index.get(key, []),
                'has_conflict': len(conflict_index.get(key, [])) > 0
            })
        return detail_rows

    def _build_screenshot_instructions(self, stats: Dict) -> List[Dict]:
        return [
            {
                'id': 'overview',
                'title': '总体统计概览',
                'description': f'共处理{stats["total_files"]}个文件，{stats["total_rows"]}行数据；检测到{stats["total_conflicts"]}个冲突（排期{stats["schedule_conflict_count"]}、别名{stats["alias_duplicate_count"]}、版本{stats["version_conflict_count"]}），林姐临时修改{stats["linjie_modification_count"]}条',
                'capture_region': '页面顶部统计卡片区域',
                'priority': 'high'
            },
            {
                'id': 'schedule_conflicts',
                'title': '排期时间冲突明细表',
                'description': f'共{stats["schedule_conflict_count"]}条排期时间冲突，按剧场分组展示，间隔小于10分钟',
                'capture_region': '排期冲突表格全部内容',
                'priority': 'high'
            },
            {
                'id': 'alias_duplicates',
                'title': '曲名别名重复明细表',
                'description': f'共{stats["alias_duplicate_count"]}条曲名别名重复，同一时段同一剧场出现同曲异名',
                'capture_region': '别名重复表格全部内容',
                'priority': 'high'
            },
            {
                'id': 'version_conflicts',
                'title': '多版本冲突与处理建议',
                'description': f'共{stats["version_conflict_count"]}条多版本冲突，已标注推荐版本与旧版来源，请勿直接覆盖新版',
                'capture_region': '版本冲突表格及处理建议列',
                'priority': 'high'
            },
            {
                'id': 'linjie_modifications',
                'title': '林姐临时修改清单（勿覆盖）',
                'description': f'共{stats["linjie_modification_count"]}条林姐临时调整，已进入历史记录，下一班值班请重点核对',
                'capture_region': '林姐修改专用表格',
                'priority': 'high'
            }
        ]

    def generate_unified_result(self, all_rows: List[Dict], conflicts: Dict,
                                 linjie_modifications: List[Dict],
                                 file_summaries: List[Dict]) -> Dict:
        for row in all_rows:
            if not row.get('_canonical_name'):
                from src.conflict_detector import AliasResolver
                resolver = AliasResolver(self.base_dir)
                row['_canonical_name'] = resolver.resolve(row.get('song_name', ''))

        result = {
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'run_id': datetime.now().strftime('%Y%m%d_%H%M%S'),
            'filters': self._build_filters(all_rows),
            'statistics': self._build_statistics(all_rows, conflicts, linjie_modifications),
            'file_summaries': file_summaries,
            'detail_table': self._build_detail_table(all_rows, conflicts),
            'schedule_conflicts': conflicts.get('schedule_conflicts', []),
            'alias_duplicates': conflicts.get('alias_duplicates', []),
            'version_conflicts': conflicts.get('version_conflicts', []),
            'linjie_modifications': linjie_modifications,
            'screenshot_instructions': self._build_screenshot_instructions(
                self._build_statistics(all_rows, conflicts, linjie_modifications)
            )
        }
        return result

    def save_json(self, result: Dict) -> str:
        try:
            output_path = os.path.join(self.base_dir, self.paths['latest_result'])
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"[保存] 最新结果已写入: {output_path}")
            return output_path
        except Exception as e:
            print(f"[错误] 保存JSON失败: {e}")
            raise

    def save_timestamped_json(self, result: Dict) -> str:
        try:
            output_dir = os.path.join(self.base_dir, self.paths['output_dir'])
            os.makedirs(output_dir, exist_ok=True)
            filename = f"conflict_result_{result['run_id']}.json"
            output_path = os.path.join(output_dir, filename)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"[保存] 归档结果已写入: {output_path}")
            return output_path
        except Exception as e:
            print(f"[错误] 保存归档JSON失败: {e}")
            raise

    def generate_text_report(self, result: Dict) -> str:
        lines = []
        lines.append('=' * 70)
        lines.append('剧场返场曲排期冲突检测报告')
        lines.append(f"生成时间: {result['generated_at']}")
        lines.append('=' * 70)
        s = result['statistics']
        lines.append('')
        lines.append('【统计数字】')
        lines.append(f"  处理文件数: {s['total_files']}")
        lines.append(f"  总行数: {s['total_rows']} (有效{s['valid_rows']} / 无效{s['invalid_rows']})")
        lines.append(f"  冲突总数: {s['total_conflicts']}")
        lines.append(f"    - 排期时间冲突: {s['schedule_conflict_count']}")
        lines.append(f"    - 曲名别名重复: {s['alias_duplicate_count']}")
        lines.append(f"    - 多版本冲突: {s['version_conflict_count']}")
        lines.append(f"  林姐临时修改: {s['linjie_modification_count']} 条")
        lines.append('')
        lines.append('【文件来源统计】')
        for src, cnt in s['rows_by_source'].items():
            lines.append(f"  {src}: {cnt} 行")
        lines.append('')
        lines.append('【筛选条件】')
        f = result['filters']
        lines.append(f"  可选剧场: {', '.join(f['available_theaters'])}")
        lines.append(f"  可选版本: {', '.join(f['available_versions'])}")
        lines.append(f"  可选状态: {', '.join(f['available_statuses'])}")
        lines.append('')

        lines.append('【排期时间冲突明细】')
        if result['schedule_conflicts']:
            for i, c in enumerate(result['schedule_conflicts'], 1):
                lines.append(f"  #{i} {c['description']}")
                lines.append(f"    {c['row1']['song_name']} ({c['row1']['performance_time']}) "
                             f"来源: {c['row1']['source']}第{c['row1']['line']}行")
                lines.append(f"    {c['row2']['song_name']} ({c['row2']['performance_time']}) "
                             f"来源: {c['row2']['source']}第{c['row2']['line']}行")
        else:
            lines.append('  无')
        lines.append('')

        lines.append('【曲名别名重复明细】')
        if result['alias_duplicates']:
            for i, c in enumerate(result['alias_duplicates'], 1):
                lines.append(f"  #{i} {c['description']}")
                lines.append(f"    标准名: {c['canonical_name']}")
                lines.append(f"    时间: {c['performance_time']}  剧场: {c['theater']}")
                for r in c['rows']:
                    lines.append(f"    - {r['song_name']} (来源: {r['source']}第{r['line']}行, 表演者: {r['performer']})")
        else:
            lines.append('  无')
        lines.append('')

        lines.append('【多版本冲突与处理建议】')
        if result['version_conflicts']:
            for i, c in enumerate(result['version_conflicts'], 1):
                lines.append(f"  #{i} {c['advice']}")
                lines.append(f"    推荐采用: {c['recommended_source']}第{c['recommended_line']}行 ({c['recommended_label']})")
                for vs in c['version_sources']:
                    lines.append(f"    - {vs['source']}第{vs['line']}行 [版本标签: {vs['label']}, 分数: {vs['score']}, 状态: {vs['status']}]")
        else:
            lines.append('  无')
        lines.append('')

        lines.append('【林姐临时修改清单（请务必核对，勿被旧版覆盖）】')
        if result['linjie_modifications']:
            for i, m in enumerate(result['linjie_modifications'], 1):
                lines.append(f"  #{i} {m['song_name']} @ {m['performance_time']} {m['theater']}")
                lines.append(f"    来源: {m['source_file']}第{m['line_number']}行")
                lines.append(f"    版本: {m['version']}  状态: {m['status']}")
                lines.append(f"    备注: {m['note']}")
        else:
            lines.append('  无')
        lines.append('')

        lines.append('【截图说明】')
        for item in result['screenshot_instructions']:
            lines.append(f"  [{item['priority'].upper()}] {item['title']}")
            lines.append(f"    描述: {item['description']}")
            lines.append(f"    截图区域: {item['capture_region']}")
        lines.append('')
        lines.append('=' * 70)
        return '\n'.join(lines)

    def save_text_report(self, result: Dict) -> str:
        output_dir = os.path.join(self.base_dir, self.paths['output_dir'])
        filename = f"conflict_report_{result['run_id']}.txt"
        output_path = os.path.join(output_dir, filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(self.generate_text_report(result))
        return output_path
