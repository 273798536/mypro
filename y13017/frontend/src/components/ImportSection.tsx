import React, { useState, useRef } from 'react';
import { Button, Space } from 'antd';
import { InboxOutlined, FileTextOutlined, ClockCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { importEmails } from '../api';
import type { ImportResult } from '../types';

interface Props {
  onImported: () => void;
}

const ImportSection: React.FC<Props> = ({ onImported }) => {
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lateFileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (files: FileList | null, isLate: boolean) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setLastResult(null);
    try {
      const fileArray = Array.from(files);
      const result = await importEmails(fileArray, isLate);
      setLastResult(result);
      onImported();
    } catch (err: any) {
      alert(`导入失败: ${err.response?.data?.error || err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="section-card">
      <div className="section-title">
        <InboxOutlined /> 审批邮件导入
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          className="upload-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).classList.add('dragging');
          }}
          onDragLeave={(e) => {
            (e.currentTarget as HTMLDivElement).classList.remove('dragging');
          }}
          onDrop={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).classList.remove('dragging');
            handleImport(e.dataTransfer.files, false);
          }}
        >
          <FileTextOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 8 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            导入审批邮件
          </div>
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>
            点击或拖拽 .eml 邮件文件到此处（主流程）
          </div>
          <div style={{ marginTop: 12 }}>
            <Button type="primary" loading={importing}>
              选择文件导入
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".eml"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleImport(e.target.files, false)}
          />
        </div>

        <div
          className="upload-zone"
          onClick={() => lateFileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).classList.add('dragging');
          }}
          onDragLeave={(e) => {
            (e.currentTarget as HTMLDivElement).classList.remove('dragging');
          }}
          onDrop={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).classList.remove('dragging');
            handleImport(e.dataTransfer.files, true);
          }}
          style={{ borderColor: '#722ed1' }}
        >
          <ClockCircleOutlined style={{ fontSize: 40, color: '#722ed1', marginBottom: 8 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: '#722ed1' }}>
            导入晚到凭证
          </div>
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>
            点击或拖拽迟来的凭证邮件（自动标记晚到并记录影响范围）
          </div>
          <div style={{ marginTop: 12 }}>
            <Button loading={importing} style={{ borderColor: '#722ed1', color: '#722ed1' }}>
              选择晚到文件
            </Button>
          </div>
          <input
            ref={lateFileInputRef}
            type="file"
            accept=".eml"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleImport(e.target.files, true)}
          />
        </div>
      </div>

      {lastResult && (
        <div style={{ marginTop: 20, padding: 16, background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            导入批次: {lastResult.batchNo}
          </div>
          <Space wrap>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              新建争议款: <strong>{lastResult.summary.newDisputes}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircleOutlined style={{ color: '#1677ff' }} />
              更新/去重: <strong>{lastResult.summary.updatedDisputes}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircleOutlined style={{ color: '#722ed1' }} />
              附件: <strong>{lastResult.summary.attachments}</strong>
            </div>
            {lastResult.summary.skipped > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                跳过: <strong>{lastResult.summary.skipped}</strong>
              </div>
            )}
          </Space>
          {lastResult.results.length > 0 && (
            <div style={{ marginTop: 12, maxHeight: 180, overflowY: 'auto', fontSize: 13 }}>
              {lastResult.results.map((r, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ color: r.status === 'error' || r.status === 'skipped' ? '#faad14' : '#52c41a' }}>
                    [{r.status === 'created' ? '新建' : r.status === 'updated' ? '更新' : r.status === 'skipped' ? '跳过' : '错误'}]
                  </span>
                  {' '}{r.file}
                  {r.caseNo && ` → ${r.caseNo}`}
                  {r.note && <span style={{ color: '#8c8c8c' }}> ({r.note})</span>}
                  {r.reason && <span style={{ color: '#ff4d4f' }}> ({r.reason})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportSection;
