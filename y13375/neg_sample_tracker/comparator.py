from .tracker import NegSampleTracker
from .constants import STATUS_LABELS, DECISION_LABELS


class RunComparator:
    def __init__(self, db_path=None):
        self.db_path = db_path
        self.tracker = NegSampleTracker(db_path)

    def compare_runs(self, run_id_a, run_id_b):
        """
        对比两条负采样任务结果。
        保留两条记录的人工判断，互不覆盖。
        """
        data_a = self.tracker.get_run(run_id_a)
        data_b = self.tracker.get_run(run_id_b)

        if not data_a or not data_b:
            missing = []
            if not data_a:
                missing.append(run_id_a)
            if not data_b:
                missing.append(run_id_b)
            return {
                "success": False,
                "error": f"未找到运行记录：{', '.join(missing)}",
            }

        feature_diff = self._compare_features(
            data_a["feature_snapshots"],
            data_b["feature_snapshots"],
        )
        param_diff = self._compare_params(
            data_a["param_changes"],
            data_b["param_changes"],
        )
        decision_diff = self._compare_decisions(
            data_a["manual_decisions"],
            data_b["manual_decisions"],
        )

        summary = self._build_compare_summary(
            data_a["run"], data_b["run"],
            feature_diff, param_diff, decision_diff,
        )

        return {
            "success": True,
            "run_a": {
                "run_id": run_id_a,
                "status": data_a["run"]["status"],
                "status_label": STATUS_LABELS.get(
                    data_a["run"]["status"], data_a["run"]["status"]
                ),
                "model_version": data_a["run"].get("model_version"),
                "decision_count": len(data_a["manual_decisions"]),
            },
            "run_b": {
                "run_id": run_id_b,
                "status": data_b["run"]["status"],
                "status_label": STATUS_LABELS.get(
                    data_b["run"]["status"], data_b["run"]["status"]
                ),
                "model_version": data_b["run"].get("model_version"),
                "decision_count": len(data_b["manual_decisions"]),
            },
            "feature_diff": feature_diff,
            "param_diff": param_diff,
            "decision_diff": decision_diff,
            "summary": summary,
        }

    def _compare_features(self, snaps_a, snaps_b):
        feats_a = {s["feature_name"]: s for s in snaps_a}
        feats_b = {s["feature_name"]: s for s in snaps_b}

        all_names = set(feats_a.keys()) | set(feats_b.keys())

        added = []
        removed = []
        changed = []
        unchanged = []
        dirty_a = []
        dirty_b = []

        for name in all_names:
            in_a = name in feats_a
            in_b = name in feats_b

            if in_a and not in_b:
                removed.append(name)
            elif not in_a and in_b:
                added.append(name)
            else:
                val_a = feats_a[name]["feature_value"]
                val_b = feats_b[name]["feature_value"]
                if val_a == val_b:
                    unchanged.append(name)
                else:
                    changed.append({
                        "feature_name": name,
                        "value_a": val_a,
                        "value_b": val_b,
                    })

            if in_a and feats_a[name]["is_raw_dirty"]:
                dirty_a.append(name)
            if in_b and feats_b[name]["is_raw_dirty"]:
                dirty_b.append(name)

        return {
            "total_a": len(snaps_a),
            "total_b": len(snaps_b),
            "added": added,
            "removed": removed,
            "changed": changed,
            "unchanged": unchanged,
            "dirty_in_a": dirty_a,
            "dirty_in_b": dirty_b,
        }

    def _compare_params(self, changes_a, changes_b):
        params_a = {p["param_name"]: p for p in changes_a}
        params_b = {p["param_name"]: p for p in changes_b}

        all_names = set(params_a.keys()) | set(params_b.keys())

        diff = []
        for name in all_names:
            in_a = name in params_a
            in_b = name in params_b
            if in_a and in_b:
                old_a = params_a[name]["old_value"]
                new_a = params_a[name]["new_value"]
                old_b = params_b[name]["old_value"]
                new_b = params_b[name]["new_value"]
                if old_a != old_b or new_a != new_b:
                    diff.append({
                        "param_name": name,
                        "old_a": old_a,
                        "new_a": new_a,
                        "old_b": old_b,
                        "new_b": new_b,
                    })

        return {
            "changes_count_a": len(changes_a),
            "changes_count_b": len(changes_b),
            "diffs": diff,
        }

    def _compare_decisions(self, decs_a, decs_b):
        latest_a = decs_a[0] if decs_a else None
        latest_b = decs_b[0] if decs_b else None

        return {
            "count_a": len(decs_a),
            "count_b": len(decs_b),
            "latest_a": self._format_decision(latest_a) if latest_a else None,
            "latest_b": self._format_decision(latest_b) if latest_b else None,
            "note": "两条记录的人工判断各自保留，互不覆盖",
        }

    def _format_decision(self, dec):
        return {
            "decision": dec["decision"],
            "decision_label": DECISION_LABELS.get(
                dec["decision"], dec["decision"]
            ),
            "note": dec.get("decision_note"),
            "decided_by": dec.get("decided_by"),
            "model_version": dec.get("model_version_snapshot"),
            "created_at": dec["created_at"],
        }

    def _build_compare_summary(self, run_a, run_b, feature_diff,
                                param_diff, decision_diff):
        lines = []
        lines.append(f"对比 {run_a['run_id']} vs {run_b['run_id']}")
        lines.append("")

        lines.append("特征快照差异：")
        lines.append(f"  A: {feature_diff['total_a']} 条，B: {feature_diff['total_b']} 条")
        lines.append(f"  新增：{len(feature_diff['added'])} 条")
        lines.append(f"  移除：{len(feature_diff['removed'])} 条")
        lines.append(f"  值变化：{len(feature_diff['changed'])} 条")
        lines.append(f"  无变化：{len(feature_diff['unchanged'])} 条")
        if feature_diff["dirty_in_a"]:
            lines.append(f"  A 中有脏数据：{', '.join(feature_diff['dirty_in_a'])}")
        if feature_diff["dirty_in_b"]:
            lines.append(f"  B 中有脏数据：{', '.join(feature_diff['dirty_in_b'])}")
        lines.append("")

        lines.append("参数变化差异：")
        lines.append(f"  A: {param_diff['changes_count_a']} 次，"
                     f"B: {param_diff['changes_count_b']} 次")
        lines.append(f"  不一致参数：{len(param_diff['diffs'])} 个")
        lines.append("")

        lines.append("人工判断：")
        lines.append(f"  A: {decision_diff['count_a']} 条历史判断")
        lines.append(f"  B: {decision_diff['count_b']} 条历史判断")
        lines.append(f"  （注：两条记录判断各自保留，互不覆盖）")

        return "\n".join(lines)

    def format_compare_text(self, compare_result):
        """格式化对比结果为可读文本。"""
        if not compare_result.get("success"):
            return f"对比失败：{compare_result.get('error', '未知错误')}"

        lines = []
        lines.append("=" * 60)
        lines.append("负采样任务对比报告")
        lines.append("=" * 60)
        lines.append("")

        a = compare_result["run_a"]
        b = compare_result["run_b"]
        lines.append(f"A 端：{a['run_id']}")
        lines.append(f"  状态：{a['status_label']}")
        lines.append(f"  模型版本：{a['model_version'] or '未填写'}")
        lines.append(f"  人工判断次数：{a['decision_count']}")
        lines.append("")
        lines.append(f"B 端：{b['run_id']}")
        lines.append(f"  状态：{b['status_label']}")
        lines.append(f"  模型版本：{b['model_version'] or '未填写'}")
        lines.append(f"  人工判断次数：{b['decision_count']}")
        lines.append("")

        fd = compare_result["feature_diff"]
        lines.append("-" * 60)
        lines.append("特征快照对比")
        lines.append("-" * 60)
        lines.append(f"数量：A 端 {fd['total_a']} 条，B 端 {fd['total_b']} 条")
        lines.append("")

        if fd["added"]:
            lines.append(f"新增特征（B 端有，A 端无）：{len(fd['added'])} 条")
            for name in fd["added"]:
                lines.append(f"  + {name}")
            lines.append("")

        if fd["removed"]:
            lines.append(f"移除特征（A 端有，B 端无）：{len(fd['removed'])} 条")
            for name in fd["removed"]:
                lines.append(f"  - {name}")
            lines.append("")

        if fd["changed"]:
            lines.append(f"值变化特征：{len(fd['changed'])} 条")
            for item in fd["changed"]:
                lines.append(
                    f"  ~ {item['feature_name']}: "
                    f"{item['value_a']} → {item['value_b']}"
                )
            lines.append("")

        if fd["dirty_in_a"] or fd["dirty_in_b"]:
            lines.append("脏数据提醒：")
            if fd["dirty_in_a"]:
                lines.append(f"  A 端不完整数据：{', '.join(fd['dirty_in_a'])}")
            if fd["dirty_in_b"]:
                lines.append(f"  B 端不完整数据：{', '.join(fd['dirty_in_b'])}")
            lines.append("")

        pd_ = compare_result["param_diff"]
        lines.append("-" * 60)
        lines.append("参数变化对比")
        lines.append("-" * 60)
        lines.append(f"变化次数：A 端 {pd_['changes_count_a']} 次，"
                     f"B 端 {pd_['changes_count_b']} 次")
        if pd_["diffs"]:
            lines.append(f"不一致参数：{len(pd_['diffs'])} 个")
            for d in pd_["diffs"]:
                lines.append(
                    f"  - {d['param_name']}: "
                    f"A({d['old_a']}→{d['new_a']}) vs "
                    f"B({d['old_b']}→{d['new_b']})"
                )
        lines.append("")

        dd = compare_result["decision_diff"]
        lines.append("-" * 60)
        lines.append("人工判断对比")
        lines.append("-" * 60)
        lines.append(f"A 端历史判断：{dd['count_a']} 条")
        if dd["latest_a"]:
            la = dd["latest_a"]
            lines.append(f"  最新：{la['decision_label']}"
                         f"（{la['model_version'] or '版本未知'}）")
            if la["note"]:
                lines.append(f"  备注：{la['note']}")
        lines.append("")
        lines.append(f"B 端历史判断：{dd['count_b']} 条")
        if dd["latest_b"]:
            lb = dd["latest_b"]
            lines.append(f"  最新：{lb['decision_label']}"
                         f"（{lb['model_version'] or '版本未知'}）")
            if lb["note"]:
                lines.append(f"  备注：{lb['note']}")
        lines.append("")
        lines.append("提示：两条记录的人工判断各自保留，互不覆盖。")
        lines.append("模型版本更换后，旧判断仍然可以追溯。")
        lines.append("")
        lines.append("=" * 60)

        return "\n".join(lines)
