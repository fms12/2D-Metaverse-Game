// =============================================================================
// ROOT APP COMPONENT (src/App.tsx)
// =============================================================================
// This is the ROOT component of our React application.
// Its ONLY job is to set up CLIENT-SIDE ROUTING between all our pages.
//
// 🎓 WHAT IS CLIENT-SIDE ROUTING?
// In a traditional website, clicking a link sends a request to the server,
// which returns a completely new HTML page. The browser completely reloads.
//
// In a React SPA (Single Page Application), clicking a link:
// 1. Intercepts the navigation (no server request!)
// 2. Updates the URL in the browser address bar
// 3. Tells React to render a different component ("page")
// 4. The user sees a new "page" almost INSTANTLY
//
// This is called Client-Side Routing, and we use the library "react-router-dom" for it.
//
// 🎓 react-router-dom KEY CONCEPTS:
// - BrowserRouter: Wraps the entire app. Uses the HTML5 History API to manage URLs.
// - Routes: A container that holds all Route definitions.
// - Route: Maps a URL path to a React component.
//   Example: <Route path="/dashboard" element={<DashboardPage />} />
//   When URL is /dashboard, DashboardPage component is rendered.
// - Navigate: Programmatically redirect the user to a different path.
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "@/state/useStore";

// Import all page components
import LandingPage from "@/pages/LandingPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import DashboardPage from "@/pages/DashboardPage";
import GamePage from "@/pages/GamePage";

// =============================================================================
// PROTECTED ROUTE COMPONENT
// =============================================================================
// A "Protected Route" only allows access if the user is authenticated.
// If not logged in, it redirects to the sign-in page.
//
// 🎓 HOW IT WORKS:
// ProtectedRoute wraps a component. Before rendering children,
// it checks if there's a JWT token in our Zustand store.
// - If YES: Show the children (the actual page)
// - If NO: Redirect to /signin
//
// This is equivalent to the @require_user dependency in our FastAPI backend!
// Backend guards APIs with HTTP 403. Frontend guards pages with redirects.
// =============================================================================
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Get the token from our global Zustand store
  const { token } = useStore();

  // If no token, redirect to sign-in page
  // "replace" means the browser Back button won't go back to the blocked page
  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  // Otherwise, render the requested page
  return <>{children}</>;
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================
export default function App() {
  return (
    // BrowserRouter: Provides routing context to all child components.
    // Everything that needs routing MUST be inside BrowserRouter.
    <BrowserRouter>
      {/*
        Routes: Only ONE matching Route renders at a time.
        React Router looks at the current URL and renders the FIRST matching route.
      */}
      <Routes>
        {/* Public routes (no authentication required) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Protected routes (must be logged in) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:spaceId"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all: Any unknown URL redirects to the landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
