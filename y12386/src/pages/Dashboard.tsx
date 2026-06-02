import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import QuickActions from '@/components/dashboard/QuickActions';
import AlertCards from '@/components/dashboard/AlertCards';
import ProgressBar from '@/components/dashboard/ProgressBar';
import Timeline from '@/components/dashboard/Timeline';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-midnight-100 flex items-center gap-3">
            <div className="w-10 h-10 gold-gradient rounded-btn flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            乐团巡演物流清单
          </h1>
          <p className="text-midnight-400 mt-1">
            乐器清单、运输单、城市日程，三者核对一目了然
          </p>
        </div>
      </motion.div>

      <QuickActions />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AlertCards />
        <ProgressBar />
      </div>

      <Timeline />
    </div>
  );
};

export default Dashboard;
