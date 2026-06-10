import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLineages, fetchLineageDetail } from "../api";
import type { LineageSummary, LineageDetail } from "../types";
import CorrectionModal from "./CorrectionModal";
import styles from "./LineagePanel.module.css";

function qcClass(status: string) {
  if (status === "clean") return styles.qcClean;
  if (status === "need_recheck") return styles.qcNeedRecheck;
  if (status === "flagged") return styles.qcFlagged;
  return "";
}

function trendClass(trend: string) {
  const t = trend.toLowerCase();
  if (t.includes("up") || t.includes("上升")) return styles.trendUp;
  if (t.includes("down") || t.includes("下降")) return styles.trendDown;
  return styles.trendStable;
}

export default function LineagePanel() {
  const navigate = useNavigate();
  const [lineages, setLineages] = useState<LineageSummary[]>([]);
  const [detail, setDetail] = useState<LineageDetail | null>(null);
  const [modalSampleId, setModalSampleId] = useState<string | null>(null);

  useEffect(() => {
    fetchLineages().then(setLineages).catch(() => {});
  }, []);

  const openDetail = (id: string) => {
    fetchLineageDetail(id).then(setDetail).catch(() => {});
  };

  const closeDetail = () => setDetail(null);

  const qcLabel = (s: string) => {
    if (s === "clean") return "可用";
    if (s === "need_recheck") return "待复核";
    if (s === "flagged") return "异常";
    return s;
  };

  if (detail) {
    return (
      <div>
        <button className={styles.backBtn} onClick={closeDetail}>
          ← 返回谱系列表
        </button>

        <div className={styles.detailSection}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            {detail.name}
            <span style={{ fontSize: 14, color: "var(--text-secondary)", marginLeft: 12 }}>
              {detail.sample_count} 样本 · 均值 {detail.avg_viral_load ?? "N/A"} · 趋势 {detail.trend}
            </span>
          </h2>

          <button
            className={styles.backBtn}
            style={{ marginBottom: 16 }}
            onClick={() => navigate(`/lineage/${detail.lineage_id}`)}
          >
            查看时间线图
          </button>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>样本ID</th>
                  <th>采集日期</th>
                  <th>病毒载量</th>
                  <th>原始值</th>
                  <th>QC状态</th>
                  <th>解释</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {detail.samples.map((s) => (
                  <tr
                    key={`${s.sample_id}-${s.import_batch_id}`}
                    className={
                      s.qc_status === "flagged" || s.qc_status === "need_recheck"
                        ? styles.rowAnomaly
                        : undefined
                    }
                  >
                    <td>
                      {s.sample_id}
                      {s.is_duplicate && <span className={styles.dupBadge}>重复</span>}
                    </td>
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
                    <td>
                      <button className={styles.correctBtn} onClick={() => setModalSampleId(s.sample_id)}>
                        人工修正
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {modalSampleId && (
          <CorrectionModal
            sampleId={modalSampleId}
            onClose={() => setModalSampleId(null)}
            onSubmitted={() => openDetail(detail.lineage_id)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>谱系追踪</h1>
      <div className={styles.lineageList}>
        {lineages.map((l) => (
          <div
            key={l.lineage_id}
            className={styles.lineageCard}
            onClick={() => openDetail(l.lineage_id)}
          >
            <div className={styles.lineageName}>{l.name}</div>
            <div className={styles.lineageMeta}>
              <span>{l.sample_count} 样本</span>
              <span>均值 {l.avg_viral_load ?? "N/A"}</span>
              <span>最近 {l.latest_collection_date ?? "N/A"}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <span className={`${styles.trend} ${trendClass(l.trend)}`}>{l.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
