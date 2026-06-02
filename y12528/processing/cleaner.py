import re
import pandas as pd
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime

from models import Ingredient, IngredientSource, NutritionInfo


@dataclass
class CleanIssue:
    """清洗问题记录"""
    row: int
    column: str
    issue_type: str
    original_value: Any
    corrected_value: Any
    note: str

    def to_dict(self) -> Dict:
        return {
            "row": self.row,
            "column": self.column,
            "issue_type": self.issue_type,
            "original": str(self.original_value),
            "corrected": str(self.corrected_value),
            "note": self.note,
        }


@dataclass
class CleanReport:
    """清洗报告"""
    total_rows: int = 0
    valid_rows: int = 0
    issues: List[CleanIssue] = field(default_factory=list)
    removed_rows: List[int] = field(default_factory=list)
    cleaned_at: datetime = field(default_factory=datetime.now)

    def add_issue(self, issue: CleanIssue):
        self.issues.append(issue)

    def summary(self) -> Dict:
        issue_types = {}
        for issue in self.issues:
            issue_types[issue.issue_type] = issue_types.get(issue.issue_type, 0) + 1
        return {
            "total_rows": self.total_rows,
            "valid_rows": self.valid_rows,
            "removed_rows": len(self.removed_rows),
            "total_issues": len(self.issues),
            "issue_types": issue_types,
        }

    def to_markdown(self) -> str:
        s = self.summary()
        lines = [
            f"# 数据清洗报告",
            "",
            f"## 概览",
            f"- 总行数: {s['total_rows']}",
            f"- 有效行数: {s['valid_rows']}",
            f"- 删除行数: {s['removed_rows']}",
            f"- 问题总数: {s['total_issues']}",
            "",
        ]

        if s["issue_types"]:
            lines.extend([
                "## 问题类型分布",
                "| 问题类型 | 数量 |",
                "|----------|------|",
            ])
            for itype, count in s["issue_types"].items():
                lines.append(f"| {itype} | {count} |")
            lines.append("")

        if self.issues:
            lines.extend([
                "## 详细问题",
                "| 行号 | 列名 | 问题类型 | 原始值 | 修正值 | 说明 |",
                "|------|------|----------|--------|--------|------|",
            ])
            for issue in self.issues[:50]:
                lines.append(
                    f"| {issue.row} | {issue.column} | {issue.issue_type} | "
                    f"{str(issue.original_value)[:20]} | {str(issue.corrected_value)[:20]} | {issue.note} |"
                )
            if len(self.issues) > 50:
                lines.append(f"\n... 还有 {len(self.issues) - 50} 条问题未显示")

        return "\n".join(lines)


class DataCleaner:
    """
    数据清洗器 - 处理业务同事提交的不标准数据
    支持：空值填充、旧备注提取、单位换算、格式标准化
    """

    COMMON_ALLERGENS = ["花生", "大豆", "牛奶", "鸡蛋", "小麦", "鱼类", "贝类", "坚果", "芝麻", "芒果"]
    UNIT_MAP = {"kg": 1.0, "千克": 1.0, "g": 0.001, "克": 0.001, "斤": 0.5, "公斤": 1.0, "两": 0.05}

    def __init__(self):
        self.report = CleanReport()

    def _parse_number(self, value: Any, row: int, col: str, default: float = 0.0) -> Tuple[float, Optional[CleanIssue]]:
        """解析数值，处理空值、备注、非标准格式"""
        if value is None or (isinstance(value, float) and pd.isna(value)):
            issue = CleanIssue(row, col, "空值填充", value, default, f"空值，填充默认值 {default}")
            return default, issue

        if isinstance(value, (int, float)):
            return float(value), None

        s = str(value).strip()
        if not s or s.lower() in ["nan", "none", "null", "无", "-", "--", "/"]:
            issue = CleanIssue(row, col, "空值填充", value, default, f"空标记'{s}'，填充默认值 {default}")
            return default, issue

        notes = re.findall(r"[（(【\[][^）)】\]]*[）)】\]]", s)
        pure = re.sub(r"[（(【\[][^）)】\]]*[）)】\]]", "", s).strip()
        pure = re.sub(r"[^\d.\-]", "", pure)

        try:
            result = float(pure)
            if notes:
                issue = CleanIssue(row, col, "备注提取", value, result, f"提取备注: {'; '.join(notes)}")
                return result, issue
            return result, None
        except (ValueError, TypeError):
            issue = CleanIssue(row, col, "格式转换", value, default, f"无法解析'{s}'，使用默认值 {default}")
            return default, issue

    def _parse_unit(self, value: Any, row: int, col: str) -> Tuple[str, Optional[CleanIssue]]:
        """解析单位"""
        if value is None or (isinstance(value, float) and pd.isna(value)):
            issue = CleanIssue(row, col, "单位补全", value, "kg", "空单位，默认kg")
            return "kg", issue

        s = str(value).strip().lower()
        for unit in self.UNIT_MAP.keys():
            if unit in s:
                return unit, None

        issue = CleanIssue(row, col, "单位标准化", value, "kg", f"未知单位'{s}'，标准化为kg")
        return "kg", issue

    def _parse_allergens(self, value: Any, row: int, col: str) -> Tuple[List[str], Optional[CleanIssue]]:
        """解析过敏源"""
        if value is None or (isinstance(value, float) and pd.isna(value)):
            return [], None

        s = str(value).strip()
        if not s or s in ["无", "无过敏源", "none"]:
            return [], None

        found = []
        for allergen in self.COMMON_ALLERGENS:
            if allergen in s:
                found.append(allergen)

        parts = re.split(r"[,，;；、/\s]+", s)
        for part in parts:
            part = part.strip()
            if part and part not in found and any(a in part for a in self.COMMON_ALLERGENS):
                if part not in found:
                    found.append(part)

        if not found and s:
            issue = CleanIssue(row, col, "过敏源识别", value, "未识别", f"无法从'{s}'中识别已知过敏源")
            return [], issue

        return found, None

    def clean_ingredients(self, df: pd.DataFrame) -> Tuple[List[Ingredient], CleanReport]:
        """清洗食材清单"""
        self.report = CleanReport(total_rows=len(df))
        ingredients = []

        required_cols = ["id", "name"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"缺少必需列: {col}")

        for idx, row in df.iterrows():
            row_num = idx + 1

            row_id = row.get("id")
            row_name = row.get("name")
            id_empty = pd.isna(row_id) or (isinstance(row_id, str) and not row_id.strip())
            name_empty = pd.isna(row_name) or (isinstance(row_name, str) and not row_name.strip())

            if id_empty or name_empty:
                self.report.removed_rows.append(row_num)
                issue = CleanIssue(row_num, "id/name", "关键数据缺失",
                                   f"id={row_id}, name={row_name}",
                                   None, "缺少ID或名称，跳过该行")
                self.report.add_issue(issue)
                continue

            raw_notes_parts = []

            cost, issue = self._parse_number(row.get("cost", 0), row_num, "cost", 0.0)
            if issue:
                self.report.add_issue(issue)
                if "备注" in issue.issue_type:
                    raw_notes_parts.append(issue.note)

            stock, issue = self._parse_number(row.get("stock", 0), row_num, "stock", 0.0)
            if issue:
                self.report.add_issue(issue)
                if "备注" in issue.issue_type:
                    raw_notes_parts.append(issue.note)

            unit, issue = self._parse_unit(row.get("unit", "kg"), row_num, "unit")
            if issue:
                self.report.add_issue(issue)

            unit_from_stock = None
            stock_str = str(row.get("stock", "")) if not pd.isna(row.get("stock")) else ""
            for u in self.UNIT_MAP.keys():
                if u in stock_str:
                    unit_from_stock = u
                    break

            if unit_from_stock and unit_from_stock != unit:
                issue = CleanIssue(row_num, "unit", "单位校正",
                                   f"stock={stock_str} 包含单位{unit_from_stock}",
                                   f"使用单位 {unit_from_stock}",
                                   f"从stock字段识别到更准确的单位{unit_from_stock}")
                self.report.add_issue(issue)
                unit = unit_from_stock

            allergens, issue = self._parse_allergens(row.get("allergens", ""), row_num, "allergens")
            if issue:
                self.report.add_issue(issue)

            if unit in self.UNIT_MAP and unit != "kg":
                factor = self.UNIT_MAP[unit]
                if factor != 1.0:
                    original_cost = cost
                    original_stock = stock
                    if factor < 1.0 and cost > 100:
                        cost = cost * factor
                        stock = stock * factor
                        conv_note = f"从{unit}换算到kg: 成本×{factor}(检测到异常高价), 库存×{factor}"
                    else:
                        cost = cost / factor
                        stock = stock * factor
                        conv_note = f"从{unit}换算到kg: 成本÷{factor}, 库存×{factor}"
                    issue = CleanIssue(row_num, "unit", "单位换算",
                                       f"cost={original_cost:.2f}/{unit}, stock={original_stock:.2f}{unit}",
                                       f"cost={cost:.2f}/kg, stock={stock:.3f}kg",
                                       conv_note)
                    self.report.add_issue(issue)
                    unit = "kg"

            source_str = str(row.get("source", "")).strip() if not pd.isna(row.get("source")) else ""
            source_map = {
                "本地": IngredientSource.LOCAL, "本地采购": IngredientSource.LOCAL,
                "中央": IngredientSource.CENTRAL, "中央厨房": IngredientSource.CENTRAL,
                "进口": IngredientSource.IMPORTED,
            }
            source = source_map.get(source_str, IngredientSource.UNKNOWN)

            category = str(row.get("category", "")).strip() if not pd.isna(row.get("category")) else ""

            ing = Ingredient(
                id=str(row["id"]).strip(),
                name=str(row["name"]).strip(),
                category=category,
                unit=unit,
                cost_per_unit=cost,
                stock_available=stock,
                allergens=allergens,
                source=source,
                raw_notes=" | ".join(raw_notes_parts),
                is_active=True
            )
            ingredients.append(ing)

        self.report.valid_rows = len(ingredients)
        return ingredients, self.report

    def clean_nutrition(self, df: pd.DataFrame, ingredients: List[Ingredient]) -> Tuple[Dict[str, NutritionInfo], CleanReport]:
        """清洗营养表"""
        self.report = CleanReport(total_rows=len(df))
        nutrition_map = {}
        ing_ids = {ing.id for ing in ingredients}

        for idx, row in df.iterrows():
            row_num = idx + 1
            ing_id = str(row.get("ingredient_id", "")).strip() if not pd.isna(row.get("ingredient_id")) else ""

            if not ing_id:
                self.report.removed_rows.append(row_num)
                issue = CleanIssue(row_num, "ingredient_id", "关键数据缺失",
                                   row.get("ingredient_id"), None, "缺少ingredient_id，跳过该行")
                self.report.add_issue(issue)
                continue

            if ing_id not in ing_ids:
                issue = CleanIssue(row_num, "ingredient_id", "食材ID不匹配",
                                   ing_id, None, f"食材ID {ing_id} 不在食材清单中")
                self.report.add_issue(issue)

            nutr_fields = [
                ("calories", 0.0), ("protein", 0.0), ("fat", 0.0),
                ("carbs", 0.0), ("sodium", 0.0), ("fiber", 0.0), ("sugar", 0.0)
            ]
            parsed = {}
            raw_notes_parts = []

            for field, default in nutr_fields:
                val, issue = self._parse_number(row.get(field, default), row_num, field, default)
                parsed[field] = val
                if issue:
                    self.report.add_issue(issue)
                    if "备注" in issue.issue_type:
                        raw_notes_parts.append(issue.note)

            nutr = NutritionInfo(
                ingredient_id=ing_id,
                calories=parsed["calories"],
                protein=parsed["protein"],
                fat=parsed["fat"],
                carbs=parsed["carbs"],
                sodium=parsed["sodium"],
                fiber=parsed["fiber"],
                sugar=parsed["sugar"],
                raw_notes=" | ".join(raw_notes_parts)
            )
            nutrition_map[ing_id] = nutr

        self.report.valid_rows = len(nutrition_map)
        return nutrition_map, self.report
