import React from 'react';
import ContourCanvas from '../components/canvas/ContourCanvas';
import FilterBar from '../components/table/FilterBar';
import TrackTable from '../components/table/TrackTable';
import QualityGauge from '../components/charts/QualityGauge';
import AnomalyChart from '../components/charts/AnomalyChart';
import SourceCard from '../components/report/SourceCard';

const Dashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        <div className="w-64 space-y-4 flex-shrink-0">
          <QualityGauge />
          <SourceCard />
        </div>
        
        <div className="flex-1 space-y-4">
          <ContourCanvas />
          <FilterBar />
          <TrackTable />
        </div>
        
        <div className="w-72 space-y-4 flex-shrink-0">
          <AnomalyChart />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
