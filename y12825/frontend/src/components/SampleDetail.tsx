import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCorrections } from "../api";
import type { Sample, CorrectionRecord } from "../types";
import styles from "./SampleDetail.module.css";

interface Props {
  sample: Sample;
  onRefresh?: () => void;
}

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

export default function SampleDetail({ sample }: Props) {
  const navigate = useNavigate();
  const [showCorrections, setShowCorrections] = useState(false);
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);

  const loadCorrections = async () => {
    if (showCorrections) {
      setShowCorrections(false);
      return;
    }
    const all = await fetchCorrections();
    const filtered = all.filter((c) => c.sample_id === sample.sample_id);
    setCorrections(filtered);
    setShowCorrections(true);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>
          样本详情: {sample.sample_id}
          {sample.is_duplicate && <span className={styles.dupBadge}>重复</span>}
        </div>
        <span className={`${styles.qcBadge} ${qcClass(sample.qc_status)}`}>
          {qcLabel(sample.qc_status)}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>谱系</span>
          <span className={styles.value}>{sample.lineage_id}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>采集日期</span>
          <span className={styles.value}>{sample.collection_date}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>病毒载量</span>
          <span className={styles.value}>{sample.viral_load ?? "N/A"}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>原始值</span>
          <span className={styles.value}>{sample.original_raw_value}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>导入批次</span>
          <span className={styles.value}>{sample.import_batch_id}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>创建时间</span>
          <span className={styles.value}>{new Date(sample.created_at).toLocaleString("zh-CN")}</span>
        </div>
      </div>

      {sample.explanation && (
        <div className={styles.explanationBox}>{sample.explanation}</div>
      )}

      <div>
        {sample.notes && (
          <button className={styles.linkBtn} onClick={() => alert(`病理备注:\n${sample.notes}`)}>
            查看病理备注
          </button>
        )}
        <button className={styles.linkBtn} onClick={loadCorrections}>
          {showCorrections ? "隐藏修正记录" : "查看修正记录"}
        </button>
        <button
          className={styles.linkBtn}
          onClick={() => navigate(`/lineage/${sample.lineage_id}?sample=${sample.sample_id}`)}
        >
          在时间线中查看
        </button>
      </div>

      {showCorrections && (
        <div style={{ marginTop: 12 }}>
          {corrections.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>暂无修正记录</div>
          ) : (
            corrections.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "var(--bg-primary)",
                  borderRadius: 4,
                  padding: 10,
                  marginBottom: 8,
                  fontSize: 13,
                }}
              >
                <div>
                  <strong>载量:</strong> {c.original_viral_load ?? "N/A"} → {c.corrected_viral_load ?? "N/A"}
                </div>
                <div>
                  <strong>备注:</strong> {c.original_notes || "(空)"} → {c.corrected_notes || "(空)"}
                </div>
                <div>
                  <strong>原因:</strong> {c.reason}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                  {new Date(c.created_at).toLocaleString("zh-CN")}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
