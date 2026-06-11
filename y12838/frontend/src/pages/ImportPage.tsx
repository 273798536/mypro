import { useState } from 'react';
import {
  Card, Upload, Button, Space, Table, Tag, Alert, Progress,
  Divider, message, Descriptions, Row, Col
} from 'antd';
import { UploadOutlined, FileExcelOutlined, FileImageOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ImportRecord } from '../types';
import { importApi } from '../api';
import { useEffect } from 'react';

export default function ImportPage() {
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    try {
      const data = await importApi.records();
      setRecords(data);
    } catch {}
  };

  const beforeSampleUpload = (file: File) => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      message.error('仅支持 Excel (.xlsx/.xls) 或 CSV 文件');
      return false;
    }
    handleSampleImport(file);
    return false;
  };

  const handleSampleImport = async (file: File) => {
    setProgress(0);
    setLastResult(null);
    const hide = message.loading('正在解析导入...', 0);
    try {
      const res = await importApi.importSamples(file, setProgress);
      hide();
      setLastResult(res);
      if (res.conflicts > 0) {
        message.warning(`导入完成：新增${res.inserted}条，更新${res.updated}条，${res.conflicts}条存在冲突`);
      } else {
        message.success(`导入完成：新增${res.inserted}条，更新${res.updated}条`);
      }
      loadRecords();
    } catch (e: any) {
      hide();
      message.error(e.response?.data?.error || '导入失败');
    } finally {
      setProgress(0);
    }
  };

  const beforeImageUpload = (file: File, fileList: File[]) => {
    handleImageImport(fileList as any);
    return false;
  };

  const handleImageImport = async (files: File[]) => {
    if (files.length === 0) return;
    setProgress(0);
    setLastResult(null);
    const hide = message.loading(`正在上传 ${files.length} 张图片...`, 0);
    try {
      const res = await importApi.importImages(files, setProgress);
      hide();
      setLastResult(res);
      message.success(`成功上传 ${res.uploaded} 张图片`);
      loadRecords();
    } catch (e: any) {
      hide();
      message.error(e.response?.data?.error || '上传失败');
    } finally {
      setProgress(0);
    }
  };

  const columns: ColumnsType<ImportRecord> = [
    { title: '文件名', dataIndex: 'file_name', render: (t, r) => (
      <Space>
        {r.import_type === 'samples' ? <FileExcelOutlined /> : <FileImageOutlined />}
        {t}
      </Space>
    )},
    { title: '类型', dataIndex: 'import_type', width: 100, render: t => <Tag color={t === 'samples' ? 'blue' : 'purple'}>{t === 'samples' ? '样本清单' : '显微图片'}</Tag> },
    { title: '总行数', dataIndex: 'row_count', width: 80 },
    { title: '新增', dataIndex: 'inserted_count', width: 80, render: v => <Tag color="green">{v}</Tag> },
    { title: '更新', dataIndex: 'updated_count', width: 80, render: v => <Tag color="blue">{v}</Tag> },
    { title: '冲突', dataIndex: 'conflict_count', width: 80, render: v => v > 0 ? <Tag color="red">{v}</Tag> : v },
    { title: '导入批次', dataIndex: 'import_batch', width: 160, render: v => <code style={{ fontSize: 11 }}>{v.slice(0, 12)}...</code> },
    { title: '导入时间', dataIndex: 'created_at', render: t => new Date(t).toLocaleString() }
  ];

  return (
    <div>
      <div className="page-card">
        <div className="page-header">
          <h2 className="page-title">数据导入</h2>
        </div>

        <Alert
          type="info"
          showIcon
          message="数据一致性保障"
          description={(
            <div>
              <p><b>样本清单</b>：以「试剂批号 + 样本编号」为唯一键，重复导入时自动更新已有记录；若已复核结论与新导入不一致，则标记为「冲突」需人工处理。</p>
              <p><b>显微照片</b>：图片单独导入后，可在「图像标注」页面关联到样本，避免样本与图片互相打架。</p>
              <p>所有图表、明细、下载报告均从数据库同一数据源生成，确保结论一致。</p>
            </div>
          )}
          style={{ marginBottom: 24 }}
        />

        <Row gutter={24}>
          <Col span={12}>
            <Card
              type="inner"
              title={<Space><FileExcelOutlined /> 导入样本清单</Space>}
              extra={<span style={{ color: '#888', fontSize: 12 }}>支持 Excel (.xlsx/.xls)、CSV</span>}
            >
              <div style={{ padding: '20px 0' }}>
                <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="必需列">
                    <Tag>试剂批号</Tag><Tag>样本编号</Tag><Tag>菌种名称</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="可选列">
                    <Tag>备注</Tag><Tag>测序结果</Tag><Tag>活性等级</Tag><Tag>结论</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="自动保留">
                    原始行号、来源文件名、导入批次
                  </Descriptions.Item>
                </Descriptions>
                <Upload beforeUpload={beforeSampleUpload} showUploadList={false} accept=".xlsx,.xls,.csv">
                  <Button icon={<UploadOutlined />} type="primary" size="large">选择样本清单文件</Button>
                </Upload>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card
              type="inner"
              title={<Space><FileImageOutlined /> 导入显微照片</Space>}
              extra={<span style={{ color: '#888', fontSize: 12 }}>JPG/PNG/TIFF/BMP，支持多选</span>}
            >
              <div style={{ padding: '20px 0' }}>
                <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="操作">
                    图片上传后，在「图像标注」页面进行标注并关联到具体样本。
                  </Descriptions.Item>
                  <Descriptions.Item label="追溯">
                    每张图片保留原始文件名、导入批次，可在样本详情中一键回溯。
                  </Descriptions.Item>
                </Descriptions>
                <Upload multiple beforeUpload={beforeImageUpload} showUploadList={false} accept="image/*">
                  <Button icon={<UploadOutlined />} size="large">选择显微照片（可多选）</Button>
                </Upload>
              </div>
            </Card>
          </Col>
        </Row>

        {progress > 0 && (
          <div style={{ marginTop: 24 }}>
            <Progress percent={progress} />
          </div>
        )}

        {lastResult && lastResult.conflict_details?.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`发现 ${lastResult.conflict_details.length} 条冲突数据`}
            description={(
              <div>
                {lastResult.conflict_details.map((c: any, i: number) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                    <b>{c.reagent_batch} / {c.sample_no}</b>（原始行号 R{c.original_row}）：
                    已有「{c.existing.strain_name}，结论：{c.existing.conclusion || '未填写'}」，
                    新导入「{c.new.strain_name}，结论：{c.new.conclusion || '未填写'}」
                  </div>
                ))}
                <p style={{ marginTop: 8 }}>请前往「样本清单」或「菌种活性报告」查看并处理冲突样本（标记为红色）。</p>
              </div>
            )}
            style={{ marginTop: 24 }}
          />
        )}

        <Divider />

        <h3>导入历史</h3>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          pagination={{ pageSize: 10 }}
        />
      </div>
    </div>
  );
}
