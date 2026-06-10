import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Tabs,
  Button,
  Upload,
  Input,
  Space,
  Alert,
  Tag,
  Row,
  Col,
  Divider,
  message,
  List,
  Descriptions,
} from 'antd';
import {
  UploadOutlined,
  RocketOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { recordsApi, ProcessingRecord, STATUS_LABEL, STATUS_COLOR } from '../api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function ImportPage() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState('配方工程师-' + (Math.random().toString(36).slice(2, 6)));
  const [sampleLoading, setSampleLoading] = useState(false);
  const [latestRecords, setLatestRecords] = useState<ProcessingRecord[]>([]);

  useEffect(() => { loadLatest(); }, []);

  const loadLatest = async () => {
    try {
      const res = await recordsApi.list({ limit: 5 });
      setLatestRecords(res.items);
    } catch (e) { /* ignore */ }
  };

  const handleCreateSample = async () => {
    setSampleLoading(true);
    try {
      const r = await recordsApi.fromSample();
      message.success(
        `已一键创建贴近日常的样例记录！批次=${r.batch_no}，已检测到 ` +
        [r.has_temp_unit_mix && '温度单位混用',
         r.has_peak_overlap && '谱峰重叠',
         r.has_weighing_issue && '称量精度不足',
         r.missing_unit_fields?.length && '漏填单位']
          .filter(Boolean)
          .join(' / ') + ' 等问题，可直接进入复核',
        6,
      );
      setTimeout(() => navigate(`/review/${r.id}`), 1200);
    } finally {
      setSampleLoading(false);
      loadLatest();
    }
  };

  const beforeUploadExcel = async (file: File) => {
    try {
      const res = await recordsApi.importExcel(file, operator);
      if (!res.success) {
        message.error('导入失败：' + (res.errors?.join('；') || '未知错误'));
        return false;
      }
      let msg = `✅ 导入成功：记录号=${res.record_no}`;
      const parts: string[] = [];
      if (res.temp_unit_issues?.length) parts.push(`温度混用${res.temp_unit_issues.length}项`);
      if (res.missing_units?.length) parts.push(`漏填单位${res.missing_units.length}项`);
      if (parts.length) msg += `，检测到${parts.join(' / ')}`;
      if (res.warnings?.length) msg += `，警告${res.warnings.length}条`;
      message.success(msg, 5);
      setTimeout(() => navigate(`/review/${res.record_id}`), 1000);
      loadLatest();
    } catch (err: any) {
      message.error('导入异常：' + (err.response?.data?.detail || err.message));
    }
    return false; // 阻止默认上传
  };

  return (
    <>
      <Row gutter={16}>
        <Col span={14}>
          <Card className="section-card" title={<span><FileTextOutlined /> 选择导入方式</span>}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="日常真实场景样例已内置"
              description="点击「一键创建贴近日常的样例」即可体验：旧表多温度单位(K/℃/°F)、pH漏填单位、ONPG称量0.3mg不足、产物/杂质中度峰重叠、补录备注等所有验收场景。"
            />
            <Tabs
              items={[
                {
                  key: 'sample',
                  label: '⭐ 一键创建样例（推荐先试）',
                  children: (
                    <>
                      <Paragraph>
                        <Text strong>场景内容：</Text>
                      </Paragraph>
                      <List
                        size="small"
                        dataSource={[
                          '旧表遗留格式：反应温度同时存在 310.15K（开尔文）/ 37℃ / 41°F 三种单位',
                          'pH 7.4 漏填单位，系统自动标注高亮',
                          'ONPG 底物仅称 0.3mg（微量级，常规天平误差>10%），生成普通话精度解释',
                          '邻硝基苯酚产物峰与杂质X RT=6.02/6.12 中度重叠，与判读绑定',
                          '安全备注、补录说明、处理意见放在同一轮复核',
                          '所有数据共用一条处理记录，浓度换算与谱图判读不脱节',
                        ]}
                        renderItem={(it) => <List.Item icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}>{it}</List.Item>}
                      />
                      <Divider />
                      <Space>
                        <Button
                          type="primary"
                          size="large"
                          icon={<RocketOutlined />}
                          loading={sampleLoading}
                          onClick={handleCreateSample}
                        >
                          一键创建样例并进入复核
                        </Button>
                        <Input
                          prefix="操作人："
                          value={operator}
                          onChange={(e) => setOperator(e.target.value)}
                          style={{ width: 260 }}
                        />
                      </Space>
                    </>
                  ),
                },
                {
                  key: 'excel',
                  label: <span><FileExcelOutlined /> 上传旧Excel表</span>,
                  children: (
                    <>
                      <Paragraph>
                        上传配方工程师手上遗留的旧版Excel，表头含「条件/底物/峰」等关键词即可自动识别。
                        表头不规范也会尽量匹配，并把漏填单位、混用单位标红。
                      </Paragraph>
                      <Alert
                        style={{ marginBottom: 16 }}
                        type="warning"
                        showIcon
                        message="导入后可在复核页面补录备注"
                        description="旧表常漏字段、换班交接缺备注，支持在复核页面追加 safety_note / supplementary_note 一起放流程里。"
                      />
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Input
                          prefix="导入人："
                          value={operator}
                          onChange={(e) => setOperator(e.target.value)}
                          style={{ width: 300 }}
                        />
                        <Upload.Dragger
                          accept=".xlsx,.xls"
                          multiple={false}
                          beforeUpload={beforeUploadExcel}
                          maxCount={1}
                        >
                          <p className="ant-upload-drag-icon">
                            <UploadOutlined />
                          </p>
                          <p className="ant-upload-text">点击或拖拽旧版 Excel 文件到此处</p>
                          <p className="ant-upload-hint">
                            支持 .xlsx/.xls，建议含「批次号/物料/反应条件表/底物换算表/谱峰表」等工作表
                          </p>
                        </Upload.Dragger>
                      </Space>
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col span={10}>
          <Card className="section-card" title={<span>📋 最近导入的记录</span>} extra={<Button size="small" onClick={loadLatest}>刷新</Button>}>
            {latestRecords.length === 0 && (
              <EmptyHint />
            )}
            {latestRecords.map((r) => (
              <Card
                key={r.id}
                size="small"
                style={{ marginBottom: 10 }}
                type="inner"
                title={<Text strong>{r.material_name}</Text>}
                extra={<Tag color={STATUS_COLOR[r.status] as any}>{STATUS_LABEL[r.status]}</Tag>}
              >
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="批次">{r.batch_no}</Descriptions.Item>
                  <Descriptions.Item label="记录号"><Text copyable>{r.record_no}</Text></Descriptions.Item>
                  <Descriptions.Item label="问题标签">
                    <Space size={4} wrap>
                      {r.has_temp_unit_mix && <Tag color="orange">温度混用</Tag>}
                      {r.has_peak_overlap && <Tag color="red">峰重叠</Tag>}
                      {r.has_weighing_issue && <Tag color="purple">称量不足</Tag>}
                      {!!r.missing_unit_fields?.length && <Tag color="gold">漏填单位</Tag>}
                      {!r.has_temp_unit_mix && !r.has_peak_overlap && !r.has_weighing_issue && !r.missing_unit_fields?.length && <Tag>无异常</Tag>}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
                <Space style={{ marginTop: 8 }}>
                  <Button size="small" type="primary" onClick={() => navigate(`/review/${r.id}`)}>去复核</Button>
                  <Button size="small" onClick={() => navigate(`/record/${r.id}`)}>查看详情</Button>
                  <Button size="small" onClick={() => navigate(`/report/${r.id}`)}>报告</Button>
                </Space>
              </Card>
            ))}
          </Card>
        </Col>
      </Row>
    </>
  );
}

function EmptyHint() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
      <Title level={5}>暂无导入记录</Title>
      <Paragraph>
        点击左侧的 <Tag color="blue">一键创建样例</Tag> 即可开始体验，
        或上传旧Excel。所有数据保存于 SQLite，重启服务也不会丢失。
      </Paragraph>
    </div>
  );
}
