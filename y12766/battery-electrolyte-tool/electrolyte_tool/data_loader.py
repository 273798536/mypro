import os
import re
import csv
import json
from typing import List, Dict, Optional, Tuple
from pathlib import Path

from .models import (
    ExperimentRecord,
    SpectrumRecord,
    SpectrumPeak,
    PeakStatus,
)


class DataLoader:
    """加载各种来源的实验数据，统一整合成标准格式"""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.warnings: List[str] = []

    def _log(self, msg: str):
        if self.verbose:
            print(f"[DataLoader] {msg}")

    def _warn(self, msg: str):
        self.warnings.append(msg)
        if self.verbose:
            print(f"[DataLoader][WARNING] {msg}")

    def load_all(
        self,
        experiment_csv: str,
        spectrum_csv: Optional[str] = None,
        reaction_json: Optional[str] = None,
        notes_txt: Optional[str] = None,
    ) -> List[ExperimentRecord]:
        """
        从多个数据源加载并整合实验数据

        Args:
            experiment_csv: 旧表/实验记录CSV路径（可能含漏填单位、混合格式）
            spectrum_csv: 谱图数据CSV路径（可能夹着人工备注）
            reaction_json: 共享盘上的反应条件JSON路径
            notes_txt: 补录备注文本文件路径

        Returns:
            整合后的实验记录列表
        """
        records: Dict[str, ExperimentRecord] = {}

        if experiment_csv and os.path.exists(experiment_csv):
            self._log(f"加载实验记录: {experiment_csv}")
            records = self._load_experiment_csv(experiment_csv)

        if reaction_json and os.path.exists(reaction_json):
            self._log(f"加载反应条件: {reaction_json}")
            self._merge_reaction_conditions(records, reaction_json)

        if spectrum_csv and os.path.exists(spectrum_csv):
            self._log(f"加载谱图数据: {spectrum_csv}")
            self._merge_spectrum_data(records, spectrum_csv)

        if notes_txt and os.path.exists(notes_txt):
            self._log(f"加载补录备注: {notes_txt}")
            self._merge_manual_notes(records, notes_txt)

        result = list(records.values())
        for rec in result:
            for p in rec.problems:
                self.warnings.append(p)
        self._log(f"共加载 {len(result)} 条实验记录，警告数: {len(self.warnings)}")
        return result

    def _load_experiment_csv(self, path: str) -> Dict[str, ExperimentRecord]:
        """
        加载旧格式实验记录CSV，处理：
        - 漏填单位（如温度只有数字没写°C）
        - 列名不一致（温度/温 度/Temperature/T）
        - 空值、补录行
        - 配方列格式混乱
        """
        records: Dict[str, ExperimentRecord] = {}

        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                sample_id = self._extract_sample_id(row, row_num)
                if not sample_id:
                    continue

                rec = ExperimentRecord(sample_id=sample_id)

                rec.date = self._clean_str(row.get("日期", "") or row.get("date", "") or row.get("Date", ""))
                rec.operator = self._clean_str(row.get("操作员", "") or row.get("operator", "") or row.get("Oper", ""))

                temp_val, temp_unit, problems = self._parse_temperature(row, row_num, sample_id)
                rec.temperature = temp_val
                rec.temperature_unit = temp_unit
                rec.problems.extend(problems)

                humidity = self._parse_number(row.get("湿度", "") or row.get("humidity", "") or row.get("RH", ""))
                if humidity is not None:
                    rec.humidity = humidity

                formulation, form_problems = self._parse_formulation(row, row_num, sample_id)
                rec.formulation = formulation
                rec.problems.extend(form_problems)

                rec.result_original = self._clean_str(row.get("原始结论", "") or row.get("结果", "") or row.get("result", ""))
                rec.formulation_notes = self._clean_str(row.get("备注", "") or row.get("note", "") or row.get("notes", ""))

                records[sample_id] = rec

        return records

    def _extract_sample_id(self, row: Dict, row_num: int) -> Optional[str]:
        """从混乱的列名中提取样品编号"""
        raw = (
            row.get("样品编号", "")
            or row.get("编号", "")
            or row.get("sample_id", "")
            or row.get("SampleID", "")
            or row.get("ID", "")
            or row.get("No.", "")
        )
        sid = self._clean_str(raw)
        if not sid:
            self._warn(f"第{row_num}行: 缺少样品编号，已跳过")
            return None
        return sid

    def _parse_temperature(self, row: Dict, row_num: int, sample_id: str) -> Tuple[Optional[float], str, List[str]]:
        """解析温度，处理漏填单位的情况"""
        problems: List[str] = []
        raw = (
            row.get("温度", "")
            or row.get("反应温度", "")
            or row.get("Temperature", "")
            or row.get("T", "")
            or row.get("Temp", "")
        )
        raw = self._clean_str(raw)
        if not raw:
            return None, "°C", problems

        val = self._parse_number(raw)
        if val is None:
            problems.append(f"温度格式异常: '{raw}'")
            return None, "°C", problems

        unit = "°C"
        if "K" in raw.upper() and "°C" not in raw and "C" not in raw:
            unit = "K"
        elif "℉" in raw or "F" in raw:
            unit = "℉"
        elif "°" not in raw and "C" not in raw and "K" not in raw and "F" not in raw:
            problems.append(f"样品{sample_id}: 温度漏填单位，默认按°C处理 (值={val})")

        return val, unit, problems

    def _parse_formulation(self, row: Dict, row_num: int, sample_id: str) -> Tuple[Dict[str, float], List[str]]:
        """
        解析配方列，支持多种混乱格式：
        - "EC:DMC=3:7"
        - "EC 30%, DMC 70%"
        - 单独列 "EC(g)" "DMC(g)"
        - JSON格式字符串
        """
        problems: List[str] = []
        formulation: Dict[str, float] = {}

        direct_cols = [k for k in row.keys() if any(m in k for m in ["溶剂", "锂盐", "添加剂", "配比", "配方", "formulation", "ratio"])]
        for col in direct_cols:
            val = self._clean_str(row.get(col, ""))
            if val:
                parsed, p = self._parse_formulation_string(val, sample_id)
                formulation.update(parsed)
                problems.extend(p)

        mass_cols = [k for k in row.keys() if "(g)" in k or "(ml)" in k or "(mL)" in k]
        for col in mass_cols:
            val = self._clean_str(row.get(col, ""))
            if val:
                parsed, p = self._parse_material_value_pairs(val, sample_id)
                if parsed:
                    formulation.update(parsed)
                    problems.extend(p)
                else:
                    num = self._parse_number(val)
                    if num is not None:
                        material = col.replace("(g)", "").replace("(ml)", "").replace("(mL)", "").strip()
                        formulation[material] = num
                    else:
                        problems.append(f"样品{sample_id}: {col}数值异常 '{val}'")

        return formulation, problems

    def _parse_formulation_string(self, text: str, sample_id: str) -> Tuple[Dict[str, float], List[str]]:
        """解析配方字符串"""
        problems: List[str] = []
        result: Dict[str, float] = {}

        if "=" in text and ":" in text:
            parts = text.split("=")
            if len(parts) == 2:
                materials = parts[0].split(":")
                ratios = parts[1].split(":")
                if len(materials) == len(ratios):
                    for m, r in zip(materials, ratios):
                        num = self._parse_number(r)
                        if num is not None:
                            result[m.strip()] = num
                        else:
                            problems.append(f"样品{sample_id}: 配比数值异常 '{r}'")
                else:
                    problems.append(f"样品{sample_id}: 配比分隔异常 '{text}'")
        elif "%" in text:
            pattern = r"([A-Za-z\u4e00-\u9fa50-9]+)\s*[:：]?\s*([\d.]+)\s*%"
            matches = re.findall(pattern, text)
            for m, v in matches:
                num = self._parse_number(v)
                if num is not None:
                    result[m.strip()] = num
        elif "：" in text or "," in text or "，" in text:
            pattern = r"([A-Za-z\u4e00-\u9fa50-9]+)\s*[:：]\s*([\d.]+)"
            matches = re.findall(pattern, text)
            for m, v in matches:
                num = self._parse_number(v)
                if num is not None:
                    result[m.strip()] = num

        return result, problems

    def _parse_material_value_pairs(self, text: str, sample_id: str) -> Tuple[Dict[str, float], List[str]]:
        """解析 '材料名 数值 材料名 数值' 这样的格式，如 'LiPF6 0.8 LiFSI 0.4'"""
        problems: List[str] = []
        result: Dict[str, float] = {}

        pattern = r"([A-Za-z\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5]*)\s+([\d.]+)"
        matches = re.findall(pattern, text)

        if not matches:
            return result, problems

        for m, v in matches:
            num = self._parse_number(v)
            if num is not None:
                result[m.strip()] = num
            else:
                problems.append(f"样品{sample_id}: 材料数值异常 '{m} {v}'")

        return result, problems

    def _merge_reaction_conditions(self, records: Dict[str, ExperimentRecord], path: str):
        """合并共享盘上的反应条件JSON"""
        with open(path, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                self._warn(f"反应条件JSON解析失败: {e}")
                return

        if isinstance(data, list):
            for item in data:
                sid = str(item.get("sample_id", item.get("样品编号", ""))).strip()
                if sid and sid in records:
                    rec = records[sid]
                    if item.get("temperature") is not None and rec.temperature is None:
                        rec.temperature = float(item["temperature"])
                    if item.get("humidity") is not None and rec.humidity is None:
                        rec.humidity = float(item["humidity"])
                    if item.get("operator") and not rec.operator:
                        rec.operator = str(item["operator"])
        elif isinstance(data, dict):
            for sid, item in data.items():
                if sid in records:
                    rec = records[sid]
                    if isinstance(item, dict):
                        if item.get("temperature") is not None and rec.temperature is None:
                            rec.temperature = float(item["temperature"])
                        if item.get("humidity") is not None and rec.humidity is None:
                            rec.humidity = float(item["humidity"])

    def _merge_spectrum_data(self, records: Dict[str, ExperimentRecord], path: str):
        """
        合并谱图数据CSV，处理：
        - 夹杂的人工备注行
        - 多峰多行格式
        - 部分行缺字段
        """
        current_id: Optional[str] = None
        current_peaks: List[SpectrumPeak] = []
        current_notes_parts: List[str] = []

        with open(path, "r", encoding="utf-8-sig") as f:
            lines = f.readlines()

        header = None
        for i, line in enumerate(lines):
            line = line.rstrip("\n").rstrip("\r")
            stripped = line.strip()

            if not stripped:
                continue

            if stripped.startswith("#") or stripped.startswith("//") or stripped.startswith("备注"):
                if current_id:
                    current_notes_parts.append(stripped.lstrip("#/").strip())
                continue

            if header is None:
                if "峰位" in stripped or "position" in stripped.lower() or "样品" in stripped:
                    header = [c.strip() for c in next(csv.reader([stripped]))]
                continue

            if header:
                try:
                    row = next(csv.reader([stripped]))
                    if len(row) < len(header):
                        row += [""] * (len(header) - len(row))
                    row_dict = dict(zip(header, row))
                except Exception:
                    if current_id:
                        current_notes_parts.append(stripped)
                    continue

                sid = self._clean_str(
                    row_dict.get("样品编号", "")
                    or row_dict.get("sample_id", "")
                    or row_dict.get("Sample", "")
                )

                if sid and sid != current_id:
                    if current_id and current_id in records:
                        self._save_spectrum(records, current_id, current_peaks, current_notes_parts)
                    current_id = sid
                    current_peaks = []
                    current_notes_parts = []

                if current_id:
                    pos = self._parse_number(row_dict.get("峰位", "") or row_dict.get("position", "") or row_dict.get("ppm", ""))
                    inten = self._parse_number(row_dict.get("强度", "") or row_dict.get("intensity", "") or row_dict.get("height", ""))
                    if pos is not None:
                        peak = SpectrumPeak(
                            position=pos,
                            intensity=inten if inten is not None else 0.0,
                            material=self._clean_str(row_dict.get("归属", "") or row_dict.get("material", "") or row_dict.get("assign", "")),
                            note=self._clean_str(row_dict.get("备注", "") or row_dict.get("note", "")),
                        )
                        status_str = self._clean_str(row_dict.get("状态", "") or row_dict.get("status", "")).lower()
                        if "重叠" in status_str or "overlap" in status_str:
                            peak.status = PeakStatus.OVERLAP
                        elif "存疑" in status_str or "suspicious" in status_str:
                            peak.status = PeakStatus.SUSPICIOUS
                        current_peaks.append(peak)
                    elif self._clean_str(stripped):
                        current_notes_parts.append(stripped)

        if current_id and current_id in records:
            self._save_spectrum(records, current_id, current_peaks, current_notes_parts)

    def _save_spectrum(
        self,
        records: Dict[str, ExperimentRecord],
        sample_id: str,
        peaks: List[SpectrumPeak],
        notes_parts: List[str],
    ):
        if sample_id not in records:
            records[sample_id] = ExperimentRecord(sample_id=sample_id)
        spec = SpectrumRecord(
            sample_id=sample_id,
            peaks=peaks,
            manual_notes="; ".join(n for n in notes_parts if n),
        )
        records[sample_id].spectrum = spec

    def _merge_manual_notes(self, records: Dict[str, ExperimentRecord], path: str):
        """合并补录备注文本文件"""
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        def _append_note(rec: ExperimentRecord, note: str):
            note = note.strip()
            if not note:
                return
            if rec.spectrum:
                if rec.spectrum.manual_notes:
                    rec.spectrum.manual_notes += "; " + note
                else:
                    rec.spectrum.manual_notes = note
            else:
                if rec.formulation_notes:
                    rec.formulation_notes += "; " + note
                else:
                    rec.formulation_notes = note

        pattern = r"(?:样品|样本|Sample)?\s*#?([A-Za-z0-9\-_]+)\s*[:：]\s*([^\n]+)"
        matches = re.findall(pattern, content)
        for sid, note in matches:
            sid = sid.strip()
            if sid in records:
                _append_note(records[sid], note.strip())

        all_sids = set(records.keys())
        for line in content.split("\n"):
            stripped = line.strip()
            if not stripped:
                continue
            if re.match(pattern, stripped):
                continue
            if stripped.startswith("#"):
                continue
            mentioned = []
            for sid in all_sids:
                if sid in stripped:
                    mentioned.append(sid)
            if mentioned:
                for sid in mentioned:
                    _append_note(records[sid], stripped)

    @staticmethod
    def _clean_str(s: str) -> str:
        if s is None:
            return ""
        return str(s).strip().replace("\u3000", " ")

    @staticmethod
    def _parse_number(s: str) -> Optional[float]:
        s = DataLoader._clean_str(s)
        if not s:
            return None
        match = re.search(r"-?\d+\.?\d*(?:[eE][-+]?\d+)?", s)
        if not match:
            return None
        try:
            return float(match.group())
        except ValueError:
            return None
