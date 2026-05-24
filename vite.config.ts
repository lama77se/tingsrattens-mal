import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 5174,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        // Dev proxy intentionally points at the stable Vercel auto-URL,
        // not the custom rattegang.app domain — the auto-URL is guaranteed
        // to stay valid as long as the project exists, independent of any
        // custom-domain configuration.
        target: "https://tingsrattens-mal.vercel.app",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
