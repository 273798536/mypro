import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { fetchLineages, fetchLineageDetail } from "../api";
import type { LineageSummary, LineageDetail, Sample } from "../types";
import SampleDetail from "./SampleDetail";
import styles from "./TimelineView.module.css";

interface ChartDataPoint {
  date: string;
  viral_load: number | null;
  sample_id: string;
  explanation: string;
  qc_status: string;
  is_duplicate: boolean;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#16213e", border: "1px solid #2a2a4a", borderRadius: 6, padding: "10px 14px", fontSize: 13 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.date}</div>
      <div>载量: {d.viral_load ?? "N/A"}</div>
      {d.explanation && <div style={{ color: "#a0a0b0", marginTop: 4 }}>{d.explanation}</div>}
    </div>
  );
}

export default function TimelineView() {
  const { lineageId } = useParams<{ lineageId: string }>();
  const [searchParams] = useSearchParams();
  const highlightSample = searchParams.get("sample");

  const [lineages, setLineages] = useState<LineageSummary[]>([]);
  const [detail, setDetail] = useState<LineageDetail | null>(null);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLineages().then(setLineages).catch(() => {});
  }, []);

  const loadDetail = useCallback(() => {
    if (!lineageId) return;
    setLoading(true);
    fetchLineageDetail(lineageId)
      .then((d) => {
        setDetail(d);
        if (highlightSample) {
          const s = d.samples.find((s) => s.sample_id === highlightSample);
          if (s) setSelectedSample(s);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lineageId, highlightSample]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (!lineageId) {
    return <div className={styles.noData}>请从谱系追踪面板选择一个谱系</div>;
  }

  const chartData: ChartDataPoint[] = detail
    ? [...detail.samples]
        .sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime())
        .map((s) => ({
          date: s.collection_date,
          viral_load: s.viral_load,
          sample_id: s.sample_id,
          explanation: s.explanation,
          qc_status: s.qc_status,
          is_duplicate: s.is_duplicate,
        }))
    : [];

  const handleClick = (data: ChartDataPoint) => {
    if (!detail) return;
    const s = detail.samples.find((s) => s.sample_id === data.sample_id);
    if (s) setSelectedSample(s);
  };

  const anomalyPoints = chartData.filter(
    (d) => d.qc_status === "flagged" || d.qc_status === "need_recheck"
  );

  const qcColor = (status: string) => {
    if (status === "clean") return "var(--color-clean)";
    if (status === "need_recheck") return "var(--color-need-recheck)";
    if (status === "flagged") return "var(--color-flagged)";
    return "var(--color-duplicate)";
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>病毒载量时间线</h1>

      <div className={styles.selector}>
        <select
          value={lineageId}
          onChange={(e) => {
            window.location.href = `/lineage/${e.target.value}`;
          }}
        >
          {lineages.map((l) => (
            <option key={l.lineage_id} value={l.lineage_id}>
              {l.name} ({l.sample_count} 样本)
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.noData}>加载中...</div>
      ) : detail ? (
        <>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} onClick={(e: Record<string, unknown>) => { if (e && Array.isArray((e as Record<string, unknown>).activePayload)) { const payload = ((e as Record<string, unknown>).activePayload as Array<{ payload: ChartDataPoint }>)[0]; if (payload) handleClick(payload.payload); } }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                <XAxis dataKey="date" stroke="#a0a0b0" fontSize={12} />
                <YAxis stroke="#a0a0b0" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="viral_load"
                  stroke="#4fc3f7"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#4fc3f7", cursor: "pointer" }}
                  activeDot={{ r: 6, cursor: "pointer" }}
                  connectNulls={false}
                />
                {anomalyPoints.map((p, i) => (
                  <ReferenceDot
                    key={i}
                    x={p.date}
                    y={p.viral_load ?? undefined}
                    r={8}
                    fill={qcColor(p.qc_status)}
                    stroke="none"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleClick(p)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.detailPanel}>
            <h3 className={styles.detailTitle}>
              {detail.name} — {detail.sample_count} 样本 · 均值 {detail.avg_viral_load ?? "N/A"} · 趋势 {detail.trend}
            </h3>
            {chartData.map((d) => (
              <div
                key={d.sample_id}
                onClick={() => handleClick(d)}
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  margin: "0 6px 6px 0",
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: "pointer",
                  background: d.sample_id === selectedSample?.sample_id ? "var(--bg-accent)" : "var(--bg-primary)",
                  border: `1px solid ${qcColor(d.qc_status)}`,
                  color: qcColor(d.qc_status),
                }}
              >
                {d.date} {d.viral_load ?? "N/A"}
                {d.explanation && <span style={{ marginLeft: 6, opacity: 0.7 }}>- {d.explanation}</span>}
              </div>
            ))}
          </div>

          {selectedSample && (
            <div style={{ marginTop: 20 }}>
              <SampleDetail sample={selectedSample} onRefresh={loadDetail} />
            </div>
          )}
        </>
      ) : (
        <div className={styles.noData}>未找到谱系数据</div>
      )}
    </div>
  );
}
