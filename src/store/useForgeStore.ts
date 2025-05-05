
import { create } from "zustand";

interface ForgeState {
  initialized: boolean;
  setInitialized: (value: boolean) => void;
}

const useForgeStore = create<ForgeState>((set) => ({
  initialized: false,
  setInitialized: (value) => set({ initialized: value }),
}));

export default useForgeStore;
