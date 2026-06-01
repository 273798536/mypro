import React, { useState } from 'react';
import {
  Card,
  Checkbox,
  Button,
  Space,
  DatePicker,
  Radio,
  message,
  Progress,
  Collapse,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
} from 'antd';
import { Download, FileSpreadsheet, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../store';
import RiskTag from '../components/RiskTag';
import { exportFields } from '../data/mockData';

const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { Group: CheckboxGroup } = Checkbox;

const Export: React.FC = () => {
  const { alerts, getFilteredAlerts, addLog } = useAppStore();
  const [selectedFields, setSelectedFields] = useState<string[]>(exportFields.map(f => f.key));
  const [dateRange, setDateRange] = useState<any>(null);
  const [fileFormat, setFileFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [includeConflicts, setIncludeConflicts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const previewData = alerts.slice(0, 5);

  const handleExport = () => {
    if (selectedFields.length === 0) {
      message.error('请至少选择一个导出字段');
      return;
    }

    setExporting(true);
    setProgress(0);

    const data = includeConflicts ? alerts.filter(a => a.hasConflict) : getFilteredAlerts();

    const exportData = data.map(item => {
      const row: Record<string, any> = {};
      selectedFields.forEach(key => {
        const keys = key.split('.');
        let value: any = item;
        for (const k of keys) {
          value = value?.[k];
        }
        row[key] = value ?? '-';
      });
      return row;
    });

    const headerRow: Record<string, string> = {};
    selectedFields.forEach(key => {
      const field = exportFields.find(f => f.key === key);
      headerRow[key] = field?.label || key;
    });

    const finalData = [headerRow, ...exportData];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);

        const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: true });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '续费预警数据');

        const fileName = `续费预警数据_${new Date().toISOString().slice(0, 10)}.${fileFormat}`;
        XLSX.writeFile(wb, fileName);

        addLog({
          operator: '教务管理员',
          action: '导出数据清单',
          targetId: 'export',
          targetType: 'system',
        });

        message.success(`导出成功：${fileName}`);
        setExporting(false);
        setProgress(0);
      }
    }, 200);
  };

  const stats = {
    total: alerts.length,
    withConflict: alerts.filter(a => a.hasConflict).length,
    highRisk: alerts.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length,
    pending: alerts.filter(a => a.processStatus === 'pending').length,
  };

  const previewColumns = selectedFields.map(key => {
    const field = exportFields.find(f => f.key === key);
    return {
      title: field?.label || key,
      dataIndex: key,
      key,
      render: key === 'riskLevel' ? (level: string) => <RiskTag level={level as any} /> : (value: any) => value,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">导出中心</h2>
        <p className="text-gray-500">配置导出选项，下载续费预警数据清单，口径与日常处理保持一致</p>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card className="hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <FileSpreadsheet size={16} /> 总记录数
                </span>
              }
              value={stats.total}
              suffix="条"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-red-500">
                  <AlertTriangle size={16} /> 高风险
                </span>
              }
              value={stats.highRisk}
              suffix="条"
              valueStyle={{ color: '#EF4444' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-orange-500">
                  <AlertTriangle size={16} /> 数据冲突
                </span>
              }
              value={stats.withConflict}
              suffix="条"
              valueStyle={{ color: '#F97316' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="hover:shadow-md transition-shadow">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-gray-600">
                  <FileText size={16} /> 待处理
                </span>
              }
              value={stats.pending}
              suffix="条"
              valueStyle={{ color: '#F59E0B' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="导出配置">
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">选择导出字段</h4>
            <CheckboxGroup
              value={selectedFields}
              onChange={(values) => setSelectedFields(values as string[])}
            >
              <Space wrap>
                {exportFields.map(field => (
                  <Checkbox key={field.key} value={field.key}>
                    {field.label}
                  </Checkbox>
                ))}
              </Space>
            </CheckboxGroup>
          </div>

          <div>
            <h4 className="font-medium mb-3">时间范围（可选）</h4>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 300 }}
            />
          </div>

          <div>
            <h4 className="font-medium mb-3">文件格式</h4>
            <Radio.Group
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value)}
            >
              <Radio value="xlsx">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} />
                  Excel (.xlsx)
                </div>
              </Radio>
              <Radio value="csv">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  CSV (.csv)
                </div>
              </Radio>
            </Radio.Group>
          </div>

          <div>
            <Checkbox
              checked={includeConflicts}
              onChange={(e) => setIncludeConflicts(e.target.checked)}
            >
              仅导出存在数据冲突的记录
            </Checkbox>
          </div>

          {exporting && (
            <div>
              <h4 className="font-medium mb-3">导出进度</h4>
              <Progress percent={progress} status="active" />
            </div>
          )}

          <div>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<Download size={18} />}
                onClick={handleExport}
                loading={exporting}
                disabled={selectedFields.length === 0}
              >
                开始导出
              </Button>
              <Button
                onClick={() => {
                  setSelectedFields(exportFields.map(f => f.key));
                  setDateRange(null);
                  setFileFormat('xlsx');
                  setIncludeConflicts(false);
                }}
              >
                重置配置
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      <Card title="数据预览（前5条）">
        <Table
          columns={previewColumns}
          dataSource={previewData}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="口径说明">
        <Collapse ghost>
          <Panel
            header={
              <span className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                续费预测算法
              </span>
            }
            key="1"
          >
            <div className="space-y-2 text-gray-600">
              <p><strong>计算公式：</strong></p>
              <code className="block bg-gray-100 p-3 rounded text-sm">
                续费概率 = 基础分 + 课时消耗分 + 测评分 + 出勤分
                <br />基础分 = 60
                <br />课时消耗分 = (剩余课时 / 总课时) × 20 - 10
                <br />测评分 = (最近测评分数 / 100) × 15
                <br />出勤分 = (实际出勤 / 应出勤) × 15
              </code>
              <p><strong>风险等级判定：</strong></p>
              <ul className="list-disc list-inside">
                <li><Tag color="error">极高风险</Tag>：概率 &lt; 40 且 剩余课时 &lt; 5</li>
                <li><Tag color="orange">高风险</Tag>：概率 &lt; 50</li>
                <li><Tag color="warning">中风险</Tag>：50 ≤ 概率 &lt; 70</li>
                <li><Tag color="success">低风险</Tag>：概率 ≥ 70</li>
              </ul>
            </div>
          </Panel>
          <Panel
            header={
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                异常判定规则
              </span>
            }
            key="2"
          >
            <div className="space-y-2 text-gray-600">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>测评缺失</strong>：超过应测评日期7天未测评</li>
                <li><strong>请假补课同时出现</strong>：请假单未完成补课安排</li>
                <li><strong>课包冻结延迟</strong>：冻结开始日期超过3天未录入系统</li>
                <li><strong>数据冲突</strong>：档案、课包、请假三者数据不一致</li>
              </ul>
            </div>
          </Panel>
          <Panel
            header={
              <span className="flex items-center gap-2">
                <CheckCircle size={16} className="text-blue-500" />
                冲突优先级规则
              </span>
            }
            key="3"
          >
            <div className="space-y-2 text-gray-600">
              <ol className="list-decimal list-inside space-y-1">
                <li>优先保留最新录入的数据</li>
                <li>测评记录优先级 &gt; 课包记录 &gt; 请假单</li>
                <li>所有冲突必须留痕，记录处理人、时间、决策理由</li>
              </ol>
            </div>
          </Panel>
          <Panel
            header={
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-green-500" />
                数据来源说明
              </span>
            }
            key="4"
          >
            <div className="space-y-2 text-gray-600">
              <p>导出清单与日常处理使用同一数据源，包括：</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>学生档案</strong>：基本信息、联系方式、学习进度</li>
                <li><strong>课包记录</strong>：购包时间、剩余课时、冻结记录</li>
                <li><strong>请假单</strong>：请假日期、原因、补课安排</li>
                <li><strong>测评记录</strong>：测评日期、分数、评语</li>
              </ul>
              <p className="text-sm text-orange-500 mt-2">
                注意：如果测评结果晚半天才补录，续费预测会重新计算，历史记录可在「历史追踪」中查看变更前后对比。
              </p>
            </div>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default Export;
