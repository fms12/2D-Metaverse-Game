// =============================================================================
// TAILWIND CSS CONFIG (tailwind.config.js)
// =============================================================================
// Tailwind CSS is a "utility-first" CSS framework.
//
// 🎓 WHAT IS UTILITY-FIRST CSS?
// Traditional CSS: You write a class like ".card { display: flex; padding: 16px; ... }"
// Tailwind CSS:    You write the styles directly on the element:
//                 <div className="flex p-4 bg-gray-900 rounded-lg">...</div>
//
// The HUGE benefit: you never leave your HTML/JSX file!
// Every style is immediately visible where the element is written.
//
// 🎓 HOW PURGING WORKS:
// Tailwind generates ALL possible utility classes (millions of them).
// In production, it scans "content" files and REMOVES any class you didn't use.
// So your final CSS bundle is tiny (just the classes you actually used).
// =============================================================================

/** @type {import('tailwindcss').Config} */
export default {
  // "content": Tell Tailwind WHERE to look for class names.
  // It scans these files to know which classes to keep in the final bundle.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // All JS/TS/JSX/TSX files inside src/
  ],

  theme: {
    extend: {
      // ===================================================================
      // CUSTOM THEME EXTENSIONS
      // ===================================================================
      // We extend the default Tailwind theme with metaverse-themed colors.
      // 🎓 "extend" means we ADD to Tailwind's defaults, not replace them.

      colors: {
        // Deep dark backgrounds for the game world feel
        metaverse: {
          bg: "#0a0a0f", // Almost black background
          surface: "#12121a", // Card/panel surface
          border: "#2a2a3a", // Subtle border color
          accent: "#6c63ff", // Primary purple accent (like neon lights)
          "accent-hover": "#5a52e0",
          success: "#00d084", // Green for connected/success states
          danger: "#ff4d4d", // Red for errors/disconnected
          muted: "#6b7280", // Gray for secondary text
          player: "#fbbf24", // Amber for local player highlight
          remote: "#60a5fa", // Blue for remote players
        },
      },

      // Custom font families for the game feel
      fontFamily: {
        game: ['"Press Start 2P"', "monospace"], // Pixel-art font (optional CDN import)
        body: ["Inter", "system-ui", "sans-serif"],
      },

      // Custom animations for UI elements
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px #6c63ff, 0 0 10px #6c63ff" },
          "50%": { boxShadow: "0 0 20px #6c63ff, 0 0 40px #6c63ff" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },

  plugins: [],
};
