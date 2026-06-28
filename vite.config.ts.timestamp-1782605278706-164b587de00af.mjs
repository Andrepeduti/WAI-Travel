// vite.config.ts
import { defineConfig } from "file:///D:/Users/Andr%C3%A9/Downloads/MVP%20-%20WAI%20Travel%20Hub/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Users/Andr%C3%A9/Downloads/MVP%20-%20WAI%20Travel%20Hub/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "D:\\Users\\Andr\xE9\\Downloads\\MVP - WAI Travel Hub";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom"]
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("@supabase")) return "supabase";
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxVc2Vyc1xcXFxBbmRyXHUwMEU5XFxcXERvd25sb2Fkc1xcXFxNVlAgLSBXQUkgVHJhdmVsIEh1YlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcVXNlcnNcXFxcQW5kclx1MDBFOVxcXFxEb3dubG9hZHNcXFxcTVZQIC0gV0FJIFRyYXZlbCBIdWJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L1VzZXJzL0FuZHIlQzMlQTkvRG93bmxvYWRzL01WUCUyMC0lMjBXQUklMjBUcmF2ZWwlMjBIdWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5cblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogZmFsc2UsXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCldLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICAgIGRlZHVwZTogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIl0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiBcImVzMjAyMFwiLFxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSkgcmV0dXJuO1xuICAgICAgICAgIC8vIElzb2xhbW9zIGFwZW5hcyBsaWJzIHBlc2FkYXMgZSBpbmRlcGVuZGVudGVzIGRlIFJlYWN0LlxuICAgICAgICAgIC8vIFNwbGl0cyBzZXBhcmFkb3MgZGUgcmVhY3QvcmFkaXgvaWNvbnMvZnJhbWVyIGNhdXNhbVxuICAgICAgICAgIC8vIFwiQ2Fubm90IHJlYWQgcHJvcGVydGllcyBvZiB1bmRlZmluZWQgKHJlYWRpbmcgJ2ZvcndhcmRSZWYnKVwiXG4gICAgICAgICAgLy8gZW0gcHJvZHVcdTAwRTdcdTAwRTNvIFx1MjAxNCBtYW50ZXIgdHVkbyBqdW50byBubyB2ZW5kb3IgcHJpbmNpcGFsLlxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcImpzcGRmXCIpIHx8IGlkLmluY2x1ZGVzKFwiaHRtbDJjYW52YXNcIikpIHJldHVybiBcInBkZlwiO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcImxlYWZsZXRcIikpIHJldHVybiBcImxlYWZsZXRcIjtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAc3VwYWJhc2VcIikpIHJldHVybiBcInN1cGFiYXNlXCI7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdWLFNBQVMsb0JBQW9CO0FBQzdXLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNqQyxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxJQUNBLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxFQUMvQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFJO0FBQ2YsY0FBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEVBQUc7QUFLbEMsY0FBSSxHQUFHLFNBQVMsT0FBTyxLQUFLLEdBQUcsU0FBUyxhQUFhLEVBQUcsUUFBTztBQUMvRCxjQUFJLEdBQUcsU0FBUyxTQUFTLEVBQUcsUUFBTztBQUNuQyxjQUFJLEdBQUcsU0FBUyxXQUFXLEVBQUcsUUFBTztBQUFBLFFBQ3ZDO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
