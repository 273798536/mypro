import { create } from "zustand";
import type { UserRole, WeighingRecord, NotificationItem } from "@/types";

interface AppState {
  role: UserRole;
  currentRecord: WeighingRecord | null;
  notifications: NotificationItem[];
  sidebarCollapsed: boolean;

  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  setCurrentRecord: (record: WeighingRecord | null) => void;
  addNotification: (notification: Omit<NotificationItem, "id" | "timestamp" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export const useAppStore = create<AppState>((set, get) => ({
  role: "engineer",
  currentRecord: null,
  notifications: [],
  sidebarCollapsed: false,

  setRole: (role) => set({ role }),
  toggleRole: () =>
    set({ role: get().role === "engineer" ? "supervisor" : "engineer" }),

  setCurrentRecord: (record) => set({ currentRecord: record }),

  addNotification: (notification) =>
    set({
      notifications: [
        {
          ...notification,
          id: generateId(),
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...get().notifications,
      ],
    }),

  markNotificationRead: (id) =>
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }),

  markAllNotificationsRead: () =>
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    }),

  removeNotification: (id) =>
    set({
      notifications: get().notifications.filter((n) => n.id !== id),
    }),

  clearNotifications: () => set({ notifications: [] }),

  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
