"""
一致性校验模块

核心职责：
- 校验报告、铭牌、原始数据三者是否对得上
- 保证"重启或重跑以后，历史备注、当前状态、CSV明细还要对得上"
- 提供"指纹比对"功能——用哈希值快速判断是不是同一份东西

为什么单独一个模块？
这是小林的"定心丸"。
他最怕的就是：昨天的报告和今天的报告，
明明是同一份数据，结果却不一样，还说不出为什么。
有了一致性校验，他可以一键验明正身。
"""

import os
import json
import csv
from typing import Dict, Any, List, Optional, Tuple

from .nameplate import NameplateManager
from .water_drop import WaterDropProcessor
from .report import ReportGenerator


class ConsistencyChecker:
    """
    一致性校验器

    三种校验方式：
    1. report_vs_nameplate：报告用的铭牌版本，和当前铭牌库里的那个版本对不对得上
    2. report_vs_data：报告用的原始数据，和当前数据文件对不对得上
    3. full_check：上面两个都查，再加上CSV明细和JSON报告对不对得上
    """

    def __init__(self, nameplate_mgr: NameplateManager,
                 water_proc: WaterDropProcessor,
                 report_gen: ReportGenerator):
        self.nameplate_mgr = nameplate_mgr
        self.water_proc = water_proc
        self.report_gen = report_gen

    def check_report_vs_nameplate(self, report_id: str) -> Dict[str, Any]:
        """
        校验：报告里存的铭牌快照，和铭牌管理库里的同版本是否一致

        为什么要查这个？
        如果有人偷偷改了历史版本的铭牌（不应该，但万一），
        报告里的"追溯链"就不可信了。
        """
        report = self.report_gen.load_report(report_id)
        if not report:
            return {"ok": False, "error": "报告不存在"}

        meta = report["meta"]
        report_hash = meta["nameplate_snapshot_hash"]
        report_version = meta["nameplate_version"]

        versions = self.nameplate_mgr.list_versions()
        target = None
        for v in versions:
            if v["version"] == report_version:
                target = v
                break

        if not target:
            return {
                "ok": False,
                "error": f"铭牌库中找不到 v{report_version} 版",
                "report_version": report_version,
            }

        if target["snapshot_hash"] != report_hash:
            return {
                "ok": False,
                "error": "铭牌版本号相同，但快照哈希不一样——有人改过历史数据",
                "report_version": report_version,
                "report_hash": report_hash,
                "current_hash": target["snapshot_hash"],
            }

        return {
            "ok": True,
            "nameplate_version": report_version,
            "snapshot_hash": report_hash,
            "note_count": target["note_count"],
            "active_note_count": target["active_note_count"],
        }

    def check_report_vs_data(self, report_id: str) -> Dict[str, Any]:
        """
        校验：报告用的原始数据，和当前数据文件是否一致

        为什么要查这个？
        如果原始数据文件被替换了，
        报告里的"异常明细"和实际数据就对不上了。
        """
        report = self.report_gen.load_report(report_id)
        if not report:
            return {"ok": False, "error": "报告不存在"}

        report_hash = report["meta"]["data_hash"]
        current_hash = self.water_proc.data_hash()

        if report_hash != current_hash:
            return {
                "ok": False,
                "error": "原始数据哈希不一致——数据文件可能被替换或修改",
                "report_hash": report_hash,
                "current_hash": current_hash,
            }

        return {
            "ok": True,
            "data_hash": report_hash,
            "total_records": report["meta"]["total_records"],
            "source_file": report["meta"]["data_source_file"],
        }

    def check_csv_vs_report(self, report_id: str,
                            csv_path: str) -> Dict[str, Any]:
        """
        校验：导出的CSV明细，和报告JSON里的异常列表是否一致

        为什么要查这个？
        CSV是给现场同事看的，JSON是系统内部的。
        如果两者对不上，排班同事追明细的时候就会懵。
        """
        report = self.report_gen.load_report(report_id)
        if not report:
            return {"ok": False, "error": "报告不存在"}

        if not os.path.exists(csv_path):
            return {"ok": False, "error": "CSV文件不存在"}

        anomaly_ids_in_report = {a["anomaly_id"] for a in report["anomalies"]}
        anomaly_ids_in_csv: set = set()

        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if "anomaly_id" in row:
                    anomaly_ids_in_csv.add(row["anomaly_id"])

        missing_in_csv = anomaly_ids_in_report - anomaly_ids_in_csv
        extra_in_csv = anomaly_ids_in_csv - anomaly_ids_in_report

        if missing_in_csv or extra_in_csv:
            return {
                "ok": False,
                "error": "CSV与报告不一致",
                "missing_in_csv": list(missing_in_csv),
                "extra_in_csv": list(extra_in_csv),
                "report_count": len(anomaly_ids_in_report),
                "csv_count": len(anomaly_ids_in_csv),
            }

        return {
            "ok": True,
            "anomaly_count": len(anomaly_ids_in_report),
        }

    def full_check(self, report_id: str,
                   csv_path: Optional[str] = None) -> Dict[str, Any]:
        """
        全套一致性校验

        返回三个子项的结果，外加一个总体的 ok 标记。
        小林每天早上跑一遍，放心。
        """
        results = {
            "report_vs_nameplate": self.check_report_vs_nameplate(report_id),
            "report_vs_data": self.check_report_vs_data(report_id),
        }

        if csv_path:
            results["csv_vs_report"] = self.check_csv_vs_report(report_id, csv_path)

        all_ok = all(r.get("ok", False) for r in results.values())

        summary_parts = []
        for name, r in results.items():
            if r.get("ok"):
                summary_parts.append(f"{name}: 通过")
            else:
                summary_parts.append(f"{name}: 失败（{r.get('error', '未知错误')}）")

        return {
            "ok": all_ok,
            "checks": results,
            "summary": "; ".join(summary_parts),
        }
