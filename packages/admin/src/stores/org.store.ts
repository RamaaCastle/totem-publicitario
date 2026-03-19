import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface OrgConfig {
  id?: string;
  slug: string;
  name: string;
  primary: string;   // main accent color
  bg: string;        // left panel background
  logoUrl?: string | null;
}

// Fallback static configs (used until API data is loaded)
export const ORGS: Record<string, OrgConfig> = {
  magna: {
    slug: 'magna',
    name: 'Magna Hoteles',
    primary: '#dc2626',
    bg: '#111111',
  },
  pedraza: {
    slug: 'pedraza',
    name: 'Pedraza Viajes y Turismo',
    primary: '#1b1a36',
    bg: '#1b1a36',
  },
};

interface OrgState {
  selectedOrg: OrgConfig | null;
  setSelectedOrg: (org: OrgConfig) => void;
  updateSelectedOrg: (data: Partial<OrgConfig>) => void;
  clearOrg: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      selectedOrg: null,
      setSelectedOrg: (org) => set({ selectedOrg: org }),
      updateSelectedOrg: (data) =>
        set((state) => ({
          selectedOrg: state.selectedOrg ? { ...state.selectedOrg, ...data } : state.selectedOrg,
        })),
      clearOrg: () => set({ selectedOrg: null }),
    }),
    {
      name: 'signage-org',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    },
  ),
);
