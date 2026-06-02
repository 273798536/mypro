import { useState } from 'react';
import { Button, Card, Upload, Progress, Tag, Tooltip, Row, Col, Statistic, Divider, message, Alert } from 'antd';
import { UploadOutlined, PlayCircleOutlined, ReloadOutlined, InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { UploadProps } from 'antd';
import { useAppStore } from '../store/appStore';
import { generateMockCurveData, diagnoseCurve, calculateHash, generateId, parseIVCurveCSV, parseIVCurveJSON, verifyDiagnosisConsistency } from '../utils/diagnosis';
import type { IVCurveData, DiagnosisResult } from '../types';

const parameterLabels: Record<string, string> = {
  voc: '开路电压(Voc)',
  isc: '短路电流(Isc)',
  vm: '最大功率点电压(Vm)',
  im: '最大功率点电流(Im)',
  ff: '填充因子(FF)',
  rs: '串联电阻(Rs)',
  rsh: '并联电阻(Rsh)',
};

const parameterUnits: Record<string, string> = {
  voc: 'V',
  isc: 'A',
  vm: 'V',
  im: 'A',
  ff: '',
  rs: 'Ω',
  rsh: 'Ω',
};

export default function DiagnosisPage() {
  const { curves, addCurve, selectedCurve, setSelectedCurve, addDiagnosis, diagnoses, setSelectedDiagnosis } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [reverifyResult, setReverifyResult] = useState<{ isConsistent: boolean; differences: string[] } | null>(null);

  const handleGenerateMock = () => {
    const curve = generateMockCurveData();
    addCurve(curve);
    setSelectedCurve(curve);
    setDiagnosisResult(null);
    setReverifyResult(null);
    message.success('已生成模拟IV曲线数据');
  };

  const handleFileUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const text = await (file as File).text();
      const fileName = (file as File).name.toLowerCase();
      
      let parsedData: Partial<IVCurveData> | null = null;
      
      if (fileName.endsWith('.csv')) {
        parsedData = parseIVCurveCSV(text);
      } else if (fileName.endsWith('.json')) {
        parsedData = parseIVCurveJSON(text);
      }
      
      if (!parsedData || !parsedData.voltage || !parsedData.current) {
        message.error('文件解析失败，请检查文件格式');
        onError?.(new Error('解析失败'));
        return;
      }
      
      const data = {
        voltage: parsedData.voltage,
        current: parsedData.current,
        temperature: parsedData.temperature || 25,
        irradiance: parsedData.irradiance || 1000,
      };
      
      const curve: IVCurveData = {
        id: generateId(),
        serialNumber: `SN-${Date.now().toString().slice(-6)}`,
        ...data,
        timestamp: Date.now(),
        hash: calculateHash(data),
      };
      
      addCurve(curve);
      setSelectedCurve(curve);
      setDiagnosisResult(null);
      setReverifyResult(null);
      message.success(`已导入IV曲线数据，共 ${data.voltage.length} 个数据点`);
      onSuccess?.(file);
    } catch (error) {
      console.error('文件上传失败:', error);
      message.error('文件上传失败');
      onError?.(error as Error);
    }
  };

  const handleDiagnose = () => {
    if (!selectedCurve) return;
    
    setLoading(true);
    setReverifyResult(null);
    
    setTimeout(() => {
      const result = diagnoseCurve(selectedCurve);
      const diagnosis: DiagnosisResult = {
        id: generateId(),
        curveId: selectedCurve.id,
        inputHash: selectedCurve.hash,
        outputHash: result.outputHash,
        parameters: result.parameters,
        abnormalities: result.abnormalities,
        traceNodes: result.traceNodes,
        faultLevel: result.faultLevel,
        createdAt: Date.now(),
      };
      addDiagnosis(diagnosis);
      setDiagnosisResult(diagnosis);
      setSelectedDiagnosis(diagnosis);
      setLoading(false);
      message.success('诊断完成');
    }, 1500);
  };

  const handleReDiagnose = () => {
    if (!selectedCurve || !diagnosisResult) return;
    
    setLoading(true);
    
    setTimeout(() => {
      const result = diagnoseCurve(selectedCurve);
      const newDiagnosis: DiagnosisResult = {
        id: generateId(),
        curveId: selectedCurve.id,
        inputHash: selectedCurve.hash,
        outputHash: result.outputHash,
        parameters: result.parameters,
        abnormalities: result.abnormalities,
        traceNodes: result.traceNodes,
        faultLevel: result.faultLevel,
        createdAt: Date.now(),
      };
      
      const consistency = verifyDiagnosisConsistency(diagnosisResult, newDiagnosis);
      
      setReverifyResult(consistency);
      
      if (consistency.isConsistent) {
        message.success('复算验证通过：输入输出完全一致');
      } else {
        message.warning(`复算发现 ${consistency.differences.length} 处差异`);
      }
      
      setLoading(false);
    }, 1500);
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.csv,.json',
    showUploadList: false,
    customRequest: handleFileUpload,
  };

  const getCurveChartOption = () => {
    if (!selectedCurve) {
      return { 
        title: { text: '请选择或上传IV曲线数据', left: 'center', top: 'center' },
        xAxis: { type: 'value' },
        yAxis: { type: 'value' },
        series: []
      };
    }
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          return `电压: ${params[0].value[0].toFixed(2)}V<br/>电流: ${params[0].value[1].toFixed(3)}A`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '电压(V)',
        min: 0,
      },
      yAxis: {
        type: 'value',
        name: '电流(A)',
        min: 0,
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#165DFF' },
          lineStyle: { width: 2 },
          data: selectedCurve.voltage.map((v, i) => [v, selectedCurve.current[i]]),
        },
      ],
    };
  };

  const getFaultLevelColor = (level: string) => {
    switch (level) {
      case 'normal': return '#00B42A';
      case 'warning': return '#FF7D00';
      case 'error': return '#F53F3F';
      default: return '#86909C';
    }
  };

  const getFaultLevelText = (level: string) => {
    switch (level) {
      case 'normal': return '正常';
      case 'warning': return '预警';
      case 'error': return '故障';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">诊断工作台</h1>
        <div className="flex gap-3">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>上传IV曲线文件</Button>
          </Upload>
          <Button onClick={handleGenerateMock}>生成模拟数据</Button>
        </div>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="IV曲线列表" size="small" className="h-64 overflow-auto">
            {curves.length === 0 ? (
              <div className="text-center text-gray-400 py-8">暂无曲线数据</div>
            ) : (
              <div className="space-y-2">
                {curves.map((curve) => (
                  <div
                    key={curve.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedCurve?.id === curve.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedCurve(curve);
                      setDiagnosisResult(null);
                      setReverifyResult(null);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{curve.serialNumber}</span>
                      <Tag color="blue">{curve.hash}</Tag>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(curve.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col span={16}>
          <Card title="IV曲线图" size="small">
            <ReactECharts option={getCurveChartOption()} style={{ height: '200px' }} />
            {selectedCurve && (
              <div className="flex gap-8 mt-4 pt-4 border-t">
                <div>
                  <span className="text-gray-500">温度:</span>
                  <span className="ml-2 font-medium">{selectedCurve.temperature.toFixed(1)}°C</span>
                </div>
                <div>
                  <span className="text-gray-500">辐照度:</span>
                  <span className="ml-2 font-medium">{selectedCurve.irradiance.toFixed(0)}W/m²</span>
                </div>
                <div>
                  <span className="text-gray-500">数据点:</span>
                  <span className="ml-2 font-medium">{selectedCurve.voltage.length}个</span>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="诊断执行"
        size="small"
        extra={
          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleDiagnose}
              loading={loading}
              disabled={!selectedCurve || diagnosisResult !== null}
            >
              执行诊断
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReDiagnose}
              loading={loading}
              disabled={!selectedCurve || !diagnosisResult}
            >
              复算验证
            </Button>
          </div>
        }
      >
        {loading && (
          <div className="py-8">
            <Progress percent={100} status="active" showInfo={false} />
            <div className="text-center text-gray-500 mt-2">正在执行诊断计算...</div>
          </div>
        )}

        {reverifyResult && (
          <Alert
            message={reverifyResult.isConsistent ? '复算验证通过' : '复算发现差异'}
            description={
              reverifyResult.isConsistent
                ? '输入数据和输出结果完全一致，诊断可复算性验证通过'
                : `发现 ${reverifyResult.differences.length} 处差异: ${reverifyResult.differences.join('; ')}`
            }
            type={reverifyResult.isConsistent ? 'success' : 'warning'}
            showIcon
            icon={reverifyResult.isConsistent ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            className="mb-4"
          />
        )}

        {diagnosisResult && !loading && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">诊断结果:</span>
              <Tag color={getFaultLevelColor(diagnosisResult.faultLevel)}>
                {getFaultLevelText(diagnosisResult.faultLevel)}
              </Tag>
              <span className="text-gray-400 text-sm">
                输入校验哈希: {diagnosisResult.inputHash}
              </span>
              <span className="text-gray-400 text-sm">
                输出校验哈希: {diagnosisResult.outputHash}
              </span>
            </div>

            <Divider orientation="left">特征参数</Divider>
            <Row gutter={[16, 16]}>
              {Object.entries(diagnosisResult.parameters).map(([key, value]) => {
                const abnormality = diagnosisResult.abnormalities.find(
                  (a) => a.parameter === key
                );
                return (
                  <Col span={6} key={key}>
                    <Card size="small" className={abnormality ? 'border-orange-300' : ''}>
                      <Statistic
                        title={
                          <div className="flex items-center gap-1">
                            {parameterLabels[key]}
                            {abnormality && (
                              <Tooltip title={abnormality.explanation}>
                                <InfoCircleOutlined
                                  style={{ color: abnormality.severity === 'error' ? '#F53F3F' : '#FF7D00' }}
                                />
                              </Tooltip>
                            )}
                          </div>
                        }
                        value={value}
                        suffix={parameterUnits[key]}
                        valueStyle={{
                          color: abnormality
                            ? abnormality.severity === 'error'
                              ? '#F53F3F'
                              : '#FF7D00'
                            : '#165DFF',
                          fontSize: '18px',
                        }}
                      />
                      {abnormality && (
                        <div className="text-xs mt-2 text-orange-600">
                          ⚠️ {abnormality.description}
                        </div>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {diagnosisResult.abnormalities.length > 0 && (
              <>
                <Divider orientation="left">异常参数解释</Divider>
                <div className="space-y-3">
                  {diagnosisResult.abnormalities.map((abnorm) => (
                    <div
                      key={abnorm.id}
                      className={`p-4 rounded-lg ${
                        abnorm.severity === 'error' ? 'bg-red-50' : 'bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Tag color={abnorm.severity === 'error' ? 'red' : 'orange'}>
                          {abnorm.severity === 'error' ? '严重' : '警告'}
                        </Tag>
                        <span className="font-medium">{abnorm.description}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">参数:</span> {parameterLabels[abnorm.parameter]}
                        <span className="mx-3">|</span>
                        <span className="text-gray-500">当前值:</span> {abnorm.value.toFixed(4)}
                        <span className="mx-3">|</span>
                        <span className="text-gray-500">阈值:</span> {abnorm.threshold}
                      </div>
                      <div className="text-sm text-gray-700 mt-2 leading-relaxed">
                        <span className="text-gray-500">解释:</span> {abnorm.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!diagnosisResult && !loading && !selectedCurve && (
          <div className="text-center text-gray-400 py-12">
            请先上传或选择IV曲线数据，然后执行诊断
          </div>
        )}

        {!diagnosisResult && !loading && selectedCurve && (
          <div className="text-center text-gray-400 py-12">
            点击"执行诊断"按钮开始分析
          </div>
        )}
      </Card>
    </div>
  );
}
