import { useState } from 'react';
import { FileSpreadsheet, FileText, Calendar, Download, Check, Eye, FileEdit, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { getBuildingName } from '@/utils/graphUtils';
import * as XLSX from 'xlsx';

type ReportType = 'workorders' | 'schedule' | 'anomalies';

export default function Reports() {
  const { workOrders, schedules, anomalies, buildings, inspectors, changeLogs, selectedDate, setSelectedDate } = useStore();
  const [reportType, setReportType] = useState<ReportType>('workorders');
  const [showPreview, setShowPreview] = useState(false);

  const reportConfigs = {
    workorders: {
      label: '工单报表',
      icon: FileSpreadsheet,
      description: '包含所有工单的详细信息，包括来源、状态和处理记录',
    },
    schedule: {
      label: '排班报表',
      icon: Calendar,
      description: '包含人员排班信息，标记人工修改和改动痕迹',
    },
    anomalies: {
      label: '异常报表',
      icon: AlertTriangle,
      description: '包含所有异常记录，分类统计和来源追溯',
    },
  };

  const generateWorkOrderReport = () => {
    return workOrders.map(wo => {
      const building = buildings.find(b => b.id === wo.buildingId);
      const inspector = inspectors.find(i => i.id === wo.inspectorId);
      const relatedChanges = changeLogs.filter(cl => cl.entityType === 'work_order' && cl.entityId === wo.id);
      
      return {
        '工单编号': wo.id.toUpperCase(),
        '楼栋': building?.name || '',
        '巡检员': inspector?.name || '',
        '类型': wo.type === 'routine' ? '日常巡检' : wo.type === 'repair' ? '维修工单' : '专项检查',
        '状态': wo.status === 'pending' ? '待处理' : wo.status === 'in_progress' ? '进行中' : wo.status === 'completed' ? '已完成' : '已取消',
        '来源': wo.source === 'system' ? '系统派单' : '人工插单',
        '优先级': wo.priority === 'high' ? '高' : wo.priority === 'medium' ? '中' : '低',
        '计划时间': wo.scheduledTime,
        '完成时间': wo.completedTime || '-',
        '描述': wo.description,
        '数据来源': `楼栋巡检图: ${building?.name} | 排程中心: ${inspector?.name}`,
        '是否有修改': relatedChanges.length > 0 ? '是' : '否',
        '修改记录': relatedChanges.map(c => `${c.operator} 修改 ${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ') || '-',
      };
    });
  };

  const generateScheduleReport = () => {
    return schedules.filter(s => s.date === selectedDate).map(s => {
      const inspector = inspectors.find(i => i.id === s.inspectorId);
      const relatedChanges = changeLogs.filter(cl => cl.entityType === 'schedule' && cl.entityId === s.id);
      
      return {
        '日期': s.date,
        '巡检员': inspector?.name || '',
        '班组': inspector?.team || '',
        '班次': s.shift === 'morning' ? '早班' : s.shift === 'afternoon' ? '午班' : '夜班',
        '巡检楼栋': s.buildingIds.map(id => getBuildingName(id, buildings)).join(', '),
        '是否人工调整': s.isModified ? '是' : '否',
        '修改人': s.modifiedBy || '-',
        '修改时间': s.modifiedAt || '-',
        '数据来源': '排程中心',
        '改动明细': relatedChanges.map(c => `${c.operator} 修改 ${c.field}: ${c.oldValue} → ${c.newValue} (${c.reason || ''})`).join('; ') || '-',
      };
    });
  };

  const generateAnomalyReport = () => {
    return anomalies.map(a => {
      const sources: string[] = [];
      a.sourceIds.forEach((id, index) => {
        const type = a.sourceTypes[index];
        if (type === 'building') {
          sources.push(`楼栋: ${getBuildingName(id, buildings)}`);
        } else if (type === 'work_order') {
          sources.push(`工单: ${id}`);
        } else if (type === 'route_edge') {
          sources.push(`路线: ${id}`);
        }
      });

      return {
        '异常编号': a.id.toUpperCase(),
        '类型': a.type === 'access_closed' ? '门禁关闭' : a.type === 'route_break' ? '路线断点' : '人员重复',
        '优先级': a.level === 'high' ? '高' : a.level === 'medium' ? '中' : '低',
        '描述': a.description,
        '检测时间': a.detectedAt,
        '状态': a.resolved ? '已处理' : '未处理',
        '数据来源': sources.join(' | '),
        '来源模块': '楼栋巡检图 + 排程中心 + 工单列表',
        '详细信息': JSON.stringify(a.details),
      };
    });
  };

  const getReportData = () => {
    switch (reportType) {
      case 'workorders': return generateWorkOrderReport();
      case 'schedule': return generateScheduleReport();
      case 'anomalies': return generateAnomalyReport();
    }
  };

  const exportToExcel = () => {
    const data = getReportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportConfigs[reportType].label);
    XLSX.writeFile(wb, `${reportConfigs[reportType].label}_${selectedDate}.xlsx`);
  };

  const previewData = getReportData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">报表导出</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(reportConfigs) as ReportType[]).map(type => {
          const config = reportConfigs[type];
          const Icon = config.icon;
          return (
            <div
              key={type}
              onClick={() => setReportType(type)}
              className={cn(
                'p-5 rounded-xl border-2 cursor-pointer transition-all duration-200',
                reportType === type
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-3 rounded-lg',
                  reportType === type ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                )}>
                  <Icon size={24} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{config.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{config.description}</div>
                </div>
              </div>
              {reportType === type && (
                <div className="flex items-center gap-1 mt-3 text-xs text-blue-600">
                  <Check size={14} /> 已选择
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">{reportConfigs[reportType].label}预览</h2>
            <p className="text-sm text-slate-500 mt-1">共 {previewData.length} 条记录</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Eye size={18} />
              {showPreview ? '隐藏预览' : '显示预览'}
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={18} />
              导出 Excel
            </button>
          </div>
        </div>

        {showPreview && (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {previewData.length > 0 && Object.keys(previewData[0]).map(key => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.entries(row).map(([key, value]) => {
                      const hasModification = key.includes('修改') && String(value).length > 1;
                      return (
                        <td
                          key={key}
                          className={cn(
                            'px-4 py-3 whitespace-nowrap max-w-xs truncate',
                            hasModification && 'bg-violet-50 text-violet-700 font-medium'
                          )}
                          title={String(value)}
                        >
                          {hasModification && <FileEdit size={12} className="inline mr-1" />}
                          {String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 20 && (
              <div className="px-4 py-3 bg-slate-50 text-center text-sm text-slate-500">
                仅显示前20条，完整数据请导出查看
              </div>
            )}
          </div>
        )}

        {!showPreview && (
          <div className="p-12 text-center text-slate-500">
            <FileText size={48} className="mx-auto mb-3 text-slate-300" />
            <div>点击"显示预览"查看报表内容</div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">数据对应关系说明</h2>
          <p className="text-sm text-slate-500 mt-1">报表中各字段的数据来源追溯，便于复核</p>
        </div>
        <div className="p-6 grid grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-blue-500" />
              工单报表
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>• 楼栋信息 → 楼栋巡检图模块</div>
              <div>• 巡检员信息 → 排程中心模块</div>
              <div>• 来源标记 → 系统派单/人工插单</div>
              <div>• 修改记录 → 改动追踪日志</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-500" />
              排班报表
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>• 巡检员信息 → 人员管理</div>
              <div>• 楼栋信息 → 楼栋巡检图模块</div>
              <div>• 人工调整标记 → 排程修改记录</div>
              <div>• 改动明细 → 完整修改历史追踪</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              异常报表
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>• 门禁关闭 → 楼栋门禁状态</div>
              <div>• 路线断点 → 图论算法分析</div>
              <div>• 人员重复 → 排班冲突检测</div>
              <div>• 数据来源 → 多模块关联标记</div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-sm font-medium text-amber-700 flex items-center gap-2">
              <AlertTriangle size={16} />
              复核说明
            </div>
            <div className="text-xs text-amber-600 mt-2">
              导出的报表中，所有经过人工修改的数据都会用特殊标记（紫色背景）显示，并在"修改记录"或"改动明细"字段中记录修改人、修改时间和修改前后的值，
              确保复核时能够清晰看到每一处改动的来源和影响。数据来源字段会标注该数据来自哪个模块，方便跨模块核对。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
