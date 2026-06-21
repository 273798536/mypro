"""版本比对引擎 —— 旧版母带识别、挂起机制"""
from __future__ import annotations

import re
from typing import Optional

from .models import (
    TrackRow,
    VersionJudgment,
    ReviewStatus,
    OLD_VERSION_MARKERS,
    INTRO_KEYWORDS,
    DELIVERY_KEYWORDS,
)
from .exceptions import OldMasterDetected


VERSION_TAG_PATTERNS = [
    re.compile(r"v?(\d+)\.(\d+)(?:\.(\d+))?", re.IGNORECASE),
    re.compile(r"(?:version|ver)\s*(\d+)", re.IGNORECASE),
    re.compile(r"第?\s*(\d+)\s*版"),
    re.compile(r"(\d+)\s*版"),
    re.compile(r"rev(?:ision)?\s*\.?\s*(\d+)", re.IGNORECASE),
]


def _parse_version_number(tag: str) -> Optional[tuple]:
    if not tag:
        return None
    for pat in VERSION_TAG_PATTERNS:
        m = pat.search(tag)
        if m:
            nums = [int(x) for x in m.groups() if x is not None and x != ""]
            if nums:
                return tuple(nums)
    return None


def _looks_like_intro(title: str, remark: str) -> bool:
    pool = f"{title} {remark}".lower()
    return any(kw in pool for kw in INTRO_KEYWORDS)


def _has_delivery_signal(remark: str, delivery_ref: str) -> bool:
    pool = f"{remark} {delivery_ref}".lower()
    return any(kw in pool for kw in DELIVERY_KEYWORDS)


def _has_old_marker(*texts: str) -> list[str]:
    """返回命中的旧版标记证据"""
    evidence: list[str] = []
    for idx, text in enumerate(texts):
        if not text:
            continue
        low = text.lower()
        for marker in OLD_VERSION_MARKERS:
            if marker in low or marker in text:
                evidence.append(f"命中关键词「{marker}」(字段#{idx})")
    return evidence


def _detect_version_conflict(current_tag: str, expected_tag: str) -> Optional[str]:
    """
    若当前版本 < 期望版本，返回冲突描述。
    否则返回 None。
    """
    cur = _parse_version_number(current_tag)
    exp = _parse_version_number(expected_tag)
    if cur and exp:
        # 对齐元组长度
        maxlen = max(len(cur), len(exp))
        cur_padded = cur + (0,) * (maxlen - len(cur))
        exp_padded = exp + (0,) * (maxlen - len(exp))
        if cur_padded < exp_padded:
            return f"当前版本 {current_tag} 早于期望版本 {expected_tag}"
    return None


class VersionReviewEngine:
    """版本比对引擎"""

    def __init__(
        self,
        expected_versions: Optional[dict[str, str]] = None,
        delivery_refs: Optional[set[str]] = None,
    ):
        self.expected_versions = expected_versions or {}
        self.delivery_refs = delivery_refs or set()

    def review(self, track: TrackRow, allow_suspend: bool = True) -> None:
        """对单条曲目执行版本复核，结果直接写入 track 对象

        状态保护（优先级从高到低，高优先级状态低优先级不得覆盖）：
          1. MANUAL_OK / MANUAL_REJECT  —— 有人工批注，引擎绝不改状态
          2. SUSPENDED                   —— 历史挂起/本次检测出的旧版母带，必须人工批注解锁
          3. BAD_ROW / SKIPPED           —— 坏行/跳过行，不做复核
          4. PENDING / PROCESSED         —— 引擎可正常判定
        """
        # ===== 高优先级状态保护：绝不改动 =====
        if track.manual_annotation and track.status in (
            ReviewStatus.MANUAL_OK,
            ReviewStatus.MANUAL_REJECT,
        ):
            # 只补交付匹配和旧版证据做展示，绝不改状态
            if track.delivery_ref and track.delivery_ref in self.delivery_refs:
                track.delivery_matched = True
            if not track.delivery_matched:
                if _has_delivery_signal(track.remark, track.delivery_ref):
                    track.delivery_matched = True
            return

        # 已被人工 ok/reject，但 apply_annotation 没写对 status —— 补一下保护
        if track.status in (ReviewStatus.MANUAL_OK, ReviewStatus.MANUAL_REJECT):
            if track.delivery_ref and track.delivery_ref in self.delivery_refs:
                track.delivery_matched = True
            return

        # 坏行 / 跳过行：不做版本判断
        if track.status in (ReviewStatus.BAD_ROW, ReviewStatus.SKIPPED):
            return

        # SUSPENDED：绝不自动解除。只追加新证据到证据链里，不改状态。
        suspended = track.status == ReviewStatus.SUSPENDED

        title = track.track_title
        version_tag = track.version_tag
        remark = track.remark
        delivery_ref = track.delivery_ref

        # 匹配交付清单
        if delivery_ref and delivery_ref in self.delivery_refs:
            track.delivery_matched = True
        if not track.delivery_matched:
            if _has_delivery_signal(remark, delivery_ref):
                track.delivery_matched = True

        # 非片头曲目：不做版本比对，标记 NOT_INTRO
        if not _looks_like_intro(title, remark):
            track.version_judgment = VersionJudgment.NOT_INTRO
            if suspended:
                # 非片头但被挂起（一般不会），保留挂起，只补展示信息
                return
            if track.authorization and track.authorization.has_authorization:
                if track.delivery_matched:
                    track.mark_processed()
            return

        # 片头曲目：进行版本判断
        evidence: list[str] = []

        # 1. 旧版标记关键词命中
        marker_hits = _has_old_marker(version_tag, remark, title)
        evidence.extend(marker_hits)

        # 2. 版本号冲突
        expected = self.expected_versions.get(title, "")
        conflict = None
        if version_tag and expected:
            conflict = _detect_version_conflict(version_tag, expected)
            if conflict:
                evidence.append(conflict)

        # 3. 授权/排练备注
        auth_ok = bool(track.authorization and track.authorization.has_authorization)
        rehearsal_ok = bool(
            track.authorization and (
                "排练" in (track.authorization.raw_text or "")
                or "rehearsal" in (track.authorization.raw_text or "").lower()
                or "彩排" in (track.authorization.raw_text or "")
            )
        )

        # ===== 挂起保护：有新证据只追加，不转状态 =====
        if suspended:
            if evidence:
                seen = set(track.version_evidence)
                for ev in evidence:
                    if ev not in seen:
                        track.version_evidence.append(ev)
            if evidence and (marker_hits or conflict):
                track.version_judgment = VersionJudgment.OLD_MASTER
            # 绝不改状态 → SUSPENDED 必须人工批注解锁
            return

        # 有明确证据判定为旧版母带 → 本次新挂起
        if evidence and (marker_hits or conflict):
            track.version_judgment = VersionJudgment.OLD_MASTER
            if allow_suspend:
                expected_ver = expected or "（未指定）"
                track.mark_suspended(
                    reason=f"疑似旧版母带混入: {'；'.join(evidence)}",
                    evidence=evidence,
                )
            else:
                track.status = ReviewStatus.PENDING
            return

        # 无旧版证据，检查是否具备通过条件
        if version_tag and not marker_hits:
            track.version_judgment = VersionJudgment.MASTER
            track.version_evidence.append(f"版本标签：{version_tag}")
        else:
            track.version_judgment = VersionJudgment.UNKNOWN
            track.version_evidence.append("未找到明确版本标签")

        version_ok = track.version_judgment in (VersionJudgment.MASTER, VersionJudgment.NOT_INTRO)
        if version_ok and (auth_ok or rehearsal_ok) and track.delivery_matched:
            track.mark_processed()
        elif version_ok and (auth_ok or rehearsal_ok) and not track.delivery_matched:
            track.status = ReviewStatus.PENDING
            track.version_evidence.append("未匹配交付清单编号")
        else:
            track.status = ReviewStatus.PENDING
            missing = []
            if not version_ok:
                missing.append("版本判定不通过")
            if not auth_ok and not rehearsal_ok:
                missing.append("缺授权/排练备注")
            if not track.delivery_matched:
                missing.append("未匹配交付清单")
            if missing:
                track.version_evidence.append("待补：" + "、".join(missing))


def infer_expected_versions(tracks: list[TrackRow]) -> dict[str, str]:
    """
    从曲目表中推测每个曲目的「期望版本」。
    规则：同名曲目中版本号最大者即为期望版本。
    """
    best: dict[str, tuple] = {}
    result: dict[str, str] = {}
    for t in tracks:
        title = t.track_title
        if not title:
            continue
        ver = _parse_version_number(t.version_tag)
        if ver is None:
            continue
        if title not in best or ver > best[title]:
            best[title] = ver
            result[title] = t.version_tag
    return result
