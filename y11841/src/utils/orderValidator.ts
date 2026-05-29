import type { CargoBox, Compartment, FailureReason, PlacementRecord } from '../data/types';

interface PlacementWithDetails {
  cargoBox: CargoBox;
  compartment: Compartment;
  placement: PlacementRecord;
}

export const validateDeliveryOrder = (
  placements: PlacementWithDetails[],
  compartments: Compartment[]
): FailureReason[] => {
  const failures: FailureReason[] = [];

  const sortedByDeliveryOrder = [...placements].sort(
    (a, b) => a.cargoBox.deliveryOrder - b.cargoBox.deliveryOrder
  );

  const getCompartmentPosition = (compartmentId: string) => {
    return compartments.find(c => c.id === compartmentId)?.position;
  };

  for (let i = 0; i < sortedByDeliveryOrder.length; i++) {
    const current = sortedByDeliveryOrder[i];
    const currentPos = getCompartmentPosition(current.compartment.id);

    if (!currentPos) continue;

    for (let j = i + 1; j < sortedByDeliveryOrder.length; j++) {
      const later = sortedByDeliveryOrder[j];
      const laterPos = getCompartmentPosition(later.compartment.id);

      if (!laterPos) continue;

      if (currentPos.row === laterPos.row && currentPos.col < laterPos.col) {
        failures.push({
          type: 'delivery_order_blocked',
          cargoBoxId: current.cargoBox.id,
          compartmentId: current.compartment.id,
          blockedBy: later.cargoBox.id,
          description: `卸货顺序错误："${current.cargoBox.originalName}"应先卸货（第${current.cargoBox.deliveryOrder}站），但被后卸货的"${later.cargoBox.originalName}"（第${later.cargoBox.deliveryOrder}站）挡住了。"${current.cargoBox.originalName}"在"${current.compartment.originalName}"，"${later.cargoBox.originalName}"在"${later.compartment.originalName}"，位于同一行更靠近车门的位置。`,
          originalNames: {
            cargoBox: current.cargoBox.originalName,
            compartment: current.compartment.originalName,
            blockedByBox: later.cargoBox.originalName,
          },
        });
      }
    }
  }

  return failures;
};

export const getDeliveryRouteSequence = (
  placements: PlacementWithDetails[]
): Array<{
  order: number;
  cargoBox: CargoBox;
  compartment: Compartment;
  isBlocked: boolean;
  blockedBy?: string;
}> => {
  const failures = validateDeliveryOrder(placements, placements.map(p => p.compartment));

  return [...placements]
    .sort((a, b) => a.cargoBox.deliveryOrder - b.cargoBox.deliveryOrder)
    .map(p => {
      const blockFailure = failures.find(f => f.cargoBoxId === p.cargoBox.id);
      return {
        order: p.cargoBox.deliveryOrder,
        cargoBox: p.cargoBox,
        compartment: p.compartment,
        isBlocked: !!blockFailure,
        blockedBy: blockFailure?.originalNames.blockedByBox,
      };
    });
};
