import { create } from 'zustand';
import { Dish, DishCategory } from '../types';
import { sampleDishes } from '../data/sampleDishes';

interface DishStore {
  dishes: Dish[];
  selectedDish: Dish | null;
  searchQuery: string;
  categoryFilter: DishCategory | 'all';
  isLoading: boolean;

  loadDishes: () => void;
  setSelectedDish: (dish: Dish | null) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: DishCategory | 'all') => void;
  addDish: (dish: Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDish: (id: string, updates: Partial<Dish>) => void;
  deleteDish: (id: string) => void;
  importDishes: (dishes: Dish[]) => void;
  getFilteredDishes: () => Dish[];
}

export const useDishStore = create<DishStore>((set, get) => ({
  dishes: [],
  selectedDish: null,
  searchQuery: '',
  categoryFilter: 'all',
  isLoading: false,

  loadDishes: () => {
    set({ isLoading: true });
    const stored = localStorage.getItem('dishes');
    if (stored) {
      const parsed = JSON.parse(stored);
      set({
        dishes: parsed.map((d: Dish) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
        })),
        isLoading: false,
      });
    } else {
      set({ dishes: sampleDishes, isLoading: false });
      localStorage.setItem('dishes', JSON.stringify(sampleDishes));
    }
  },

  setSelectedDish: (dish) => set({ selectedDish: dish }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setCategoryFilter: (category) => set({ categoryFilter: category }),

  addDish: (dishData) => {
    const newDish: Dish = {
      ...dishData,
      id: `dish-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const newDishes = [...get().dishes, newDish];
    set({ dishes: newDishes });
    localStorage.setItem('dishes', JSON.stringify(newDishes));
  },

  updateDish: (id, updates) => {
    const newDishes = get().dishes.map((d) =>
      d.id === id ? { ...d, ...updates, updatedAt: new Date() } : d
    );
    set({ dishes: newDishes });
    localStorage.setItem('dishes', JSON.stringify(newDishes));
  },

  deleteDish: (id) => {
    const newDishes = get().dishes.filter((d) => d.id !== id);
    set({ dishes: newDishes });
    localStorage.setItem('dishes', JSON.stringify(newDishes));
    if (get().selectedDish?.id === id) {
      set({ selectedDish: null });
    }
  },

  importDishes: (dishes) => {
    const newDishes = dishes.map((d) => ({
      ...d,
      id: `dish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const allDishes = [...get().dishes, ...newDishes];
    set({ dishes: allDishes });
    localStorage.setItem('dishes', JSON.stringify(allDishes));
  },

  getFilteredDishes: () => {
    const { dishes, searchQuery, categoryFilter } = get();
    return dishes.filter((dish) => {
      const matchesSearch =
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || dish.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  },
}));
