import React, { useRef, useState } from 'react';
import { ArrowLeft, Download, FileText, FileSpreadsheet, Image, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRideStore } from '@/store/useRideStore';
import { getPowerZoneInfo, generateResistanceBreakdown } from '@/utils/powerCalculator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Report: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { history, ftp } = useRideStore();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const record = history.find((r) => r.id === id);

  if (!record) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-dark-300 mb-2">报告不存在</h2>
          <p className="text-dark-500 mb-6">未找到对应的训练记录</p>
          <button onClick={() => navigate('/history')} className="btn-primary">
            返回历史记录
          </button>
        </div>
      </div>
    );
  }

  const zoneInfo = getPowerZoneInfo(record.result.power, ftp);
  const resistanceData = generateResistanceBreakdown(record.result);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0F172A',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`骑行功率报告_${new Date().toLocaleDateString('zh-CN')}.pdf`);
    } catch (e) {
      console.error('导出PDF失败:', e);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['项目', '数值', '单位'],
      ['功率', record.result.power, 'W'],
      ['功率区间', `Z${record.result.powerZone} ${zoneInfo.name}`, ''],
      ['功体比', record.result.powerPerKg, 'W/kg'],
      ['速度', record.result.speed, 'km/h'],
      ['齿比', record.result.gearRatio, ''],
      ['卡路里', record.result.calories, 'kcal'],
      ['牙盘齿数', record.input.chainringTeeth, 'T'],
      ['飞轮齿数', record.input.cogTeeth, 'T'],
      ['踏频', record.input.cadence, 'RPM'],
      ['坡度', record.input.slope, record.input.slopeUnit === 'percent' ? '%' : '°'],
      ['风速', record.input.windSpeed, 'm/s'],
      ['骑手体重', record.input.riderWeight, 'kg'],
      ['车重', record.input.bikeWeight, 'kg'],
      ['数据来源', record.input.source, ''],
      ['创建时间', formatDate(record.createdAt), ''],
    ];
    
    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `骑行功率数据_${new Date().toLocaleDateString('zh-CN')}.csv`;
    link.click();
  };

  const exportPNG = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0F172A',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `骑行功率报告_${new Date().toLocaleDateString('zh-CN')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('导出PNG失败:', e);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/history')}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">训练报告</h1>
                <p className="text-sm text-dark-400">{record.input.segmentName || '未命名路段'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                className="btn-secondary flex items-center gap-2"
                disabled={exporting}
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={exportPNG}
                className="btn-secondary flex items-center gap-2"
                disabled={exporting}
              >
                <Image className="w-4 h-4" />
                PNG
              </button>
              <button
                onClick={exportPDF}
                className="btn-primary flex items-center gap-2"
                disabled={exporting}
              >
                <Download className="w-4 h-4" />
                {exporting ? '导出中...' : '导出PDF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div ref={reportRef} className="max-w-4xl mx-auto">
          <div className="card mb-6">
            <div className="card-body text-center py-12">
              <h2 className="text-3xl font-bold mb-2">骑行功率分析报告</h2>
              <p className="text-dark-400">{formatDate(record.createdAt)}</p>
              <div
                className="inline-block mt-6 px-6 py-4 rounded-2xl"
                style={{ backgroundColor: `${zoneInfo.color}20` }}
              >
                <div
                  className="font-mono text-6xl font-bold"
                  style={{ color: zoneInfo.color }}
                >
                  {record.result.power} W
                </div>
                <div className="mt-2 text-lg" style={{ color: zoneInfo.color }}>
                  Z{record.result.powerZone} {zoneInfo.name}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="速度" value={`${record.result.speed} km/h`} />
            <StatCard label="齿比" value={record.result.gearRatio.toString()} />
            <StatCard label="功体比" value={`${record.result.powerPerKg} W/kg`} />
            <StatCard label="卡路里" value={`${record.result.calories} kcal`} />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">传动参数</h3>
              </div>
              <div className="card-body space-y-3">
                <DataRow label="牙盘齿数" value={`${record.input.chainringTeeth} T`} />
                <DataRow label="飞轮齿数" value={`${record.input.cogTeeth} T`} />
                <DataRow label="踏频" value={`${record.input.cadence} RPM`} />
                <DataRow label="齿比" value={record.result.gearRatio.toString()} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">骑手与车辆</h3>
              </div>
              <div className="card-body space-y-3">
                <DataRow label="骑手体重" value={`${record.input.riderWeight} kg`} />
                <DataRow label="车重" value={`${record.input.bikeWeight} kg`} />
                <DataRow label="FTP" value={`${ftp} W`} />
                <DataRow label="功体比" value={`${record.result.powerPerKg} W/kg`} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">环境条件</h3>
              </div>
              <div className="card-body space-y-3">
                <DataRow label="坡度" value={`${record.input.slope} ${record.input.slopeUnit === 'percent' ? '%' : '°'}`} />
                <DataRow label="风速" value={`${record.input.windSpeed} m/s`} />
                <DataRow label="风向" value={
                  record.input.windDirection === 'head' ? '逆风' :
                  record.input.windDirection === 'tail' ? '顺风' : '侧风'
                } />
                {record.input.temperature !== undefined && (
                  <DataRow label="温度" value={`${record.input.temperature} °C`} />
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">阻力分解</h3>
              </div>
              <div className="card-body space-y-3">
                {resistanceData.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-300">{item.name}</span>
                      <span className="font-mono">{item.value}W ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {record.validation.errors.length > 0 || record.validation.warnings.length > 0 ? (
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="font-semibold">数据异常</h3>
              </div>
              <div className="card-body space-y-2">
                {record.validation.errors.map((issue) => (
                  <div key={issue.id} className="p-3 bg-error-500/10 border border-error-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="badge-error">错误</span>
                      <span className="text-dark-200">{issue.message}</span>
                    </div>
                  </div>
                ))}
                {record.validation.warnings.map((issue) => (
                  <div key={issue.id} className="p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="badge-warning">警告</span>
                      <span className="text-dark-200">{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {record.input.notes && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">备注</h3>
              </div>
              <div className="card-body">
                <p className="text-dark-300">{record.input.notes}</p>
              </div>
            </div>
          )}

          <div className="text-center mt-8 text-dark-500 text-sm">
            <p>数据来源: {record.input.sourceNote || record.input.source}</p>
            <p className="mt-1">生成时间: {formatDate(Date.now())}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="card">
    <div className="card-body text-center">
      <p className="text-dark-400 text-sm mb-1">{label}</p>
      <p className="font-mono text-2xl font-bold text-dark-100">{value}</p>
    </div>
  </div>
);

const DataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-dark-400">{label}</span>
    <span className="font-mono text-dark-100">{value}</span>
  </div>
);

export default Report;
