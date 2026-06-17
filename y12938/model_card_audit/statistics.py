import os
import json
import csv
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional, Tuple

from .database import DatabaseManager
from .exporter import TYPE_LABEL, SEVERITY_LABEL


class Statistics:
    def __init__(self, db: DatabaseManager):
        self.db = db

    def get_run_statistics(self, run_id: str) -> Dict[str, Any]:
        with self.db._get_conn() as conn:
            run = conn.execute(
                "SELECT r.*, t.batch_name as training_name, e.batch_name as evaluation_name "
                "FROM audit_runs r "
                "JOIN batches t ON r.training_batch_id = t.batch_id "
                "JOIN batches e ON r.evaluation_batch_id = e.batch_id "
                "WHERE r.run_id=?",
                (run_id,)
            ).fetchone()
            if not run:
                raise ValueError(f"Run not found: {run_id}")
            conclusions = conn.execute(
                "SELECT c.*, m1.file_name as training_file, m2.file_name as evaluation_file, "
                "m1.metadata_json as t_meta, m2.metadata_json as e_meta "
                "FROM audit_conclusions c "
                "LEFT JOIN materials m1 ON c.training_material_id = m1.material_id "
                "LEFT JOIN materials m2 ON c.evaluation_material_id = m2.material_id "
                "WHERE c.run_id=? AND c.is_latest=1",
                (run_id,)
            ).fetchall()
        run_d = dict(run)
        con_list = [dict(c) for c in conclusions]
        by_type = Counter(c["conclusion_type"] for c in con_list)
        by_severity = Counter(c["severity"] for c in con_list)
        total = len(con_list)
        pass_count = by_type.get("pass", 0)
        topic_counter: Counter = Counter()
        topic_fail_counter: Counter = Counter()
        for c in con_list:
            topics = set()
            for meta_key in ("t_meta", "e_meta"):
                raw = c.get(meta_key)
                if not raw:
                    continue
                try:
                    meta = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    continue
                for k in ("topic", "category", "subject", "knowledge_point"):
                    if k in meta:
                        v = meta[k]
                        if isinstance(v, list):
                            topics.update(str(x) for x in v)
                        elif v:
                            topics.add(str(v))
            if not topics:
                topics.add("(未分类)")
            for t in topics:
                topic_counter[t] += 1
                if c["conclusion_type"] in ("fail", "missing_feedback", "critical_error"):
                    topic_fail_counter[t] += 1
        topic_pass_rate = {}
        for t, cnt in topic_counter.most_common():
            fails = topic_fail_counter.get(t, 0)
            topic_pass_rate[t] = {
                "total": cnt,
                "fails": fails,
                "pass_rate": round((cnt - fails) / cnt, 4) if cnt else 0.0
            }
        return {
            "run_id": run_id,
            "run_at": run_d["run_at"],
            "status": run_d["status"],
            "training_batch": {"id": run_d["training_batch_id"], "name": run_d["training_name"]},
            "evaluation_batch": {"id": run_d["evaluation_batch_id"], "name": run_d["evaluation_name"]},
            "total": total,
            "pass_count": pass_count,
            "pass_rate": round(pass_count / total, 4) if total else 0.0,
            "by_type": dict(by_type),
            "by_type_labeled": {TYPE_LABEL.get(k, k): v for k, v in by_type.items()},
            "by_severity": dict(by_severity),
            "by_severity_labeled": {SEVERITY_LABEL.get(k, k): v for k, v in by_severity.items()},
            "topic_distribution": topic_pass_rate
        }

    def get_runs_in_range(self, start: Optional[str] = None,
                          end: Optional[str] = None,
                          limit: int = 100) -> List[Dict[str, Any]]:
        with self.db._get_conn() as conn:
            q = """
                SELECT r.*, t.batch_name as training_name, e.batch_name as evaluation_name
                FROM audit_runs r
                JOIN batches t ON r.training_batch_id = t.batch_id
                JOIN batches e ON r.evaluation_batch_id = e.batch_id
                WHERE r.superseded_by IS NULL AND r.status != 'failed'
            """
            args: List[Any] = []
            if start:
                q += " AND r.run_at >= ?"
                args.append(start)
            if end:
                q += " AND r.run_at <= ?"
                args.append(end)
            q += " ORDER BY r.run_at DESC LIMIT ?"
            args.append(limit)
            rows = conn.execute(q, args).fetchall()
        return [dict(r) for r in rows]

    def aggregate_distribution(self, run_ids: Optional[List[str]] = None,
                               start: Optional[str] = None,
                               end: Optional[str] = None) -> Dict[str, Any]:
        runs = []
        if run_ids:
            for rid in run_ids:
                try:
                    runs.append(self.get_run_statistics(rid))
                except ValueError:
                    continue
        else:
            run_rows = self.get_runs_in_range(start, end)
            for rr in run_rows:
                try:
                    runs.append(self.get_run_statistics(rr["run_id"]))
                except ValueError:
                    continue
        if not runs:
            return {"error": "no_runs", "message": "指定范围内没有审计运行记录"}
        agg_by_type: Counter = Counter()
        agg_by_severity: Counter = Counter()
        total = 0
        pass_count = 0
        topic_agg: Dict[str, List[int]] = defaultdict(lambda: [0, 0])
        for r in runs:
            total += r["total"]
            pass_count += r["pass_count"]
            agg_by_type.update(r["by_type"])
            agg_by_severity.update(r["by_severity"])
            for t, d in r["topic_distribution"].items():
                topic_agg[t][0] += d["total"]
                topic_agg[t][1] += d["fails"]
        topic_distribution = {}
        for t, (cnt, fails) in sorted(topic_agg.items(), key=lambda x: -x[1][0]):
            topic_distribution[t] = {
                "total": cnt,
                "fails": fails,
                "pass_rate": round((cnt - fails) / cnt, 4) if cnt else 0.0
            }
        skewed_topics = {}
        for t, d in topic_distribution.items():
            if t == "(未分类)":
                continue
            if d["pass_rate"] < 0.6 or d["total"] > total / max(len(topic_distribution), 1) * 1.5:
                skewed_topics[t] = d
        runs.sort(key=lambda x: x["run_at"])
        trend = [
            {
                "run_id": r["run_id"],
                "run_at": r["run_at"],
                "training": r["training_batch"]["name"],
                "evaluation": r["evaluation_batch"]["name"],
                "total": r["total"],
                "pass_rate": r["pass_rate"]
            }
            for r in runs
        ]
        return {
            "period": {"start": start, "end": end},
            "runs_analyzed": len(runs),
            "total_conclusions": total,
            "overall_pass_rate": round(pass_count / total, 4) if total else 0.0,
            "by_type": dict(agg_by_type),
            "by_type_labeled": {TYPE_LABEL.get(k, k): v for k, v in agg_by_type.items()},
            "by_severity": dict(agg_by_severity),
            "by_severity_labeled": {SEVERITY_LABEL.get(k, k): v for k, v in agg_by_severity.items()},
            "topic_distribution": topic_distribution,
            "attention_topics": skewed_topics,
            "trend": trend,
            "interpretation": self._generate_interpretation(
                total, pass_count, dict(agg_by_type), topic_distribution, skewed_topics, trend
            )
        }

    def _generate_interpretation(
        self,
        total: int,
        pass_count: int,
        by_type: Dict[str, int],
        topic_distribution: Dict[str, Dict[str, Any]],
        attention_topics: Dict[str, Dict[str, Any]],
        trend: List[Dict[str, Any]]
    ) -> str:
        lines = []
        rate = (pass_count / total) if total else 0.0
        lines.append(f"共分析 {len(trend)} 次审计运行，{total} 份结论。")
        if rate >= 0.85:
            lines.append(f"整体通过率 {rate * 100:.1f}%，处于良好区间。")
        elif rate >= 0.6:
            lines.append(f"整体通过率 {rate * 100:.1f}%，还有优化空间。")
        else:
            lines.append(f"整体通过率 {rate * 100:.1f}%，需要重点关注。")
        for t in ("missing_feedback", "fail", "skewed_evaluation", "pending_confirmation"):
            c = by_type.get(t, 0)
            if c:
                ratio = c / total * 100
                name = TYPE_LABEL.get(t, t)
                lines.append(f"「{name}」占比 {ratio:.1f}% ({c}/{total})。")
        if attention_topics:
            lines.append(f"需要关注的知识点有 {len(attention_topics)} 个：")
            for t, d in list(attention_topics.items())[:5]:
                lines.append(
                    f"  - {t}: 通过率 {d['pass_rate'] * 100:.1f}% "
                    f"({d['total'] - d['fails']}/{d['total']})"
                )
        if len(trend) >= 2:
            first = trend[0]["pass_rate"]
            last = trend[-1]["pass_rate"]
            delta = last - first
            if abs(delta) < 0.05:
                lines.append(f"趋势：通过率基本稳定（{first * 100:.0f}% → {last * 100:.0f}%）。")
            elif delta > 0:
                lines.append(f"趋势：通过率逐次提升 +{delta * 100:.1f} 个百分点。")
            else:
                lines.append(f"趋势：通过率下降 {abs(delta) * 100:.1f} 个百分点，建议分析原因。")
        return "\n".join(lines)

    def export_monthly_report(self, output_dir: str,
                              year: Optional[int] = None,
                              month: Optional[int] = None) -> Dict[str, Any]:
        now = datetime.now()
        y = year or now.year
        m = month or now.month
        start = f"{y:04d}-{m:02d}-01T00:00:00"
        if m == 12:
            next_start = f"{y + 1:04d}-01-01T00:00:00"
        else:
            next_start = f"{y:04d}-{m + 1:02d}-01T00:00:00"
        end = next_start
        agg = self.aggregate_distribution(start=start, end=end)
        os.makedirs(output_dir, exist_ok=True)
        base_name = f"monthly_{y:04d}_{m:02d}"
        json_path = os.path.join(output_dir, f"{base_name}.json")
        csv_path = os.path.join(output_dir, f"{base_name}.csv")
        md_path = os.path.join(output_dir, f"{base_name}.md")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(agg, f, ensure_ascii=False, indent=2)
        self._agg_to_csv(agg, csv_path)
        self._agg_to_markdown(agg, md_path, title=f"{y}年{m}月 模型卡生成审计月报")
        return {"json": json_path, "csv": csv_path, "md": md_path, "agg": agg}

    def _agg_to_csv(self, agg: Dict[str, Any], csv_path: str) -> None:
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["# 模型卡生成审计 - 分布统计"])
            writer.writerow(["审计运行数", agg.get("runs_analyzed", 0)])
            writer.writerow(["结论总数", agg.get("total_conclusions", 0)])
            writer.writerow(["整体通过率", f"{agg.get('overall_pass_rate', 0) * 100:.1f}%"])
            writer.writerow([])
            writer.writerow(["# 按类型分布"])
            for k, v in agg.get("by_type_labeled", {}).items():
                writer.writerow([k, v])
            writer.writerow([])
            writer.writerow(["# 按知识点分布"])
            writer.writerow(["知识点", "总数", "失败数", "通过率"])
            for t, d in agg.get("topic_distribution", {}).items():
                writer.writerow([t, d["total"], d["fails"], f"{d['pass_rate'] * 100:.1f}%"])
            writer.writerow([])
            writer.writerow(["# 趋势"])
            writer.writerow(["运行ID", "运行时间", "训练批次", "评测批次", "结论数", "通过率"])
            for item in agg.get("trend", []):
                writer.writerow([
                    item["run_id"], item["run_at"], item["training"],
                    item["evaluation"], item["total"], f"{item['pass_rate'] * 100:.1f}%"
                ])

    def _agg_to_markdown(self, agg: Dict[str, Any], md_path: str, title: str) -> None:
        lines = [f"# {title}", ""]
        if agg.get("period"):
            p = agg["period"]
            lines.append(f"**统计区间**: {p.get('start', '')} ~ {p.get('end', '')}  ")
        lines.append(f"**运行次数**: {agg.get('runs_analyzed', 0)}  ")
        lines.append(f"**结论总数**: {agg.get('total_conclusions', 0)}  ")
        lines.append(f"**整体通过率**: {agg.get('overall_pass_rate', 0) * 100:.1f}%  ")
        lines.extend(["", "## 解读", "", "```", agg.get("interpretation", ""), "```", ""])
        lines.extend(["## 按类型分布", "", "| 类型 | 数量 |", "|------|------|"])
        for k, v in agg.get("by_type_labeled", {}).items():
            lines.append(f"| {k} | {v} |")
        lines.extend(["", "## 知识点通过率 TOP 15", "",
                      "| 知识点 | 总数 | 失败 | 通过率 |",
                      "|--------|------|------|--------|"])
        topics = sorted(
            agg.get("topic_distribution", {}).items(),
            key=lambda x: x[1]["pass_rate"]
        )[:15]
        for t, d in topics:
            lines.append(f"| {t} | {d['total']} | {d['fails']} | {d['pass_rate'] * 100:.1f}% |")
        lines.extend(["", "## 趋势", "",
                      "| 运行时间 | 训练批次 | 评测批次 | 结论数 | 通过率 |",
                      "|----------|----------|----------|--------|--------|"])
        for item in agg.get("trend", []):
            lines.append(
                f"| {item['run_at']} | {item['training']} | {item['evaluation']} | "
                f"{item['total']} | {item['pass_rate'] * 100:.1f}% |"
            )
        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
