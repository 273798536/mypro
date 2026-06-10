import { useState, useEffect } from 'react';
import { Modal, Tabs, Button, App, Card, Descriptions, Tag, Space, Typography, message } from 'antd';
import { FileTextOutlined, DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import type { Sample, ReportData } from '../types';
import { generateReport, exportReports, downloadBlob, qualityLabels, qualityColors, statusLabels, statusColors } from '../api';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface Props {
  open: boolean;
  sample: Sample | null;
  onClose: () => void;
}

export default function ReportModal({ open, sample, onClose }: Props) {
  const { message } = App.useApp();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (open && sample) {
      loadReport();
    }
  }, [open, sample]);

  async function loadReport() {
    if (!sample) return;
    setLoading(true);
    try {
      const res = await generateReport(sample.id);
      setReportData(res.data.data);
    } catch (e: any) {
      message.error('加载报告失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportExcel() {
    if (!sample) return;
    try {
      const res = await exportReports([sample.id]);
      downloadBlob(res.data, `细菌耐药谱报告_${sample.barcode}_${dayjs().format('YYYYMMDD')}.xlsx`);
      message.success('报告导出成功');
    } catch (e: any) {
      message.error('导出失败: ' + e.message);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    message.success(`已复制${label}到剪贴板`);
  }

  if (!sample || !reportData) return null;

  const overviewTab = {
    key: 'overview',
    label: '报告概览',
    children: (
      <div>
        <Card size="small" style={{ marginBottom: 16 }} title="样本基本信息">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="样本条码">
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sample.barcode}</span>
            </Descriptions.Item>
            <Descriptions.Item label="样本名称">{sample.sampleName}</Descriptions.Item>
            <Descriptions.Item label="细菌名称">{sample.bacteriaName}</Descriptions.Item>
            <Descriptions.Item label="测序批次">{sample.sequencingBatch || '-'}</Descriptions.Item>
            <Descriptions.Item label="采集时间">
              {sample.collectionTime || <Tag color="default">未填写</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="检测时间">
              {sample.testTime || <Tag color="default">未填写</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="质量状态">
              <Tag color={qualityColors[sample.qualityStatus]}>
                {qualityLabels[sample.qualityStatus]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="处理状态">
              <Tag color={statusColors[sample.status]}>
                {statusLabels[sample.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="耐药谱" span={2}>
              {sample.resistanceProfile || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {reportData.duplicateExplanation && (
          <Card 
            size="small" 
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <span style={{ color: '#fa8c16' }}>⚠️</span>
                <span>条码重复说明（可复制）</span>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(reportData.duplicateExplanation, '条码重复说明')}
                >
                  一键复制
                </Button>
              </Space>
            }
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                生物老师可直接复制使用，无需重新翻译
              </Text>
            }
          >
            <pre className="report-textarea" style={{ 
              whiteSpace: 'pre-wrap', 
              background: '#fff7e6', 
              padding: 16, 
              borderRadius: 6,
              margin: 0,
              border: '1px solid #ffd591',
              fontSize: 13,
              lineHeight: 1.8
            }}>
{reportData.duplicateExplanation}
            </pre>
          </Card>
        )}

        {reportData.timePointExplanation && (
          <Card 
            size="small" 
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <span style={{ color: '#1890ff' }}>⏰</span>
                <span>时间点缺失说明（可复制）</span>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(reportData.timePointExplanation, '时间点缺失说明')}
                >
                  一键复制
                </Button>
              </Space>
            }
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                生物老师可直接复制使用，无需重新翻译
              </Text>
            }
          >
            <pre className="report-textarea" style={{ 
              whiteSpace: 'pre-wrap', 
              background: '#e6f7ff', 
              padding: 16, 
              borderRadius: 6,
              margin: 0,
              border: '1px solid #91d5ff',
              fontSize: 13,
              lineHeight: 1.8
            }}>
{reportData.timePointExplanation}
            </pre>
          </Card>
        )}
      </div>
    ),
  };

  const qualityTab = {
    key: 'quality',
    label: '质量报告',
    children: (
      <Card size="small">
        <pre className="report-textarea" style={{ 
          whiteSpace: 'pre-wrap', 
          background: '#fafafa', 
          padding: 20, 
          borderRadius: 6,
          margin: 0,
          fontSize: 13,
          lineHeight: 1.8
        }}>
{reportData.qualityReport}
        </pre>
      </Card>
    ),
  };

  const traceTab = {
    key: 'trace',
    label: '处理轨迹',
    children: (
      <Card size="small">
        <pre className="report-textarea" style={{ 
          whiteSpace: 'pre-wrap', 
          background: '#fafafa', 
          padding: 20, 
          borderRadius: 6,
          margin: 0,
          fontSize: 13,
          lineHeight: 1.8
        }}>
{reportData.traceabilityInfo}
        </pre>
      </Card>
    ),
  };

  const fullReportTab = {
    key: 'full',
    label: '完整报告',
    children: (
      <Card size="small">
        <pre className="report-textarea" style={{ 
          whiteSpace: 'pre-wrap', 
          background: '#fafafa', 
          padding: 20, 
          borderRadius: 6,
          margin: 0,
          fontSize: 13,
          lineHeight: 1.8
        }}>
{`══════════════════════════════════════════════════
           细菌耐药谱分析报告
══════════════════════════════════════════════════

生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}
报告编号：RPT-${sample.id}-${Date.now()}

${reportData.qualityReport}

${reportData.duplicateExplanation ? reportData.duplicateExplanation + '\n' : ''}
${reportData.timePointExplanation ? reportData.timePointExplanation + '\n' : ''}
${reportData.traceabilityInfo}

══════════════════════════════════════════════════
                    报告结束
══════════════════════════════════════════════════`}
        </pre>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button 
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(`
══════════════════════════════════════════════════
           细菌耐药谱分析报告
══════════════════════════════════════════════════

生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}
报告编号：RPT-${sample.id}-${Date.now()}

${reportData.qualityReport}

${reportData.duplicateExplanation ? reportData.duplicateExplanation + '\n' : ''}
${reportData.timePointExplanation ? reportData.timePointExplanation + '\n' : ''}
${reportData.traceabilityInfo}

══════════════════════════════════════════════════
                    报告结束
══════════════════════════════════════════════════`, '完整报告')}
          >
            复制完整报告
          </Button>
        </div>
      </Card>
    ),
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>细菌耐药谱报告 - {sample.barcode}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={850}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
        <Button 
          key="export" 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={handleExportExcel}
        >
          导出Excel报告
        </Button>,
      ]}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[overviewTab, qualityTab, traceTab, fullReportTab]}
      />
    </Modal>
  );
}
