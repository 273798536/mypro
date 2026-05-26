import { Container, Alert } from '../types';

export function detectStackedContainers(containers: Container[]): Alert[] {
  const alerts: Alert[] = [];
  
  containers.forEach(container => {
    if (!container.booking.trainId || container.booking.status === 'completed') return;
    
    const stackedAbove = containers.filter(
      c => c.bay === container.bay && 
           c.row === container.row && 
           c.tier > container.tier
    );
    
    if (stackedAbove.length > 0) {
      alerts.push({
        id: `stacked-${container.id}`,
        type: 'stacked',
        severity: 'warning',
        containerId: container.id,
        relatedContainers: stackedAbove.map(c => c.id),
        message: `箱位被 ${stackedAbove.length} 个箱子压住，需先移走上层箱子`,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  return alerts;
}

export function detectDangerousAdjacent(containers: Container[]): Alert[] {
  const alerts: Alert[] = [];
  const dangerousContainers = containers.filter(c => c.dangerousGoods.level > 0);
  
  dangerousContainers.forEach(container => {
    const isHighRisk = container.dangerousGoods.level <= 2;
    const checkRange = isHighRisk ? 2 : 1;
    
    const adjacentDangerous = dangerousContainers.filter(other => {
      if (other.id === container.id) return false;
      
      const bayDiff = Math.abs(other.bay - container.bay);
      const rowDiff = Math.abs(other.row - container.row);
      const tierDiff = Math.abs(other.tier - container.tier);
      
      if (isHighRisk) {
        return bayDiff <= checkRange && rowDiff <= checkRange && tierDiff <= checkRange;
      } else {
        return bayDiff <= 1 && rowDiff <= checkRange && tierDiff <= 1;
      }
    });
    
    if (adjacentDangerous.length > 0) {
      alerts.push({
        id: `danger-adj-${container.id}`,
        type: 'dangerous_adjacent',
        severity: 'danger',
        containerId: container.id,
        relatedContainers: adjacentDangerous.map(c => c.id),
        message: `${container.dangerousGoods.class} 与其他危险品距离过近，违反隔离规则`,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  const uniqueAlerts: Alert[] = [];
  const seenPairs = new Set<string>();
  
  alerts.forEach(alert => {
    const key = [alert.containerId, ...alert.relatedContainers].sort().join('-');
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      uniqueAlerts.push(alert);
    }
  });
  
  return uniqueAlerts;
}

export function detectExpiredBookings(containers: Container[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const twoHours = 2 * 60 * 60 * 1000;
  
  containers.forEach(container => {
    if (!container.booking.appointmentTime) return;
    if (container.booking.status === 'completed') return;
    
    const appointmentTime = new Date(container.booking.appointmentTime);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    
    if (container.booking.status === 'expired' || timeDiff < 0) {
      alerts.push({
        id: `expired-${container.id}`,
        type: 'expired',
        severity: 'danger',
        containerId: container.id,
        relatedContainers: [],
        message: `预约已过期，请尽快处理或重新预约`,
        timestamp: new Date().toISOString()
      });
    } else if (timeDiff < twoHours) {
      alerts.push({
        id: `expiring-${container.id}`,
        type: 'expired',
        severity: 'warning',
        containerId: container.id,
        relatedContainers: [],
        message: `预约将在 ${Math.round(timeDiff / 60000)} 分钟后到期`,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  return alerts;
}

export function runAllDetections(containers: Container[]): Alert[] {
  const stackedAlerts = detectStackedContainers(containers);
  const dangerousAlerts = detectDangerousAdjacent(containers);
  const expiredAlerts = detectExpiredBookings(containers);
  
  return [...stackedAlerts, ...dangerousAlerts, ...expiredAlerts];
}

export function getContainerAlertIds(alerts: Alert[]): string[] {
  const containerIds = new Set<string>();
  
  alerts.forEach(alert => {
    containerIds.add(alert.containerId);
    alert.relatedContainers.forEach(id => containerIds.add(id));
  });
  
  return Array.from(containerIds);
}

export function getContainerAlerts(containerId: string, alerts: Alert[]): Alert[] {
  return alerts.filter(
    alert => alert.containerId === containerId || 
             alert.relatedContainers.includes(containerId)
  );
}
