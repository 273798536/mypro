"""
地图生成模块
使用 folium 生成交互式潮间带物种分布图。
地图上每个点都关联处理记录 ID，方便回溯。
地图与报告共用同一份处理后的数据，保证两者对得上。
"""
from __future__ import annotations

import json
from typing import Optional

import folium
import pandas as pd
from folium import IFrame, Popup

from .audit_log import AuditLog


SPECIES_COLORS = {
    "红树林": "green",
    "互花米草": "red",
    "芦苇": "orange",
    "碱蓬": "purple",
    "缢蛏": "blue",
    "泥蚶": "cadetblue",
    "青蛤": "lightblue",
    "招潮蟹": "beige",
    "弹涂鱼": "darkblue",
    "海葵": "pink",
    "default": "lightgray"
}


class MapGenerator:
    """地图生成器"""

    def __init__(self, audit_log: AuditLog):
        self.audit = audit_log
        self._map: Optional[folium.Map] = None
        self._point_records = []

    def generate(
        self,
        species_df: pd.DataFrame,
        output_path: str = "species_map.html",
        center_lat: Optional[float] = None,
        center_lon: Optional[float] = None,
        zoom_start: int = 12
    ) -> str:
        """生成物种分布地图，返回文件路径"""

        if species_df is None or len(species_df) == 0:
            return ""

        if center_lat is None and "latitude" in species_df.columns:
            center_lat = species_df["latitude"].mean()
        if center_lon is None and "longitude" in species_df.columns:
            center_lon = species_df["longitude"].mean()

        if center_lat is None or center_lon is None:
            center_lat = 28.0
            center_lon = 121.0

        self._map = folium.Map(
            location=[center_lat, center_lon],
            zoom_start=zoom_start,
            tiles="CartoDB positron"
        )

        self._add_species_markers(species_df)
        self._add_map_legend()
        self._add_audit_info()

        self._map.save(output_path)
        return output_path

    def _add_species_markers(self, species_df: pd.DataFrame):
        """添加物种标记点，每个点都包含处理记录信息"""

        for idx, row in species_df.iterrows():
            lat = row.get("latitude")
            lon = row.get("longitude")

            if pd.isna(lat) or pd.isna(lon):
                continue

            species_name = str(row.get("species", "未知物种"))
            color = SPECIES_COLORS.get(species_name, SPECIES_COLORS["default"])

            records = self.audit.get_records_by_source("species", int(idx))
            record_ids = [r.record_id for r in records]

            issues = [
                i for i in self.audit.issues
                if i.source_type == "species" and i.source_row_index == int(idx)
            ]
            issue_ids = [i.issue_id for i in issues]

            popup_html = self._build_popup_html(
                row=row,
                row_idx=int(idx),
                species_name=species_name,
                record_ids=record_ids,
                issue_ids=issue_ids
            )

            iframe = IFrame(popup_html, width=380, height=280)
            popup = Popup(iframe, max_width=400)

            icon = folium.Icon(color=color, icon="fish", prefix="fa")

            marker = folium.CircleMarker(
                location=[lat, lon],
                radius=8,
                color=color,
                fill=True,
                fill_color=color,
                fill_opacity=0.7,
                popup=popup,
                tooltip=f"{species_name} (第{idx}行)"
            )
            marker.add_to(self._map)

            self._point_records.append({
                "row_index": int(idx),
                "species": species_name,
                "lat": lat,
                "lon": lon,
                "record_ids": record_ids,
                "issue_ids": issue_ids
            })

    def _build_popup_html(
        self,
        row: pd.Series,
        row_idx: int,
        species_name: str,
        record_ids: list,
        issue_ids: list
    ) -> str:
        """构建弹窗 HTML，显示物种信息和处理记录"""

        tide_height = row.get("tide_height_at_survey", "N/A")
        tide_phase = row.get("tide_phase", "N/A")
        survey_time = row.get("survey_time", "N/A")
        linked_tide_row = row.get("linked_tide_row", -1)

        records_html = ""
        if record_ids:
            records_html = "、".join(
                f'<span style="color:#2563eb;font-family:monospace;">{rid}</span>'
                for rid in record_ids
            )
        else:
            records_html = '<span style="color:#9ca3af;">无</span>'

        issues_html = ""
        if issue_ids:
            issues_html = "、".join(
                f'<span style="color:#dc2626;font-family:monospace;">{iid}</span>'
                for iid in issue_ids
            )
        else:
            issues_html = '<span style="color:#10b981;">无</span>'

        html = f"""
        <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;
                    font-size:13px;line-height:1.6;">
          <h4 style="margin:0 0 8px 0;color:#1f2937;">
            🌿 {species_name}
          </h4>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:3px 6px;color:#6b7280;width:90px;">数据行号</td>
              <td style="padding:3px 6px;font-family:monospace;">第 {row_idx} 行</td>
            </tr>
            <tr>
              <td style="padding:3px 6px;color:#6b7280;">观测时间</td>
              <td style="padding:3px 6px;">{survey_time}</td>
            </tr>
            <tr>
              <td style="padding:3px 6px;color:#6b7280;">潮位</td>
              <td style="padding:3px 6px;">{tide_height} cm</td>
            </tr>
            <tr>
              <td style="padding:3px 6px;color:#6b7280;">潮相</td>
              <td style="padding:3px 6px;">{tide_phase}</td>
            </tr>
            <tr>
              <td style="padding:3px 6px;color:#6b7280;">关联潮汐行</td>
              <td style="padding:3px 6px;font-family:monospace;">
                {linked_tide_row if linked_tide_row >= 0 else '未关联'}
              </td>
            </tr>
          </table>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e5e7eb;">
            <div style="color:#6b7280;font-size:12px;">处理记录ID：</div>
            <div style="margin-top:2px;">{records_html}</div>
          </div>
          <div style="margin-top:4px;">
            <div style="color:#6b7280;font-size:12px;">校验问题：</div>
            <div style="margin-top:2px;">{issues_html}</div>
          </div>
          <div style="margin-top:6px;font-size:11px;color:#9ca3af;">
            💡 记录ID可用于复核时回溯处理过程
          </div>
        </div>
        """
        return html

    def _add_map_legend(self):
        """添加图例"""
        legend_html = """
        <div style="
            position: fixed;
            bottom: 30px;
            left: 30px;
            z-index: 9999;
            background: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            font-family: 'PingFang SC','Microsoft YaHei',sans-serif;
            font-size: 13px;
        ">
          <div style="font-weight:bold;margin-bottom:8px;color:#1f2937;">
            🦀 潮间带物种图例
          </div>
        """

        for species, color in list(SPECIES_COLORS.items())[:8]:
            legend_html += f"""
            <div style="display:flex;align-items:center;margin:3px 0;">
              <div style="
                  width:14px;height:14px;border-radius:50%;
                  background:{color};margin-right:8px;
              "></div>
              <span>{species}</span>
            </div>
            """

        legend_html += """
          <div style="margin-top:8px;font-size:11px;color:#6b7280;
                      border-top:1px solid #e5e7eb;padding-top:6px;">
            点击标记点查看处理记录
          </div>
        </div>
        """

        self._map.get_root().html.add_child(folium.Element(legend_html))

    def _add_audit_info(self):
        """在地图底部添加审计信息"""
        summary = self.audit.summary()

        audit_html = f"""
        <div style="
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 9999;
            background: white;
            padding: 10px 14px;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            font-family: 'PingFang SC','Microsoft YaHei',sans-serif;
            font-size: 11px;
            color: #6b7280;
            max-width: 200px;
        ">
          <div style="font-weight:bold;color:#1f2937;margin-bottom:4px;">
            处理记录摘要
          </div>
          <div>会话：{summary['session_name']}</div>
          <div>处理记录：{summary['total_records']} 条</div>
          <div>校验问题：{summary['total_issues']} 个</div>
          <div style="margin-top:3px;font-size:10px;color:#9ca3af;">
            地图、图表、报告共用同一批记录
          </div>
        </div>
        """

        self._map.get_root().html.add_child(folium.Element(audit_html))

    def get_point_records(self) -> list:
        """获取所有地图点关联的记录信息，用于联动"""
        return self._point_records
