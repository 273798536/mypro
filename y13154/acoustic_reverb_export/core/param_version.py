import json
from typing import Any, Dict, List, Optional, Tuple

from .storage import Storage


class ParamVersionManager:
    """
    参数版本管理模块。

    训练教练老唐最头疼的问题: 第二天没人记得参数版本。
    本模块保证:
      - 每一次参数变更都留下版本标签、来源、操作人、备注
      - 任何一次报告导出都绑定到具体的参数版本
      - 可以方便地对比两个参数版本的差异, 在评审会"讲给不看代码的人听"
    """

    REQUIRED_PARAMS = (
        "sample_rate",
        "frequency_bands",
        "reverb_target_t60",
        "window_size_ms",
        "gap_tolerance_samples",
    )

    def __init__(self, storage: Storage):
        self.storage = storage

    @staticmethod
    def validate(params: Dict[str, Any]) -> List[str]:
        errors = []
        for key in ParamVersionManager.REQUIRED_PARAMS:
            if key not in params:
                errors.append(f"缺少必填参数: {key}")
        return errors

    def save(
        self,
        params: Dict[str, Any],
        source: str = "",
        operator: str = "system",
        remark: str = "",
        version_tag: str = None,
    ) -> Tuple[str, List[str]]:
        errors = self.validate(params)
        if errors:
            return "", errors
        tag = self.storage.create_param_version(
            params=params,
            source=source,
            operator=operator,
            remark=remark,
            version_tag=version_tag,
        )
        return tag, []

    def get(self, version_tag: str = None) -> Optional[Dict[str, Any]]:
        return self.storage.get_param_version(version_tag)

    def list(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self.storage.list_param_versions(limit)

    def diff(self, tag_a: str, tag_b: str) -> Dict[str, Any]:
        """
        对比两个参数版本, 返回人类可读的差异说明 (用于评审会讲解)。
        """
        pa = self.storage.get_param_version(tag_a)
        pb = self.storage.get_param_version(tag_b)
        if not pa or not pb:
            return {"error": "参数版本不存在", "tag_a": tag_a, "tag_b": tag_b}
        a = pa["params"]
        b = pb["params"]
        keys = sorted(set(list(a.keys()) + list(b.keys())))
        same = {}
        changed = {}
        only_a = {}
        only_b = {}
        for k in keys:
            if k in a and k in b:
                if a[k] == b[k]:
                    same[k] = a[k]
                else:
                    changed[k] = {"from": a[k], "to": b[k]}
            elif k in a:
                only_a[k] = a[k]
            else:
                only_b[k] = b[k]
        return {
            "tag_a": tag_a,
            "tag_b": tag_b,
            "created_a": pa["created_at"],
            "created_b": pb["created_at"],
            "operator_a": pa["operator"],
            "operator_b": pb["operator"],
            "source_a": pa["source"],
            "source_b": pb["source"],
            "remark_a": pa["remark"],
            "remark_b": pb["remark"],
            "same": same,
            "changed": changed,
            "only_in_a": only_a,
            "only_in_b": only_b,
            "summary": self._diff_summary(changed, only_a, only_b),
        }

    @staticmethod
    def _diff_summary(changed, only_a, only_b) -> str:
        parts = []
        if changed:
            parts.append(
                "变更项: " + "、".join(
                    f"{k}由{v['from']}改为{v['to']}" for k, v in changed.items()
                )
            )
        if only_a:
            parts.append("仅在旧版存在: " + "、".join(only_a.keys()))
        if only_b:
            parts.append("仅在新版存在: " + "、".join(only_b.keys()))
        if not parts:
            return "两个参数版本完全一致"
        return "; ".join(parts)

    def trace_for_report(self, report_run: Dict[str, Any]) -> Dict[str, Any]:
        """
        为某次报告导出拼接一条"数字从哪来"的线索, 供评审会使用。
        """
        pid = report_run.get("param_version_id")
        if not pid:
            return {"error": "报告未绑定参数版本"}
        pv = self.storage.get_param_version(None)
        all_versions = self.storage.list_param_versions(100)
        matched = next((v for v in all_versions if v["id"] == pid), None)
        if not matched:
            return {"error": f"参数版本 id={pid} 已丢失"}
        return {
            "report_run_tag": report_run.get("run_tag"),
            "param_version_tag": matched["version_tag"],
            "param_created_at": matched["created_at"],
            "param_source": matched["source"],
            "param_operator": matched["operator"],
            "param_remark": matched["remark"],
            "params": matched["params"],
            "is_current_active": bool(matched.get("is_active")),
        }
