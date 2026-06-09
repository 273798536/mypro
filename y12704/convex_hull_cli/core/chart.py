import os
from typing import Optional
from .models import CalculationResult
from .unified_data import UnifiedDataset


class ChartRenderer:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def render(self, dataset: UnifiedDataset, filename: Optional[str] = None) -> str:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
        except ImportError:
            return self._render_text(dataset, filename)

        payload = dataset.chart_payload()
        fig, ax = plt.subplots(figsize=(8, 6))

        xs = [p["x"] for p in payload["points"]]
        ys = [p["y"] for p in payload["points"]]
        ax.scatter(xs, ys, c="steelblue", label="原始点", s=50, zorder=3)

        if payload["hull_points"]:
            hx = [p["x"] for p in payload["hull_points"]]
            hy = [p["y"] for p in payload["hull_points"]]
            if hx and hy:
                hx.append(hx[0])
                hy.append(hy[0])
            ax.plot(hx, hy, "r-", linewidth=2, label="凸包边界", zorder=2)
            ax.fill(hx[:-1], hy[:-1], "r", alpha=0.1, zorder=1)

        for p in payload["points"]:
            if p.get("record_id"):
                ax.annotate(p["record_id"], (p["x"], p["y"]),
                            textcoords="offset points", xytext=(5, 5), fontsize=8)

        unit_suffix = f" ({payload['unit']}²)" if payload["unit"] else ""
        ax.set_title(
            f"凸包面积: {payload['raw_area']:.4f}{unit_suffix}\n"
            f"结果ID: {payload['result_id']} | 参数版本: {payload['parameter_version'] or '未指定'}"
        )
        ax.set_xlabel("X")
        ax.set_ylabel("Y")
        ax.legend()
        ax.grid(True, linestyle="--", alpha=0.5)
        ax.set_aspect("equal", adjustable="datalim")

        if not filename:
            filename = f"chart_{payload['result_id']}.png"
        out_path = os.path.join(self.output_dir, filename)
        fig.tight_layout()
        fig.savefig(out_path, dpi=150)
        plt.close(fig)
        return out_path

    def _render_text(self, dataset: UnifiedDataset, filename: Optional[str] = None) -> str:
        payload = dataset.chart_payload()
        if not filename:
            filename = f"chart_{payload['result_id']}.txt"
        out_path = os.path.join(self.output_dir, filename)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("=== 凸包图表 (文本模式，matplotlib 不可用) ===\n")
            f.write(f"结果ID: {payload['result_id']}\n")
            f.write(f"凸包面积: {payload['raw_area']:.6f} {payload.get('unit') or ''}\n")
            f.write(f"原始点数: {len(payload['points'])}\n")
            f.write(f"凸包顶点数: {len(payload['hull_points'])}\n")
            f.write("原始点坐标:\n")
            for p in payload["points"]:
                f.write(f"  {p.get('record_id', '-')}: ({p['x']}, {p['y']})\n")
            f.write("凸包顶点:\n")
            for p in payload["hull_points"]:
                f.write(f"  ({p['x']}, {p['y']})\n")
        return out_path
