import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { postImport } from "../api";
import type { ImportResult } from "../types";
import styles from "./ImportPanel.module.css";

export default function ImportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setUploading(true);
    setResult(null);
    setError("");
    try {
      const res = await postImport(file);
      setResult(res);
    } catch {
      setError("导入失败，请检查文件格式后重试");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>数据导入</h1>

      {uploading ? (
        <div className={styles.uploading}>正在导入，请稍候...</div>
      ) : (
        <div
          className={styles.uploadZone}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className={styles.uploadIcon}>
            <Upload size={48} />
          </div>
          <div className={styles.uploadText}>点击或拖拽文件到此处上传</div>
          <div className={styles.uploadHint}>支持 CSV / Excel 文件</div>
          <input
            ref={fileInputRef}
            type="file"
            className={styles.fileInput}
            accept=".csv,.xlsx,.xls"
            onChange={handleChange}
          />
        </div>
      )}

      {error && (
        <div style={{ color: "var(--color-flagged)", marginBottom: 16 }}>{error}</div>
      )}

      {result && (
        <div className={styles.resultSection}>
          <h3 className={styles.resultTitle}>导入结果</h3>
          <div className={styles.resultGrid}>
            <div className={styles.resultCard}>
              <div className={styles.resultValue}>{result.total_rows}</div>
              <div className={styles.resultLabel}>总行数</div>
            </div>
            <div className={styles.resultCard}>
              <div className={`${styles.resultValue} ${styles.cleanValue}`}>{result.clean_rows}</div>
              <div className={styles.resultLabel}>干净行</div>
            </div>
            <div className={styles.resultCard}>
              <div className={`${styles.resultValue} ${styles.dupValue}`}>{result.duplicate_rows}</div>
              <div className={styles.resultLabel}>重复行</div>
            </div>
          </div>

          {result.batch_id && (
            <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text-secondary)" }}>
              导入批次: {result.batch_id}
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className={styles.warningSection}>
              <div className={styles.warningTitle}>警告</div>
              {result.warnings.map((w, i) => (
                <div key={i} className={styles.warningItem}>{w}</div>
              ))}
            </div>
          )}

          {result.duplicate_sample_ids && result.duplicate_sample_ids.length > 0 && (
            <div className={styles.dupWarning}>
              <div className={styles.dupWarningTitle}>
                检测到重复样本 ({result.duplicate_sample_ids.length} 个)
              </div>
              <div>
                {result.duplicate_sample_ids.map((id) => (
                  <span key={id} className={styles.dupId}>{id}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
