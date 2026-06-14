import re
import hashlib
import uuid
import os
from datetime import datetime
from typing import Optional, List, Dict, Tuple, Any
from dataclasses import dataclass

from models import (
    TracklistItem, RecordingFile, RemarkHistory, StatusChange,
    Judgment, TimecodeAnomaly, ImportBatch,
    AnomalyStatus, AnomalyType, MatchStatus
)
from storage import Storage


def _generate_batch_id(prefix: str = "BATCH") -> str:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    short = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{ts}-{short}"


def _parse_timecode(tc: str) -> Optional[int]:
    """将 MM:SS 或 HH:MM:SS 格式转为帧数或秒数（简化：秒）"""
    if not tc or not isinstance(tc, str):
        return None
    parts = tc.strip().split(":")
    try:
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
        elif len(parts) == 2:
            m, s = parts
            return int(m) * 60 + float(s)
    except ValueError:
        return None
    return None


def _normalize_title(s: str) -> str:
    s = s or ""
    s = re.sub(r"(?i)_rev\d+|_final|_v\d+|_副本|\(.*?\)|（.*?）|\[.*?\]|【.*?】", "", s)
    s = re.sub(r"[\s\-_·•・.，,。。!！?？:：;；、/\\|~～`'\"<>《》{}【】\[\]()（）]+", "", s)
    return s.lower()


def _detect_title_from_filename(filename: str) -> Tuple[str, Optional[int]]:
    """从文件名中推断曲目名和曲目号"""
    base = os.path.splitext(os.path.basename(filename))[0]
    track_no = None
    m = re.match(r"(\d+)[\s_\-.]+(.+)", base)
    if m:
        try:
            track_no = int(m.group(1))
        except ValueError:
            pass
        rest = m.group(2)
    else:
        rest = base
    rest = re.sub(r"(?i)_rev\d+|_final|_v\d+|_副本$", "", rest)
    return rest.strip(), track_no


def _semi_beat_deviation(timecode_a: str, timecode_b: str) -> Optional[float]:
    """检测时码偏半拍（通常约0.5秒偏差）"""
    ta = _parse_timecode(timecode_a)
    tb = _parse_timecode(timecode_b)
    if ta is None or tb is None:
        return None
    return abs(ta - tb)


@dataclass
class ImportResult:
    batch_id: str
    tracks_imported: int
    files_imported: int
    anomalies_created: int
    unmatched_files: List[str]
    unmatched_tracks: List[str]
    warning_messages: List[str]


@dataclass
class ChangeJudgmentResult:
    success: bool
    anomaly_id: int
    from_status: AnomalyStatus
    to_status: AnomalyStatus
    message: str


class AnomalyEngine:
    def __init__(self, storage: Storage):
        self.storage = storage

    # ============ 导入 ============
    def import_tracklist(self, rows: List[Dict[str, Any]],
                         source_ref: str, operator: str,
                         note: str = "") -> ImportBatch:
        batch_id = _generate_batch_id("TRK")
        batch = ImportBatch(
            batch_id=batch_id,
            source_type="tracklist",
            source_ref=source_ref,
            file_count=0,
            track_count=len(rows),
            operator=operator,
            note=note,
            created_at=datetime.now()
        )
        self.storage.insert_batch(batch)
        for idx, row in enumerate(rows, start=1):
            track = TracklistItem(
                id=None,
                track_no=int(row.get("track_no", idx)),
                track_title=str(row.get("track_title", "")).strip(),
                expected_filename=str(row.get("expected_filename", "")).strip(),
                duration=str(row.get("duration", "")).strip(),
                source_line_no=int(row.get("source_line_no", idx + 1)),
                notes=str(row.get("notes", "")).strip(),
                version_screenshot_path=str(row.get("version_screenshot_path", "")).strip(),
                import_batch_id=batch_id,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            self.storage.insert_track(track)
        return batch

    def import_recording_files(self, rows: List[Dict[str, Any]],
                               source_ref: str, operator: str,
                               note: str = "") -> ImportBatch:
        batch_id = _generate_batch_id("WAV")
        batch = ImportBatch(
            batch_id=batch_id,
            source_type="files",
            source_ref=source_ref,
            file_count=len(rows),
            track_count=0,
            operator=operator,
            note=note,
            created_at=datetime.now()
        )
        self.storage.insert_batch(batch)
        for row in rows:
            fname = str(row.get("filename", "")).strip()
            detected_title, detected_track_no = _detect_title_from_filename(fname)
            f = RecordingFile(
                id=None,
                filename=fname,
                file_path=str(row.get("file_path", fname)).strip(),
                file_hash=str(row.get("file_hash",
                                      hashlib.md5(fname.encode()).hexdigest())),
                timecode=str(row.get("timecode", "")).strip(),
                duration=str(row.get("duration", "")).strip(),
                detected_title=detected_title,
                detected_track_no=detected_track_no,
                match_status=MatchStatus.UNMATCHED,
                matched_track_id=None,
                import_batch_id=batch_id,
                imported_at=datetime.now()
            )
            self.storage.insert_file(f)
        return batch

    # ============ 匹配与异常检测 ============
    def run_matching_and_detection(self, track_batch_id: Optional[str] = None,
                                   file_batch_id: Optional[str] = None,
                                   operator: str = "system") -> ImportResult:
        tracks = self.storage.list_tracks(track_batch_id)
        files = self.storage.list_files(file_batch_id)

        unmatched_files: List[str] = []
        unmatched_tracks: List[str] = []
        warnings: List[str] = []
        anomaly_count = 0

        track_by_no = {t.track_no: t for t in tracks}

        for f in files:
            matched_track = None
            if f.detected_track_no and f.detected_track_no in track_by_no:
                candidate = track_by_no[f.detected_track_no]
                if (_normalize_title(candidate.track_title) ==
                        _normalize_title(f.detected_title)):
                    matched_track = candidate

            if matched_track:
                self.storage.update_file_match(f.id, MatchStatus.MATCHED,
                                               matched_track.id)
                dev = _semi_beat_deviation(f.timecode, matched_track.duration)
                if dev is not None and 0.2 <= dev <= 1.0:
                    anomaly = TimecodeAnomaly(
                        id=None,
                        anomaly_type=AnomalyType.TIMECODE_OFFBEAT,
                        title=f"时码偏半拍：{matched_track.track_title}",
                        description=(f"文件「{f.filename}」时码({f.timecode})与"
                                     f"曲目表预期({matched_track.duration})偏差"
                                     f"{dev:.2f}秒，疑似偏半拍。"),
                        status=AnomalyStatus.PENDING,
                        track_id=matched_track.id,
                        file_id=f.id,
                        source_file_line=matched_track.source_line_no,
                        impact_scope=(f"受影响：曲目{matched_track.track_no} "
                                      f"「{matched_track.track_title}」，"
                                      f"可能影响后续串接与拍点对齐"),
                        matched_track_title=matched_track.track_title,
                        matched_filename=f.filename,
                        current_judgment="",
                        current_snapshot=(
                            f"[FILE] {f.filename} timecode={f.timecode} | "
                            f"[TRACK #{matched_track.track_no}] "
                            f"{matched_track.track_title} expected={matched_track.duration}"
                        ),
                        latest_remark="",
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    a_id = self.storage.insert_anomaly(anomaly)
                    anomaly_count += 1
                    self._add_remark(
                        a_id,
                        remark_type="自动检测",
                        content=f"自动检测到时码偏差{dev:.2f}秒，疑似半拍偏差",
                        source=f"文件:{f.filename} 曲目表行:{matched_track.source_line_no}",
                        operator="system"
                    )
                    if matched_track.notes:
                        self._add_remark(
                            a_id,
                            remark_type="曲目表历史备注",
                            content=f"曲目表备注：{matched_track.notes}",
                            source=f"曲目表行:{matched_track.source_line_no}",
                            operator="system",
                            attachment_path=matched_track.version_screenshot_path
                        )
            else:
                self.storage.update_file_match(f.id, MatchStatus.UNMATCHED, None)
                unmatched_files.append(f.filename)
                best_guess = None
                best_score = 0
                for t in tracks:
                    score = 0
                    nt = _normalize_title(t.track_title)
                    nf = _normalize_title(f.detected_title)
                    if nt == nf:
                        score = 100
                    elif nf and nt and (nf in nt or nt in nf):
                        score = 50
                    if f.detected_track_no == t.track_no:
                        score += 30
                    if score > best_score:
                        best_score = score
                        best_guess = t
                if best_guess and best_score > 0:
                    anomaly = TimecodeAnomaly(
                        id=None,
                        anomaly_type=AnomalyType.FILENAME_MISMATCH,
                        title=f"文件名不匹配：{f.filename}",
                        description=(f"文件「{f.filename}」(推测曲目#{f.detected_track_no} "
                                     f"{f.detected_title})无法与曲目表精确匹配；"
                                     f"最接近候选：曲目#{best_guess.track_no} "
                                     f"「{best_guess.track_title}」"
                                     f"(匹配分:{best_score}/130)"),
                        status=AnomalyStatus.PENDING,
                        track_id=best_guess.id,
                        file_id=f.id,
                        source_file_line=best_guess.source_line_no,
                        impact_scope=(f"待人工对齐：文件可能被串错曲目，"
                                      f"影响 #{best_guess.track_no} "
                                      f"「{best_guess.track_title}」及后续串接"),
                        matched_track_title=best_guess.track_title,
                        matched_filename=f.filename,
                        current_judgment="",
                        current_snapshot=(
                            f"[FILE] {f.filename} detect_no={f.detected_track_no} "
                            f"detect_title={f.detected_title} | "
                            f"[CANDIDATE TRACK #{best_guess.track_no}] "
                            f"{best_guess.track_title} expected={best_guess.expected_filename}"
                        ),
                        latest_remark="",
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    a_id = self.storage.insert_anomaly(anomaly)
                    anomaly_count += 1
                    self._add_remark(
                        a_id,
                        remark_type="自动检测",
                        content=f"文件名与曲目表对不上，建议人工核对",
                        source=f"文件:{f.filename} vs 曲目表行:{best_guess.source_line_no}",
                        operator="system"
                    )
                    if best_guess.notes:
                        self._add_remark(
                            a_id,
                            remark_type="曲目表历史备注",
                            content=f"曲目表备注：{best_guess.notes}",
                            source=f"曲目表行:{best_guess.source_line_no}",
                            operator="system",
                            attachment_path=best_guess.version_screenshot_path
                        )
                else:
                    warnings.append(f"文件{f.filename}完全找不到曲目候选")

        for t in tracks:
            matched_files = [f for f in files if f.matched_track_id == t.id]
            if not matched_files:
                unmatched_tracks.append(f"#{t.track_no} {t.track_title}")

        for a in self.storage.list_anomalies():
            if a.status == AnomalyStatus.PENDING:
                sc = StatusChange(
                    id=None, anomaly_id=a.id,
                    from_status=AnomalyStatus.PENDING,
                    to_status=AnomalyStatus.PENDING,
                    reason="初始检测待处理",
                    operator=operator,
                    created_at=datetime.now()
                )
                existing_changes = self.storage._list_status_changes(a.id)
                if not existing_changes:
                    self.storage.insert_status_change(sc)

        return ImportResult(
            batch_id="MERGE-" + datetime.now().strftime("%Y%m%d%H%M%S"),
            tracks_imported=len(tracks),
            files_imported=len(files),
            anomalies_created=anomaly_count,
            unmatched_files=unmatched_files,
            unmatched_tracks=unmatched_tracks,
            warning_messages=warnings
        )

    # ============ 内部辅助 ============
    def _add_remark(self, anomaly_id: int, remark_type: str, content: str,
                    source: str, operator: str,
                    attachment_path: str = "") -> int:
        remark = RemarkHistory(
            id=None, anomaly_id=anomaly_id,
            remark_type=remark_type, content=content,
            source=source, operator=operator,
            attachment_path=attachment_path,
            created_at=datetime.now()
        )
        rid = self.storage.insert_remark(remark)
        self.storage.update_anomaly_remark(anomaly_id, content)
        return rid

    def _change_status(self, anomaly_id: int,
                       to_status: AnomalyStatus,
                       reason: str,
                       operator: str) -> StatusChange:
        anomaly = self.storage.get_anomaly(anomaly_id)
        if not anomaly:
            raise ValueError(f"找不到异常 #{anomaly_id}")
        sc = StatusChange(
            id=None, anomaly_id=anomaly_id,
            from_status=anomaly.status,
            to_status=to_status,
            reason=reason, operator=operator,
            created_at=datetime.now()
        )
        self.storage.insert_status_change(sc)
        self.storage.update_anomaly_status(
            anomaly_id, to_status,
            judgment=reason if to_status in (AnomalyStatus.CONFIRMED,
                                             AnomalyStatus.RESOLVED)
                              else anomaly.current_judgment,
            snapshot=anomaly.current_snapshot
        )
        return sc

    # ============ 改判 ============
    def confirm_anomaly(self, anomaly_id: int, operator: str,
                        judgment_text: str, source_ref: str,
                        impact_scope: str = "") -> ChangeJudgmentResult:
        anomaly = self.storage.get_anomaly(anomaly_id)
        if not anomaly:
            return ChangeJudgmentResult(False, anomaly_id,
                                        AnomalyStatus.PENDING,
                                        AnomalyStatus.PENDING,
                                        "找不到异常记录")
        sc = self._change_status(anomaly_id, AnomalyStatus.CONFIRMED,
                                 judgment_text, operator)
        j = Judgment(
            id=None, anomaly_id=anomaly_id,
            judgment_text=judgment_text, source_ref=source_ref,
            impact_scope=impact_scope or anomaly.impact_scope,
            is_favorable=False, operator=operator,
            created_at=datetime.now()
        )
        self.storage.insert_judgment(j)
        self._add_remark(
            anomaly_id, remark_type="改判确认",
            content=f"确认异常：{judgment_text} [来源:{source_ref}]",
            source=source_ref, operator=operator
        )
        return ChangeJudgmentResult(
            True, anomaly_id, sc.from_status, sc.to_status,
            f"已确认，共{len(anomaly.judgments) + 1}次改判记录"
        )

    def resolve_anomaly(self, anomaly_id: int, operator: str,
                        judgment_text: str, source_ref: str,
                        impact_scope: str = "") -> ChangeJudgmentResult:
        anomaly = self.storage.get_anomaly(anomaly_id)
        if not anomaly:
            return ChangeJudgmentResult(False, anomaly_id,
                                        AnomalyStatus.PENDING,
                                        AnomalyStatus.PENDING,
                                        "找不到异常记录")
        sc = self._change_status(anomaly_id, AnomalyStatus.RESOLVED,
                                 judgment_text, operator)
        j = Judgment(
            id=None, anomaly_id=anomaly_id,
            judgment_text=judgment_text, source_ref=source_ref,
            impact_scope=impact_scope or anomaly.impact_scope,
            is_favorable=True, operator=operator,
            created_at=datetime.now()
        )
        self.storage.insert_judgment(j)
        self._add_remark(
            anomaly_id, remark_type="改判解决",
            content=f"已解决：{judgment_text} [来源:{source_ref}]",
            source=source_ref, operator=operator
        )
        if anomaly.file_id and anomaly.track_id:
            self.storage.update_file_match(anomaly.file_id,
                                           MatchStatus.RESOLVED,
                                           anomaly.track_id)
        return ChangeJudgmentResult(
            True, anomaly_id, sc.from_status, sc.to_status,
            f"已解决，人工对齐完成"
        )

    def dismiss_anomaly(self, anomaly_id: int, operator: str,
                        judgment_text: str, source_ref: str) -> ChangeJudgmentResult:
        anomaly = self.storage.get_anomaly(anomaly_id)
        if not anomaly:
            return ChangeJudgmentResult(False, anomaly_id,
                                        AnomalyStatus.PENDING,
                                        AnomalyStatus.PENDING,
                                        "找不到异常记录")
        sc = self._change_status(anomaly_id, AnomalyStatus.DISMISSED,
                                 judgment_text, operator)
        j = Judgment(
            id=None, anomaly_id=anomaly_id,
            judgment_text=judgment_text, source_ref=source_ref,
            impact_scope=anomaly.impact_scope,
            is_favorable=True, operator=operator,
            created_at=datetime.now()
        )
        self.storage.insert_judgment(j)
        self._add_remark(
            anomaly_id, remark_type="改判驳回",
            content=f"驳回：{judgment_text} [来源:{source_ref}]",
            source=source_ref, operator=operator
        )
        return ChangeJudgmentResult(
            True, anomaly_id, sc.from_status, sc.to_status,
            f"已驳回，异常不成立"
        )

    def waive_anomaly_by_license(self, anomaly_id: int, operator: str,
                                 license_remark: str,
                                 source_ref: str = "演出统筹授权") -> ChangeJudgmentResult:
        anomaly = self.storage.get_anomaly(anomaly_id)
        if not anomaly:
            return ChangeJudgmentResult(False, anomaly_id,
                                        AnomalyStatus.PENDING,
                                        AnomalyStatus.PENDING,
                                        "找不到异常记录")
        old_status = anomaly.status
        sc = self._change_status(anomaly_id, AnomalyStatus.WAIVED,
                                 license_remark, operator)
        j = Judgment(
            id=None, anomaly_id=anomaly_id,
            judgment_text=("【授权豁免】" + license_remark),
            source_ref=source_ref,
            impact_scope=(f"授权豁免：文件/曲目表/最终清单已通过授权重新对齐，"
                          f"影响范围由演出统筹确认"),
            is_favorable=True, operator=operator,
            created_at=datetime.now()
        )
        self.storage.insert_judgment(j)
        self._add_remark(
            anomaly_id, remark_type="授权备注",
            content=f"{license_remark} [来源:{source_ref}]",
            source=source_ref, operator=operator
        )
        if anomaly.file_id and anomaly.track_id:
            self.storage.update_file_match(anomaly.file_id,
                                           MatchStatus.RESOLVED,
                                           anomaly.track_id)
        return ChangeJudgmentResult(
            True, anomaly_id, old_status, sc.to_status,
            f"已授权豁免并完成对齐：{license_remark}"
        )

    # ============ 追加后补备注（保留历史，不覆盖） ============
    def append_supplementary_remark(self, anomaly_id: int, content: str,
                                    source: str, operator: str,
                                    attachment_path: str = "") -> int:
        return self._add_remark(
            anomaly_id, remark_type="后补备注",
            content=content, source=source,
            operator=operator,
            attachment_path=attachment_path
        )

    # ============ 查询 ============
    def get_alignment_status(self) -> Dict[str, Any]:
        tracks = self.storage.list_tracks()
        files = self.storage.list_files()
        anomalies = self.storage.list_anomalies()
        by_status: Dict[str, int] = {}
        for a in anomalies:
            by_status[a.status.value] = by_status.get(a.status.value, 0) + 1
        unmatched = [f for f in files if f.match_status == MatchStatus.UNMATCHED]
        return {
            "total_tracks": len(tracks),
            "total_files": len(files),
            "total_anomalies": len(anomalies),
            "anomalies_by_status": by_status,
            "unmatched_file_count": len(unmatched),
            "unmatched_filenames": [f.filename for f in unmatched],
            "consistency_check": self._check_consistency()
        }

    def _check_consistency(self) -> Dict[str, Any]:
        anomalies = self.storage.list_anomalies()
        issues = []
        for a in anomalies:
            if a.status_history:
                last_status = a.status_history[-1].to_status
                if last_status != a.status:
                    issues.append(
                        f"异常#{a.id}状态不一致：DB={a.status.value} "
                        f"历史最后={last_status.value}"
                    )
            if a.remarks:
                last_remark = a.remarks[-1]
                if a.latest_remark and a.latest_remark != last_remark.content:
                    # 允许内容不完全相同，但记录
                    pass
        return {
            "consistent": len(issues) == 0,
            "issues": issues,
            "total_remarks_preserved": sum(len(a.remarks) for a in anomalies),
            "total_status_changes_preserved": sum(len(a.status_history) for a in anomalies),
            "total_judgments_preserved": sum(len(a.judgments) for a in anomalies)
        }
