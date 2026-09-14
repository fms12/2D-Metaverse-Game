// =============================================================================
// GAME ENGINE (src/game/GameEngine.ts)
// =============================================================================
// The Game Engine orchestrates the ENTIRE game loop.
// It connects InputHandler → Character → WSClient → Canvas rendering.
//
// 🎓 THE GAME LOOP:
// A game loop is a function that runs 60 times per second (60 FPS).
// Each iteration:
//   1. Process Input  → Read keyboard state, calculate intended move
//   2. Update State   → Move characters, advance animations
//   3. Render         → Clear canvas, draw everything
//   4. Schedule next  → requestAnimationFrame(gameLoop) — tells browser to call us again
//
// requestAnimationFrame (rAF):
//   - Syncs with the browser's display refresh rate (~60hz)
//   - Pauses automatically when the tab is hidden (saves CPU/battery!)
//   - Smarter than setInterval (doesn't drift or pile up)
//   - Passes a timestamp (milliseconds since page load) to track deltaTime
//
// 🎓 deltaTime (dt):
// The time between two consecutive frames.
// At 60fps: dt ≈ 16.67ms
// At 30fps: dt ≈ 33.33ms
// Multiplying game speed by dt makes movement frame-rate independent!
// (A player moving 3 tiles/second moves at the same speed whether at 30fps or 120fps)
//
// 🎓 MOVEMENT RATE LIMITING:
// The player can hold a key. Without rate limiting, they'd send 60 "move" messages/second.
// We rate-limit to 1 move per 150ms (≈6 moves/second), which is humanly realistic
// and doesn't flood the server.
// =============================================================================

import { Camera } from "./Camera";
import { Character } from "./Character";
import { TileMap } from "./TileMap";
import { InputHandler } from "./InputHandler";
import { RemoteUser } from "./RemoteUser";
import { WSClient } from "@/realtime/wsClient";

// ===========================================================================
// CONFIGURATION INTERFACE
// All the dependencies the GameEngine needs to run.
// ===========================================================================
export interface GameEngineConfig {
  canvas: HTMLCanvasElement; // The <canvas> element to draw on
  spaceId: string; // Which space we're in (for WS join)
  spaceName?: string; // Optional space name to select map asset
  spaceWidth: number; // From FastAPI Space model
  spaceHeight: number; // From FastAPI Space model
  username: string; // For character name tag
  character: string; // "male" or "female"
  wsClient: WSClient; // Connected WebSocket client
}

export class GameEngine {
  // Canvas and rendering context
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Game modules
  private camera: Camera;
  private tileMap: TileMap;
  private player: Character | null = null;
  private remoteUsers: Map<string, RemoteUser> = new Map();
  private inputHandler: InputHandler;
  private wsClient: WSClient;

  // Game loop state
  private animationFrameId: number | null = null; // ID of pending rAF
  private lastTimestamp: number = 0; // For deltaTime calculation
  private isRunning: boolean = false;

  // Rate limiting for movement input
  private moveTimer: number = 0; // Time since last move was sent
  private moveCooldown: number = 150; // Minimum ms between moves (150ms = ~6/sec)

  // Username and character config
  private username: string;
  private character: string;
  private spaceName: string;

  constructor(config: GameEngineConfig) {
    this.canvas = config.canvas;
    this.ctx = this.canvas.getContext("2d")!;
    this.wsClient = config.wsClient;
    this.username = config.username;
    this.character = config.character;
    this.spaceName = config.spaceName || "";

    // Initialize the camera (viewport = canvas dimensions)
    this.camera = new Camera(
      config.canvas.width,
      config.canvas.height,
      config.spaceWidth,
      config.spaceHeight,
    );

    // Initialize the tile map with space dimensions
    this.tileMap = new TileMap(config.spaceWidth, config.spaceHeight);

    // Initialize the keyboard input handler
    this.inputHandler = new InputHandler();

    // Handle window resize
    window.addEventListener("resize", this.handleResize);
  }

  // ===========================================================================
  // INIT — Async setup before the game loop starts
  // ===========================================================================
  async init(): Promise<void> {
    // Resize canvas to fit the window
    this.resizeCanvas();
    this.camera.resize(this.canvas.width, this.canvas.height);

    // Load the map image (await = wait for it before starting the loop)
    await this.tileMap.loadMap(this.spaceName);
  }

  // ===========================================================================
  // ON SPACE JOINED — Called when WS sends "space-joined"
  // ===========================================================================
  // The server tells us where to spawn and who's already in the room.
  // ===========================================================================
  onSpaceJoined(
    spawn: { x: number; y: number },
    existingUsers: Array<{
      id: string;
      userId: string;
      username?: string;
      x: number;
      y: number;
    }>,
  ): void {
    // Create the local player character at the spawn point
    this.player = new Character(
      spawn.x,
      spawn.y,
      this.username,
      this.character,
    );

    // Start the camera centered on the spawn point
    this.camera.follow(spawn.x, spawn.y);

    // Add all existing players in the room to the remote users map
    existingUsers.forEach((u) => {
      const userId = u.userId || u.id;
      this.remoteUsers.set(
        userId,
        new RemoteUser(userId, u.x, u.y, u.username),
      );
    });

    // Now start the game loop!
    this.start();
  }

  // ===========================================================================
  // REMOTE USER EVENTS (called by WSClient callbacks)
  // ===========================================================================
  onUserJoined(userId: string, x: number, y: number, username?: string): void {
    this.remoteUsers.set(userId, new RemoteUser(userId, x, y, username));
  }

  onMovement(userId: string, x: number, y: number): void {
    const remoteUser = this.remoteUsers.get(userId);
    if (remoteUser) {
      remoteUser.updatePosition(x, y);
      return;
    }

    this.remoteUsers.set(userId, new RemoteUser(userId, x, y));
  }

  onMovementRejected(x: number, y: number): void {
    // Server rejected our move — snap player back to server position
    if (this.player) {
      this.player.tileX = x;
      this.player.tileY = y;
      this.player.isMoving = false;
    }
  }

  onUserLeft(userId: string): void {
    this.remoteUsers.delete(userId);
  }

  // ===========================================================================
  // GAME LOOP START / STOP
  // ===========================================================================
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    // requestAnimationFrame schedules the first frame.
    // Each frame schedules the next one, creating a continuous loop.
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // ===========================================================================
  // THE GAME LOOP — Runs every frame (~60 times per second)
  // ===========================================================================
  // This is an arrow function so "this" refers to the class instance (not the window).
  // ===========================================================================
  private gameLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    // Calculate deltaTime (time since last frame, in milliseconds)
    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // -----------------------------------------------------------------------
    // STEP 1: PROCESS INPUT & MOVEMENT
    // -----------------------------------------------------------------------
    this.processInput(deltaTime);

    // -----------------------------------------------------------------------
    // STEP 2: UPDATE ALL ENTITIES (advance animations, interpolation)
    // -----------------------------------------------------------------------
    if (this.player) {
      this.player.update(deltaTime);
    }
    this.remoteUsers.forEach((user) => user.update(deltaTime));

    // -----------------------------------------------------------------------
    // STEP 3: UPDATE CAMERA (follow the player)
    // -----------------------------------------------------------------------
    if (this.player) {
      this.camera.follow(this.player.tileX, this.player.tileY);
    }

    // -----------------------------------------------------------------------
    // STEP 4: RENDER EVERYTHING
    // -----------------------------------------------------------------------
    this.render();

    // -----------------------------------------------------------------------
    // STEP 5: SCHEDULE NEXT FRAME
    // -----------------------------------------------------------------------
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  // ===========================================================================
  // PROCESS INPUT — Convert key presses to movement requests
  // ===========================================================================
  private processInput(deltaTime: number): void {
    if (!this.player) return;

    // Accumulate time since last move
    this.moveTimer += deltaTime;

    // Rate limit: only send a move every moveCooldown ms
    if (this.moveTimer < this.moveCooldown) return;

    const direction = this.inputHandler.getMovementDirection();
    if (!direction) {
      this.player.isMoving = false;
      return;
    }

    // Calculate the new position based on direction
    let newX = this.player.tileX;
    let newY = this.player.tileY;

    if (direction === "up") newY -= 1;
    if (direction === "down") newY += 1;
    if (direction === "left") newX -= 1;
    if (direction === "right") newX += 1;

    // Update visual direction
    this.player.setDirection(direction);
    this.player.isMoving = true;

    // Optimistic update: move visually BEFORE server confirmation.
    // If server rejects, onMovementRejected() will snapback.
    // This makes movement feel instant!
    this.player.tileX = newX;
    this.player.tileY = newY;

    // Send the move request to the server for validation
    this.wsClient.sendMove(newX, newY);

    // Reset rate limit timer
    this.moveTimer = 0;
  }

  // ===========================================================================
  // RENDER — Draw everything on the canvas
  // ===========================================================================
  private render(): void {
    // Clear the entire canvas (start fresh each frame)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fill background
    this.ctx.fillStyle = "#0a0a0f";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the tile map (background)
    this.tileMap.draw(this.ctx, this.camera);
    this.tileMap.drawBorder(this.ctx, this.camera);

    // Draw all remote players (they appear behind/same layer as local player)
    this.remoteUsers.forEach((user) => {
      try {
        user.draw(this.ctx, this.camera);
      } catch (e) {
        console.error("Error drawing remote user:", e);
      }
    });

    // Draw local player on top
    if (this.player) {
      try {
        this.player.draw(this.ctx, this.camera);
      } catch (e) {
        console.error("Error drawing player:", e);
      }
    }

    // Draw foreground overlay layer (roofs, arches, decor above players)
    try {
      this.tileMap.drawForeground(this.ctx, this.camera);
    } catch (e) {
      console.error("Error drawing foreground:", e);
    }

    // Draw HUD overlay (coordinates, player count)
    this.drawHUD();
  }

  // ===========================================================================
  // DRAW HUD — Heads-Up Display with game info
  // ===========================================================================
  private drawHUD(): void {
    if (!this.player) return;

    // Player position debug display
    ctx_text(
      this.ctx,
      `Position: (${this.player.tileX}, ${this.player.tileY})`,
      10,
      this.canvas.height - 30,
      "#6c63ff",
    );

    // Player count
    ctx_text(
      this.ctx,
      `Players: ${this.remoteUsers.size + 1}`,
      10,
      this.canvas.height - 12,
      "#60a5fa",
    );
  }

  // ===========================================================================
  // HANDLE RESIZE — Keep canvas fullscreen
  // ===========================================================================
  private handleResize = (): void => {
    this.resizeCanvas();
    this.camera.resize(this.canvas.width, this.canvas.height);
  };

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // ===========================================================================
  // DESTROY — Clean up everything when leaving the game
  // ===========================================================================
  destroy(): void {
    this.stop();
    this.inputHandler.destroy();
    window.removeEventListener("resize", this.handleResize);
    this.remoteUsers.clear();
  }
}

// ===========================================================================
// HELPER — Draw text with a shadow for readability
// ===========================================================================
function ctx_text(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string = "#ffffff",
): void {
  ctx.font = "12px Inter, monospace";
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillText(text, x + 1, y + 1); // Shadow
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
