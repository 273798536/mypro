import { Clock, Image, CalendarSync, Activity } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  checkScreenshotChecklist,
  checkTimeParamsConsistent,
  checkTimelineSynchronized,
} from '@/utils/validation';
import { ReviewItem } from './ReviewItem';

export const ReviewBar = () => {
  const { reviewState, records, savedViewpoints } = useAppStore();

  const timeDetail = checkTimeParamsConsistent(records).detail;
  const screenshotDetail = checkScreenshotChecklist(savedViewpoints.length, records).detail;
  const timelineDetail = checkTimelineSynchronized(records).detail;

  const overall =
    reviewState.timeParamsConsistent === 'fail' ||
    reviewState.screenshotChecklistComplete === 'fail' ||
    reviewState.timelineSynchronized === 'fail'
      ? 'fail'
      : reviewState.timeParamsConsistent === 'warning' ||
          reviewState.screenshotChecklistComplete === 'warning' ||
          reviewState.timelineSynchronized === 'warning'
        ? 'warning'
        : 'pass';

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-700/50 bg-[#0B1026]/80 px-4 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Activity
          className="h-4 w-4"
          style={{
            color:
              overall === 'fail'
                ? '#F87171'
                : overall === 'warning'
                  ? '#F59E0B'
                  : '#34D399',
          }}
        />
        <span
          className="text-[11px] font-bold uppercase tracking-wider text-slate-200"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          复核面板
        </span>
        <span
          className="ml-1 rounded px-1.5 py-0.5 text-[9px] font-bold"
          style={{
            backgroundColor:
              overall === 'fail'
                ? '#F8717122'
                : overall === 'warning'
                  ? '#F59E0B22'
                  : '#34D39922',
            color:
              overall === 'fail'
                ? '#F87171'
                : overall === 'warning'
                  ? '#F59E0B'
                  : '#34D399',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {overall === 'fail' ? '存在拦截项' : overall === 'warning' ? '待处理' : '全部通过'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ReviewItem
          label="时间参数"
          status={reviewState.timeParamsConsistent}
          detail={timeDetail}
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <ReviewItem
          label="截图清单"
          status={reviewState.screenshotChecklistComplete}
          detail={screenshotDetail}
          icon={<Image className="h-3.5 w-3.5" />}
        />
        <ReviewItem
          label="时间轴同步"
          status={reviewState.timelineSynchronized}
          detail={timelineDetail}
          icon={<CalendarSync className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
};
