from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from statistics import mean, stdev

from .models import Session, EquatingResult, StudentScore, CorrectionRecord


def export_equated_scores_csv(
    session: Session, output_path: str,
) -> str:
    rows = []
    for fid, scores in session.student_scores.items():
        for s in scores:
            rows.append({
                "学生ID": s.student_id,
                "试卷版本": s.test_form,
                "原始分": round(s.raw_score, 2),
                "满分": s.total_possible,
                "锚题得分": round(s.anchor_score, 2) if s.anchor_score is not None else "",
                "能力估计值": round(s.ability_estimate, 4),
                "等值分": round(s.equated_score, 2),
                "是否有效": "是" if s.is_valid else "否",
                "排除原因": s.exclusion_reason or "",
                "修正次数": len(s.corrections),
            })
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else [])
        writer.writeheader()
        writer.writerows(rows)
    return output_path


def export_conversion_report_csv(
    session: Session, output_path: str,
) -> str:
    rows = []
    for key, eq in session.equating_results.items():
        for raw in range(0, 101):
            rows.append({
                "参照试卷": eq.reference_form,
                "目标试卷": eq.target_form,
                "原始分": raw,
                "等值分": round(eq.transform(float(raw)), 2),
                "方法": eq.method,
                "斜率": round(eq.slope, 4),
                "截距": round(eq.intercept, 4),
                "标准误": round(eq.standard_error, 4),
            })
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else [])
        writer.writeheader()
        writer.writerows(rows)
    return output_path


def export_corrections_csv(
    session: Session, output_path: str,
) -> str:
    rows = [c.to_row() for c in session.corrections]
    if not rows:
        rows = [{"修正ID": "", "修正类型": "", "学生ID": "", "试卷版本": "",
                 "原始值": "", "修正值": "", "原因": "", "时间戳": ""}]
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return output_path


def export_warnings_csv(
    session: Session, output_path: str,
) -> str:
    rows = session.warnings if session.warnings else [{"级别": "", "类别": "", "消息": "", "详情": "", "时间": "", "已确认": ""}]
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return output_path


def export_summary_json(
    session: Session, output_path: str,
) -> str:
    summary = session.summary()
    equating_details = {}
    for key, eq in session.equating_results.items():
        equating_details[key] = {
            "参照试卷": eq.reference_form,
            "目标试卷": eq.target_form,
            "方法": eq.method,
            "斜率": round(eq.slope, 4),
            "截距": round(eq.intercept, 4),
            "标准误": round(eq.standard_error, 4),
            "锚题数": eq.anchor_count,
            "锚题相关": round(eq.anchor_r, 4),
            "参照样本量": eq.sample_size_ref,
            "目标样本量": eq.sample_size_tgt,
        }
    summary["等值换算详情"] = equating_details
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    return output_path


def export_all(
    session: Session, output_dir: str,
) -> Dict[str, str]:
    p = Path(output_dir)
    p.mkdir(parents=True, exist_ok=True)
    results = {}
    results["等值分数"] = export_equated_scores_csv(session, str(p / "等值分数.csv"))
    if session.equating_results:
        results["换算报告"] = export_conversion_report_csv(session, str(p / "换算报告.csv"))
    if session.corrections:
        results["修正痕迹"] = export_corrections_csv(session, str(p / "修正痕迹.csv"))
    if session.warnings:
        results["警告日志"] = export_warnings_csv(session, str(p / "警告日志.csv"))
    results["会话摘要"] = export_summary_json(session, str(p / "会话摘要.json"))
    return results


def plot_score_distribution(
    session: Session, output_path: str,
) -> Optional[str]:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "Heiti SC", "STHeiti"]
        plt.rcParams["axes.unicode_minus"] = False
    except ImportError:
        return None
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    ax1 = axes[0]
    for fid, scores in session.student_scores.items():
        valid = [s.raw_score for s in scores if s.is_valid]
        if valid:
            ax1.hist(valid, bins=20, alpha=0.5, label=f"{fid} 原始分")
    ax1.set_title("原始分分布")
    ax1.set_xlabel("分数")
    ax1.set_ylabel("频数")
    ax1.legend()
    ax2 = axes[1]
    for fid, scores in session.student_scores.items():
        valid = [s.equated_score for s in scores if s.is_valid and s.equated_score > 0]
        if valid:
            ax2.hist(valid, bins=20, alpha=0.5, label=f"{fid} 等值分")
    ax2.set_title("等值分分布")
    ax2.set_xlabel("分数")
    ax2.set_ylabel("频数")
    ax2.legend()
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    return output_path


def plot_equating_lines(
    session: Session, output_path: str,
) -> Optional[str]:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "Heiti SC", "STHeiti"]
        plt.rcParams["axes.unicode_minus"] = False
    except ImportError:
        return None
    fig, ax = plt.subplots(figsize=(8, 6))
    x_range = list(range(0, 101))
    for key, eq in session.equating_results.items():
        y_vals = [eq.transform(float(x)) for x in x_range]
        ax.plot(x_range, y_vals, label=f"{eq.reference_form}→{eq.target_form} ({eq.method})")
    ax.plot([0, 100], [0, 100], "k--", alpha=0.3, label="y=x")
    ax.set_xlabel("参照试卷原始分")
    ax.set_ylabel("目标试卷等值分")
    ax.set_title("等值换算曲线")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    return output_path


def plot_scatter_comparison(
    session: Session, output_path: str,
) -> Optional[str]:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "Heiti SC", "STHeiti"]
        plt.rcParams["axes.unicode_minus"] = False
    except ImportError:
        return None
    form_ids = list(session.test_forms.keys())
    if len(form_ids) < 2:
        return None
    fig, axes = plt.subplots(1, len(form_ids), figsize=(5 * len(form_ids), 5))
    if len(form_ids) == 1:
        axes = [axes]
    for idx, fid in enumerate(form_ids):
        scores = session.student_scores.get(fid, [])
        raw = [s.raw_score for s in scores if s.is_valid]
        eq = [s.equated_score for s in scores if s.is_valid]
        if raw and eq:
            axes[idx].scatter(raw, eq, alpha=0.6, s=20)
            max_val = max(max(raw), max(eq)) * 1.1
            axes[idx].plot([0, max_val], [0, max_val], "k--", alpha=0.3)
        axes[idx].set_xlabel("原始分")
        axes[idx].set_ylabel("等值分")
        axes[idx].set_title(f"试卷[{fid}]")
        axes[idx].grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    return output_path


def plot_charts(
    session: Session, output_dir: str,
) -> Dict[str, str]:
    p = Path(output_dir)
    p.mkdir(parents=True, exist_ok=True)
    results = {}
    dist_path = plot_score_distribution(session, str(p / "分数分布对比.png"))
    if dist_path:
        results["分布对比图"] = dist_path
    eq_path = plot_equating_lines(session, str(p / "等值曲线.png"))
    if eq_path:
        results["等值曲线图"] = eq_path
    scatter_path = plot_scatter_comparison(session, str(p / "散点对比.png"))
    if scatter_path:
        results["散点对比图"] = scatter_path
    return results