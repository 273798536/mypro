import { create } from 'zustand';
import type { ShipModel } from '../types';
import { mockShipModel } from '../utils/mockData';

interface ShipState {
  currentShip: ShipModel;
  shipRemark: string;
  setShipRemark: (remark: string) => void;
  updateShipModel: (ship: Partial<ShipModel>) => void;
}

export const useShipStore = create<ShipState>((set) => ({
  currentShip: mockShipModel,
  shipRemark: mockShipModel.remark,
  setShipRemark: (remark) => set({ shipRemark: remark }),
  updateShipModel: (updates) =>
    set((state) => ({
      currentShip: { ...state.currentShip, ...updates, remark: state.shipRemark },
    })),
}));
