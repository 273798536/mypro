import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { AlertTriangle, X } from 'lucide-react';

export const CorrectionToast: React.FC = () => {
  const { showCorrection, correctionMessage, closeCorrection } = useGameStore();

  if (!showCorrection || !correctionMessage) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
      <div className="bg-yellow-900 border-2 border-yellow-500 rounded-xl p-4 max-w-lg shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-yellow-500 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-900" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-yellow-300 mb-1">修正提示</h3>
            <p className="text-sm text-yellow-100">{correctionMessage}</p>
          </div>
          <button
            onClick={closeCorrection}
            className="p-1 hover:bg-yellow-800 rounded transition-all"
          >
            <X className="w-5 h-5 text-yellow-300" />
          </button>
        </div>
      </div>
    </div>
  );
};
