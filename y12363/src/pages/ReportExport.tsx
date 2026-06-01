import React, { useState, useMemo } from 'react';
import { Card, Radio, Checkbox, DatePicker, Button, Row, Col, Statistic, Tabs, List, Tag, Alert, message, Space } from 'antd';
import { FileSpreadsheet, FileText, FileBarChart, Download, Eye, Printer, Calendar, CheckCircle2, AlertTriangle, Thermometer, Database, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import { COLORS } from '../constants';

const { RangePicker } = DatePicker;
const { Group: RG } = Radio;
const { Group: CG } = Checkbox;

type RT = 'estimate' | 'anomaly' | 'comparison';
type EF = 'xlsx' | 'pdf';
type CO = 'rawData' | 'estimateResult' | 'anomalyDetail' | 'auditTrail' | 'comparison';

const templates: { key: RT; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'estimate', label: '估算报告', icon: <FileSpreadsheet size={20} />, desc: '标准温度估算结果报告' },
  { key: 'anomaly', label: '异常明细报告', icon: <AlertTriangle size={20} />, desc: '异常检测详细记录报告' },
  { key: 'comparison', label: '前后差别对比报告', icon: <FileBarChart size={20} />, desc: '两次运行参数与结果对比' },
];

const contOpts: { label: string; value: CO; icon: React.ReactNode }[] = [
  { label: '原始数据', value: 'rawData', icon: <Database size={14} /> },
  { label: '估算结果', value: 'estimateResult', icon: <Thermometer size={14} /> },
  { label: '异常明细', value: 'anomalyDetail', icon: <AlertTriangle size={14} /> },
  { label: '审计追踪', value: 'auditTrail', icon: <Activity size={14} /> },
  { label: '对比分析', value: 'comparison', icon: <FileBarChart size={14} /> },
];

const ReportExport: React.FC = () => {
  const { readings, anomalies, auditTrails, runs, batches, currentRunId, baseRunId, comparisonSummary, getFilteredResults } = useAppStore();
  const [reportType, setReportType] = useState<RT>('estimate');
  const [format, setFormat] = useState<EF>('xlsx');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [contents, setContents] = useState<CO[]>(['estimateResult', 'anomalyDetail']);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentRun = runs.find(r => r.id === currentRunId);
  const baseRun = runs.find(r => r.id === baseRunId);
  const fmtDT = (d: any) => dayjs(d).format('YYYY-MM-DD HH:mm:ss');
  const fmtD = (d: any) => dayjs(d).format('YYYY-MM-DD HH:mm');
  const getBN = (id: string) => batches.find(b => b.id === id)?.batchNo || id;

  const filteredData = useMemo(() => {
    const data = getFilteredResults();
    if (dateRange?.[0] && dateRange?.[1]) {
      return data.filter(d => {
        const t = dayjs(d.reading.readingTime);
        return t.isAfter(dateRange[0]!) && t.isBefore(dateRange[1]!);
      });
    }
    return data;
  }, [getFilteredResults, dateRange]);

  const stats = useMemo(() => {
    const totalRecords = filteredData.length;
    const anomalyCount = filteredData.filter(d => d.anomaly).length;
    const temps = filteredData.filter(d => !d.result.isIsolated).map(d => d.result.estimatedTemp);
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const auditCount = auditTrails.filter(a => {
      if (!dateRange?.[0] || !dateRange?.[1]) return true;
      const t = dayjs(a.modifiedAt);
      return t.isAfter(dateRange[0]!) && t.isBefore(dateRange[1]!);
    }).length;
    return { totalRecords, anomalyCount, avgTemp, auditCount };
  }, [filteredData, auditTrails, dateRange]);

  const generatePreview = () => {
    if (reportType === 'comparison' && (!baseRunId || !currentRunId)) {
      message.warning('对比报告需要选择基准运行和当前运行');
      return;
    }
    setPreview(true);
    message.success('报告预览已生成');
  };

  const addSheet = (wb: XLSX.WorkBook, data: any[], name: string) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), name);
  };

  const exportToExcel = () => {
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      if (contents.includes('rawData')) addSheet(wb, readings.map(r => ({ 传感器ID: r.sensorId, 读数时间: fmtDT(r.readingTime), 辐射值: r.radiationValue, 批次: getBN(r.materialBatchId), 发射率: r.emissivity, 环境温度: r.ambientTemp, 备注: r.remark })), '原始数据');
      if (contents.includes('estimateResult')) addSheet(wb, filteredData.map(d => ({ 批次: d.batch?.batchNo || '-', 传感器: d.reading.sensorId, 读数时间: fmtDT(d.reading.readingTime), 估算温度: d.result.estimatedTemp.toFixed(2), 计算公式: d.result.calculationFormula, 异常类型: d.anomaly?.type || '无', 是否隔离: d.result.isIsolated ? '是' : '否' })), '估算结果');
      if (contents.includes('anomalyDetail')) addSheet(wb, anomalies.map(a => { const r = readings.find(x => x.id === a.readingId); return { 异常类型: a.type, 异常等级: a.level, 描述: a.description, 检测时间: fmtDT(a.detectedAt), 传感器: r?.sensorId || '-', 批次: r ? getBN(r.materialBatchId) : '-', 复核状态: a.isReviewed ? '已复核' : '待复核', 复核人: a.reviewedBy || '-', 复核意见: a.reviewRemark || '-' }; }), '异常明细');
      if (contents.includes('auditTrail')) addSheet(wb, auditTrails.map(a => ({ 修改时间: fmtDT(a.modifiedAt), 实体类型: a.entityType, 字段: a.fieldName, 旧值: String(a.oldValue), 新值: String(a.newValue), 修改人: a.modifiedBy, 原因: a.reason, 关联运行: runs.find(r => r.id === a.relatedRunId)?.runName || '-' })), '审计追踪');
      if (contents.includes('comparison') && comparisonSummary) {
        addSheet(wb, [{ 项目: '总记录数', 数值: comparisonSummary.totalRecords }, { 项目: '差异记录数', 数值: comparisonSummary.diffRecords }, { 项目: '最大差异(°C)', 数值: comparisonSummary.maxDiff.toFixed(2) }, { 项目: '平均差异(°C)', 数值: comparisonSummary.avgDiff.toFixed(2) }, { 项目: '受影响批次', 数值: comparisonSummary.affectedBatches.join(', ') }], '对比分析汇总');
        addSheet(wb, comparisonSummary.details.map(d => ({ 批次: d.batchNo, 基准温度: d.oldTemp.toFixed(2), 当前温度: d.newTemp.toFixed(2), 差异值: d.diff.toFixed(2), 显著性: d.isSignificant ? '显著' : '正常' })), '对比明细');
        const paramChanges = auditTrails.filter(a => a.entityType === 'config' && a.relatedRunId === currentRunId);
        if (paramChanges.length > 0) addSheet(wb, paramChanges.map(a => ({ 参数: a.fieldName, 旧值: String(a.oldValue), 新值: String(a.newValue), 修改人: a.modifiedBy, 原因: a.reason })), '参数修改记录');
      }
      const fileName = `${templates.find(t => t.key === reportType)?.label}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success('Excel 报告导出成功');
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message);
    } finally { setLoading(false); }
  };

  const addText = (doc: jsPDF, text: string, x: number, y: number, size = 10, color: any = 0, align?: any) => {
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(text, x, y, align ? { align } : undefined);
  };

  const exportToPDF = () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      let y = 20;
      addText(doc, `${templates.find(t => t.key === reportType)?.label}`, pw / 2, y, 18, [22, 93, 255], 'center');
      y += 15;
      addText(doc, `生成时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, pw / 2, y, 10, 100, 'center');
      y += 15;
      addText(doc, '报告摘要', 20, y, 12);
      y += 10;
      doc.rect(20, y, pw - 40, 30);
      addText(doc, `总记录数: ${stats.totalRecords}`, 25, y + 8);
      addText(doc, `异常记录: ${stats.anomalyCount}`, 25, y + 16);
      addText(doc, `平均温度: ${stats.avgTemp.toFixed(2)}°C`, 25, y + 24);
      addText(doc, `审计记录: ${stats.auditCount}`, pw / 2, y + 8);
      if (currentRun) addText(doc, `当前运行: ${currentRun.runName}`, pw / 2, y + 16);
      if (baseRun) addText(doc, `基准运行: ${baseRun.runName}`, pw / 2, y + 24);
      y += 45;

      if (contents.includes('anomalyDetail') && anomalies.length > 0) {
        addText(doc, '异常列表', 20, y, 12);
        y += 8;
        anomalies.slice(0, 10).forEach((a, i) => {
          if (y > 270) { doc.addPage(); y = 20; }
          addText(doc, `${i + 1}. [${a.type}] ${a.description}`, 25, y, 9, a.isReviewed ? 0 : [255, 125, 0]);
          addText(doc, `   ${fmtD(a.detectedAt)} - ${a.isReviewed ? '已复核' : '待复核'}`, 25, y + 5, 9, 100);
          y += 12;
        });
        y += 5;
      }

      if (contents.includes('comparison') && comparisonSummary) {
        if (y > 240) { doc.addPage(); y = 20; }
        addText(doc, '对比分析', 20, y, 12);
        y += 8;
        addText(doc, `总记录数: ${comparisonSummary.totalRecords}`, 25, y);
        addText(doc, `差异记录数: ${comparisonSummary.diffRecords}`, 25, y + 6);
        addText(doc, `最大差异: ${comparisonSummary.maxDiff.toFixed(2)}°C`, 25, y + 12);
        addText(doc, `平均差异: ${comparisonSummary.avgDiff.toFixed(2)}°C`, 25, y + 18);
        addText(doc, `受影响批次: ${comparisonSummary.affectedBatches.join(', ')}`, 25, y + 24);
        y += 35;

        const sigDiffs = comparisonSummary.details.filter(d => d.isSignificant).slice(0, 5);
        if (sigDiffs.length > 0) {
          addText(doc, '显著差异记录', 20, y, 11, [245, 63, 63]);
          y += 6;
          sigDiffs.forEach((d, i) => {
            if (y > 270) { doc.addPage(); y = 20; }
            addText(doc, `${i + 1}. ${d.batchNo}: ${d.oldTemp.toFixed(2)}°C → ${d.newTemp.toFixed(2)}°C (${d.diff > 0 ? '+' : ''}${d.diff.toFixed(2)}°C)`, 25, y, 9, [245, 63, 63]);
            y += 6;
          });
        }
      }

      const fileName = `${templates.find(t => t.key === reportType)?.label}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`;
      doc.save(fileName);
      message.success('PDF 报告导出成功');
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message);
    } finally { setLoading(false); }
  };

  const handleExport = () => {
    if (!preview) { message.warning('请先生成预览'); return; }
    format === 'xlsx' ? exportToExcel() : exportToPDF();
  };

  const tabStyle = { '--ant-tabs-color': COLORS.text, '--ant-tabs-item-color': COLORS.textSecondary, '--ant-tabs-item-hover-color': COLORS.text, '--ant-tabs-item-active-color': COLORS.primary, '--ant-tabs-ink-bar-color': COLORS.primary } as React.CSSProperties;

  const previewItems = [
    { key: 'summary', label: '报告摘要', children: (
      <div className="space-y-4">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}><Card className="bg-slate-700/50 border-slate-600"><Statistic title={<span className="text-slate-400">总记录数</span>} value={stats.totalRecords} valueStyle={{ color: COLORS.text }} suffix="条" /></Card></Col>
          <Col xs={12} sm={6}><Card className="bg-slate-700/50 border-slate-600"><Statistic title={<span className="text-slate-400">异常记录</span>} value={stats.anomalyCount} valueStyle={{ color: '#FF7D00' }} suffix="条" /></Card></Col>
          <Col xs={12} sm={6}><Card className="bg-slate-700/50 border-slate-600"><Statistic title={<span className="text-slate-400">平均温度</span>} value={stats.avgTemp} precision={2} valueStyle={{ color: '#165DFF' }} suffix="°C" /></Card></Col>
          <Col xs={12} sm={6}><Card className="bg-slate-700/50 border-slate-600"><Statistic title={<span className="text-slate-400">审计记录</span>} value={stats.auditCount} valueStyle={{ color: '#00B42A' }} suffix="条" /></Card></Col>
        </Row>
        <Alert message="报告信息" description={`${templates.find(t => t.key === reportType)?.label} | ${format.toUpperCase()}格式 | 包含: ${contents.map(c => contOpts.find(o => o.value === c)?.label).join(', ')}`} type="info" showIcon className="bg-slate-800 border-slate-700" />
        {currentRun && <div className="text-slate-400 text-sm">当前运行: <span className="text-slate-200">{currentRun.runName}</span></div>}
        {baseRun && <div className="text-slate-400 text-sm">基准运行: <span className="text-slate-200">{baseRun.runName}</span></div>}
      </div>
    )},
    { key: 'anomalies', label: '异常预览', children: (
      <List dataSource={anomalies.slice(0, 5)} renderItem={item => (
        <List.Item className="border-b border-slate-700">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {item.isReviewed ? <CheckCircle2 size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-orange-500 animate-pulse" />}
              <div><p className="text-slate-200">{item.description}</p><p className="text-slate-500 text-xs">{dayjs(item.detectedAt).format('YYYY-MM-DD HH:mm')}</p></div>
            </div>
            <Tag color={item.isReviewed ? 'success' : 'warning'}>{item.level}</Tag>
          </div>
        </List.Item>
      )} />
    )},
  ];

  if (reportType === 'comparison') {
    previewItems.push({ key: 'comparison', label: '对比预览', children: (
      comparisonSummary ? (
        <div className="space-y-4">
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <h4 className="text-slate-200 font-medium mb-2">参数修改记录</h4>
            {auditTrails.filter(a => a.entityType === 'config' && a.relatedRunId === currentRunId).length > 0 ? (
              <List dataSource={auditTrails.filter(a => a.entityType === 'config' && a.relatedRunId === currentRunId).slice(0, 5)} renderItem={item => (
                <List.Item className="text-sm"><span className="text-slate-400">{item.fieldName}:</span><span className="text-slate-300 mx-2">{String(item.oldValue)}</span><span className="text-blue-400">→</span><span className="text-blue-400 mx-2">{String(item.newValue)}</span><span className="text-slate-500 text-xs">({item.modifiedBy})</span></List.Item>
              )} />
            ) : <p className="text-slate-500 text-sm">无参数修改记录</p>}
          </div>
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <h4 className="text-slate-200 font-medium mb-2">改动影响分析</h4>
            <p className="text-slate-400 text-sm">差异记录: <span className="text-orange-400">{comparisonSummary.diffRecords}</span> 条</p>
            <p className="text-slate-400 text-sm">最大差异: <span className="text-red-400">{comparisonSummary.maxDiff.toFixed(2)}°C</span></p>
            <p className="text-slate-400 text-sm">受影响批次: <span className="text-blue-400">{comparisonSummary.affectedBatches.join(', ')}</span></p>
          </div>
        </div>
      ) : <p className="text-slate-400 text-center py-8">请先选择基准运行和当前运行</p>
    )});
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2"><FileText size={18} className="text-blue-500" />报告模板选择</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.key} onClick={() => setReportType(t.key)} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${reportType === t.key ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
              <div className="flex items-center gap-3 mb-2"><span className={reportType === t.key ? 'text-blue-400' : 'text-slate-400'}>{t.icon}</span><span className={`font-medium ${reportType === t.key ? 'text-blue-400' : 'text-slate-200'}`}>{t.label}</span></div>
              <p className="text-slate-500 text-sm">{t.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2"><Download size={18} className="text-blue-500" />导出选项</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-slate-400 text-sm mb-2 block">导出格式</label>
            <RG value={format} onChange={e => setFormat(e.target.value)}>
              <Radio.Button value="xlsx"><FileSpreadsheet size={14} className="inline mr-1" />Excel</Radio.Button>
              <Radio.Button value="pdf"><FileText size={14} className="inline mr-1" />PDF</Radio.Button>
            </RG>
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-2 block flex items-center gap-1"><Calendar size={14} />时间范围</label>
            <RangePicker value={dateRange} onChange={v => setDateRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} showTime style={{ width: '100%' }} className="bg-slate-700" />
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-2 block">包含内容</label>
            <CG value={contents} onChange={v => setContents(v as CO[])} className="flex flex-wrap gap-3">
              {contOpts.map(opt => (
                <Checkbox key={opt.value} value={opt.value}><span className="flex items-center gap-1">{opt.icon}{opt.label}</span></Checkbox>
              ))}
            </CG>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800 border-slate-700" styles={{ body: { padding: 0 } }}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-slate-100 font-semibold flex items-center gap-2"><Eye size={18} className="text-blue-500" />报告预览</h3>
          <Space>
            <Button type="primary" icon={<Eye size={14} />} onClick={generatePreview} style={{ backgroundColor: '#165DFF' }}>生成预览</Button>
            <Button type="primary" icon={<Download size={14} />} onClick={handleExport} loading={loading} disabled={!preview} style={{ backgroundColor: '#00B42A' }}>下载报告</Button>
            <Button icon={<Printer size={14} />} onClick={() => { message.info('打印功能即将打开...'); window.print(); }} disabled={!preview}>打印报告</Button>
          </Space>
        </div>
        {preview ? (
          <Tabs defaultActiveKey="summary" items={previewItems} className="p-4" style={tabStyle} />
        ) : (
          <div className="p-12 text-center"><Eye size={48} className="mx-auto mb-3 text-slate-600" /><p className="text-slate-400">点击"生成预览"查看报告内容</p></div>
        )}
      </Card>
    </div>
  );
};

export default ReportExport;
