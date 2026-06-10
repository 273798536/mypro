import { useState, useEffect } from "react";
import { fetchQCSummary, fetchSamples } from "../api";
import type { QCSummary, Sample } from "../types";
import styles from "./QCDashboard.module.css";

function qcClass(status: string) {
  if (status === "clean") return styles.qcClean;
  if (status === "need_recheck") return styles.qcNeedRecheck;
  if (status === "flagged") return styles.qcFlagged;
  return "";
}

function qcLabel(s: string) {
  if (s === "clean") return "可用";
  if (s === "need_recheck") return "待复核";
  if (s === "flagged") return "异常";
  return s;
}

type FilterType = "all" | "clean" | "need_recheck" | "flagged";

export default function QCDashboard() {
  const [summary, setSummary] = useState<QCSummary | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchQCSummary(), fetchSamples()])
      .then(([s, sa]) => {
        setSummary(s);
        setSamples(sa);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (filter === "all") {
      fetchSamples().then(setSamples).catch(() => {});
    } else {
      fetchSamples(filter).then(setSamples).catch(() => {});
    }
  }, [filter]);

  if (loading) return <div className={styles.loading}>加载中...</div>;

  return (
    <div>
      <h1 className={styles.pageTitle}>质控看板</h1>

      {summary && (
        <div className={styles.cards}>
          <div className={`${styles.card} ${styles.cardTotal}`}>
            <div className={styles.cardValue}>{summary.total}</div>
            <div className={styles.cardLabel}>总数</div>
          </div>
          <div className={`${styles.card} ${styles.cardClean}`}>
            <div className={styles.cardValue}>{summary.clean}</div>
            <div className={styles.cardLabel}>可用 (clean)</div>
          </div>
          <div className={`${styles.card} ${styles.cardRecheck}`}>
            <div className={styles.cardValue}>{summary.need_recheck}</div>
            <div className={styles.cardLabel}>待复核 (need_recheck)</div>
          </div>
          <div className={`${styles.card} ${styles.cardFlagged}`}>
            <div className={styles.cardValue}>{summary.flagged}</div>
            <div className={styles.cardLabel}>异常 (flagged)</div>
          </div>
          <div className={`${styles.card} ${styles.cardDuplicate}`}>
            <div className={styles.cardValue}>{summary.duplicate}</div>
            <div className={styles.cardLabel}>重复</div>
          </div>
          <div className={`${styles.card} ${styles.cardAnomaly}`}>
            <div className={styles.cardValue}>{summary.anomaly_count}</div>
            <div className={styles.cardLabel}>异常项数</div>
          </div>
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "var(--color-clean)" }} />
          可直接使用
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "var(--color-need-recheck)" }} />
          需育种专员复核
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "var(--color-flagged)" }} />
          标记异常
        </div>
      </div>

      <div className={styles.filterBar}>
        {(["all", "clean", "need_recheck", "flagged"] as FilterType[]).map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "全部" : qcLabel(f)}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>样本ID</th>
              <th>谱系</th>
              <th>采集日期</th>
              <th>病毒载量</th>
              <th>原始值</th>
              <th>QC状态</th>
              <th>解释</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={`${s.sample_id}-${s.import_batch_id}`}>
                <td>
                  {s.sample_id}
                  {s.is_duplicate && <span className={styles.dupBadge}>重复</span>}
                </td>
                <td>{s.lineage_id}</td>
                <td>{s.collection_date}</td>
                <td>{s.viral_load ?? "N/A"}</td>
                <td>{s.original_raw_value}</td>
                <td>
                  <span className={`${styles.qcBadge} ${qcClass(s.qc_status)}`}>
                    {qcLabel(s.qc_status)}
                  </span>
                </td>
                <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.explanation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
