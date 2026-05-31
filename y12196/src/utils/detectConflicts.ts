import type { Box, City, Conflict, ChangeRecord } from '../types';
import { sourceLabels } from '../data/mockData';

function generateId(): string {
  return 'conflict-' + Math.random().toString(36).substring(2, 11);
}

export function detectConflicts(
  boxes: Box[],
  cities: City[],
  changeHistory: ChangeRecord[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  const recentChanges = changeHistory
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  const fieldChanges = new Map<string, ChangeRecord[]>();
  recentChanges.forEach(change => {
    const key = `${change.entityType}-${change.entityId}-${change.fieldName}`;
    if (!fieldChanges.has(key)) {
      fieldChanges.set(key, []);
    }
    fieldChanges.get(key)!.push(change);
  });

  fieldChanges.forEach((changes, key) => {
    if (changes.length < 2) return;

    const sources = new Set(changes.map(c => c.source));
    if (sources.has('material-admin') && sources.has('city-coordinator')) {
      const sorted = changes.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const materialChange = sorted.find(c => c.source === 'material-admin');
      const cityChange = sorted.find(c => c.source === 'city-coordinator');

      if (materialChange && cityChange) {
        const materialLatest = materialChange.timestamp > cityChange.timestamp 
          ? materialChange 
          : cityChange;
        const other = materialLatest === materialChange ? cityChange : materialChange;

        if (materialLatest.newValue !== other.newValue) {
          const existingConflict = conflicts.find(
            c => c.entityId === materialLatest.entityId && 
                 c.fieldName === materialLatest.fieldName &&
                 c.status === 'pending'
          );

          if (!existingConflict) {
            const [entityType, entityId, fieldName] = key.split('-');
            conflicts.push({
              id: generateId(),
              entityType: entityType as 'box' | 'city',
              entityId,
              fieldName,
              materialVersion: {
                value: materialChange.newValue,
                source: sourceLabels[materialChange.source],
                operator: materialChange.operator,
                timestamp: new Date(materialChange.timestamp),
              },
              cityVersion: {
                value: cityChange.newValue,
                source: sourceLabels[cityChange.source],
                operator: cityChange.operator,
                timestamp: new Date(cityChange.timestamp),
              },
              status: 'pending',
            });
          }
        }
      }
    }
  });

  boxes.forEach(box => {
    const boxShipmentChanges = recentChanges.filter(
      c => c.entityType === 'shipment' && 
           c.fieldName === 'status' && 
           c.entityId.includes(box.id)
    );

    if (boxShipmentChanges.length >= 2) {
      const materialChange = boxShipmentChanges.find(c => c.source === 'material-admin');
      const cityChange = boxShipmentChanges.find(c => c.source === 'city-coordinator');

      if (materialChange && cityChange && materialChange.newValue !== cityChange.newValue) {
        conflicts.push({
          id: generateId(),
          entityType: 'box',
          entityId: box.id,
          fieldName: 'shipmentStatus',
          materialVersion: {
            value: materialChange.newValue,
            source: sourceLabels[materialChange.source],
            operator: materialChange.operator,
            timestamp: new Date(materialChange.timestamp),
          },
          cityVersion: {
            value: cityChange.newValue,
            source: sourceLabels[cityChange.source],
            operator: cityChange.operator,
            timestamp: new Date(cityChange.timestamp),
          },
          status: 'pending',
        });
      }
    }
  });

  return conflicts;
}
