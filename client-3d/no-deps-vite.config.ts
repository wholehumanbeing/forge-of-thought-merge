import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import os from "os";

// Get system temp directory (outside of OneDrive)
const tmpDir = path.join(os.tmpdir(), 'vite-client-3d-cache');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [".."],
    },
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@2d": path.resolve(__dirname, "../client/src"),
      three: path.resolve(__dirname, "./node_modules/three")
    }
  },
  // Skip optimization altogether for development to avoid permission issues
  optimizeDeps: {
    include: [],
    entries: [],
    exclude: ['*'],
    force: false
  },
  // Use system temp directory for cache to avoid OneDrive and permission issues
  cacheDir: tmpDir
})); 