import { create } from 'zustand';
import { Particle, DecayEvent, ModificationRecord, ParticleType } from '../types/particle';

interface ParticleState {
  particles: Particle[];
  selectedParticleId: string | null;
  hoveredParticleId: string | null;
  decayEvents: DecayEvent[];
  modificationRecords: ModificationRecord[];
  filteredTypes: ParticleType[];
  addParticle: (particle: Particle) => void;
  addParticles: (particles: Particle[]) => void;
  removeParticle: (id: string) => void;
  updateParticle: (id: string, updates: Partial<Particle>, source: string) => void;
  clearParticles: () => void;
  setSelectedParticle: (id: string | null) => void;
  setHoveredParticle: (id: string | null) => void;
  addDecayEvent: (event: DecayEvent) => void;
  setDecayEventActive: (eventId: string, isActive: boolean) => void;
  toggleParticleType: (type: ParticleType) => void;
  setFilteredTypes: (types: ParticleType[]) => void;
  addModificationRecord: (record: ModificationRecord) => void;
  getVisibleParticles: () => Particle[];
}

export const useParticleStore = create<ParticleState>((set, get) => ({
  particles: [],
  selectedParticleId: null,
  hoveredParticleId: null,
  decayEvents: [],
  modificationRecords: [],
  filteredTypes: ['electron', 'proton', 'neutron', 'muon', 'pion', 'kaon'],

  addParticle: (particle) => {
    set((state) => ({ particles: [...state.particles, particle] }));
  },

  addParticles: (newParticles) => {
    set((state) => ({ particles: [...state.particles, ...newParticles] }));
  },

  removeParticle: (id) => {
    set((state) => ({
      particles: state.particles.filter((p) => p.id !== id),
      selectedParticleId: state.selectedParticleId === id ? null : state.selectedParticleId,
    }));
  },

  updateParticle: (id, updates, source) => {
    set((state) => {
      const particle = state.particles.find((p) => p.id === id);
      if (!particle) return state;

      const newRecords: ModificationRecord[] = [];
      Object.entries(updates).forEach(([key, value]) => {
        const oldValue = String(particle[key as keyof Particle]);
        const newValue = String(value);
        if (oldValue !== newValue) {
          newRecords.push({
            id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            particleId: id,
            fieldName: key,
            oldValue,
            newValue,
            modifiedAt: new Date().toISOString(),
            source,
          });
        }
      });

      return {
        particles: state.particles.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
        modificationRecords: [...state.modificationRecords, ...newRecords],
      };
    });
  },

  clearParticles: () => {
    set({ particles: [], decayEvents: [], selectedParticleId: null });
  },

  setSelectedParticle: (id) => {
    set({ selectedParticleId: id });
  },

  setHoveredParticle: (id) => {
    set({ hoveredParticleId: id });
  },

  addDecayEvent: (event) => {
    set((state) => ({ decayEvents: [...state.decayEvents, event] }));
  },

  setDecayEventActive: (eventId, isActive) => {
    set((state) => ({
      decayEvents: state.decayEvents.map((e) =>
        e.id === eventId ? { ...e, isActive } : e
      ),
    }));
  },

  toggleParticleType: (type) => {
    set((state) => {
      const filtered = state.filteredTypes.includes(type)
        ? state.filteredTypes.filter((t) => t !== type)
        : [...state.filteredTypes, type];
      return { filteredTypes: filtered };
    });
  },

  setFilteredTypes: (types) => {
    set({ filteredTypes: types });
  },

  addModificationRecord: (record) => {
    set((state) => ({
      modificationRecords: [...state.modificationRecords, record],
    }));
  },

  getVisibleParticles: () => {
    const { particles, filteredTypes } = get();
    return particles.filter(
      (p) => p.isVisible && filteredTypes.includes(p.type)
    );
  },
}));
