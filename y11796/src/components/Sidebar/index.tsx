import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { 
  AlertTriangle, Clock, UserCheck, Edit3, Download, X, ChevronDown, ChevronUp, Eye, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getWarningColor, getWarningBgColor, getStudentStatusLabel, getStudentStatusColor,
  formatDateTime, formatNumber 
} from '@/utils/helpers';
import { exportStudentDataToCSV } from '@/utils/reportExport';
import { Warning, StudentData } from '@/types';

function WarningItem({ warning }: { warning: Warning }) {
  return (
    <div className={`p-2 rounded-lg border ${getWarningBgColor(warning.severity)} mb-2`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${getWarningColor(warning.severity)}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-mono ${getWarningColor(warning.severity)}`}>
            {warning.message}
          </div>
          {warning.suggestion && (
            <div className="text-[10px] text-gray-500 mt-1">
              建议: {warning.suggestion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentItem({ 
  student, 
  isSelected, 
  onSelect, 
  onDelete 
}: { 
  student: StudentData;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`rounded-lg border mb-2 transition-all cursor-pointer ${
      isSelected 
        ? 'border-cyan-500 bg-cyan-500/10' 
        : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
    }`}>
      <div 
        className="p-3 flex items-center justify-between"
        onClick={() => onSelect()}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm font-mono truncate">{student.studentName}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStudentStatusColor(student.status)} bg-opacity-20`}>
              {getStudentStatusLabel(student.status)}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
            {student.studentId}
          </div>
          {student.errorAnalysis && (
            <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
              RMSE: {formatNumber(student.errorAnalysis.rmse, 4)} V
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {student.warnings.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
              {student.warnings.length}
            </span>
          )}
          {student.corrections.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
              v{student.corrections.length}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-gray-700 rounded"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-gray-700/50">
              <div className="text-[10px] text-gray-500 mb-2 font-mono">
                导入: {formatDateTime(student.importedAt)} · 来源: {student.source}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportStudentDataToCSV(student);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs"
                >
                  <Download size={12} />
                  导出
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar() {
  const {
    result,
    studentData,
    selectedStudentId,
    unitHistory,
    params,
    selectStudent,
    updateStudentData,
    correctStudentData,
    deleteStudentData,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'warnings' | 'students' | 'history'>('warnings');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [newVoltage, setNewVoltage] = useState('');

  const selectedStudent = studentData.find(s => s.id === selectedStudentId);
  const needsReviewCount = studentData.filter(s => 
    s.status === 'needs_review' || s.warnings.some(w => w.severity === 'error')
  ).length;

  const handleCorrectData = () => {
    if (!selectedStudent || !correctionReason) return;
    
    const pointIdx = selectedStudent.dataPoints.findIndex(p => 
      p.warnings?.some((w: any) => w.severity === 'error')
    );
    
    if (pointIdx >= 0 && newVoltage) {
      const newPoints = [...selectedStudent.dataPoints];
      const oldValue = newPoints[pointIdx].voltage;
      newPoints[pointIdx] = {
        ...newPoints[pointIdx],
        voltage: parseFloat(newVoltage),
        source: 'corrected',
      };
      
      correctStudentData(
        selectedStudent.id,
        `dataPoints[${pointIdx}].voltage`,
        oldValue,
        parseFloat(newVoltage),
        correctionReason,
        '教师'
      );
    }
    
    setShowCorrectionModal(false);
    setCorrectionReason('');
    setNewVoltage('');
  };

  return (
    <div className="w-full h-full bg-[#0F141F] rounded-xl border border-cyan-500/20 flex flex-col overflow-hidden">
      <div className="flex border-b border-gray-700/50">
        {[
          { key: 'warnings', label: '警告', icon: AlertTriangle, count: result?.warnings.length || 0 },
          { key: 'students', label: '学生数据', icon: UserCheck, count: studentData.length },
          { key: 'history', label: '修正记录', icon: Edit3, count: selectedStudent?.corrections.length || 0 },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-3 text-xs font-mono transition-all ${
              activeTab === key
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon size={12} />
            <span>{label}</span>
            {count > 0 && (
              <span className={`text-[10px] px-1.5 rounded ${
                key === 'students' && needsReviewCount > 0 ? 'bg-yellow-500/30 text-yellow-400' : 'bg-gray-700 text-gray-400'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'warnings' && (
          <div>
            {result?.warnings && result.warnings.length > 0 ? (
              result.warnings.map(warning => (
                <WarningItem key={warning.id} warning={warning} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-600 text-xs">
                <Eye size={32} className="mx-auto mb-2 opacity-30" />
                <div>暂无警告信息</div>
                <div className="mt-1">参数配置正常</div>
              </div>
            )}

            {unitHistory.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Clock size={12} />
                  单位变更记录
                </div>
                {unitHistory.slice(-5).reverse().map((h, i) => (
                  <div key={i} className="text-[10px] text-gray-500 py-1 border-b border-gray-800 font-mono">
                    <span className="text-gray-600">{h.field}:</span>
                    <span className="text-red-400"> {h.oldUnit}</span>
                    <span className="text-gray-600"> → </span>
                    <span className="text-green-400">{h.newUnit}</span>
                    <span className="text-gray-700 ml-2">
                      {formatDateTime(h.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            {studentData.length > 0 ? (
              studentData.map(student => (
                <StudentItem
                  key={student.id}
                  student={student}
                  isSelected={selectedStudentId === student.id}
                  onSelect={() => selectStudent(student.id)}
                  onDelete={() => deleteStudentData(student.id)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-600 text-xs">
                <UserCheck size={32} className="mx-auto mb-2 opacity-30" />
                <div>暂无学生数据</div>
                <div className="mt-1">点击"模拟数据"或"导入CSV"添加数据</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {selectedStudent?.corrections && selectedStudent.corrections.length > 0 ? (
              <div className="space-y-3">
                {selectedStudent.corrections.slice().reverse().map(corr => (
                  <div key={corr.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-cyan-400 font-mono">版本 v{corr.version}</span>
                      <span className="text-[10px] text-gray-600">{formatDateTime(corr.timestamp)}</span>
                    </div>
                    <div className="text-[11px] font-mono mb-2">
                      <span className="text-gray-500">字段:</span>
                      <span className="text-gray-300 ml-1">{corr.field}</span>
                    </div>
                    <div className="text-[11px] font-mono mb-1">
                      <span className="text-gray-500">原值:</span>
                      <span className="text-red-400 ml-1">{JSON.stringify(corr.oldValue)}</span>
                    </div>
                    <div className="text-[11px] font-mono mb-2">
                      <span className="text-gray-500">新值:</span>
                      <span className="text-green-400 ml-1">{JSON.stringify(corr.newValue)}</span>
                    </div>
                    <div className="text-[11px] border-t border-gray-700/50 pt-2">
                      <span className="text-gray-500">原因:</span>
                      <span className="text-gray-300 ml-1">{corr.reason}</span>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      操作人: {corr.operator} · 来源: {corr.dataSource}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600 text-xs">
                <Edit3 size={32} className="mx-auto mb-2 opacity-30" />
                <div>暂无修正记录</div>
                <div className="mt-1">选择学生数据后可查看修正历史</div>
              </div>
            )}

            {selectedStudent && selectedStudent.warnings.some(w => w.severity === 'error') && (
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="w-full mt-4 py-2 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs hover:bg-orange-500/30 transition-colors"
              >
                <Edit3 size={12} className="inline mr-1" />
                修正异常数据
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCorrectionModal && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F141F] rounded-xl border border-orange-500/30 p-6 w-[90%] max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-orange-400 font-mono text-sm">修正数据</h3>
                <button
                  onClick={() => setShowCorrectionModal(false)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">修正原因</label>
                  <textarea
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="请说明修正原因..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono focus:outline-none focus:border-orange-500 resize-none h-20"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">修正后电压值 (V)</label>
                  <input
                    type="number"
                    value={newVoltage}
                    onChange={(e) => setNewVoltage(e.target.value)}
                    placeholder="输入新的电压值..."
                    step="0.001"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-orange-400 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCorrectionModal(false)}
                    className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCorrectData}
                    disabled={!correctionReason || !newVoltage}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      correctionReason && newVoltage
                        ? 'bg-orange-500 text-black hover:bg-orange-400'
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    确认修正
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
