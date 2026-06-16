import csv
import os
import json
from collections import defaultdict
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')


def load_csv(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


class ReplayEngine:
    def __init__(self):
        self.split_list = load_csv('split_list.csv')
        self.eval_questions = load_csv('eval_questions.csv')
        self.human_feedback = load_csv('human_feedback.csv')
        self.tool_calls = load_csv('tool_call_failures.csv')
        self.run_history = []
        self.supplements = []
        self.manual_confirms = []
        self._build_indexes()

    def _build_indexes(self):
        self.material_by_id = {m['材料编号']: m for m in self.split_list}
        self.question_by_id = {q['题目ID']: q for q in self.eval_questions}
        self.feedback_by_qid = defaultdict(list)
        for fb in self.human_feedback:
            self.feedback_by_qid[fb['题目ID']].append(fb)
        self.calls_by_qid = defaultdict(list)
        for call in self.tool_calls:
            self.calls_by_qid[call['题目ID']].append(call)
        self.runs = defaultdict(list)
        for call in self.tool_calls:
            self.runs[call['运行批次']].append(call)

    def get_run_batches(self):
        batches = sorted(self.runs.keys())
        result = []
        for batch in batches:
            calls = self.runs[batch]
            versions = set(c['版本号'] for c in calls)
            result.append({
                'batch_id': batch,
                'version': ','.join(sorted(versions)),
                'total_calls': len(calls),
                'success_count': sum(1 for c in calls if c['状态'] == '成功'),
                'fail_count': sum(1 for c in calls if c['状态'] == '失败'),
                'blocked_count': sum(1 for c in calls if c['状态'] == '拦截'),
                'lost_count': sum(1 for c in calls if c['状态'] == '丢失'),
                'call_time': calls[0]['调用时间'] if calls else ''
            })
        return result

    def run_replay(self, batch_id=None, question_ids=None):
        if batch_id and batch_id in self.runs:
            base_calls = self.runs[batch_id]
        elif question_ids:
            base_calls = []
            for qid in question_ids:
                base_calls.extend(self.calls_by_qid.get(qid, []))
        else:
            latest = sorted(self.runs.keys())[-1]
            base_calls = self.runs[latest]

        new_batch_id = f"RUN-{len(self.runs) + 1:03d}"
        new_calls = []
        for idx, call in enumerate(base_calls):
            qid = call['题目ID']
            question = self.question_by_id.get(qid, {})
            material_id = question.get('关联材料', '')
            material = self.material_by_id.get(material_id, {})

            status, error_msg = self._simulate_call(call, question, material)

            new_call = {
                '调用ID': f"CALL-{len(self.tool_calls) + idx + 1:04d}",
                '题目ID': qid,
                '工具名称': call['工具名称'],
                '调用时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                '失败类型': '' if status == '成功' else call['失败类型'],
                '错误信息': '' if status == '成功' else error_msg,
                '重试次数': str(int(call.get('重试次数', 0)) + 1),
                '状态': status,
                '运行批次': new_batch_id,
                '版本号': call['版本号']
            }
            new_calls.append(new_call)

        self.tool_calls.extend(new_calls)
        self.runs[new_batch_id] = new_calls
        self.run_history.append({
            'batch_id': new_batch_id,
            'type': 'replay',
            'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'based_on': batch_id or 'latest'
        })
        return new_batch_id, new_calls

    def _simulate_call(self, original_call, question, material):
        qid = original_call['题目ID']
        feedback_list = self.feedback_by_qid.get(qid, [])
        is_supplemented = any(fb['处理状态'] == '已处理' and '补录' in fb['反馈内容'] for fb in feedback_list)
        is_confirmed = any(fb['处理状态'] == '已处理' and '人工' in fb.get('备注', '') for fb in feedback_list)
        is_safety_adjusted = any(fb['反馈类型'] == '安全拦截' and fb['处理状态'] == '已处理' for fb in feedback_list)

        if original_call['状态'] == '成功':
            return '成功', ''

        if original_call['状态'] == '拦截':
            if is_safety_adjusted:
                return '成功', '安全策略调整后放行'
            else:
                return '拦截', original_call['错误信息']

        if original_call['状态'] == '丢失':
            return '丢失', original_call['错误信息']

        fail_type = original_call['失败类型']
        if fail_type == '参数错误':
            if is_supplemented or material.get('补录标记') == '是':
                return '成功', '补录字段后正常'
            return '失败', original_call['错误信息']
        elif fail_type == '格式错误':
            if is_supplemented or '旧表' in question.get('备注', ''):
                return '成功', '格式统一后正常'
            return '失败', original_call['错误信息']
        elif fail_type == '匹配失败':
            if is_confirmed or is_supplemented:
                return '成功', '人工确认后匹配成功'
            return '失败', original_call['错误信息']
        elif fail_type == '超时':
            if int(original_call.get('重试次数', 0)) >= 2:
                return '失败', '重试多次仍超时'
            return '失败', original_call['错误信息']
        else:
            return '失败', original_call['错误信息']

    def add_supplement(self, question_id, field_name, field_value, operator):
        if question_id in self.question_by_id:
            question = self.question_by_id[question_id]
            old_value = question.get(field_name, '')
            question[field_name] = field_value
            self.supplements.append({
                'question_id': question_id,
                'field': field_name,
                'old_value': old_value,
                'new_value': field_value,
                'operator': operator,
                'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
            return True
        return False

    def add_manual_confirm(self, question_id, result, comment, operator):
        if question_id in self.question_by_id:
            self.manual_confirms.append({
                'question_id': question_id,
                'result': result,
                'comment': comment,
                'operator': operator,
                'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
            feedback = {
                '题目ID': question_id,
                '反馈人': operator,
                '反馈类型': '人工确认',
                '反馈内容': comment,
                '处理状态': '已处理' if result == '通过' else '待处理',
                '反馈日期': datetime.now().strftime('%Y-%m-%d'),
                '备注': f"人工确认：{result}"
            }
            self.human_feedback.append(feedback)
            self.feedback_by_qid[question_id].append(feedback)
            return True
        return False

    def get_statistics(self, batch_id=None):
        if batch_id:
            calls = self.runs.get(batch_id, [])
        else:
            calls = self.tool_calls

        total = len(calls)
        success = sum(1 for c in calls if c['状态'] == '成功')
        fail = sum(1 for c in calls if c['状态'] == '失败')
        blocked = sum(1 for c in calls if c['状态'] == '拦截')
        lost = sum(1 for c in calls if c['状态'] == '丢失')

        fail_by_type = defaultdict(int)
        for c in calls:
            if c['状态'] == '失败':
                fail_by_type[c['失败类型']] += 1

        by_material = defaultdict(lambda: {'total': 0, 'success': 0, 'fail': 0, 'blocked': 0, 'lost': 0})
        for c in calls:
            qid = c['题目ID']
            q = self.question_by_id.get(qid, {})
            mid = q.get('关联材料', '未知')
            mname = self.material_by_id.get(mid, {}).get('材料名称', mid)
            by_material[mname]['total'] += 1
            if c['状态'] == '成功':
                by_material[mname]['success'] += 1
            elif c['状态'] == '失败':
                by_material[mname]['fail'] += 1
            elif c['状态'] == '拦截':
                by_material[mname]['blocked'] += 1
            elif c['状态'] == '丢失':
                by_material[mname]['lost'] += 1

        by_unit = defaultdict(int)
        for c in calls:
            qid = c['题目ID']
            q = self.question_by_id.get(qid, {})
            unit = q.get('单位', '未填写') or '未填写'
            by_unit[unit] += 1

        return {
            'summary': {
                'total': total,
                'success': success,
                'fail': fail,
                'blocked': blocked,
                'lost': lost,
                'success_rate': round(success / total * 100, 2) if total > 0 else 0
            },
            'fail_by_type': dict(fail_by_type),
            'by_material': dict(by_material),
            'by_unit': dict(by_unit)
        }

    def compare_batches(self, batch1, batch2):
        stats1 = self.get_statistics(batch1)
        stats2 = self.get_statistics(batch2)

        diff = {
            'total_diff': stats2['summary']['total'] - stats1['summary']['total'],
            'success_diff': stats2['summary']['success'] - stats1['summary']['success'],
            'fail_diff': stats2['summary']['fail'] - stats1['summary']['fail'],
            'blocked_diff': stats2['summary']['blocked'] - stats1['summary']['blocked'],
            'lost_diff': stats2['summary']['lost'] - stats1['summary']['lost'],
            'success_rate_diff': round(
                stats2['summary']['success_rate'] - stats1['summary']['success_rate'], 2
            )
        }
        return {
            'batch1': stats1,
            'batch2': stats2,
            'diff': diff
        }

    def find_lost_records(self):
        all_qids = set(self.question_by_id.keys())
        latest_batch = sorted(self.runs.keys())[-1]
        latest_qids = set(c['题目ID'] for c in self.runs[latest_batch])
        lost_qids = all_qids - latest_qids

        result = []
        for qid in lost_qids:
            q = self.question_by_id[qid]
            mid = q.get('关联材料', '')
            m = self.material_by_id.get(mid, {})
            result.append({
                'question_id': qid,
                'question_text': q.get('题干', ''),
                'material_id': mid,
                'material_name': m.get('材料名称', '未知'),
                'batch': m.get('切分批次', ''),
                'remark': m.get('备注', '')
            })
        return result

    def get_failure_details(self, batch_id=None):
        if batch_id:
            calls = self.runs.get(batch_id, [])
        else:
            calls = self.tool_calls

        details = []
        for call in calls:
            qid = call['题目ID']
            q = self.question_by_id.get(qid, {})
            mid = q.get('关联材料', '')
            m = self.material_by_id.get(mid, {})
            feedbacks = self.feedback_by_qid.get(qid, [])
            details.append({
                'call_id': call['调用ID'],
                'question_id': qid,
                'question_text': q.get('题干', ''),
                'tool_name': call['工具名称'],
                'status': call['状态'],
                'fail_type': call.get('失败类型', ''),
                'error_msg': call.get('错误信息', ''),
                'material_id': mid,
                'material_name': m.get('材料名称', ''),
                'unit': q.get('单位', ''),
                'batch': call['运行批次'],
                'version': call['版本号'],
                'retry_count': call.get('重试次数', 0),
                'has_feedback': len(feedbacks) > 0,
                'feedback_count': len(feedbacks),
                'is_supplement': '补录' in q.get('备注', '') or '补录' in m.get('备注', ''),
                'is_old_table': '旧表' in q.get('备注', '') or '旧表' in m.get('备注', ''),
                'is_missing_unit': not q.get('单位', '')
            })
        return details

    def export_report(self, batch_id=None, format='csv'):
        details = self.get_failure_details(batch_id)
        stats = self.get_statistics(batch_id)
        lost = self.find_lost_records()

        if batch_id:
            filename = f'report_{batch_id}.{format}'
        else:
            filename = f'report_full.{format}'

        filepath = os.path.join(BASE_DIR, 'static', filename)

        if format == 'json':
            report = {
                'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'batch_id': batch_id or 'all',
                'statistics': stats,
                'details': details,
                'lost_records': lost
            }
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)

        return filename, filepath


if __name__ == '__main__':
    engine = ReplayEngine()
    print("批次列表:")
    for batch in engine.get_run_batches():
        print(f"  {batch['batch_id']} - 总数:{batch['total_calls']} 成功:{batch['success_count']} 失败:{batch['fail_count']}")

    print("\n统计概览:")
    stats = engine.get_statistics()
    print(f"  总数: {stats['summary']['total']}")
    print(f"  成功率: {stats['summary']['success_rate']}%")

    print("\n丢失记录:")
    for record in engine.find_lost_records():
        print(f"  {record['question_id']} - 卡在材料: {record['material_name']}")
