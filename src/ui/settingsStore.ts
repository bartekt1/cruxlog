import { create } from 'zustand';
import type { GradeSystem } from '../domain/grades';

type SettingsState = {
  routeSystem: GradeSystem;
  boulderSystem: GradeSystem;
  setRouteSystem: (s: GradeSystem) => void;
  setBoulderSystem: (s: GradeSystem) => void;
};

// In-memory for now; persisting preferences is the next step.
export const useSettings = create<SettingsState>((set) => ({
  routeSystem: 'kr',
  boulderSystem: 'font',
  setRouteSystem: (routeSystem) => set({ routeSystem }),
  setBoulderSystem: (boulderSystem) => set({ boulderSystem }),
}));
