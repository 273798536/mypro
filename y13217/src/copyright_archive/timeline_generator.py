"""时间线生成器 - 生成HTML/Markdown/JSON三种格式的历史时间线"""
import json
import os
from datetime import datetime
from typing import List, Dict, Any

from jinja2 import Template

from .models import (
    ProcessingContext, HistoryEntry, Actor, JudgmentStatus,
    JudgmentCard
)


class TimelineGenerator:
    """时间线生成器"""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_all(self, context: ProcessingContext) -> Dict[str, str]:
        """生成所有格式的时间线"""
        timeline_data = self._prepare_timeline_data(context)

        outputs = {}
        outputs["html"] = self._generate_html(timeline_data, context)
        outputs["markdown"] = self._generate_markdown(timeline_data, context)
        outputs["json"] = self._generate_json(timeline_data, context)

        return outputs

    def _prepare_timeline_data(self, context: ProcessingContext) -> List[Dict[str, Any]]:
        """准备时间线数据"""
        timeline = []

        context.history.sort(key=lambda x: x.timestamp)

        for entry in context.history:
            timeline.append({
                "timestamp": entry.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "timestamp_sort": entry.timestamp,
                "actor": entry.actor.value,
                "actor_type": self._get_actor_type(entry.actor),
                "action": entry.action,
                "details": entry.details,
                "target_filename": entry.target_filename,
                "target_track_id": entry.target_track_id,
                "entry_id": entry.entry_id,
                "importance": self._get_importance(entry)
            })

        timeline_sorted = sorted(timeline, key=lambda x: x["timestamp_sort"])
        for item in timeline_sorted:
            del item["timestamp_sort"]
        return timeline_sorted

    def _get_actor_type(self, actor: Actor) -> str:
        """获取操作人类型，用于前端着色"""
        type_map = {
            Actor.LIN_JIE: "linjie",
            Actor.OPERATION_MANAGER: "operation",
            Actor.SYSTEM: "system",
            Actor.MANUAL: "manual"
        }
        return type_map.get(actor, "default")

    def _get_importance(self, entry: HistoryEntry) -> str:
        """获取事件重要性"""
        action = entry.action
        if any(keyword in action for keyword in ["覆盖", "改动", "留存", "入历史"]):
            return "high"
        elif any(keyword in action for keyword in ["确认", "应用", "摘要"]):
            return "medium"
        else:
            return "normal"

    def _generate_html(self, timeline_data: List[Dict], context: ProcessingContext) -> str:
        """生成HTML时间线"""
        html_template = Template("""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>版权授权清单归档 - 历史时间线</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card .number {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        .summary-card .label {
            color: #666;
            margin-top: 5px;
        }
        .timeline {
            position: relative;
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(to bottom, #667eea, #764ba2);
            transform: translateX(-50%);
        }
        .timeline-item {
            position: relative;
            margin-bottom: 30px;
            width: 50%;
            padding-right: 40px;
        }
        .timeline-item:nth-child(even) {
            margin-left: 50%;
            padding-right: 0;
            padding-left: 40px;
        }
        .timeline-item::before {
            content: '';
            position: absolute;
            right: -8px;
            top: 20px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            border: 4px solid #667eea;
            z-index: 1;
        }
        .timeline-item:nth-child(even)::before {
            right: auto;
            left: -8px;
        }
        .timeline-item.high-importance::before {
            background: #ff6b6b;
            border-color: #ff6b6b;
            box-shadow: 0 0 10px rgba(255,107,107,0.5);
        }
        .timeline-item.medium-importance::before {
            background: #ffa502;
            border-color: #ffa502;
        }
        .timeline-content {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            position: relative;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .timeline-content:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        .timeline-item.high-importance .timeline-content {
            background: #fff5f5;
            border-left: 4px solid #ff6b6b;
        }
        .timeline-item.medium-importance .timeline-content {
            background: #fffaf0;
            border-left: 4px solid #ffa502;
        }
        .actor-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
            margin-bottom: 10px;
        }
        .actor-linjie { background: #d4edda; color: #155724; }
        .actor-operation { background: #fff3cd; color: #856404; }
        .actor-system { background: #d1ecf1; color: #0c5460; }
        .actor-manual { background: #f8d7da; color: #721c24; }
        .timestamp {
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 8px;
        }
        .action {
            font-size: 1.1rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        .details {
            background: white;
            border-radius: 8px;
            padding: 12px;
            font-size: 0.95rem;
            color: #555;
        }
        .details p { margin-bottom: 5px; }
        .details p:last-child { margin-bottom: 0; }
        .target {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed #ddd;
            font-size: 0.85rem;
            color: #888;
        }
        .footer {
            text-align: center;
            color: white;
            margin-top: 30px;
            opacity: 0.8;
        }
        @media (max-width: 768px) {
            .timeline::before { left: 20px; }
            .timeline-item {
                width: 100%;
                padding-left: 60px !important;
                padding-right: 0 !important;
                margin-left: 0 !important;
            }
            .timeline-item::before {
                left: 12px !important;
                right: auto !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎵 版权授权清单归档</h1>
            <p>历史时间线 - 可直接用于沟通的完整变更记录</p>
        </div>

        <div class="summary-cards">
            <div class="summary-card">
                <div class="number">{{ stats.total_files }}</div>
                <div class="label">版权文件总数</div>
            </div>
            <div class="summary-card">
                <div class="number">{{ stats.matched }}</div>
                <div class="label">最终匹配</div>
            </div>
            <div class="summary-card">
                <div class="number">{{ stats.overridden }}</div>
                <div class="label">判断被覆盖</div>
            </div>
            <div class="summary-card">
                <div class="number">{{ stats.linjie_count }}</div>
                <div class="label">林姐判断数</div>
            </div>
            <div class="summary-card">
                <div class="number">{{ stats.operation_count }}</div>
                <div class="label">运营主管改动</div>
            </div>
            <div class="summary-card">
                <div class="number">{{ stats.events }}</div>
                <div class="label">历史事件总数</div>
            </div>
        </div>

        <div class="timeline">
            {% for item in timeline %}
            <div class="timeline-item {{ item.importance }}-importance">
                <div class="timeline-content">
                    <span class="actor-badge actor-{{ item.actor_type }}">{{ item.actor }}</span>
                    <div class="timestamp">⏰ {{ item.timestamp }}</div>
                    <div class="action">{{ item.action }}</div>
                    <div class="details">
                        {% for key, value in item.details.items() %}
                        <p><strong>{{ key }}:</strong> {{ value }}</p>
                        {% endfor %}
                    </div>
                    {% if item.target_filename or item.target_track_id %}
                    <div class="target">
                        {% if item.target_filename %}📄 文件: {{ item.target_filename }}{% endif %}
                        {% if item.target_track_id %} | 🎵 曲目: {{ item.target_track_id }}{% endif %}
                    </div>
                    {% endif %}
                </div>
            </div>
            {% endfor %}
        </div>

        <div class="footer">
            <p>生成时间: {{ generate_time }} | 此时间线可直接用于跨部门沟通</p>
        </div>
    </div>
</body>
</html>
        """)

        stats = self._get_stats(context)
        html_content = html_template.render(
            timeline=timeline_data,
            stats=stats,
            generate_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

        output_path = os.path.join(self.output_dir, "timeline.html")
        with open(output_path, "w", encoding="utf-8") as fp:
            fp.write(html_content)

        return output_path

    def _generate_markdown(self, timeline_data: List[Dict], context: ProcessingContext) -> str:
        """生成Markdown时间线"""
        lines = []
        lines.append("# 🎵 版权授权清单归档 - 历史时间线")
        lines.append("")
        lines.append("> 此时间线可直接用于跨部门沟通，记录了完整的判断变更过程")
        lines.append("")

        stats = self._get_stats(context)
        lines.append("## 📊 处理概览")
        lines.append("")
        lines.append(f"- 版权文件总数：**{stats['total_files']}**")
        lines.append(f"- 最终匹配：**{stats['matched']}**")
        lines.append(f"- 判断被覆盖：**{stats['overridden']}**")
        lines.append(f"- 林姐判断数：**{stats['linjie_count']}**")
        lines.append(f"- 运营主管改动：**{stats['operation_count']}**")
        lines.append(f"- 历史事件总数：**{stats['events']}**")
        lines.append("")

        lines.append("## 📅 历史时间线")
        lines.append("")

        for item in timeline_data:
            importance_icon = {"high": "🔴", "medium": "🟡", "normal": "⚪"}.get(item["importance"], "⚪")
            actor_icon = {
                "linjie": "👩‍🏫",
                "operation": "👔",
                "system": "🖥️",
                "manual": "✍️"
            }.get(item["actor_type"], "👤")

            lines.append(f"### {importance_icon} {actor_icon} {item['timestamp']} - {item['actor']}")
            lines.append("")
            lines.append(f"**动作：** {item['action']}")
            lines.append("")
            lines.append("**详情：**")
            for key, value in item["details"].items():
                lines.append(f"- {key}: {value}")

            if item["target_filename"] or item["target_track_id"]:
                lines.append("")
                lines.append("**关联对象：**")
                if item["target_filename"]:
                    lines.append(f"- 📄 文件：`{item['target_filename']}`")
                if item["target_track_id"]:
                    lines.append(f"- 🎵 曲目：`{item['target_track_id']}`")

            lines.append("")
            lines.append("---")
            lines.append("")

        lines.append(f"_生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_")

        md_content = "\n".join(lines)
        output_path = os.path.join(self.output_dir, "timeline.md")
        with open(output_path, "w", encoding="utf-8") as fp:
            fp.write(md_content)

        return output_path

    def _generate_json(self, timeline_data: List[Dict], context: ProcessingContext) -> str:
        """生成JSON时间线"""
        stats = self._get_stats(context)

        json_data = {
            "metadata": {
                "title": "版权授权清单归档 - 历史时间线",
                "description": "完整的判断变更历史记录，可用于系统集成",
                "generated_at": datetime.now().isoformat(),
                "statistics": stats
            },
            "judgment_cards": [
                {
                    "card_id": card.card_id,
                    "filename": card.filename,
                    "track_id": card.track_id,
                    "initial_judgment": card.initial_judgment.value,
                    "initial_reason": card.initial_reason,
                    "current_judgment": card.current_judgment.value,
                    "current_reason": card.current_reason,
                    "is_overridden": card.is_overridden,
                    "overridden_by": card.overridden_by.value if card.overridden_by else None,
                    "override_time": card.override_time.isoformat() if card.override_time else None,
                    "override_reason": card.override_reason,
                    "actor": card.actor.value,
                    "judgment_time": card.judgment_time.isoformat()
                }
                for card in context.judgment_cards
            ],
            "timeline": timeline_data
        }

        output_path = os.path.join(self.output_dir, "timeline.json")
        with open(output_path, "w", encoding="utf-8") as fp:
            json.dump(json_data, fp, ensure_ascii=False, indent=2)

        return output_path

    def _get_stats(self, context: ProcessingContext) -> Dict[str, Any]:
        """获取统计数据"""
        return {
            "total_files": len(context.copyright_files),
            "matched": sum(1 for c in context.judgment_cards
                          if c.current_judgment == JudgmentStatus.MATCHED),
            "overridden": sum(1 for c in context.judgment_cards if c.is_overridden),
            "linjie_count": sum(1 for c in context.judgment_cards
                               if c.overridden_by == Actor.LIN_JIE),
            "operation_count": sum(1 for c in context.judgment_cards
                                  if c.overridden_by == Actor.OPERATION_MANAGER),
            "manual_count": sum(1 for c in context.judgment_cards
                               if c.overridden_by == Actor.MANUAL),
            "events": len(context.history),
            "notes_count": len(context.notes)
        }
