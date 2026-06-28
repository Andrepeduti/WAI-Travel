import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Isolamos apenas libs pesadas e independentes de React.
          // Splits separados de react/radix/icons/framer causam
          // "Cannot read properties of undefined (reading 'forwardRef')"
          // em produção — manter tudo junto no vendor principal.
          if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("@supabase")) return "supabase";
        },
      },
    },
  },
}));
