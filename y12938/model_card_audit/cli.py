import os
import sys
import argparse
import json
import traceback
from typing import List, Optional

from .database import DatabaseManager
from .version_tracker import VersionTracker
from .audit_engine import AuditEngine
from .exporter import ExportManager
from .statistics import Statistics
from .errors import ActionableError, ErrorHandler


DEFAULT_DB_PATH = os.path.join(os.path.expanduser("~"), ".model_card_audit", "audit.db")


class CLI:
    def __init__(self, argv: Optional[List[str]] = None):
        self.argv = argv
        self.parser = self._build_parser()
        self._db: Optional[DatabaseManager] = None
        self._tracker: Optional[VersionTracker] = None
        self._engine: Optional[AuditEngine] = None
        self._exporter: Optional[ExportManager] = None
        self._stats: Optional[Statistics] = None

    @property
    def db(self) -> DatabaseManager:
        if self._db is None:
            self._db = DatabaseManager(self.args.db)
        return self._db

    @property
    def tracker(self) -> VersionTracker:
        if self._tracker is None:
            self._tracker = VersionTracker(self.db)
        return self._tracker

    @property
    def engine(self) -> AuditEngine:
        if self._engine is None:
            self._engine = AuditEngine(self.db, self.tracker)
        return self._engine

    @property
    def exporter(self) -> ExportManager:
        if self._exporter is None:
            self._exporter = ExportManager(self.db, self.engine)
        return self._exporter

    @property
    def stats(self) -> Statistics:
        if self._stats is None:
            self._stats = Statistics(self.db)
        return self._stats

    def _build_parser(self) -> argparse.ArgumentParser:
        p = argparse.ArgumentParser(
            prog="model-card-audit",
            description="模型卡生成审计 CLI — 训练样本/评测题库一致性审计工具",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog=(
                "常用工作流:\n"
                "  1) import --type training     --dir <训练样本目录>  --name 2026年6月V2\n"
                "  2) import --type evaluation   --dir <评测题库目录>  --name 2026年6月V2\n"
                "  3) import-feedback --batch-id <训练批次ID> --dir <人工反馈目录>\n"
                "  4) run --training <训练批次ID> --evaluation <评测批次ID> "
                "--output-dir ./output\n"
                "  5) list-runs  (日常入口：版本追踪)\n"
                "  6) monthly-report --output-dir ./reports\n"
            )
        )
        p.add_argument("--db", default=DEFAULT_DB_PATH,
                       help=f"SQLite 数据库路径，默认 {DEFAULT_DB_PATH}")
        sub = p.add_subparsers(dest="command", required=True, metavar="COMMAND")

        pi = sub.add_parser("import", help="导入批次（训练样本/评测题库）")
        pi.add_argument("--type", dest="batch_type", required=True,
                        choices=["training", "evaluation"], help="批次类型")
        pi.add_argument("--dir", dest="source_dir", required=True, help="输入目录")
        pi.add_argument("--name", dest="batch_name", default=None, help="批次名称")

        pf = sub.add_parser("import-feedback", help="导入人工反馈并关联到训练批次")
        pf.add_argument("--batch-id", required=True, help="关联的训练批次ID")
        pf.add_argument("--dir", dest="feedback_dir", required=True, help="人工反馈 JSON 目录")

        plb = sub.add_parser("list-batches", help="列出所有批次（版本追踪入口）")
        plb.add_argument("--type", dest="batch_type", choices=["training", "evaluation"],
                         default=None, help="按类型过滤")
        plb.add_argument("--all", dest="show_all", action="store_true",
                         help="显示已停用/被取代的批次")

        pb = sub.add_parser("show-batch", help="查看单个批次详情")
        pb.add_argument("--batch-id", required=True)

        plr = sub.add_parser("list-runs", help="列出审计运行记录（日常版本追踪入口）")
        plr.add_argument("--limit", type=int, default=20)

        pr = sub.add_parser("run", help="执行一次审计（核心子命令）")
        pr.add_argument("--training", dest="training_batch_id", required=True,
                        help="训练批次ID（可用 list-batches 查看）")
        pr.add_argument("--evaluation", dest="evaluation_batch_id", required=True,
                        help="评测批次ID")
        pr.add_argument("--input-dir", dest="input_dir", default=None,
                        help="原始输入目录（记录用，不重新读取）")
        pr.add_argument("--output-dir", dest="output_dir", required=True, help="报告输出目录")
        pr.add_argument("--force", action="store_true",
                        help="忽略内容哈希完全相同的历史运行，强制重新审计")
        pr.add_argument("--skip-duplicate-check", action="store_true",
                        help="不检查与上次结论的冲突（不推荐）")

        ps = sub.add_parser("show-run", help="查看单次审计运行的结论摘要")
        ps.add_argument("--run-id", required=True)
        ps.add_argument("--format", dest="fmt", choices=["console", "json", "csv", "md"],
                        default="console")
        ps.add_argument("--output-dir", default=None, help="导出到目录时使用（json/csv/md）")

        pm = sub.add_parser("monthly-report", help="生成月底/课前分布统计报告")
        pm.add_argument("--year", type=int, default=None)
        pm.add_argument("--month", type=int, default=None)
        pm.add_argument("--output-dir", dest="output_dir", required=True)

        padd = sub.add_parser("append-sample",
                              help="对现有训练批次追加材料（补录时用，不会冒出两份结论）")
        padd.add_argument("--batch-id", required=True, help="需要追加材料的批次ID")
        padd.add_argument("--dir", dest="source_dir", required=True, help="新增材料目录")

        return p

    def run(self) -> int:
        self.args = self.parser.parse_args(self.argv)
        try:
            handler = getattr(self, f"_cmd_{self.args.command.replace('-', '_')}", None)
            if handler is None:
                self.parser.error(f"Unknown command: {self.args.command}")
            handler()
            return 0
        except ActionableError as e:
            print(e.format_for_user(), file=sys.stderr)
            return 2
        except KeyboardInterrupt:
            print("\n中断。", file=sys.stderr)
            return 130
        except Exception as e:
            ae = ErrorHandler.internal_error(e)
            ae.details["traceback"] = traceback.format_exc().splitlines()[-5:]
            print(ae.format_for_user(), file=sys.stderr)
            return 1

    def _cmd_import(self) -> None:
        result = self.tracker.import_batch(
            self.args.source_dir, self.args.batch_type, self.args.batch_name
        )
        type_label = "训练样本" if self.args.batch_type == "training" else "评测题库"
        if not result.is_new:
            print(f"[导入-去重] {type_label}批次完全相同，复用已有批次: "
                  f"{result.batch_id}")
            print(f"  跳过 {result.skipped_duplicates} 份材料")
        else:
            print(f"[导入-{'新版本' if result.is_superseding else '新增'}] "
                  f"{type_label}批次: {result.batch_id}")
            print(f"  导入 {result.imported_count} 份材料")
            if result.is_superseding:
                print(f"  取代旧批次: {result.previous_batch_id} "
                      f"(旧批次共 {result.skipped_duplicates} 份材料，已标记 superseded)")
        print(f"\n材料清单（前5份）:")
        for i, m in enumerate(result.materials[:5]):
            print(f"  {i + 1}. [{m['material_type']}] {m['file_name']}")
        if len(result.materials) > 5:
            print(f"  ... 另有 {len(result.materials) - 5} 份略")

    def _cmd_import_feedback(self) -> None:
        stats = self.tracker.import_human_feedbacks(
            self.args.feedback_dir, self.args.batch_id
        )
        print(f"[导入人工反馈] 批次 {self.args.batch_id}")
        print(f"  成功: {len(stats['imported'])} 份")
        for fb in stats["imported"]:
            tag = "✓已关联材料" if fb["matched_material"] else "⚠未关联"
            print(f"    - [{fb['feedback_type']}] {tag} {fb['file']} ({fb['feedback_id']})")
        if stats["skipped"]:
            print(f"  跳过: {len(stats['skipped'])} 份")
            for s in stats["skipped"]:
                print(f"    - {s['file']}  ({s['reason']})")

    def _cmd_list_batches(self) -> None:
        status = None if self.args.show_all else "active"
        batches = self.tracker.list_batches(self.args.batch_type, status)
        type_map = {"training": "训练", "evaluation": "评测"}
        print(f"{'批次ID':<20} {'类型':<4} {'状态':<10} {'名称':<30} "
              f"{'数量':>4}  {'导入时间'}")
        print("-" * 100)
        for b in batches:
            print(
                f"{b['batch_id']:<20} {type_map.get(b['batch_type'], '?'):<4} "
                f"{b['status']:<10} {b['batch_name']:<30} "
                f"{b['material_count']:>4}  {b['imported_at']}"
            )
        if not batches:
            print("(无批次)")

    def _cmd_show_batch(self) -> None:
        d = self.tracker.get_batch_detail(self.args.batch_id)
        b = d["batch"]
        print(f"批次ID      : {b['batch_id']}")
        print(f"名称        : {b['batch_name']}")
        print(f"类型        : {'训练样本' if b['batch_type'] == 'training' else '评测题库'}")
        print(f"状态        : {b['status']}")
        print(f"材料数      : {b['material_count']}")
        print(f"内容哈希    : {b['content_hash'][:16]}...")
        print(f"来源目录    : {b['source_dir']}")
        print(f"导入时间    : {b['imported_at']}")
        if b["superseded_by"]:
            print(f"被取代为    : {b['superseded_by']}")
        print(f"\n材料清单 ({len(d['materials'])} 份):")
        for m in d["materials"]:
            print(f"  - [{m['material_type']:<16}] {m['file_name']}  ({m['material_id']})")
        if d["human_feedbacks"]:
            print(f"\n关联人工反馈 ({len(d['human_feedbacks'])} 份):")
            for fb in d["human_feedbacks"]:
                mat = fb["material_id"] or "（未关联）"
                print(f"  - [{fb['feedback_type']:<12}] {fb['file_path']} -> {mat}")

    def _cmd_list_runs(self) -> None:
        runs = self.tracker.list_runs(self.args.limit)
        print(f"{'运行ID':<20} {'状态':<8} {'训练批次':<24} {'评测批次':<24} {'运行时间'}")
        print("-" * 100)
        for r in runs:
            print(
                f"{r['run_id']:<20} {r['status']:<8} "
                f"{r['training_name'][:22]:<24} {r['evaluation_name'][:22]:<24} "
                f"{r['run_at']}"
            )
        if not runs:
            print("(还没有审计运行，先用 run 子命令执行一次吧)")

    def _cmd_run(self) -> None:
        input_dir = self.args.input_dir or os.path.dirname(self.args.output_dir)
        existing = None
        if not self.args.force:
            existing = self.tracker.find_existing_run(
                self.args.training_batch_id, self.args.evaluation_batch_id
            )
        if existing and not self.args.force:
            print(f"[审计-去重] 与历史运行 {existing['run_id']} 的输入完全一致，"
                  f"直接复用结果。")
            print(f"  如需重新审计，请加 --force。")
            run_id = existing["run_id"]
            output_dir = existing.get("output_dir") or self.args.output_dir
            payload = self.exporter._build_unified_payload(run_id)
            print(self.exporter.render_console_summary(payload))
            paths = self.exporter.export_all(run_id, output_dir)
            self._print_export_paths(paths)
            return

        run_id, _ = self.tracker.register_run(
            self.args.training_batch_id, self.args.evaluation_batch_id,
            input_dir, self.args.output_dir, force=self.args.force
        )
        print(f"[审计开始] run_id={run_id}")
        try:
            result = self.engine.run_audit(
                run_id, self.args.training_batch_id, self.args.evaluation_batch_id,
                force=self.args.skip_duplicate_check
            )
            self.engine.save_conclusions(result)
            status = "completed" if not result._errors else "partial"
            self.tracker.mark_run_status(run_id, status)
        except ActionableError:
            self.tracker.mark_run_status(run_id, "failed")
            raise
        except Exception as e:
            self.tracker.mark_run_status(run_id, "failed", f"{type(e).__name__}: {e}")
            raise

        # 结论已落库，统一从 DB 重建 payload，保证界面摘要与导出文件 100% 同源
        payload = self.exporter._build_unified_payload(run_id)
        print(self.exporter.render_console_summary(payload))
        paths = self.exporter.export_all(run_id, self.args.output_dir)
        self._print_export_paths(paths)

        if result._errors:
            print(f"\n⚠ 处理过程中出现 {len(result._errors)} 条可操作提示：")
            for i, e in enumerate(result._errors, 1):
                print(f"  [{i}] {e.code} - {e.message}")
                print(f"      建议: {e.suggestion}")

    def _print_export_paths(self, paths: dict) -> None:
        print("\n导出文件（与界面摘要同源）:")
        for k, v in paths.items():
            if k == "console":
                continue
            print(f"  - {k.upper()}: {v}")

    def _cmd_show_run(self) -> None:
        output_dir = self.args.output_dir or os.path.join(
            os.path.dirname(self.args.db), "runs", self.args.run_id
        )
        payload = self.exporter._build_unified_payload(self.args.run_id)
        if self.args.fmt == "console":
            print(self.exporter.render_console_summary(payload))
            return
        paths = self.exporter.export_all(self.args.run_id, output_dir)
        if self.args.fmt == "json":
            print(paths["json"])
            with open(paths["json"], "r", encoding="utf-8") as f:
                print(f.read())
        elif self.args.fmt == "csv":
            print(paths["csv"])
        elif self.args.fmt == "md":
            print(paths["md"])
            with open(paths["md"], "r", encoding="utf-8") as f:
                print(f.read())

    def _cmd_monthly_report(self) -> None:
        files = self.stats.export_monthly_report(
            self.args.output_dir, self.args.year, self.args.month
        )
        agg = files["agg"]
        print("=" * 60)
        y = self.args.year
        m = self.args.month
        from datetime import datetime as _dt
        now = _dt.now()
        print(f"📊 {y or now.year}年{m or now.month}月 模型卡生成审计月报")
        print("=" * 60)
        print(agg.get("interpretation", ""))
        print("\n📁 报告已导出:")
        for k in ("json", "csv", "md"):
            print(f"  - {k.upper()}: {files[k]}")

    def _cmd_append_sample(self) -> None:
        with self.db._get_conn() as conn:
            batch = conn.execute(
                "SELECT * FROM batches WHERE batch_id=?", (self.args.batch_id,)
            ).fetchone()
            if not batch:
                raise ErrorHandler.batch_not_found(self.args.batch_id, "训练/评测")
            batch_d = dict(batch)

        temp_tracker = VersionTracker(self.db)
        materials = temp_tracker._scan_materials(self.args.source_dir, batch_d["batch_type"])
        if not materials:
            print("没有发现可追加的新材料。")
            return

        existing_hashes = set()
        with self.db._get_conn() as conn:
            for row in conn.execute(
                "SELECT content_hash FROM materials WHERE batch_id=?", (self.args.batch_id,)
            ):
                existing_hashes.add(row["content_hash"])

        new_materials = [m for m in materials if m["content_hash"] not in existing_hashes]
        if not new_materials:
            print(f"[补录-去重] 目录中共 {len(materials)} 份材料全部与批次内已有重复，"
                  "无需追加。同一份材料不会出现两份结论。")
            return

        now = temp_tracker._now()
        imported = 0
        with self.db._get_conn() as conn:
            cursor = conn.cursor()
            for m in new_materials:
                mat_id = temp_tracker._gen_id("mat")
                cursor.execute(
                    "INSERT INTO materials (material_id, batch_id, material_type, content_hash, "
                    "file_path, file_name, content_preview, metadata_json, imported_at) "
                    "VALUES (?,?,?,?,?,?,?,?,?)",
                    (mat_id, self.args.batch_id, m["material_type"], m["content_hash"],
                     m["abs_path"], m["file_name"], m["content_preview"],
                     json.dumps(m["metadata"], ensure_ascii=False), now)
                )
                imported += 1
            cursor.execute(
                "UPDATE batches SET material_count = material_count + ? WHERE batch_id=?",
                (imported, self.args.batch_id)
            )
        print(f"[补录成功] 追加 {imported}/{len(materials)} 份材料到批次 {self.args.batch_id}")
        for m in new_materials[:5]:
            print(f"  + [{m['material_type']}] {m['file_name']}")
        if len(new_materials) > 5:
            print(f"  ... 另有 {len(new_materials) - 5} 份略")


def main(argv: Optional[List[str]] = None) -> int:
    return CLI(argv).run()


if __name__ == "__main__":
    sys.exit(main())
