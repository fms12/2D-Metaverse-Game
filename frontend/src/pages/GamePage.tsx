// =============================================================================
// GAME PAGE (src/pages/GamePage.tsx)
// =============================================================================
// The actual game screen — a full-screen canvas with WebSocket gameplay.
//
// 🎓 ROUTING PARAMS WITH useParams:
// Our route is defined as: <Route path="/game/:spaceId" ...>
// The ":spaceId" part is a URL parameter.
// useParams() extracts it: const { spaceId } = useParams();
//
// Example URL: /game/abc-123-def
// useParams() → { spaceId: "abc-123-def" }
//
// 🎓 PAGE LIFECYCLE:
// 1. User clicks "Join" on dashboard → navigate("/game/spaceId")
// 2. React renders GamePage with spaceId from URL
// 3. useEffect fetches space details from GET /api/v1/space/:spaceId
// 4. Space details are passed to GameCanvas
// 5. GameCanvas initializes the GameEngine and WebSocket
// =============================================================================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSpaceApi } from "@/api/space";
import { useStore } from "@/state/useStore";
import GameCanvas from "@/components/GameCanvas";
import type { SpaceDetail } from "@/api/space";

export default function GamePage() {
  // Extract spaceId from the URL: /game/:spaceId
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const addVisitedSpace = useStore((state) => state.addVisitedSpace);

  // Space details fetched from the API (we need width and height for the game engine)
  const [space, setSpace] = useState<SpaceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===========================================================================
  // FETCH SPACE DETAILS
  // ===========================================================================
  useEffect(() => {
    if (!spaceId) {
      navigate("/dashboard");
      return;
    }

    const fetchSpace = async () => {
      try {
        const spaceData = await getSpaceApi(spaceId);
        setSpace(spaceData);
        // Track this space in user's visited rooms history!
        addVisitedSpace({
          id: spaceData.id,
          name: spaceData.name,
          width: spaceData.width,
          height: spaceData.height,
        });
      } catch {
        setError("Space not found or access denied.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpace();
  }, [spaceId, navigate, addVisitedSpace]);

  // ===========================================================================
  // LOADING SCREEN
  // ===========================================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-metaverse-bg flex items-center justify-center">
        <div className="text-center animate-fade-in">
          {/* Spinning loader */}
          <div className="w-16 h-16 border-4 border-metaverse-border border-t-metaverse-accent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-white text-xl font-bold mb-2">
            Loading Space...
          </h2>
          <p className="text-metaverse-muted text-sm">
            Connecting to the virtual world
          </p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ERROR SCREEN
  // ===========================================================================
  if (error || !space) {
    return (
      <div className="min-h-screen bg-metaverse-bg flex items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center animate-fade-in">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-white text-xl font-bold mb-2">
            Cannot Enter Space
          </h2>
          <p className="text-metaverse-muted mb-6">
            {error || "This space does not exist."}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 bg-metaverse-accent text-white rounded-lg hover:bg-metaverse-accent-hover transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // GAME SCREEN — Full screen canvas with WebSocket game
  // ===========================================================================
  return (
    <GameCanvas
      spaceId={space.id}
      spaceName={space.name}
      spaceWidth={space.width}
      spaceHeight={space.height}
      onLeave={() => navigate("/dashboard")}
    />
  );
}
