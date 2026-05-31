#!/usr/bin/env python3
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple


def load_data(data_path: str) -> Dict[str, Any]:
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def calculate_absence_score(attendance: List[Dict], days_window: int = 30) -> Tuple[float, List[str]]:
    if not attendance:
        return 50.0, ["缺少上课记录"]
    
    cutoff_date = datetime.now() - timedelta(days=days_window)
    recent = [a for a in attendance if datetime.strptime(a['lessonDate'], '%Y-%m-%d') >= cutoff_date]
    
    if not recent:
        return 30.0, ["近期无上课记录"]
    
    total = len(recent)
    absent_count = sum(1 for a in recent if a['status'] == 'absent')
    late_count = sum(1 for a in recent if a['status'] == 'late')
    unknown_absent = sum(1 for a in recent if a['status'] == 'absent' and not a.get('absentReason'))
    
    absence_rate = absent_count / total
    late_rate = late_count / total
    unknown_rate = unknown_absent / max(absent_count, 1)
    
    score = 0.0
    attribution = []
    
    if absence_rate > 0.3:
        score += 40
        attribution.append(f"缺课率{absence_rate*100:.0f}%，超过30%阈值")
    elif absence_rate > 0.15:
        score += 25
        attribution.append(f"缺课率{absence_rate*100:.0f}%，需要关注")
    elif absence_rate > 0:
        score += 10 * absence_rate / 0.15
        attribution.append(f"有缺课记录")
    
    if late_rate > 0.2:
        score += 15
        attribution.append(f"迟到率{late_rate*100:.0f}%")
    
    if unknown_rate > 0.5:
        score += 20
        attribution.append(f"{unknown_absent}次缺课未补录原因")
    elif unknown_rate > 0:
        score += 10
        attribution.append("存在未补录的缺课记录")
    
    return min(score, 100.0), attribution


def calculate_practice_score(practice: List[Dict], days_window: int = 21) -> Tuple[float, List[str]]:
    if not practice:
        return 40.0, ["缺少练习打卡记录"]
    
    cutoff_date = datetime.now() - timedelta(days=days_window)
    recent = [p for p in practice if datetime.strptime(p['practiceDate'], '%Y-%m-%d') >= cutoff_date]
    
    if not recent:
        return 50.0, ["近3周无练习打卡"]
    
    total_expected = days_window // 3
    actual_count = len(recent)
    completion_rate = min(actual_count / max(total_expected, 1), 1.0)
    
    avg_duration = sum(p['durationMinutes'] for p in recent) / len(recent)
    avg_completion = sum(p['completionRate'] for p in recent) / len(recent)
    late_count = sum(1 for p in recent if p.get('isLate', False))
    
    score = 0.0
    attribution = []
    
    if completion_rate < 0.3:
        score += 45
        attribution.append(f"练习完成率仅{completion_rate*100:.0f}%")
    elif completion_rate < 0.6:
        score += 25
        attribution.append(f"练习完成率{completion_rate*100:.0f}%，低于预期")
    elif completion_rate < 0.8:
        score += 10
        attribution.append(f"练习完成率{completion_rate*100:.0f}%")
    
    if avg_duration < 15:
        score += 15
        attribution.append(f"平均练习时长仅{avg_duration:.0f}分钟")
    
    if avg_completion < 0.5:
        score += 20
        attribution.append(f"练习质量偏低，平均完成度{avg_completion*100:.0f}%")
    elif avg_completion < 0.75:
        score += 8
    
    if late_count > len(recent) * 0.3:
        score += 10
        attribution.append(f"{late_count}次打卡延迟提交")
    
    return min(score, 100.0), attribution


def calculate_feedback_score(feedback: List[Dict], days_window: int = 30) -> Tuple[float, List[str]]:
    if not feedback:
        return 30.0, ["缺少家长反馈记录"]
    
    cutoff_date = datetime.now() - timedelta(days=days_window)
    recent = [f for f in feedback if datetime.strptime(f['feedbackDate'], '%Y-%m-%d') >= cutoff_date]
    
    if not recent:
        return 25.0, ["近1个月无家长反馈"]
    
    avg_sentiment = sum(f['sentimentScore'] for f in recent) / len(recent)
    feedback_count = len(recent)
    duplicate_count = sum(1 for f in recent if f.get('isDuplicate', False))
    
    score = 0.0
    attribution = []
    
    if avg_sentiment < -0.3:
        score += 50
        attribution.append(f"家长反馈负面倾向明显，情感评分{avg_sentiment:.2f}")
    elif avg_sentiment < 0:
        score += 25
        attribution.append(f"家长反馈偏消极，情感评分{avg_sentiment:.2f}")
    elif avg_sentiment < 0.3:
        score += 10
        attribution.append("家长反馈中性")
    
    if feedback_count < 2:
        score += 15
        attribution.append("家长反馈频次低")
    
    if duplicate_count > 0:
        score += 5 * duplicate_count
        attribution.append(f"存在{duplicate_count}条重复反馈")
    
    return min(score, 100.0), attribution


def calculate_lesson_progress_score(student: Dict, attendance: List[Dict]) -> Tuple[float, List[str]]:
    total = student.get('totalLessons', 0)
    remaining = student.get('remainingLessons', 0)
    renewal_date = student.get('renewalDate')
    
    if total == 0:
        return 20.0, ["课程信息不完整"]
    
    progress = 1 - (remaining / total)
    score = 0.0
    attribution = []
    
    if remaining <= 5:
        score += 30
        attribution.append(f"剩余课时不足（{remaining}节）")
    elif remaining <= 10:
        score += 15
        attribution.append(f"剩余课时{remaining}节，接近续费期")
    
    if renewal_date:
        try:
            renewal = datetime.strptime(renewal_date, '%Y-%m-%d')
            days_to_renewal = (renewal - datetime.now()).days
            if days_to_renewal <= 14:
                score += 40
                attribution.append(f"距续费日仅{days_to_renewal}天")
            elif days_to_renewal <= 30:
                score += 20
                attribution.append(f"距续费日{days_to_renewal}天")
        except:
            pass
    
    if progress > 0.8:
        score += 10
        attribution.append(f"课程进度{progress*100:.0f}%，即将结课")
    
    recent_attendance = [a for a in attendance[-10:] if a]
    if len(recent_attendance) >= 5:
        recent_absent = sum(1 for a in recent_attendance if a['status'] == 'absent')
        if recent_absent >= 2:
            score += 15
            attribution.append("近期缺课呈上升趋势")
    
    return min(score, 100.0), attribution


def get_weighted_score(dimensions: Dict[str, float]) -> Tuple[float, List[str]]:
    weights = {
        'absence': 0.30,
        'practice': 0.30,
        'feedback': 0.25,
        'lessonProgress': 0.15
    }
    
    overall = sum(dimensions[k] * weights[k] for k in weights)
    return overall, []


def determine_level(score: float) -> str:
    if score >= 60:
        return 'red'
    elif score >= 35:
        return 'yellow'
    else:
        return 'green'


def generate_conclusion(score: float, level: str, absent_reason: str = None) -> Dict[str, Any]:
    if level == 'green':
        return {
            'conclusion': '状态良好，建议保持沟通',
            'actionItems': [
                '继续保持当前学习节奏',
                '下次续费时提前30天沟通'
            ]
        }
    elif level == 'yellow':
        conclusion = '需要关注，建议主动跟进'
        if absent_reason == 'sick':
            conclusion = '因病缺课，待康复后观察学习状态'
        elif absent_reason == 'leave':
            conclusion = '因事缺课，回归后需加强练习'
        return {
            'conclusion': conclusion,
            'actionItems': [
                '1周内与家长电话沟通1次',
                '重点关注下次上课表现',
                '课后发送个性化练习建议'
            ]
        }
    else:
        conclusion = '高风险，建议立即介入'
        if absent_reason == 'tired':
            conclusion = '厌学情绪明显，需深度沟通了解原因'
        elif absent_reason == 'other' and score >= 80:
            conclusion = '连续缺课原因不明，存在退费风险'
        return {
            'conclusion': conclusion,
            'actionItems': [
                '24小时内联系家长了解情况',
                '安排老师1对1沟通',
                '制定个性化改进方案',
                '课程顾问介入续费沟通'
            ]
        }


def process_student(student: Dict, attendance: List[Dict], practice: List[Dict], feedback: List[Dict], prev_score: Dict = None) -> Dict[str, Any]:
    absence_score, absence_attr = calculate_absence_score(attendance)
    practice_score, practice_attr = calculate_practice_score(practice)
    feedback_score, feedback_attr = calculate_feedback_score(feedback)
    progress_score, progress_attr = calculate_lesson_progress_score(student, attendance)
    
    dimensions = {
        'absence': absence_score,
        'practice': practice_score,
        'feedback': feedback_score,
        'lessonProgress': progress_score
    }
    
    all_attr = absence_attr + practice_attr + feedback_attr + progress_attr
    all_attr.sort(key=lambda x: any(w in x for w in ['超过', '仅', '明显', '连续']), reverse=True)
    
    overall_score, _ = get_weighted_score(dimensions)
    level = determine_level(overall_score)
    
    change_from_prev = None
    if prev_score:
        diff = overall_score - prev_score.get('overallScore', overall_score)
        reasons = []
        if abs(diff) >= 10:
            if absence_score - prev_score['dimensions'].get('absence', 0) >= 10:
                reasons.append('缺课情况恶化')
            elif absence_score - prev_score['dimensions'].get('absence', 0) <= -10:
                reasons.append('缺课情况改善')
            if practice_score - prev_score['dimensions'].get('practice', 0) >= 10:
                reasons.append('练习量下降')
            elif practice_score - prev_score['dimensions'].get('practice', 0) <= -10:
                reasons.append('练习量提升')
            if feedback_score - prev_score['dimensions'].get('feedback', 0) >= 10:
                reasons.append('家长反馈变差')
            elif feedback_score - prev_score['dimensions'].get('feedback', 0) <= -10:
                reasons.append('家长反馈改善')
        change_from_prev = {
            'scoreDiff': round(diff, 1),
            'reasons': reasons
        }
    
    conclusion_data = generate_conclusion(overall_score, level)
    
    return {
        'studentId': student['id'],
        'overallScore': round(overall_score, 1),
        'level': level,
        'dimensions': {k: round(v, 1) for k, v in dimensions.items()},
        'attribution': all_attr[:5],
        'changeFromPrev': change_from_prev,
        'conclusion': conclusion_data['conclusion'],
        'actionItems': conclusion_data['actionItems']
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing data path parameter'}))
        sys.exit(1)
    
    try:
        data = load_data(sys.argv[1])
        results = []
        
        for student_data in data.get('students', []):
            student = student_data['student']
            attendance = student_data.get('attendance', [])
            practice = student_data.get('practice', [])
            feedback = student_data.get('feedback', [])
            prev_score = student_data.get('prevScore')
            
            result = process_student(student, attendance, practice, feedback, prev_score)
            results.append(result)
        
        print(json.dumps({'success': True, 'results': results}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
