
import { create } from "zustand";

interface ForgeState {
  initialized: boolean;
  setInitialized: (value: boolean) => void;
  archetypeSymbols: string[];
  setArchetypeSymbols: (symbols: string[]) => void;
}

const useForgeStore = create<ForgeState>((set) => ({
  initialized: false,
  setInitialized: (value) => set({ initialized: value }),
  archetypeSymbols: [],
  setArchetypeSymbols: (symbols) => set({ archetypeSymbols: symbols }),
}));

export default useForgeStore;
