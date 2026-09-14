// =============================================================================
// LANDING PAGE (src/pages/LandingPage.tsx)
// =============================================================================
// The public homepage featuring 4 starter spaces.
// Users can click ANY space to sign up and jump directly into that virtual world!
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useStore, type StarterSpace } from "@/state/useStore";
import { findOrCreateSpaceApi } from "@/api/space";
import { Button } from "@/components/ui";

// 4 Featured Starter Spaces
const STARTER_SPACES: (StarterSpace & {
  id: string;
  badge: string;
  gradient: string;
})[] = [
  {
    id: "space-hq",
    name: "Central Metaverse HQ",
    width: 80,
    height: 60,
    description:
      "The primary virtual office for team standups, collaboration, and daily work.",
    icon: "🏢",
    badge: "Popular",
    gradient: "from-purple-600/30 via-indigo-600/20 to-transparent",
  },
  {
    id: "space-cafe",
    name: "Cyberpunk Coffee Lounge",
    width: 60,
    height: 45,
    description:
      "Relaxed social cafe with ambient vibes to grab coffee and chat with teammates.",
    icon: "☕",
    badge: "Social",
    gradient: "from-amber-600/30 via-orange-600/20 to-transparent",
  },
  {
    id: "space-auditorium",
    name: "Town Hall Auditorium",
    width: 100,
    height: 70,
    description:
      "Spacious arena built for company-wide all-hands meetings, keynotes, and live talks.",
    icon: "🏛️",
    badge: "Events",
    gradient: "from-blue-600/30 via-cyan-600/20 to-transparent",
  },
  {
    id: "space-arcade",
    name: "Arcade & Recreation Hub",
    width: 70,
    height: 50,
    description:
      "Fun recreational space with casual hangout pods, games, and meetup zones.",
    icon: "🕹️",
    badge: "Casual",
    gradient: "from-emerald-600/30 via-teal-600/20 to-transparent",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { token, setPendingSpace } = useStore();

  const handleSelectSpace = async (space: (typeof STARTER_SPACES)[0]) => {
    // Save selected space so the signup/signin page knows where to route next
    setPendingSpace({
      name: space.name,
      width: space.width,
      height: space.height,
      description: space.description,
      icon: space.icon,
    });

    if (token) {
      // If already signed in, join the shared space (or create it if first visitor)!
      try {
        const { spaceId } = await findOrCreateSpaceApi({
          name: space.name,
          width: space.width,
          height: space.height,
        });
        setPendingSpace(null);
        navigate(`/game/${spaceId}`);
      } catch {
        navigate("/dashboard");
      }
    } else {
      // Not logged in -> go to quick signup
      navigate("/signup");
    }
  };

  return (
    <div className="min-h-screen bg-metaverse-bg flex flex-col selection:bg-metaverse-accent selection:text-white">
      {/* ================================================================
          TOP NAVBAR
          ================================================================ */}
      <nav className="border-b border-metaverse-border/50 backdrop-blur-md sticky top-0 z-40 bg-metaverse-bg/80">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-9 h-9 bg-metaverse-accent rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-metaverse-accent/30">
              M
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              Metaverse 2D
            </span>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <Button variant="primary" onClick={() => navigate("/dashboard")}>
                Go to Dashboard →
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/signin")}>
                  Sign In
                </Button>
                <Button variant="primary" onClick={() => navigate("/signup")}>
                  Sign Up Free
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 md:py-16 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-metaverse-accent/15 border border-metaverse-accent/30 text-metaverse-accent text-xs font-semibold mb-6">
            <span className="w-2 h-2 bg-metaverse-success rounded-full animate-pulse" />
            2D Real-time Virtual World
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Pick a Space & <br className="hidden sm:inline" />
            <span className="neon-text">Step Inside the Metaverse</span>
          </h1>

          <p className="text-base sm:text-lg text-metaverse-muted max-w-2xl mx-auto">
            Choose any virtual room below to jump right in. Move with WASD, meet
            other avatars in real time, and experience interactive spatial
            collaboration.
          </p>
        </div>

        {/* ================================================================
            4 FEATURED STARTER SPACES
            ================================================================ */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Public Virtual Spaces
                </h2>
              </div>
              <p className="text-sm text-metaverse-muted mt-0.5">
                Official shared metaverse rooms open to everyone — no host
                required
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STARTER_SPACES.map((space) => (
              <div
                key={space.id}
                onClick={() => handleSelectSpace(space)}
                className="glass-card p-6 flex flex-col justify-between hover:border-metaverse-accent transition-all duration-300 group cursor-pointer hover:shadow-xl hover:shadow-metaverse-accent/10 hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Accent glow background */}
                <div
                  className={
                    "absolute inset-0 bg-gradient-to-b " +
                    space.gradient +
                    " pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"
                  }
                />

                <div className="relative z-10">
                  {/* Top row: Icon and badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl group-hover:scale-110 transition-transform">
                      {space.icon}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-metaverse-accent/15 border border-metaverse-accent/40 text-metaverse-accent flex items-center gap-1">
                      <span>🌐</span> Public
                    </span>
                  </div>

                  {/* Title and description */}
                  <h3 className="text-lg font-bold text-white group-hover:text-metaverse-accent transition-colors mb-2">
                    {space.name}
                  </h3>
                  <p className="text-xs text-metaverse-muted leading-relaxed mb-4">
                    {space.description}
                  </p>
                </div>

                <div className="relative z-10 pt-4 border-t border-metaverse-border/50">
                  <div className="flex items-center justify-between text-xs text-metaverse-muted mb-3">
                    <span>
                      {space.width} x {space.height} tiles
                    </span>
                    <span className="flex items-center gap-1 text-metaverse-success font-medium">
                      <span className="w-1.5 h-1.5 bg-metaverse-success rounded-full animate-pulse" />
                      Public Server
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full shadow-md group-hover:shadow-metaverse-accent/25"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSpace(space);
                    }}
                  >
                    Enter Public Space →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-metaverse-border/40 text-center sm:text-left">
          <div className="glass-card p-5">
            <span className="text-2xl mb-2 inline-block">🚀</span>
            <h4 className="text-white font-semibold text-sm mb-1">
              Instant Access
            </h4>
            <p className="text-xs text-metaverse-muted">
              Select any space, create a quick free account, and get dropped in
              straight away.
            </p>
          </div>
          <div className="glass-card p-5">
            <span className="text-2xl mb-2 inline-block">⚡</span>
            <h4 className="text-white font-semibold text-sm mb-1">
              FastAPI WebSocket Engine
            </h4>
            <p className="text-xs text-metaverse-muted">
              Sub-millisecond position broadcasting powered by native WebSockets
              with anti-cheat movement validation.
            </p>
          </div>
          <div className="glass-card p-5">
            <span className="text-2xl mb-2 inline-block">🎨</span>
            <h4 className="text-white font-semibold text-sm mb-1">
              Spacious 2D Canvas
            </h4>
            <p className="text-xs text-metaverse-muted">
              Generous grid dimensions with auto-centering camera tracking and
              smooth interpolation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-metaverse-muted border-t border-metaverse-border/40">
        Built with FastAPI + React + TypeScript | 2D Spatial Metaverse
      </footer>
    </div>
  );
}
