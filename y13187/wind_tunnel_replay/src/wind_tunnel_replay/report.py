from __future__ import annotations

import base64
import io
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import __version__
from .types import ReplayResult


_MATPLOTLIB_INITIALIZED = False


def _ensure_matplotlib_env() -> None:
    global _MATPLOTLIB_INITIALIZED
    if _MATPLOTLIB_INITIALIZED:
        return
    mpl_cfg = os.environ.get("MPLCONFIGDIR", "")
    if not mpl_cfg or not os.access(mpl_cfg, os.W_OK):
        fallback = Path(tempfile.gettempdir()) / f"mpl_windtunnel_{os.getuid()}"
        fallback.mkdir(parents=True, exist_ok=True)
        os.environ["MPLCONFIGDIR"] = str(fallback)
    _MATPLOTLIB_INITIALIZED = True


_TEMPLATE_DIR = Path(__file__).parent / "templates"


class ReportBuilder:
    def __init__(self, stable_names: list[str]):
        self.stable_names = list(stable_names)
        self.env = Environment(
            loader=FileSystemLoader(str(_TEMPLATE_DIR)),
            autoescape=select_autoescape(["html"]),
            keep_trailing_newline=False,
        )

    def build(self, result: ReplayResult, out_html: Path, chart_dpi: int = 130) -> Path:
        out_html.parent.mkdir(parents=True, exist_ok=True)
        charts = self._render_charts(result, chart_dpi)
        errors = [a for a in result.anomalies if a.level == "error"]
        warns = [a for a in result.anomalies if a.level == "warning"]
        conclusion_cls = "c-err" if errors else ("c-warn" if warns else "c-ok")
        tmpl = self.env.get_template("report.html")
        html = tmpl.render(
            run_id=result.run_id,
            generated_at=result.generated_at.strftime("%Y-%m-%d %H:%M:%S"),
            conclusion=result.conclusion,
            conclusion_cls=conclusion_cls,
            meta=result.meta,
            err_count=len(errors),
            warn_count=len(warns),
            anomalies=[a.to_dict() for a in result.anomalies],
            params=result.param_versions,
            stable_names=set(self.stable_names),
            charts=charts,
            excluded_logs=result.excluded_logs,
            effective_logs=result.effective_logs,
            withdrawn_lines=sorted(result.withdrawn_lines),
            version=__version__,
        )
        out_html.write_text(html, encoding="utf-8")
        return out_html

    def _render_charts(self, result: ReplayResult, dpi: int) -> list[str]:
        _ensure_matplotlib_env()
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np
        out: list[str] = []
        plot_params = [n for n in self.stable_names if result.param_versions[n].values]
        if not plot_params:
            return out
        ncols = min(2, len(plot_params))
        nrows = int(np.ceil(len(plot_params) / ncols))
        fig, axes = plt.subplots(nrows, ncols, figsize=(3.8 * ncols, 2.6 * nrows), squeeze=False)
        font_candidates = ["PingFang SC", "Heiti SC", "STHeiti", "Hiragino Sans GB",
                           "Microsoft YaHei", "Arial Unicode MS", "DejaVu Sans"]
        for f in font_candidates:
            try:
                matplotlib.rcParams["font.sans-serif"] = [f] + matplotlib.rcParams.get("font.sans-serif", [])
                matplotlib.rcParams["axes.unicode_minus"] = False
                break
            except Exception:
                continue
        fig.suptitle("Param Trajectory (color=version, dashed=baseline)", fontsize=11)
        for idx, name in enumerate(plot_params):
            ax = axes[idx // ncols][idx % ncols]
            p = result.param_versions[name]
            x = list(range(len(p.values)))
            color_map = {"new": "#2b6cb0", "old": "#a0aec0", "unmarked": "#38a169"}
            colors = [color_map.get(v, "#38a169") for v in p.versions]
            ax.scatter(x, p.values, c=colors, s=28, zorder=3)
            ax.plot(x, p.values, color="#cbd5e0", linewidth=1, zorder=2)
            if p.baseline_value is not None:
                ax.axhline(p.baseline_value, linestyle="--", color="#e53e3e", alpha=0.75, linewidth=1)
            ax.set_title(name, fontsize=10)
            ax.grid(True, linewidth=0.4, alpha=0.5)
            for i, ln in enumerate(p.source_lines):
                ax.annotate(f"L{ln}", (x[i], p.values[i]), textcoords="offset points", xytext=(0, 7), ha="center", fontsize=7, color="#4a5568")
        for j in range(len(plot_params), nrows * ncols):
            axes[j // ncols][j % ncols].axis("off")
        fig.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")
        plt.close(fig)
        out.append(base64.b64encode(buf.getvalue()).decode("ascii"))
        return out
