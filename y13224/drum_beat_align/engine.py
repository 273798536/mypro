import json
from datetime import datetime
from drum_beat_align import models


def _human_reason(exception_type, beat_label, performer, expected, actual, allocated, deviation, screenshot_sender=None, is_late=False, legacy_version=None, screenshot_statement=None):
    if exception_type == "count_mismatch":
        base = f"「{beat_label}」节拍预期 {expected} 拍，实际 {actual} 拍，差 {abs(deviation)} 拍"
        if is_late:
            base += "（该截图附件晚到，数据可能不完整）"
        return base
    elif exception_type == "allocation_mismatch":
        base = f"「{beat_label}」{performer} 分配 {allocated} 拍，与预期 {expected} 拍不一致，差 {abs(deviation)} 拍"
        return base
    elif exception_type == "late_attachment":
        return f"「{beat_label}」来自 {screenshot_sender} 的截图附件晚到，节拍数据需复核"
    elif exception_type == "legacy_master_conflict":
        base = f"「{beat_label}」引用旧版母带 v{legacy_version}"
        if screenshot_statement:
            base += f"，排练群原始说法："{screenshot_statement}""
        return base
    elif exception_type == "missing_actual":
        base = f"「{beat_label}」未录到实际节拍数"
        if is_late:
            base += "（附件晚到，可能尚未录入）"
        return base
    return f"「{beat_label}」存在异常"


def _check_beat_alignment(beat, allocation, screenshot, legacy_master, batch_id):
    results = []

    beat_id = beat["id"]
    allocation_id = allocation["id"]
    expected = beat["expected_count"]
    actual = beat.get("actual_count")
    allocated = allocation["allocated_count"]
    beat_label = beat.get("beat_label") or f"节拍#{beat['beat_index']}"
    performer = allocation["performer"]
    is_late = screenshot and screenshot.get("is_late_attachment")
    screenshot_sender = screenshot.get("sender") if screenshot else None
    screenshot_id = screenshot["id"] if screenshot else None
    legacy_version = legacy_master.get("version") if legacy_master else None
    screenshot_statement = legacy_master.get("screenshot_original_statement") if legacy_master else None

    if actual is None:
        ar_id = models.insert_alignment_result(beat_id, allocation_id, "pending")
        exc_id = models.insert_exception(
            alignment_result_id=ar_id,
            batch_id=batch_id,
            exception_type="missing_actual",
            reason=_human_reason("missing_actual", beat_label, performer, expected, actual, allocated, 0, screenshot_sender, is_late, legacy_version, screenshot_statement),
            screenshot_id=screenshot_id,
            screenshot_statement=screenshot_statement,
            legacy_master_version=legacy_version,
        )
        results.append({"alignment_id": ar_id, "exception_id": exc_id, "type": "missing_actual"})
        return results

    deviation = actual - expected

    if abs(deviation) > 0.001:
        ar_id = models.insert_alignment_result(beat_id, allocation_id, "misaligned", deviation=deviation)
        exc_type = "count_mismatch"
        exc_id = models.insert_exception(
            alignment_result_id=ar_id,
            batch_id=batch_id,
            exception_type=exc_type,
            reason=_human_reason(exc_type, beat_label, performer, expected, actual, allocated, deviation, screenshot_sender, is_late, legacy_version, screenshot_statement),
            screenshot_id=screenshot_id,
            screenshot_statement=screenshot_statement,
            legacy_master_version=legacy_version,
        )
        results.append({"alignment_id": ar_id, "exception_id": exc_id, "type": exc_type})

    alloc_deviation = allocated - expected
    if abs(alloc_deviation) > 0.001:
        ar_id = models.insert_alignment_result(beat_id, allocation_id, "misaligned", deviation=alloc_deviation)
        exc_type = "allocation_mismatch"
        exc_id = models.insert_exception(
            alignment_result_id=ar_id,
            batch_id=batch_id,
            exception_type=exc_type,
            reason=_human_reason(exc_type, beat_label, performer, expected, actual, allocated, alloc_deviation, screenshot_sender, is_late, legacy_version, screenshot_statement),
            screenshot_id=screenshot_id,
            screenshot_statement=screenshot_statement,
            legacy_master_version=legacy_version,
        )
        results.append({"alignment_id": ar_id, "exception_id": exc_id, "type": exc_type})

    if is_late:
        ar_id = models.insert_alignment_result(beat_id, allocation_id, "pending", deviation=0)
        exc_type = "late_attachment"
        exc_id = models.insert_exception(
            alignment_result_id=ar_id,
            batch_id=batch_id,
            exception_type=exc_type,
            reason=_human_reason(exc_type, beat_label, performer, expected, actual, allocated, 0, screenshot_sender, is_late, legacy_version, screenshot_statement),
            screenshot_id=screenshot_id,
            screenshot_statement=screenshot_statement,
            legacy_master_version=legacy_version,
        )
        results.append({"alignment_id": ar_id, "exception_id": exc_id, "type": exc_type})

    if legacy_master and legacy_version:
        ar_id = models.insert_alignment_result(beat_id, allocation_id, "misaligned", deviation=0)
        exc_type = "legacy_master_conflict"
        exc_id = models.insert_exception(
            alignment_result_id=ar_id,
            batch_id=batch_id,
            exception_type=exc_type,
            reason=_human_reason(exc_type, beat_label, performer, expected, actual, allocated, 0, screenshot_sender, is_late, legacy_version, screenshot_statement),
            screenshot_id=screenshot_id,
            screenshot_statement=screenshot_statement,
            legacy_master_version=legacy_version,
        )
        results.append({"alignment_id": ar_id, "exception_id": exc_id, "type": exc_type})

    if not results:
        ar_id = models.insert_alignment_result(beat_id, allocation_id, "aligned", deviation=0)

    return results


def run_alignment(screenshots_data):
    batch_id = models.create_batch()

    for ss in screenshots_data:
        sid = models.insert_screenshot(
            batch_id=batch_id,
            file_name=ss["file_name"],
            sender=ss["sender"],
            sent_at=ss["sent_at"],
            is_late=ss.get("is_late", False),
            parsed_text=ss.get("parsed_text"),
        )

        for beat_data in ss.get("beats", []):
            legacy_master = beat_data.get("legacy_master")
            lm_id = None
            if legacy_master:
                lm_id = models.insert_legacy_master(
                    version=legacy_master["version"],
                    label=legacy_master["label"],
                    screenshot_id=sid,
                    screenshot_original_statement=legacy_master.get("screenshot_original_statement"),
                )

            bid = models.insert_drum_beat(
                screenshot_id=sid,
                beat_index=beat_data["beat_index"],
                beat_type=beat_data["beat_type"],
                expected_count=beat_data["expected_count"],
                actual_count=beat_data.get("actual_count"),
                beat_label=beat_data.get("beat_label"),
                legacy_master_id=lm_id,
            )

            for alloc_data in beat_data.get("allocations", []):
                aid = models.insert_allocation(
                    beat_id=bid,
                    performer=alloc_data["performer"],
                    allocated_count=alloc_data["allocated_count"],
                    allocation_source=alloc_data["allocation_source"],
                )

                _check_beat_alignment(
                    beat={"id": bid, "beat_index": beat_data["beat_index"], "beat_type": beat_data["beat_type"],
                          "expected_count": beat_data["expected_count"], "actual_count": beat_data.get("actual_count"),
                          "beat_label": beat_data.get("beat_label"), "legacy_master_id": lm_id},
                    allocation={"id": aid, "performer": alloc_data["performer"],
                                "allocated_count": alloc_data["allocated_count"],
                                "allocation_source": alloc_data["allocation_source"]},
                    screenshot={"id": sid, "sender": ss["sender"], "is_late_attachment": ss.get("is_late", False)},
                    legacy_master=legacy_master,
                    batch_id=batch_id,
                )

    models.complete_batch(batch_id)
    return batch_id
