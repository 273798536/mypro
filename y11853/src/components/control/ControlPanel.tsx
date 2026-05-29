import { motion } from 'framer-motion';
import { DataImport } from './DataImport';
import { IndustryFilter } from './IndustryFilter';
import { RiskThreshold } from './RiskThreshold';

export function ControlPanel() {
  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute left-4 top-4 bottom-4 w-72 flex flex-col gap-3 z-10 overflow-y-auto"
    >
      <DataImport />
      <IndustryFilter />
      <RiskThreshold />
    </motion.div>
  );
}
