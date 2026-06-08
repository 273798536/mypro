export const ClearanceCalculator = {
  calculateClearance(
    measuredValue: number,
    params: {
      beamHeight: number;
      pipeDiameter: number;
      ceilingThickness: number;
      slabThickness: number;
      floorElevation: number;
    },
    minRequired: number
  ): { calculatedClearance: number; isAbnormal: boolean } {
    const calculatedClearance =
      measuredValue -
      params.beamHeight -
      params.pipeDiameter -
      params.ceilingThickness -
      params.slabThickness +
      params.floorElevation;
    const isAbnormal = calculatedClearance < minRequired;
    return { calculatedClearance, isAbnormal };
  },
};
