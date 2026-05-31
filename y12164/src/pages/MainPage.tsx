import { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { RobotModel } from '../components/RobotModel';
import { ParameterPanel } from '../components/ParameterPanel';
import { TorqueChart } from '../components/TorqueChart';
import { IssueList } from '../components/IssueList';
import { useAppStore, initializeMockData } from '../store/appStore';

export const MainPage = () => {
  const { robotConfig } = useAppStore();

  useEffect(() => {
    if (!robotConfig) {
      initializeMockData();
    }
  }, [robotConfig]);

  return (
    <div className="h-screen flex flex-col bg-industrial-600">
      <Navbar />

      <div className="flex-1 p-4 gap-4 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4">
          <div className="col-span-3 h-full">
            <ParameterPanel />
          </div>

          <div className="col-span-6 h-full flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              <RobotModel />
            </div>
            <div className="h-72">
              <TorqueChart height={288} />
            </div>
          </div>

          <div className="col-span-3 h-full">
            <IssueList />
          </div>
        </div>
      </div>
    </div>
  );
};
