import os
import re
from datetime import datetime
from typing import List, Tuple, Optional

from .models import AudioFile, AudioFolder, Anomaly


class InvalidFolderPathError(Exception):
    def __init__(self, folder_path: str, reason: str):
        self.folder_path = folder_path
        self.reason = reason
        super().__init__(f"音频文件夹记录无效 [{folder_path}]: {reason}")


def _validate_folder_path(folder_path: str) -> None:
    if not folder_path or not folder_path.strip():
        raise InvalidFolderPathError(folder_path, "路径为空")

    if not os.path.isabs(folder_path):
        abs_path = os.path.abspath(folder_path)
    else:
        abs_path = folder_path

    if not os.path.exists(abs_path):
        raise InvalidFolderPathError(
            abs_path,
            f"文件不存在（输入路径: {folder_path}），请核对 folder_path 参数"
        )

    if not os.path.isfile(abs_path):
        raise InvalidFolderPathError(abs_path, "路径存在但不是文件（folder_path应指向记录.txt）")

    if not os.access(abs_path, os.R_OK):
        raise InvalidFolderPathError(abs_path, "文件无读取权限")

    try:
        with open(abs_path, 'r', encoding='utf-8') as f:
            peek = f.read(4)
    except UnicodeDecodeError:
        raise InvalidFolderPathError(abs_path, "文件不是UTF-8文本格式，无法解析")
    except Exception as e:
        raise InvalidFolderPathError(abs_path, f"文件读取失败: {e}")

    if os.path.getsize(abs_path) == 0:
        raise InvalidFolderPathError(abs_path, "文件为空（0字节）")


def parse_audio_folder(folder_path: str, folder_name: str) -> Tuple[AudioFolder, List[Anomaly]]:
    _validate_folder_path(folder_path)

    abs_folder_path = os.path.abspath(folder_path)

    anomalies: List[Anomaly] = []

    with open(abs_folder_path, 'r', encoding='utf-8') as f:
        raw_content = f.readlines()

    audio_files: List[AudioFile] = []

    for line_num, raw_line in enumerate(raw_content, start=1):
        line = raw_line.strip()

        if not line or line.startswith('#') or line.startswith('='):
            continue

        fields = line.split('|')

        if len(fields) < 9:
            anomalies.append(Anomaly(
                anomaly_type="格式错误",
                severity="high",
                message=f"字段数量不足，预期9个字段，实际{len(fields)}个",
                folder_path=abs_folder_path,
                file_name=f"第{line_num}行",
                raw_line=line_num,
                field_name="整体格式",
                actual=line
            ))
            continue

        try:
            filename = fields[0].strip()
            duration_str = fields[1].strip()
            student_name = fields[2].strip()
            teacher_name = fields[3].strip()
            lesson_date_str = fields[4].strip()
            track_name = fields[5].strip()
            is_master_str = fields[6].strip().lower()
            master_tape_version = fields[7].strip() if len(fields) > 7 else None
            declared_line = fields[8].strip() if len(fields) > 8 else str(line_num)

            if not filename:
                anomalies.append(Anomaly(
                    anomaly_type="缺失字段",
                    severity="high",
                    message="文件名为空",
                    folder_path=abs_folder_path,
                    file_name=f"第{line_num}行",
                    raw_line=line_num,
                    field_name="filename"
                ))

            try:
                duration = float(duration_str)
                if duration <= 0:
                    anomalies.append(Anomaly(
                        anomaly_type="数据格式错误",
                        severity="medium",
                        message="时长必须为正数",
                        folder_path=abs_folder_path,
                        file_name=filename or f"第{line_num}行",
                        raw_line=line_num,
                        field_name="duration_seconds",
                        expected="> 0",
                        actual=duration_str
                    ))
            except ValueError:
                anomalies.append(Anomaly(
                    anomaly_type="数据格式错误",
                    severity="high",
                    message="时长字段不是有效数字",
                    folder_path=abs_folder_path,
                    file_name=filename or f"第{line_num}行",
                    raw_line=line_num,
                    field_name="duration_seconds",
                    expected="数字",
                    actual=duration_str
                ))
                continue

            try:
                lesson_date = datetime.strptime(lesson_date_str, "%Y-%m-%d")
                if lesson_date.year < 2000 or lesson_date.year > 2030:
                    anomalies.append(Anomaly(
                        anomaly_type="日期异常",
                        severity="medium",
                        message=f"日期超出合理范围: {lesson_date_str}",
                        folder_path=abs_folder_path,
                        file_name=filename or f"第{line_num}行",
                        raw_line=line_num,
                        field_name="lesson_date",
                        expected="2000-2030年间的有效日期",
                        actual=lesson_date_str
                    ))
            except ValueError:
                anomalies.append(Anomaly(
                    anomaly_type="日期格式错误",
                    severity="high",
                    message=f"日期格式无效: {lesson_date_str}",
                    folder_path=abs_folder_path,
                    file_name=filename or f"第{line_num}行",
                    raw_line=line_num,
                    field_name="lesson_date",
                    expected="YYYY-MM-DD格式",
                    actual=lesson_date_str
                ))
                continue

            if not student_name:
                anomalies.append(Anomaly(
                    anomaly_type="缺失字段",
                    severity="high",
                    message="学生姓名为空",
                    folder_path=abs_folder_path,
                    file_name=filename or f"第{line_num}行",
                    raw_line=line_num,
                    field_name="student_name"
                ))

            if not teacher_name:
                anomalies.append(Anomaly(
                    anomaly_type="缺失字段",
                    severity="high",
                    message="教师姓名为空",
                    folder_path=abs_folder_path,
                    file_name=filename or f"第{line_num}行",
                    raw_line=line_num,
                    field_name="teacher_name"
                ))

            if not track_name:
                anomalies.append(Anomaly(
                    anomaly_type="缺失字段",
                    severity="medium",
                    message="曲目名称为空",
                    folder_path=abs_folder_path,
                    file_name=filename or f"第{line_num}行",
                    raw_line=line_num,
                    field_name="track_name"
                ))

            is_master_tape = is_master_str == 'true'

            if is_master_tape:
                anomalies.append(Anomaly(
                    anomaly_type="旧版母带混入",
                    severity="critical",
                    message=f"检测到旧版母带混入，版本: {master_tape_version or '未知'}，该记录不应计入正常课时复核",
                    folder_path=abs_folder_path,
                    file_name=filename or f"第{line_num}行",
                    raw_line=line_num,
                    field_name="is_master_tape",
                    expected="false（课时录音）",
                    actual="true（母带录音）"
                ))

            if filename and student_name and teacher_name:
                audio_files.append(AudioFile(
                    filename=filename,
                    file_path=os.path.join(os.path.dirname(abs_folder_path), filename),
                    duration_seconds=duration,
                    student_name=student_name,
                    teacher_name=teacher_name,
                    lesson_date=lesson_date_str,
                    track_name=track_name,
                    is_master_tape=is_master_tape,
                    master_tape_version=master_tape_version if is_master_tape else None,
                    raw_line=line_num
                ))

        except Exception as e:
            anomalies.append(Anomaly(
                anomaly_type="解析异常",
                severity="high",
                message=f"行解析失败: {str(e)}",
                folder_path=abs_folder_path,
                file_name=f"第{line_num}行",
                raw_line=line_num,
                actual=line
            ))

    folder = AudioFolder(
        folder_path=abs_folder_path,
        folder_name=folder_name,
        scan_time=datetime.now(),
        files=audio_files,
        raw_content=raw_content
    )

    return folder, anomalies

