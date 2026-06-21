# -*- coding: utf-8 -*-
"""守门检查逻辑 - 所有检查项都要能追到灰度配置的原始说法。"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple


class GatekeeperChecker:
    """执行所有上线守门检查。

    检查结果里必须带：
      - source:  灰度配置里的字段路径（如 gray.ratio）
      - raw_line: 如果能定位到原始文本行号，带上（给老周和项目经理复盘用）
      - message: 稳定的错误描述格式，供 grep
    """

    # 合法的灰度比例范围
    MIN_RATIO = 0.0
    MAX_RATIO = 1.0

    # 必填字段路径 -> 说明
    REQUIRED_FIELDS: List[Tuple[str, str]] = [
        ("gray.ratio", "灰度比例，必须是 0~1 之间的数"),
        ("gray.target_versions", "目标客户端版本列表，非空数组"),
        ("gray.rollback_plan", "撤回方案描述，非空字符串"),
        ("release.owner", "发布负责人（训练负责人）"),
        ("release.model_version", "本次模型版本号"),
    ]

    # 灰度比例的"可疑阈值"——不是错，但要 warn
    SUSPICIOUS_RATIO_MAX = 0.5  # >50% 就要提醒
    SUSPICIOUS_RATIO_EXACT = [0.0, 1.0]  # 全量或 0 要特别提醒

    def run_all_checks(
        self,
        *,
        gray_config: Dict[str, Any],
        model_version: str,
        rollback_id: str | None,
        gray_config_path: str,
    ) -> Dict[str, Any]:
        """跑所有检查，返回 {checks, conclusion, reason, failure_messages}。"""
        checks: List[Dict[str, Any]] = []

        # 1. 必填字段
        checks.extend(self._check_required_fields(gray_config))

        # 2. 灰度比例合法性 + 追到原文
        checks.extend(self._check_gray_ratio(gray_config))

        # 3. 模型版本一致性（配置里写的和 CLI 传的一致）
        checks.append(self._check_model_version_match(gray_config, model_version))

        # 4. 撤回记录关联（如果传了 rollback_id，配置里要有对应痕迹；没传就 warn）
        checks.append(self._check_rollback_link(gray_config, rollback_id))

        # 5. 目标版本列表非空 & 格式合法（语义化版本）
        checks.extend(self._check_target_versions(gray_config))

        # 汇总
        statuses = {c["status"] for c in checks}
        failure_messages = [
            self._format_failure(c) for c in checks if c["status"] in ("fail", "warn")
        ]

        if "fail" in statuses:
            conclusion = "fail"
            reason = "存在 FAIL 级检查项，禁止上线（见失败明细）"
        elif "warn" in statuses:
            conclusion = "warn"
            reason = "存在 WARN 级检查项，需要人工确认后放行"
        else:
            conclusion = "pass"
            reason = "所有检查项通过"

        return {
            "checks": checks,
            "conclusion": conclusion,
            "reason": reason,
            "failure_messages": failure_messages,
        }

    # ---------- 单项检查 ----------
    def _check_required_fields(self, cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        out = []
        for path, desc in self.REQUIRED_FIELDS:
            val = self._deep_get(cfg, path)
            if val is None or (isinstance(val, (list, str)) and len(val) == 0):
                out.append({
                    "name": f"必填字段[{path}]",
                    "status": "fail",
                    "source": path,
                    "raw_line": self._find_line_hint(cfg, path),
                    "message": f"灰度配置缺少必填字段 '{path}'（{desc}）",
                    "expected": desc,
                    "actual": "(缺失或为空)",
                })
            else:
                out.append({
                    "name": f"必填字段[{path}]",
                    "status": "pass",
                    "source": path,
                    "raw_line": self._find_line_hint(cfg, path),
                    "message": f"字段 '{path}' 已填",
                })
        return out

    def _check_gray_ratio(self, cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        """灰度比例：必须是数字、0~1 之间；还要追到原始文本。"""
        path = "gray.ratio"
        val = self._deep_get(cfg, path)
        raw = cfg.get("__raw_lines__", {}).get(path)
        out = []

        # fail: 根本不是数
        if not isinstance(val, (int, float)) or isinstance(val, bool):
            out.append({
                "name": "灰度比例类型",
                "status": "fail",
                "source": path,
                "raw_line": raw,
                "message": (
                    f"灰度比例 '{path}' 不是数字。"
                    f"原始配置写法 -> {self._fmt_raw(raw)}"
                ),
                "expected": "0~1 之间的数字",
                "actual": f"类型={type(val).__name__}, 值={val!r}",
            })
            return out

        # pass: 类型对
        out.append({
            "name": "灰度比例类型",
            "status": "pass",
            "source": path,
            "raw_line": raw,
            "message": f"灰度比例是数字类型（{type(val).__name__}）",
        })

        # fail: 超范围
        if not (self.MIN_RATIO <= float(val) <= self.MAX_RATIO):
            out.append({
                "name": "灰度比例范围",
                "status": "fail",
                "source": path,
                "raw_line": raw,
                "message": (
                    f"灰度比例 {val} 超出合法范围 [{self.MIN_RATIO}, {self.MAX_RATIO}]。"
                    f"原始配置写法 -> {self._fmt_raw(raw)}"
                ),
                "expected": f"[{self.MIN_RATIO}, {self.MAX_RATIO}]",
                "actual": val,
            })
            return out

        # pass: 范围对
        out.append({
            "name": "灰度比例范围",
            "status": "pass",
            "source": path,
            "raw_line": raw,
            "message": f"灰度比例 {val} 在合法范围内",
        })

        # warn: 比例过大
        if float(val) > self.SUSPICIOUS_RATIO_MAX:
            out.append({
                "name": "灰度比例偏大提醒",
                "status": "warn",
                "source": path,
                "raw_line": raw,
                "message": (
                    f"灰度比例 {val} > {self.SUSPICIOUS_RATIO_MAX}，超过推荐阈值。"
                    f"原始配置写法 -> {self._fmt_raw(raw)}"
                ),
                "expected": f"建议 ≤ {self.SUSPICIOUS_RATIO_MAX}",
                "actual": val,
            })

        # warn: 0 或 1 这种极端值
        if float(val) in self.SUSPICIOUS_RATIO_EXACT:
            label = "全量发布" if float(val) == 1.0 else "灰度比例=0（相当于没放）"
            out.append({
                "name": "灰度比例极端值提醒",
                "status": "warn",
                "source": path,
                "raw_line": raw,
                "message": (
                    f"灰度比例={val}，属于{label}。"
                    f"原始配置写法 -> {self._fmt_raw(raw)}"
                ),
                "expected": "正常的灰度比例（如 0.1, 0.2）",
                "actual": val,
            })

        return out

    def _check_model_version_match(
        self, cfg: Dict[str, Any], cli_version: str
    ) -> Dict[str, Any]:
        path = "release.model_version"
        val = self._deep_get(cfg, path)
        raw = cfg.get("__raw_lines__", {}).get(path)

        if val is None:
            return {
                "name": "模型版本一致性",
                "status": "warn",
                "source": path,
                "raw_line": raw,
                "message": f"配置文件未写 '{path}'，无法对比。CLI 传入={cli_version}",
            }
        if str(val) != str(cli_version):
            return {
                "name": "模型版本一致性",
                "status": "fail",
                "source": path,
                "raw_line": raw,
                "message": (
                    f"模型版本不一致：配置='{val}' vs CLI='{cli_version}'。"
                    f"原始配置写法 -> {self._fmt_raw(raw)}"
                ),
                "expected": cli_version,
                "actual": val,
            }
        return {
            "name": "模型版本一致性",
            "status": "pass",
            "source": path,
            "raw_line": raw,
            "message": f"模型版本一致：{val}",
        }

    def _check_rollback_link(
        self, cfg: Dict[str, Any], rollback_id: str | None
    ) -> Dict[str, Any]:
        """撤回记录与结论关联检查。"""
        path = "gray.rollback_plan"
        val = self._deep_get(cfg, path)
        raw = cfg.get("__raw_lines__", {}).get(path)

        if rollback_id is None:
            return {
                "name": "撤回记录关联",
                "status": "warn",
                "source": path,
                "raw_line": raw,
                "message": (
                    "未传 --rollback-id，本次守门记录不会绑定到任何撤回记录。"
                    "如果是修复版发布，建议带上撤回 ID 便于复盘追溯。"
                ),
            }

        # 看看配置里的撤回方案提没提这个 ID
        mentions_id = rollback_id in str(val) if val else False
        if mentions_id:
            return {
                "name": "撤回记录关联",
                "status": "pass",
                "source": path,
                "raw_line": raw,
                "message": (
                    f"撤回记录 ID={rollback_id} 已传入，且撤回方案中也提到了该 ID。"
                    f"本次结论将与撤回记录强关联。"
                ),
            }
        return {
            "name": "撤回记录关联",
            "status": "warn",
            "source": path,
            "raw_line": raw,
            "message": (
                f"已传 --rollback-id={rollback_id}，但配置的撤回方案 '{path}' 里"
                f"没提到这个 ID。建议补充说明，方便复盘时直接追到对应撤回。"
                f"原始配置写法 -> {self._fmt_raw(raw)}"
            ),
        }

    def _check_target_versions(self, cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
        path = "gray.target_versions"
        val = self._deep_get(cfg, path)
        raw = cfg.get("__raw_lines__", {}).get(path)
        out = []

        if not isinstance(val, list):
            out.append({
                "name": "目标客户端版本类型",
                "status": "fail",
                "source": path,
                "raw_line": raw,
                "message": (
                    f"'{path}' 不是数组类型。"
                    f"原始配置写法 -> {self._fmt_raw(raw)}"
                ),
                "expected": "字符串数组，如 ['v1.2.0', 'v1.3.0']",
                "actual": f"类型={type(val).__name__}",
            })
            return out

        # 非空（必填已经查过，但这里再强调一次格式）
        semver_re = re.compile(r"^v?\d+\.\d+\.\d+(-[a-zA-Z0-9._]+)?$")
        bad_versions = [v for v in val if not semver_re.match(str(v))]
        if bad_versions:
            out.append({
                "name": "目标客户端版本格式",
                "status": "warn",
                "source": path,
                "raw_line": raw,
                "message": (
                    f"以下版本号格式看起来不像语义化版本：{bad_versions}。"
                    f"原始配置写法 -> {self._fmt_raw(raw)}"
                ),
                "expected": "如 v1.2.3 或 1.2.3-beta",
                "actual": bad_versions,
            })
        else:
            out.append({
                "name": "目标客户端版本格式",
                "status": "pass",
                "source": path,
                "raw_line": raw,
                "message": f"所有 {len(val)} 个目标版本格式合法",
            })
        return out

    # ---------- helpers ----------
    @staticmethod
    def _deep_get(d: Dict[str, Any], path: str) -> Any:
        cur = d
        for part in path.split("."):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                return None
        return cur

    @staticmethod
    def _find_line_hint(cfg: Dict[str, Any], path: str) -> str | None:
        return cfg.get("__raw_lines__", {}).get(path)

    @staticmethod
    def _fmt_raw(raw: str | None) -> str:
        if raw is None:
            return "(无法定位原始行，请检查灰度配置读取器)"
        return raw

    @staticmethod
    def _format_failure(c: Dict[str, Any]) -> str:
        """稳定的失败消息格式，供项目经理脚本 grep。"""
        tag = "[FAIL]" if c["status"] == "fail" else "[WARN]"
        loc = c.get("raw_line") or f"source={c.get('source','?')}"
        return f"{tag} {c['name']} | {loc} | {c['message']}"
