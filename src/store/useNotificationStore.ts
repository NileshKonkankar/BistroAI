import { create } from 'zustand';
import { isSoundAlertEnabled, setSoundAlertEnabled } from '../lib/audioAlert';

export interface StaffOrderNotification {
  id: string;
  orderId: string;
  customerEmail: string;
  tableNumber?: string;
  type: string;
  itemCount: number;
  itemSummary: string;
  totalAmount: number;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  soundEnabled: boolean;
  toggleSound: () => void;
  setSound: (enabled: boolean) => void;
  notifications: StaffOrderNotification[];
  unreadCount: number;
  addNotification: (item: Omit<StaffOrderNotification, 'id' | 'read' | 'timestamp'>) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  soundEnabled: isSoundAlertEnabled(),
  toggleSound: () => {
    set((state) => {
      const next = !state.soundEnabled;
      setSoundAlertEnabled(next);
      return { soundEnabled: next };
    });
  },
  setSound: (enabled) => {
    setSoundAlertEnabled(enabled);
    set({ soundEnabled: enabled });
  },
  notifications: [],
  unreadCount: 0,
  addNotification: (item) => {
    const newItem: StaffOrderNotification = {
      ...item,
      id: `${item.orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      read: false,
    };
    set((state) => ({
      notifications: [newItem, ...state.notifications].slice(0, 30),
      unreadCount: state.unreadCount + 1,
    }));
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
