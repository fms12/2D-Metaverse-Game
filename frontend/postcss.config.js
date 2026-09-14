// postcss.config.js
// PostCSS is a tool for transforming CSS with JavaScript plugins.
//
// 🎓 HOW THE CSS BUILD PIPELINE WORKS:
// 1. You write Tailwind utility classes in your JSX files.
// 2. Vite builds your project and sends CSS through PostCSS.
// 3. PostCSS runs the "tailwindcss" plugin — which generates the actual CSS rules.
// 4. PostCSS runs "autoprefixer" — which adds browser-specific prefixes like:
//    -webkit-transform, -moz-transform so older browsers understand modern CSS.
// 5. The final CSS is bundled and served to the browser.
//
// Think of PostCSS as an assembly line: CSS goes in, gets processed by workers
// (plugins), and comes out as better, more compatible CSS.
export default {
  plugins: {
    tailwindcss: {}, // Generates all the utility CSS classes you use
    autoprefixer: {}, // Adds -webkit-/-moz- prefixes for cross-browser support
  },
};
