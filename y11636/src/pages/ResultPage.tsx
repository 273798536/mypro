import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ScoreOverview from '@/components/result/ScoreOverview';
import DeductionTimeline from '@/components/result/DeductionTimeline';
import type { GameRecord } from '@/types';
import { getGameRecords } from '@/utils/dataManager';
import { useGameStore } from '@/stores/useGameStore';

const ResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [record, setRecord] = useState<GameRecord | null>(null);
  const startGame = useGameStore(state => state.startGame);

  useEffect(() => {
    if (location.state?.record) {
      setRecord(location.state.record);
    } else {
      const recordId = searchParams.get('recordId');
      if (recordId) {
        const records = getGameRecords();
        const foundRecord = records.find(r => r.id === recordId);
        if (foundRecord) {
          setRecord(foundRecord);
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    }
  }, [location.state, searchParams, navigate]);

  const handleRestart = () => {
    startGame();
    navigate('/game');
  };

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <ScoreOverview record={record} onRestart={handleRestart} />
        <DeductionTimeline events={record.events} />
      </div>
    </div>
  );
};

export default ResultPage;
