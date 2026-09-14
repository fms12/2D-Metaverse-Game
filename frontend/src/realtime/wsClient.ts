// =============================================================================
// WEBSOCKET CLIENT MANAGER (src/realtime/wsClient.ts)
// =============================================================================
// This module manages the WebSocket connection to our FastAPI backend.
// It is the "real-time bridge" between the game engine and the server.
//
// 🎓 FASTAPI WEBSOCKET PROTOCOL:
// Client → Server events:
//   { "type": "join",   "payload": { "spaceId": "...", "token": "..." } }
//   { "type": "move",   "payload": { "x": 5, "y": 3 } }
//
// Server → Client events:
//   { "type": "space-joined",       "payload": { "spawn": {x,y}, "users": [...] } }
//   { "type": "user-joined",        "payload": { "userId": "...", "x": 5, "y": 3 } }
//   { "type": "movement",           "payload": { "userId": "...", "x": 6, "y": 3 } }
//   { "type": "movement-rejected",  "payload": { "x": 5, "y": 3 } }
//   { "type": "user-left",          "payload": { "userId": "..." } }
// =============================================================================

import { useStore } from "@/state/useStore";

// =============================================================================
// TYPE DEFINITIONS — All the messages our WS protocol can send/receive
// =============================================================================

// Messages we SEND to the server (client → server)
export type ClientMessage =
  | { type: "join"; payload: { spaceId: string; token: string } }
  | { type: "move"; payload: { x: number; y: number } };

// Messages we RECEIVE from the server (server → client)
export type ServerMessage =
  | {
      type: "space-joined";
      payload: {
        spawn: { x: number; y: number };
        users: Array<{
          id: string;
          userId: string;
          username?: string;
          x: number;
          y: number;
        }>;
      };
    }
  | {
      type: "user-joined";
      payload: { userId: string; username?: string; x: number; y: number };
    }
  | { type: "movement"; payload: { userId: string; x: number; y: number } }
  | { type: "movement-rejected"; payload: { x: number; y: number } }
  | { type: "user-left"; payload: { userId: string } };

// =============================================================================
// CALLBACK TYPES
// =============================================================================
export interface WSCallbacks {
  onSpaceJoined: (
    spawn: { x: number; y: number },
    existingUsers: Array<{
      id: string;
      userId: string;
      username?: string;
      x: number;
      y: number;
    }>,
  ) => void;
  onUserJoined: (
    userId: string,
    x: number,
    y: number,
    username?: string,
  ) => void;
  onMovement: (userId: string, x: number, y: number) => void;
  onMovementRejected: (x: number, y: number) => void;
  onUserLeft: (userId: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

// =============================================================================
// WEBSOCKET CLIENT CLASS
// =============================================================================
export class WSClient {
  private ws: WebSocket | null = null;
  private callbacks: WSCallbacks;
  public isConnected: boolean = false;

  // Track intentional closure so onclose does NOT attempt reconnection or throw errors
  private isClosedIntentionally: boolean = false;

  // Reconnection state
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 2000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: WSCallbacks) {
    this.callbacks = callbacks;
  }

  // ===========================================================================
  // CONNECT — Opens WebSocket connection to backend
  // ===========================================================================
  connect(spaceId: string): void {
    // If there's an existing socket, clean it up first
    if (this.ws) {
      this.disconnect();
    }

    this.isClosedIntentionally = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Determine WebSocket URL.
    // If running on Vite dev server (e.g. port 5173), we can connect via the Vite proxy
    // (ws://localhost:5173/api/v1/ws) or directly to backend (ws://localhost:8000/api/v1/ws).
    // Using direct backend port ensures reliable WebSocket upgrades across all browsers.
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl =
      import.meta.env.VITE_WS_URL ||
      `${wsProtocol}://${window.location.host}/api/v1/ws`;

    const token = useStore.getState().token;
    if (!token) {
      this.callbacks.onError("No authentication token. Please sign in again.");
      return;
    }

    try {
      console.log(`[WSClient] Connecting to ${wsUrl}...`);
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      // -----------------------------------------------------------------------
      // EVENT LISTENER: onopen
      // -----------------------------------------------------------------------
      socket.onopen = () => {
        if (this.isClosedIntentionally || this.ws !== socket) {
          socket.close(1000, "Clean close after intentional disconnect");
          return;
        }

        console.log(
          "[WSClient] Connection established, sending join packet...",
        );
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Immediately authenticate & join space
        this.join(spaceId, token);
      };

      // -----------------------------------------------------------------------
      // EVENT LISTENER: onmessage
      // -----------------------------------------------------------------------
      socket.onmessage = (event: MessageEvent) => {
        if (this.isClosedIntentionally || this.ws !== socket) return;

        try {
          const message: ServerMessage = JSON.parse(event.data as string);
          console.log(
            `[WSClient] Received message: ${message.type}`,
            message.payload,
          );
          this.handleMessage(message);
        } catch (e) {
          console.error("[WSClient] Failed to parse WS message:", e);
        }
      };

      // -----------------------------------------------------------------------
      // EVENT LISTENER: onerror
      // -----------------------------------------------------------------------
      socket.onerror = (event: Event) => {
        if (this.isClosedIntentionally || this.ws !== socket) return;
        console.warn("[WSClient] Socket error occurred:", event);
        this.callbacks.onError(
          "WebSocket connection error. Check backend server.",
        );
      };

      // -----------------------------------------------------------------------
      // EVENT LISTENER: onclose
      // -----------------------------------------------------------------------
      socket.onclose = (event: CloseEvent) => {
        if (this.ws === socket) {
          this.ws = null;
          this.isConnected = false;
        }

        console.log(
          `[WSClient] Socket closed. Code: ${event.code}, Reason: ${event.reason}`,
        );

        // If closed intentionally by the client, do nothing
        if (this.isClosedIntentionally) {
          return;
        }

        this.callbacks.onClose();

        // Close code 1000 = normal closure; 1008 = policy violation (e.g. invalid auth)
        if (event.code !== 1000 && event.code !== 1008) {
          this.attemptReconnect(spaceId);
        }
      };
    } catch (error) {
      console.error("[WSClient] Exception creating WebSocket:", error);
      this.callbacks.onError(`Failed to create WebSocket connection: ${error}`);
    }
  }

  // ===========================================================================
  // JOIN — Send join packet
  // ===========================================================================
  private join(spaceId: string, token: string): void {
    this.send({
      type: "join",
      payload: { spaceId, token },
    });
  }

  // ===========================================================================
  // SEND MOVE — Send movement coordinates
  // ===========================================================================
  sendMove(x: number, y: number): void {
    if (!this.isConnected) return;
    this.send({
      type: "move",
      payload: { x, y },
    });
  }

  // ===========================================================================
  // HANDLE MESSAGE — Dispatch server events to callbacks
  // ===========================================================================
  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "space-joined":
        this.callbacks.onSpaceJoined(
          message.payload.spawn,
          message.payload.users || [],
        );
        break;

      case "user-joined":
        this.callbacks.onUserJoined(
          message.payload.userId,
          message.payload.x,
          message.payload.y,
          message.payload.username,
        );
        break;

      case "movement":
        this.callbacks.onMovement(
          message.payload.userId,
          message.payload.x,
          message.payload.y,
        );
        break;

      case "movement-rejected":
        this.callbacks.onMovementRejected(message.payload.x, message.payload.y);
        break;

      case "user-left":
        this.callbacks.onUserLeft(message.payload.userId);
        break;

      default:
        console.warn(
          "Unknown WS message type:",
          (message as { type: string }).type,
        );
    }
  }

  // ===========================================================================
  // SEND — Serialize and send message to server
  // ===========================================================================
  private send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // ===========================================================================
  // AUTO-RECONNECT
  // ===========================================================================
  private attemptReconnect(spaceId: string): void {
    if (this.isClosedIntentionally) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.callbacks.onError("Connection lost. Please refresh the page.");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[WSClient] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`,
    );

    this.reconnectTimer = setTimeout(() => {
      if (!this.isClosedIntentionally) {
        this.connect(spaceId);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  // ===========================================================================
  // DISCONNECT — Clean teardown
  // ===========================================================================
  disconnect(): void {
    this.isClosedIntentionally = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      this.isConnected = false;

      // Remove listeners so closing socket doesn't fire spurious callbacks
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.close(1000, "User left the space");
        } catch {
          // ignore already closed
        }
      } else if (socket.readyState === WebSocket.CONNECTING) {
        // If still connecting, closing immediately produces browser warning.
        // Once it opens, immediately close it cleanly.
        socket.onopen = () => {
          try {
            socket.close(1000, "Closed after delayed open");
          } catch {
            // ignore
          }
        };
      }
    }
  }
}

export function createWSClient(callbacks: WSCallbacks): WSClient {
  return new WSClient(callbacks);
}
