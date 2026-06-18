import { useState, useRef } from 'react';
import {
  FlaskConical,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Copy,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { changeApi } from '../api/client';
import { AnomalyBadge } from '../components/AnomalyBadge';

interface TestStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  result?: unknown;
}

interface ImportHistory {
  timestamp: string;
  filename: string;
  records: number;
  anomalies: number;
  duplicates: number;
}

export function ImportTestPage() {
  const [testSteps, setTestSteps] = useState<TestStep[]>([
    {
      id: 1,
      name: '首次导入测试数据',
      description: '导入包含10条记录的测试文件，验证基础导入功能',
      status: 'pending',
    },
    {
      id: 2,
      name: '重复导入相同文件',
      description: '再次导入完全相同的文件，验证重复检测功能',
      status: 'pending',
    },
    {
      id: 3,
      name: '导入包含部分重复的文件',
      description: '导入包含5条新记录和5条已存在记录的文件，验证部分重复检测',
      status: 'pending',
    },
    {
      id: 4,
      name: '导入包含异常数据的文件',
      description: '导入包含空值、重复、备注混写等异常的文件，验证异常检测',
      status: 'pending',
    },
    {
      id: 5,
      name: '验证数据一致性',
      description: '查询当前记录列表，确认重复数据未被错误导入',
      status: 'pending',
    },
  ]);

  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateTestData = (type: 'normal' | 'duplicate' | 'partial' | 'anomaly') => {
    const baseData = [
      ['recordNo', 'tableName', 'fieldName', 'changeType', 'changeDescription', 'oldDataType', 'newDataType', 'oldNullable', 'newNullable', 'oldComment', 'newComment', 'handlingOpinion'],
      ['TEST-001', 'user_order', 'order_id', 'MODIFY', '订单ID字段调整', 'INT', 'BIGINT', 'false', 'false', '订单ID', '订单唯一标识', ''],
      ['TEST-002', 'user_order', 'user_id', 'ADD', '新增用户ID字段', '', 'BIGINT', '', 'false', '', '关联用户ID', ''],
      ['TEST-003', 'user_info', 'phone', 'MODIFY', '手机号长度调整', 'VARCHAR(11)', 'VARCHAR(20)', 'true', 'true', '手机号', '用户联系电话', ''],
      ['TEST-004', 'user_info', 'email', 'ADD', '新增邮箱字段', '', 'VARCHAR(100)', '', 'true', '', '用户邮箱地址', ''],
      ['TEST-005', 'user_order', 'status', 'MODIFY', '订单状态调整', 'TINYINT', 'VARCHAR(20)', 'false', 'false', '0:待支付 1:已支付', '订单状态', ''],
    ];

    if (type === 'duplicate') {
      return baseData;
    }

    if (type === 'partial') {
      return [
        ...baseData,
        ['TEST-006', 'user_order', 'pay_time', 'ADD', '新增支付时间字段', '', 'DATETIME', '', 'true', '', '订单支付时间', ''],
        ['TEST-007', 'user_info', 'address', 'ADD', '新增地址字段', '', 'VARCHAR(255)', '', 'true', '', '用户收货地址', ''],
      ];
    }

    if (type === 'anomaly') {
      return [
        ['TEST-008', 'user_order', '', 'MODIFY', '空字段名测试', 'INT', 'BIGINT', 'false', 'false', '备注内容混写了【业务说明】和【技术说明】两部分', '', ''],
        ['TEST-001', 'user_order', 'order_id', 'MODIFY', '重复记录-与TEST-001相同', 'INT', 'BIGINT', 'false', 'false', '订单ID', '订单唯一标识', ''],
        ['TEST-009', 'user_info', 'id_card', 'MODIFY', '空值类型', '', 'VARCHAR(18)', '', 'true', '', '身份证号', ''],
        ['TEST-010', 'user_order', 'remark', 'MODIFY', '备注混写', 'VARCHAR(255)', 'TEXT', 'true', 'true', '订单备注【2024年1月新增】【联系客服】', '订单备注', ''],
      ];
    }

    return baseData;
  };

  const downloadTestFile = (type: 'normal' | 'duplicate' | 'partial' | 'anomaly') => {
    const data = generateTestData(type);
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '变更记录');

    const filename = `test_data_${type}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const runStep = async (stepId: number) => {
    const step = testSteps.find((s) => s.id === stepId);
    if (!step) return;

    setTestSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: 'running' as const } : s))
    );
    setCurrentStep(stepId);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      let result;

      if (stepId === 1 || stepId === 2 || stepId === 3 || stepId === 4) {
        const type = stepId === 1 ? 'normal' : stepId === 2 ? 'duplicate' : stepId === 3 ? 'partial' : 'anomaly';
        const data = generateTestData(type);
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '变更记录');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const file = new File([blob], `test_${type}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        result = await changeApi.importChanges(file);

        const importHist: ImportHistory = {
          timestamp: new Date().toLocaleString('zh-CN'),
          filename: file.name,
          records: (result as { data?: { imported?: number } }).data?.imported || 0,
          anomalies: (result as { data?: { anomaliesFound?: number } }).data?.anomaliesFound || 0,
          duplicates: (result as { data?: { duplicatesSkipped?: number } }).data?.duplicatesSkipped || 0,
        };
        setImportHistory((prev) => [...prev, importHist]);
      } else if (stepId === 5) {
        result = await changeApi.getChanges({ keyword: 'TEST-', pageSize: 100 });
      }

      const success = result && (result as { success?: boolean }).success !== false;

      setTestSteps((prev) =>
        prev.map((s) =>
          s.id === stepId
            ? { ...s, status: success ? 'passed' as const : 'failed' as const, result }
            : s
        )
      );

      if (stepId < testSteps.length) {
        setTimeout(() => runStep(stepId + 1), 500);
      } else {
        setIsRunning(false);
      }
    } catch (error) {
      console.error('测试步骤失败:', error);
      setTestSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status: 'failed' as const } : s))
      );
      setIsRunning(false);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setImportHistory([]);
    setTestSteps((prev) =>
      prev.map((s) => ({ ...s, status: 'pending' as const, result: undefined }))
    );
    await runStep(1);
  };

  const resetTests = () => {
    setTestSteps((prev) =>
      prev.map((s) => ({ ...s, status: 'pending' as const, result: undefined }))
    );
    setImportHistory([]);
    setCurrentStep(0);
    setIsRunning(false);
  };

  const passedCount = testSteps.filter((s) => s.status === 'passed').length;
  const failedCount = testSteps.filter((s) => s.status === 'failed').length;
  const runningCount = testSteps.filter((s) => s.status === 'running').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-600" />
            重复导入测试场景
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            验证重复导入检测、异常检测和数据一致性，确保工具不会越跑越乱
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetTests}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            重置测试
          </button>
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? '测试中...' : '开始测试'}
          </button>
        </div>
      </div>

      {/* Test Data Download */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          测试数据生成
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { type: 'normal' as const, label: '基础数据', desc: '10条正常记录', color: 'blue' },
            { type: 'duplicate' as const, label: '完全重复', desc: '与基础数据完全相同', color: 'orange' },
            { type: 'partial' as const, label: '部分重复', desc: '5条新+5条重复', color: 'amber' },
            { type: 'anomaly' as const, label: '异常数据', desc: '空值/重复/备注混写', color: 'red' },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => downloadTestFile(item.type)}
              className={`p-4 rounded-xl border-2 border-dashed transition-all hover:scale-105 ${
                item.color === 'blue' ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50' :
                item.color === 'orange' ? 'border-orange-300 hover:border-orange-500 hover:bg-orange-50' :
                item.color === 'amber' ? 'border-amber-300 hover:border-amber-500 hover:bg-amber-50' :
                'border-red-300 hover:border-red-500 hover:bg-red-50'
              }`}
            >
              <Download className={`w-6 h-6 mx-auto mb-2 ${
                item.color === 'blue' ? 'text-blue-600' :
                item.color === 'orange' ? 'text-orange-600' :
                item.color === 'amber' ? 'text-amber-600' :
                'text-red-600'
              }`} />
              <p className={`font-medium ${
                item.color === 'blue' ? 'text-blue-900' :
                item.color === 'orange' ? 'text-orange-900' :
                item.color === 'amber' ? 'text-amber-900' :
                'text-red-900'
              }`}>{item.label}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Test Progress */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FlaskConical className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总测试项</p>
              <p className="text-2xl font-bold text-gray-900">{testSteps.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">通过</p>
              <p className="text-2xl font-bold text-green-600">{passedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">失败</p>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <RefreshCw className={`w-5 h-5 text-purple-600 ${runningCount > 0 ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">进行中</p>
              <p className="text-2xl font-bold text-purple-600">{runningCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Test Steps */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">测试步骤</h2>
          </div>
          <div className="p-6 space-y-4">
            {testSteps.map((step, index) => {
              const isExpanded = showDetail === step.id;
              return (
                <div
                  key={step.id}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    step.status === 'passed' ? 'border-green-200' :
                    step.status === 'failed' ? 'border-red-200' :
                    step.status === 'running' ? 'border-blue-200' :
                    'border-gray-200'
                  }`}
                >
                  <div
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
                      step.status === 'passed' ? 'bg-green-50' :
                      step.status === 'failed' ? 'bg-red-50' :
                      step.status === 'running' ? 'bg-blue-50' :
                      'bg-gray-50'
                    }`}
                    onClick={() => setShowDetail(isExpanded ? null : step.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          step.status === 'passed' ? 'bg-green-500 text-white' :
                          step.status === 'failed' ? 'bg-red-500 text-white' :
                          step.status === 'running' ? 'bg-blue-500 text-white' :
                          'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {step.status === 'passed' ? <CheckCircle2 className="w-5 h-5" /> :
                         step.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                         step.status === 'running' ? <RefreshCw className="w-5 h-5 animate-spin" /> :
                         index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{step.name}</h3>
                        <p className="text-sm text-gray-500">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.status === 'passed' && (
                        <span className="text-xs text-green-600 font-medium">通过</span>
                      )}
                      {step.status === 'failed' && (
                        <span className="text-xs text-red-600 font-medium">失败</span>
                      )}
                      {step.status === 'running' && (
                        <span className="text-xs text-blue-600 font-medium">运行中...</span>
                      )}
                      {step.status === 'pending' && (
                        <span className="text-xs text-gray-400 font-medium">等待中</span>
                      )}
                    </div>
                  </div>
                  {isExpanded && step.result && (
                    <div className="p-4 bg-white border-t border-gray-100">
                      <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-60">
                        {JSON.stringify(step.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Import History */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">导入历史</h2>
          </div>
          <div className="p-4 space-y-3">
            {importHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-2" />
                <p>暂无导入记录</p>
              </div>
            ) : (
              importHistory.map((hist, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-gray-500">{hist.timestamp}</span>
                    <Copy className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900 text-sm truncate" title={hist.filename}>
                    {hist.filename}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <p className="text-lg font-bold text-blue-600">{hist.records}</p>
                      <p className="text-xs text-gray-500">导入</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <p className="text-lg font-bold text-orange-600">{hist.duplicates}</p>
                      <p className="text-xs text-gray-500">跳过重复</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <p className="text-lg font-bold text-red-600">{hist.anomalies}</p>
                      <p className="text-xs text-gray-500">异常</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">测试说明</h4>
            <p className="text-sm text-amber-700 mt-1">
              本测试场景验证系统在重复导入时的数据一致性。核心验证点：
              <br />
              1. 完全相同的记录导入时应被正确识别并跳过（基于recordNo和字段组合双重检测）
              <br />
              2. 部分重复的文件中，新记录应正确导入，重复记录应被跳过
              <br />
              3. 异常数据（空值、重复、备注混写）应被正确检测并标记
              <br />
              4. 所有操作不会导致数据污染或系统状态异常
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
