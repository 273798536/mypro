import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function formatTime(timestamp: string): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm');
}

export function formatRelative(timestamp: string): string {
  return dayjs(timestamp).fromNow();
}

export function formatDate(timestamp: string): string {
  return dayjs(timestamp).format('YYYY-MM-DD');
}

export { dayjs };
