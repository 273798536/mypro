from datetime import datetime
from typing import List, Dict, Optional
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

from .models import MergedRecord, ShipTrack
from .tide_calculator import TideCalculator, TIDE_STATIONS


class Visualizer:
    def __init__(self):
        self.color_valid = "#2E7D32"
        self.color_invalid = "#C62828"
        self.color_warning = "#F57C00"
        self.color_ship = "#1565C0"
        self.color_photo_late = "#E65100"

    def create_map(self, records: List[MergedRecord], ship_tracks: List[ShipTrack],
                   selected_record_id: Optional[str] = None) -> go.Figure:
        fig = go.Figure()

        for location, info in TIDE_STATIONS.items():
            fig.add_trace(go.Scattergeo(
                lon=[info["lon"]],
                lat=[info["lat"]],
                mode="markers+text",
                marker=dict(size=10, color="#9E9E9E", symbol="square"),
                text=[location],
                textposition="bottom center",
                name=f"潮位站：{location}",
                hoverinfo="text",
                hovertext=f"潮位站：{location}",
            ))

        valid_records = [r for r in records if r.is_valid]
        invalid_records = [r for r in records if not r.is_valid]

        if valid_records:
            lons = [r.lon for r in valid_records]
            lats = [r.lat for r in valid_records]
            texts = [
                f"{r.species}：{r.bird_count}只<br>"
                f"时间：{r.obs_time.strftime('%Y-%m-%d %H:%M')}<br>"
                f"地点：{r.location}<br>"
                f"潮位：{r.tide_height:.2f}m" if r.tide_height else "潮位：无数据"
                for r in valid_records
            ]
            sizes = [max(8, min(25, r.bird_count / 2)) for r in valid_records]

            fig.add_trace(go.Scattergeo(
                lon=lons,
                lat=lats,
                mode="markers",
                marker=dict(size=sizes, color=self.color_valid, opacity=0.8,
                            line=dict(width=1, color="white")),
                text=texts,
                hoverinfo="text",
                name="有效观测",
            ))

        if invalid_records:
            lons = [r.lon for r in invalid_records]
            lats = [r.lat for r in invalid_records]
            texts = [
                f"【无效】{r.species}：{r.bird_count}只<br>"
                f"时间：{r.obs_time.strftime('%Y-%m-%d %H:%M')}<br>"
                f"原因：{r.invalid_reason}"
                for r in invalid_records
            ]

            fig.add_trace(go.Scattergeo(
                lon=lons,
                lat=lats,
                mode="markers",
                marker=dict(size=14, color=self.color_invalid,
                            symbol="x", line=dict(width=2)),
                text=texts,
                hoverinfo="text",
                name="无效观测",
            ))

        if ship_tracks:
            ships_by_name = {}
            for t in ship_tracks:
                if t.ship_name not in ships_by_name:
                    ships_by_name[t.ship_name] = []
                ships_by_name[t.ship_name].append(t)

            for ship_name, tracks in ships_by_name.items():
                tracks.sort(key=lambda x: x.timestamp)
                lons = [t.lon for t in tracks]
                lats = [t.lat for t in tracks]
                color = self.color_warning if any(t.is_supplementary for t in tracks) else self.color_ship

                fig.add_trace(go.Scattergeo(
                    lon=lons,
                    lat=lats,
                    mode="lines+markers",
                    line=dict(width=2, color=color),
                    marker=dict(size=6, color=color,
                                symbol="triangle-up" if tracks[0].is_supplementary else "circle"),
                    name=f"船舶：{ship_name}" + ("（补录）" if any(t.is_supplementary for t in tracks) else ""),
                    hoverinfo="text",
                    text=[f"{ship_name}<br>时间：{t.timestamp.strftime('%H:%M')}<br>速度：{t.speed}节"
                          for t in tracks],
                ))

        if selected_record_id:
            selected = next((r for r in records if r.record_id == selected_record_id), None)
            if selected:
                fig.add_trace(go.Scattergeo(
                    lon=[selected.lon],
                    lat=[selected.lat],
                    mode="markers",
                    marker=dict(size=20, color="#FFD700",
                                line=dict(width=3, color="#000")),
                    name="选中记录",
                    hoverinfo="text",
                    hovertext=f"已选中：{selected.species}",
                ))

        fig.update_layout(
            geo=dict(
                showland=True,
                landcolor="rgb(212, 212, 212)",
                showocean=True,
                oceancolor="rgb(180, 210, 255)",
                showlakes=True,
                lakecolor="rgb(180, 210, 255)",
                projection_type="mercator",
                lonaxis=dict(range=[121.65, 122.05]),
                lataxis=dict(range=[30.0, 30.4]),
            ),
            margin=dict(l=0, r=0, t=0, b=0),
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            height=400,
        )

        return fig

    def create_species_chart(self, records: List[MergedRecord]) -> go.Figure:
        valid = [r for r in records if r.is_valid]
        species_counts = {}
        for r in valid:
            if r.species not in species_counts:
                species_counts[r.species] = 0
            species_counts[r.species] += r.bird_count

        species_list = sorted(species_counts.keys())
        counts = [species_counts[s] for s in species_list]

        fig = go.Figure(data=[
            go.Bar(
                x=species_list,
                y=counts,
                marker_color=self.color_valid,
                text=counts,
                textposition="outside",
            )
        ])

        fig.update_layout(
            title="鸟类种类数量分布（有效记录）",
            xaxis_title="种类",
            yaxis_title="数量（只）",
            height=350,
            margin=dict(l=40, r=20, t=40, b=40),
        )

        return fig

    def create_tide_chart(self, location: str, records: List[MergedRecord],
                          tide_calc: TideCalculator) -> go.Figure:
        if not records:
            fig = go.Figure()
            fig.update_layout(title="暂无数据", height=300)
            return fig

        times = [r.obs_time for r in records]
        start_time = min(times).replace(hour=0, minute=0, second=0)
        end_time = max(times).replace(hour=23, minute=59, second=59)

        tide_series = tide_calc.get_tide_series(location, start_time, end_time, 30)
        series_times = [t[0] for t in tide_series]
        series_heights = [t[1] for t in tide_series]

        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=series_times,
            y=series_heights,
            mode="lines",
            name="潮汐曲线",
            line=dict(color="#1976D2", width=2),
            fill="tozeroy",
            fillcolor="rgba(25, 118, 210, 0.1)",
        ))

        location_records = [r for r in records if r.location == location]
        if location_records:
            valid_r = [r for r in location_records if r.is_valid and r.tide_height is not None]
            invalid_r = [r for r in location_records if not r.is_valid]

            if valid_r:
                fig.add_trace(go.Scatter(
                    x=[r.obs_time for r in valid_r],
                    y=[r.tide_height for r in valid_r],
                    mode="markers",
                    marker=dict(color=self.color_valid, size=10,
                                line=dict(width=1, color="white")),
                    name="有效观测",
                    text=[f"{r.species}：{r.bird_count}只" for r in valid_r],
                    hoverinfo="text",
                ))

            if invalid_r:
                fig.add_trace(go.Scatter(
                    x=[r.obs_time for r in invalid_r],
                    y=[r.tide_height if r.tide_height else 0 for r in invalid_r],
                    mode="markers",
                    marker=dict(color=self.color_invalid, size=12, symbol="x"),
                    name="无效记录",
                    text=[r.invalid_reason for r in invalid_r],
                    hoverinfo="text",
                ))

        fig.update_layout(
            title=f"{location} - 潮汐与观测时间分布",
            xaxis_title="时间",
            yaxis_title="潮位（m）",
            height=350,
            margin=dict(l=40, r=20, t=40, b=40),
            hovermode="closest",
        )

        return fig

    def create_daily_summary_chart(self, records: List[MergedRecord]) -> go.Figure:
        valid = [r for r in records if r.is_valid]
        daily_data = {}
        for r in valid:
            day = r.obs_time.strftime("%Y-%m-%d")
            if day not in daily_data:
                daily_data[day] = {"count": 0, "species": set()}
            daily_data[day]["count"] += r.bird_count
            daily_data[day]["species"].add(r.species)

        days = sorted(daily_data.keys())
        counts = [daily_data[d]["count"] for d in days]
        species_nums = [len(daily_data[d]["species"]) for d in days]

        fig = go.Figure()

        fig.add_trace(go.Bar(
            x=days,
            y=counts,
            name="鸟类总数",
            marker_color=self.color_valid,
            text=counts,
            textposition="outside",
            yaxis="y",
        ))

        fig.add_trace(go.Scatter(
            x=days,
            y=species_nums,
            name="种类数",
            mode="lines+markers",
            line=dict(color=self.color_warning, width=3),
            marker=dict(size=10),
            yaxis="y2",
        ))

        invalid_by_day = {}
        for r in records:
            if not r.is_valid:
                day = r.obs_time.strftime("%Y-%m-%d")
                if day not in invalid_by_day:
                    invalid_by_day[day] = 0
                invalid_by_day[day] += 1

        if invalid_by_day:
            inv_days = sorted(invalid_by_day.keys())
            inv_counts = [invalid_by_day[d] for d in inv_days]
            fig.add_trace(go.Bar(
                x=inv_days,
                y=inv_counts,
                name="无效记录",
                marker_color=self.color_invalid,
                text=inv_counts,
                textposition="outside",
            ))

        fig.update_layout(
            title="每日观测汇总",
            xaxis_title="日期",
            yaxis=dict(title="数量（只）", side="left"),
            yaxis2=dict(title="种类数", side="right", overlaying="y", range=[0, max(species_nums) + 2] if species_nums else [0, 10]),
            barmode="group",
            height=350,
            margin=dict(l=40, r=40, t=40, b=40),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5),
        )

        return fig

    def create_data_table(self, records: List[MergedRecord], show_all: bool = False) -> pd.DataFrame:
        if show_all:
            display_records = records
        else:
            display_records = records

        data = []
        for r in display_records:
            row = r.to_dict()
            data.append(row)

        df = pd.DataFrame(data)
        return df

    def get_issue_summary(self, records: List[MergedRecord]) -> Dict:
        issues = {
            "total": len(records),
            "valid": sum(1 for r in records if r.is_valid),
            "invalid": sum(1 for r in records if not r.is_valid),
            "tz_error": sum(1 for r in records if "潮位时区错误" in r.invalid_reason),
            "photo_late": sum(1 for r in records if r.photo_late),
            "ship_nearby": sum(1 for r in records if r.ship_nearby),
            "supplementary_ship": sum(1 for r in records if any("补录" in s for s in r.issues)),
        }
        return issues
