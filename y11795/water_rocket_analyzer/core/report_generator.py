import os
from datetime import datetime
from typing import Optional, Dict, List
from pathlib import Path

from .data_loader import FlightData
from .trajectory_fitter import FitResult
from .anomaly_detector import AnomalyReport
from .physics_model import PhysicsParameters


class ReportGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_markdown_report(
        self,
        flight_data: FlightData,
        fit_result: FitResult,
        anomaly_report: AnomalyReport,
        quality_score: Dict,
        sensitivity_analysis: Optional[Dict] = None,
        filename: Optional[str] = None
    ) -> str:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"flight_analysis_report_{timestamp}.md"

        filepath = os.path.join(self.output_dir, filename)

        content = self._build_report_content(
            flight_data, fit_result, anomaly_report, quality_score, sensitivity_analysis
        )

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        return filepath

    def _build_report_content(
        self,
        flight_data: FlightData,
        fit_result: FitResult,
        anomaly_report: AnomalyReport,
        quality_score: Dict,
        sensitivity_analysis: Optional[Dict]
    ) -> str:
        sections = []

        sections.append(self._header_section())
        sections.append(self._overview_section(flight_data, fit_result, quality_score))
        sections.append(self._data_quality_section(quality_score))
        sections.append(self._fitting_results_section(fit_result))
        sections.append(self._trajectory_summary_section(fit_result))
        sections.append(self._anomalies_section(flight_data, anomaly_report))
        sections.append(self._modifications_section(flight_data))
        sections.append(self._review_required_section(flight_data))

        if sensitivity_analysis:
            sections.append(self._sensitivity_section(sensitivity_analysis))

        sections.append(self._methodology_section())
        sections.append(self._appendix_section(flight_data, fit_result))

        return "\n\n".join(sections)

    def _header_section(self) -> str:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return f"""# 水火箭飞行分析报告

**生成时间**: {timestamp}  
**分析工具**: Water Rocket Flight Analyzer v1.0.0

---
"""

    def _overview_section(
        self,
        flight_data: FlightData,
        fit_result: FitResult,
        quality_score: Dict
    ) -> str:
        traj = fit_result.fitted_trajectory
        max_h = traj.max_height if traj else 0
        land_t = traj.landing_time if traj else 0

        return f"""## 1. 概览

### 1.1 基本信息
| 项目 | 值 |
|------|-----|
| 数据来源 | `{Path(flight_data.metadata.source_file).name}` |
| 数据点数 | {len(flight_data.data_points)} |
| 有效点数 | {quality_score['n_valid']} |
| 记录时长 | {flight_data.time_series[-1]:.2f} s |
| 数据质量评级 | **{quality_score['grade']}** |

### 1.2 关键结果摘要
| 参数 | 估算值 | 95%置信区间 |
|------|--------|-------------|
| **初速度 v₀** | **{fit_result.initial_velocity:.2f} m/s** | [{fit_result.confidence_interval.get('v0', ['-', '-'])[0]:.2f}, {fit_result.confidence_interval.get('v0', ['-', '-'])[1]:.2f}] m/s |
| **阻力系数 C_d** | **{fit_result.drag_coefficient:.4f}** | [{fit_result.confidence_interval.get('Cd', ['-', '-'])[0]:.4f}, {fit_result.confidence_interval.get('Cd', ['-', '-'])[1]:.4f}] |
| 发射角 | {fit_result.launch_angle:.1f}° | - |

### 1.3 轨迹预测
| 指标 | 预测值 |
|------|--------|
| 最大高度 | {max_h:.2f} m |
| 到达最高点时间 | {traj.max_height_time:.2f} s |
| 落地时间 | {land_t:.2f} s |
| 总飞行时间 | {traj.flight_duration:.2f} s |
| 水平落地点 | ({traj.landing_position[0]:.1f}, {traj.landing_position[1]:.1f}) m |

### 1.4 拟合质量
| 指标 | 值 | 说明 |
|------|-----|------|
| RMSE | {fit_result.rmse:.3f} m | 均方根误差 |
| R² | {fit_result.r_squared:.4f} | 决定系数 |
| 最大高度误差 | {fit_result.max_height_error:.2f} m | 预测与实际偏差 |

---
"""

    def _data_quality_section(self, quality_score: Dict) -> str:
        score = quality_score['overall_score']
        rating = "🟢 优秀" if score >= 0.8 else "🟡 良好" if score >= 0.6 else "🟠 一般" if score >= 0.4 else "🔴 较差"

        return f"""## 2. 数据质量评估

### 2.1 总体评分: **{rating}** ({quality_score['overall_score']:.2f}/1.0)

### 2.2 分项评分
| 维度 | 得分 | 权重 | 说明 |
|------|------|------|------|
| 数据完整性 | {quality_score['completeness_score']:.2f} | 40% | 有效数据点比例 |
| 采样一致性 | {quality_score['sampling_consistency']:.2f} | 30% | 时间间隔均匀性 |
| 信号质量 | {quality_score['noise_score']:.2f} | 30% | 数据噪声水平 |

### 2.3 数据状态
| 状态 | 数量 | 占比 |
|------|------|------|
| ✅ 正常数据 | {quality_score['n_valid'] - quality_score['n_modified']} | {100 * (quality_score['n_valid'] - quality_score['n_modified']) / quality_score['n_points']:.1f}% |
| 🔧 已修正 | {quality_score['n_modified']} | {100 * quality_score['n_modified'] / quality_score['n_points']:.1f}% |
| ⚠️ 待人工确认 | {quality_score['n_review_required']} | {100 * quality_score['n_review_required'] / quality_score['n_points']:.1f}% |

> **注意**: 待人工确认的数据点未参与拟合计算，可能影响结果准确性。

---
"""

    def _fitting_results_section(self, fit_result: FitResult) -> str:
        ci = fit_result.confidence_interval

        return f"""## 3. 参数拟合结果

### 3.1 物理参数

#### 初速度 v₀
- **估算值**: `{fit_result.initial_velocity:.2f} m/s`
- **95%置信区间**: `[{ci.get('v0', ['-', '-'])[0]:.2f}, {ci.get('v0', ['-', '-'])[1]:.2f}] m/s`
- **相对不确定度**: `{100 * (ci['v0'][1] - ci['v0'][0]) / (2 * fit_result.initial_velocity):.1f}%` (基于自举法)

#### 阻力系数 C_d
- **估算值**: `{fit_result.drag_coefficient:.4f}`
- **95%置信区间**: `[{ci.get('Cd', ['-', '-'])[0]:.4f}, {ci.get('Cd', ['-', '-'])[1]:.4f}]`
- **典型参考值**: 0.3-0.5 (钝体火箭)

### 3.2 拟合诊断

#### 拟合统计
| 统计量 | 值 | 评价 |
|--------|-----|------|
| RMSE | {fit_result.rmse:.3f} m | {'🟢 优秀' if fit_result.rmse < 0.5 else '🟡 良好' if fit_result.rmse < 2 else '🟠 一般'} |
| R² | {fit_result.r_squared:.4f} | {'🟢 优秀' if fit_result.r_squared > 0.95 else '🟡 良好' if fit_result.r_squared > 0.85 else '🟠 一般'} |

#### 迭代信息
- 迭代次数: {fit_result.params.get('iterations', 'N/A')}
- 收敛状态: {'✅ 成功' if fit_result.params.get('success', False) else '❌ 未收敛'}

> **计算方法**: 使用 L-BFGS-B 非线性最小二乘优化，最小化实际高度与模拟高度的残差平方和。

---
"""

    def _trajectory_summary_section(self, fit_result: FitResult) -> str:
        traj = fit_result.fitted_trajectory
        if not traj:
            return "## 4. 轨迹预测\n\n*无轨迹数据*"

        params = traj.params
        max_v = max(p.drag_force for p in traj.points) if traj.points else 0
        avg_drag = sum(p.drag_force for p in traj.points) / len(traj.points) if traj.points else 0

        return f"""## 4. 轨迹预测分析

### 4.1 关键时间点
| 事件 | 时间 (s) | 高度 (m) | 速度 (m/s) |
|------|----------|----------|------------|
| 发射 | 0.00 | 0.00 | {traj.initial_velocity:.1f} |
| 最高点 | {traj.max_height_time:.2f} | {traj.max_height:.2f} | ~0 |
| 落地 | {traj.landing_time:.2f} | 0.00 | 计算中 |

### 4.2 受力分析
| 指标 | 值 |
|------|-----|
| 火箭质量 | {params.rocket_mass:.2f} kg |
| 火箭直径 | {params.rocket_diameter * 100:.1f} cm |
| 迎风面积 | {params.rocket_area * 1e4:.1f} cm² |
| 最大阻力 | {max_v:.2f} N |
| 平均阻力 | {avg_drag:.2f} N |
| 重力 | {params.rocket_mass * params.g:.2f} N |

### 4.3 风场影响
- 风速: {params.wind_speed:.1f} m/s
- 风向: {params.wind_direction:.0f}°
- 水平漂移: {abs(traj.landing_position[0]):.1f} m

---
"""

    def _anomalies_section(
        self,
        flight_data: FlightData,
        anomaly_report: AnomalyReport
    ) -> str:
        sections = ["## 5. 异常检测报告"]

        sections.append(f"""
### 5.1 异常汇总
| 异常类型 | 数量 | 已自动修复 | 需人工确认 |
|----------|------|------------|------------|
| 传感器漏点 | {len(anomaly_report.sensor_dropouts)} | 0 | {len(anomaly_report.sensor_dropouts)} |
| 数据尖峰 | {len(anomaly_report.spikes)} | {sum(1 for s in anomaly_report.spikes if s.get('can_auto_fix', False))} | 0 |
| 落地反弹 | {len(anomaly_report.bounce_events)} | 0 | {len(anomaly_report.bounce_events)} |
| 速度突变 | {len(anomaly_report.velocity_anomalies)} | 0 | {len(anomaly_report.velocity_anomalies)} |
| 风场异常 | {len(anomaly_report.wind_anomalies)} | 0 | {len(anomaly_report.wind_anomalies)} |
| **总计** | **{anomaly_report.total_anomalies}** | **{anomaly_report.auto_fixed_count}** | **{anomaly_report.needs_review_count}** |
""")

        if anomaly_report.sensor_dropouts:
            sections.append("""### 5.2 传感器漏点详情
| 序号 | 起始时间 | 结束时间 | 中断时长 | 严重程度 | 说明 |
|------|----------|----------|----------|----------|------|""")
            for i, dropout in enumerate(anomaly_report.sensor_dropouts, 1):
                severity_icon = "🔴" if dropout['severity'] == 'high' else "🟡"
                sections.append(
                    f"| {i} | {dropout['start_time']:.2f}s | {dropout['end_time']:.2f}s | "
                    f"{dropout['gap_duration']:.2f}s | {severity_icon} {dropout['severity']} | {dropout['description']} |"
                )

        if anomaly_report.bounce_events:
            sections.append("""
### 5.3 落地反弹事件
> ⚠️ **重要**: 落地反弹会导致落地时间估算偏高，需在数据分析时排除反弹后的数据。

| 序号 | 时间 | 反弹高度 | 相对比例 | 严重程度 | 说明 |
|------|------|----------|----------|----------|------|""")
            for i, bounce in enumerate(anomaly_report.bounce_events, 1):
                ratio = bounce.get('bounce_ratio', 0) * 100
                bounce_height = bounce.get('bounce_height', None)
                bounce_height_str = f"{bounce_height:.2f}m" if bounce_height is not None else "-"
                sections.append(
                    f"| {i} | {bounce['time']:.2f}s | {bounce_height_str} | "
                    f"{ratio:.1f}% | {bounce['severity']} | {bounce['description']} |"
                )

        if anomaly_report.wind_anomalies:
            sections.append("""
### 5.4 风场异常
| 序号 | 类型 | 严重程度 | 影响 | 说明 |
|------|------|----------|------|------|""")
            for i, wind in enumerate(anomaly_report.wind_anomalies, 1):
                sections.append(
                    f"| {i} | {wind['type']} | {wind['severity']} | {wind.get('impact', '-')} | {wind['description']} |"
                )

        return "\n".join(sections) + "\n\n---"

    def _modifications_section(self, flight_data: FlightData) -> str:
        modifications = flight_data.get_modified_points()

        if not modifications:
            return """## 6. 数据修正记录

*本次分析未对原始数据进行修正*

---
"""

        content = """## 6. 数据修正记录

> 🔧 **已自动修正的数据点**: 这些点已通过算法修正并参与后续计算。修正痕迹完整保留，可在原始数据文件中查看。

| 序号 | 时间 (s) | 原始值 (m) | 修正后 (m) | 修正量 (m) | 修正原因 |
|------|----------|------------|------------|------------|----------|"""

        for i, mod in enumerate(modifications, 1):
            delta = mod['new_value'] - mod['old_value']
            content += f"\n| {i} | {mod['time']:.2f} | {mod['old_value']:.2f} | {mod['new_value']:.2f} | {delta:+.2f} | {mod['reason']} |"

        content += "\n\n---"
        return content

    def _review_required_section(self, flight_data: FlightData) -> str:
        review_points = flight_data.get_review_required()

        if not review_points:
            return """## 7. 待人工确认

*所有数据点均通过自动检测，无需人工确认* 🎉

---
"""

        content = f"""## 7. ⚠️ 待人工确认 ({len(review_points)} 项)

> **重要**: 以下数据点存在异常，算法无法自动判定，需人工审核确认。
> 这些点**已排除**在拟合计算之外，可能影响结果准确性。

| 序号 | 时间 (s) | 当前值 (m) | 异常类型 | 说明 | 建议操作 |
|------|----------|------------|----------|------|----------|"""

        for i, point in enumerate(review_points, 1):
            content += (
                f"\n| {i} | {point['time']:.2f} | {point['value']:.2f} | "
                f"{point.get('type', 'unknown')} | {point.get('reason', '-')} | 检查原始数据 |"
            )

        content += """

### 处理建议
1. 打开原始数据文件，定位对应时间点
2. 检查是否为传感器误读或真实物理现象
3. 如确认异常，可手动标记为无效
4. 如确认真实，需评估对整体拟合的影响

---
"""
        return content

    def _sensitivity_section(self, analysis: Dict) -> str:
        content = """## 8. 参数敏感性分析

### 8.1 初速度敏感性
| 参数变化 | 测试值 (m/s) | RMSE (m) | RMSE变化 (m) |
|----------|--------------|----------|--------------|"""

        for item in analysis.get('velocity_sensitivity', []):
            sign = "+" if item['delta_pct'] > 0 else ""
            content += f"\n| {sign}{item['delta_pct']*100:.0f}% | {item['value']:.2f} | {item['rmse']:.4f} | {item['rmse_change']:+.4f} |"

        content += """

### 8.2 阻力系数敏感性
| 参数变化 | 测试值 | RMSE (m) | RMSE变化 (m) |
|----------|--------|----------|--------------|"""

        for item in analysis.get('drag_sensitivity', []):
            sign = "+" if item['delta_pct'] > 0 else ""
            content += f"\n| {sign}{item['delta_pct']*100:.0f}% | {item['value']:.4f} | {item['rmse']:.4f} | {item['rmse_change']:+.4f} |"

        content += "\n\n---"
        return content

    def _methodology_section(self) -> str:
        return """## 9. 计算方法说明

### 9.1 物理模型
采用考虑空气阻力的质点弹道模型：

**运动方程**:
```
m·a = -m·g - 0.5·ρ·C_d·A·v_rel·v_rel
```

其中:
- `v_rel`: 相对风速
- `C_d`: 阻力系数 (待拟合)
- `ρ`: 空气密度 = 1.225 kg/m³
- `A`: 火箭迎风面积

### 9.2 拟合算法
使用 L-BFGS-B 有界优化算法，优化目标：
```
minimize Σ(h_measured(t) - h_simulated(t; v0, Cd))²
```

参数约束:
- 初速度 v₀: 1-100 m/s
- 阻力系数 C_d: 0.05-1.0

### 9.3 置信区间
采用自举法 (Bootstrap) 估计参数不确定度，通过对数据点有放回重采样 50 次，计算参数分布的 5%-95% 分位数。

### 9.4 异常检测
- **尖峰检测**: 中值滤波 + MAD 鲁棒统计
- **漏点检测**: 时间间隔阈值分析
- **反弹检测**: 落地后高度变化 + 加速度突变
- **数据质量**: 综合完整性、一致性、噪声水平评分

---
"""

    def _appendix_section(
        self,
        flight_data: FlightData,
        fit_result: FitResult
    ) -> str:
        meta = flight_data.metadata
        params = fit_result.fitted_trajectory.params if fit_result.fitted_trajectory else PhysicsParameters()

        return f"""## 10. 附录

### 10.1 输入参数
| 参数 | 值 | 来源 |
|------|-----|------|
| 装水量 | {meta.water_volume} mL | 飞行记录 |
| 发射角 | {meta.launch_angle}° | 飞行记录 |
| 风速 | {meta.wind_speed} m/s | 气象数据 |
| 风向 | {meta.wind_direction}° | 气象数据 |
| 气压 | {meta.air_pressure} Pa | 气象数据 |
| 火箭质量 | {meta.rocket_mass} kg | 设备参数 |
| 火箭直径 | {meta.rocket_diameter * 100} cm | 设备参数 |

### 10.2 拟合配置
| 参数 | 值 |
|------|-----|
| 重力加速度 g | {params.g} m/s² |
| 空气密度 ρ | {params.rho_air} kg/m³ |
| 优化方法 | L-BFGS-B |
| 最大迭代次数 | 1000 |
| 拟合参数 | v₀, C_d |

### 10.3 文件清单
- 原始数据: `{Path(meta.source_file).name}`
- 分析报告: 本文件
- 轨迹图表: `comparison_plot.png`
- 飞行动画: `flight_animation.mp4`

---

*报告生成完毕。如有疑问，请对照原始数据核查。*
"""
