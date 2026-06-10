import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCorrections } from "../api";
import type { CorrectionRecord } from "../types";
import styles from "./CorrectionHistory.module.css";

export default function CorrectionHistory() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<CorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorrections()
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSampleClick = (sampleId: string, lineageId?: string) => {
    if (lineageId) {
      navigate(`/lineage/${lineageId}?sample=${sampleId}`);
    }
  };

  if (loading) return <div className={styles.loading}>加载中...</div>;

  if (records.length === 0) return <div className={styles.noData}>暂无修正记录</div>;

  return (
    <div>
      <h1 className={styles.pageTitle}>修正历史</h1>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>记录ID</th>
              <th>样本ID</th>
              <th>载量变更</th>
              <th>备注变更</th>
              <th>修正原因</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  <span
                    className={styles.sampleLink}
                    onClick={() => handleSampleClick(r.sample_id, r.lineage_id)}
                  >
                    {r.sample_id}
                  </span>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {r.lineage_id}
                  </div>
                </td>
                <td>
                  <div className={styles.valueChange}>
                    <span className={styles.oldValue}>{r.original_viral_load ?? "N/A"}</span>
                    <span className={styles.arrow}>→</span>
                    <span className={styles.newValue}>{r.corrected_viral_load ?? "N/A"}</span>
                  </div>
                </td>
                <td>
                  <div className={styles.valueChange}>
                    <span className={styles.oldValue}>
                      {r.original_notes || "(空)"}
                    </span>
                    <span className={styles.arrow}>→</span>
                    <span className={styles.newValue}>
                      {r.corrected_notes || "(空)"}
                    </span>
                  </div>
                </td>
                <td>{r.reason}</td>
                <td>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
