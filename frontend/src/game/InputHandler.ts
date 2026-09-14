// =============================================================================
// INPUT HANDLER (src/game/InputHandler.ts)
// =============================================================================
// Captures keyboard input (WASD / Arrow Keys) from the player.
//
// 🎓 HOW KEYBOARD INPUT WORKS IN THE BROWSER:
// The browser fires two events:
//   - "keydown": Fires when a key is pressed (and repeats if held!)
//   - "keyup":   Fires when a key is released
//
// For a game, we want SMOOTH movement. So we track WHICH KEYS are currently
// held down, and on every game tick (requestAnimationFrame) we check the state.
//
// 🎓 REAL-LIFE ANALOGY:
// Imagine a dashboard with buttons. "keydown" presses the button. "keyup" releases it.
// The game loop checks every 16ms: "Is the right arrow button pressed?"
// If yes → move right. If no → stay still.
//
// 🎓 CONNECTION TO FASTAPI:
// The InputHandler calculates WHERE the player WANTS to move.
// It then calls WSClient.sendMove(newX, newY) to ASK the server for permission.
// The server either:
//   - Approves → broadcasts "movement" to other players
//   - Rejects  → sends "movement-rejected" and snapbacks our position
//
// This is the anti-cheat system! The server is the authority on valid positions.
// =============================================================================

export class InputHandler {
  // A map of which keys are currently held down.
  // Record<string, boolean> = { "ArrowRight": true, "a": false, ... }
  public keys: Record<string, boolean> = {};

  // Whether we're actively listening (false after destroy())
  private active: boolean = true;

  constructor() {
    // Bind event listeners to the window (captures keys regardless of focus)
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleWindowBlur);
  }

  // ===========================================================================
  // KEYDOWN HANDLER
  // ===========================================================================
  // Called when a key is pressed. Sets the key as "held down" in our map.
  // "e.key" gives us the key name: "ArrowLeft", "w", "W", " " (space), etc.
  // ===========================================================================
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.active) return;

    const movementKey = this.getMovementKey(e);
    if (!movementKey) return;

    this.keys[movementKey] = true;
    e.preventDefault();
  };

  // ===========================================================================
  // KEYUP HANDLER
  // ===========================================================================
  // Called when a key is released. Sets the key as "not held" in our map.
  // ===========================================================================
  private handleKeyUp = (e: KeyboardEvent): void => {
    if (!this.active) return;
    const movementKey = this.getMovementKey(e);
    if (movementKey) this.keys[movementKey] = false;
  };

  private handleWindowBlur = (): void => {
    this.keys = {};
  };

  private getMovementKey(event: KeyboardEvent): string | null {
    const keyByCode: Record<string, string> = {
      KeyW: "w",
      KeyA: "a",
      KeyS: "s",
      KeyD: "d",
      ArrowUp: "arrowup",
      ArrowDown: "arrowdown",
      ArrowLeft: "arrowleft",
      ArrowRight: "arrowright",
    };

    return keyByCode[event.code] ?? null;
  }

  // ===========================================================================
  // IS KEY DOWN — Check if a specific key is currently held
  // ===========================================================================
  isKeyDown(key: string): boolean {
    return this.keys[key.toLowerCase()] === true;
  }

  // ===========================================================================
  // GET MOVEMENT DIRECTION
  // ===========================================================================
  // Returns the intended movement direction based on currently held keys.
  // Returns null if no movement key is pressed.
  //
  // Priority: Up > Down > Left > Right (WASD and Arrow Keys both work)
  // ===========================================================================
  getMovementDirection(): "up" | "down" | "left" | "right" | null {
    if (this.isKeyDown("w") || this.isKeyDown("arrowup")) return "up";
    if (this.isKeyDown("s") || this.isKeyDown("arrowdown")) return "down";
    if (this.isKeyDown("a") || this.isKeyDown("arrowleft")) return "left";
    if (this.isKeyDown("d") || this.isKeyDown("arrowright")) return "right";
    return null;
  }

  // ===========================================================================
  // DESTROY — Remove event listeners when leaving the game
  // ===========================================================================
  // 🎓 WHY CLEANUP EVENT LISTENERS?
  // If you DON'T remove them, they keep running even after the game page unmounts!
  // This causes "memory leaks" — old event handlers pile up and slow things down.
  // In React, we always clean up in the useEffect cleanup function.
  // ===========================================================================
  destroy(): void {
    this.active = false;
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleWindowBlur);
    this.keys = {};
  }
}
