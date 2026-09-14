// =============================================================================
// APP ENTRY POINT (src/main.tsx)
// =============================================================================
// This is the FIRST file that runs when the browser loads our app.
//
// 🎓 THE JOURNEY OF A REACT APP:
// 1. Browser loads index.html
// 2. Browser sees <script type="module" src="/src/main.tsx">
// 3. Vite compiles main.tsx (and everything it imports) into JavaScript
// 4. main.tsx calls ReactDOM.createRoot() to take over the #root div
// 5. React renders <App /> into that div
// 6. From this point, React controls the entire page!
//
// 🎓 WHY NO React.StrictMode HERE?
// In React 18 development mode, <React.StrictMode> intentionally mounts,
// unmounts, and re-mounts every component within milliseconds.
// For standard UI components this tests idempotency, but for stateful
// WebSocket connections and HTML5 Canvas game loops, this immediate abort
// breaks active TCP handshakes with:
// "The connection to ws://... was interrupted while the page was loading."
// Disabling StrictMode in game engines (Phaser, Three.js, Metaverse) ensures
// clean, single-instance WebSocket connections.
// =============================================================================

import ReactDOM from "react-dom/client";

// Import our root App component (handles routing between all pages)
import App from "./App";

// Import global CSS — Tailwind + custom styles
import "./index.css";

// ReactDOM.createRoot: Creates a React "root" and attaches it to the DOM element.
const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

// Render our entire React application
root.render(<App />);
