import re
import os
import json
import uuid
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Set

from models import (
    ReviewRecord, ReviewStatus, ReviewSubmission, Issue, IssueType,
    ContractScan, AudioFile, TrackItem, RemarkEntry, StatusChange,
    compute_file_hash, compute_content_hash
)


DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "review_data.json")


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def normalize_name(name: str) -> str:
    if not name:
        return ""
    n = name.strip().lower()
    n = re.sub(r"[\s_\-\.\(\)\[\]【】（）,，、/\\]+", "", n)
    return n


def parse_filename(file_name: str) -> Tuple[Optional[int], Optional[str]]:
    base = os.path.splitext(file_name)[0]
    track_no = None
    title = base

    m = re.match(r"^(\d{1,3})[\s_\-\.]+(.+)$", base)
    if m:
        try:
            track_no = int(m.group(1))
        except ValueError:
            track_no = None
        title = m.group(2)
    else:
        m2 = re.match(r"^第?(\d{1,3})[首曲目歌编段节]+[\s_\-\.:：]*(.+)$", base)
        if m2:
            try:
                track_no = int(m2.group(1))
            except ValueError:
                track_no = None
            title = m2.group(2)

    return track_no, title.strip() if title else None


def find_track_by_name(
    tracklist: List[TrackItem], name: str
) -> Optional[TrackItem]:
    if not name:
        return None
    norm_target = normalize_name(name)
    if not norm_target:
        return None
    for t in tracklist:
        for alias in t.all_names():
            if normalize_name(alias) == norm_target:
                return t
    return None


def find_track_by_no(
    tracklist: List[TrackItem], no: int
) -> Optional[TrackItem]:
    for t in tracklist:
        if t.track_no == no:
            return t
    return None


def detect_duplicate_tracks(tracklist: List[TrackItem]) -> List[Tuple[Set[int], str]]:
    name_map: Dict[str, Set[int]] = {}
    for t in tracklist:
        for alias in t.all_names():
            norm = normalize_name(alias)
            if not norm:
                continue
            if norm not in name_map:
                name_map[norm] = set()
            name_map[norm].add(t.track_no)

    dupes = []
    seen_norms: Set[str] = set()
    for t in tracklist:
        for alias in t.all_names():
            norm = normalize_name(alias)
            if norm in seen_norms:
                continue
            if norm in name_map and len(name_map[norm]) > 1:
                seen_norms.add(norm)
                dupes.append((name_map[norm], alias))
    return dupes


def audit_contract_vs_tracklist(
    contract: ContractScan, reference: List[TrackItem]
) -> List[Issue]:
    issues: List[Issue] = []

    ref_nos = {t.track_no for t in reference}
    contract_nos = {t.track_no for t in contract.tracks}

    missing_in_contract = ref_nos - contract_nos
    extra_in_contract = contract_nos - ref_nos

    for no in sorted(missing_in_contract):
        t = find_track_by_no(reference, no)
        title_str = t.title if t else f"第{no}首"
        issues.append(Issue(
            issue_type=IssueType.CONTRACT_MISMATCH,
            description=f"合同扫描件缺少曲目编号{no}（{title_str}）",
            human_reason=f"合同里没有写第{no}首《{title_str}》，但曲目表有这条",
            severity="error",
            related_track_no=no,
            resolution_hint=f"请补合同里的第{no}首曲目条目，或确认曲目表是否多写了"
        ))

    for no in sorted(extra_in_contract):
        t = find_track_by_no(contract.tracks, no)
        title_str = t.title if t else f"第{no}首"
        issues.append(Issue(
            issue_type=IssueType.CONTRACT_MISMATCH,
            description=f"合同扫描件多出曲目编号{no}（{title_str}）",
            human_reason=f"合同里写了第{no}首《{title_str}》，但曲目表里没这条",
            severity="warning",
            related_track_no=no,
            resolution_hint=f"请确认合同第{no}首是否为本采样包内容，还是误附了其他合同的曲目"
        ))

    for ct in contract.tracks:
        if ct.track_no in ref_nos:
            rt = find_track_by_no(reference, ct.track_no)
            if rt:
                ct_names = {normalize_name(n) for n in ct.all_names() if normalize_name(n)}
                rt_names = {normalize_name(n) for n in rt.all_names() if normalize_name(n)}
                if not (ct_names & rt_names):
                    issues.append(Issue(
                        issue_type=IssueType.CONTRACT_MISMATCH,
                        description=f"第{ct.track_no}首合同曲名与曲目表对不上：合同写“{ct.title}”，曲目表是“{rt.title}”",
                        human_reason=f"第{ct.track_no}首，合同写的是《{ct.title}》，但曲目表写的是《{rt.title}》，名字对不上",
                        severity="warning",
                        related_track_no=ct.track_no,
                        resolution_hint=f"请确认是不是别名或翻译名，是的话在曲目表里补上别名；不是的话改其中一边"
                    ))
    return issues


def audit_audio_vs_tracklist(
    audio_files: List[AudioFile], reference: List[TrackItem]
) -> List[Issue]:
    issues: List[Issue] = []

    ref_nos = {t.track_no for t in reference}
    matched_nos: Set[int] = set()

    for af in audio_files:
        if af.parsed_track_no and af.parsed_track_no in ref_nos:
            matched_nos.add(af.parsed_track_no)
            rt = find_track_by_no(reference, af.parsed_track_no)
            if rt and af.parsed_title:
                file_norm = normalize_name(af.parsed_title)
                rt_names = {normalize_name(n) for n in rt.all_names() if normalize_name(n)}
                if file_norm and file_norm not in rt_names:
                    issues.append(Issue(
                        issue_type=IssueType.FILENAME_MISMATCH,
                        description=f"文件名《{af.parsed_title}》与曲目表第{af.parsed_track_no}首《{rt.title}》不符",
                        human_reason=f"第{af.parsed_track_no}首的文件名是《{af.parsed_title}》，但曲目表写的是《{rt.title}》，看起来不太一样",
                        severity="warning",
                        related_track_no=af.parsed_track_no,
                        resolution_hint=f"如果是同曲别名，在曲目表里补上别名；否则重命名文件或修正曲目表"
                    ))

    missing_files = ref_nos - matched_nos
    for no in sorted(missing_files):
        t = find_track_by_no(reference, no)
        title_str = t.title if t else f"第{no}首"
        issues.append(Issue(
            issue_type=IssueType.MISSING_FILE,
            description=f"缺少第{no}首音频文件（{title_str}）",
            human_reason=f"曲目表里有第{no}首《{title_str}》，但没收到对应的音频文件",
            severity="error",
            related_track_no=no,
            resolution_hint=f"请补发第{no}首《{title_str}》的音频文件"
        ))

    extra_files = []
    for af in audio_files:
        if af.parsed_track_no and af.parsed_track_no not in ref_nos:
            extra_files.append(af)
        elif not af.parsed_track_no:
            extra_files.append(af)

    for af in extra_files:
        hint = f"文件名《{af.file_name}》"
        if af.parsed_track_no:
            issues.append(Issue(
                issue_type=IssueType.FILENAME_MISMATCH,
                description=f"多出音频文件：{af.file_name}（编号{af.parsed_track_no}不在曲目表中）",
                human_reason=f"收到了{af.file_name}，但曲目表里没有第{af.parsed_track_no}首，不知道该放哪儿",
                severity="warning",
                related_track_no=af.parsed_track_no,
                resolution_hint=f"确认这个文件属于哪首曲目，补到曲目表里或移走不属于本包的文件"
            ))
        else:
            issues.append(Issue(
                issue_type=IssueType.FILENAME_MISMATCH,
                description=f"无法识别的音频文件：{af.file_name}",
                human_reason=f"收到了{af.file_name}，但文件名里没带编号，不知道对应曲目表的哪一首",
                severity="warning",
                related_track_no=None,
                resolution_hint=f"重命名文件加上编号，例如“01_曲名.wav”"
            ))
    return issues


def audit_contract_vs_audio(
    contracts: List[ContractScan], audio_files: List[AudioFile]
) -> List[Issue]:
    issues: List[Issue] = []

    for ct in contracts:
        contract_tracks = {t.track_no for t in ct.tracks}
        for af in audio_files:
            if af.parsed_track_no and af.parsed_track_no in contract_tracks:
                ct_track = find_track_by_no(ct.tracks, af.parsed_track_no)
                if ct_track and af.parsed_title:
                    file_norm = normalize_name(af.parsed_title)
                    ct_names = {normalize_name(n) for n in ct_track.all_names() if normalize_name(n)}
                    if file_norm and file_norm not in ct_names:
                        issues.append(Issue(
                            issue_type=IssueType.CONTRACT_FILENAME_MISMATCH,
                            description=f"第{af.parsed_track_no}首合同《{ct_track.title}》与文件名《{af.parsed_title}》不一致",
                            human_reason=f"第{af.parsed_track_no}首，合同写《{ct_track.title}》，文件名却叫《{af.parsed_title}》，两边名字不一致",
                            severity="warning",
                            related_track_no=af.parsed_track_no,
                            resolution_hint=f"确认是不是别名，是就补备注说明；不是就改合同或文件名"
                        ))
    return issues


def audit_alias_conflicts(
    reference: List[TrackItem]
) -> List[Issue]:
    issues: List[Issue] = []

    for t in reference:
        seen_norm: Dict[str, str] = {}
        for name in t.all_names():
            norm = normalize_name(name)
            if not norm:
                continue
            if norm in seen_norm:
                issues.append(Issue(
                    issue_type=IssueType.DUPLICATE_TRACK,
                    description=f"第{t.track_no}首《{t.title}》曲目内别名重复：“{name}”与“{seen_norm[norm]}”归一化后相同",
                    human_reason=f"第{t.track_no}首《{t.title}》的别名里，“{name}”和“{seen_norm[norm]}”其实是同一个名字，写重了",
                    severity="info",
                    related_track_no=t.track_no,
                    resolution_hint=f"删掉第{t.track_no}首里重复的别名就行，不影响放行"
                ))
            else:
                seen_norm[norm] = name

    dupes = detect_duplicate_tracks(reference)
    for (track_nos, alias_name) in dupes:
        sorted_nos = sorted(track_nos)
        titles = []
        for no in sorted_nos:
            t = find_track_by_no(reference, no)
            if t:
                titles.append(f"第{no}首《{t.title}》")
        issues.append(Issue(
            issue_type=IssueType.ALIAS_CONFLICT,
            description=f"“{alias_name}”同时出现在不同曲目中：{', '.join(titles)}",
            human_reason=f"“{alias_name}”这个名字同时出现在了{'、'.join(titles)}里，分不清到底属于哪一首",
            severity="error",
            related_track_no=sorted_nos[0],
            resolution_hint=f"请确认这些曲目是否确实同名不同版本，还是别名写错了；若是同曲不同版本，请在备注中说明区分方式"
        ))
    return issues


def run_audit(record: ReviewRecord) -> List[Issue]:
    all_issues: List[Issue] = []

    if not record.contract_scans:
        all_issues.append(Issue(
            issue_type=IssueType.MISSING_CONTRACT,
            description="未提交任何合同扫描件",
            human_reason="没有收到合同扫描件，无法对照曲目确认授权范围",
            severity="error",
            related_track_no=None,
            resolution_hint="请补充合同扫描件，至少需要包含曲目列表页的那一页"
        ))
    else:
        for contract in record.contract_scans:
            all_issues.extend(audit_contract_vs_tracklist(contract, record.reference_tracklist))

    all_issues.extend(audit_audio_vs_tracklist(record.audio_files, record.reference_tracklist))

    if record.contract_scans and record.audio_files:
        all_issues.extend(audit_contract_vs_audio(record.contract_scans, record.audio_files))

    if record.reference_tracklist:
        all_issues.extend(audit_alias_conflicts(record.reference_tracklist))

    return all_issues


def decide_status(issues: List[Issue]) -> ReviewStatus:
    errors = [i for i in issues if i.severity == "error"]
    warnings = [i for i in issues if i.severity == "warning"]

    if errors:
        return ReviewStatus.NEEDS_SUPPLEMENT
    if warnings:
        return ReviewStatus.AMBIGUOUS
    return ReviewStatus.PASSED


def dedupe_contract(
    existing_keys: List[str], new_contracts: List[ContractScan]
) -> Tuple[List[ContractScan], List[str]]:
    added: List[ContractScan] = []
    new_keys: List[str] = list(existing_keys)
    for c in new_contracts:
        k = c.content_key()
        if k not in new_keys:
            new_keys.append(k)
            added.append(c)
    return added, new_keys


def dedupe_audio(
    existing_hashes: List[str], new_files: List[AudioFile]
) -> Tuple[List[AudioFile], List[str]]:
    added: List[AudioFile] = []
    new_hashes: List[str] = list(existing_hashes)
    for f in new_files:
        if f.file_hash not in new_hashes:
            new_hashes.append(f.file_hash)
            added.append(f)
    return added, new_hashes


class ReviewStore:
    def __init__(self, data_file: str = DATA_FILE):
        self.data_file = data_file
        self._records: Dict[str, ReviewRecord] = {}
        self._load()

    def _load(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for pkg, rec_dict in data.get("records", {}).items():
                    self._records[pkg] = ReviewRecord.from_dict(rec_dict)
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                print(f"[警告] 读取历史数据失败：{e}，将从空记录开始")
                self._records = {}

    def _save(self):
        data = {
            "records": {pkg: rec.to_dict() for pkg, rec in self._records.items()},
            "saved_at": now_iso()
        }
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def list_packages(self) -> List[str]:
        return sorted(self._records.keys())

    def get_record(self, package_name: str) -> Optional[ReviewRecord]:
        return self._records.get(package_name)

    def has_package(self, package_name: str) -> bool:
        return package_name in self._records

    def create_or_update(
        self,
        package_name: str,
        reference_tracklist: List[TrackItem],
        contract_scans: List[ContractScan] = None,
        audio_files: List[AudioFile] = None,
    ) -> Tuple[ReviewRecord, Dict[str, int]]:
        contract_scans = contract_scans or []
        audio_files = audio_files or []

        stats = {"contracts_added": 0, "audios_added": 0, "is_new": 0}

        existing = self._records.get(package_name)
        if existing is None:
            rec = ReviewRecord(
                record_id=str(uuid.uuid4())[:8],
                package_name=package_name,
                created_at=now_iso(),
                updated_at=now_iso(),
                status=ReviewStatus.PENDING,
                reference_tracklist=list(reference_tracklist),
                contract_scans=[],
                audio_files=[],
                issues=[],
                remarks=[],
                status_history=[],
                contract_content_keys=[],
                audio_file_hashes=[],
                submission_count=1
            )
            stats["is_new"] = 1
            old_status = None
        else:
            rec = existing
            rec.submission_count += 1
            rec.reference_tracklist = list(reference_tracklist)
            old_status = rec.status

        added_contracts, new_keys = dedupe_contract(rec.contract_content_keys, contract_scans)
        rec.contract_content_keys = new_keys
        rec.contract_scans.extend(added_contracts)
        stats["contracts_added"] = len(added_contracts)

        added_audios, new_hashes = dedupe_audio(rec.audio_file_hashes, audio_files)
        rec.audio_file_hashes = new_hashes
        rec.audio_files.extend(added_audios)
        stats["audios_added"] = len(added_audios)

        for af in rec.audio_files:
            if af.parsed_track_no is None or af.parsed_title is None:
                p_no, p_title = parse_filename(af.file_name)
                if af.parsed_track_no is None:
                    af.parsed_track_no = p_no
                if af.parsed_title is None:
                    af.parsed_title = p_title

        old_issue_keys = {compute_content_hash(i.issue_type.value + "|" + i.description) for i in rec.issues}
        rec.issues = run_audit(rec)
        new_issue_keys = {compute_content_hash(i.issue_type.value + "|" + i.description) for i in rec.issues}

        changed_issue_keys = sorted(old_issue_keys.symmetric_difference(new_issue_keys))

        new_status = decide_status(rec.issues)
        rec.updated_at = now_iso()

        if old_status != new_status or changed_issue_keys:
            delta = StatusChange(
                changed_at=now_iso(),
                old_status=old_status,
                new_status=new_status,
                trigger="重新复核" if existing else "首次提交",
                changed_issues=changed_issue_keys
            )
            rec.status_history.append(delta)
            rec.status = new_status

        self._records[package_name] = rec
        self._save()
        return rec, stats

    def add_remark(
        self,
        package_name: str,
        author: str,
        content: str,
        override_issue_keys: List[str] = None,
    ) -> Optional[ReviewRecord]:
        rec = self._records.get(package_name)
        if rec is None:
            return None

        override_issue_keys = override_issue_keys or []
        judgment_deltas: List[str] = []

        if override_issue_keys:
            before_status = rec.status
            filtered_issues = []
            for i in rec.issues:
                k = compute_content_hash(i.issue_type.value + "|" + i.description)
                if k in override_issue_keys:
                    judgment_deltas.append(f"已备注确认：[{i.issue_type.value}] {i.description}")
                else:
                    filtered_issues.append(i)
            rec.issues = filtered_issues
            after_status = decide_status(rec.issues)
            if before_status != after_status:
                delta = StatusChange(
                    changed_at=now_iso(),
                    old_status=before_status,
                    new_status=after_status,
                    trigger=f"补备注（{author}）",
                    changed_issues=override_issue_keys
                )
                rec.status_history.append(delta)
                rec.status = after_status
                judgment_deltas.append(f"状态由【{before_status.value}】变更为【{after_status.value}】")

        if not judgment_deltas:
            judgment_deltas.append("仅追加备注，未改变现有复核结论")

        remark = RemarkEntry(
            remark_id=str(uuid.uuid4())[:8],
            author=author,
            content=content,
            added_at=now_iso(),
            judgment_deltas=judgment_deltas
        )
        rec.remarks.append(remark)
        rec.updated_at = now_iso()

        self._save()
        return rec

    def manual_change_status(
        self,
        package_name: str,
        new_status: ReviewStatus,
        author: str,
        reason: str,
    ) -> Optional[ReviewRecord]:
        rec = self._records.get(package_name)
        if rec is None:
            return None
        old_status = rec.status
        if old_status != new_status:
            delta = StatusChange(
                changed_at=now_iso(),
                old_status=old_status,
                new_status=new_status,
                trigger=f"人工调整（{author}）：{reason}",
                changed_issues=[]
            )
            rec.status_history.append(delta)
            rec.status = new_status
            rec.updated_at = now_iso()
            self._save()
        return rec
