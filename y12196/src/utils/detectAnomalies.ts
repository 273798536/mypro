import { differenceInDays, isPast } from 'date-fns';
import type { Box, Shipment, Alert } from '../types';

function generateId(): string {
  return 'alert-' + Math.random().toString(36).substring(2, 11);
}

export function detectAnomalies(data: { 
  boxes: Box[]; 
  shipments: Shipment[];
  cities: { id: string; name: string; performanceDate: Date }[];
}): Alert[] {
  const alerts: Alert[] = [];
  const { boxes, shipments, cities } = data;
  const now = new Date();

  const boxNumbers = new Map<string, string[]>();
  boxes.forEach(box => {
    if (!boxNumbers.has(box.boxNumber)) {
      boxNumbers.set(box.boxNumber, []);
    }
    boxNumbers.get(box.boxNumber)!.push(box.id);
  });

  boxNumbers.forEach((ids, number) => {
    if (ids.length > 1) {
      const existingAlert = alerts.find(
        a => a.type === 'duplicate-box' && a.message.includes(number)
      );
      if (!existingAlert) {
        alerts.push({
          id: generateId(),
          type: 'duplicate-box',
          severity: 'high',
          entityType: 'box',
          entityId: ids[0],
          message: `箱号 "${number}" 重复出现 ${ids.length} 次 (${ids.join(', ')})`,
          recordLink: `/boxes?ids=${ids.join(',')}`,
          status: 'active',
          createdAt: now,
        });
      }
    }
  });

  shipments.forEach(shipment => {
    if (shipment.status === 'arrived' && !shipment.signatureDate) {
      const box = boxes.find(b => b.id === shipment.boxId);
      const city = cities.find(c => c.id === shipment.cityId);
      
      alerts.push({
        id: generateId(),
        type: 'missing-signature',
        severity: 'medium',
        entityType: 'shipment',
        entityId: shipment.id,
        message: `${city?.name || '未知城市'}站 - ${box?.boxNumber || '未知箱号'} ${box?.description || ''} 已到达但未签收`,
        recordLink: `/boxes/${box?.id || shipment.boxId}`,
        status: 'active',
        createdAt: now,
      });
    }
  });

  boxes.forEach(box => {
    if (box.insurance) {
      const daysToExpire = differenceInDays(box.insurance.expireDate, now);
      
      if (isPast(box.insurance.expireDate)) {
        alerts.push({
          id: generateId(),
          type: 'insurance-expiring',
          severity: 'high',
          entityType: 'box',
          entityId: box.id,
          message: `${box.boxNumber} - 保险保单 ${box.insurance.policyNumber} 已于 ${Math.abs(daysToExpire)} 天前过期`,
          recordLink: `/boxes/${box.id}`,
          status: 'active',
          createdAt: now,
        });
      } else if (daysToExpire <= 30) {
        alerts.push({
          id: generateId(),
          type: 'insurance-expiring',
          severity: daysToExpire <= 7 ? 'high' : daysToExpire <= 15 ? 'medium' : 'low',
          entityType: 'box',
          entityId: box.id,
          message: `${box.boxNumber} - 保险保单 ${box.insurance.policyNumber} 将在 ${daysToExpire} 天后过期`,
          recordLink: `/boxes/${box.id}`,
          status: 'active',
          createdAt: now,
        });
      }
    }
  });

  shipments.forEach(shipment => {
    if (shipment.status === 'transit') {
      const city = cities.find(c => c.id === shipment.cityId);
      const box = boxes.find(b => b.id === shipment.boxId);
      
      if (city) {
        const daysToPerformance = differenceInDays(city.performanceDate, now);
        if (daysToPerformance <= 3) {
          alerts.push({
            id: generateId(),
            type: 'shipment-delay',
            severity: daysToPerformance <= 1 ? 'high' : 'medium',
            entityType: 'shipment',
            entityId: shipment.id,
            message: `${city.name}站 - ${box?.boxNumber || ''} ${box?.description || ''} 运输中，距演出仅剩 ${daysToPerformance} 天`,
            recordLink: `/cities/${city.id}`,
            status: 'active',
            createdAt: now,
          });
        }
      }
    }
  });

  return alerts;
}
