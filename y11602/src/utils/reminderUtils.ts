import type { Reminder } from '../types';

export function deduplicateReminders(reminders: Reminder[]): Reminder[] {
  const seen = new Map<string, Reminder>();
  
  reminders.forEach(r => {
    const key = `${r.customerId}-${r.type}-${r.timestamp.substring(0, 10)}`;
    const existing = seen.get(key);
    
    if (!existing || new Date(r.timestamp) > new Date(existing.timestamp)) {
      seen.set(key, r);
    }
  });
  
  return Array.from(seen.values()).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getReminderTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    phone: '电话',
    sms: '短信',
    visit: '上门'
  };
  return labels[type] || type;
}
