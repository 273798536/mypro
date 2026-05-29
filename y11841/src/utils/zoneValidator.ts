import type { CargoBox, Compartment, FailureReason } from '../data/types';
import { getZoneLabel } from '../data/levels';

export const validateZoneMatch = (
  cargoBox: CargoBox,
  compartment: Compartment
): { isValid: boolean; failureReason?: FailureReason } => {
  const isMatch = cargoBox.temperatureZone === compartment.temperatureZone;

  if (!isMatch) {
    return {
      isValid: false,
      failureReason: {
        type: 'zone_mismatch',
        cargoBoxId: cargoBox.id,
        compartmentId: compartment.id,
        description: `温层混放：货箱"${cargoBox.originalName}"属于${getZoneLabel(cargoBox.temperatureZone)}(${cargoBox.temperatureZone})，但被放置到了${getZoneLabel(compartment.temperatureZone)}的"${compartment.originalName}"格位`,
        originalNames: {
          cargoBox: cargoBox.originalName,
          compartment: compartment.originalName,
        },
      },
    };
  }

  return { isValid: true };
};

export const checkAllZonePlacements = (
  placements: Array<{ cargoBox: CargoBox; compartment: Compartment }>
): FailureReason[] => {
  const failures: FailureReason[] = [];

  placements.forEach(({ cargoBox, compartment }) => {
    const result = validateZoneMatch(cargoBox, compartment);
    if (result.failureReason) {
      failures.push(result.failureReason);
    }
  });

  return failures;
};

export const getZoneColorClass = (zone: string): string => {
  const colors: Record<string, string> = {
    frozen: 'bg-cold-chain-frozen border-cold-chain-frozen',
    chilled: 'bg-cold-chain-chilled border-cold-chain-chilled',
    normal: 'bg-cold-chain-normal border-cold-chain-normal',
  };
  return colors[zone] || 'bg-gray-600 border-gray-600';
};

export const getZoneBgClass = (zone: string): string => {
  const colors: Record<string, string> = {
    frozen: 'bg-cold-chain-frozen/30',
    chilled: 'bg-cold-chain-chilled/30',
    normal: 'bg-cold-chain-normal/30',
  };
  return colors[zone] || 'bg-gray-600/30';
};

export const getZoneBorderClass = (zone: string): string => {
  const colors: Record<string, string> = {
    frozen: 'border-cold-chain-frozen',
    chilled: 'border-cold-chain-chilled',
    normal: 'border-cold-chain-normal',
  };
  return colors[zone] || 'border-gray-600';
};
