// =============================================================================
// NAVBAR (src/components/Navbar.tsx)
// =============================================================================
// The top navigation bar shown on Dashboard and other protected pages.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useStore } from "@/state/useStore";
import { Button } from "@/components/ui";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useStore();

  const handleLogout = () => {
    logout(); // Clears token + user from Zustand and localStorage
    navigate("/signin"); // Redirect to sign-in page
  };

  return (
    <nav className="sticky top-0 z-40 glass-card border-b border-metaverse-border rounded-none px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <div className="w-8 h-8 bg-metaverse-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="font-bold text-white text-lg">Metaverse 2D</span>
        </div>

        {/* Right side: user info + logout */}
        {user && (
          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-metaverse-accent/20 border border-metaverse-accent/40 rounded-full flex items-center justify-center">
                <span className="text-metaverse-accent text-sm font-bold">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {user.username}
                </p>
                <p className="text-xs text-metaverse-muted">Member</p>
              </div>
            </div>

            {/* Logout button */}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
