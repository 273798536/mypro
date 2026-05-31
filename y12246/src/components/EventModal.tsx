import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getEventTypeIcon } from '../utils/rulesEngine';

const EventModal: React.FC = () => {
  const activeEvent = useGameStore(state => state.activeEvent);
  const handleEventAnswer = useGameStore(state => state.handleEventAnswer);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!activeEvent) return null;

  const handleSelect = (index: number) => {
    if (isSubmitting) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null || isSubmitting) return;
    setIsSubmitting(true);
    
    setTimeout(() => {
      handleEventAnswer(activeEvent.id, selectedOption);
      setSelectedOption(null);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {getEventTypeIcon(activeEvent.type)}
              </div>
              <div>
                <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  {activeEvent.date}
                </div>
                <h2 className="text-xl font-bold">{activeEvent.title}</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 leading-relaxed">
                {activeEvent.content}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-gray-700">请选择你的操作：</span>
            </div>
            <div className="space-y-2">
              {activeEvent.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  disabled={isSubmitting}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    selectedOption === index
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedOption === index
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedOption === index && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className={`${
                      selectedOption === index ? 'text-amber-700 font-medium' : 'text-gray-600'
                    }`}>
                      {option}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null || isSubmitting}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedOption === null || isSubmitting
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-lg active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  处理中...
                </>
              ) : (
                '确认选择'
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            提示：请根据公告内容仔细判断，选择最恰当的操作
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
