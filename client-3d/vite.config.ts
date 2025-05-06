import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react()
  ],
  resolve: {
    dedupe: ['three'],            // <- Vite will never include two copies
    alias: {
      "@": path.resolve(__dirname, "./src"),
      three: path.resolve(__dirname, "./node_modules/three")  // Explicit path to three package
    }
  },
  optimizeDeps: {
    include: ['three'],
    force: true  // Force re-optimization to clear caching issues
  }
}));
