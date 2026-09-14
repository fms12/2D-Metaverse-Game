// =============================================================================
// VITE CONFIG (vite.config.ts)
// =============================================================================
// Vite is our build tool and development server.
//
// 🎓 WHY VITE?
// - Traditional CRA (Create React App) used Webpack, which is slow.
// - Vite uses native ESModules in the browser during development.
//   This means it doesn't bundle your whole app before starting the dev server.
//   It only compiles and serves the file your browser is actually requesting, right now.
// - Result: dev server starts in < 1 second and Hot Module Replacement (HMR)
//   is nearly instantaneous even for large projects!
//
// 🎓 WHY @vitejs/plugin-react?
// - React components use JSX (HTML-like syntax inside JavaScript).
// - Browsers don't understand JSX. This plugin transforms JSX into regular JS
//   using Babel (or SWC) automatically.
// =============================================================================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // This plugin adds JSX support (React.createElement transformations)
    // and enables Fast Refresh (HMR that preserves component state on save)
    react(),
  ],

  resolve: {
    alias: {
      // "@" becomes a shortcut to the "src/" folder.
      // Instead of writing "../../components/Button", you write "@/components/Button".
      // This is like adding a bookmark to your src folder!
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    // Dev server runs on port 5173 by default.
    // We define a proxy so API calls to "/api" in the browser are forwarded
    // to our FastAPI backend at http://localhost:8000.
    // This avoids CORS (Cross-Origin Resource Sharing) errors during development.
    //
    // 🎓 CORS EXPLAINED:
    // When your frontend (localhost:5173) makes a request to your backend (localhost:8000),
    // the browser treats them as "different origins" and blocks the request by default.
    // The proxy makes the browser think everything is on the same origin!
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        ws: true,
        changeOrigin: true,
      },
      // Also proxy WebSocket connections to the backend
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
