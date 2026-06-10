import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAnomalies, postCorrection } from "../api";
import type { AnomalyItem } from "../types";
import styles from "./AnomalyPanel.module.css";

export default function AnomalyPanel() {
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAnomalies()
      .then(setAnomalies)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleReview = async (item: AnomalyItem) => {
    await postCorrection({
      sample_id: item.sample_id,
      corrected_notes: "已复核确认",
      reason: `异常复核: ${item.anomaly_type}`,
    });
    load();
  };

  if (loading) return <div className={styles.loading}>加载中...</div>;

  if (anomalies.length === 0) return <div className={styles.noData}>暂无异常项</div>;

  return (
    <div>
      <h1 className={styles.pageTitle}>异常复核</h1>
      <div className={styles.anomalyList}>
        {anomalies.map((a) => (
          <div key={a.sample_id} className={styles.anomalyCard}>
            <div className={styles.anomalyHeader}>
              <span className={styles.anomalyId}>{a.sample_id}</span>
              <span
                className={styles.anomalyLineage}
                onClick={() => navigate(`/lineage/${a.lineage_id}?sample=${a.sample_id}`)}
              >
                谱系: {a.lineage_id} →
              </span>
              <span className={styles.deviation}>
                偏离 {a.deviation_ratio.toFixed(2)}x
              </span>
              <span className={styles.anomalyType}>{a.anomaly_type}</span>
            </div>
            <div className={styles.anomalyDetails}>
              <span>载量: {a.viral_load ?? "N/A"}</span>
              <span>
                期望范围: [{a.expected_range_low}, {a.expected_range_high}]
              </span>
              <span>日期: {a.collection_date}</span>
            </div>
            <div className={styles.anomalyExplanation}>{a.explanation}</div>
            <button className={styles.reviewBtn} onClick={() => handleReview(a)}>
              标记已复核
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
