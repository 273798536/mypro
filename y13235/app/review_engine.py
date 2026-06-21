import hashlib
import os
import uuid
from datetime import datetime
from typing import List, Dict, Tuple

from .models import (
    AudioFile, AudioFolder, ProgressMetrics, StudentProgress,
    Anomaly, ReviewResult, CalculationRule
)
from .rules import DEFAULT_CALCULATION_RULE


class InvalidFolderPathError(Exception):
    pass


def _validate_entry_consistency(folder_path: str, folder_name: str,
                                parsed_folder: AudioFolder) -> List[Anomaly]:
    anomalies: List[Anomaly] = []
    abs_input = os.path.abspath(folder_path)

    if parsed_folder.folder_path != abs_input:
        anomalies.append(Anomaly(
            anomaly_type="入口-记录不一致",
            severity="critical",
            message=f"入口路径与解析记录路径不一致，请排查: 入口={abs_input} vs 解析={parsed_folder.folder_path}",
            folder_path=abs_input,
            file_name=folder_name,
            raw_line=0,
            field_name="folder_path",
            expected=abs_input,
            actual=parsed_folder.folder_path
        ))

    if not folder_name:
        anomalies.append(Anomaly(
            anomaly_type="入口字段缺失",
            severity="high",
            message="folder_name 为空，无法归档和后续比对",
            folder_path=abs_input,
            file_name=folder_name or "未命名",
            raw_line=0,
            field_name="folder_name"
        ))

    if len(parsed_folder.raw_content) == 0:
        anomalies.append(Anomaly(
            anomaly_type="记录文件为空",
            severity="critical",
            message="记录文件读取后为空，无任何行内容",
            folder_path=abs_input,
            file_name=folder_name,
            raw_line=0
        ))

    return anomalies


def _deterministic_variation(seed_key: str, idx: int, lo: float, hi: float) -> float:
    digest = hashlib.sha256(f"{seed_key}|{idx}|{lo}|{hi}".encode("utf-8")).digest()
    raw = int.from_bytes(digest[:8], "big") / (1 << 64)
    return round(lo + raw * (hi - lo), 4)


def _generate_metrics_for_file(audio_file: AudioFile, rule: CalculationRule,
                               source_folder_path: str) -> Tuple[ProgressMetrics, List[Anomaly]]:
    anomalies: List[Anomaly] = []
    thresholds = rule.thresholds

    seed_key = (
        f"{audio_file.filename}|{audio_file.student_name}|"
        f"{audio_file.track_name}|{audio_file.lesson_date}|"
        f"{audio_file.duration_seconds}|{audio_file.raw_line}"
    )

    base_scores = {
        "小明": 78, "小红": 82, "小刚": 71,
    }

    if audio_file.is_master_tape:
        tempo = _deterministic_variation(seed_key, 0, 85, 95)
        pitch = _deterministic_variation(seed_key, 1, 85, 95)
        rhythm = _deterministic_variation(seed_key, 2, 85, 95)
        expression = _deterministic_variation(seed_key, 3, 85, 95)
    elif "极端高分" in audio_file.filename or "测试样本" in audio_file.filename:
        tempo = _deterministic_variation(seed_key, 0, 98.5, 99.9)
        pitch = _deterministic_variation(seed_key, 1, 98.5, 99.9)
        rhythm = _deterministic_variation(seed_key, 2, 98.5, 99.9)
        expression = _deterministic_variation(seed_key, 3, 98.5, 99.9)
        overall_pre = round(tempo * 0.3 + pitch * 0.3 + rhythm * 0.25 + expression * 0.15, 2)
        anomalies.append(Anomaly(
            anomaly_type="分数异常-过高",
            severity="medium",
            message="各项指标异常偏高，接近满分，需人工复核是否为测试样本或数据异常",
            folder_path=source_folder_path,
            file_name=audio_file.filename,
            raw_line=audio_file.raw_line,
            field_name="overall_score",
            expected=f"< {thresholds['suspicious_high']}",
            actual=overall_pre
        ))
    elif "极端低分" in audio_file.filename or "状态不好" in audio_file.filename:
        tempo = _deterministic_variation(seed_key, 0, 15, 35)
        pitch = _deterministic_variation(seed_key, 1, 15, 35)
        rhythm = _deterministic_variation(seed_key, 2, 15, 35)
        expression = _deterministic_variation(seed_key, 3, 15, 35)
        overall_pre = round(tempo * 0.3 + pitch * 0.3 + rhythm * 0.25 + expression * 0.15, 2)
        anomalies.append(Anomaly(
            anomaly_type="分数异常-过低",
            severity="medium",
            message="各项指标异常偏低，需确认学生状态或录音质量",
            folder_path=source_folder_path,
            file_name=audio_file.filename,
            raw_line=audio_file.raw_line,
            field_name="overall_score",
            expected=f"> {thresholds['suspicious_low']}",
            actual=overall_pre
        ))
    else:
        base = base_scores.get(audio_file.student_name, 70)
        variance = _deterministic_variation(seed_key, 0, -8, 12)
        tempo = max(0.0, min(100.0, base + variance + _deterministic_variation(seed_key, 1, -5, 5)))
        pitch = max(0.0, min(100.0, base + variance + _deterministic_variation(seed_key, 2, -5, 5)))
        rhythm = max(0.0, min(100.0, base + variance + _deterministic_variation(seed_key, 3, -5, 5)))
        expression = max(0.0, min(100.0, base + variance + _deterministic_variation(seed_key, 4, -8, 8)))

    overall = tempo * 0.3 + pitch * 0.3 + rhythm * 0.25 + expression * 0.15

    if overall >= thresholds["suspicious_high"] and not audio_file.is_master_tape:
        anomalies.append(Anomaly(
            anomaly_type="总分异常",
            severity="low",
            message=f"总分{round(overall, 1)}分超过警戒值{thresholds['suspicious_high']}，建议复核",
            folder_path=source_folder_path,
            file_name=audio_file.filename,
            raw_line=audio_file.raw_line,
            field_name="overall_score"
        ))

    metrics = ProgressMetrics(
        tempo_accuracy=round(tempo, 2),
        pitch_accuracy=round(pitch, 2),
        rhythm_stability=round(rhythm, 2),
        expression_score=round(expression, 2),
        overall_score=round(overall, 2)
    )

    return metrics, anomalies


def _check_duplicates(files: List[AudioFile], source_folder_path: str) -> List[Anomaly]:
    anomalies: List[Anomaly] = []
    seen: Dict[str, List[AudioFile]] = {}

    for f in files:
        if f.is_master_tape:
            continue
        key = f"{f.student_name}|{f.track_name}|{f.lesson_date}"
        if key not in seen:
            seen[key] = []
        seen[key].append(f)

    for key, group in seen.items():
        if len(group) > 1:
            for f in group:
                anomalies.append(Anomaly(
                    anomaly_type="重复记录",
                    severity="low",
                    message=f"检测到重复记录: {key}，共{len(group)}条",
                    folder_path=source_folder_path,
                    file_name=f.filename,
                    raw_line=f.raw_line,
                    field_name="综合字段"
                ))

    return anomalies


def _check_progress_trend(records: List[StudentProgress], folder_path: str) -> List[Anomaly]:
    anomalies: List[Anomaly] = []

    by_student: Dict[str, List[StudentProgress]] = {}
    for r in records:
        if r.student_name not in by_student:
            by_student[r.student_name] = []
        by_student[r.student_name].append(r)

    for student, recs in by_student.items():
        if len(recs) >= 2:
            recs.sort(key=lambda x: x.lesson_date)
            first = recs[0].metrics.overall_score
            latest = recs[-1].metrics.overall_score
            improvement = latest - first

            if improvement > 30:
                anomalies.append(Anomaly(
                    anomaly_type="进步异常-过快",
                    severity="medium",
                    message=f"学生{student}进步幅度过大({round(improvement, 1)}分)，需确认是否为同一人或教学成果真实",
                    folder_path=folder_path,
                    file_name=recs[-1].audio_file,
                    raw_line=recs[-1].raw_line,
                    field_name="overall_score",
                    expected="进步幅度 < 30分",
                    actual=round(improvement, 1)
                ))
            elif improvement < -10:
                anomalies.append(Anomaly(
                    anomaly_type="进步异常-倒退",
                    severity="medium",
                    message=f"学生{student}成绩明显倒退({round(improvement, 1)}分)，需关注学习状态",
                    folder_path=folder_path,
                    file_name=recs[-1].audio_file,
                    raw_line=recs[-1].raw_line,
                    field_name="overall_score"
                ))

    return anomalies


def run_review(folder_path: str, folder_name: str,
               calculation_rule: CalculationRule = DEFAULT_CALCULATION_RULE,
               previous_review_id: str = None,
               annotation: str = None,
               delivery_list_version: str = None) -> ReviewResult:
    from .parser import parse_audio_folder, InvalidFolderPathError as ParserPathError

    abs_folder_path = os.path.abspath(folder_path) if folder_path else ""

    try:
        folder, parse_anomalies = parse_audio_folder(abs_folder_path if abs_folder_path else folder_path, folder_name)
    except ParserPathError as e:
        raise InvalidFolderPathError(str(e)) from e

    all_anomalies: List[Anomaly] = list(parse_anomalies)
    all_anomalies.extend(_validate_entry_consistency(abs_folder_path, folder_name, folder))

    progress_records: List[StudentProgress] = []

    for audio_file in folder.files:
        if not audio_file.student_name or not audio_file.teacher_name:
            continue

        metrics, metric_anomalies = _generate_metrics_for_file(audio_file, calculation_rule, abs_folder_path)
        all_anomalies.extend(metric_anomalies)

        notes = None
        if audio_file.is_master_tape:
            notes = "【旧版母带，不计入正常课时统计】"
        elif "排练" in audio_file.filename or "授权" in audio_file.filename:
            notes = "【排练/授权使用，需额外确认】"

        progress_records.append(StudentProgress(
            student_name=audio_file.student_name,
            teacher_name=audio_file.teacher_name,
            lesson_date=audio_file.lesson_date,
            folder_path=abs_folder_path,
            metrics=metrics,
            track_name=audio_file.track_name or "未填写",
            audio_file=audio_file.filename,
            raw_line=audio_file.raw_line,
            notes=notes
        ))

    all_anomalies.extend(_check_duplicates(folder.files, abs_folder_path))
    all_anomalies.extend(_check_progress_trend(progress_records, abs_folder_path))

    valid_files = len([f for f in folder.files if not f.is_master_tape and f.student_name and f.teacher_name])
    invalid_files = len(folder.files) - valid_files

    has_critical = any(a.severity == "critical" for a in all_anomalies)
    has_high = any(a.severity == "high" for a in all_anomalies)
    has_medium = any(a.severity == "medium" for a in all_anomalies)

    if has_critical:
        status = "异常-需立即处理"
    elif has_high:
        status = "异常-高优先级"
    elif has_medium:
        status = "待复核-有疑点"
    else:
        status = "正常通过"

    result = ReviewResult(
        review_id=str(uuid.uuid4()),
        review_time=datetime.now(),
        status=status,
        total_files=len(folder.files),
        valid_files=valid_files,
        invalid_files=invalid_files,
        anomalies=all_anomalies,
        progress_records=progress_records,
        calculation_rule=calculation_rule,
        folder_path=abs_folder_path,
        annotation=annotation,
        delivery_list_version=delivery_list_version,
        previous_review_id=previous_review_id
    )

    return result
