import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Database,
  GitCompare,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { changeApi, schemaApi } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { AnomalyBadge } from '../components/AnomalyBadge';
import { ChangeTypeBadge } from '../components/ChangeTypeBadge';
import { formatDate } from '../utils/formatters';
import type { RecordStatus, Anomaly, SchemaField, SourceInfo, ChangeRecord, MigrationStatus } from '../../shared/types';

interface ChangeRecordDetail extends ChangeRecord {
  anomalies: Anomaly[];
  migrationStatus: MigrationStatus;
}

interface SchemaChange {
  field: { name: string };
  changeType: string;
  oldValue?: string;
  newValue?: string;
  risk?: string;
}

interface CompareResult {
  changes?: SchemaChange[];
}

export function ChangeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentRole, updateChangeStatus } = useStore();
  const [record, setRecord] = useState<ChangeRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [handlingOpinion, setHandlingOpinion] = useState('');
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [syncContent, setSyncContent] = useState('');
  const [schemaVersions, setSchemaVersions] = useState<Array<{ id: string; version: string; createdAt: string }>>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [selectedVersion1, setSelectedVersion1] = useState('');
  const [selectedVersion2, setSelectedVersion2] = useState('');
  const [showSchemaCompare, setShowSchemaCompare] = useState(false);

  useEffect(() => {
    if (id) {
      loadRecord();
    }
  }, [id]);

  const loadRecord = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await changeApi.getChange(id);
      if (res.success) {
        setRecord(res.data);
        setHandlingOpinion(res.data.handlingOpinion || '');
        if (res.data.tableName) {
          loadSchemaVersions(res.data.tableName);
        }
      }
    } catch (error) {
      console.error('加载记录详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchemaVersions = async (tableName: string) => {
    try {
      const res = await schemaApi.getVersionsForTable(tableName);
      if (res.success) {
        setSchemaVersions(res.data);
        if (res.data.length >= 2) {
          setSelectedVersion1(res.data[1].id);
          setSelectedVersion2(res.data[0].id);
        }
      }
    } catch (error) {
      console.error('加载Schema版本失败:', error);
    }
  };

  const handleCompareSchema = async () => {
    if (!selectedVersion1 || !selectedVersion2) return;
    try {
      const res = await schemaApi.compare(selectedVersion1, selectedVersion2);
      if (res.success) {
        setCompareResult(res.data);
      }
    } catch (error) {
      console.error('Schema对比失败:', error);
    }
  };

  const handleUpdateStatus = async (status: RecordStatus) => {
    if (!id) return;
    try {
      const res = await changeApi.updateChange(id, { status, handlingOpinion });
      if (res.success) {
        setRecord(res.data);
        updateChangeStatus(id, status);
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const handleSaveOpinion = async () => {
    if (!id) return;
    try {
      const res = await changeApi.updateChange(id, { handlingOpinion });
      if (res.success) {
        setRecord(res.data);
      }
    } catch (error) {
      console.error('保存处理意见失败:', error);
    }
  };

  const handleSyncToSource = async () => {
    if (!id || !syncContent) return;
    try {
      const res = await changeApi.syncToSource(id, syncContent);
      if (res.success) {
        setShowMigrationModal(false);
        loadRecord();
      }
    } catch (error) {
      console.error('同步失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">记录不存在</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>
      </div>
    );
  }

  const sourceInfo: SourceInfo = record.sourceInfo || {
    sourceType: 'manual',
    sourceFile: '',
    sourcePage: '',
    backupVersion: '',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">变更记录详情</h1>
              <StatusBadge status={record.status} />
              <ChangeTypeBadge type={record.changeType} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              记录号：{record.recordNo} · 更新于 {formatDate(record.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveOpinion}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存修改
          </button>
          {currentRole !== 'dev' && (
            <button
              onClick={() => setShowMigrationModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              同步至来源
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              基本信息
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">表名</label>
                <p className="font-medium text-gray-900">{record.tableName}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">字段名</label>
                <p className="font-medium text-gray-900">{record.fieldName}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">业务工单号</label>
                <p className="font-medium text-gray-900">{sourceInfo.ticketNo || '-'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">提出人</label>
                <p className="font-medium text-gray-900">{sourceInfo.requester || '-'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">创建时间</label>
                <p className="font-medium text-gray-900">{formatDate(record.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">材料链接</label>
                <p className="font-medium text-gray-900">
                  {sourceInfo.materialLink ? (
                    <a href={sourceInfo.materialLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      查看原始材料
                    </a>
                  ) : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-500 mb-1">业务描述</label>
                <p className="text-gray-700">{sourceInfo.businessDesc || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-500" />
                Schema 变更详情
              </h2>
              <button
                onClick={() => setShowSchemaCompare(!showSchemaCompare)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <GitCompare className="w-4 h-4" />
                {showSchemaCompare ? '隐藏对比' : '查看版本对比'}
              </button>
            </div>

            {showSchemaCompare && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-500 mb-1">旧版本</label>
                    <select
                      value={selectedVersion1}
                      onChange={(e) => setSelectedVersion1(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {schemaVersions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.version}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-5" />
                  <div className="flex-1">
                    <label className="block text-sm text-gray-500 mb-1">新版本</label>
                    <select
                      value={selectedVersion2}
                      onChange={(e) => setSelectedVersion2(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {schemaVersions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.version}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCompareSchema}
                    className="mt-5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    对比
                  </button>
                </div>

                {compareResult && compareResult.changes && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">字段</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">变更</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">旧值</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">新值</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">风险</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {compareResult.changes.map((change, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono">{change.field.name}</td>
                            <td className="px-3 py-2">
                              <ChangeTypeBadge type={change.changeType as never} showIcon={false} />
                            </td>
                            <td className="px-3 py-2 text-gray-500">{change.oldValue || '-'}</td>
                            <td className="px-3 py-2">{change.newValue || '-'}</td>
                            <td className="px-3 py-2">
                              {change.risk === 'HIGH' && <span className="text-red-600 font-medium">高</span>}
                              {change.risk === 'MEDIUM' && <span className="text-amber-600 font-medium">中</span>}
                              {change.risk === 'LOW' && <span className="text-green-600 font-medium">低</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">变更前</h3>
                {record.schemaBefore && record.schemaBefore.name ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">字段名</span>
                      <span className="font-mono text-sm">{record.schemaBefore.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">类型</span>
                      <span className="font-mono text-sm">{record.schemaBefore.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">长度/精度</span>
                      <span className="font-mono text-sm">
                        {record.schemaBefore.length ? `${record.schemaBefore.length}${record.schemaBefore.precision ? `,${record.schemaBefore.precision}` : ''}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">可空</span>
                      <span className="font-mono text-sm">{record.schemaBefore.nullable ? '是' : '否'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">默认值</span>
                      <span className="font-mono text-sm">{record.schemaBefore.defaultValue || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">备注</span>
                      <p className="text-sm mt-1">{record.schemaBefore.comment || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">新增字段，无变更前数据</p>
                )}
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-600 mb-3">变更后</h3>
                {record.schemaAfter && record.schemaAfter.name ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">字段名</span>
                      <span className="font-mono text-sm">{record.schemaAfter.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">类型</span>
                      <span className="font-mono text-sm">{record.schemaAfter.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">长度/精度</span>
                      <span className="font-mono text-sm">
                        {record.schemaAfter.length ? `${record.schemaAfter.length}${record.schemaAfter.precision ? `,${record.schemaAfter.precision}` : ''}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">可空</span>
                      <span className="font-mono text-sm">{record.schemaAfter.nullable ? '是' : '否'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-600">默认值</span>
                      <span className="font-mono text-sm">{record.schemaAfter.defaultValue || '-'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-blue-600">备注</span>
                      <p className="text-sm mt-1">{record.schemaAfter.comment || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-400">无数据</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              异常检测结果
            </h2>
            {record.anomalies && record.anomalies.length > 0 ? (
              <div className="space-y-3">
                {(record.anomalies as Anomaly[]).map((anomaly, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AnomalyBadge type={anomaly.type} severity={anomaly.severity} />
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(anomaly.detectedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{anomaly.description}</p>
                    {anomaly.suggestion && (
                      <p className="text-sm text-blue-600 mt-2 flex items-start gap-1">
                        <CheckCircle2 className="w-4 h-4 mt-0.5" />
                        建议：{anomaly.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p>未检测到异常</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              处理意见
            </h2>
            <textarea
              value={handlingOpinion}
              onChange={(e) => setHandlingOpinion(e.target.value)}
              placeholder="请输入处理意见..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
              rows={4}
            />
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">快捷标记：</span>
                <button
                  onClick={() => setHandlingOpinion('经复核，数据准确无误，可直接使用。')}
                  className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  可用
                </button>
                <button
                  onClick={() => setHandlingOpinion('存在疑问，请联系BI分析师进一步确认。')}
                  className="px-3 py-1 text-xs text-amber-600 bg-amber-50 rounded hover:bg-amber-100 transition-colors"
                >
                  待复核
                </button>
                <button
                  onClick={() => setHandlingOpinion('数据存在问题，不可使用。请重新核对后再提交。')}
                  className="px-3 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                >
                  不可用
                </button>
              </div>
              {currentRole !== 'dev' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus('AVAILABLE')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    标记可用
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('PENDING_REVIEW')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    标记待复核
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('UNAVAILABLE')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    标记不可用
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-500" />
              来源信息
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">工单号</label>
                <p className="font-medium text-gray-900">{sourceInfo.ticketNo || '-'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">提出人</label>
                <p className="font-medium text-gray-900">{sourceInfo.requester || '-'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">业务描述</label>
                <p className="font-medium text-gray-900 text-sm">{sourceInfo.businessDesc || '-'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">材料链接</label>
                <p className="font-medium text-gray-900">
                  {sourceInfo.materialLink ? (
                    <a href={sourceInfo.materialLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate">
                      {sourceInfo.materialLink}
                    </a>
                  ) : <span className="text-red-500">缺少材料链接（备份缺口）</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-gray-500" />
              迁移状态
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">迁移状态</label>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium ${
                    record.migrationStatus?.synced
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {record.migrationStatus?.synced ? '已同步' : '未同步'}
                </span>
              </div>
              {record.migrationStatus?.lastSyncAt && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">同步时间</label>
                  <p className="font-medium text-gray-900">
                    {formatDate(record.migrationStatus.lastSyncAt)}
                  </p>
                </div>
              )}
              {record.migrationStatus?.sourceWriteBack && record.migrationStatus.sourceWriteBack.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">回写内容</label>
                  <div className="text-sm text-gray-700 space-y-1">
                    {record.migrationStatus.sourceWriteBack.map((item, idx) => (
                      <p key={idx} className="border-l-2 border-blue-400 pl-2">{item}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
            <div className="space-y-2">
              <button
                onClick={() => changeApi.exportChanges({ ids: [id!], format: 'excel' })}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出本条记录
              </button>
              {record.schemaVersionId && (
                <button
                  onClick={() => schemaApi.exportReport(record.schemaVersionId!, record.schemaVersionId!)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出Schema报告
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMigrationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">同步至来源材料</h3>
              <button
                onClick={() => setShowMigrationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  回写内容
                </label>
                <textarea
                  value={syncContent}
                  onChange={(e) => setSyncContent(e.target.value)}
                  placeholder="请输入要回写到来源材料的内容..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                />
              </div>
              <p className="text-sm text-gray-500">
                系统将把处理结论回写到来源材料中，确保前后差异不会丢失。
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowMigrationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSyncToSource}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                确认同步
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
