// =============================================================================
// DASHBOARD PAGE (src/pages/DashboardPage.tsx)
// =============================================================================
// The main hub where users browse, create, and join virtual spaces.
// Includes interactive tab switcher for "My Spaces", "Public Spaces", and "Visited Rooms".
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/state/useStore";
import {
  getAllSpacesApi,
  getPublicSpacesApi,
  findOrCreateSpaceApi,
} from "@/api/space";
import { Button } from "@/components/ui";
import Navbar from "@/components/Navbar";
import CharacterDialog from "@/components/CharacterDialog";
import CreateSpaceDialog from "@/components/CreateSpaceDialog";
import type { Space } from "@/state/useStore";

// The 4 Official Starter Spaces in the Metaverse
const PUBLIC_SPACE_NAMES = new Set([
  "Central Metaverse HQ",
  "Cyberpunk Coffee Lounge",
  "Town Hall Auditorium",
  "Arcade & Recreation Hub",
]);

// Fallback templates in case backend public list is loading
const DEFAULT_PUBLIC_SPACES: Space[] = [
  {
    id: "space-hq",
    name: "Central Metaverse HQ",
    width: 80,
    height: 60,
    isPublic: true,
    creatorUsername: "Public",
  },
  {
    id: "space-cafe",
    name: "Cyberpunk Coffee Lounge",
    width: 60,
    height: 45,
    isPublic: true,
    creatorUsername: "Public",
  },
  {
    id: "space-auditorium",
    name: "Town Hall Auditorium",
    width: 100,
    height: 70,
    isPublic: true,
    creatorUsername: "Public",
  },
  {
    id: "space-arcade",
    name: "Arcade & Recreation Hub",
    width: 70,
    height: 50,
    isPublic: true,
    creatorUsername: "Public",
  },
];

type SpaceTab = "my" | "public" | "visited";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, spaces, setSpaces } = useStore();
  const visitedSpaces = useStore((state) => state.visitedSpaces) || [];

  // Active tab state: "my" (My Spaces) | "public" (Public Spaces) | "visited" (Visited Rooms)
  const [activeTab, setActiveTab] = useState<SpaceTab>("my");
  const [publicSpaces, setPublicSpaces] = useState<Space[]>([]);

  // Direct join input
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Which space the user clicked to join
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

  // Dialog visibility
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Loading/error state
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ===========================================================================
  // FETCH USER'S SPACES & PUBLIC SPACES ON MOUNT
  // ===========================================================================
  const fetchAllSpaces = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [userRes, publicRes] = await Promise.allSettled([
        getAllSpacesApi(),
        getPublicSpacesApi(),
      ]);

      if (userRes.status === "fulfilled") {
        // Exclude public spaces from personal user spaces
        const myCustomSpaces = (userRes.value.spaces || []).filter(
          (s) => !PUBLIC_SPACE_NAMES.has(s.name),
        );
        setSpaces(myCustomSpaces);
      }

      if (
        publicRes.status === "fulfilled" &&
        publicRes.value.spaces.length > 0
      ) {
        setPublicSpaces(publicRes.value.spaces);
      } else {
        setPublicSpaces(DEFAULT_PUBLIC_SPACES);
      }
    } catch {
      setLoadError("Failed to load spaces. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  }, [setSpaces]);

  useEffect(() => {
    fetchAllSpaces();
  }, [fetchAllSpaces]);

  const handleSpaceCreated = async (_newSpaceId: string) => {
    fetchAllSpaces();
  };

  const handleJoinSpace = async (space: Space) => {
    // If it's a public space with a template ID or need to ensure backend sync
    if (
      PUBLIC_SPACE_NAMES.has(space.name) &&
      (space.id.startsWith("space-") || !space.id)
    ) {
      try {
        const { spaceId } = await findOrCreateSpaceApi({
          name: space.name,
          width: space.width,
          height: space.height,
        });
        setSelectedSpace({ ...space, id: spaceId });
        setIsCharacterDialogOpen(true);
        return;
      } catch (err) {
        console.error("Failed to find or create public space:", err);
      }
    }
    setSelectedSpace(space);
    setIsCharacterDialogOpen(true);
  };

  const handleDirectJoin = () => {
    setJoinError(null);
    let id = joinInput.trim();
    if (!id) return;

    // If user pasted a full URL like http://localhost:5173/game/abc-123
    if (id.includes("/game/")) {
      id = id.split("/game/")[1].split("?")[0].split("#")[0];
    }

    if (!id) {
      setJoinError("Invalid Space link or ID.");
      return;
    }

    navigate(`/game/${id}`);
  };

  // Filter spaces lists
  const myCustomSpaces = spaces.filter((s) => !PUBLIC_SPACE_NAMES.has(s.name));
  const publicSpacesList =
    publicSpaces.length > 0 ? publicSpaces : DEFAULT_PUBLIC_SPACES;

  // Filter previously visited rooms so they don't duplicate user's own custom spaces
  const userSpaceIds = new Set(myCustomSpaces.map((s) => s.id));
  const otherVisitedSpaces = visitedSpaces.filter(
    (s) => !userSpaceIds.has(s.id),
  );

  return (
    <div className="min-h-screen bg-metaverse-bg selection:bg-metaverse-accent selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ================================================================
            WELCOME HEADER
            ================================================================ */}
        <div className="mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">
                Welcome back,{" "}
                <span className="neon-text">{user?.username}</span>!
              </h1>
            </div>
            <p className="text-metaverse-muted mt-1">
              Explore public metaverse rooms, manage your private spaces, or
              join via room ID.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsCreateDialogOpen(true)}
            className="self-start sm:self-auto shadow-lg shadow-metaverse-accent/20"
          >
            + Create Space
          </Button>
        </div>

        {/* ================================================================
            JOIN BY LINK / ID BAR
            ================================================================ */}
        <div className="glass-card p-4 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Paste room link (e.g. http://localhost:5173/game/...) or Space ID to join directly"
                value={joinInput}
                onChange={(e) => {
                  setJoinInput(e.target.value);
                  setJoinError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleDirectJoin()}
                className="w-full px-4 py-2.5 bg-metaverse-surface border border-metaverse-border rounded-lg text-white text-sm focus:outline-none focus:border-metaverse-accent placeholder-gray-500"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleDirectJoin}
              disabled={!joinInput.trim()}
              className="w-full sm:w-auto"
            >
              Enter Room
            </Button>
          </div>
          {joinError && (
            <p className="text-xs text-metaverse-danger mt-2">{joinError}</p>
          )}
        </div>

        {/* ================================================================
            TAB SWITCHER: MY SPACES vs PUBLIC SPACES vs VISITED ROOMS
            ================================================================ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-metaverse-border/60 pb-4 mb-8">
          <div className="flex items-center gap-2 p-1.5 bg-metaverse-surface/70 rounded-xl border border-metaverse-border">
            {/* Tab 1: My Spaces */}
            <button
              onClick={() => setActiveTab("my")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === "my"
                  ? "bg-metaverse-accent text-white shadow-md shadow-metaverse-accent/30"
                  : "text-metaverse-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <span>🏠</span>
              <span>My Spaces</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/40 font-mono">
                {myCustomSpaces.length}
              </span>
            </button>

            {/* Tab 2: Public Spaces */}
            <button
              onClick={() => setActiveTab("public")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === "public"
                  ? "bg-metaverse-accent text-white shadow-md shadow-metaverse-accent/30"
                  : "text-metaverse-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <span>🌐</span>
              <span>Public Spaces</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/40 font-mono">
                {publicSpacesList.length}
              </span>
            </button>

            {/* Tab 3: Visited Rooms */}
            <button
              onClick={() => setActiveTab("visited")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === "visited"
                  ? "bg-metaverse-accent text-white shadow-md shadow-metaverse-accent/30"
                  : "text-metaverse-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <span>🕒</span>
              <span>Visited Rooms</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/40 font-mono">
                {otherVisitedSpaces.length}
              </span>
            </button>
          </div>

          {activeTab === "my" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              + New Custom Space
            </Button>
          )}

          {activeTab === "public" && (
            <span className="text-xs text-metaverse-muted hidden sm:inline">
              🌟 All public spaces are open 24/7 for anyone to join
            </span>
          )}
        </div>

        {/* ================================================================
            TAB CONTENT
            ================================================================ */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card p-5 h-44 animate-pulse">
                <div className="h-4 bg-metaverse-border rounded w-3/4 mb-3" />
                <div className="h-3 bg-metaverse-border rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="glass-card p-8 text-center">
            <p className="text-metaverse-danger text-lg mb-2">
              Error: {loadError}
            </p>
            <p className="text-metaverse-muted text-sm">
              Make sure the FastAPI backend is running on{" "}
              <code className="text-metaverse-accent">
                http://localhost:8000
              </code>
            </p>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------------------
                TAB 1: MY SPACES
                ------------------------------------------------------------ */}
            {activeTab === "my" && (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Spaces Created by You ({myCustomSpaces.length})
                  </h2>
                  <p className="text-xs text-metaverse-muted">
                    Your personal rooms. Only you and players you invite can
                    access them.
                  </p>
                </div>

                {myCustomSpaces.length === 0 ? (
                  <div className="glass-card p-10 text-center animate-fade-in">
                    <span className="text-5xl mb-3 inline-block">🏰</span>
                    <h3 className="text-white font-bold text-lg mb-1">
                      No Custom Spaces Yet
                    </h3>
                    <p className="text-metaverse-muted text-sm max-w-md mx-auto mb-6">
                      You haven&apos;t created any personal spaces yet. Create
                      your own custom room or hang out in the official Public
                      Spaces!
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        variant="primary"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        + Create Your Space
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setActiveTab("public")}
                      >
                        Browse Public Spaces →
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                    {myCustomSpaces.map((space) => (
                      <SpaceCard
                        key={space.id}
                        space={space}
                        type="my"
                        onJoin={() => handleJoinSpace(space)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------
                TAB 2: PUBLIC SPACES
                ------------------------------------------------------------ */}
            {activeTab === "public" && (
              <div>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌐</span>
                    <h2 className="text-xl font-bold text-white">
                      Official Public Spaces ({publicSpacesList.length})
                    </h2>
                  </div>
                  <p className="text-xs text-metaverse-muted">
                    Permanent public metaverse worlds open to everyone. Avatars
                    from anywhere connect to the same space!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
                  {publicSpacesList.map((space) => (
                    <SpaceCard
                      key={space.id || space.name}
                      space={space}
                      type="public"
                      onJoin={() => handleJoinSpace(space)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------
                TAB 3: VISITED ROOMS
                ------------------------------------------------------------ */}
            {activeTab === "visited" && (
              <div>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🕒</span>
                    <h2 className="text-xl font-bold text-white">
                      Previously Visited Rooms ({otherVisitedSpaces.length})
                    </h2>
                  </div>
                  <p className="text-xs text-metaverse-muted">
                    Rooms you previously joined via invite link or explored.
                    Easily return anytime!
                  </p>
                </div>

                {otherVisitedSpaces.length === 0 ? (
                  <div className="glass-card p-10 text-center animate-fade-in text-metaverse-muted">
                    <span className="text-4xl mb-2 inline-block">🚪</span>
                    <h3 className="text-white font-semibold text-base mb-1">
                      No Visited Rooms Yet
                    </h3>
                    <p className="text-xs text-metaverse-muted max-w-sm mx-auto mb-4">
                      Rooms you join via invite links or explore will be saved
                      here automatically.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab("public")}
                    >
                      Explore Public Spaces →
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                    {otherVisitedSpaces.map((space) => (
                      <SpaceCard
                        key={space.id}
                        space={space}
                        type={
                          PUBLIC_SPACE_NAMES.has(space.name)
                            ? "public"
                            : "visited"
                        }
                        onJoin={() => handleJoinSpace(space)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Dialogs */}
      {selectedSpace && (
        <CharacterDialog
          isOpen={isCharacterDialogOpen}
          onClose={() => {
            setIsCharacterDialogOpen(false);
            setSelectedSpace(null);
          }}
          space={selectedSpace}
        />
      )}

      <CreateSpaceDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleSpaceCreated}
      />
    </div>
  );
}

// =============================================================================
// SPACE CARD COMPONENT
// =============================================================================
function SpaceCard({
  space,
  type = "my",
  onJoin,
}: {
  space: Space;
  type?: "my" | "public" | "visited";
  onJoin: () => void;
}) {
  const isPublic =
    type === "public" || space.isPublic || PUBLIC_SPACE_NAMES.has(space.name);

  const badgeText = isPublic
    ? "🌐 Public"
    : type === "my"
      ? "👑 My Room"
      : "🕒 Visited";

  // Public spaces are ALWAYS attributed as Public / Official — never test-1!
  const creatorText = isPublic
    ? "Public / Official"
    : type === "my"
      ? "Created by You"
      : space.creatorUsername || "Community Room";

  // Space-themed icon based on title
  const getIcon = (name: string) => {
    if (name.includes("Coffee") || name.includes("Lounge")) return "☕";
    if (name.includes("Auditorium") || name.includes("Hall")) return "🏛️";
    if (name.includes("Arcade") || name.includes("Hub")) return "🕹️";
    if (name.includes("HQ") || name.includes("Office")) return "🏢";
    return "🚀";
  };

  return (
    <div className="glass-card p-5 hover:border-metaverse-accent/50 transition-all duration-300 group flex flex-col justify-between hover:shadow-xl hover:shadow-metaverse-accent/10 hover:-translate-y-0.5">
      <div>
        <div className="w-full h-24 rounded-lg bg-gradient-to-br from-metaverse-accent/20 via-metaverse-surface to-metaverse-surface mb-4 flex items-center justify-between px-4 border border-metaverse-border">
          <span className="text-4xl group-hover:scale-110 transition-transform">
            {getIcon(space.name)}
          </span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              isPublic
                ? "bg-metaverse-accent/20 border-metaverse-accent/50 text-metaverse-accent"
                : "bg-metaverse-surface border-metaverse-border text-metaverse-muted"
            }`}
          >
            {badgeText}
          </span>
        </div>

        <h3 className="text-white font-bold text-base mb-1.5 group-hover:text-metaverse-accent transition-colors truncate">
          {space.name}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-metaverse-muted mb-3">
          <span>Created by:</span>
          <span
            className={
              isPublic
                ? "text-metaverse-accent font-semibold"
                : "text-gray-300 font-medium"
            }
          >
            {creatorText}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-metaverse-muted mb-5">
          <span>
            {space.width} × {space.height} tiles
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-metaverse-success font-medium">
            <span className="w-1.5 h-1.5 bg-metaverse-success rounded-full animate-pulse" />
            {isPublic ? "Open Server" : "Ready"}
          </span>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="w-full shadow-md group-hover:shadow-metaverse-accent/20"
        onClick={onJoin}
      >
        {isPublic ? "Join Public Space →" : "Enter Space →"}
      </Button>
    </div>
  );
}
