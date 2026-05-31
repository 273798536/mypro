import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, FileText, AlertTriangle, RefreshCw, User } from 'lucide-react';
import { Evidence } from '@/types';
import { evidenceEngine } from '@/engine/evidenceEngine';

interface EvidencePanelProps {
  evidences: Evidence[];
  selectedEvidence: Evidence | null;
  onSelectEvidence: (evidence: Evidence | null) => void;
  onClose: () => void;
}

export default function EvidencePanel({
  evidences,
  selectedEvidence,
  onSelectEvidence,
  onClose,
}: EvidencePanelProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'version_change':
        return <RefreshCw size={16} />;
      case 'yard_update':
        return <FileText size={16} />;
      case 'shift_overtime':
        return <Clock size={16} />;
      case 'gate_conflict':
        return <AlertTriangle size={16} />;
      case 'appointment_overdue':
        return <Clock size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'version_change':
        return 'bg-blue-100 text-blue-600';
      case 'yard_update':
        return 'bg-purple-100 text-purple-600';
      case 'shift_overtime':
        return 'bg-orange-100 text-orange-600';
      case 'gate_conflict':
        return 'bg-red-100 text-red-600';
      case 'appointment_overdue':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileText size={20} />
            证据链面板
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {evidences.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p>暂无证据记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evidences.map((evidence, index) => (
                <motion.div
                  key={evidence.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectEvidence(evidence)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedEvidence?.id === evidence.id
                      ? 'border-port-blue bg-port-blue/5'
                      : 'border-gray-100 hover:border-gray-200'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className={`p-2 rounded ${getTypeColor(evidence.type)}`}>
                      {getTypeIcon(evidence.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {evidenceEngine.getTypeLabel(evidence.type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {evidence.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(evidence.timestamp).toLocaleTimeString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {selectedEvidence && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="border-t p-4 bg-gray-50"
          >
            <h4 className="font-bold text-sm mb-2">证据详情</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <FileText size={14} />
                <span>类型: {evidenceEngine.getTypeLabel(selectedEvidence.type)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={14} />
                <span>时间: {new Date(selectedEvidence.timestamp).toLocaleString('zh-CN')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User size={14} />
                <span>引用: {selectedEvidence.reference}</span>
              </div>
              <p className="text-gray-700 mt-3 p-3 bg-white rounded border">
                {selectedEvidence.content}
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
