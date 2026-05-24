import WaveOrder from './WaveOrder';
import PickingDifference from './PickingDifference';
import ReviewScan from './ReviewScan';
import RetryQueue from './RetryQueue';
import DeadLetterQueue from './DeadLetterQueue';
import OperationLog from './OperationLog';

export {
  WaveOrder,
  PickingDifference,
  ReviewScan,
  RetryQueue,
  DeadLetterQueue,
  OperationLog,
};

export const initModels = async () => {
  await WaveOrder.sync({ alter: true });
  await PickingDifference.sync({ alter: true });
  await ReviewScan.sync({ alter: true });
  await RetryQueue.sync({ alter: true });
  await DeadLetterQueue.sync({ alter: true });
  await OperationLog.sync({ alter: true });
};
