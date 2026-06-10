import { useState, useEffect } from "react";
import { fetchSamples, postCorrection } from "../api";
import type { Sample } from "../types";
import styles from "./CorrectionModal.module.css";

interface Props {
  sampleId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function CorrectionModal({ sampleId, onClose, onSubmitted }: Props) {
  const [sample, setSample] = useState<Sample | null>(null);
  const [correctedViralLoad, setCorrectedViralLoad] = useState("");
  const [correctedNotes, setCorrectedNotes] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSamples().then((samples) => {
      const s = samples.find((s) => s.sample_id === sampleId);
      if (s) setSample(s);
    }).catch(() => {});
  }, [sampleId]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("请填写修正原因");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await postCorrection({
        sample_id: sampleId,
        corrected_viral_load: correctedViralLoad ? Number(correctedViralLoad) : undefined,
        corrected_notes: correctedNotes || undefined,
        reason: reason.trim(),
      });
      onSubmitted();
      onClose();
    } catch {
      setError("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>人工修正 — {sampleId}</h2>

        {sample && (
          <div className={styles.currentInfo}>
            <div>
              <span className={styles.currentLabel}>当前载量: </span>
              {sample.viral_load ?? "N/A"}
            </div>
            <div>
              <span className={styles.currentLabel}>原始值: </span>
              {sample.original_raw_value}
            </div>
            <div>
              <span className={styles.currentLabel}>备注: </span>
              {sample.notes || "(空)"}
            </div>
          </div>
        )}

        <div className={styles.formGroup}>
          <label>修正后载量值</label>
          <input
            type="number"
            value={correctedViralLoad}
            onChange={(e) => setCorrectedViralLoad(e.target.value)}
            placeholder={sample?.viral_load?.toString() ?? "输入新值"}
          />
        </div>

        <div className={styles.formGroup}>
          <label>修正后备注</label>
          <textarea
            value={correctedNotes}
            onChange={(e) => setCorrectedNotes(e.target.value)}
            placeholder={sample?.notes || "输入新备注"}
          />
        </div>

        <div className={styles.formGroup}>
          <label>修正原因 *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请说明修正原因"
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose}>
            取消
          </button>
          <button
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "提交中..." : "提交修正"}
          </button>
        </div>
      </div>
    </div>
  );
}
