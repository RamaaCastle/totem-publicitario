import { create } from 'zustand';

interface PlaylistItem {
  id: string;
  order: number;
  durationSeconds: number;
  media: {
    id: string;
    type: 'image' | 'video';
    url: string;
    checksum: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  defaultDurationSeconds: number;
  items: PlaylistItem[];
}

interface PlayerState {
  deviceCode: string | null;
  deviceToken: string | null;
  apiUrl: string;
  wsUrl: string;
  initialized: boolean;
  playlist: Playlist | null;
  currentIndex: number;
  isOnline: boolean;
  orientation: 'landscape' | 'portrait';
  screenType: string | null;
  schedule: any[] | null;
  hotelInfo: any[] | null;

  setConfig: (config: { deviceCode: string; deviceToken: string; apiUrl?: string; wsUrl?: string }) => void;
  setPlaylist: (playlist: Playlist | null) => void;
  setOrientation: (orientation: 'landscape' | 'portrait') => void;
  setCurrentIndex: (index: number) => void;
  setIsOnline: (online: boolean) => void;
  nextItem: () => void;
  setScreenType: (type: string | null) => void;
  setSchedule: (s: any[] | null) => void;
  setHotelInfo: (info: any[] | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  deviceCode: null,
  deviceToken: null,
  apiUrl: 'http://187.77.53.136',
  wsUrl: 'ws://187.77.53.136',
  initialized: false,
  playlist: null,
  currentIndex: 0,
  isOnline: false,
  orientation: 'landscape',
  screenType: null,
  schedule: null,
  hotelInfo: null,

  setConfig: (config) => set({
    deviceCode: config.deviceCode || null,
    deviceToken: config.deviceToken || null,
    apiUrl: config.apiUrl || 'http://187.77.53.136',
    wsUrl: config.wsUrl || 'ws://187.77.53.136',
    initialized: true,
  }),

  setPlaylist: (playlist) => set((state) => ({
    playlist,
    currentIndex:
      playlist && state.currentIndex < (playlist.items?.length ?? 0)
        ? state.currentIndex
        : 0,
  })),

  setOrientation: (orientation) => set({ orientation }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setIsOnline: (isOnline) => set({ isOnline }),

  nextItem: () => {
    const { playlist, currentIndex } = get();
    if (!playlist || playlist.items.length === 0) return;
    const next = (currentIndex + 1) % playlist.items.length;
    set({ currentIndex: next });
  },

  setScreenType: (screenType) => set({ screenType }),

  setSchedule: (schedule) => set({ schedule }),

  setHotelInfo: (hotelInfo) => set({ hotelInfo }),
}));
