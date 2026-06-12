export interface TimezoneAnomaly {
  hasAnomaly: boolean;
  originalTime: string;
  correctedTime: string;
  originalTideType: string;
  correctedTideType: string;
  description: string;
}

export function detectTimezoneAnomaly(timeString: string, isDomesticPort: boolean = true): TimezoneAnomaly {
  if (!isDomesticPort) {
    return {
      hasAnomaly: false,
      originalTime: timeString,
      correctedTime: timeString,
      originalTideType: '',
      correctedTideType: '',
      description: '',
    };
  }

  const utcMatch = timeString.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*(UTC|utc)/);
  if (utcMatch) {
    const dateStr = utcMatch[1];
    const timeStr = utcMatch[2];
    const [hours, minutes] = timeStr.split(':').map(Number);
    const correctedHours = hours + 8;
    let correctedDate = dateStr;
    let finalHours = correctedHours;

    if (correctedHours >= 24) {
      finalHours = correctedHours - 24;
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      correctedDate = d.toISOString().split('T')[0];
    }

    const correctedTimeStr = `${String(finalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return {
      hasAnomaly: true,
      originalTime: timeString,
      correctedTime: `${correctedDate} ${correctedTimeStr} CST（UTC+8）`,
      originalTideType: getTideTypeAtHour(hours),
      correctedTideType: getTideTypeAtHour(finalHours),
      description: `时间标注UTC但港口为国内港口，修正为UTC+8后：${dateStr} ${timeStr} → ${correctedDate} ${correctedTimeStr}，潮位从${getTideTypeAtHour(hours)}变为${getTideTypeAtHour(finalHours)}。`,
    };
  }

  return {
    hasAnomaly: false,
    originalTime: timeString,
    correctedTime: timeString,
    originalTideType: '',
    correctedTideType: '',
    description: '',
  };
}

function getTideTypeAtHour(hour: number): string {
  if (hour >= 4 && hour <= 6) return '高潮期';
  if (hour >= 8 && hour <= 10) return '退潮期';
  if (hour >= 11 && hour <= 14) return '高潮期';
  if (hour >= 15 && hour <= 17) return '低潮期';
  if (hour >= 20 && hour <= 22) return '高潮期';
  if (hour >= 0 && hour <= 3) return '低潮期';
  return '过渡期';
}
