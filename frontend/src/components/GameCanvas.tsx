// =============================================================================
// GAME CANVAS (src/components/GameCanvas.tsx)
// =============================================================================
// The React component hosting the HTML5 <canvas> element for real-time gameplay.
//
// 🎓 LIFECYCLE & STABILITY:
// - Uses stable refs for engine, WS client, and current user info to prevent
//   unnecessary reconnections when parent components or store state re-render.
// - Buffers incoming events (user-joined, movement) until GameEngine.init()
//   and onSpaceJoined() complete, ensuring zero lost player avatars.
// =============================================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine } from "@/game/GameEngine";
import { createWSClient, type WSClient } from "@/realtime/wsClient";
import { useStore } from "@/state/useStore";
import ChatPanel from "./ChatPanel";

interface GameCanvasProps {
  spaceId: string;
  spaceName: string;
  spaceWidth: number;
  spaceHeight: number;
  onLeave: () => void;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type QueuedEvent =
  | {
      type: "user-joined";
      userId: string;
      username?: string;
      x: number;
      y: number;
    }
  | { type: "movement"; userId: string; x: number; y: number }
  | { type: "user-left"; userId: string }
  | { type: "movement-rejected"; x: number; y: number };

const PUBLIC_SPACE_NAMES = new Set([
  "Central Metaverse HQ",
  "Cyberpunk Coffee Lounge",
  "Town Hall Auditorium",
  "Arcade & Recreation Hub",
]);

export default function GameCanvas({
  spaceId,
  spaceName,
  spaceWidth,
  spaceHeight,
  onLeave,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const wsRef = useRef<WSClient | null>(null);
  const engineReadyRef = useRef<boolean>(false);
  const eventQueueRef = useRef<QueuedEvent[]>([]);

  // UI state
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [statusMessage, setStatusMessage] = useState("Connecting to space...");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [copied, setCopied] = useState(false);

  // Store selections
  const user = useStore((state) => state.user);
  const selectedCharacter = useStore((state) => state.selectedCharacter);

  // Keep latest user & character in refs so callbacks never get stale closures
  const userRef = useRef(user);
  userRef.current = user;
  const characterRef = useRef(selectedCharacter);
  characterRef.current = selectedCharacter;

  // Replay buffered events once engine is fully ready
  const replayQueuedEvents = useCallback((engine: GameEngine) => {
    const queue = [...eventQueueRef.current];
    eventQueueRef.current = [];

    if (queue.length > 0) {
      console.log(`[GameCanvas] Replaying ${queue.length} buffered events`);
      for (const ev of queue) {
        switch (ev.type) {
          case "user-joined":
            engine.onUserJoined(ev.userId, ev.x, ev.y, ev.username);
            break;
          case "movement":
            engine.onMovement(ev.userId, ev.x, ev.y);
            break;
          case "user-left":
            engine.onUserLeft(ev.userId);
            break;
          case "movement-rejected":
            engine.onMovementRejected(ev.x, ev.y);
            break;
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !userRef.current) return;

    const canvas = canvasRef.current;
    engineReadyRef.current = false;
    eventQueueRef.current = [];

    const ws = createWSClient({
      onSpaceJoined: (spawn, existingUsers) => {
        console.log(
          "[GameCanvas] Space joined. Spawn:",
          spawn,
          "Existing users:",
          existingUsers,
        );
        setStatus("connected");
        setStatusMessage(`Connected to ${spaceName}`);
        setPlayerCount(existingUsers.length + 1);

        const engine = new GameEngine({
          canvas,
          spaceId,
          spaceName,
          spaceWidth,
          spaceHeight,
          username: userRef.current?.username || "Player",
          character: characterRef.current || "male",
          wsClient: ws,
        });

        engineRef.current = engine;

        engine.init().then(() => {
          engine.onSpaceJoined(spawn, existingUsers);
          engineReadyRef.current = true;
          replayQueuedEvents(engine);
        });
      },

      onUserJoined: (userId, x, y, username) => {
        console.log(
          `[GameCanvas] User joined event: ${username || userId} (${userId}) at (${x}, ${y})`,
        );
        if (engineReadyRef.current && engineRef.current) {
          engineRef.current.onUserJoined(userId, x, y, username);
        } else {
          eventQueueRef.current.push({
            type: "user-joined",
            userId,
            username,
            x,
            y,
          });
        }
        setPlayerCount((n) => n + 1);
      },

      onMovement: (userId, x, y) => {
        if (engineReadyRef.current && engineRef.current) {
          engineRef.current.onMovement(userId, x, y);
        } else {
          eventQueueRef.current.push({ type: "movement", userId, x, y });
        }
      },

      onMovementRejected: (x, y) => {
        if (engineReadyRef.current && engineRef.current) {
          engineRef.current.onMovementRejected(x, y);
        } else {
          eventQueueRef.current.push({ type: "movement-rejected", x, y });
        }
      },

      onUserLeft: (userId) => {
        console.log(`[GameCanvas] User left event: ${userId}`);
        if (engineReadyRef.current && engineRef.current) {
          engineRef.current.onUserLeft(userId);
        } else {
          eventQueueRef.current.push({ type: "user-left", userId });
        }
        setPlayerCount((n) => Math.max(1, n - 1));
      },

      onError: (error) => {
        console.warn("[GameCanvas] WS error:", error);
        setStatus("error");
        setStatusMessage(error);
      },

      onClose: () => {
        console.log("[GameCanvas] WS closed");
        setStatus("disconnected");
        setStatusMessage("Disconnected from space");
      },
    });

    wsRef.current = ws;
    ws.connect(spaceId);

    return () => {
      engineReadyRef.current = false;
      eventQueueRef.current = [];
      engineRef.current?.destroy();
      wsRef.current?.disconnect();
      engineRef.current = null;
      wsRef.current = null;
    };
  }, [spaceId, spaceName, spaceWidth, spaceHeight, replayQueuedEvents]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, []);

  const handleLeave = useCallback(() => {
    engineReadyRef.current = false;
    engineRef.current?.destroy();
    wsRef.current?.disconnect();
    onLeave();
  }, [onLeave]);

  return (
    <div className="game-container">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between pointer-events-none">
        {/* Left: Space info & connection status */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="glass-card px-4 py-2">
            <p className="text-white font-bold text-sm">{spaceName}</p>
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-sm">{spaceName}</p>
              {PUBLIC_SPACE_NAMES.has(spaceName) && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-metaverse-accent/20 border border-metaverse-accent/50 text-metaverse-accent">
                  🌐 Public
                </span>
              )}
            </div>
            <div
              className={`status-pill mt-1 ${
                status === "connected"
                  ? "text-metaverse-success"
                  : status === "error" || status === "disconnected"
                    ? "text-metaverse-danger"
                    : "text-yellow-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === "connected"
                    ? "bg-metaverse-success animate-pulse"
                    : "bg-current"
                }`}
              />
              {statusMessage}
            </div>
          </div>

          {/* Player Count */}
          <div className="glass-card px-3 py-1.5 text-xs text-metaverse-muted">
            👥 {playerCount} player{playerCount !== 1 ? "s" : ""} online
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Copy Invite Link */}
          <button
            onClick={handleCopyLink}
            className={`glass-card px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${
              copied
                ? "bg-metaverse-success/20 text-metaverse-success border-metaverse-success/50"
                : "text-white hover:bg-metaverse-surface"
            }`}
            title="Copy URL to invite other players into this exact room"
          >
            {copied ? "✅ Link Copied!" : "🔗 Share Room Link"}
          </button>

          <button
            onClick={() => setIsChatOpen((v) => !v)}
            className="glass-card px-3 py-2 text-sm text-white hover:bg-metaverse-surface transition-colors"
          >
            💬 Chat
          </button>
          <button
            onClick={handleLeave}
            className="glass-card px-3 py-2 text-sm text-metaverse-danger hover:bg-metaverse-danger/10 transition-colors"
          >
            🚪 Leave
          </button>
        </div>
      </div>

      {/* Controls Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-xs text-metaverse-muted pointer-events-none">
        Move: <kbd className="text-white">WASD</kbd> or{" "}
        <kbd className="text-white">Arrow Keys</kbd>
      </div>

      {/* Chat panel */}
      {isChatOpen && <ChatPanel onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}
