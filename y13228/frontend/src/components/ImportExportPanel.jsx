import React, { useRef, useState } from 'react';
import { Button, Space, Upload, Progress, Input, Modal, Form } from 'antd';
import { UploadOutlined, DownloadOutlined, ImportOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { importCsvAPI, exportCsvUrl, exportConflictsUrl, alignAuthAPI, alignReconcileAPI, downloadFile } from '../api.js';

export default function ImportExportPanel({ onDone, message, modal }) {
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [sourceName, setSourceName] = useState('运营主管-排练群截图整理');
  const fileRef = useRef(null);

  const beforeUpload = (file) => {
    setImporting(true);
    setImportProgress(10);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('source', sourceName || 'CSV导入');
    importCsvAPI(fd)
      .then(r => {
        setImportProgress(100);
        setTimeout(() => { setImporting(false); setImportProgress(0); }, 800);
        message.success(`导入成功：新增 ${r.imported} 条，更新 ${r.updated} 条${r.errors.length ? '，错误 ' + r.errors.length + ' 条' : ''}`);
        if (r.errors.length > 0) {
          Modal.warning({ title: '部分行导入失败', content: (<ul>{r.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}</ul>) });
        }
        onDone && onDone();
      })
      .catch(() => { setImporting(false); setImportProgress(0); });
    return false;
  };

  const onExportAll = () => downloadFile(exportCsvUrl({}), `曲目清单_全部_${Date.now()}.csv`);
  const onExportAnomaly = () => downloadFile(exportCsvUrl({ anomaly_only: 1 }), `曲目清单_异常明细_${Date.now()}.csv`);
  const onExportConflicts = () => downloadFile(exportConflictsUrl(), `别名冲突明细_${Date.now()}.csv`);

  const onAlignAuth = () => {
    Modal.confirm({
      title: '授权备注对齐',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>输入授权备注关键词（将匹配 remark / auth_remark 字段）：</p>
          <Input id="auth-input" defaultValue="团长授权加演" placeholder="例如：团长授权加演、AUTH编号等" />
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>匹配后将补齐来源、改为已确认、尝试对齐文件名，并记录历史。</p>
        </div>
      ),
      okText: '执行对齐',
      onOk: async () => {
        const val = document.getElementById('auth-input').value.trim();
        if (!val) return false;
        const r = await alignAuthAPI(val);
        message.success(`授权对齐完成：处理 ${r.aligned} 条曲目`);
        onDone && onDone();
      },
    });
  };

  const onReconcile = () => {
    modal.confirm({
      title: '全量重新对齐？',
      content: '将重新匹配文件名、重跑异常检测、授权对齐。此操作不会删除数据，但会覆盖部分字段（历史记录保留）。',
      okText: '确认全量重跑',
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await alignReconcileAPI();
        message.success(`全量重跑完成：对齐${r.reconciled}个文件名，新异常${r.anomalyChecks?.total || 0}条`);
        onDone && onDone();
      },
    });
  };

  return (
    <div>
      <Space wrap size="small">
        <Space.Compact>
          <Input
            style={{ width: 220 }}
            placeholder="本次导入来源名"
            value={sourceName}
            onChange={e => setSourceName(e.target.value)}
          />
          <Upload beforeUpload={beforeUpload} accept=".csv" showUploadList={false} ref={fileRef}>
            <Button icon={<UploadOutlined />} type="primary">导入CSV</Button>
          </Upload>
        </Space.Compact>
        {importing && <Progress percent={importProgress} status="active" style={{ width: 120 }} />}
        <Button icon={<DownloadOutlined />} onClick={onExportAll}>导出全部CSV</Button>
        <Button icon={<DownloadOutlined />} onClick={onExportAnomaly} danger>导出异常CSV</Button>
        <Button icon={<DownloadOutlined />} onClick={onExportConflicts} style={{ color: '#722ed1' }}>导出冲突CSV</Button>
        <Button icon={<ImportOutlined />} onClick={onAlignAuth}>授权备注对齐</Button>
        <Button icon={<ExclamationCircleOutlined />} onClick={onReconcile}>全量重跑对齐</Button>
      </Space>
    </div>
  );
}
