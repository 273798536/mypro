import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  Card,
  Tabs,
  Table,
  Button,
  Tag,
  Space,
  DatePicker,
  Select,
  Checkbox,
  Modal,
  Form,
  Radio,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Alert,
} from 'antd';
import {
  BarChart3,
  TrendingUp,
  Download,
  FileText,
  Calendar,
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  History,
  Filter,
  FileSpreadsheet,
  File as FileIcon,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '../store';
import {
  formatDateTime,
  formatDate,
  getConclusionColor,
  getConclusionText,
  generateId,
  downloadFile,
} from '../utils';
import type { CheckResult, ExportReport } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Group: CheckboxGroup } = Checkbox;

const AnalysisPage: React.FC = () => {
  const {
    checkResults,
    ledgers,
    reports,
    loadRecords,
    oilPressureSeries,
    getLoadRecordById,
    addReport,
    updateCheckResult,
  } = useAppStore();

  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedLedgerVersion, setSelectedLedgerVersion] = useState<string | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportForm] = Form.useForm();
  const [selectedCheckResults, setSelectedCheckResults] = useState<string[]>([]);
  const [activeChartTab, setActiveChartTab] = useState('trend');

  const deviceOptions = useMemo(() => {
    const devices = new Map<string, string>();
    loadRecords.forEach((r) => {
      devices.set(r.deviceId, r.deviceName);
    });
    return Array.from(devices.entries()).map(([id, name]) => ({
      label: name,
      value: id,
    }));
  }, [loadRecords]);

  const ledgerOptions = useMemo(() => {
    if (!selectedDevice) return [];
    return ledgers
      .filter((l) => l.deviceId === selectedDevice)
      .map((l) => ({
        label: `${l.version} - ${l.versionName}${l.isCurrent ? ' (当前)' : ''}`,
        value: l.version,
      }));
  }, [ledgers, selectedDevice]);

  const filteredResults = useMemo(() => {
    let filtered = [...checkResults];

    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((r) => {
        const checkTime = r.checkTime;
        return checkTime >= dateRange[0] && checkTime <= dateRange[1] + ' 23:59:59';
      });
    }

    if (selectedDevice) {
      filtered = filtered.filter((r) => {
        const loadRecord = getLoadRecordById(r.loadRecordId);
        return loadRecord?.deviceId === selectedDevice;
      });
    }

    if (selectedLedgerVersion) {
      filtered = filtered.filter((r) => r.ledgerVersion === selectedLedgerVersion);
    }

    return filtered.sort(
      (a, b) => new Date(a.checkTime).getTime() - new Date(b.checkTime).getTime()
    );
  }, [checkResults, dateRange, selectedDevice, selectedLedgerVersion, getLoadRecordById]);

  const trendChartOption = useMemo(() => {
    const dates = filteredResults.map((r) => formatDate(r.checkTime));
    const overloadData = filteredResults.map((r) => (!r.overloadCheck.passed ? 1 : 0));
    const pressureData = filteredResults.map((r) => (!r.pressureCheck.passed ? 1 : 0));
    const heightData = filteredResults.map((r) => (!r.heightCheck.passed ? 1 : 0));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['超载记录', '油压异常', '高度越界'],
        top: 0,
      },
      grid: {
        left: 50,
        right: 30,
        top: 40,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { rotate: 45, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        axisLabel: {
          formatter: (value: number) => (value === 1 ? '异常' : '正常'),
        },
      },
      series: [
        {
          name: '超载记录',
          type: 'bar',
          data: overloadData,
          itemStyle: { color: '#F53F3F' },
          barWidth: 12,
        },
        {
          name: '油压异常',
          type: 'bar',
          data: pressureData,
          itemStyle: { color: '#FF7D00' },
          barWidth: 12,
        },
        {
          name: '高度越界',
          type: 'bar',
          data: heightData,
          itemStyle: { color: '#722ED1' },
          barWidth: 12,
        },
      ],
    };
  }, [filteredResults]);

  const statsChartOption = useMemo(() => {
    const normal = filteredResults.filter((r) => r.conclusion === 'normal').length;
    const warning = filteredResults.filter((r) => r.conclusion === 'warning').length;
    const danger = filteredResults.filter((r) => r.conclusion === 'danger').length;

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 20,
        top: 'center',
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          data: [
            { value: normal, name: '正常', itemStyle: { color: '#00B42A' } },
            { value: warning, name: '预警', itemStyle: { color: '#FF7D00' } },
            { value: danger, name: '危险', itemStyle: { color: '#F53F3F' } },
          ],
        },
      ],
    };
  }, [filteredResults]);

  const loadTrendChartOption = useMemo(() => {
    const dates = filteredResults.map((r) => formatDate(r.checkTime));
    const loadWeights = filteredResults.map((r) => {
      const loadRecord = getLoadRecordById(r.loadRecordId);
      return loadRecord?.loadWeight || 0;
    });
    const ratedLoads = filteredResults.map((r) => {
      const loadRecord = getLoadRecordById(r.loadRecordId);
      return loadRecord?.ratedLoad || 0;
    });

    return {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['实际载重', '额定载荷'],
        top: 0,
      },
      grid: {
        left: 60,
        right: 30,
        top: 40,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { rotate: 45, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '重量(kg)',
        nameTextStyle: { fontSize: 11 },
      },
      series: [
        {
          name: '实际载重',
          type: 'line',
          data: loadWeights,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#165DFF', width: 3 },
          itemStyle: { color: '#165DFF' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 93, 255, 0.3)' },
                { offset: 1, color: 'rgba(22, 93, 255, 0.05)' },
              ],
            },
          },
        },
        {
          name: '额定载荷',
          type: 'line',
          data: ratedLoads,
          smooth: false,
          symbol: 'none',
          lineStyle: {
            color: '#F53F3F',
            width: 2,
            type: 'dashed',
          },
        },
      ],
    };
  }, [filteredResults, getLoadRecordById]);

  const handleExport = (values: any) => {
    const resultsToExport = values.includeAll
      ? filteredResults
      : checkResults.filter((r) => selectedCheckResults.includes(r.id));

    if (resultsToExport.length === 0) {
      message.error('请选择要导出的校核记录');
      return;
    }

    const report: ExportReport = {
      id: generateId(),
      reportNo: `RPT-${formatDate(new Date()).replace(/-/g, '')}-${String(reports.length + 1).padStart(3, '0')}`,
      checkResultIds: resultsToExport.map((r) => r.id),
      generateTime: new Date().toISOString(),
      format: values.format,
      operator: '设备安全员',
      includeEvidence: values.includeEvidence,
    };

    addReport(report);

    resultsToExport.forEach((r) => {
      if (r.status !== 'archived') {
        updateCheckResult(r.id, { status: 'archived' });
      }
    });

    if (values.format === 'excel') {
      exportToExcel(resultsToExport, values.includeEvidence, report.reportNo);
    } else {
      exportToPDF(resultsToExport, values.includeEvidence, report.reportNo);
    }

    setExportModalVisible(false);
    exportForm.resetFields();
    setSelectedCheckResults([]);
    message.success(`报告${report.reportNo}已生成并下载`);
  };

  const exportToExcel = (
    results: CheckResult[],
    includeEvidence: boolean,
    reportNo: string
  ) => {
    const data = results.map((r) => {
      const loadRecord = getLoadRecordById(r.loadRecordId);
      const row: Record<string, any> = {
        记录编号: r.recordNo,
        设备名称: loadRecord?.deviceName || '-',
        校核时间: formatDateTime(r.checkTime),
        台账版本: r.ledgerVersion,
        超载检测: r.overloadCheck.passed ? '正常' : `异常(${r.overloadCheck.value}/${r.overloadCheck.threshold}kg)`,
        油压检测: r.pressureCheck.passed ? '正常' : `异常(${r.pressureCheck.value}MPa)`,
        高度检测: r.heightCheck.passed ? '正常' : `异常(${r.heightCheck.value}/${r.heightCheck.threshold}m)`,
        结论: getConclusionText(r.conclusion),
        口径一致: r.conclusionConsistent ? '是' : '否',
        检修备注: r.maintenanceRemark || '-',
        操作人: r.operator,
        状态: r.status === 'draft' ? '草稿' : r.status === 'confirmed' ? '已确认' : '已归档',
      };

      if (includeEvidence) {
        row.载重记录ID = r.loadRecordId;
        row.油压序列ID = r.oilPressureId;
        row.证据链长度 = r.evidenceChain.length;
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '校核结果');

    if (includeEvidence) {
      const evidenceData = results.flatMap((r) =>
        r.evidenceChain.map((e) => ({
          记录编号: r.recordNo,
          证据类型: e.type === 'load_record' ? '载重记录' : e.type === 'oil_pressure' ? '油压序列' : e.type === 'maintenance_remark' ? '检修备注' : '导出报告',
          证据ID: e.refId,
          描述: e.description,
          操作人: e.operator,
          时间: formatDateTime(e.timestamp),
        }))
      );
      const wsEvidence = XLSX.utils.json_to_sheet(evidenceData);
      XLSX.utils.book_append_sheet(wb, wsEvidence, '证据链明细');
    }

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadFile(blob, `${reportNo}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const exportToPDF = async (
    results: CheckResult[],
    includeEvidence: boolean,
    reportNo: string
  ) => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('液压升降安全校核报告', 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`报告编号: ${reportNo}`, 20, yPos);
    doc.text(`生成时间: ${formatDateTime(new Date())}`, 120, yPos);
    yPos += 8;
    doc.text(`操作人: 设备安全员`, 20, yPos);
    doc.text(`记录数量: ${results.length}条`, 120, yPos);
    yPos += 10;

    doc.setDrawColor(200);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    results.forEach((r, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const loadRecord = getLoadRecordById(r.loadRecordId);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${r.recordNo} - ${loadRecord?.deviceName || '-'}`, 20, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`  校核时间: ${formatDateTime(r.checkTime)}`, 25, yPos);
      yPos += 5;
      doc.text(`  台账版本: ${r.ledgerVersion}`, 25, yPos);
      yPos += 5;
      doc.text(`  超载检测: ${r.overloadCheck.detail}`, 25, yPos);
      yPos += 5;
      doc.text(`  油压检测: ${r.pressureCheck.detail}`, 25, yPos);
      yPos += 5;
      doc.text(`  高度检测: ${r.heightCheck.detail}`, 25, yPos);
      yPos += 5;
      doc.text(`  结论: ${getConclusionText(r.conclusion)}`, 25, yPos);
      yPos += 5;
      doc.text(`  口径一致: ${r.conclusionConsistent ? '是' : '否'}`, 25, yPos);
      yPos += 5;

      if (r.maintenanceRemark) {
        const splitText = doc.splitTextToSize(`  检修备注: ${r.maintenanceRemark}`, 160);
        doc.text(splitText, 25, yPos);
        yPos += splitText.length * 5;
      }

      if (includeEvidence && r.evidenceChain.length > 0) {
        yPos += 3;
        doc.setFont('helvetica', 'bold');
        doc.text('  证据链:', 25, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        r.evidenceChain.forEach((e) => {
          const typeText = e.type === 'load_record' ? '载重记录' : e.type === 'oil_pressure' ? '油压序列' : e.type === 'maintenance_remark' ? '检修备注' : '导出报告';
          doc.text(`    - [${typeText}] ${e.description} (${e.operator}, ${formatDate(e.timestamp)})`, 28, yPos);
          yPos += 5;
        });
      }

      yPos += 5;
      doc.setDrawColor(230);
      doc.line(25, yPos, 185, yPos);
      yPos += 8;
    });

    doc.save(`${reportNo}.pdf`);
  };

  const reportColumns = [
    {
      title: '报告编号',
      dataIndex: 'reportNo',
      key: 'reportNo',
      width: 180,
      render: (text: string) => <span className="font-mono text-sm">{text}</span>,
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (format: string) => (
        <Tag color={format === 'pdf' ? 'red' : 'green'}>
          {format.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '包含证据链',
      dataIndex: 'includeEvidence',
      key: 'includeEvidence',
      width: 100,
      render: (val: boolean) => (val ? <Tag color="blue">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '包含记录数',
      dataIndex: 'checkResultIds',
      key: 'checkResultIds',
      width: 100,
      render: (ids: string[]) => ids.length,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '生成时间',
      dataIndex: 'generateTime',
      key: 'generateTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: () => (
        <Button type="link" size="small" icon={<Download size={14} />}>
          下载
        </Button>
      ),
    },
  ];

  const resultColumns = [
    {
      title: '选择',
      key: 'select',
      width: 50,
      render: (_: any, record: CheckResult) => (
        <Checkbox
          checked={selectedCheckResults.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCheckResults([...selectedCheckResults, record.id]);
            } else {
              setSelectedCheckResults(selectedCheckResults.filter((id) => id !== record.id));
            }
          }}
        />
      ),
    },
    {
      title: '记录编号',
      dataIndex: 'recordNo',
      key: 'recordNo',
      width: 160,
      render: (text: string) => <span className="font-mono text-sm">{text}</span>,
    },
    {
      title: '设备名称',
      key: 'deviceName',
      width: 140,
      render: (_: any, record: CheckResult) => {
        const loadRecord = getLoadRecordById(record.loadRecordId);
        return loadRecord?.deviceName || '-';
      },
    },
    {
      title: '台账版本',
      dataIndex: 'ledgerVersion',
      key: 'ledgerVersion',
      width: 100,
      render: (text: string) => (
        <Tag color="blue" className="font-mono">
          {text}
        </Tag>
      ),
    },
    {
      title: '结论',
      dataIndex: 'conclusion',
      key: 'conclusion',
      width: 90,
      render: (conclusion: CheckResult['conclusion']) => (
        <Tag color={getConclusionColor(conclusion)}>{getConclusionText(conclusion)}</Tag>
      ),
    },
    {
      title: '校核时间',
      dataIndex: 'checkTime',
      key: 'checkTime',
      width: 160,
      render: (text: string) => formatDateTime(text),
    },
  ];

  const stats = {
    total: filteredResults.length,
    normal: filteredResults.filter((r) => r.conclusion === 'normal').length,
    warning: filteredResults.filter((r) => r.conclusion === 'warning').length,
    danger: filteredResults.filter((r) => r.conclusion === 'danger').length,
    overload: filteredResults.filter((r) => !r.overloadCheck.passed).length,
    pressure: filteredResults.filter((r) => !r.pressureCheck.passed).length,
    height: filteredResults.filter((r) => !r.heightCheck.passed).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">复盘分析</h2>
          <p className="text-sm text-gray-500">
            多维度趋势图表分析，多版本对比，导出校核报告用于事后复盘
          </p>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<Download size={16} />}
            onClick={() => setExportModalVisible(true)}
            disabled={selectedCheckResults.length === 0}
          >
            导出报告 ({selectedCheckResults.length})
          </Button>
          <Button
            type="default"
            icon={<Settings size={16} />}
            onClick={() => {
              setSelectedCheckResults(filteredResults.map((r) => r.id));
              message.info(`已选择当前筛选条件下的所有${filteredResults.length}条记录`);
            }}
          >
            全选当前筛选
          </Button>
        </Space>
      </div>

      <Card size="small">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">时间范围：</span>
            <RangePicker
              value={
                dateRange
                  ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
                  : null
              }
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([
                    dates[0].format('YYYY-MM-DD'),
                    dates[1].format('YYYY-MM-DD'),
                  ]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">设备：</span>
            <Select
              style={{ width: 180 }}
              placeholder="请选择设备"
              value={selectedDevice}
              onChange={(val) => {
                setSelectedDevice(val);
                setSelectedLedgerVersion(null);
              }}
              allowClear
            >
              {deviceOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">台账版本：</span>
            <Select
              style={{ width: 220 }}
              placeholder="请选择台账版本"
              value={selectedLedgerVersion}
              onChange={setSelectedLedgerVersion}
              allowClear
              disabled={!selectedDevice}
            >
              {ledgerOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </div>
          <Button icon={<Filter size={14} />}>筛选</Button>
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="border-l-4 border-l-green-500">
            <Statistic
              title="总记录数"
              value={stats.total}
              prefix={<BarChart3 size={20} />}
              valueStyle={{ color: '#1D2129' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-l-4 border-l-green-500">
            <Statistic
              title="正常"
              value={stats.normal}
              prefix={<CheckCircle size={20} />}
              valueStyle={{ color: '#00B42A' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-l-4 border-l-orange-500">
            <Statistic
              title="预警"
              value={stats.warning}
              prefix={<AlertTriangle size={20} />}
              valueStyle={{ color: '#FF7D00' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-l-4 border-l-red-500">
            <Statistic
              title="危险"
              value={stats.danger}
              prefix={<XCircle size={20} />}
              valueStyle={{ color: '#F53F3F' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span className="flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            趋势图表分析
          </span>
        }
        extra={
          <Tabs
            activeKey={activeChartTab}
            onChange={setActiveChartTab}
            size="small"
            className="mb-0"
          >
            <TabPane tab="异常趋势" key="trend" />
            <TabPane tab="结论统计" key="stats" />
            <TabPane tab="载重趋势" key="load" />
          </Tabs>
        }
      >
        {activeChartTab === 'trend' && (
          <div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700">
                <strong>异常趋势图：</strong>展示各次校核的异常情况，便于发现问题规律。
                日常处理与事后复盘使用同一套数据，确保口径一致。
              </p>
            </div>
            <ReactECharts option={trendChartOption} style={{ height: 350 }} />
          </div>
        )}
        {activeChartTab === 'stats' && (
          <div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-green-700">
                <strong>结论统计图：</strong>展示当前筛选条件下各类结论的占比，
                便于整体评估设备运行状况。
              </p>
            </div>
            <ReactECharts option={statsChartOption} style={{ height: 350 }} />
          </div>
        )}
        {activeChartTab === 'load' && (
          <div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-orange-700">
                <strong>载重趋势图：</strong>红色虚线为额定载荷阈值，
                便于观察载重变化趋势和超载情况。
              </p>
            </div>
            <ReactECharts option={loadTrendChartOption} style={{ height: 350 }} />
          </div>
        )}
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-green-500" />
            校核记录列表（选择后可导出）
          </span>
        }
        size="small"
      >
        <Table
          columns={resultColumns}
          dataSource={filteredResults}
          rowKey="id"
          size="small"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10 }}
          rowSelection={{
            selectedRowKeys: selectedCheckResults,
            onChange: (keys) => setSelectedCheckResults(keys as string[]),
          }}
        />
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2">
            <FileIcon size={18} className="text-purple-500" />
            历史导出报告
          </span>
        }
        size="small"
      >
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4">
          <p className="text-xs text-purple-700">
            <strong>报告可追溯：</strong>导出的报告记录了包含的校核结果ID列表，
            便于后续复核时追溯原始数据，确保日常处理与事后复盘口径一致。
          </p>
        </div>
        <Table
          columns={reportColumns}
          dataSource={reports}
          rowKey="id"
          size="small"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="导出校核报告"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
        width={500}
      >
        <Alert
          type="info"
          showIcon
          message="报告导出说明"
          description={
            <div className="text-xs">
              <p>• 报告包含所选校核记录的完整信息，用于事后复盘</p>
              <p>• 勾选"包含证据链"将导出完整的证据链明细，便于复核追溯</p>
              <p>• 导出的报告会记录包含的校核结果ID，确保可追溯</p>
            </div>
          }
          className="mb-4"
        />
        <Form form={exportForm} layout="vertical" onFinish={handleExport}>
          <Form.Item
            name="format"
            label="报告格式"
            rules={[{ required: true, message: '请选择报告格式' }]}
            initialValue="excel"
          >
            <Radio.Group>
              <Radio.Button value="excel">
                <FileSpreadsheet size={16} className="mr-1" /> Excel
              </Radio.Button>
              <Radio.Button value="pdf">
                <FileText size={16} className="mr-1" /> PDF
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="includeAll"
            label="导出范围"
            initialValue={false}
          >
            <Radio.Group>
              <Radio value={false}>
                已选择的 {selectedCheckResults.length} 条记录
              </Radio>
              <Radio value={true}>
                当前筛选条件下的所有 {filteredResults.length} 条记录
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="includeEvidence"
            label="包含内容"
            initialValue={true}
          >
            <CheckboxGroup>
              <Checkbox value={true}>包含证据链明细（推荐）</Checkbox>
            </CheckboxGroup>
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setExportModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" icon={<Download size={16} />}>
              导出报告
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AnalysisPage;
